import { CustomError, NotFoundError, ValidationError } from '@/middlewares/error';
import { block, contact, userProfile } from '@/db/schema/chat';
import { and, eq, sql } from 'drizzle-orm';
import { resolveMediaUrl } from '@/lib/storage';
import { user } from '@/db/schema/auth';
import { emitToUsers } from '@/lib/realtime';
import { db } from '@/db';

export async function listContacts(ownerId: string) {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
      avatarKey: userProfile.avatarKey,
      alias: contact.alias,
      favorite: contact.favorite,
      createdAt: contact.createdAt,
    })
    .from(contact)
    .innerJoin(user, eq(user.id, contact.contactUserId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(contact.ownerId, ownerId))
    .orderBy(sql`${contact.favorite} desc`, user.name);

  return Promise.all(
    rows.map(async (row) => ({
      id: row.userId,
      name: row.alias ?? row.name,
      realName: row.name,
      username: row.username,
      displayUsername: row.displayUsername,
      image: (await resolveMediaUrl(row.avatarKey)) ?? row.image,
      alias: row.alias,
      favorite: row.favorite,
      createdAt: row.createdAt,
    }))
  );
}

export async function addContact(ownerId: string, contactUserId: string, alias?: string) {
  if (ownerId === contactUserId) {
    throw new ValidationError('You cannot add yourself as a contact');
  }

  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.id, contactUserId)).limit(1);

  if (!target) throw new NotFoundError('User not found');

  const [blocked] = await db
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(and(eq(block.blockerId, contactUserId), eq(block.blockedId, ownerId)))
    .limit(1);

  if (blocked) throw new CustomError('You cannot add this user', 403);

  await db
    .insert(contact)
    .values({ ownerId, contactUserId, alias: alias ?? null })
    .onConflictDoUpdate({
      target: [contact.ownerId, contact.contactUserId],
      set: { alias: alias ?? null, updatedAt: new Date() },
    });

  emitToUsers([ownerId], 'conversation:updated', { contactAdded: contactUserId });

  return listContacts(ownerId);
}

export async function updateContact(
  ownerId: string,
  contactUserId: string,
  input: { alias?: string | null; favorite?: boolean }
) {
  const result = await db
    .update(contact)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(contact.ownerId, ownerId), eq(contact.contactUserId, contactUserId)))
    .returning({ ownerId: contact.ownerId });

  if (result.length === 0) throw new NotFoundError('Contact not found');

  return listContacts(ownerId);
}

export async function removeContact(ownerId: string, contactUserId: string) {
  await db.delete(contact).where(and(eq(contact.ownerId, ownerId), eq(contact.contactUserId, contactUserId)));
  return listContacts(ownerId);
}

export async function isContact(ownerId: string, contactUserId: string) {
  const [row] = await db
    .select({ ownerId: contact.ownerId })
    .from(contact)
    .where(and(eq(contact.ownerId, ownerId), eq(contact.contactUserId, contactUserId)))
    .limit(1);

  return Boolean(row);
}

export async function isBlocked(blockerId: string, blockedId: string) {
  const [row] = await db
    .select({ blockerId: block.blockerId })
    .from(block)
    .where(and(eq(block.blockerId, blockerId), eq(block.blockedId, blockedId)))
    .limit(1);

  return Boolean(row);
}

export async function listBlocked(blockerId: string) {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      avatarKey: userProfile.avatarKey,
      createdAt: block.createdAt,
    })
    .from(block)
    .innerJoin(user, eq(user.id, block.blockedId))
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(block.blockerId, blockerId))
    .orderBy(user.name);

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      image: (await resolveMediaUrl(row.avatarKey)) ?? row.image,
      createdAt: row.createdAt,
    }))
  );
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new ValidationError('You cannot block yourself');
  }

  await db.insert(block).values({ blockerId, blockedId }).onConflictDoNothing();
  await db.delete(contact).where(and(eq(contact.ownerId, blockerId), eq(contact.contactUserId, blockedId)));

  emitToUsers([blockerId, blockedId], 'conversation:updated', { blockedBy: blockerId });

  return listBlocked(blockerId);
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await db.delete(block).where(and(eq(block.blockerId, blockerId), eq(block.blockedId, blockedId)));

  emitToUsers([blockerId, blockedId], 'conversation:updated', { unblockedBy: blockerId });

  return listBlocked(blockerId);
}
