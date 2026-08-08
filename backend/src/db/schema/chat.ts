import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { user } from './auth';

export const conversationTypeEnum = pgEnum('conversation_type', ['direct', 'group']);

export const memberRoleEnum = pgEnum('member_role', ['admin', 'member']);

export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'video', 'audio', 'file', 'system']);

export const systemEventTypeEnum = pgEnum('system_event_type', [
  'group_created',
  'member_added',
  'member_removed',
  'member_left',
  'role_changed',
  'group_renamed',
  'group_image_changed',
]);

export const requestStateEnum = pgEnum('request_state', ['pending', 'accepted', 'declined']);

export const nonContactPolicyEnum = pgEnum('non_contact_policy', ['everyone', 'request', 'nobody']);

export type MessageMetadata = {
  targetUserIds?: string[];
  previousName?: string;
  newName?: string;
  previousRole?: 'admin' | 'member';
  newRole?: 'admin' | 'member';
  mentionedUserIds?: string[];
  linkPreview?: { url: string; title?: string; description?: string; imageKey?: string };
};

export const userProfile = pgTable('user_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  avatarKey: text('avatar_key'),
  nonContactPolicy: nonContactPolicyEnum('non_contact_policy').default('request').notNull(),
  allowGroupInvitesFromNonContacts: boolean('allow_group_invites_from_non_contacts').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const contact = pgTable(
  'contact',
  {
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    contactUserId: text('contact_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    alias: text('alias'),
    favorite: boolean('favorite').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.contactUserId] }),
    index('contact_contactUserId_idx').on(table.contactUserId),
    check('contact_not_self', sql`owner_id <> contact_user_id`),
  ]
);

export const block = pgTable(
  'block',
  {
    blockerId: text('blocker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    blockedId: text('blocked_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index('block_blockedId_idx').on(table.blockedId),
    check('block_not_self', sql`blocker_id <> blocked_id`),
  ]
);

export const conversation = pgTable(
  'conversation',
  {
    id: text('id').primaryKey(),
    type: conversationTypeEnum('type').notNull(),
    name: text('name'),
    imageKey: text('image_key'),
    dmKey: text('dm_key'),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    onlyAdminsCanEditInfo: boolean('only_admins_can_edit_info').default(true).notNull(),
    onlyAdminsCanAddMembers: boolean('only_admins_can_add_members').default(false).notNull(),
    lastSeq: bigint('last_seq', { mode: 'number' }).default(0).notNull(),
    lastMessageSeq: bigint('last_message_seq', { mode: 'number' }),
    lastMessageAt: timestamp('last_message_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('conversation_dmKey_idx').on(table.dmKey),
    index('conversation_lastMessageAt_idx').on(table.lastMessageAt),
    check('conversation_dm_key_shape', sql`(type = 'direct') = (dm_key is not null)`),
    check('conversation_group_name', sql`type <> 'group' or name is not null`),
  ]
);

export const conversationMember = pgTable(
  'conversation_member',
  {
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').default('member').notNull(),
    historyVisibleFromSeq: bigint('history_visible_from_seq', { mode: 'number' }).default(0).notNull(),
    invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    leftAt: timestamp('left_at'),
    pinnedAt: timestamp('pinned_at'),
    archivedAt: timestamp('archived_at'),
    mutedUntil: timestamp('muted_until'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index('conversation_member_userId_idx').on(table.userId),
    index('conversation_member_invitedBy_idx').on(table.invitedBy),
    index('conversation_member_active_idx').on(table.userId).where(sql`left_at is null`),
  ]
);

export const message = pgTable(
  'message',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    seq: bigint('seq', { mode: 'number' }).notNull(),
    senderId: text('sender_id').references(() => user.id, { onDelete: 'set null' }),
    type: messageTypeEnum('type').default('text').notNull(),
    content: text('content'),
    replyToId: text('reply_to_id').references((): AnyPgColumn => message.id, { onDelete: 'set null' }),
    systemEvent: systemEventTypeEnum('system_event'),
    metadata: jsonb('metadata').$type<MessageMetadata>(),
    editedAt: timestamp('edited_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('message_conversationId_seq_idx').on(table.conversationId, table.seq),
    index('message_senderId_idx').on(table.senderId),
    index('message_replyToId_idx').on(table.replyToId),
    check('message_system_shape', sql`(type = 'system') = (system_event is not null)`),
  ]
);

export const messageAttachment = pgTable(
  'message_attachment',
  {
    id: text('id').primaryKey(),
    messageId: text('message_id')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' }),
    position: integer('position').default(0).notNull(),
    objectKey: text('object_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    fileName: text('file_name'),
    width: integer('width'),
    height: integer('height'),
    durationMs: integer('duration_ms'),
    thumbnailKey: text('thumbnail_key'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('message_attachment_messageId_position_idx').on(table.messageId, table.position),
    uniqueIndex('message_attachment_objectKey_idx').on(table.objectKey),
  ]
);

export const messageReaction = pgTable(
  'message_reaction',
  {
    messageId: text('message_id')
      .notNull()
      .references(() => message.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.messageId, table.userId] }),
    index('message_reaction_userId_idx').on(table.userId),
  ]
);

export const conversationRequest = pgTable(
  'conversation_request',
  {
    conversationId: text('conversation_id')
      .primaryKey()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    state: requestStateEnum('state').default('pending').notNull(),
    allowedThroughSeq: bigint('allowed_through_seq', { mode: 'number' }).default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    respondedAt: timestamp('responded_at'),
  },
  (table) => [
    index('conversation_request_recipientId_state_idx').on(table.recipientId, table.state),
    index('conversation_request_requesterId_idx').on(table.requesterId),
  ]
);

export const userChatRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile, { fields: [user.id], references: [userProfile.userId] }),
  contacts: many(contact, { relationName: 'contactOwner' }),
  contactOf: many(contact, { relationName: 'contactTarget' }),
  blocks: many(block, { relationName: 'blockBlocker' }),
  blockedBy: many(block, { relationName: 'blockBlocked' }),
  memberships: many(conversationMember, { relationName: 'memberUser' }),
  invitedMembers: many(conversationMember, { relationName: 'memberInviter' }),
  conversationsCreated: many(conversation),
  messages: many(message),
  reactions: many(messageReaction),
  requestsSent: many(conversationRequest, { relationName: 'requestRequester' }),
  requestsReceived: many(conversationRequest, { relationName: 'requestRecipient' }),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}));

export const contactRelations = relations(contact, ({ one }) => ({
  owner: one(user, { fields: [contact.ownerId], references: [user.id], relationName: 'contactOwner' }),
  contactUser: one(user, {
    fields: [contact.contactUserId],
    references: [user.id],
    relationName: 'contactTarget',
  }),
}));

export const blockRelations = relations(block, ({ one }) => ({
  blocker: one(user, { fields: [block.blockerId], references: [user.id], relationName: 'blockBlocker' }),
  blocked: one(user, { fields: [block.blockedId], references: [user.id], relationName: 'blockBlocked' }),
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  creator: one(user, { fields: [conversation.createdBy], references: [user.id] }),
  members: many(conversationMember),
  messages: many(message),
  request: one(conversationRequest, {
    fields: [conversation.id],
    references: [conversationRequest.conversationId],
  }),
}));

export const conversationMemberRelations = relations(conversationMember, ({ one }) => ({
  conversation: one(conversation, {
    fields: [conversationMember.conversationId],
    references: [conversation.id],
  }),
  user: one(user, { fields: [conversationMember.userId], references: [user.id], relationName: 'memberUser' }),
  inviter: one(user, {
    fields: [conversationMember.invitedBy],
    references: [user.id],
    relationName: 'memberInviter',
  }),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
  conversation: one(conversation, { fields: [message.conversationId], references: [conversation.id] }),
  sender: one(user, { fields: [message.senderId], references: [user.id] }),
  replyTo: one(message, { fields: [message.replyToId], references: [message.id], relationName: 'messageReply' }),
  replies: many(message, { relationName: 'messageReply' }),
  attachments: many(messageAttachment),
  reactions: many(messageReaction),
}));

export const messageAttachmentRelations = relations(messageAttachment, ({ one }) => ({
  message: one(message, { fields: [messageAttachment.messageId], references: [message.id] }),
}));

export const messageReactionRelations = relations(messageReaction, ({ one }) => ({
  message: one(message, { fields: [messageReaction.messageId], references: [message.id] }),
  user: one(user, { fields: [messageReaction.userId], references: [user.id] }),
}));

export const conversationRequestRelations = relations(conversationRequest, ({ one }) => ({
  conversation: one(conversation, {
    fields: [conversationRequest.conversationId],
    references: [conversation.id],
  }),
  requester: one(user, {
    fields: [conversationRequest.requesterId],
    references: [user.id],
    relationName: 'requestRequester',
  }),
  recipient: one(user, {
    fields: [conversationRequest.recipientId],
    references: [user.id],
    relationName: 'requestRecipient',
  }),
}));
