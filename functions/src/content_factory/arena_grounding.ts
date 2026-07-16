import { createHash } from 'node:crypto';
import { validateArenaQuestionBatchArtifact, validateArenaTopicArtifact } from './arena_artifacts';

export interface ArenaGroundingFileLike { getMetadata(): Promise<unknown>; download(options?: Record<string, unknown>): Promise<[Buffer]> }
export interface ArenaGroundingBucketLike { file(path: string): ArenaGroundingFileLike }
function record(value: unknown): Record<string, unknown> | undefined { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }

async function verified(bucket: ArenaGroundingBucketLike, stage: { readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string }, prefix: string) {
  if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration) throw new Error(`${prefix}_receipt_invalid`);
  const file = bucket.file(stage.objectPath); const metadataResult = await file.getMetadata(); const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error(`${prefix}_generation_mismatch`);
  const [bytes] = await file.download({ validation: false }); if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error(`${prefix}_content_hash_mismatch`);
  try { const value = JSON.parse(bytes.toString('utf8')); if (!record(value)) throw new Error('invalid'); return value as Record<string, unknown>; } catch { throw new Error(`${prefix}_json_invalid`); }
}

export async function loadApprovedArenaTopic(bucket: ArenaGroundingBucketLike, stage: { readonly artifactId: string; readonly kind: 'arena_topic'; readonly state: string; readonly cefr: string; readonly studyTarget: string; readonly sourceLocale: string; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string }) {
  if (stage.state !== 'approved') throw new Error('arena_topic_not_approved');
  const artifact = await verified(bucket, stage, 'arena_topic'); const errors = validateArenaTopicArtifact(artifact, { cefr: stage.cefr, studyTarget: stage.studyTarget, sourceLocale: stage.sourceLocale });
  if (errors.length) throw new Error(`arena_topic_artifact_invalid:${errors.join(',')}`);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, topic: Object.freeze({ ...record(artifact.result)! }) });
}

export async function loadArenaQuestionBatchForReview(bucket: ArenaGroundingBucketLike, stage: { readonly artifactId: string; readonly kind: 'arena_questions'; readonly state: string; readonly count: number; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly groundingReceipt: unknown }, options: { readonly allowNeedsReview?: boolean } = {}) {
  if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review')) throw new Error('arena_batch_not_reviewable');
  const grounding = record(stage.groundingReceipt); if (!record(grounding?.topic) || !String(grounding?.topicArtifactId ?? '')) throw new Error('arena_batch_grounding_required');
  const verifiedGrounding = grounding as Record<string, unknown>;
  const artifact = await verified(bucket, stage, 'arena_batch'); const errors = validateArenaQuestionBatchArtifact(artifact, { count: stage.count, grounding: verifiedGrounding });
  if (errors.length) throw new Error(`arena_batch_artifact_invalid:${errors.join(',')}`);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, topicArtifactId: String(verifiedGrounding.topicArtifactId), topic: Object.freeze({ ...record(verifiedGrounding.topic)! }), items: Object.freeze([...(artifact.items as unknown[])]) });
}
