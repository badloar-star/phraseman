import { createHash } from 'node:crypto';
import { flashcardSemanticKey, validateFlashcardItemsArtifact } from './flashcard_artifacts';

type RichCard = Readonly<Record<string, unknown>> & { readonly id: string };
export interface FlashcardPartialCheckpoint {
  readonly requestedTotal: number;
  readonly acceptedCount: number;
  readonly missingCount: number;
  readonly acceptedItems: readonly RichCard[];
  readonly acceptedIds: readonly string[];
  readonly acceptedSemanticKeys: readonly string[];
  readonly contentHash: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function hashPayload(requestedTotal: number, items: readonly RichCard[]): string {
  return createHash('sha256').update(JSON.stringify({ requestedTotal, items })).digest('hex');
}

export function createFlashcardPartialCheckpoint(artifact: unknown, requestedTotal: number, grounding: unknown): FlashcardPartialCheckpoint | null {
  const output = record(artifact);
  if (!Number.isSafeInteger(requestedTotal) || requestedTotal < 1 || requestedTotal > 20 || output?.stage !== 'flashcard_items' || !Array.isArray(output.items)) return null;
  if (output.items.length < 1 || output.items.length >= requestedTotal) return null;
  if (validateFlashcardItemsArtifact(output, { count: output.items.length, grounding }).length) return null;
  const items = output.items as RichCard[];
  const ids = items.map((item) => String(item.id ?? '').trim());
  const keys = items.map(flashcardSemanticKey);
  if (new Set(ids).size !== ids.length || new Set(keys).size !== keys.length) return null;
  const acceptedItems = Object.freeze(items.map((item) => Object.freeze({ ...item }))) as readonly RichCard[];
  return Object.freeze({ requestedTotal, acceptedCount: items.length, missingCount: requestedTotal - items.length, acceptedItems, acceptedIds: Object.freeze(ids), acceptedSemanticKeys: Object.freeze(keys), contentHash: hashPayload(requestedTotal, acceptedItems) });
}

export function parseFlashcardPartialCheckpoint(value: unknown, requestedTotal: number): FlashcardPartialCheckpoint {
  const input = record(value);
  if (!input || input.requestedTotal !== requestedTotal || !Number.isSafeInteger(requestedTotal) || requestedTotal < 1 || requestedTotal > 20) throw new Error('flashcard_partial_checkpoint_identity_mismatch');
  if (!Array.isArray(input.acceptedItems) || !Array.isArray(input.acceptedIds) || !Array.isArray(input.acceptedSemanticKeys)) throw new Error('flashcard_partial_checkpoint_invalid');
  const recreated = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: input.acceptedItems }, requestedTotal, { packIdea: {}, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] });
  if (!recreated || recreated.acceptedCount !== input.acceptedCount || recreated.missingCount !== input.missingCount || JSON.stringify(recreated.acceptedIds) !== JSON.stringify(input.acceptedIds) || JSON.stringify(recreated.acceptedSemanticKeys) !== JSON.stringify(input.acceptedSemanticKeys)) throw new Error('flashcard_partial_checkpoint_invalid');
  if (input.contentHash !== recreated.contentHash) throw new Error('flashcard_partial_checkpoint_hash_mismatch');
  return recreated;
}

export function mergeFlashcardPartialCheckpoint(checkpoint: FlashcardPartialCheckpoint, retryArtifact: unknown, grounding: unknown): { readonly stage: 'flashcard_items'; readonly items: readonly RichCard[] } {
  const output = record(retryArtifact);
  if (output?.stage !== 'flashcard_items' || !Array.isArray(output.items) || output.items.length !== checkpoint.missingCount) throw new Error('flashcard_partial_retry_count_mismatch');
  const retryItems = output.items as RichCard[];
  const retryIds = retryItems.map((item) => String(item.id ?? '').trim());
  const retryKeys = retryItems.map(flashcardSemanticKey);
  if (retryIds.some((id) => checkpoint.acceptedIds.includes(id)) || new Set(retryIds).size !== retryIds.length) throw new Error('flashcard_partial_retry_id_conflict');
  if (retryKeys.some((key) => checkpoint.acceptedSemanticKeys.includes(key)) || new Set(retryKeys).size !== retryKeys.length) throw new Error('flashcard_partial_retry_semantic_conflict');
  const merged = Object.freeze([...checkpoint.acceptedItems, ...retryItems.map((item) => Object.freeze({ ...item }))]);
  const artifact = Object.freeze({ stage: 'flashcard_items' as const, items: merged });
  const errors = validateFlashcardItemsArtifact(artifact, { count: checkpoint.requestedTotal, grounding });
  if (errors.length) throw new Error(`flashcard_partial_merge_invalid:${errors.join(',')}`);
  return artifact;
}
