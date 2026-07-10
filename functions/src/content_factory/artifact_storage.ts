import { buildArtifactReceipt, serializeArtifactPayload, artifactObjectPath, type ArtifactReceipt } from './artifact_repository';
import type { CanonicalReleaseSurface } from './course_release_contract';
import { createHash } from 'node:crypto';

export interface ArtifactFileLike {
  exists(): Promise<[boolean]>;
  save(data: Buffer, options?: Record<string, unknown>): Promise<void>;
  // Firebase Storage returns [metadata, response], while tests use a compact
  // [metadata] fake. Keep the seam permissive and normalize below.
  getMetadata(): Promise<unknown>;
}

export interface ArtifactBucketLike {
  file(path: string): ArtifactFileLike;
}

export async function writeImmutableArtifact(
  bucket: ArtifactBucketLike,
  input: { releaseId: string; surface: CanonicalReleaseSurface; lessonId: number; payload: unknown },
): Promise<ArtifactReceipt> {
  const objectPath = artifactObjectPath(input.releaseId, input.surface, input.lessonId);
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();
  if (exists) throw new Error('artifact_already_exists');
  const serialized = serializeArtifactPayload(input.payload);
  await file.save(Buffer.from(serialized, 'utf8'), {
    resumable: false,
    metadata: { contentType: 'application/json', cacheControl: 'public,max-age=31536000,immutable' },
  });
  const metadataResult = await file.getMetadata();
  const metadata = Array.isArray(metadataResult) ? metadataResult[0] : metadataResult;
  if (typeof metadata !== 'object' || metadata === null) throw new Error('artifact_metadata_missing');
  const metadataRecord = metadata as Record<string, unknown>;
  const objectGeneration = String(metadataRecord.generation ?? '').trim();
  if (!objectGeneration) throw new Error('artifact_generation_missing');
  return buildArtifactReceipt({ ...input, objectGeneration, byteSize: Number(metadataRecord.size ?? Buffer.byteLength(serialized, 'utf8')) });
}

export interface ImmutableObjectReceipt {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
}

export async function writeImmutableObject(bucket: ArtifactBucketLike, objectPath: string, payload: unknown): Promise<ImmutableObjectReceipt> {
  if (!/^[A-Za-z0-9._/-]{1,300}$/.test(objectPath) || objectPath.includes('..') || objectPath.startsWith('/')) throw new Error('artifact_object_path_invalid');
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();
  if (exists) throw new Error('artifact_already_exists');
  const serialized = serializeArtifactPayload(payload);
  const bytes = Buffer.from(serialized, 'utf8');
  await file.save(bytes, { resumable: false, metadata: { contentType: 'application/json', cacheControl: 'public,max-age=31536000,immutable' } });
  const metadataResult = await file.getMetadata();
  const metadata = Array.isArray(metadataResult) ? metadataResult[0] : metadataResult;
  if (typeof metadata !== 'object' || metadata === null) throw new Error('artifact_metadata_missing');
  const metadataRecord = metadata as Record<string, unknown>;
  const objectGeneration = String(metadataRecord.generation ?? '').trim();
  if (!objectGeneration) throw new Error('artifact_generation_missing');
  return Object.freeze({ objectPath, contentHash: createHash('sha256').update(serialized).digest('hex'), objectGeneration, byteSize: Number(metadataRecord.size ?? bytes.byteLength) });
}
