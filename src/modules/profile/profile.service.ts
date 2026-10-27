import { prisma } from '../../lib/prisma';
import { maskIban } from '../../lib/encryption';
import { createAuditLog } from '../../lib/audit';
import { storePrivateDocument } from '../../lib/documentStorage';
import { UpdateProfileInput } from './profile.validation';

export interface ProfileCompletionDetails {
  percentage: number;
  isComplete: boolean;
  checklist: {
    field: string;
    completed: boolean;
    weight: number;
  }[];
}

export class ProfileService {
  /**
   * Calculates dynamic profile completion score and missing requirements checklist.
   */
  public calculateCompletion(user: {
    fullName?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    avatarUrl?: string | null;
    brn?: string | null;
    kycDocuments?: { status: string }[];
    bankAccounts?: { isVerified?: boolean }[];
  }): ProfileCompletionDetails {
    const checklist = [
      { field: 'Full Name', completed: Boolean(user.fullName && user.fullName.trim().length > 0), weight: 15 },
      { field: 'Phone Number', completed: Boolean(user.phone && user.phone.trim().length > 0), weight: 15 },
      { field: 'WhatsApp Number', completed: Boolean(user.whatsapp && user.whatsapp.trim().length > 0), weight: 10 },
      { field: 'Profile Photograph', completed: Boolean(user.avatarUrl && user.avatarUrl.trim().length > 0), weight: 10 },
      { field: 'Professional BRN / License', completed: Boolean(user.brn && user.brn.trim().length > 0), weight: 15 },
      {
        field: 'Identity & KYC Documents',
        completed: Boolean(user.kycDocuments && user.kycDocuments.some((d) => d.status === 'VERIFIED' || d.status === 'PENDING_REVIEW')),
        weight: 20,
      },
      {
        field: 'Bank Account Details',
        completed: Boolean(user.bankAccounts && user.bankAccounts.length > 0),
        weight: 15,
      },
    ];

    const completedWeight = checklist.reduce((acc, curr) => (curr.completed ? acc + curr.weight : acc), 0);
    const percentage = Math.min(100, completedWeight);

    return {
      percentage,
      isComplete: percentage >= 85,
      checklist,
    };
  }

  /**
   * Retrieves full profile including agency membership, KYC status summary, and bank details.
   */
  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agencyMemberships: {
          include: {
            agency: true,
          },
        },
        kycDocuments: {
          select: {
            id: true,
            documentType: true,
            originalFilename: true,
            status: true,
            rejectionReason: true,
            createdAt: true,
            reviewedAt: true,
          },
        },
        bankAccounts: {
          select: {
            id: true,
            bankName: true,
            accountHolderName: true,
            ibanLast4: true,
            currency: true,
            isPrimary: true,
            isVerified: true,
            rejectionReason: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const completion = this.calculateCompletion(user);

    // Format safe profile data without secrets
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
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
      deletionRequestedAt: user.deletionRequestedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      completion,
      agency: user.agencyMemberships.length > 0 ? {
        membershipId: user.agencyMemberships[0].id,
        role: user.agencyMemberships[0].role,
        joinedAt: user.agencyMemberships[0].joinedAt,
        agencyId: user.agencyMemberships[0].agency.id,
        agencyName: user.agencyMemberships[0].agency.name,
        legalName: user.agencyMemberships[0].agency.legalName,
        tradeLicenseNo: user.agencyMemberships[0].agency.tradeLicenseNo,
        status: user.agencyMemberships[0].agency.status,
      } : null,
      kycDocuments: user.kycDocuments,
      bankAccounts: user.bankAccounts.map((b) => ({
        ...b,
        maskedIban: maskIban(`AE00000000000000000${b.ibanLast4}`),
      })),
    };
  }

  /**
   * Updates mutable profile attributes.
   */
  public async updateProfile(userId: string, input: UpdateProfileInput, ipAddress?: string, userAgent?: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new Error('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
        ...(input.brn !== undefined ? { brn: input.brn } : {}),
        ...(input.nationality !== undefined ? { nationality: input.nationality } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
      },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: userId,
      oldValues: {
        fullName: existing.fullName,
        phone: existing.phone,
        whatsapp: existing.whatsapp,
        brn: existing.brn,
      },
      newValues: {
        fullName: updated.fullName,
        phone: updated.phone,
        whatsapp: updated.whatsapp,
        brn: updated.brn,
      },
      ipAddress,
      userAgent,
    });

    return this.getProfile(userId);
  }

  /**
   * Uploads and links a profile photograph.
   */
  public async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    ipAddress?: string,
    userAgent?: string
  ) {
    const stored = await storePrivateDocument(file.buffer, file.originalname, file.mimetype);

    // Private URL endpoint served through document download route
    const avatarUrl = `/api/v1/documents/avatar/${stored.fileKey}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'AVATAR_UPLOADED',
      entityType: 'USER',
      entityId: userId,
      newValues: { fileKey: stored.fileKey },
      ipAddress,
      userAgent,
    });

    return { avatarUrl };
  }

  /**
   * Submits user request to delete account (compliant with data privacy regulations).
   */
  public async requestAccountDeletion(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
      },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      entityType: 'USER',
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      deletionRequestedAt: user.deletionRequestedAt,
      message: 'Account deletion request received and scheduled for review.',
    };
  }
}
