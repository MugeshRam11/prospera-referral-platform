import { prisma } from '../../lib/prisma';
import { encryptSensitive, maskIban, extractIbanLast4 } from '../../lib/encryption';
import { storePrivateDocument } from '../../lib/documentStorage';
import { createAuditLog } from '../../lib/audit';
import { CreateBankAccountInput } from './banking.validation';

export class BankingService {
  /**
   * Retrieves bank accounts for user or organization with masked IBAN.
   */
  public async getBankAccounts(userId: string, agencyId?: string) {
    const accounts = await prisma.bankAccount.findMany({
      where: agencyId ? { agencyId } : { userId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        userId: true,
        agencyId: true,
        bankName: true,
        accountHolderName: true,
        ibanLast4: true,
        currency: true,
        bankConfirmationDocKey: true,
        isPrimary: true,
        isVerified: true,
        rejectionReason: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    return accounts.map((acc) => ({
      ...acc,
      maskedIban: maskIban(`AE00000000000000000${acc.ibanLast4}`),
      hasConfirmationDoc: Boolean(acc.bankConfirmationDocKey),
    }));
  }

  /**
   * Adds or replaces a bank account with AES-256-GCM encryption at rest.
   */
  public async addBankAccount(
    userId: string,
    input: CreateBankAccountInput,
    confirmationFile?: { buffer: Buffer; originalname: string; mimetype: string },
    ipAddress?: string,
    userAgent?: string
  ) {
    // If agencyId is passed, verify caller permissions
    if (input.agencyId) {
      const membership = await prisma.agencyMember.findFirst({
        where: {
          agencyId: input.agencyId,
          userId,
          role: { in: ['AGENCY_OWNER', 'AGENCY_ADMIN'] },
        },
      });
      if (!membership) {
        throw new Error('Unauthorized: Only agency owners and admins can configure agency bank details');
      }
    }

    let confirmationDocKey: string | null = null;
    if (confirmationFile) {
      const stored = await storePrivateDocument(
        confirmationFile.buffer,
        confirmationFile.originalname,
        confirmationFile.mimetype
      );
      confirmationDocKey = stored.fileKey;
    }

    const cleanedIban = input.iban.replace(/\s+/g, '').toUpperCase();
    const ibanLast4 = extractIbanLast4(cleanedIban);
    const encryptedIban = encryptSensitive(cleanedIban);
    const encryptedSwift = input.swift && input.swift.trim().length > 0 ? encryptSensitive(input.swift.trim().toUpperCase()) : null;

    // Use transaction to atomically update primary flag and create record
    const account = await prisma.$transaction(async (tx) => {
      if (input.isPrimary) {
        if (input.agencyId) {
          await tx.bankAccount.updateMany({
            where: { agencyId: input.agencyId },
            data: { isPrimary: false },
          });
        } else {
          await tx.bankAccount.updateMany({
            where: { userId, agencyId: null },
            data: { isPrimary: false },
          });
        }
      }

      return tx.bankAccount.create({
        data: {
          userId,
          agencyId: input.agencyId || null,
          bankName: input.bankName,
          accountHolderName: input.accountHolderName,
          ibanLast4,
          encryptedIban,
          encryptedSwift,
          currency: input.currency || 'AED',
          bankConfirmationDocKey: confirmationDocKey,
          isPrimary: input.isPrimary ?? true,
          isVerified: false,
        },
      });
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'BANK_ACCOUNT_ADDED',
      entityType: 'BANK_ACCOUNT',
      entityId: account.id,
      newValues: {
        bankName: account.bankName,
        ibanLast4: account.ibanLast4,
        currency: account.currency,
        agencyId: account.agencyId,
        hasConfirmationDoc: Boolean(confirmationDocKey),
      },
      ipAddress,
      userAgent,
    });

    return {
      id: account.id,
      bankName: account.bankName,
      accountHolderName: account.accountHolderName,
      ibanLast4: account.ibanLast4,
      maskedIban: maskIban(`AE00000000000000000${account.ibanLast4}`),
      currency: account.currency,
      isPrimary: account.isPrimary,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
    };
  }

  /**
   * Deletes a bank account.
   */
  public async deleteBankAccount(userId: string, accountId: string, ipAddress?: string, userAgent?: string) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    if (account.userId !== userId) {
      throw new Error('Access denied: You do not own this bank account');
    }

    await prisma.bankAccount.delete({
      where: { id: accountId },
    });

    await createAuditLog({
      actorUserId: userId,
      action: 'BANK_ACCOUNT_DELETED',
      entityType: 'BANK_ACCOUNT',
      entityId: accountId,
      oldValues: { bankName: account.bankName, ibanLast4: account.ibanLast4 },
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  /**
   * Admin verifies or rejects bank account.
   */
  public async adminVerifyBankAccount(
    accountId: string,
    adminId: string,
    isVerified: boolean,
    rejectionReason?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const existing = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing) {
      throw new Error('Bank account not found');
    }

    const updated = await prisma.bankAccount.update({
      where: { id: accountId },
      data: {
        isVerified,
        rejectionReason: !isVerified ? rejectionReason ?? 'Rejected by administrator' : null,
        verifiedById: adminId,
        verifiedAt: new Date(),
      },
    });

    await createAuditLog({
      actorUserId: adminId,
      action: isVerified ? 'BANK_ACCOUNT_VERIFIED' : 'BANK_ACCOUNT_REJECTED',
      entityType: 'BANK_ACCOUNT',
      entityId: accountId,
      oldValues: { isVerified: existing.isVerified },
      newValues: { isVerified, rejectionReason },
      ipAddress,
      userAgent,
    });

    return {
      id: updated.id,
      isVerified: updated.isVerified,
      rejectionReason: updated.rejectionReason,
      verifiedAt: updated.verifiedAt,
    };
  }
}
