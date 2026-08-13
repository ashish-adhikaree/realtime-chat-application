import { conversationMember } from '@/db/schema/chat';
import { fromNodeHeaders } from 'better-auth/node';
import { systemLogger } from '@/lib/utils/logger';
import { frontendOrigins } from '@/config/env';
import type { Server as HttpServer } from 'http';
import { and, eq, isNull } from 'drizzle-orm';
import { Server } from 'socket.io';
import { auth } from '@/lib/auth';
import { db } from '@/db';

export type RealtimeEvent =
  | 'message:new'
  | 'message:updated'
  | 'message:deleted'
  | 'conversation:updated'
  | 'conversation:removed'
  | 'request:new';

let io: Server | null = null;

const userRoom = (userId: string) => `user:${userId}`;

export function initRealtime(server: HttpServer) {
  io = new Server(server, {
    path: '/realtime',
    cors: { origin: frontendOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.request.headers),
      });

      if (!session?.user) return next(new Error('unauthorized'));

      socket.data.userId = session.user.id;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(userRoom(userId));

    socket.on('disconnect', () => {
      socket.leave(userRoom(userId));
    });
  });

  systemLogger.info('Realtime gateway ready on /realtime');

  return io;
}

export function emitToUsers(userIds: string[], event: RealtimeEvent, payload: unknown) {
  if (!io || userIds.length === 0) return;
  io.to(userIds.map(userRoom)).emit(event, payload);
}

export async function emitToConversation(
  conversationId: string,
  event: RealtimeEvent,
  payload: unknown,
  options: { exclude?: string } = {}
) {
  if (!io) return;

  const members = await db
    .select({ userId: conversationMember.userId })
    .from(conversationMember)
    .where(and(eq(conversationMember.conversationId, conversationId), isNull(conversationMember.leftAt)));

  const targets = members.map((m) => m.userId).filter((id) => id !== options.exclude);

  emitToUsers(targets, event, payload);
}
