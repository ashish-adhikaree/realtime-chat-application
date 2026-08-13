import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CustomError } from '@/middlewares/error';
import { createId } from '@/lib/id';
import env from '@/config/env';

export const UPLOAD_PURPOSES = ['avatar', 'group-image', 'message'] as const;

export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

const PURPOSE_PREFIX: Record<UploadPurpose, string> = {
  avatar: 'avatars',
  'group-image': 'groups',
  message: 'messages',
};

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/webm': 'weba',
  'audio/wav': 'wav',
  'application/pdf': 'pdf',
};

export const UPLOAD_URL_TTL = 60 * 5;
export const DOWNLOAD_URL_TTL = 60 * 60;

const isConfigured = Boolean(env.S3_BUCKET_NAME && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);

let client: S3Client | null = null;

function getClient() {
  if (!isConfigured) {
    throw new CustomError('File storage is not configured on this server', 503);
  }

  if (!client) {
    client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  return client;
}

export function isStorageConfigured() {
  return isConfigured;
}

export function buildObjectKey(purpose: UploadPurpose, ownerId: string, mimeType: string) {
  const extension = EXTENSION_BY_MIME[mimeType] ?? 'bin';
  return `${PURPOSE_PREFIX[purpose]}/${ownerId}/${createId(16)}.${extension}`;
}

export async function createUploadUrl(purpose: UploadPurpose, ownerId: string, mimeType: string) {
  const objectKey = buildObjectKey(purpose, ownerId, mimeType);

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: objectKey, ContentType: mimeType }),
    { expiresIn: UPLOAD_URL_TTL }
  );

  return { objectKey, uploadUrl, expiresIn: UPLOAD_URL_TTL };
}

export async function getDownloadUrl(objectKey: string) {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: objectKey }), {
    expiresIn: DOWNLOAD_URL_TTL,
  });
}

export async function resolveMediaUrl(objectKey: string | null | undefined) {
  if (!objectKey || !isConfigured) return null;

  try {
    return await getDownloadUrl(objectKey);
  } catch {
    return null;
  }
}

export async function deleteObject(objectKey: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET_NAME!, Key: objectKey }));
}
