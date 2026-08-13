import { NextFunction, Request, Response } from 'express';
import { UnAuthorizedError } from '@/middlewares/error';

export type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

export function asyncHandler(handler: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function currentUserId(req: Request) {
  if (!req.user) throw new UnAuthorizedError();
  return req.user.id;
}
