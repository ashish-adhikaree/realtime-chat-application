import { randomBytes } from 'crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function createId(size = 24): string {
  const bytes = randomBytes(size);
  let id = '';

  for (let i = 0; i < size; i++) {
    id += ALPHABET.charAt(bytes[i]! % ALPHABET.length);
  }

  return id;
}

export function buildDmKey(userIdA: string, userIdB: string): string {
  return userIdA < userIdB ? `${userIdA}:${userIdB}` : `${userIdB}:${userIdA}`;
}
