import { prisma } from './prisma';

export interface AuditLogParams {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Creates an immutable audit record in PostgreSQL.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? (params.oldValues as object) : undefined,
        newValues: params.newValues ? (params.newValues as object) : undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (error) {
    // We log but avoid failing transactions solely on audit logging if non-critical
    console.error('Failed to write audit log entry:', error);
  }
}
