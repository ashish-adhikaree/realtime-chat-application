import { and, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@/middlewares/error';
import { block, contact, userProfile } from '@/db/schema/chat';
import { resolveMediaUrl } from '@/lib/storage';
import { user } from '@/db/schema/auth';
import { db } from '@/db';

export type PublicUser = {
  id: string;
  name: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
  isContact?: boolean;
};

export async function getProfile(userId: string) {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
      avatarKey: userProfile.avatarKey,
      nonContactPolicy: userProfile.nonContactPolicy,
      allowGroupInvitesFromNonContacts: userProfile.allowGroupInvitesFromNonContacts,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(user.id, userId))
    .limit(1);

  if (!row) throw new NotFoundError('User not found');

  const avatarUrl = await resolveMediaUrl(row.avatarKey);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    displayUsername: row.displayUsername,
    image: avatarUrl ?? row.image,
    hasCustomAvatar: Boolean(row.avatarKey),
    settings: {
      nonContactPolicy: row.nonContactPolicy ?? 'request',
      allowGroupInvitesFromNonContacts: row.allowGroupInvitesFromNonContacts ?? true,
    },
  };
}

export async function ensureProfile(userId: string) {
  await db.insert(userProfile).values({ userId }).onConflictDoNothing();
}

export async function updateProfile(userId: string, input: { name?: string }) {
  if (input.name !== undefined) {
    await db.update(user).set({ name: input.name }).where(eq(user.id, userId));
  }

  return getProfile(userId);
}

export async function updateSettings(
  userId: string,
  input: { nonContactPolicy?: 'everyone' | 'request' | 'nobody'; allowGroupInvitesFromNonContacts?: boolean }
) {
  await db
    .insert(userProfile)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: userProfile.userId, set: { ...input, updatedAt: new Date() } });

  return getProfile(userId);
}

export async function setAvatar(userId: string, avatarKey: string | null) {
  await db
    .insert(userProfile)
    .values({ userId, avatarKey })
    .onConflictDoUpdate({ target: userProfile.userId, set: { avatarKey, updatedAt: new Date() } });

  return getProfile(userId);
}

export async function searchUsers(viewerId: string, query: string, limit = 20): Promise<PublicUser[]> {
  const term = query.trim();

  if (term.length < 2) {
    throw new ValidationError('Search query must be at least 2 characters');
  }

  const pattern = `%${term}%`;

  const blocked = db
    .select({ id: block.blockerId })
    .from(block)
    .where(and(eq(block.blockedId, viewerId), eq(block.blockerId, user.id)));

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
      avatarKey: userProfile.avatarKey,
      contactOwner: contact.ownerId,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .leftJoin(contact, and(eq(contact.ownerId, viewerId), eq(contact.contactUserId, user.id)))
    .where(
      and(
        ne(user.id, viewerId),
        or(ilike(user.username, pattern), ilike(user.name, pattern)),
        sql`not exists ${blocked}`
      )
    )
    .orderBy(sql`case when ${user.username} ilike ${term + '%'} then 0 else 1 end`, user.name)
    .limit(limit);

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      username: row.username,
      displayUsername: row.displayUsername,
      image: (await resolveMediaUrl(row.avatarKey)) ?? row.image,
      isContact: Boolean(row.contactOwner),
    }))
  );
}

export async function getPublicUsers(userIds: string[]): Promise<Map<string, PublicUser>> {
  if (userIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      username: user.username,
      displayUsername: user.displayUsername,
      image: user.image,
      avatarKey: userProfile.avatarKey,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(inArray(user.id, userIds));

  const entries = await Promise.all(
    rows.map(async (row): Promise<[string, PublicUser]> => [
      row.id,
      {
        id: row.id,
        name: row.name,
        username: row.username,
        displayUsername: row.displayUsername,
        image: (await resolveMediaUrl(row.avatarKey)) ?? row.image,
      },
    ])
  );

  return new Map(entries);
}
