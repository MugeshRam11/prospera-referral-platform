import { z } from 'zod';
import { KycDocumentType, KycStatus } from '../../types';

export const uploadDocumentSchema = z.object({
  documentType: z.nativeEnum(KycDocumentType),
  agencyId: z.string().uuid().optional(),
});

export const reviewDocumentSchema = z.object({
  status: z.nativeEnum(KycStatus),
  rejectionReason: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if ((data.status === KycStatus.REJECTED || data.status === KycStatus.CHANGES_REQUESTED) && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: 'A mandatory rejection or correction reason is required when rejecting or requesting changes',
    path: ['rejectionReason'],
  }
);

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;
