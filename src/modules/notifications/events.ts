import { AgencyInvitation, Lead, Prisma } from '@prisma/client';

export const subjects = {
  agency_review: 'Agency review required',
  agency_approved: 'Agency referral approved',
  changes_requested: 'Referral changes requested',
  direct_submission: 'New referral for intake',
  assigned: 'Referral assigned',
  status_changed: 'Referral status updated',
  invitation: 'Invitation to join a Prospera agency',
} as const;
export type EmailEvent = keyof typeof subjects;
type ReferralEvent = Exclude<EmailEvent, 'invitation'>;
type Tx = Prisma.TransactionClient;

export function recipientFilter(lead: Lead, event: ReferralEvent): Prisma.UserWhereInput {
  const intake: Prisma.UserWhereInput = lead.coordinatorId
    ? { OR: [{ role: 'ADMIN' }, { id: lead.coordinatorId, role: 'COORDINATOR' }] }
    : { role: { in: ['ADMIN', 'COORDINATOR'] } };
  switch (event) {
    case 'agency_review':
      if (!lead.originatingAgencyId) return { id: { in: [] } };
      return { role: 'AGENT', agentType: 'AGENCY_MEMBER', id: { not: lead.partnerId }, agencyMemberships: { some: {
        agencyId: lead.originatingAgencyId, status: 'ACTIVE', role: { in: ['AGENCY_OWNER', 'AGENCY_ADMIN'] },
      } } };
    case 'agency_approved': return { OR: [{ id: lead.partnerId }, intake] };
    case 'direct_submission': return intake;
    case 'assigned': return { id: { in: lead.agentId ? [lead.agentId] : [] }, role: 'AGENT' };
    default: return { id: lead.partnerId };
  }
}

export async function queueReferral(tx: Tx, lead: Lead, event: ReferralEvent) {
  const users = await tx.user.findMany({
    where: { accountStatus: 'ACTIVE', ...recipientFilter(lead, event) }, select: { id: true, email: true },
  });
  if (!users.length) {
    console.warn(JSON.stringify({ event, entityId: lead.id, outcome: 'no_active_recipients' }));
    return;
  }
  await tx.notificationLog.createMany({
    skipDuplicates: true,
    data: users.map(user => ({
      eventKey: [lead.id, lead.revision, event, user.email.toLowerCase()].join('/'),
      entityId: lead.id, recipientId: user.id, recipientEmail: user.email, reference: lead.referenceNo,
      templateName: event, subject: subjects[event], status: 'PENDING',
    })),
  });
}

export async function queueInvitation(tx: Tx, invite: AgencyInvitation) {
  await tx.notificationLog.create({ data: {
    eventKey: invite.id + '/invitation', entityId: invite.id, recipientEmail: invite.email,
    templateName: 'invitation', subject: subjects.invitation, status: 'PENDING',
  } });
}
