import type { PhoneStateScope } from './account_secret';
import { utf8ByteLength } from './canonical';
import {
  portableLegacyJournalPrefixRules,
  portableLegacyRows,
  type LegacyReducerPolicy,
} from './legacy_inventory';

export const LEGACY_MULTI_GET_CHUNK_SIZE = 50;
export const MAX_LEGACY_SNAPSHOT_BYTES = 1024 * 1024;
export const MAX_LEGACY_JOURNAL_BYTES = 512 * 1024;
export const MAX_LEGACY_JOURNAL_ENTRIES = 256;

export type LegacyJournalEnvelope = Readonly<{
  key: string;
  domain: string;
  reducer: LegacyReducerPolicy;
  raw: string;
  value: unknown;
}>;

export type LegacyPortableSnapshot = Readonly<{
  schemaVersion: 'legacy-portable-snapshot.v1';
  stableUid: string;
  accountGeneration: number;
  values: Readonly<Record<string, Readonly<{
    local: string | null;
    lastSynced: string | null;
    cloud: unknown;
  }>>>;
  journals: readonly LegacyJournalEnvelope[];
  capturedAtMs: number;
}>;

export type LegacyQuarantineEntry = Readonly<{
  key: string;
  reason: 'malformed_source_row' | 'malformed_last_synced' | 'malformed_cloud' | 'malformed_journal';
  raw: unknown;
}>;

export interface LegacyReaderSources {
  isScopeCurrent(scope: PhoneStateScope): boolean;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  readLastSynced(): Promise<Readonly<Record<string, unknown>>>;
  readCloudProgress(): Promise<Readonly<Record<string, unknown>>>;
  readJournalPrefix(
    prefix: string,
    bounds: Readonly<{ limit: number; maxBytes: number }>,
  ): Promise<readonly Readonly<{ key: string; raw: string }>[]>
  quarantine?(entry: LegacyQuarantineEntry): Promise<void>;
  now?(): number;
}

function assertCurrent(scope: PhoneStateScope, sources: LegacyReaderSources): void {
  if (!sources.isScopeCurrent(scope)) throw new Error('phone_state_generation_stale');
}

async function guardedAwait<T>(
  scope: PhoneStateScope,
  sources: LegacyReaderSources,
  promise: Promise<T>,
): Promise<T> {
  assertCurrent(scope, sources);
  const result = await promise;
  assertCurrent(scope, sources);
  return result;
}

async function quarantine(
  scope: PhoneStateScope,
  sources: LegacyReaderSources,
  entry: LegacyQuarantineEntry,
): Promise<void> {
  if (!sources.quarantine) return;
  await guardedAwait(scope, sources, sources.quarantine(entry));
}

function chunks<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function serializedBytes(value: unknown): number | null {
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? null : utf8ByteLength(serialized);
  } catch {
    return null;
  }
}

export async function readLegacyPortableSnapshot(
  scope: PhoneStateScope,
  sources: LegacyReaderSources,
): Promise<LegacyPortableSnapshot> {
  assertCurrent(scope, sources);
  const exactKeys = portableLegacyRows.map((row) => row.key);
  const requestedKeys = new Set(exactKeys);
  const localValues = new Map<string, string | null>();
  let totalBytes = 0;

  for (const keyChunk of chunks(exactKeys, LEGACY_MULTI_GET_CHUNK_SIZE)) {
    const rows = await guardedAwait(scope, sources, sources.multiGet(keyChunk));
    for (const row of rows) {
      if (
        !Array.isArray(row)
        || row.length !== 2
        || typeof row[0] !== 'string'
        || !requestedKeys.has(row[0])
        || (row[1] !== null && typeof row[1] !== 'string')
      ) {
        await quarantine(scope, sources, { key: String(row?.[0] ?? 'unknown'), reason: 'malformed_source_row', raw: row });
        continue;
      }
      localValues.set(row[0], row[1]);
    }
  }

  const lastSynced = await guardedAwait(scope, sources, sources.readLastSynced());
  const cloudProgress = await guardedAwait(scope, sources, sources.readCloudProgress());
  const values: Record<string, Readonly<{ local: string | null; lastSynced: string | null; cloud: unknown }>> = {};
  for (const key of exactKeys) {
    const local = localValues.get(key) ?? null;
    const lastCandidate = lastSynced[key];
    const hasLast = Object.prototype.hasOwnProperty.call(lastSynced, key);
    if (hasLast && lastCandidate !== null && typeof lastCandidate !== 'string') {
      await quarantine(scope, sources, { key, reason: 'malformed_last_synced', raw: lastCandidate });
      continue;
    }
    const hasCloud = Object.prototype.hasOwnProperty.call(cloudProgress, key);
    const cloud = hasCloud ? cloudProgress[key] : null;
    const cloudBytes = serializedBytes(cloud);
    if (cloudBytes === null) {
      await quarantine(scope, sources, { key, reason: 'malformed_cloud', raw: cloud });
      continue;
    }
    if (local === null && !hasLast && !hasCloud) continue;
    const lastSyncedValue = hasLast ? lastCandidate as string | null : null;
    totalBytes += utf8ByteLength(key)
      + (local === null ? 0 : utf8ByteLength(local))
      + (lastSyncedValue === null ? 0 : utf8ByteLength(lastSyncedValue))
      + cloudBytes;
    if (totalBytes > MAX_LEGACY_SNAPSHOT_BYTES) {
      throw new Error('phone_state_legacy_snapshot_oversized');
    }
    values[key] = Object.freeze({ local, lastSynced: lastSyncedValue, cloud });
  }

  const journals: LegacyJournalEnvelope[] = [];
  let journalBytes = 0;
  for (const rule of portableLegacyJournalPrefixRules) {
    const remaining = MAX_LEGACY_JOURNAL_ENTRIES - journals.length;
    if (remaining <= 0) throw new Error('phone_state_legacy_journal_oversized');
    const entries = await guardedAwait(scope, sources, sources.readJournalPrefix(rule.prefix, {
      limit: remaining,
      maxBytes: MAX_LEGACY_JOURNAL_BYTES - journalBytes,
    }));
    if (entries.length > remaining) throw new Error('phone_state_legacy_journal_oversized');
    for (const entry of entries) {
      if (
        typeof entry?.key !== 'string'
        || !entry.key.startsWith(rule.prefix)
        || typeof entry.raw !== 'string'
      ) {
        await quarantine(scope, sources, { key: String(entry?.key ?? rule.prefix), reason: 'malformed_journal', raw: entry });
        continue;
      }
      const entryBytes = utf8ByteLength(entry.key) + utf8ByteLength(entry.raw);
      journalBytes += entryBytes;
      totalBytes += entryBytes;
      if (
        journalBytes > MAX_LEGACY_JOURNAL_BYTES
        || totalBytes > MAX_LEGACY_SNAPSHOT_BYTES
      ) {
        throw new Error('phone_state_legacy_journal_oversized');
      }
      try {
        const value: unknown = JSON.parse(entry.raw);
        journals.push(Object.freeze({
          key: entry.key,
          domain: rule.domain,
          reducer: rule.reducer,
          raw: entry.raw,
          value,
        }));
      } catch {
        await quarantine(scope, sources, { key: entry.key, reason: 'malformed_journal', raw: entry.raw });
      }
    }
  }

  const capturedAtMs = sources.now?.() ?? Date.now();
  if (!Number.isSafeInteger(capturedAtMs) || capturedAtMs < 0) {
    throw new Error('phone_state_legacy_capture_time_invalid');
  }
  assertCurrent(scope, sources);
  return Object.freeze({
    schemaVersion: 'legacy-portable-snapshot.v1',
    stableUid: scope.stableUid,
    accountGeneration: scope.accountGeneration,
    values: Object.freeze(values),
    journals: Object.freeze(journals),
    capturedAtMs,
  });
}
