import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(result.error);
      return;
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      configurable: true,
    });
    next();
  };
};

export const validate = (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') => {
  return target === 'query' ? validateQuery(schema) : validateBody(schema);
};

