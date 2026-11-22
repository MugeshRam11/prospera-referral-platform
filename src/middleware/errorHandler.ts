import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
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
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ success: false, error: { message: 'A record with these details already exists.' }, timestamp: new Date().toISOString() });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(409).json({ success: false, error: { message: 'Record changed. Refresh and try again.' }, timestamp: new Date().toISOString() });
    return;
  }
  const statusCode = err.statusCode || (err instanceof ZodError ? 400 : 500);
  const message = err.message || 'Internal Server Error';

  const responseBody: ApiResponse = {
    success: false,
    error: {
      message,
      ...(err instanceof ZodError && { details: err.issues }),
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(responseBody);
};
