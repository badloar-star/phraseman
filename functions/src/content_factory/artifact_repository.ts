import { createHash } from 'node:crypto';
import { CANONICAL_RELEASE_SURFACES, type CanonicalReleaseSurface } from './course_release_contract';

export interface ArtifactReceipt {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly referenceState: 'pending_commit';
  readonly finalizationKey: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
}

export function serializeArtifactPayload(payload: unknown): string {
  return JSON.stringify(canonicalize(payload));
}

export function artifactObjectPath(releaseId: string, surface: CanonicalReleaseSurface, lessonId: number): string {
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(releaseId) || !(CANONICAL_RELEASE_SURFACES as readonly string[]).includes(surface) || !Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) throw new Error('artifact_path_invalid');
  return `course-releases/${releaseId}/${surface}/${lessonId}.json`;
}

export function buildArtifactReceipt(input: {
  releaseId: string;
  surface: CanonicalReleaseSurface;
  lessonId: number;
  payload: unknown;
  objectGeneration: string;
  byteSize?: number;
}): ArtifactReceipt {
  const serialized = serializeArtifactPayload(input.payload);
  const contentHash = createHash('sha256').update(serialized).digest('hex');
  const byteSize = input.byteSize ?? Buffer.byteLength(serialized, 'utf8');
  if (!input.objectGeneration.trim() || !Number.isSafeInteger(byteSize) || byteSize < 1) throw new Error('artifact_receipt_invalid');
  const objectPath = artifactObjectPath(input.releaseId, input.surface, input.lessonId);
  const finalizationKey = createHash('sha256').update(`${objectPath}\n${input.objectGeneration}\n${contentHash}`).digest('hex');
  return Object.freeze({ objectPath, contentHash, objectGeneration: input.objectGeneration, byteSize, referenceState: 'pending_commit' as const, finalizationKey });
}
