import { Router, Request, Response } from 'express';
import { config } from '../config';
import { ApiResponse, HealthCheckData } from '../types';

const router = Router();

router.get('/health', (_req: Request, res: Response<ApiResponse<HealthCheckData>>) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    timestamp: new Date().toISOString(),
  });
});

export const healthRouter = router;
