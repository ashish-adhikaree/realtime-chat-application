import { NextFunction, Request, Response } from 'express';
import { UnAuthorizedError } from '@/middlewares/error';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@/lib/auth';

export async function attachSession(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    req.user = data?.user ?? null;
    req.session = data?.session ?? null;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.session) {
    return next(new UnAuthorizedError());
  }

  next();
}
