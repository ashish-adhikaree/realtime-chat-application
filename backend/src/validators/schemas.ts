import { UPLOAD_PURPOSES } from '@/lib/storage';
import z from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });

export const userIdParamSchema = z.object({ userId: z.string().min(1) });

export const conversationUserParamSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});

export const updateSettingsSchema = z.object({
  nonContactPolicy: z.enum(['everyone', 'request', 'nobody']).optional(),
  allowGroupInvitesFromNonContacts: z.boolean().optional(),
});

export const avatarSchema = z.object({
  objectKey: z.string().min(1).nullable(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

export const uploadRequestSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES),
  mimeType: z.string().min(1).max(120),
});

export const addContactSchema = z.object({
  userId: z.string().min(1),
  alias: z.string().trim().min(1).max(80).optional(),
});

export const updateContactSchema = z.object({
  alias: z.string().trim().min(1).max(80).nullable().optional(),
  favorite: z.boolean().optional(),
});

export const blockSchema = z.object({
  userId: z.string().min(1),
});

export const createDirectSchema = z.object({
  userId: z.string().min(1),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  imageKey: z.string().min(1).nullable().optional(),
  memberIds: z.array(z.string().min(1)).max(256).default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  imageKey: z.string().min(1).nullable().optional(),
});

export const addMembersSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(64),
  includeHistory: z.boolean().default(false),
});

export const memberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const pinSchema = z.object({
  pinned: z.boolean(),
});

export const muteSchema = z.object({
  mutedUntil: z.coerce.date().nullable(),
});

export const requestActionSchema = z.object({
  action: z.enum(['accept', 'decline', 'reopen']),
});

const attachmentSchema = z.object({
  objectKey: z.string().min(1),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().nonnegative(),
  fileName: z.string().max(255).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  thumbnailKey: z.string().min(1).optional(),
});

export const sendMessageSchema = z
  .object({
    content: z.string().max(8000).optional(),
    type: z.enum(['text', 'image', 'video', 'audio', 'file']).optional(),
    replyToId: z.string().min(1).optional(),
    attachments: z.array(attachmentSchema).max(10).optional(),
  })
  .refine((value) => Boolean(value.content?.trim()) || (value.attachments?.length ?? 0) > 0, {
    message: 'A message needs text or an attachment',
  });

export const messageQuerySchema = z.object({
  before: z.coerce.number().int().positive().optional(),
});

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});
