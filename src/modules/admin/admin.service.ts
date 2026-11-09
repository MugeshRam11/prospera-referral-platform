import { prisma } from '../../lib/prisma';
import { createAuditLog } from '../../lib/audit';
import { maskIban } from '../../lib/encryption';
import { KycService } from '../kyc/kyc.service';
import { BankingService } from '../banking/banking.service';
import argon2 from 'argon2';
import crypto from 'crypto';
import { AppError } from '../auth/auth.service';
import {
  AccountStatus,
  AgencyStatus,
  KycStatus,
  Role,
} from '../../types';
import { AgentType, AgencyRole, OtpPurpose, Prisma, LeadStatus, CommissionStatus } from '@prisma/client';
import {
  AgentQueryInput,
  AgencyQueryInput,
  UserQueryInput,
  CreateUserInput,
  InviteUserInput,
  UpdateUserInput,
  AdminReferralQueryInput,
  AdminServiceInput,
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

  /**
   * Searchable and filterable comprehensive user directory for Admin portal.
   */
  public async getUsers(input: UserQueryInput) {
    const { search, role, accountStatus, agentType, kycStatus, agencyId, page, limit } = input;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {};

    if (role && role !== 'ALL') {
      whereClause.role = role as Role;
    }

    if (accountStatus && accountStatus !== 'ALL') {
      whereClause.accountStatus = accountStatus as AccountStatus;
    }

    if (agentType && agentType !== 'ALL') {
      whereClause.agentType = agentType as AgentType;
    }

    if (agencyId) {
      whereClause.agencyMemberships = {
        some: { agencyId },
      };
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      whereClause.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { companyName: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
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
          nationality: true,
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
          sessions: {
            orderBy: { lastActiveAt: 'desc' },
            take: 1,
            select: {
              lastActiveAt: true,
            },
          },
          _count: {
            select: {
              sessions: {
                where: {
                  revokedAt: null,
                  expiresAt: { gt: new Date() },
                },
              },
            },
          },
        },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      let kycSummary: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'CHANGES_REQUESTED' | 'INCOMPLETE' = 'INCOMPLETE';
      if (u.kycDocuments.some((d) => d.status === 'VERIFIED')) {
        kycSummary = 'VERIFIED';
      } else if (u.kycDocuments.some((d) => d.status === 'PENDING_REVIEW')) {
        kycSummary = 'PENDING_REVIEW';
      } else if (u.kycDocuments.some((d) => d.status === 'CHANGES_REQUESTED')) {
        kycSummary = 'CHANGES_REQUESTED';
      } else if (u.kycDocuments.some((d) => d.status === 'REJECTED')) {
        kycSummary = 'REJECTED';
      }

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        whatsapp: u.whatsapp,
        avatarUrl: u.avatarUrl,
        brn: u.brn,
        nationality: u.nationality,
        role: u.role,
        agentType: u.agentType,
        accountStatus: u.accountStatus,
        companyName: u.companyName,
        createdAt: u.createdAt,
        approvedAt: u.approvedAt,
        agency: u.agencyMemberships.length > 0 ? u.agencyMemberships[0].agency : null,
        agencyRole: u.agencyMemberships.length > 0 ? u.agencyMemberships[0].role : null,
        kycStatusSummary: kycSummary,
        lastLogin: u.sessions[0]?.lastActiveAt ?? null,
        activeSessionsCount: u._count.sessions,
        hasVerifiedBank: u.bankAccounts.some((b) => b.isVerified),
      };
    });

    const filteredUsers = kycStatus && kycStatus !== 'ALL'
      ? formattedUsers.filter((u) => u.kycStatusSummary === kycStatus)
      : formattedUsers;

    return {
      users: filteredUsers,
      pagination: {
        page,
        limit,
        total: kycStatus && kycStatus !== 'ALL' ? filteredUsers.length : total,
        totalPages: Math.ceil((kycStatus && kycStatus !== 'ALL' ? filteredUsers.length : total) / limit),
      },
    };
  }

  /**
   * Detailed single user profile view with linked agency, documents, bank accounts, referrals, and audit log.
   */
  public async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agencyMemberships: {
          include: {
            agency: true,
          },
        },
        coordinator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        assignedUsers: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            accountStatus: true,
          },
        },
        kycDocuments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            documentType: true,
            status: true,
            originalFilename: true,
            fileSizeBytes: true,
            mimeType: true,
            rejectionReason: true,
            reviewedAt: true,
            expiryDate: true,
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
            createdAt: true,
          },
        },
        partnerLeads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            referenceNo: true,
            clientName: true,
            status: true,
            expectedDealValue: true,
            currency: true,
            createdAt: true,
          },
        },
        agentLeads: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            referenceNo: true,
            clientName: true,
            status: true,
            expectedDealValue: true,
            currency: true,
            createdAt: true,
          },
        },
        sessions: {
          where: {
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { lastActiveAt: 'desc' },
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            partnerLeads: true,
            agentLeads: true,
            coordinatorLeads: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [{ entityId: userId }, { actorUserId: userId }],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    let kycSummary: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'CHANGES_REQUESTED' | 'INCOMPLETE' = 'INCOMPLETE';
    if (user.kycDocuments.some((d) => d.status === 'VERIFIED')) {
      kycSummary = 'VERIFIED';
    } else if (user.kycDocuments.some((d) => d.status === 'PENDING_REVIEW')) {
      kycSummary = 'PENDING_REVIEW';
    } else if (user.kycDocuments.some((d) => d.status === 'CHANGES_REQUESTED')) {
      kycSummary = 'CHANGES_REQUESTED';
    } else if (user.kycDocuments.some((d) => d.status === 'REJECTED')) {
      kycSummary = 'REJECTED';
    }

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        avatarUrl: user.avatarUrl,
        brn: user.brn,
        nationality: user.nationality,
        role: user.role,
        agentType: user.agentType,
        accountStatus: user.accountStatus,
        companyName: user.companyName,
        referralCode: user.referralCode,
        emailVerifiedAt: user.emailVerifiedAt,
        kycVerifiedAt: user.kycVerifiedAt,
        approvedAt: user.approvedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        kycStatusSummary: kycSummary,
        agency: user.agencyMemberships.length > 0 ? user.agencyMemberships[0].agency : null,
        agencyRole: user.agencyMemberships.length > 0 ? user.agencyMemberships[0].role : null,
        coordinator: user.coordinator,
        assignedUsers: user.assignedUsers,
        kycDocuments: user.kycDocuments,
        bankAccounts: user.bankAccounts,
        referrals: [...user.partnerLeads, ...user.agentLeads],
        leadCounts: {
          partnerLeads: user._count.partnerLeads,
          agentLeads: user._count.agentLeads,
          coordinatorLeads: user._count.coordinatorLeads,
        },
        activeSessions: user.sessions,
        recentActivity: auditLogs,
      },
    };
  }

  /**
   * Administrative creation of a new user with platform role and optional agency linking.
   */
  public async createUser(input: CreateUserInput, adminId: string, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError(409, 'A user with this email address is already registered.');
    }

    const plainPassword = input.password || ('Pr0s!' + crypto.randomBytes(9).toString('base64url'));
    const passwordHash = await argon2.hash(plainPassword);

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp,
        role: input.role as Role,
        agentType: input.agentType as AgentType,
        companyName: input.companyName,
        passwordHash,
        accountStatus: input.accountStatus as AccountStatus,
        emailVerifiedAt: new Date(),
        approvedAt: input.accountStatus === AccountStatus.ACTIVE ? new Date() : null,
        approvedById: input.accountStatus === AccountStatus.ACTIVE ? adminId : null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        whatsapp: true,
        role: true,
        agentType: true,
        accountStatus: true,
        companyName: true,
        createdAt: true,
      },
    });

    if (input.agencyId) {
      await prisma.agencyMember.create({
        data: {
          agencyId: input.agencyId,
          userId: user.id,
          role: (input.agencyRole as AgencyRole) || AgencyRole.AGENT,
          status: 'ACTIVE',
        },
      });
    }

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      newValues: {
        email: user.email,
        role: user.role,
        agentType: user.agentType,
        accountStatus: user.accountStatus,
        agencyId: input.agencyId,
      },
      ipAddress,
      userAgent,
    });

    return {
      user,
      message: 'User created successfully.',
    };
  }

  /**
   * Administrative invitation of a new user.
   */
  public async inviteUser(input: InviteUserInput, adminId: string, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new AppError(409, 'A user with this email address is already registered.');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const tempPassword = 'Inv!' + crypto.randomBytes(9).toString('base64url');
    const passwordHash = await argon2.hash(tempPassword);

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        role: input.role as Role,
        agentType: input.agentType as AgentType,
        companyName: input.companyName,
        passwordHash,
        accountStatus: AccountStatus.PENDING_VERIFICATION,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        agentType: true,
        accountStatus: true,
        createdAt: true,
      },
    });

    if (input.agencyId) {
      await prisma.agencyMember.create({
        data: {
          agencyId: input.agencyId,
          userId: user.id,
          role: (input.agencyRole as AgencyRole) || AgencyRole.AGENT,
          status: 'PENDING',
        },
      });
    }

    await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        email: user.email,
        codeHash: await argon2.hash(inviteToken.slice(0, 8)),
        purpose: OtpPurpose.SIGNUP_VERIFICATION,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_USER_INVITED',
      entityType: 'User',
      entityId: user.id,
      newValues: {
        email: user.email,
        role: user.role,
        agencyId: input.agencyId,
      },
      ipAddress,
      userAgent,
    });

    return {
      message: 'Invitation dispatched to user email successfully.',
      user,
    };
  }

  /**
   * Administrative update of permitted user profile attributes with role safeguards.
   */
  public async updateUser(userId: string, input: UpdateUserInput, adminId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (adminId === userId && input.role && input.role !== Role.ADMIN) {
      throw new AppError(400, 'Self-demotion is not permitted. Administrators cannot remove their own admin privileges.');
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.whatsapp !== undefined) updateData.whatsapp = input.whatsapp;
    if (input.brn !== undefined) updateData.brn = input.brn;
    if (input.nationality !== undefined) updateData.nationality = input.nationality;
    if (input.companyName !== undefined) updateData.companyName = input.companyName;
    if (input.role !== undefined) updateData.role = input.role as Role;
    if (input.agentType !== undefined) updateData.agentType = input.agentType as AgentType;
    if (input.coordinatorId !== undefined) {
      if (input.coordinatorId === null) {
        updateData.coordinator = { disconnect: true };
      } else {
        updateData.coordinator = { connect: { id: input.coordinatorId } };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        whatsapp: true,
        brn: true,
        nationality: true,
        role: true,
        agentType: true,
        accountStatus: true,
        companyName: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_USER_UPDATED',
      entityType: 'User',
      entityId: userId,
      oldValues: {
        fullName: user.fullName,
        role: user.role,
        agentType: user.agentType,
        companyName: user.companyName,
      },
      newValues: updateData,
      ipAddress,
      userAgent,
    });

    return updatedUser;
  }

  /**
   * Administrative status transitions: Approve, Suspend, Reactivate, Deactivate.
   */
  public async updateUserStatus(
    userId: string,
    status: AccountStatus,
    adminId: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    if (adminId === userId && (status === AccountStatus.SUSPENDED || status === AccountStatus.DEACTIVATED)) {
      throw new AppError(400, 'Administrators cannot suspend or deactivate their own account.');
    }

    const updateData: Prisma.UserUpdateInput = {
      accountStatus: status,
    };

    if (status === AccountStatus.ACTIVE) {
      updateData.approvedAt = new Date();
      updateData.approvedBy = { connect: { id: adminId } };
    }

    if (status === AccountStatus.SUSPENDED || status === AccountStatus.DEACTIVATED) {
      await prisma.session.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        accountStatus: true,
        approvedAt: true,
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_USER_STATUS_UPDATED',
      entityType: 'User',
      entityId: userId,
      oldValues: { status: user.accountStatus },
      newValues: { status, reason: reason ?? null },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Administrative password reset request. Generates an OTP challenge for user.
   */
  public async requestPasswordReset(
    userId: string,
    adminId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await argon2.hash(resetCode);

    await prisma.otpChallenge.updateMany({
      where: {
        userId,
        purpose: OtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    await prisma.otpChallenge.create({
      data: {
        userId: user.id,
        email: user.email,
        codeHash,
        purpose: OtpPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Password reset notification dispatched to user email.',
      email: user.email,
    };
  }

  /**
   * Retrieves coordinators with assigned leads and agent counts.
   */
  public async getCoordinators(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: Prisma.UserWhereInput = {
      role: Role.COORDINATOR,
    };

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, coordinators] = await Promise.all([
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
          accountStatus: true,
          createdAt: true,
          _count: {
            select: {
              assignedUsers: true,
              coordinatorLeads: true,
            },
          },
          assignedUsers: {
            take: 5,
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      coordinators: coordinators.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        accountStatus: c.accountStatus,
        createdAt: c.createdAt,
        assignedAgentsCount: c._count.assignedUsers,
        assignedLeadsCount: c._count.coordinatorLeads,
        recentAgents: c.assignedUsers,
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
   * Retrieves referral partners with referral stats.
   */
  public async getReferralPartners(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const whereClause: Prisma.UserWhereInput = {
      role: Role.REFERRAL_PARTNER,
    };

    if (search && search.trim().length > 0) {
      whereClause.OR = [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { companyName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, partners] = await Promise.all([
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
          companyName: true,
          accountStatus: true,
          createdAt: true,
          _count: {
            select: {
              partnerLeads: true,
            },
          },
          partnerLeads: {
            select: {
              status: true,
              expectedDealValue: true,
              actualDealValue: true,
            },
          },
          bankAccounts: {
            select: {
              isVerified: true,
            },
          },
        },
      }),
    ]);

    return {
      partners: partners.map((p) => {
        const wonLeads = p.partnerLeads.filter((l) => l.status === 'WON');
        const wonValue = wonLeads.reduce((acc, curr) => acc + Number(curr.actualDealValue || curr.expectedDealValue || 0), 0);

        return {
          id: p.id,
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          companyName: p.companyName,
          accountStatus: p.accountStatus,
          createdAt: p.createdAt,
          totalReferrals: p._count.partnerLeads,
          wonReferralsCount: wonLeads.length,
          wonVolume: wonValue,
          hasVerifiedBank: p.bankAccounts.some((b) => b.isVerified),
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves all platform referrals with search and filters for Admin portal.
   */
  public async getAllReferrals(input: AdminReferralQueryInput) {
    const { search, status, serviceId, partnerId, agentId, coordinatorId, page, limit } = input;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.LeadWhereInput = {};

    if (status && status !== 'ALL') {
      whereClause.status = status as LeadStatus;
    }
    if (serviceId) {
      whereClause.serviceId = serviceId;
    }
    if (partnerId) {
      whereClause.partnerId = partnerId;
    }
    if (agentId) {
      whereClause.agentId = agentId;
    }
    if (coordinatorId) {
      whereClause.coordinatorId = coordinatorId;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      whereClause.OR = [
        { referenceNo: { contains: term, mode: 'insensitive' } },
        { clientName: { contains: term, mode: 'insensitive' } },
        { clientEmail: { contains: term, mode: 'insensitive' } },
        { clientPhone: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, referrals] = await Promise.all([
      prisma.lead.count({ where: whereClause }),
      prisma.lead.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          partner: {
            select: {
              id: true,
              fullName: true,
              email: true,
              companyName: true,
            },
          },
          agent: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          coordinator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return {
      referrals: referrals.map((r) => ({
        id: r.id,
        referenceNo: r.referenceNo,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        clientPhone: r.clientPhone,
        expectedDealValue: Number(r.expectedDealValue),
        actualDealValue: r.actualDealValue ? Number(r.actualDealValue) : null,
        currency: r.currency,
        status: r.status,
        partner: r.partner,
        agent: r.agent,
        coordinator: r.coordinator,
        service: r.service,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
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
   * Retrieves service catalog for Admin management.
   */
  public async getAllServices() {
    return await prisma.service.findMany({
      orderBy: { name: 'asc' },
      include: {
        category: true,
        commissionRules: true,
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });
  }

  /**
   * Adds or updates a platform service.
   */
  public async createService(input: AdminServiceInput, adminId: string, ipAddress?: string, userAgent?: string) {
    let categoryId = input.categoryId;
    if (!categoryId) {
      const defaultCat = await prisma.serviceCategory.findFirst();
      if (defaultCat) {
        categoryId = defaultCat.id;
      } else {
        const cat = await prisma.serviceCategory.create({
          data: {
            name: 'General',
            slug: 'general',
            description: 'General Platform Services',
          },
        });
        categoryId = cat.id;
      }
    }

    const service = await prisma.service.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        categoryId,
        defaultPartnerCommissionBps: input.defaultPartnerCommissionBps,
        defaultAgentCommissionBps: input.defaultAgentCommissionBps,
        isActive: input.isActive,
      },
      include: {
        category: true,
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: 'ADMIN_SERVICE_CREATED',
      entityType: 'Service',
      entityId: service.id,
      newValues: { name: service.name, slug: service.slug },
      ipAddress,
      userAgent,
    });

    return service;
  }

  /**
   * Retrieves bank accounts across platform for verification queue.
   */
  public async getAllBankAccounts(page = 1, limit = 20, isVerified?: boolean) {
    const skip = (page - 1) * limit;
    const whereClause: Prisma.BankAccountWhereInput = {};

    if (isVerified !== undefined) {
      whereClause.isVerified = isVerified;
    }

    const [total, accounts] = await Promise.all([
      prisma.bankAccount.count({ where: whereClause }),
      prisma.bankAccount.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
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
      accounts: accounts.map((b) => ({
        id: b.id,
        bankName: b.bankName,
        accountHolderName: b.accountHolderName,
        ibanLast4: b.ibanLast4,
        currency: b.currency,
        isPrimary: b.isPrimary,
        isVerified: b.isVerified,
        rejectionReason: b.rejectionReason,
        verifiedAt: b.verifiedAt,
        createdAt: b.createdAt,
        user: b.user,
        agency: b.agency,
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
   * Retrieves commission ledger entries for Admin audit.
   */
  public async getCommissionsLedger(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const whereClause: Prisma.CommissionLedgerEntryWhereInput = {};

    if (status && status !== 'ALL') {
      whereClause.status = status as CommissionStatus;
    }

    const [total, entries] = await Promise.all([
      prisma.commissionLedgerEntry.count({ where: whereClause }),
      prisma.commissionLedgerEntry.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          recipientUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          lead: {
            select: {
              id: true,
              referenceNo: true,
              clientName: true,
            },
          },
        },
      }),
    ]);

    return {
      entries: entries.map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        currency: e.currency,
        dealValue: Number(e.dealValue),
        commissionBps: e.commissionBps,
        entryType: e.entryType,
        status: e.status,
        description: e.description,
        availableAt: e.availableAt,
        createdAt: e.createdAt,
        recipient: e.recipientUser,
        lead: e.lead,
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
   * Generates institutional summary reports for Admin portal.
   */
  public async getPlatformReports() {
    const [
      totalUsers,
      totalAgencies,
      leadsByStatus,
      totalCommissions,
      recentWonLeads,
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.agency.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { expectedDealValue: true, actualDealValue: true },
      }),
      prisma.commissionLedgerEntry.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.lead.findMany({
        where: { status: 'WON' },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          service: { select: { name: true } },
          partner: { select: { fullName: true } },
        },
      }),
    ]);

    return {
      usersByRole: totalUsers.map((u) => ({ role: u.role, count: u._count.id })),
      agenciesByStatus: totalAgencies.map((a) => ({ status: a.status, count: a._count.id })),
      leadsFunnel: leadsByStatus.map((l) => ({
        status: l.status,
        count: l._count.id,
        expectedValue: Number(l._sum.expectedDealValue ?? 0),
        actualValue: Number(l._sum.actualDealValue ?? 0),
      })),
      totalCommissionsAccrued: Number(totalCommissions._sum.amount ?? 0),
      totalCommissionEntries: totalCommissions._count.id,
      recentWonLeads: recentWonLeads.map((w) => ({
        id: w.id,
        referenceNo: w.referenceNo,
        clientName: w.clientName,
        service: w.service.name,
        partner: w.partner.fullName,
        dealValue: Number(w.actualDealValue ?? w.expectedDealValue),
        wonAt: w.updatedAt,
      })),
    };
  }

  /**
   * Retrieves configured synthetic development demo personas (dev-only).
   */
  public async getDemoPersonas() {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(403, 'Demo personas directory is strictly disabled in production environments.');
    }

    const demoUsers = await prisma.user.findMany({
      where: {
        email: { endsWith: '@demo.prospera.test' },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        agentType: true,
        accountStatus: true,
        companyName: true,
        agencyMemberships: {
          include: {
            agency: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      personas: demoUsers.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        agentType: u.agentType,
        accountStatus: u.accountStatus,
        companyName: u.companyName,
        agency: u.agencyMemberships[0]?.agency ?? null,
        agencyRole: u.agencyMemberships[0]?.role ?? null,
      })),
    };
  }
}
