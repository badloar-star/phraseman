import { createHash } from 'node:crypto';
import { validateFlashcardItemsArtifact, validateFlashcardPackIdeaArtifact, validateFlashcardReplacementArtifact } from './flashcard_artifacts';

export interface FlashcardGroundingFileLike { getMetadata(): Promise<unknown>; download(options?: Record<string, unknown>): Promise<[Buffer]> }
export interface FlashcardGroundingBucketLike { file(path: string): FlashcardGroundingFileLike }

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

async function verifiedArtifact(bucket: FlashcardGroundingBucketLike, stage: { readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string }, prefix: string): Promise<Record<string, unknown>> {
  if (!stage.objectPath || !/^[a-f0-9]{64}$/i.test(stage.contentHash) || !stage.objectGeneration) throw new Error(`${prefix}_receipt_invalid`);
  const file = bucket.file(stage.objectPath);
  const metadataResult = await file.getMetadata();
  const metadata = record(Array.isArray(metadataResult) ? metadataResult[0] : metadataResult);
  if (String(metadata?.generation ?? '') !== stage.objectGeneration) throw new Error(`${prefix}_generation_mismatch`);
  const [bytes] = await file.download({ validation: false });
  if (createHash('sha256').update(bytes).digest('hex') !== stage.contentHash.toLowerCase()) throw new Error(`${prefix}_content_hash_mismatch`);
  try {
    const parsed = JSON.parse(bytes.toString('utf8'));
    if (!record(parsed)) throw new Error('invalid');
    return parsed as Record<string, unknown>;
  } catch { throw new Error(`${prefix}_json_invalid`); }
}

export async function loadApprovedFlashcardPackIdea(bucket: FlashcardGroundingBucketLike, stage: { readonly artifactId: string; readonly kind: 'flashcard_pack_idea'; readonly state: string; readonly cefr: string; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string }) {
  if (stage.state !== 'approved') throw new Error('flashcard_pack_idea_not_approved');
  const artifact = await verifiedArtifact(bucket, stage, 'flashcard_pack_idea');
  const errors = validateFlashcardPackIdeaArtifact(artifact, { cefr: stage.cefr });
  if (errors.length) throw new Error(`flashcard_pack_idea_artifact_invalid:${errors.join(',')}`);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, packIdea: Object.freeze({ ...record(artifact.result)! }) });
}

export async function loadFlashcardBatchForReview(bucket: FlashcardGroundingBucketLike, stage: { readonly artifactId: string; readonly kind: 'flashcard_items'; readonly state: string; readonly count: number; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly groundingReceipt: unknown }, options: { readonly allowNeedsReview?: boolean } = {}) {
  if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review')) throw new Error('flashcard_batch_not_reviewable');
  const grounding = record(stage.groundingReceipt);
  if (!record(grounding?.packIdea) || !String(grounding?.packIdeaArtifactId ?? '')) throw new Error('flashcard_batch_grounding_required');
  const verifiedGrounding = grounding as Record<string, unknown>;
  const artifact = await verifiedArtifact(bucket, stage, 'flashcard_batch');
  const errors = validateFlashcardItemsArtifact(artifact, { count: stage.count, grounding: verifiedGrounding });
  if (errors.length) throw new Error(`flashcard_batch_artifact_invalid:${errors.join(',')}`);
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, packIdeaArtifactId: String(verifiedGrounding.packIdeaArtifactId), items: Object.freeze([...(artifact.items as unknown[])]) });
}

export async function loadFlashcardReplacementForReview(bucket: FlashcardGroundingBucketLike, stage: { readonly artifactId: string; readonly kind: 'flashcard_item_replacement'; readonly state: string; readonly objectPath: string; readonly contentHash: string; readonly objectGeneration: string; readonly groundingReceipt: unknown }, options: { readonly allowNeedsReview?: boolean } = {}) {
  if (stage.state !== 'approved' && !(options.allowNeedsReview && stage.state === 'needs_review')) throw new Error('flashcard_replacement_not_reviewable');
  const grounding = record(stage.groundingReceipt);
  if (!grounding || !record(grounding.packIdea) || !record(grounding.originalCard) || !String(grounding.replacementForCardId ?? '') || !String(grounding.batchArtifactId ?? '') || !String(grounding.packIdeaArtifactId ?? '')) throw new Error('flashcard_replacement_grounding_required');
  const artifact = await verifiedArtifact(bucket, stage, 'flashcard_replacement');
  const errors = validateFlashcardReplacementArtifact(artifact, { grounding });
  if (errors.length) throw new Error(`flashcard_replacement_artifact_invalid:${errors.join(',')}`);
  const result = record(artifact.result)!;
  return Object.freeze({ artifactId: stage.artifactId, contentHash: stage.contentHash, batchArtifactId: String(grounding.batchArtifactId), packIdeaArtifactId: String(grounding.packIdeaArtifactId), replacementForCardId: String(result.replacementForCardId), originalCard: Object.freeze({ ...record(grounding.originalCard)! }), item: Object.freeze({ ...record(result.item)! }) });
}
