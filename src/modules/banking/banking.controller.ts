import { Request, Response, NextFunction } from 'express';
import { BankingService } from './banking.service';
import { ApiResponse } from '../../types';

const bankingService = new BankingService();

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
}

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0];
  return param ?? '';
}

export class BankingController {
  public async getBankAccounts(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const agencyId = req.query.agencyId as string | undefined;
      const accounts = await bankingService.getBankAccounts(userId, agencyId);

      res.status(200).json({
        success: true,
        data: accounts,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  public async addBankAccount(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const confirmationFile = req.file;

      const result = await bankingService.addBankAccount(
        userId,
        req.body,
        confirmationFile,
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

  public async deleteBankAccount(req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const accountId = getParam(req.params.id);

      const result = await bankingService.deleteBankAccount(
        userId,
        accountId,
        req.ip,
        getUserAgent(req)
      );

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}
