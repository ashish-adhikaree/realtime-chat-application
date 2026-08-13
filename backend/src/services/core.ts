import { conversation, conversationMember, message } from '@/db/schema/chat';
import { CustomError, NotFoundError } from '@/middlewares/error';
import type { MessageMetadata } from '@/db/schema/chat';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from '@/db';
import { createId } from '@/lib/id';
import { db } from '@/db';

type Tx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export type SystemEvent =
  | 'group_created'
  | 'member_added'
  | 'member_removed'
  | 'member_left'
  | 'role_changed'
  | 'group_renamed'
  | 'group_image_changed';

export async function getMembership(conversationId: string, userId: string, tx: Tx = db) {
  const [row] = await tx
    .select()
    .from(conversationMember)
    .where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function assertActiveMember(conversationId: string, userId: string, tx: Tx = db) {
  const [row] = await tx
    .select()
    .from(conversationMember)
    .where(
      and(
        eq(conversationMember.conversationId, conversationId),
        eq(conversationMember.userId, userId),
        isNull(conversationMember.leftAt)
      )
    )
    .limit(1);

  if (!row) throw new NotFoundError('Conversation not found');

  return row;
}

export async function assertAdmin(conversationId: string, userId: string, tx: Tx = db) {
  const membership = await assertActiveMember(conversationId, userId, tx);

  if (membership.role !== 'admin') {
    throw new CustomError('Only group admins can do that', 403);
  }

  return membership;
}

export async function getConversationRow(conversationId: string, tx: Tx = db) {
  const [row] = await tx.select().from(conversation).where(eq(conversation.id, conversationId)).limit(1);

  if (!row) throw new NotFoundError('Conversation not found');

  return row;
}

export async function appendMessage(
  tx: Tx,
  input: {
    conversationId: string;
    senderId: string | null;
    type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
    content?: string | null;
    replyToId?: string | null;
    systemEvent?: SystemEvent | null;
    metadata?: MessageMetadata | null;
  }
) {
  const [bumped] = await tx
    .update(conversation)
    .set({
      lastSeq: sql`${conversation.lastSeq} + 1`,
      lastMessageSeq: sql`${conversation.lastSeq} + 1`,
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversation.id, input.conversationId))
    .returning({ seq: conversation.lastSeq });

  if (!bumped) throw new NotFoundError('Conversation not found');

  const [row] = await tx
    .insert(message)
    .values({
      id: createId(),
      conversationId: input.conversationId,
      seq: bumped.seq,
      senderId: input.senderId,
      type: input.type ?? 'text',
      content: input.content ?? null,
      replyToId: input.replyToId ?? null,
      systemEvent: input.systemEvent ?? null,
      metadata: input.metadata ?? null,
    })
    .returning();

  return row!;
}

export async function appendSystemMessage(
  tx: Tx,
  conversationId: string,
  actorId: string | null,
  systemEvent: SystemEvent,
  metadata?: MessageMetadata
) {
  return appendMessage(tx, {
    conversationId,
    senderId: actorId,
    type: 'system',
    systemEvent,
    metadata: metadata ?? null,
  });
}
