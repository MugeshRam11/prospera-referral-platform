import { randomUUID, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { app } from '../../src/app';
import { prisma } from '../../src/lib/prisma';
import { PrismaAuthRepository, setAuthRepository } from '../../src/modules/auth/auth.repository';
import { PrismaReferralRepository, setReferralRepository } from '../../src/modules/referrals/referral.repository';

const run = randomUUID();
const password = randomBytes(24).toString('hex');
const roles = { member: Role.AGENT, owner: Role.AGENT, coordinator: Role.COORDINATOR, agent: Role.AGENT };
type Persona = keyof typeof roles;
const sessions = {} as Record<Persona, string>;
const ids = {} as Record<Persona, string>;
let serviceId: string;
let categoryId: string;
let agencyId: string;

beforeAll(async () => {
  if (new URL(process.env.DATABASE_URL || '').pathname !== '/prospera_test') throw new Error('Requires isolated prospera_test');
  setAuthRepository(new PrismaAuthRepository());
  setReferralRepository(new PrismaReferralRepository());
  const passwordHash = await argon2.hash(password);
  for (const key of Object.keys(roles) as Persona[]) {
    const email = key + run + '@example.invalid';
    const user = await prisma.user.create({ data: {
      email, passwordHash, fullName: 'Synthetic ' + key, role: roles[key], accountStatus: 'ACTIVE',
      agentType: key === 'member' || key === 'owner' ? 'AGENCY_MEMBER' : 'INDEPENDENT',
    } });
    ids[key] = user.id;
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    sessions[key] = 'Bearer ' + login.body.data.sessionToken;
  }
  const agency = await prisma.agency.create({ data: {
    name: 'Synthetic agency', legalName: 'Synthetic agency', tradeLicenseNo: run,
    email: 'review@example.invalid', phone: '0000000000', createdById: ids.owner,
    members: { create: [{ userId: ids.owner, role: 'AGENCY_OWNER' }, { userId: ids.member, role: 'AGENT' }] },
  } });
  agencyId = agency.id;
  const category = await prisma.serviceCategory.create({ data: { name: 'Synthetic', slug: run } });
  categoryId = category.id;
  const service = await prisma.service.create({ data: { categoryId, name: 'Synthetic service', slug: run } });
  serviceId = service.id;
});

afterAll(async () => {
  if (!Object.keys(ids).length) return;
  const users = Object.values(ids);
  await prisma.$transaction(async tx => {
    await tx.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await tx.lead.deleteMany({ where: { partnerId: { in: users } } });
    if (agencyId) await tx.agency.delete({ where: { id: agencyId } });
    await tx.user.deleteMany({ where: { id: { in: users } } });
    if (serviceId) await tx.service.delete({ where: { id: serviceId } });
    if (categoryId) await tx.serviceCategory.delete({ where: { id: categoryId } });
  });
  await prisma.$disconnect();
});

it('requires a fresh declaration from the draft owner before agency review', async () => {
  const base = '/api/v1/referrals';
  const draft = await request(app).post(base).set('Authorization', sessions.member).send({
    serviceId, clientName: 'Synthetic draft', clientPhone: '0001234999',
    expectedDealValue: 1000, consent: true, asDraft: true,
  });
  expect(draft.status).toBe(201);
  const lead = draft.body.data;
  expect(lead.consentAt).toBeNull();
  const submit = (body: object) => request(app).patch(base + '/' + lead.id + '/status')
    .set('Authorization', sessions.member).send({ status: 'SUBMITTED', ...body });
  for (const body of [{}, { consent: false }]) expect((await submit(body)).status).toBe(403);
  const submitted = await submit({ consent: true });
  expect(submitted.status).toBe(200);
  expect(submitted.body.data.agencyReviewStage).toBe('PENDING_AGENCY_APPROVAL');
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: lead.id, action: 'REFERRAL_STAGE_CHANGED' } });
  expect(audit.actorUserId).toBe(ids.member);
  expect(audit.newValues).toMatchObject({ consent: { version: '2026-11-25', referenceNo: lead.referenceNo } });
});

it('commits exactly one concurrent submission, approval and assignment with an ordered member timeline', async () => {
  const base = '/api/v1/referrals';
  const payload = { serviceId, clientName: 'Synthetic client', clientPhone: '0001234567', expectedDealValue: 1000, consent: true };
  for (const consent of [undefined, false]) {
    const response = await request(app).post(base).set('Authorization', sessions.member).send({ ...payload, consent });
    expect(response.status).toBe(400);
  }
  const submit = () => request(app).post(base).set('Authorization', sessions.member).send(payload);
  const submissions = await Promise.all([submit(), submit()]);
  expect(submissions.map(r => r.status).sort()).toEqual([201, 409]);
  const lead = submissions.find(r => r.status === 201)!.body.data;
  expect(lead.agencyReviewStage).toBe('PENDING_AGENCY_APPROVAL');
  const audit = await prisma.auditLog.findFirstOrThrow({ where: { entityId: lead.id, action: 'REFERRAL_CREATED' } });
  expect(audit.newValues).toMatchObject({ consent: { version: '2026-11-25', referenceNo: lead.referenceNo, declaredAt: lead.consentAt } });
  const path = base + '/' + lead.id;
  const patch = (who: Persona, suffix: string, body: object) =>
    request(app).patch(path + suffix).set('Authorization', sessions[who]).send(body);
  const decide = () => patch('owner', '/agency-review', { decision: 'approve' });
  expect((await Promise.all([decide(), decide()])).map(r => r.status).sort()).toEqual([200, 409]);
  const queue = await request(app).get(base).set('Authorization', sessions.coordinator);
  expect(queue.body.data.items.some((row: { id: string }) => row.id === lead.id)).toBe(true);
  const assign = () => patch('coordinator', '/assign', { agentId: ids.agent, expectedRevision: 1 });
  expect((await Promise.all([assign(), assign()])).map(r => r.status).sort()).toEqual([200, 409]);

  const followUp = { note: 'Internal synthetic review', nextAction: 'Confirm timing', due: '2027-01-15' };
  expect((await request(app).post(path + '/follow-ups').set('Authorization', sessions.coordinator).send(followUp)).status).toBe(201);
  expect((await request(app).get(path + '/follow-ups').set('Authorization', sessions.member)).status).toBe(403);
  const progress = await patch('agent', '/status', { status: 'CONTACTED', transitionNote: 'Synthetic contact' });
  expect(progress.status).toBe(200);
  const history = await request(app).get(path + '/history').set('Authorization', sessions.member);
  expect(history.body.data.map((h: { newStatus: string }) => h.newStatus)).toEqual([
    'PENDING_AGENCY_APPROVAL', 'AGENCY_APPROVED', 'ASSIGNED', 'CONTACTED',
  ]);
  expect(JSON.stringify(history.body.data)).not.toContain(followUp.note);
  expect(await prisma.auditLog.count({ where: { entityType: 'LEAD', entityId: lead.id } })).toBe(5);
});
