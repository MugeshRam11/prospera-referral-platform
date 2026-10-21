import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { maskIban } from '../../lib/encryption';
import { KycService } from '../kyc/kyc.service';
import { BankingService } from '../banking/banking.service';
import {
  AccountStatus,
  AgencyStatus,
  KycStatus,
  Role,
} from '../../types';
import {
  AgentQueryInput,
  AgencyQueryInput,
} from './admin.validation';

const kycService = new KycService();
const bankingService = new BankingService();

export class AdminService {
  /**
   * Computes accurate administrative overview metrics using live database aggregates.
   */
  public async getOverviewMetrics() {
    const [
      totalIndependentAgents,
      totalAgencies,
      totalAgencyMembers,
      pendingAgentApprovals,
      pendingAgencyApprovals,
      pendingKycReviews,
      verifiedAccounts,
      suspendedAccounts,
      recentUsers,
    ] = await Promise.all([
      // Total Independent Agents
      prisma.user.count({
        where: {
          role: { in: [Role.AGENT, Role.REFERRAL_PARTNER] },
          agentType: 'INDEPENDENT',
        },
      }),
      // Total Agencies
      prisma.agency.count(),
      // Total Agency Members
      prisma.user.count({
        where: {
          role: { in: [Role.AGENT, Role.REFERRAL_PARTNER] },
          agentType: 'AGENCY_MEMBER',
        },
      }),
      // Pending Agent Approvals
      prisma.user.count({
        where: {
          accountStatus: AccountStatus.PENDING_APPROVAL,
        },
      }),
      // Pending Agency Approvals
      prisma.agency.count({
        where: {
          status: AgencyStatus.PENDING_VERIFICATION,
        },
      }),
      // Pending KYC Document Reviews
      prisma.kycDocument.count({
        where: {
          status: KycStatus.PENDING_REVIEW,
        },
      }),
      // Verified Accounts (Active)
      prisma.user.count({
        where: {
          accountStatus: AccountStatus.ACTIVE,
        },
      }),
      // Suspended Accounts
      prisma.user.count({
        where: {
          accountStatus: AccountStatus.SUSPENDED,
        },
      }),
      // Recently registered/submitted applications
      prisma.user.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          agentType: true,
          accountStatus: true,
          companyName: true,
          createdAt: true,
          kycDocuments: {
            select: {
              status: true,
              documentType: true,
            },
          },
        },
      }),
    ]);

    return {
      metrics: {
        totalIndependentAgents,
        totalAgencies,
        totalAgencyMembers,
        pendingAgentApprovals,
        pendingAgencyApprovals,
        pendingKycReviews,
        verifiedAccounts,
        suspendedAccounts,
      },
      recentApplications: recentUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        agentType: u.agentType,
        accountStatus: u.accountStatus,
        companyName: u.companyName,
        createdAt: u.createdAt,
        kycStatusSummary: u.kycDocuments.some((d) => d.status === 'PENDING_REVIEW')
          ? 'PENDING_REVIEW'
          : u.kycDocuments.some((d) => d.status === 'VERIFIED')
          ? 'VERIFIED'
          : 'INCOMPLETE',
      })),
    };
  }

  /**
   * Searchable and filterable agent directory.
   */
  public async getAgents(input: AgentQueryInput) {
    const { search, agentType, status, page, limit } = input;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      role: { in: [Role.AGENT, Role.REFERRAL_PARTNER] },
    };

    if (agentType) {
      whereClause.agentType = agentType;
    }

    if (status) {
      whereClause.accountStatus = status;
    }

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
        { companyName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, agents] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          whatsapp: true,
          avatarUrl: true,
          brn: true,
          role: true,
          agentType: true,
          accountStatus: true,
          companyName: true,
          createdAt: true,
          approvedAt: true,
          agencyMemberships: {
            include: {
              agency: {
                select: {
                  id: true,
                  name: true,
                  tradeLicenseNo: true,
                },
              },
            },
          },
          kycDocuments: {
            select: {
              id: true,
              documentType: true,
              status: true,
            },
          },
          bankAccounts: {
            select: {
              id: true,
              isVerified: true,
            },
          },
        },
      }),
    ]);

    return {
      agents: agents.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        email: a.email,
        phone: a.phone,
        whatsapp: a.whatsapp,
        avatarUrl: a.avatarUrl,
        brn: a.brn,
        role: a.role,
        agentType: a.agentType,
        accountStatus: a.accountStatus,
        companyName: a.companyName,
        createdAt: a.createdAt,
        approvedAt: a.approvedAt,
        agency: a.agencyMemberships.length > 0 ? a.agencyMemberships[0].agency : null,
        agencyRole: a.agencyMemberships.length > 0 ? a.agencyMemberships[0].role : null,
        totalKycDocuments: a.kycDocuments.length,
        hasVerifiedKyc: a.kycDocuments.some((d) => d.status === 'VERIFIED'),
        hasPendingKyc: a.kycDocuments.some((d) => d.status === 'PENDING_REVIEW'),
        hasVerifiedBank: a.bankAccounts.some((b) => b.isVerified),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detailed single agent view with documents and audit history.
   */
  public async getAgentById(agentId: string) {
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      include: {
        agencyMemberships: {
          include: {
            agency: true,
          },
        },
        kycDocuments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            documentType: true,
            originalFilename: true,
            fileSizeBytes: true,
            mimeType: true,
            status: true,
            rejectionReason: true,
            reviewedAt: true,
            createdAt: true,
          },
        },
        bankAccounts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            bankName: true,
            accountHolderName: true,
            ibanLast4: true,
            currency: true,
            isPrimary: true,
            isVerified: true,
            rejectionReason: true,
            verifiedAt: true,
            bankConfirmationDocKey: true,
            createdAt: true,
          },
        },
        auditLogs: {
          take: 15,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return {
      ...agent,
      passwordHash: undefined,
      bankAccounts: agent.bankAccounts.map((b) => ({
        ...b,
        maskedIban: maskIban(`AE00000000000000000${b.ibanLast4}`),
      })),
    };
  }

  /**
   * Updates agent account status (e.g. approve, suspend, reactivate).
   */
  public async updateAgentStatus(
    agentId: string,
    newStatus: AccountStatus,
    adminId: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await prisma.user.findUnique({
      where: { id: agentId },
    });

    if (!existing) {
      throw new Error('Agent not found');
    }

    const updated = await prisma.user.update({
      where: { id: agentId },
      data: {
        accountStatus: newStatus,
        ...(newStatus === AccountStatus.ACTIVE
          ? {
              approvedAt: new Date(),
              approvedById: adminId,
            }
          : {}),
      },
    });

    // If suspended, revoke active sessions immediately
    if (newStatus === AccountStatus.SUSPENDED || newStatus === AccountStatus.DEACTIVATED) {
      await prisma.session.updateMany({
        where: { userId: agentId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await createAuditLog({
      actorUserId: adminId,
      action: `AGENT_STATUS_${newStatus}`,
      entityType: 'USER',
      entityId: agentId,
      oldValues: { accountStatus: existing.accountStatus },
      newValues: { accountStatus: newStatus, reason },
      ipAddress,
      userAgent,
    });

    return {
      id: updated.id,
      accountStatus: updated.accountStatus,
      approvedAt: updated.approvedAt,
    };
  }

  /**
   * Searchable agency directory.
   */
  public async getAgencies(input: AgencyQueryInput) {
    const { search, status, page, limit } = input;
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { legalName: { contains: search.trim(), mode: 'insensitive' } },
        { tradeLicenseNo: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, agencies] = await Promise.all([
      prisma.agency.count({ where: whereClause }),
      prisma.agency.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      agencies: agencies.map((ag) => ({
        id: ag.id,
        name: ag.name,
        legalName: ag.legalName,
        tradeLicenseNo: ag.tradeLicenseNo,
        orn: ag.orn,
        dedLicenseNo: ag.dedLicenseNo,
        email: ag.email,
        phone: ag.phone,
        status: ag.status,
        rejectionReason: ag.rejectionReason,
        createdAt: ag.createdAt,
        verifiedAt: ag.verifiedAt,
        creator: ag.createdBy,
        totalMembers: ag.members.length,
        members: ag.members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          fullName: m.user.fullName,
          email: m.user.email,
          role: m.role,
        })),
        documentsCount: ag.documents.length,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detailed agency view.
   */
  public async getAgencyById(agencyId: string) {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                accountStatus: true,
              },
            },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        bankAccounts: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!agency) {
      throw new Error('Agency not found');
    }

    return agency;
  }

  /**
   * Updates agency status (e.g. approve, suspend, reject).
   */
  public async updateAgencyStatus(
    agencyId: string,
    newStatus: AgencyStatus,
    adminId: string,
    rejectionReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!existing) {
      throw new Error('Agency not found');
    }

    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: {
        status: newStatus,
        rejectionReason: rejectionReason ?? null,
        verifiedById: adminId,
        verifiedAt: newStatus === AgencyStatus.VERIFIED ? new Date() : null,
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: `AGENCY_STATUS_${newStatus}`,
      entityType: 'AGENCY',
      entityId: agencyId,
      oldValues: { status: existing.status },
      newValues: { status: newStatus, rejectionReason },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * KYC Review Workspace: Lists pending documents queue.
   */
  public async getPendingKycQueue(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, pendingDocs] = await Promise.all([
      prisma.kycDocument.count({
        where: { status: KycStatus.PENDING_REVIEW },
      }),
      prisma.kycDocument.findMany({
        where: { status: KycStatus.PENDING_REVIEW },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // FIFO queue
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
              agentType: true,
            },
          },
          agency: {
            select: {
              id: true,
              name: true,
              tradeLicenseNo: true,
            },
          },
        },
      }),
    ]);

    return {
      documents: pendingDocs.map((d) => ({
        id: d.id,
        documentType: d.documentType,
        originalFilename: d.originalFilename,
        fileSizeBytes: d.fileSizeBytes,
        mimeType: d.mimeType,
        sha256Checksum: d.sha256Checksum,
        status: d.status,
        createdAt: d.createdAt,
        user: d.user,
        agency: d.agency,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reviews a KYC document.
   */
  public async reviewKycDocument(
    documentId: string,
    adminId: string,
    status: KycStatus,
    rejectionReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return kycService.reviewDocument(documentId, adminId, status, rejectionReason, ipAddress, userAgent);
  }

  /**
   * Verifies a bank account.
   */
  public async verifyBankAccount(
    accountId: string,
    adminId: string,
    isVerified: boolean,
    rejectionReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return bankingService.adminVerifyBankAccount(accountId, adminId, isVerified, rejectionReason, ipAddress, userAgent);
  }

  /**
   * Revokes all active sessions for a target user.
   */
  public async revokeUserSessions(targetUserId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    const result = await prisma.session.updateMany({
      where: {
        userId: targetUserId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_REVOKED_USER_SESSIONS',
      entityType: 'USER',
      entityId: targetUserId,
      newValues: { revokedSessionsCount: result.count },
      ipAddress,
      userAgent,
    });

    return { success: true, revokedCount: result.count };
  }

  /**
   * Retrieves audit trail logs with pagination.
   */
  public async getAuditLogs(page = 1, limit = 50, entityType?: string, actorUserId?: string) {
    const skip = (page - 1) * limit;
    const whereClause: Record<string, unknown> = {};

    if (entityType) {
      whereClause.entityType = entityType;
    }
    if (actorUserId) {
      whereClause.actorUserId = actorUserId;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: whereClause }),
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actorUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
