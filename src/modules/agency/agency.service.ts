import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { AgencyRole, AgencyStatus, AgentType } from '../../types';
import {
  RegisterAgencyInput,
  UpdateAgencyInput,
  InviteAgentInput,
} from './agency.validation';

export class AgencyService {
  /**
   * Retrieves agency context for the authenticated user.
   */
  public async getMyAgency(userId: string) {
    const membership = await prisma.agencyMember.findFirst({
      where: { userId },
      include: {
        agency: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phone: true,
                    avatarUrl: true,
                    role: true,
                  },
                },
              },
            },
            invitations: {
              where: { status: 'PENDING' },
              select: {
                id: true,
                email: true,
                role: true,
                inviteToken: true,
                expiresAt: true,
                createdAt: true,
              },
            },
            documents: {
              select: {
                id: true,
                documentType: true,
                originalFilename: true,
                status: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return {
        isAgencyMember: false,
        membership: null,
        agency: null,
      };
    }

    const isPrivileged =
      membership.role === AgencyRole.AGENCY_OWNER || membership.role === AgencyRole.AGENCY_ADMIN;

    return {
      isAgencyMember: true,
      membership: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.joinedAt,
        isPrivileged,
      },
      agency: {
        id: membership.agency.id,
        name: membership.agency.name,
        legalName: membership.agency.legalName,
        tradeLicenseNo: membership.agency.tradeLicenseNo,
        orn: membership.agency.orn,
        dedLicenseNo: membership.agency.dedLicenseNo,
        email: membership.agency.email,
        phone: membership.agency.phone,
        address: membership.agency.address,
        poBox: membership.agency.poBox,
        status: membership.agency.status,
        rejectionReason: membership.agency.rejectionReason,
        membersCount: membership.agency.members.length,
        members: isPrivileged
          ? membership.agency.members.map((m) => ({
              id: m.id,
              userId: m.user.id,
              fullName: m.user.fullName,
              email: m.user.email,
              phone: m.user.phone,
              avatarUrl: m.user.avatarUrl,
              role: m.role,
              joinedAt: m.joinedAt,
            }))
          : membership.agency.members.map((m) => ({
              id: m.id,
              fullName: m.user.fullName,
              avatarUrl: m.user.avatarUrl,
              role: m.role,
            })),
        pendingInvitations: isPrivileged ? membership.agency.invitations : [],
        documents: membership.agency.documents,
      },
    };
  }

  /**
   * Registers a new Agency with transactional owner membership creation.
   */
  public async registerAgency(
    userId: string,
    input: RegisterAgencyInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await prisma.agency.findUnique({
      where: { tradeLicenseNo: input.tradeLicenseNo },
    });

    if (existing) {
      throw new Error(`An agency with trade license number '${input.tradeLicenseNo}' is already registered`);
    }

    // Atomic transaction: Agency + Owner Member + User Profile update
    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: input.name,
          legalName: input.legalName,
          tradeLicenseNo: input.tradeLicenseNo,
          orn: input.orn || null,
          dedLicenseNo: input.dedLicenseNo || null,
          email: input.email,
          phone: input.phone,
          address: input.address || null,
          poBox: input.poBox || null,
          status: AgencyStatus.PENDING_VERIFICATION,
          createdById: userId,
        },
      });

      const member = await tx.agencyMember.create({
        data: {
          agencyId: agency.id,
          userId,
          role: AgencyRole.AGENCY_OWNER,
          status: 'ACTIVE',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          agentType: AgentType.AGENCY_MEMBER,
          companyName: input.name,
        },
      });

      return { agency, member };
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'AGENCY_REGISTERED',
      entityType: 'AGENCY',
      entityId: result.agency.id,
      newValues: {
        name: result.agency.name,
        legalName: result.agency.legalName,
        tradeLicenseNo: result.agency.tradeLicenseNo,
      },
      ipAddress,
      userAgent,
    });

    return result.agency;
  }

  /**
   * Updates agency information (Restricted to AGENCY_OWNER or AGENCY_ADMIN).
   */
  public async updateAgency(
    userId: string,
    agencyId: string,
    input: UpdateAgencyInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const membership = await prisma.agencyMember.findFirst({
      where: {
        agencyId,
        userId,
        role: { in: [AgencyRole.AGENCY_OWNER, AgencyRole.AGENCY_ADMIN] },
      },
    });

    if (!membership) {
      throw new Error('Unauthorized: You must be an agency owner or administrator to update organization details');
    }

    const existing = await prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!existing) {
      throw new Error('Agency not found');
    }

    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.legalName ? { legalName: input.legalName } : {}),
        ...(input.orn !== undefined ? { orn: input.orn } : {}),
        ...(input.dedLicenseNo !== undefined ? { dedLicenseNo: input.dedLicenseNo } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.poBox !== undefined ? { poBox: input.poBox } : {}),
      },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'AGENCY_UPDATED',
      entityType: 'AGENCY',
      entityId: agencyId,
      oldValues: { name: existing.name, phone: existing.phone },
      newValues: { name: updated.name, phone: updated.phone },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Invites an agent to join the agency.
   */
  public async inviteAgent(
    userId: string,
    agencyId: string,
    input: InviteAgentInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const membership = await prisma.agencyMember.findFirst({
      where: {
        agencyId,
        userId,
        role: { in: [AgencyRole.AGENCY_OWNER, AgencyRole.AGENCY_ADMIN] },
      },
    });

    if (!membership) {
      throw new Error('Unauthorized: Only agency owners and admins can issue invitations');
    }

    // Generate secure 16-byte random token
    const inviteToken = `INV-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.agencyInvitation.create({
      data: {
        agencyId,
        email: input.email.toLowerCase().trim(),
        role: input.role || AgencyRole.AGENT,
        inviteToken,
        expiresAt,
        invitedById: userId,
      },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'AGENCY_AGENT_INVITED',
      entityType: 'AGENCY_INVITATION',
      entityId: invitation.id,
      newValues: {
        agencyId,
        invitedEmail: invitation.email,
        role: invitation.role,
      },
      ipAddress,
      userAgent,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      inviteToken: invitation.inviteToken,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Joins an agency using an invitation token.
   */
  public async joinAgency(userId: string, inviteToken: string, ipAddress?: string, userAgent?: string) {
    const invitation = await prisma.agencyInvitation.findFirst({
      where: {
        inviteToken: inviteToken.trim(),
        status: 'PENDING',
      },
      include: {
        agency: true,
      },
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation token');
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.agencyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new Error('This invitation has expired');
    }

    // Assert user is not already a member
    const existingMembership = await prisma.agencyMember.findFirst({
      where: {
        agencyId: invitation.agencyId,
        userId,
      },
    });

    if (existingMembership) {
      throw new Error('You are already a member of this agency');
    }

    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.agencyMember.create({
        data: {
          agencyId: invitation.agencyId,
          userId,
          role: invitation.role,
          status: 'ACTIVE',
        },
      });

      await tx.agencyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          agentType: AgentType.AGENCY_MEMBER,
          companyName: invitation.agency.name,
        },
      });

      return member;
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'AGENCY_JOINED',
      entityType: 'AGENCY_MEMBER',
      entityId: result.id,
      newValues: {
        agencyId: invitation.agencyId,
        role: result.role,
      },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      agencyName: invitation.agency.name,
      role: result.role,
    };
  }

  /**
   * Removes an agent member from the agency.
   */
  public async removeMember(
    userId: string,
    agencyId: string,
    targetMemberId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const callerMembership = await prisma.agencyMember.findFirst({
      where: {
        agencyId,
        userId,
        role: { in: [AgencyRole.AGENCY_OWNER, AgencyRole.AGENCY_ADMIN] },
      },
    });

    if (!callerMembership) {
      throw new Error('Unauthorized: Only agency owners and admins can remove members');
    }

    const targetMembership = await prisma.agencyMember.findUnique({
      where: { id: targetMemberId },
    });

    if (!targetMembership || targetMembership.agencyId !== agencyId) {
      throw new Error('Member not found in this agency');
    }

    if (targetMembership.role === AgencyRole.AGENCY_OWNER) {
      throw new Error('Cannot remove the agency owner');
    }

    await prisma.$transaction(async (tx) => {
      await tx.agencyMember.delete({
        where: { id: targetMemberId },
      });

      // Reset user to independent if no remaining memberships
      const remaining = await tx.agencyMember.count({
        where: { userId: targetMembership.userId },
      });

      if (remaining === 0) {
        await tx.user.update({
          where: { id: targetMembership.userId },
          data: { agentType: AgentType.INDEPENDENT },
        });
      }
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'AGENCY_MEMBER_REMOVED',
      entityType: 'AGENCY_MEMBER',
      entityId: targetMemberId,
      oldValues: { userId: targetMembership.userId, role: targetMembership.role },
      ipAddress,
      userAgent,
    });

    return { success: true };
  }
}
