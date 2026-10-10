import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (
  err: AppError,
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || (err instanceof ZodError ? 400 : 500);
  const message = err.message || 'Internal Server Error';

  const responseBody: ApiResponse = {
    success: false,
    error: {
      message,
      ...(err instanceof ZodError && { details: err.errors }),
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(responseBody);
};
