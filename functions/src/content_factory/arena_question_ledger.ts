import { createHash } from 'node:crypto';
import { arenaQuestionSemanticKey } from './arena_artifacts';

export interface ArenaLedgerQuestion {
  readonly id: string;
  readonly semanticKey: string;
  readonly skillTag: string;
  readonly difficulty: string;
}

export interface ArenaQuestionBatchLedgerEntry {
  readonly contentHash: string;
  readonly items: readonly ArenaLedgerQuestion[];
}

export interface ArenaQuestionLedger {
  readonly topicArtifactId: string;
  readonly revision: number;
  readonly batches: Readonly<Record<string, ArenaQuestionBatchLedgerEntry>>;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function ledgerItem(value: unknown): ArenaLedgerQuestion {
  const item = record(value);
  const id = String(item?.id ?? '').trim();
  const skillTag = String(item?.skillTag ?? '').trim();
  const difficulty = String(item?.difficulty ?? '').trim();
  const semanticKey = typeof item?.semanticKey === 'string'
    ? item.semanticKey
    : arenaQuestionSemanticKey(item);
  if (!id || !skillTag || !difficulty || semanticKey === '\u0000\u0000') {
    throw new Error('arena_question_ledger_item_invalid');
  }
  return Object.freeze({ id, semanticKey, skillTag, difficulty });
}

function batchContentHash(items: readonly ArenaLedgerQuestion[]): string {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex');
}

export function arenaLedgerDocumentId(requestId: string, topicArtifactId: string): string {
  return createHash('sha256').update(`${requestId}\u0000${topicArtifactId}`).digest('hex');
}

export function parseArenaQuestionLedger(value: unknown, topicArtifactId: string): ArenaQuestionLedger {
  if (!topicArtifactId) throw new Error('arena_topic_artifact_id_required');
  if (!record(value)) return Object.freeze({ topicArtifactId, revision: 0, batches: Object.freeze({}) });
  const input = record(value)!;
  if (input.topicArtifactId !== topicArtifactId || !Number.isSafeInteger(input.revision) || !record(input.batches)) {
    throw new Error('arena_question_ledger_invalid');
  }
  const batches: Record<string, ArenaQuestionBatchLedgerEntry> = {};
  for (const [artifactId, rawBatch] of Object.entries(input.batches as Record<string, unknown>)) {
    const batch = record(rawBatch);
    if (!artifactId || !batch || !Array.isArray(batch.items) || typeof batch.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(batch.contentHash)) {
      throw new Error('arena_question_ledger_invalid');
    }
    const items = Object.freeze(batch.items.map(ledgerItem));
    if (items.length !== 10 || batchContentHash(items) !== batch.contentHash) throw new Error('arena_question_ledger_invalid');
    batches[artifactId] = Object.freeze({ contentHash: batch.contentHash, items });
  }
  return Object.freeze({ topicArtifactId, revision: Number(input.revision), batches: Object.freeze(batches) });
}

export function previousArenaQuestionKeys(ledger: ArenaQuestionLedger, excludingBatchArtifactId?: string): readonly string[] {
  return Object.freeze(Object.entries(ledger.batches)
    .filter(([artifactId]) => artifactId !== excludingBatchArtifactId)
    .flatMap(([, batch]) => batch.items.map((item) => item.semanticKey))
    .sort());
}

export function arenaLedgerCoverage(ledger: ArenaQuestionLedger) {
  const bySkill: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  let total = 0;
  for (const batch of Object.values(ledger.batches)) {
    for (const item of batch.items) {
      bySkill[item.skillTag] = (bySkill[item.skillTag] ?? 0) + 1;
      byDifficulty[item.difficulty] = (byDifficulty[item.difficulty] ?? 0) + 1;
      total += 1;
    }
  }
  return Object.freeze({ bySkill: Object.freeze(bySkill), byDifficulty: Object.freeze(byDifficulty), total });
}

function proposedBatch(input: { readonly batchArtifactId: string; readonly items: readonly unknown[] }): ArenaQuestionBatchLedgerEntry {
  if (!input.batchArtifactId) throw new Error('arena_question_batch_artifact_id_required');
  if (input.items.length !== 10) throw new Error('arena_question_batch_count_expected_10');
  const items = Object.freeze(input.items.map(ledgerItem));
  if (new Set(items.map((item) => item.id)).size !== items.length) throw new Error('arena_question_batch_id_duplicate');
  if (new Set(items.map((item) => item.semanticKey)).size !== items.length) throw new Error('arena_question_batch_internal_duplicate');
  return Object.freeze({ contentHash: batchContentHash(items), items });
}

export function assertArenaBatchApprovalIdempotent(
  ledger: ArenaQuestionLedger,
  input: { readonly batchArtifactId: string; readonly items: readonly unknown[] },
): boolean {
  const existing = ledger.batches[input.batchArtifactId];
  if (!existing) return false;
  if (existing.contentHash !== proposedBatch(input).contentHash) throw new Error('arena_question_batch_artifact_content_conflict');
  return true;
}

export function approveArenaQuestionBatch(
  ledger: ArenaQuestionLedger,
  input: { readonly batchArtifactId: string; readonly items: readonly unknown[] },
) {
  const batch = proposedBatch(input);
  if (assertArenaBatchApprovalIdempotent(ledger, input)) return Object.freeze({ ledger, idempotent: true });
  const prior = new Set(previousArenaQuestionKeys(ledger));
  if (batch.items.some((item) => prior.has(item.semanticKey))) throw new Error('arena_question_batch_previous_duplicate');
  const batches = Object.freeze({ ...ledger.batches, [input.batchArtifactId]: batch });
  return Object.freeze({
    ledger: Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches }),
    idempotent: false,
  });
}

export function rollbackArenaQuestionBatch(ledger: ArenaQuestionLedger, batchArtifactId: string): ArenaQuestionLedger {
  if (!ledger.batches[batchArtifactId]) return ledger;
  const batches = { ...ledger.batches };
  delete batches[batchArtifactId];
  return Object.freeze({ topicArtifactId: ledger.topicArtifactId, revision: ledger.revision + 1, batches: Object.freeze(batches) });
}

export function planArenaWholeBatchRetry(ledger: ArenaQuestionLedger, batchArtifactId: string) {
  if (!batchArtifactId) throw new Error('arena_question_batch_artifact_id_required');
  return Object.freeze({ stage: 'arena_questions' as const, batchArtifactId, topicArtifactId: ledger.topicArtifactId, count: 10 as const });
}
