import { prisma } from '../../lib/prisma';
import { storePrivateDocument, getDocumentReadStream } from '../../lib/documentStorage';
import { createAuditLog } from '../../lib/audit';
import { KycDocumentType, KycStatus, Role, AuthenticatedUser } from '../../types';

export class KycService {
  /**
   * Retrieves list of KYC documents for user or agency.
   */
  public async getDocuments(userId: string, agencyId?: string) {
    return prisma.kycDocument.findMany({
      where: agencyId ? { agencyId } : { userId },
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
        updatedAt: true,
      },
    });
  }

  /**
   * Uploads and registers a new private KYC document.
   */
  public async uploadDocument(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    documentType: KycDocumentType,
    agencyId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // If agencyId is provided, verify user is owner or admin of that agency
    if (agencyId) {
      const membership = await prisma.agencyMember.findFirst({
        where: {
          agencyId,
          userId,
          role: { in: ['AGENCY_OWNER', 'AGENCY_ADMIN'] },
        },
      });

      if (!membership) {
        throw new Error('Unauthorized: Only agency owners and admins can upload organization documents');
      }
    }

    const stored = await storePrivateDocument(file.buffer, file.originalname, file.mimetype);

    // Save document record in PostgreSQL with PENDING_REVIEW
    const document = await prisma.kycDocument.create({
      data: {
        userId,
        agencyId: agencyId || null,
        documentType,
        fileKey: stored.fileKey,
        originalFilename: stored.originalFilename,
        fileSizeBytes: stored.fileSizeBytes,
        mimeType: stored.mimeType,
        sha256Checksum: stored.sha256Checksum,
        status: KycStatus.PENDING_REVIEW,
      },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'KYC_DOCUMENT_UPLOADED',
      entityType: 'KYC_DOCUMENT',
      entityId: document.id,
      newValues: {
        documentType,
        fileSizeBytes: stored.fileSizeBytes,
        mimeType: stored.mimeType,
        agencyId,
      },
      ipAddress,
      userAgent,
    });

    return {
      id: document.id,
      documentType: document.documentType,
      originalFilename: document.originalFilename,
      fileSizeBytes: document.fileSizeBytes,
      mimeType: document.mimeType,
      status: document.status,
      createdAt: document.createdAt,
    };
  }

  /**
   * Submits application for admin review once requirements are met.
   */
  public async submitKyc(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycDocuments: true,
        agencyMemberships: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.kycDocuments.length === 0) {
      throw new Error('Cannot submit KYC: At least one identification document must be uploaded');
    }

    // Update accountStatus to PENDING_APPROVAL if in initial verification
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: user.accountStatus === 'PENDING_VERIFICATION' ? 'PENDING_APPROVAL' : user.accountStatus,
      },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'KYC_APPLICATION_SUBMITTED',
      entityType: 'USER',
      entityId: userId,
      oldValues: { accountStatus: user.accountStatus },
      newValues: { accountStatus: updated.accountStatus },
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      accountStatus: updated.accountStatus,
      message: 'KYC application submitted successfully. Review is pending administrator approval.',
    };
  }

  /**
   * Authorizes and streams private document.
   * Cross-agent isolation: Only document owner, organization owner/admin, or Prospera Admin may access.
   */
  public async getDocumentStream(documentId: string, currentUser: AuthenticatedUser, ipAddress?: string) {
    const document = await prisma.kycDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const isAdmin = currentUser.role === Role.ADMIN;
    const isOwner = document.userId === currentUser.id;

    let isAgencyAdmin = false;
    if (document.agencyId) {
      const membership = await prisma.agencyMember.findFirst({
        where: {
          agencyId: document.agencyId,
          userId: currentUser.id,
          role: { in: ['AGENCY_OWNER', 'AGENCY_ADMIN'] },
        },
      });
      if (membership) isAgencyAdmin = true;
    }

    if (!isAdmin && !isOwner && !isAgencyAdmin) {
      throw new Error('Access denied: You are not authorized to view this document');
    }

    const streamData = getDocumentReadStream(document.fileKey);

    // Audit log access to sensitive document
    await createAuditLog({
      actorUserId: currentUser.id,
      action: 'DOCUMENT_ACCESSED',
      entityType: 'KYC_DOCUMENT',
      entityId: document.id,
      ipAddress,
    });

    return {
      stream: streamData.stream,
      document,
    };
  }

  /**
   * Admin document review: Approve, Reject, or Request Changes.
   */
  public async reviewDocument(
    documentId: string,
    reviewerId: string,
    status: KycStatus,
    rejectionReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await prisma.kycDocument.findUnique({
      where: { id: documentId },
    });

    if (!existing) {
      throw new Error('Document not found');
    }

    const updated = await prisma.kycDocument.update({
      where: { id: documentId },
      data: {
        status,
        rejectionReason: rejectionReason ?? null,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog({
      actorUserId: reviewerId,
      action: `KYC_DOCUMENT_${status}`,
      entityType: 'KYC_DOCUMENT',
      entityId: documentId,
      oldValues: { status: existing.status },
      newValues: { status, rejectionReason },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
