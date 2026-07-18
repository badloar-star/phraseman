import { createHash } from 'node:crypto';
import { questionSemanticKey } from './question_artifacts';

export interface LedgerQuestion { readonly id: string; readonly semanticKey: string; readonly skillTag: string; readonly difficulty: string }
export interface QuestionReplacementRevision { readonly artifactId: string; readonly item: LedgerQuestion }
export interface QuestionBatchLedgerEntry { readonly contentHash: string; readonly baseItems: readonly LedgerQuestion[]; readonly items: readonly LedgerQuestion[]; readonly replacements: Readonly<Record<string, readonly QuestionReplacementRevision[]>> }
export interface QuestionBatchLedger { readonly topicArtifactId: string; readonly revision: number; readonly batches: Readonly<Record<string, QuestionBatchLedgerEntry>> }
function record(value: unknown): Record<string, unknown> | undefined { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined; }
function ledgerItem(value: unknown): LedgerQuestion {
  const item = record(value); const id = String(item?.id ?? '').trim(); const semanticKey = typeof item?.semanticKey === 'string' ? item.semanticKey : questionSemanticKey(item); const skillTag = String(item?.skillTag ?? '').trim(); const difficulty = String(item?.difficulty ?? '').trim();
  if (!id || semanticKey === '\u0000' || !skillTag || !difficulty) throw new Error('question_batch_ledger_item_invalid');
  return Object.freeze({ id, semanticKey, skillTag, difficulty });
}
function contentHash(items: readonly LedgerQuestion[]): string { return createHash('sha256').update(JSON.stringify(items)).digest('hex'); }
export function questionLedgerDocumentId(requestId: string, topicArtifactId: string): string { return createHash('sha256').update(`${requestId}\u0000${topicArtifactId}`).digest('hex'); }

export function parseQuestionBatchLedger(value: unknown, topicArtifactId: string): QuestionBatchLedger {
  if (!record(value)) return Object.freeze({ topicArtifactId, revision: 0, batches: Object.freeze({}) });
  const input = record(value)!;
  if (input.topicArtifactId !== topicArtifactId || !Number.isSafeInteger(input.revision) || !record(input.batches)) throw new Error('question_batch_ledger_invalid');
  const batches: Record<string, QuestionBatchLedgerEntry> = {};
  for (const [artifactId, raw] of Object.entries(input.batches as Record<string, unknown>)) {
    const batch = record(raw);
    if (!artifactId || !batch || typeof batch.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(batch.contentHash) || !Array.isArray(batch.items)) throw new Error('question_batch_ledger_invalid');
    const items = Object.freeze(batch.items.map(ledgerItem));
    const baseItems = Object.freeze((Array.isArray(batch.baseItems) ? batch.baseItems : batch.items).map(ledgerItem));
    const replacementsInput = record(batch.replacements) ?? {}; const replacements: Record<string, readonly QuestionReplacementRevision[]> = {};
    for (const [questionId, rawHistory] of Object.entries(replacementsInput)) {
      if (!Array.isArray(rawHistory)) throw new Error('question_batch_ledger_invalid');
      replacements[questionId] = Object.freeze(rawHistory.map((raw) => { const revision = record(raw); if (!revision || typeof revision.artifactId !== 'string') throw new Error('question_batch_ledger_invalid'); return Object.freeze({ artifactId: revision.artifactId, item: ledgerItem(revision.item) }); }));
    }
    batches[artifactId] = Object.freeze({ contentHash: batch.contentHash, baseItems, items, replacements: Object.freeze(replacements) });
  }
  return Object.freeze({ topicArtifactId, revision: Number(input.revision), batches: Object.freeze(batches) });
}

export function previousQuestionKeys(ledger: QuestionBatchLedger, excludingBatchArtifactId?: string): readonly string[] {
  return Object.freeze(Object.entries(ledger.batches).filter(([artifactId]) => artifactId !== excludingBatchArtifactId).flatMap(([, batch]) => batch.items.map((item) => item.semanticKey)).sort());
}

export function approveQuestionBatch(ledger: QuestionBatchLedger, input: { readonly batchArtifactId: string; readonly items: readonly unknown[] }) {
  if (!input.batchArtifactId) throw new Error('question_batch_artifact_id_required');
  const items = Object.freeze(input.items.map(ledgerItem));
  const prior = new Set(previousQuestionKeys(ledger, input.batchArtifactId)); const current = new Set<string>();
  if (items.some((item) => prior.has(item.semanticKey))) throw new Error('question_batch_previous_duplicate');
  if (items.some((item) => current.has(item.semanticKey) ? true : (current.add(item.semanticKey), false))) throw new Error('question_batch_internal_duplicate');
  const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: Object.freeze({ contentHash: contentHash(items), baseItems: items, items, replacements: Object.freeze({}) }) });
  return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches }), previousQuestionKeys: previousQuestionKeys(ledger, input.batchArtifactId) });
}

export function replaceLedgerQuestion(ledger: QuestionBatchLedger, input: { readonly batchArtifactId: string; readonly questionId: string; readonly replacement: unknown }) {
  const batch = ledger.batches[input.batchArtifactId]; if (!batch) throw new Error('question_batch_not_found');
  const index = batch.items.findIndex((item) => item.id === input.questionId); if (index < 0) throw new Error('question_ledger_item_not_found');
  const replacement = ledgerItem(input.replacement); const others = [...previousQuestionKeys(ledger, input.batchArtifactId), ...batch.items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.semanticKey)];
  if (replacement.id !== input.questionId) throw new Error('question_replacement_id_mismatch');
  if (new Set(others).has(replacement.semanticKey)) throw new Error('question_replacement_duplicate');
  const items = [...batch.items]; items[index] = replacement;
  const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items) }) });
  return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches }), replacedQuestionId: input.questionId });
}

export function approveQuestionReplacement(ledger: QuestionBatchLedger, input: { readonly batchArtifactId: string; readonly questionId: string; readonly replacementArtifactId: string; readonly replacement: unknown }) {
  if (!input.replacementArtifactId) throw new Error('question_replacement_artifact_id_required');
  const batch = ledger.batches[input.batchArtifactId]; if (!batch) throw new Error('question_batch_not_found');
  const replacement = ledgerItem(input.replacement); if (replacement.id !== input.questionId) throw new Error('question_replacement_id_mismatch');
  const index = batch.items.findIndex((item) => item.id === input.questionId); if (index < 0) throw new Error('question_ledger_item_not_found');
  const others = [...previousQuestionKeys(ledger, input.batchArtifactId), ...batch.items.filter((_, itemIndex) => itemIndex !== index).map((item) => item.semanticKey)];
  if (new Set(others).has(replacement.semanticKey)) throw new Error('question_replacement_duplicate');
  const history = [...(batch.replacements[input.questionId] ?? [])]; const supersededReplacementArtifactId = history[history.length - 1]?.artifactId ?? null;
  history.push(Object.freeze({ artifactId: input.replacementArtifactId, item: replacement }));
  const items = [...batch.items]; items[index] = replacement;
  const replacements = Object.freeze({ ...batch.replacements, [input.questionId]: Object.freeze(history) });
  const nextBatch = Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items), replacements });
  return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), supersededReplacementArtifactId });
}

export function rollbackQuestionReplacement(ledger: QuestionBatchLedger, input: { readonly batchArtifactId: string; readonly questionId: string; readonly replacementArtifactId: string }) {
  const batch = ledger.batches[input.batchArtifactId]; if (!batch) throw new Error('question_batch_not_found');
  const history = [...(batch.replacements[input.questionId] ?? [])]; const active = history[history.length - 1];
  if (!active || active.artifactId !== input.replacementArtifactId) throw new Error('question_replacement_not_active');
  history.pop(); const restoredRevision = history[history.length - 1]; const restored = restoredRevision?.item ?? batch.baseItems.find((item) => item.id === input.questionId);
  if (!restored) throw new Error('question_replacement_base_missing');
  const index = batch.items.findIndex((item) => item.id === input.questionId); if (index < 0) throw new Error('question_ledger_item_not_found');
  const items = [...batch.items]; items[index] = restored;
  const replacements = { ...batch.replacements }; if (history.length) replacements[input.questionId] = Object.freeze(history); else delete replacements[input.questionId];
  const nextBatch = Object.freeze({ ...batch, contentHash: contentHash(items), items: Object.freeze(items), replacements: Object.freeze(replacements) });
  return Object.freeze({ ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze({ ...ledger.batches, [input.batchArtifactId]: nextBatch }) }), restoredReplacementArtifactId: restoredRevision?.artifactId ?? null });
}

export function rollbackQuestionBatch(ledger: QuestionBatchLedger, batchArtifactId: string): QuestionBatchLedger {
  if (!ledger.batches[batchArtifactId]) return ledger;
  const batches = { ...ledger.batches }; delete batches[batchArtifactId];
  return Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze(batches) });
}
