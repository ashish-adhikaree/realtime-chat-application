import { createUploadUrl, type UploadPurpose } from '@/lib/storage';

export async function requestUploadUrl(ownerId: string, purpose: UploadPurpose, mimeType: string) {
  return createUploadUrl(purpose, ownerId, mimeType);
}
