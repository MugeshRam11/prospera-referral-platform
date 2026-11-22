import { prisma } from '../../lib/prisma';
import { AppError } from '../auth/auth.service';

export async function requireAgencyManager(userId: string, agencyId: string) {
  const membership = await prisma.agencyMember.findFirst({
    where: { agencyId, userId, status: 'ACTIVE', role: { in: ['AGENCY_OWNER', 'AGENCY_ADMIN'] } },
    select: { id: true },
  });
  if (!membership) throw new AppError(403, 'Active agency management permission required');
}
