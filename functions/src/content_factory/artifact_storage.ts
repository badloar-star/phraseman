import { buildArtifactReceipt, serializeArtifactPayload, artifactObjectPath, type ArtifactReceipt } from './artifact_repository';
import type { CanonicalReleaseSurface } from './course_release_contract';

export interface ArtifactFileLike {
  exists(): Promise<[boolean]>;
  save(data: Buffer, options?: Record<string, unknown>): Promise<void>;
  getMetadata(): Promise<[Record<string, unknown>]>;
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
  const [metadata] = await file.getMetadata();
  const objectGeneration = String(metadata.generation ?? '').trim();
  if (!objectGeneration) throw new Error('artifact_generation_missing');
  return buildArtifactReceipt({ ...input, objectGeneration, byteSize: Number(metadata.size ?? Buffer.byteLength(serialized, 'utf8')) });
}
