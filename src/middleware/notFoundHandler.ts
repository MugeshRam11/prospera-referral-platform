import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
    timestamp: new Date().toISOString(),
  });
};
