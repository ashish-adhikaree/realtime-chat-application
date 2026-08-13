import { block, contact, conversation, conversationMember, conversationRequest, message, userProfile } from '@/db/schema/chat';
import { CustomError, NotFoundError, ValidationError } from '@/middlewares/error';
import { and, desc, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { appendSystemMessage, assertActiveMember, assertAdmin, getConversationRow, getMembership } from '@/services/core';
import { buildDmKey, createId } from '@/lib/id';
import { resolveMediaUrl } from '@/lib/storage';
import { user } from '@/db/schema/auth';
import { emitToConversation, emitToUsers } from '@/lib/realtime';
import { db } from '@/db';

export type ConversationSummary = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  image: string | null;
  role: 'admin' | 'member';
  pinned: boolean;
  muted: boolean;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  lastMessageSeq: number | null;
  otherUserId: string | null;
  memberCount: number;
  memberAvatars: string[];
  requestState: 'pending' | 'accepted' | 'declined' | null;
  isRequestRecipient: boolean;
  requestAwaitingReply: boolean;
  favorite: boolean;
  blocked: boolean;
};

function previewFor(row: { type: string | null; content: string | null; senderName: string | null } | undefined) {
  if (!row) return null;
  if (row.type === 'hidden') return 'Message hidden';
  if (row.type === 'system') return 'Updated the group';
  if (row.type && row.type !== 'text') return row.type.charAt(0).toUpperCase() + row.type.slice(1);
  return row.content;
}

export async function listConversations(viewerId: string): Promise<ConversationSummary[]> {
  const memberships = await db
    .select({
      conversationId: conversationMember.conversationId,
      role: conversationMember.role,
      pinnedAt: conversationMember.pinnedAt,
      mutedUntil: conversationMember.mutedUntil,
      historyVisibleFromSeq: conversationMember.historyVisibleFromSeq,
      type: conversation.type,
      name: conversation.name,
      imageKey: conversation.imageKey,
      lastMessageSeq: conversation.lastMessageSeq,
      lastMessageAt: conversation.lastMessageAt,
      requestState: conversationRequest.state,
      requestRecipientId: conversationRequest.recipientId,
      allowedThroughSeq: conversationRequest.allowedThroughSeq,
    })
    .from(conversationMember)
    .innerJoin(conversation, eq(conversation.id, conversationMember.conversationId))
    .leftJoin(conversationRequest, eq(conversationRequest.conversationId, conversation.id))
    .where(and(eq(conversationMember.userId, viewerId), isNull(conversationMember.leftAt)))
    .orderBy(
      sql`${conversationMember.pinnedAt} desc nulls last`,
      sql`${conversation.lastMessageAt} desc nulls last`
    );

  if (memberships.length === 0) return [];

  const ids = memberships.map((m) => m.conversationId);

  const others = await db
    .select({
      conversationId: conversationMember.conversationId,
      userId: user.id,
      name: user.name,
      image: user.image,
      avatarKey: userProfile.avatarKey,
      alias: contact.alias,
      favorite: contact.favorite,
      blockedId: block.blockedId,
    })
    .from(conversationMember)
    .innerJoin(user, eq(user.id, conversationMember.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(contact, and(eq(contact.ownerId, viewerId), eq(contact.contactUserId, user.id)))
    .leftJoin(block, and(eq(block.blockerId, viewerId), eq(block.blockedId, user.id)))
    .where(
      and(
        inArray(conversationMember.conversationId, ids),
        ne(conversationMember.userId, viewerId),
        isNull(conversationMember.leftAt)
      )
    );

  const previews = await db
    .select({
      conversationId: message.conversationId,
      seq: message.seq,
      type: message.type,
      content: message.content,
      senderId: message.senderId,
      senderName: user.name,
    })
    .from(message)
    .innerJoin(
      conversation,
      and(eq(conversation.id, message.conversationId), eq(conversation.lastMessageSeq, message.seq))
    )
    .leftJoin(user, eq(user.id, message.senderId))
    .where(and(inArray(message.conversationId, ids), isNull(message.deletedAt)));

  const blockedBy = new Set(
    (await db.select({ blockerId: block.blockerId }).from(block).where(eq(block.blockedId, viewerId))).map(
      (row) => row.blockerId
    )
  );

  const previewByConversation = new Map(
    previews.map((p) => [
      p.conversationId,
      p.senderId && blockedBy.has(p.senderId) ? { ...p, type: 'hidden' as const, content: null } : p,
    ])
  );

  const othersByConversation = new Map<string, typeof others>();
  for (const row of others) {
    const list = othersByConversation.get(row.conversationId) ?? [];
    list.push(row);
    othersByConversation.set(row.conversationId, list);
  }

  return Promise.all(
    memberships.map(async (m) => {
      const members = othersByConversation.get(m.conversationId) ?? [];
      const counterpart = members[0];
      const isRequestRecipient = m.requestRecipientId === viewerId;
      const hidden = m.requestState === 'pending' && isRequestRecipient;
      const preview = previewByConversation.get(m.conversationId);

      const visiblePreview =
        hidden && preview && preview.seq > (m.allowedThroughSeq ?? 0) ? null : previewFor(preview);

      const image =
        m.type === 'group'
          ? await resolveMediaUrl(m.imageKey)
          : ((await resolveMediaUrl(counterpart?.avatarKey)) ?? counterpart?.image ?? null);

      const memberAvatars = await Promise.all(
        members.slice(0, 4).map(async (x) => (await resolveMediaUrl(x.avatarKey)) ?? x.image)
      );

      return {
        id: m.conversationId,
        type: m.type,
        name: m.type === 'group' ? (m.name ?? 'Group') : (counterpart?.alias ?? counterpart?.name ?? 'Unknown'),
        image,
        role: m.role,
        pinned: Boolean(m.pinnedAt),
        muted: Boolean(m.mutedUntil && m.mutedUntil > new Date()),
        lastMessage: visiblePreview,
        lastMessageAt: m.lastMessageAt,
        lastMessageSeq: m.lastMessageSeq,
        otherUserId: counterpart?.userId ?? null,
        memberCount: members.length + 1,
        memberAvatars: memberAvatars.filter((a): a is string => Boolean(a)),
        requestState: m.requestState,
        isRequestRecipient,
        requestAwaitingReply: m.requestState === 'pending' && !isRequestRecipient,
        favorite: m.type === 'direct' && Boolean(counterpart?.favorite),
        blocked: m.type === 'direct' && Boolean(counterpart?.blockedId),
      };
    })
  );
}

export async function getConversationDetail(viewerId: string, conversationId: string) {
  await assertActiveMember(conversationId, viewerId);
  const row = await getConversationRow(conversationId);

  const members = await db
    .select({
      userId: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      avatarKey: userProfile.avatarKey,
      role: conversationMember.role,
      joinedAt: conversationMember.joinedAt,
      leftAt: conversationMember.leftAt,
      alias: contact.alias,
      favorite: contact.favorite,
      contactOwner: contact.ownerId,
      blockedId: block.blockedId,
    })
    .from(conversationMember)
    .innerJoin(user, eq(user.id, conversationMember.userId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(contact, and(eq(contact.ownerId, viewerId), eq(contact.contactUserId, user.id)))
    .leftJoin(block, and(eq(block.blockerId, viewerId), eq(block.blockedId, user.id)))
    .where(eq(conversationMember.conversationId, conversationId))
    .orderBy(sql`case when ${conversationMember.role} = 'admin' then 0 else 1 end`, user.name);

  const serializedMembers = await Promise.all(
    members.map(async (m) => ({
      id: m.userId,
      name: m.alias ?? m.name,
      username: m.username,
      image: (await resolveMediaUrl(m.avatarKey)) ?? m.image,
      role: m.role,
      joinedAt: m.joinedAt,
      active: m.leftAt === null,
      favorite: Boolean(m.favorite),
      isContact: Boolean(m.contactOwner),
      blocked: Boolean(m.blockedId),
    }))
  );

  const counterpart = serializedMembers.find((m) => m.id !== viewerId && m.active);

  return {
    id: row.id,
    type: row.type,
    name: row.type === 'group' ? (row.name ?? 'Group') : (counterpart?.name ?? 'Unknown'),
    image: row.type === 'group' ? await resolveMediaUrl(row.imageKey) : (counterpart?.image ?? null),
    description: row.description,
    onlyAdminsCanEditInfo: row.onlyAdminsCanEditInfo,
    onlyAdminsCanAddMembers: row.onlyAdminsCanAddMembers,
    createdBy: row.createdBy,
    members: serializedMembers,
    otherUserId: counterpart?.id ?? null,
  };
}

export async function createDirectConversation(viewerId: string, targetUserId: string) {
  if (viewerId === targetUserId) {
    throw new ValidationError('You cannot start a conversation with yourself');
  }

  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, targetUserId)).limit(1);
  if (!target) throw new NotFoundError('User not found');

  const [blockRow] = await db
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(
      sql`(${block.blockerId} = ${targetUserId} and ${block.blockedId} = ${viewerId})
       or (${block.blockerId} = ${viewerId} and ${block.blockedId} = ${targetUserId})`
    )
    .limit(1);

  if (blockRow) throw new CustomError('You cannot message this user', 403);

  const [existingContact] = await db
    .select({ ownerId: contact.ownerId })
    .from(contact)
    .where(and(eq(contact.ownerId, targetUserId), eq(contact.contactUserId, viewerId)))
    .limit(1);

  if (!existingContact) {
    const [profile] = await db
      .select({ policy: userProfile.nonContactPolicy })
      .from(userProfile)
      .where(eq(userProfile.userId, targetUserId))
      .limit(1);

    if (profile?.policy === 'nobody') {
      throw new CustomError('This user does not accept messages from people outside their contacts', 403);
    }
  }

  const dmKey = buildDmKey(viewerId, targetUserId);

  const [created] = await db
    .insert(conversation)
    .values({ id: createId(), type: 'direct', dmKey, createdBy: viewerId })
    .onConflictDoNothing({ target: conversation.dmKey })
    .returning({ id: conversation.id });

  if (created) {
    await db.insert(conversationMember).values([
      { conversationId: created.id, userId: viewerId },
      { conversationId: created.id, userId: targetUserId },
    ]);

    return created.id;
  }

  const [existing] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(eq(conversation.dmKey, dmKey))
    .limit(1);

  if (!existing) throw new NotFoundError('Conversation not found');

  const membership = await getMembership(existing.id, viewerId);
  if (membership?.leftAt) {
    await db
      .update(conversationMember)
      .set({ leftAt: null, joinedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(conversationMember.conversationId, existing.id), eq(conversationMember.userId, viewerId)));
  }

  return existing.id;
}

export async function createGroupConversation(
  viewerId: string,
  input: { name: string; description?: string | null; imageKey?: string | null; memberIds: string[] }
) {
  const uniqueMemberIds = [...new Set(input.memberIds.filter((id) => id !== viewerId))];

  return db.transaction(async (tx) => {
    const conversationId = createId();

    await tx.insert(conversation).values({
      id: conversationId,
      type: 'group',
      name: input.name,
      description: input.description ?? null,
      imageKey: input.imageKey ?? null,
      createdBy: viewerId,
    });

    await tx.insert(conversationMember).values([
      { conversationId, userId: viewerId, role: 'admin' as const },
      ...uniqueMemberIds.map((userId) => ({ conversationId, userId, invitedBy: viewerId })),
    ]);

    await appendSystemMessage(tx, conversationId, viewerId, 'group_created', { newName: input.name });

    if (uniqueMemberIds.length > 0) {
      await appendSystemMessage(tx, conversationId, viewerId, 'member_added', {
        targetUserIds: uniqueMemberIds,
      });
    }

    return conversationId;
  });
}

export async function updateGroup(
  viewerId: string,
  conversationId: string,
  input: { name?: string; description?: string | null; imageKey?: string | null }
) {
  const row = await getConversationRow(conversationId);

  if (row.type !== 'group') throw new ValidationError('Only groups can be edited');

  if (row.onlyAdminsCanEditInfo) {
    await assertAdmin(conversationId, viewerId);
  } else {
    await assertActiveMember(conversationId, viewerId);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(conversation)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.imageKey !== undefined ? { imageKey: input.imageKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(conversation.id, conversationId));

    if (input.name !== undefined && input.name !== row.name) {
      await appendSystemMessage(tx, conversationId, viewerId, 'group_renamed', {
        previousName: row.name ?? undefined,
        newName: input.name,
      });
    }

    if (input.imageKey !== undefined && input.imageKey !== row.imageKey) {
      await appendSystemMessage(tx, conversationId, viewerId, 'group_image_changed');
    }
  });

  await emitToConversation(conversationId, 'conversation:updated', { conversationId });

  return getConversationDetail(viewerId, conversationId);
}

export async function addMembers(
  viewerId: string,
  conversationId: string,
  userIds: string[],
  includeHistory: boolean
) {
  const row = await getConversationRow(conversationId);

  if (row.type !== 'group') throw new ValidationError('Members can only be added to groups');

  if (row.onlyAdminsCanAddMembers) {
    await assertAdmin(conversationId, viewerId);
  } else {
    await assertActiveMember(conversationId, viewerId);
  }

  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) throw new ValidationError('No users to add');

  const existing = await db
    .select({ userId: conversationMember.userId, leftAt: conversationMember.leftAt })
    .from(conversationMember)
    .where(and(eq(conversationMember.conversationId, conversationId), inArray(conversationMember.userId, uniqueIds)));

  const alreadyActive = new Set(existing.filter((e) => !e.leftAt).map((e) => e.userId));
  const rejoining = new Set(existing.filter((e) => e.leftAt).map((e) => e.userId));
  const toAdd = uniqueIds.filter((id) => !alreadyActive.has(id));

  if (toAdd.length === 0) throw new ValidationError('Those users are already in this group');

  const historyVisibleFromSeq = includeHistory ? 0 : row.lastSeq + 1;

  await db.transaction(async (tx) => {
    for (const userId of toAdd) {
      if (rejoining.has(userId)) {
        await tx
          .update(conversationMember)
          .set({
            leftAt: null,
            joinedAt: new Date(),
            role: 'member',
            historyVisibleFromSeq,
            invitedBy: viewerId,
            updatedAt: new Date(),
          })
          .where(
            and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, userId))
          );
      } else {
        await tx
          .insert(conversationMember)
          .values({ conversationId, userId, historyVisibleFromSeq, invitedBy: viewerId });
      }
    }

    await appendSystemMessage(tx, conversationId, viewerId, 'member_added', { targetUserIds: toAdd });
  });

  await emitToConversation(conversationId, 'conversation:updated', { conversationId });
  emitToUsers(toAdd, 'conversation:updated', { conversationId });

  return getConversationDetail(viewerId, conversationId);
}

export async function removeMember(viewerId: string, conversationId: string, targetUserId: string) {
  const row = await getConversationRow(conversationId);
  if (row.type !== 'group') throw new ValidationError('Members can only be removed from groups');

  await assertAdmin(conversationId, viewerId);

  if (targetUserId === viewerId) {
    throw new ValidationError('Use leave to remove yourself');
  }

  await assertActiveMember(conversationId, targetUserId);

  await db.transaction(async (tx) => {
    await tx
      .update(conversationMember)
      .set({ leftAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, targetUserId))
      );

    await appendSystemMessage(tx, conversationId, viewerId, 'member_removed', { targetUserIds: [targetUserId] });
  });

  await emitToConversation(conversationId, 'conversation:updated', { conversationId });
  emitToUsers([targetUserId], 'conversation:removed', { conversationId });

  return getConversationDetail(viewerId, conversationId);
}

export async function updateMemberRole(
  viewerId: string,
  conversationId: string,
  targetUserId: string,
  role: 'admin' | 'member'
) {
  const row = await getConversationRow(conversationId);
  if (row.type !== 'group') throw new ValidationError('Roles only apply to groups');

  await assertAdmin(conversationId, viewerId);
  const target = await assertActiveMember(conversationId, targetUserId);

  if (target.role === role) return getConversationDetail(viewerId, conversationId);

  if (role === 'member' && targetUserId === viewerId) {
    const [admins] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversationMember)
      .where(
        and(
          eq(conversationMember.conversationId, conversationId),
          eq(conversationMember.role, 'admin'),
          isNull(conversationMember.leftAt)
        )
      );

    if ((admins?.count ?? 0) <= 1) throw new ValidationError('A group must keep at least one admin');
  }

  await db.transaction(async (tx) => {
    await tx
      .update(conversationMember)
      .set({ role, updatedAt: new Date() })
      .where(
        and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, targetUserId))
      );

    await appendSystemMessage(tx, conversationId, viewerId, 'role_changed', {
      targetUserIds: [targetUserId],
      previousRole: target.role,
      newRole: role,
    });
  });

  await emitToConversation(conversationId, 'conversation:updated', { conversationId });

  return getConversationDetail(viewerId, conversationId);
}

export async function leaveConversation(viewerId: string, conversationId: string) {
  const row = await getConversationRow(conversationId);
  if (row.type !== 'group') throw new ValidationError('You can only leave groups');

  await assertActiveMember(conversationId, viewerId);

  return db.transaction(async (tx) => {
    await tx
      .update(conversationMember)
      .set({ leftAt: new Date(), updatedAt: new Date() })
      .where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewerId)));

    const remainingAdmins = await tx
      .select({ userId: conversationMember.userId })
      .from(conversationMember)
      .where(
        and(
          eq(conversationMember.conversationId, conversationId),
          eq(conversationMember.role, 'admin'),
          isNull(conversationMember.leftAt)
        )
      );

    if (remainingAdmins.length === 0) {
      const [next] = await tx
        .select({ userId: conversationMember.userId })
        .from(conversationMember)
        .where(and(eq(conversationMember.conversationId, conversationId), isNull(conversationMember.leftAt)))
        .orderBy(conversationMember.joinedAt)
        .limit(1);

      if (next) {
        await tx
          .update(conversationMember)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(
            and(
              eq(conversationMember.conversationId, conversationId),
              eq(conversationMember.userId, next.userId)
            )
          );
      }
    }

    await appendSystemMessage(tx, conversationId, viewerId, 'member_left', { targetUserIds: [viewerId] });
  });

  await emitToConversation(conversationId, 'conversation:updated', { conversationId });
}

export async function setPinned(viewerId: string, conversationId: string, pinned: boolean) {
  await assertActiveMember(conversationId, viewerId);

  await db
    .update(conversationMember)
    .set({ pinnedAt: pinned ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewerId)));
}

export async function setMuted(viewerId: string, conversationId: string, mutedUntil: Date | null) {
  await assertActiveMember(conversationId, viewerId);

  await db
    .update(conversationMember)
    .set({ mutedUntil, updatedAt: new Date() })
    .where(and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, viewerId)));
}

export async function listPendingRequests(viewerId: string) {
  const rows = await db
    .select({
      conversationId: conversationRequest.conversationId,
      requesterId: conversationRequest.requesterId,
      allowedThroughSeq: conversationRequest.allowedThroughSeq,
      createdAt: conversationRequest.createdAt,
      name: user.name,
      username: user.username,
      image: user.image,
      avatarKey: userProfile.avatarKey,
    })
    .from(conversationRequest)
    .innerJoin(user, eq(user.id, conversationRequest.requesterId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(and(eq(conversationRequest.recipientId, viewerId), eq(conversationRequest.state, 'pending')))
    .orderBy(desc(conversationRequest.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const [preview] = await db
        .select({ content: message.content, type: message.type })
        .from(message)
        .where(and(eq(message.conversationId, row.conversationId), eq(message.seq, row.allowedThroughSeq)))
        .limit(1);

      return {
        conversationId: row.conversationId,
        createdAt: row.createdAt,
        from: {
          id: row.requesterId,
          name: row.name,
          username: row.username,
          image: (await resolveMediaUrl(row.avatarKey)) ?? row.image,
        },
        preview: previewFor(preview ? { ...preview, senderName: row.name } : undefined),
      };
    })
  );
}

export async function respondToRequest(
  viewerId: string,
  conversationId: string,
  action: 'accept' | 'decline' | 'reopen'
) {
  const [request] = await db
    .select()
    .from(conversationRequest)
    .where(eq(conversationRequest.conversationId, conversationId))
    .limit(1);

  if (!request) throw new NotFoundError('Message request not found');

  if (action === 'reopen') {
    if (request.requesterId !== viewerId) {
      throw new CustomError('Only the sender can send another request', 403);
    }

    if (request.state !== 'declined') return;

    const [blocked] = await db
      .select({ blockerId: block.blockerId })
      .from(block)
      .where(and(eq(block.blockerId, request.recipientId), eq(block.blockedId, viewerId)))
      .limit(1);

    if (blocked) throw new CustomError('This user is not accepting your messages', 403);

    await db.transaction(async (tx) => {
      await tx
        .update(conversationRequest)
        .set({ state: 'pending', respondedAt: null })
        .where(eq(conversationRequest.conversationId, conversationId));

      await appendSystemMessage(tx, conversationId, viewerId, 'request_reopened');
    });

    await emitToConversation(conversationId, 'conversation:updated', { conversationId });
    return;
  }

  if (request.recipientId !== viewerId) {
    throw new CustomError('Only the recipient can respond to this request', 403);
  }

  if (request.state === action_state(action)) return;

  await db.transaction(async (tx) => {
    await tx
      .update(conversationRequest)
      .set({ state: action === 'accept' ? 'accepted' : 'declined', respondedAt: new Date() })
      .where(eq(conversationRequest.conversationId, conversationId));

    await appendSystemMessage(
      tx,
      conversationId,
      viewerId,
      action === 'accept' ? 'request_accepted' : 'request_declined'
    );
  });

  if (action === 'accept') {
    await db.insert(contact).values({ ownerId: viewerId, contactUserId: request.requesterId }).onConflictDoNothing();
  }

  await emitToConversation(conversationId, 'conversation:updated', { conversationId });
}

function action_state(action: 'accept' | 'decline') {
  return action === 'accept' ? ('accepted' as const) : ('declined' as const);
}
