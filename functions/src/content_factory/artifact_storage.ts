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

function metadataRecord(result: unknown): Record<string, unknown> {
  const metadata = Array.isArray(result) ? result[0] : result;
  if (typeof metadata !== 'object' || metadata === null) throw new Error('artifact_metadata_missing');
  return metadata as Record<string, unknown>;
}

function customContentHash(metadata: Record<string, unknown>): string {
  const custom = metadata.metadata;
  return typeof custom === 'object' && custom !== null ? String((custom as Record<string, unknown>).contentHash ?? '').trim() : '';
}

async function saveOrReplay(
  file: ArtifactFileLike,
  bytes: Buffer,
  contentHash: string,
): Promise<{ metadata: Record<string, unknown>; replayed: boolean }> {
  const verifyExisting = async (): Promise<{ metadata: Record<string, unknown>; replayed: true }> => {
    const metadata = metadataRecord(await file.getMetadata());
    const storedHash = customContentHash(metadata);
    if (!storedHash) throw new Error('artifact_existing_hash_missing');
    if (storedHash !== contentHash) throw new Error('artifact_content_conflict');
    return { metadata, replayed: true };
  };
  const [exists] = await file.exists();
  if (exists) return verifyExisting();
  try {
    await file.save(bytes, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: 'application/json', cacheControl: 'public,max-age=31536000,immutable', metadata: { contentHash } },
    });
  } catch (error) {
    const [nowExists] = await file.exists();
    if (nowExists) return verifyExisting();
    throw error;
  }
  return { metadata: metadataRecord(await file.getMetadata()), replayed: false };
}

export async function writeImmutableArtifact(
  bucket: ArtifactBucketLike,
  input: { releaseId: string; surface: CanonicalReleaseSurface; lessonId: number; payload: unknown },
): Promise<ArtifactReceipt> {
  const objectPath = artifactObjectPath(input.releaseId, input.surface, input.lessonId);
  const file = bucket.file(objectPath);
  const serialized = serializeArtifactPayload(input.payload);
  const bytes = Buffer.from(serialized, 'utf8');
  const contentHash = createHash('sha256').update(serialized).digest('hex');
  const { metadata } = await saveOrReplay(file, bytes, contentHash);
  const objectGeneration = String(metadata.generation ?? '').trim();
  if (!objectGeneration) throw new Error('artifact_generation_missing');
  return buildArtifactReceipt({ ...input, objectGeneration, byteSize: Number(metadata.size ?? bytes.byteLength) });
}

export interface ImmutableObjectReceipt {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly referenceState: 'pending_commit';
  readonly finalizationKey: string;
}

export async function writeImmutableObject(bucket: ArtifactBucketLike, objectPath: string, payload: unknown): Promise<ImmutableObjectReceipt> {
  if (!/^[A-Za-z0-9._/-]{1,300}$/.test(objectPath) || objectPath.includes('..') || objectPath.startsWith('/')) throw new Error('artifact_object_path_invalid');
  const file = bucket.file(objectPath);
  const serialized = serializeArtifactPayload(payload);
  const bytes = Buffer.from(serialized, 'utf8');
  const contentHash = createHash('sha256').update(serialized).digest('hex');
  const { metadata } = await saveOrReplay(file, bytes, contentHash);
  const objectGeneration = String(metadata.generation ?? '').trim();
  if (!objectGeneration) throw new Error('artifact_generation_missing');
  const finalizationKey = createHash('sha256').update(`${objectPath}\n${objectGeneration}\n${contentHash}`).digest('hex');
  return Object.freeze({ objectPath, contentHash, objectGeneration, byteSize: Number(metadata.size ?? bytes.byteLength), referenceState: 'pending_commit' as const, finalizationKey });
}
