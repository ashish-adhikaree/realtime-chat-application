import { CustomError, ValidationError } from '@/middlewares/error';
import { NextFunction, Request, Response } from 'express';
import z from 'zod';

export function validateParams(schema: z.ZodType) {
  if (!schema) {
    throw new CustomError('Schema is required.');
  }
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params ?? {});

      if (!result.success) {
        return next(new ValidationError('Validation Error', result.error.issues));
      }

      req.params = result.data as any;

      next();
    } catch (err) {
      next(new ValidationError('Invalid parameters'));
    }
  };
}

export function validateBody(schema: z.ZodType) {
  if (!schema) {
    throw new CustomError('Schema is required.');
  }
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body ?? {});

      if (!result.success) {
        return next(new ValidationError('Validation Error', result.error.issues));
      }

      req.body = result.data;

      next();
    } catch (err) {
      next(new ValidationError('Invalid request body'));
    }
  };
}

export function validateQueryParams(schema: z.ZodType) {
  if (!schema) {
    throw new CustomError('Schema is required.');
  }
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query ?? {});

      if (!result.success) {
        return next(new ValidationError('Validation Error', result.error.issues));
      }

      Object.defineProperty(req, 'query', {
        ...Object.getOwnPropertyDescriptor(req, 'query'),
        value: result.data as any,
        writable: true,
      });

      next();
    } catch (err) {
      console.log(err);
      next(new ValidationError('Invalid Query parameters'));
    }
  };
}

export function validateId(key: string = 'id') {
  const schema = z.object({
    [key]: z.string(),
  });
  return validateParams(schema);
}
