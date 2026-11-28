import { SMTPServer } from 'smtp-server';
import type { AddressInfo } from 'node:net';
import { deliverOne } from '../../src/modules/notifications/delivery';
import { smtpTransport } from '../../src/modules/notifications/transport';
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
const roles = { outsider: Role.AGENT, member: Role.AGENT, owner: Role.AGENT, coordinator: Role.COORDINATOR, agent: Role.AGENT };
type Persona = keyof typeof roles;
const sessions = {} as Record<Persona, string>;
const ids = {} as Record<Persona, string>;
let serviceId: string;
let categoryId: string;
let agencyId: string;
let outsideAgencyId: string;

beforeAll(async () => {
  const target = new URL(process.env.DATABASE_URL || '').pathname;
  if (!['/prospera_test', '/prospera_beta_qa_20261128'].includes(target)) {
    throw new Error('Requires a dedicated integration test database');
  }
  setAuthRepository(new PrismaAuthRepository());
  setReferralRepository(new PrismaReferralRepository());
  const passwordHash = await argon2.hash(password);
  for (const key of Object.keys(roles) as Persona[]) {
    const email = key + run + '@example.invalid';
    const user = await prisma.user.create({ data: {
      email, passwordHash, fullName: 'Synthetic ' + key, role: roles[key], accountStatus: 'ACTIVE',
      agentType: key === 'member' || key === 'owner' || key === 'outsider' ? 'AGENCY_MEMBER' : 'INDEPENDENT',
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
  const outside = await prisma.agency.create({ data: {
    name: 'Other agency', legalName: 'Other agency', tradeLicenseNo: 'other' + run,
    email: 'other@example.invalid', phone: '00000000', createdById: ids.outsider,
    members: { create: { userId: ids.outsider, role: 'AGENCY_OWNER' } },
  } });
  outsideAgencyId = outside.id;
  const category = await prisma.serviceCategory.create({ data: { name: 'Synthetic', slug: run } });
  categoryId = category.id;
  const service = await prisma.service.create({ data: { categoryId, name: 'Synthetic service', slug: run } });
  serviceId = service.id;
});

afterAll(async () => {
  if (!Object.keys(ids).length) return;
  const users = Object.values(ids);
  await prisma.$transaction(async tx => {
    await tx.notificationLog.deleteMany({ where: { recipientEmail: { endsWith: run + '@example.invalid' } } });
    await tx.auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await tx.lead.deleteMany({ where: { partnerId: { in: users } } });
    if (outsideAgencyId) await tx.agency.delete({ where: { id: outsideAgencyId } });
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

it('delivers lifecycle mail over loopback SMTP with isolated recipients, retry and duplicate protection', async () => {
  const base = '/api/v1/referrals';
  const create = (who: Persona, phone: string) => request(app).post(base).set('Authorization', sessions[who]).send({
    serviceId, clientName: 'PRIVATE CLIENT', clientPhone: phone, expectedDealValue: 1000, consent: true,
  });
  const returned = await create('member', '0007654321');
  expect(returned.status).toBe(201);
  const review = base + '/' + returned.body.data.id + '/agency-review';
  expect((await request(app).patch(review).set('Authorization', sessions.outsider).send({ decision: 'approve' })).status).toBe(404);
  expect((await request(app).patch(review).set('Authorization', sessions.owner).send({ decision: 'return', reason: 'PRIVATE REASON' })).status).toBe(200);
  const direct = await create('agent', '0007654322');
  expect(direct.status).toBe(201);
  const inviteEmail = 'invite' + run + '@example.invalid';
  const invite = () => request(app).post('/api/v1/agency/' + agencyId + '/invitations')
    .set('Authorization', sessions.owner).send({ email: inviteEmail });
  const invitations = await Promise.all([invite(), invite()]);
  expect(invitations.map(r => r.status)).toEqual([201, 201]);
  expect(invitations[0].body.data.id).toBe(invitations[1].body.data.id);

  const submitted = await create('member', '0007654323');
  expect(submitted.status).toBe(201);
  const workflow = submitted.body.data;
  const path = base + '/' + workflow.id;
  expect((await request(app).patch(path + '/agency-review').set('Authorization', sessions.owner).send({ decision: 'approve' })).status).toBe(200);
  expect((await request(app).patch(path + '/assign').set('Authorization', sessions.coordinator).send({ agentId: ids.agent })).status).toBe(200);
  expect((await request(app).patch(path + '/status').set('Authorization', sessions.agent).send({ status: 'CONTACTED' })).status).toBe(200);
  const entityIds = [workflow.id, returned.body.data.id, direct.body.data.id, invitations[0].body.data.id];
  const syntheticRecipients = { endsWith: run + '@example.invalid' };
  const jobs = { entityId: { in: entityIds }, recipientEmail: syntheticRecipients };
  const rows = await prisma.notificationLog.findMany({ where: jobs });
  const targets = (id: string) => rows.filter(r => r.entityId === id).map(r => r.templateName + '/' + r.recipientEmail.split(run)[0]).sort();
  expect(targets(workflow.id)).toEqual(['agency_approved/coordinator','agency_approved/member','agency_review/owner','assigned/agent','status_changed/member']);
  expect(targets(returned.body.data.id)).toEqual(['agency_review/owner','changes_requested/member']);
  expect(targets(direct.body.data.id)).toEqual(['direct_submission/coordinator']);
  expect(targets(invitations[0].body.data.id)).toEqual(['invitation/invite']);

  async function inviteAfterDelivery() {
    const email = randomUUID() + run + '@example.invalid';
    const response = await request(app).post('/api/v1/agency/' + agencyId + '/invitations')
      .set('Authorization', sessions.owner).send({ email });
    expect(response.status).toBe(201);
    return prisma.notificationLog.findFirstOrThrow({ where: { entityId: response.body.data.id } });
  }

  const received: string[] = [];
  let reject = true;
  const server = new SMTPServer({ disabledCommands: ['AUTH','STARTTLS'], authOptional: true,
    onData(stream, _session, done) {
      let raw = '';
      stream.on('data', chunk => { raw += chunk.toString(); });
      stream.on('end', () => {
        if (reject) { done(new Error('Temporary test failure')); return; }
        received.push(raw);
        done();
      });
    },
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = (server.server.address() as AddressInfo).port;
    const send = smtpTransport({ NODE_ENV: 'test', NOTIFICATION_TRANSPORT: 'local-smtp', SMTP_PORT: String(port),
      SMTP_FROM: 'sender@example.invalid', NOTIFICATION_PORTAL_URL: 'http://localhost:3004' })!;
    const job = rows[0];
    await deliverOne(send, job.id);
    const failed = await prisma.notificationLog.findUniqueOrThrow({ where: { id: job.id } });
    expect(failed).toMatchObject({ status: 'PENDING', attempts: 1, acceptedAt: null, errorMessage: 'Delivery attempt failed' });
    expect(await deliverOne(send, job.id)).toBe(false);
    await prisma.notificationLog.update({ where: { id: job.id }, data: { availableAt: new Date(0) } });
    // A second worker must leave a live lease alone and recover it after expiry.
    const abandoned = rows[1];
    await prisma.notificationLog.update({ where: { id: abandoned.id }, data: {
      status: 'PROCESSING', attempts: 1, availableAt: new Date(Date.now() + 300000),
    } });
    expect(await deliverOne(send, abandoned.id)).toBe(false);
    await prisma.notificationLog.update({ where: { id: abandoned.id }, data: { availableAt: new Date(0) } });
    reject = false;
    for (const row of rows) await Promise.all([deliverOne(send, row.id), deliverOne(send, row.id)]);
    expect(received).toHaveLength(rows.length);
    expect(received.join('')).not.toMatch(/PRIVATE CLIENT|PRIVATE REASON/);
    for (const row of rows) {
      expect(received.some(message => message.includes(row.id) && message.includes(row.recipientEmail))).toBe(true);
    }
    expect(await prisma.notificationLog.count({ where: { ...jobs, status: 'SENT', acceptedAt: { not: null } } })).toBe(rows.length);

    const stale = await inviteAfterDelivery();
    await prisma.agencyInvitation.update({ where: { id: stale.entityId! }, data: { status: 'REVOKED' } });
    await deliverOne(send, stale.id);
    expect(await prisma.notificationLog.findUniqueOrThrow({ where: { id: stale.id } })).toMatchObject({ status: 'SKIPPED', acceptedAt: null });

    const terminal = await inviteAfterDelivery();
    reject = true;
    for (let attempt = 1; attempt <= 5; attempt++) {
      await prisma.notificationLog.update({ where: { id: terminal.id }, data: { availableAt: new Date(0) } });
      const before = Date.now();
      await deliverOne(send, terminal.id);
      const result = await prisma.notificationLog.findUniqueOrThrow({ where: { id: terminal.id } });
      expect(result.status).toBe(attempt < 5 ? 'PENDING' : 'FAILED');
      expect(result.availableAt.getTime()).toBeGreaterThanOrEqual(before + 30000 * 2 ** (attempt - 1));
    }
    expect(await deliverOne(send, terminal.id)).toBe(false);
    expect(received).toHaveLength(rows.length);
  } finally {
    await new Promise<void>(resolve => server.close(resolve));
  }
}, 30000);
