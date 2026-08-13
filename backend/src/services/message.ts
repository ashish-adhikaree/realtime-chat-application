import { block, contact, conversationRequest, message, messageAttachment, messageReaction, userProfile } from '@/db/schema/chat';
import { appendMessage, assertActiveMember, getConversationRow } from '@/services/core';
import { CustomError, NotFoundError, ValidationError } from '@/middlewares/error';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { resolveMediaUrl } from '@/lib/storage';
import { user } from '@/db/schema/auth';
import { createId } from '@/lib/id';
import { emitToConversation, emitToUsers } from '@/lib/realtime';
import { db } from '@/db';

export const MESSAGE_PAGE_SIZE = 40;

type AttachmentInput = {
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  fileName?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  thumbnailKey?: string;
};

async function visibilityBounds(conversationId: string, viewerId: string) {
  const membership = await assertActiveMember(conversationId, viewerId);

  const [request] = await db
    .select()
    .from(conversationRequest)
    .where(eq(conversationRequest.conversationId, conversationId))
    .limit(1);

  const gatedThrough =
    request && request.state === 'pending' && request.recipientId === viewerId ? request.allowedThroughSeq : null;

  return { fromSeq: membership.historyVisibleFromSeq, gatedThrough };
}

async function serializeMessages(rows: Awaited<ReturnType<typeof fetchMessageRows>>, viewerId: string) {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  const attachments = await db.select().from(messageAttachment).where(inArray(messageAttachment.messageId, ids));

  const reactions = await db
    .select({
      messageId: messageReaction.messageId,
      userId: messageReaction.userId,
      emoji: messageReaction.emoji,
      name: user.name,
    })
    .from(messageReaction)
    .innerJoin(user, eq(user.id, messageReaction.userId))
    .where(inArray(messageReaction.messageId, ids));

  const attachmentsByMessage = new Map<string, typeof attachments>();
  for (const row of attachments) {
    const list = attachmentsByMessage.get(row.messageId) ?? [];
    list.push(row);
    attachmentsByMessage.set(row.messageId, list);
  }

  const reactionsByMessage = new Map<string, typeof reactions>();
  for (const row of reactions) {
    const list = reactionsByMessage.get(row.messageId) ?? [];
    list.push(row);
    reactionsByMessage.set(row.messageId, list);
  }

  return Promise.all(
    rows.map(async (row) => {
      const rawAttachments = attachmentsByMessage.get(row.id) ?? [];
      const rawReactions = reactionsByMessage.get(row.id) ?? [];

      const grouped = new Map<string, { emoji: string; count: number; users: string[]; reactedByMe: boolean }>();
      for (const reaction of rawReactions) {
        const entry = grouped.get(reaction.emoji) ?? {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          reactedByMe: false,
        };
        entry.count += 1;
        entry.users.push(reaction.name);
        if (reaction.userId === viewerId) entry.reactedByMe = true;
        grouped.set(reaction.emoji, entry);
      }

      return {
        id: row.id,
        conversationId: row.conversationId,
        seq: row.seq,
        senderId: row.senderId,
        senderName: row.senderName,
        senderImage: (await resolveMediaUrl(row.senderAvatarKey)) ?? row.senderImage,
        type: row.type,
        content: row.deletedAt ? null : row.content,
        systemEvent: row.systemEvent,
        metadata: row.metadata,
        replyToId: row.replyToId,
        editedAt: row.editedAt,
        deletedAt: row.deletedAt,
        createdAt: row.createdAt,
        attachments: await Promise.all(
          rawAttachments
            .sort((a, b) => a.position - b.position)
            .map(async (a) => ({
              id: a.id,
              url: await resolveMediaUrl(a.objectKey),
              thumbnailUrl: await resolveMediaUrl(a.thumbnailKey),
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              fileName: a.fileName,
              width: a.width,
              height: a.height,
              durationMs: a.durationMs,
            }))
        ),
        reactions: [...grouped.values()],
      };
    })
  );
}

async function fetchMessageRows(conversationId: string, fromSeq: number, gatedThrough: number | null, before?: number) {
  return db
    .select({
      id: message.id,
      conversationId: message.conversationId,
      seq: message.seq,
      senderId: message.senderId,
      senderName: user.name,
      senderImage: user.image,
      senderAvatarKey: userProfile.avatarKey,
      type: message.type,
      content: message.content,
      systemEvent: message.systemEvent,
      metadata: message.metadata,
      replyToId: message.replyToId,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      createdAt: message.createdAt,
    })
    .from(message)
    .leftJoin(user, eq(user.id, message.senderId))
    .leftJoin(userProfile, eq(userProfile.userId, message.senderId))
    .where(
      and(
        eq(message.conversationId, conversationId),
        sql`${message.seq} >= ${fromSeq}`,
        gatedThrough === null ? sql`true` : sql`${message.seq} <= ${gatedThrough}`,
        before === undefined ? sql`true` : lt(message.seq, before)
      )
    )
    .orderBy(desc(message.seq))
    .limit(MESSAGE_PAGE_SIZE);
}

export async function listMessages(viewerId: string, conversationId: string, before?: number) {
  const { fromSeq, gatedThrough } = await visibilityBounds(conversationId, viewerId);

  const rows = await fetchMessageRows(conversationId, fromSeq, gatedThrough, before);
  const serialized = await serializeMessages(rows, viewerId);

  return {
    messages: serialized.reverse(),
    nextCursor: rows.length === MESSAGE_PAGE_SIZE ? rows[rows.length - 1]!.seq : null,
  };
}

type DirectGate = { openRequestFor?: string; acceptExisting?: boolean; reopenRequest?: boolean };

async function resolveDirectGate(conversationId: string, senderId: string): Promise<DirectGate> {
  const row = await getConversationRow(conversationId);

  if (row.type !== 'direct') return {};

  const [counterpart] = await db
    .execute<{ user_id: string }>(
      sql`select user_id from conversation_member
          where conversation_id = ${conversationId} and user_id <> ${senderId} and left_at is null limit 1`
    )
    .then((r) => r.rows);

  if (counterpart) {
    const [blockRow] = await db
      .select({ blockerId: block.blockerId })
      .from(block)
      .where(
        sql`(${block.blockerId} = ${senderId} and ${block.blockedId} = ${counterpart.user_id})
         or (${block.blockerId} = ${counterpart.user_id} and ${block.blockedId} = ${senderId})`
      )
      .limit(1);

    if (blockRow) {
      throw new CustomError(
        blockRow.blockerId === senderId
          ? 'You blocked this user. Unblock them to send messages.'
          : 'You can no longer send messages to this user.',
        403
      );
    }
  }

  const [existingRequest] = await db
    .select()
    .from(conversationRequest)
    .where(eq(conversationRequest.conversationId, conversationId))
    .limit(1);

  if (existingRequest) {
    if (existingRequest.requesterId === senderId) {
      if (existingRequest.state === 'pending' && existingRequest.allowedThroughSeq > 0) {
        throw new CustomError('You can only send one message until they reply to your request', 403);
      }

      if (existingRequest.state === 'declined') {
        throw new CustomError('Your message request was declined', 403);
      }

      if (existingRequest.state === 'pending') {
        return { reopenRequest: true };
      }
    }

    return { acceptExisting: existingRequest.state === 'pending' && existingRequest.recipientId === senderId };
  }

  const [recipientMember] = await db
    .execute<{ user_id: string }>(
      sql`select user_id from conversation_member
          where conversation_id = ${conversationId} and user_id <> ${senderId} and left_at is null limit 1`
    )
    .then((r) => r.rows);

  if (!recipientMember) return {};

  const recipientId = recipientMember.user_id;

  const [known] = await db
    .select({ ownerId: contact.ownerId })
    .from(contact)
    .where(and(eq(contact.ownerId, recipientId), eq(contact.contactUserId, senderId)))
    .limit(1);

  if (known) return {};

  const [profile] = await db
    .select({ policy: userProfile.nonContactPolicy })
    .from(userProfile)
    .where(eq(userProfile.userId, recipientId))
    .limit(1);

  const policy = profile?.policy ?? 'request';

  if (policy === 'everyone') return {};

  if (policy === 'nobody') {
    throw new CustomError('This user does not accept messages from people outside their contacts', 403);
  }

  return { openRequestFor: recipientId };
}

async function applyDirectGate(conversationId: string, senderId: string, gate: DirectGate, seq: number) {
  if (gate.openRequestFor) {
    emitToUsers([gate.openRequestFor], 'request:new', { conversationId });

    await db
      .insert(conversationRequest)
      .values({
        conversationId,
        requesterId: senderId,
        recipientId: gate.openRequestFor,
        state: 'pending',
        allowedThroughSeq: seq,
      })
      .onConflictDoNothing();
  }

  if (gate.reopenRequest) {
    await db
      .update(conversationRequest)
      .set({ allowedThroughSeq: seq })
      .where(eq(conversationRequest.conversationId, conversationId));
  }

  if (gate.acceptExisting) {
    await db
      .update(conversationRequest)
      .set({ state: 'accepted', respondedAt: new Date() })
      .where(eq(conversationRequest.conversationId, conversationId));
  }
}

export async function sendMessage(
  viewerId: string,
  conversationId: string,
  input: {
    content?: string;
    type?: 'text' | 'image' | 'video' | 'audio' | 'file';
    replyToId?: string;
    attachments?: AttachmentInput[];
  }
) {
  await assertActiveMember(conversationId, viewerId);

  const gate = await resolveDirectGate(conversationId, viewerId);

  const attachments = input.attachments ?? [];
  const hasContent = Boolean(input.content && input.content.trim().length > 0);

  if (!hasContent && attachments.length === 0) {
    throw new ValidationError('A message needs text or an attachment');
  }

  if (input.replyToId) {
    const [parent] = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.id, input.replyToId), eq(message.conversationId, conversationId)))
      .limit(1);

    if (!parent) throw new ValidationError('The message you are replying to does not exist');
  }

  const created = await db.transaction(async (tx) => {
    const row = await appendMessage(tx, {
      conversationId,
      senderId: viewerId,
      type: input.type ?? 'text',
      content: input.content?.trim() ?? null,
      replyToId: input.replyToId ?? null,
    });

    if (attachments.length > 0) {
      await tx.insert(messageAttachment).values(
        attachments.map((attachment, position) => ({
          id: createId(),
          messageId: row.id,
          position,
          objectKey: attachment.objectKey,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          fileName: attachment.fileName ?? null,
          width: attachment.width ?? null,
          height: attachment.height ?? null,
          durationMs: attachment.durationMs ?? null,
          thumbnailKey: attachment.thumbnailKey ?? null,
        }))
      );
    }

    return row;
  });

  await applyDirectGate(conversationId, viewerId, gate, created.seq);

  const rows = await fetchMessageRows(conversationId, 0, null, created.seq + 1);
  const serialized = await serializeMessages(
    rows.filter((r) => r.id === created.id),
    viewerId
  );

  await emitToConversation(conversationId, 'message:new', { conversationId, messageId: created.id });

  return serialized[0]!;
}

export async function deleteMessage(viewerId: string, messageId: string) {
  const [row] = await db.select().from(message).where(eq(message.id, messageId)).limit(1);

  if (!row) throw new NotFoundError('Message not found');
  if (row.senderId !== viewerId) throw new CustomError('You can only delete your own messages', 403);

  await db
    .update(message)
    .set({ deletedAt: new Date(), content: null })
    .where(eq(message.id, messageId));

  await db.delete(messageAttachment).where(eq(messageAttachment.messageId, messageId));

  await emitToConversation(row.conversationId, 'message:deleted', { conversationId: row.conversationId, messageId });
}

export async function setReaction(viewerId: string, messageId: string, emoji: string) {
  const [row] = await db.select({ conversationId: message.conversationId, type: message.type }).from(message).where(eq(message.id, messageId)).limit(1);

  if (!row) throw new NotFoundError('Message not found');
  if (row.type === 'system') throw new ValidationError('System messages cannot be reacted to');

  await assertActiveMember(row.conversationId, viewerId);

  await db
    .insert(messageReaction)
    .values({ messageId, userId: viewerId, emoji })
    .onConflictDoUpdate({
      target: [messageReaction.messageId, messageReaction.userId],
      set: { emoji, updatedAt: new Date() },
    });

  await emitToConversation(row.conversationId, 'message:updated', { conversationId: row.conversationId, messageId });
}

export async function removeReaction(viewerId: string, messageId: string) {
  const [row] = await db.select({ conversationId: message.conversationId }).from(message).where(eq(message.id, messageId)).limit(1);

  if (!row) throw new NotFoundError('Message not found');

  await assertActiveMember(row.conversationId, viewerId);
  await db.delete(messageReaction).where(and(eq(messageReaction.messageId, messageId), eq(messageReaction.userId, viewerId)));

  await emitToConversation(row.conversationId, 'message:updated', { conversationId: row.conversationId, messageId });
}
