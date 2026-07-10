import { buildArtifactReceipt, serializeArtifactPayload, artifactObjectPath, type ArtifactReceipt } from './artifact_repository';
import type { CanonicalReleaseSurface } from './course_release_contract';

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
