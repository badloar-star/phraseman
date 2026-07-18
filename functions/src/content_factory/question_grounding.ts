import { createHash } from 'node:crypto';
import { validateTopicArtifact, validateQuestionBatchArtifact, validateQuestionReplacementArtifact } from './question_artifacts';

export interface StudioGroundingFileLike { getMetadata(): Promise<unknown>; download(options?: Record<string, unknown>): Promise<[Buffer]> }
export interface StudioGroundingBucketLike { file(path: string): StudioGroundingFileLike }
function record(value: unknown): Record<string, unknown> | undefined { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }

export async function loadApprovedTopicGrounding(bucket: StudioGroundingBucketLike, stage: { readonly stageId: string; readonly artifactId: string; readonly kind: 'challenge_topic'; readonly state: string; readonly cefr: string; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string }) {
  if (stage.state !== 'approved') throw new Error('studio_topic_not_approved');
  if (stage.kind !== 'challenge_topic') throw new Error('studio_topic_kind_invalid');
  if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration) throw new Error('studio_topic_receipt_invalid');
  const file = bucket.file(stage.objectPath);
  const metadataResult = await file.getMetadata(); const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error('studio_topic_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error('studio_topic_content_hash_mismatch');
  let artifact: unknown; try { artifact = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('studio_topic_json_invalid'); }
  const errors = validateTopicArtifact(artifact, { kind: stage.kind, cefr: stage.cefr });
  if (errors.length) throw new Error(`studio_topic_artifact_invalid:${errors.join(',')}`);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, topic: Object.freeze({ ...(record(record(artifact)?.result) ?? {}) }) });
}

export async function loadQuestionBatchForReview(bucket: StudioGroundingBucketLike, stage: { readonly stageId: string; readonly artifactId: string; readonly kind: 'challenge_questions'; readonly state: string; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly groundingReceipt: unknown }, options: { readonly allowNeedsReview?: boolean } = {}) {
  if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review')) throw new Error('question_batch_not_reviewable');
  const groundingReceipt = record(stage.groundingReceipt); const topic = record(groundingReceipt?.topic);
  if (!topic) throw new Error('question_batch_topic_receipt_required');
  const file = bucket.file(stage.objectPath); const metadataResult = await file.getMetadata(); const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error('question_batch_generation_mismatch');
  const [bytes] = await file.download({ validation: false });
  if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error('question_batch_content_hash_mismatch');
  let artifact: unknown; try { artifact = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('question_batch_json_invalid'); }
  const errors = validateQuestionBatchArtifact(artifact, { kind: stage.kind, count: 10, grounding: { topic } });
  if (errors.length) throw new Error(`question_batch_artifact_invalid:${errors.join(',')}`);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, items: Object.freeze([...(record(artifact)?.items as unknown[])]), topicArtifactId: String(groundingReceipt?.topicArtifactId ?? ''), topic: Object.freeze({ ...topic }) });
}

export async function loadQuestionReplacementForReview(bucket: StudioGroundingBucketLike, stage: { readonly artifactId: string; readonly kind: 'challenge_question_replacement'; readonly state: string; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly groundingReceipt: unknown }, options: { readonly allowNeedsReview?: boolean } = {}) {
  if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review')) throw new Error('question_replacement_not_reviewable');
  const grounding = record(stage.groundingReceipt);
  if (!grounding || !record(grounding.topic) || !record(grounding.originalQuestion) || !String(grounding.replacementForQuestionId ?? '')) throw new Error('question_replacement_grounding_required');
  const file = bucket.file(stage.objectPath); const metadataResult = await file.getMetadata(); const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error('question_replacement_generation_mismatch');
  const [bytes] = await file.download({ validation: false }); if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error('question_replacement_content_hash_mismatch');
  let artifact: unknown; try { artifact = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('question_replacement_json_invalid'); }
  const errors = validateQuestionReplacementArtifact(artifact, { kind: stage.kind, grounding }); if (errors.length) throw new Error(`question_replacement_artifact_invalid:${errors.join(',')}`);
  const result = record(record(artifact)?.result)!;
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, batchArtifactId: String(grounding.batchArtifactId ?? ''), topicArtifactId: String(grounding.topicArtifactId ?? ''), replacementForQuestionId: String(result.replacementForQuestionId), originalQuestion: Object.freeze({ ...record(grounding.originalQuestion)! }), item: Object.freeze({ ...record(result.item)! }) });
}
