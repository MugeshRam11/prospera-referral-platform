import { Request, Response, NextFunction } from 'express';
import { KycService } from './kyc.service';
import { ApiResponse, KycDocumentType } from '../../types';

const kycService = new KycService();

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param ?? '';
}

export class KycController {
  public async getDocuments(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const agencyId = req.query.agencyId as string | undefined;
      const documents = await kycService.getDocuments(userId, agencyId);

      res.status(200).json({
        success: true,
        data: documents,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async uploadDocument(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: { message: 'No document file uploaded' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const documentType = req.body.documentType as KycDocumentType;
      const agencyId = req.body.agencyId as string | undefined;

      const result = await kycService.uploadDocument(
        userId,
        req.file,
        documentType,
        agencyId,
        req.ip,
        getUserAgent(req)
      );

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async submitKyc(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const result = await kycService.submitKyc(userId, req.ip, getUserAgent(req));

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = getParam(req.params.id);
      const { stream, document } = await kycService.getDocumentStream(documentId, req.user!, req.ip);

      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${document.originalFilename}"`);
      res.setHeader('Content-Length', document.fileSizeBytes);

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
