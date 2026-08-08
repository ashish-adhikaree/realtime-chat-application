import type { Session, User } from '@/lib/auth';

declare global {
  namespace Express {
    interface Request {
      user: User | null;
      session: Session | null;
    }
  }
}

export {};
