import { NotificationLog } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { EmailEvent, recipientFilter, subjects } from './events';
import { Message } from './transport';

const maxAttempts = 5;

async function prepare(row: NotificationLog): Promise<Message | null> {
  if (!row.entityId || !Object.hasOwn(subjects, row.templateName)) return null;
  const event = row.templateName as EmailEvent;
  const message = { id: row.id, event, to: row.recipientEmail, reference: row.reference };
  if (event === 'invitation') {
    const invite = await prisma.agencyInvitation.findFirst({ where: {
      id: row.entityId, status: 'PENDING', expiresAt: { gt: new Date() }, email: row.recipientEmail,
    } });
    return invite ? { ...message, inviteToken: invite.inviteToken } : null;
  }
  const lead = await prisma.lead.findUnique({ where: { id: row.entityId } });
  if (!lead || !row.recipientId || (event === 'assigned' && !lead.agentId)) return null;
  const active = await prisma.user.findFirst({ where: { AND: [
    { id: row.recipientId, email: row.recipientEmail, accountStatus: 'ACTIVE' }, recipientFilter(lead, event),
  ] }, select: { id: true } });
  return active ? message : null;
}

export async function deliverOne(send: (message: Message) => Promise<void>, id?: string) {
  const now = new Date();
  const row = await prisma.notificationLog.findFirst({ where: {
    id, status: { in: ['PENDING', 'PROCESSING'] }, availableAt: { lte: now },
  }, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }] });
  if (!row) return false;
  const attempt = row.attempts + 1;
  const claim = await prisma.notificationLog.updateMany({
    where: { id: row.id, attempts: row.attempts, status: row.status, availableAt: { lte: now } },
    data: { status: 'PROCESSING', attempts: attempt, availableAt: new Date(now.getTime() + 300000) },
  });
  if (!claim.count) return true;
  const where = { id: row.id, attempts: attempt, status: 'PROCESSING' as const };
  let status: 'SENT' | 'SKIPPED' | 'PENDING' | 'FAILED' = 'FAILED';
  let errorMessage: string | null = null;
  if (attempt <= maxAttempts) {
    try {
      const message = await prepare(row);
      if (message) { await send(message); status = 'SENT'; }
      else status = 'SKIPPED';
    } catch {
      status = attempt === maxAttempts ? 'FAILED' : 'PENDING';
      errorMessage = 'Delivery attempt failed';
    }
  } else errorMessage = 'Final delivery lease expired';
  const finished = await prisma.notificationLog.updateMany({ where, data: { status, errorMessage,
    acceptedAt: status === 'SENT' ? new Date() : null,
    availableAt: new Date(Date.now() + 30000 * 2 ** Math.min(attempt - 1, maxAttempts)),
  } });
  console.info(JSON.stringify({ notificationId: row.id, event: row.templateName, attempt, status: finished.count ? status : 'LEASE_LOST' }));
  return true;
}
