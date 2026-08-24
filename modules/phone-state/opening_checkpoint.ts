import {
  canonicalJsonWithLimit,
  canonicalStringFingerprint,
} from './canonical';
import { legacyPolicyForKey, type LegacyReducerPolicy } from './legacy_inventory';
import type { LegacyJournalEnvelope, LegacyPortableSnapshot } from './legacy_reader';

const MAX_OPENING_SOURCE_BYTES = 2 * 1024 * 1024;
const OPERATION_ID = /^[A-Za-z0-9_.:-]{1,160}$/;

export type LegacyOpeningReceipt = Readonly<{
  schemaVersion: 'legacy-opening-checkpoint.v1';
  stableUid: string;
  accountGeneration: number;
  sourceFingerprint: string;
  checkpointId: string;
  importedOperationIds: readonly string[];
  quarantinedKeys: readonly string[];
  createdAtMs: number;
}>;

export type LegacyOpeningOperation = Readonly<{
  operationId: string;
  domain: string;
  sourceKind: 'snapshot' | 'journal';
  sourceKey: string;
  payload: unknown;
}>;

export type LegacyOpeningProjection = Readonly<{
  fields: Readonly<Record<string, unknown>>;
}> & Readonly<Record<string, unknown>>;

export type LegacyOpeningCommit = Readonly<{
  receipt: LegacyOpeningReceipt;
  operations: readonly LegacyOpeningOperation[];
  projections: Readonly<Record<string, LegacyOpeningProjection>>;
  externalEvents: readonly never[];
}>;

export interface LegacyOpeningTransaction {
  readOpeningReceipt(): Promise<LegacyOpeningReceipt | null>;
  commitOpening(commit: LegacyOpeningCommit): Promise<void>;
}

export interface LegacyOpeningRepository {
  runAtomically<T>(task: (transaction: LegacyOpeningTransaction) => Promise<T>): Promise<T>;
}

export type LegacyOpeningImportResult = Readonly<{
  receipt: LegacyOpeningReceipt;
  projections: Readonly<Record<string, LegacyOpeningProjection>>;
  insertedOperations: number;
}>;

function parseLegacyValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function numericValue(value: unknown): number | null {
  const parsed = parseLegacyValue(value);
  if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
  if (typeof parsed === 'string' && parsed.trim() !== '') {
    const number = Number(parsed);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function stableUnion(values: readonly unknown[]): readonly unknown[] {
  const unique = new Map<string, unknown>();
  for (const raw of values) {
    const parsed = parseLegacyValue(raw);
    const items = Array.isArray(parsed) ? parsed : parsed === null || parsed === undefined ? [] : [parsed];
    for (const item of items) {
      try {
        unique.set(canonicalJsonWithLimit(item, 64 * 1024), item);
      } catch {
        // The caller quarantines a key when no usable values remain.
      }
    }
  }
  return Object.freeze([...unique.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value));
}

function mergeValue(
  reducer: LegacyReducerPolicy,
  sources: Readonly<{ local: string | null; lastSynced: string | null; cloud: unknown }>,
): unknown | undefined {
  const candidates = [sources.local, sources.lastSynced, sources.cloud]
    .filter((value) => value !== null && value !== undefined);
  if (candidates.length === 0) return undefined;
  switch (reducer) {
    case 'max': {
      const numbers = candidates.map(numericValue).filter((value): value is number => value !== null);
      return numbers.length === 0 ? undefined : Math.max(...numbers);
    }
    case 'sum_unique': {
      const numbers = candidates.map(numericValue).filter((value): value is number => value !== null);
      return numbers.length === 0 ? undefined : numbers.reduce((sum, value) => sum + value, 0);
    }
    case 'union':
    case 'date_union':
    case 'or_set': {
      const union = stableUnion(candidates);
      return union.length === 0 ? undefined : union;
    }
    case 'field_register':
    case 'composite_economy': {
      if (sources.local !== null && sources.local !== sources.lastSynced) {
        return parseLegacyValue(sources.local);
      }
      if (sources.cloud !== null && sources.cloud !== undefined) return parseLegacyValue(sources.cloud);
      if (sources.local !== null) return parseLegacyValue(sources.local);
      return sources.lastSynced === null ? undefined : parseLegacyValue(sources.lastSynced);
    }
    case 'none':
      return undefined;
  }
}

function journalOperationId(journal: LegacyJournalEnvelope): string | null {
  if (journal.value === null || typeof journal.value !== 'object' || Array.isArray(journal.value)) return null;
  const candidate = journal.value as Record<string, unknown>;
  const operationId = candidate.operationId ?? candidate.id;
  return typeof operationId === 'string' && OPERATION_ID.test(operationId) ? operationId : null;
}

function projectionFieldName(key: string): string {
  if (key === 'user_total_xp') return 'total';
  if (key === 'unlocked_lessons') return 'unlocked';
  return key;
}

async function sourceFingerprint(snapshot: LegacyPortableSnapshot): Promise<string> {
  const values = Object.fromEntries(Object.entries(snapshot.values).sort(([left], [right]) => left.localeCompare(right)));
  const journals = [...snapshot.journals]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((journal) => ({ key: journal.key, domain: journal.domain, reducer: journal.reducer, raw: journal.raw }));
  const canonical = canonicalJsonWithLimit({
    schemaVersion: snapshot.schemaVersion,
    stableUid: snapshot.stableUid,
    accountGeneration: snapshot.accountGeneration,
    values,
    journals,
  }, MAX_OPENING_SOURCE_BYTES);
  return canonicalStringFingerprint(canonical);
}

function freezeProjection(fields: Record<string, unknown>): LegacyOpeningProjection {
  return Object.freeze({ fields: Object.freeze(fields), ...fields });
}

export async function importLegacyOpeningCheckpoint(input: Readonly<{
  snapshot: LegacyPortableSnapshot;
  repository: LegacyOpeningRepository;
}>): Promise<LegacyOpeningImportResult> {
  const { snapshot } = input;
  if (
    snapshot.schemaVersion !== 'legacy-portable-snapshot.v1'
    || !snapshot.stableUid
    || !Number.isSafeInteger(snapshot.accountGeneration)
    || snapshot.accountGeneration < 0
    || !Number.isSafeInteger(snapshot.capturedAtMs)
    || snapshot.capturedAtMs < 0
  ) {
    throw new Error('phone_state_legacy_snapshot_invalid');
  }
  const fingerprint = await sourceFingerprint(snapshot);

  return input.repository.runAtomically(async (transaction) => {
    const existing = await transaction.readOpeningReceipt();
    if (existing) {
      if (
        existing.stableUid !== snapshot.stableUid
        || existing.accountGeneration !== snapshot.accountGeneration
      ) {
        throw new Error('phone_state_legacy_receipt_scope_mismatch');
      }
      return Object.freeze({ receipt: existing, projections: Object.freeze({}), insertedOperations: 0 });
    }

    const projectionsMutable: Record<string, Record<string, unknown>> = {};
    const operations: LegacyOpeningOperation[] = [];
    const quarantined = new Set<string>();
    const sortedValues = Object.entries(snapshot.values).sort(([left], [right]) => left.localeCompare(right));
    for (let index = 0; index < sortedValues.length; index += 1) {
      const [key, sources] = sortedValues[index];
      const policy = legacyPolicyForKey(key);
      if (!policy || policy.scope !== 'portable' || policy.reducer === 'none') {
        quarantined.add(key);
        continue;
      }
      const value = mergeValue(policy.reducer, sources);
      if (value === undefined) {
        quarantined.add(key);
        continue;
      }
      const domain = projectionsMutable[policy.domain] ?? {};
      domain[projectionFieldName(key)] = value;
      projectionsMutable[policy.domain] = domain;
      operations.push(Object.freeze({
        operationId: `legacy:${fingerprint.slice(0, 16)}:${String(index).padStart(4, '0')}`,
        domain: policy.domain,
        sourceKind: 'snapshot',
        sourceKey: key,
        payload: Object.freeze({ key, reducer: policy.reducer, value }),
      }));
    }

    const operationIds = new Set(operations.map((operation) => operation.operationId));
    for (const journal of [...snapshot.journals].sort((left, right) => left.key.localeCompare(right.key))) {
      const operationId = journalOperationId(journal);
      const policy = legacyPolicyForKey(journal.key);
      if (!operationId || !policy || policy.scope !== 'portable' || operationIds.has(operationId)) {
        quarantined.add(journal.key);
        continue;
      }
      operationIds.add(operationId);
      operations.push(Object.freeze({
        operationId,
        domain: policy.domain,
        sourceKind: 'journal',
        sourceKey: journal.key,
        payload: journal.value,
      }));
    }

    const projections = Object.freeze(Object.fromEntries(
      Object.entries(projectionsMutable)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([domain, fields]) => [domain, freezeProjection(fields)]),
    ));
    const importedOperationIds = Object.freeze([...operationIds].sort());
    const receipt: LegacyOpeningReceipt = Object.freeze({
      schemaVersion: 'legacy-opening-checkpoint.v1',
      stableUid: snapshot.stableUid,
      accountGeneration: snapshot.accountGeneration,
      sourceFingerprint: fingerprint,
      checkpointId: `legacy_${fingerprint.slice(0, 32)}`,
      importedOperationIds,
      quarantinedKeys: Object.freeze([...quarantined].sort()),
      createdAtMs: snapshot.capturedAtMs,
    });
    const commit: LegacyOpeningCommit = Object.freeze({
      receipt,
      operations: Object.freeze(operations),
      projections,
      externalEvents: Object.freeze([]),
    });
    await transaction.commitOpening(commit);
    return Object.freeze({ receipt, projections, insertedOperations: operations.length });
  });
}
