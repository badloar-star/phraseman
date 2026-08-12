import type { ProgressSnapshot } from "./progress_types";
import { assertProgressSnapshot } from "./progress_reducer";
import { canonicalJsonV1 } from "../policies/decision_registry";
import { peekProgress, peekProgressRecord, primeProgressPeek, clearProgressPeek } from "./progress_peek_cache";
import { withProgressStorageLock } from "./progress_storage_lock";

export interface ProgressStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
  /** Required by append-only local spools that recover entries after restart. */
  getAllKeys?(): Promise<readonly string[]>;
  /** Null retains the surrounding account-transition lease until native I/O settles. */
  readonly operationTimeoutMs?: number | null;
}

export interface ProgressAccountScope {
  readonly stableId: string | null;
  readonly generation: number;
  readonly accountScopeHash: string;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
}
export type ProgressGenerationGuard = (scope: ProgressAccountScope) => boolean;

export const PROGRESS_STORAGE_SCHEMA = "v2-progress-storage.v2" as const;
const LEGACY_PROGRESS_STORAGE_SCHEMA = "v2-progress-storage.v1" as const;
export const PROGRESS_STORAGE_MAX_BYTES = 512 * 1024;
export const progressAccountKey = (scope: ProgressAccountScope): string => {
  const scopeHash = scope.accountScopeHash.trim();
  if (!/^[a-f0-9]{16,128}$/.test(scopeHash)) throw new Error("progress_scope_hash_invalid");
  if (!Number.isSafeInteger(scope.generation) || scope.generation < 0) throw new Error("progress_generation_invalid");
  if (![scope.seasonId, scope.studyTarget, scope.learnerSourceLocale].every((value) => /^[A-Za-z0-9._-]{1,128}$/.test(value))) throw new Error("progress_scope_dimensions_invalid");
  return `v2:progress:v1:${scopeHash}:${scope.seasonId}:${scope.studyTarget}:${scope.learnerSourceLocale}:g${scope.generation}`;
};
export const progressStorageKey = (scope: ProgressAccountScope): string => `learning_v2_progress:${progressAccountKey(scope)}`;

type Stored = { readonly schemaVersion: typeof PROGRESS_STORAGE_SCHEMA; readonly accountKey: string; readonly revision: number; readonly snapshot: ProgressSnapshot };
export interface ProgressStoredSnapshot {
  readonly snapshot: ProgressSnapshot;
  readonly revision: number;
}
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const validSnapshot = (value: unknown): value is ProgressSnapshot => {
  if (!isRecord(value) || value.schemaVersion !== "v2-progress.v1") return false;
  try { assertProgressSnapshot(value as unknown as ProgressSnapshot); return true; } catch { return false; }
};
const utf8ByteLength = (value: string): number => {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

const parseStored = (
  raw: string,
  scope: ProgressAccountScope,
  accountKey: string,
): ProgressStoredSnapshot => {
  if (utf8ByteLength(raw) > PROGRESS_STORAGE_MAX_BYTES) throw new Error("progress_snapshot_corrupt");
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; } catch { throw new Error("progress_snapshot_corrupt"); }
  if (
    !isRecord(parsed) ||
    (parsed.schemaVersion !== PROGRESS_STORAGE_SCHEMA && parsed.schemaVersion !== LEGACY_PROGRESS_STORAGE_SCHEMA) ||
    parsed.accountKey !== accountKey ||
    !validSnapshot(parsed.snapshot) ||
    parsed.snapshot.accountScopeHash !== scope.accountScopeHash ||
    parsed.snapshot.seasonId !== scope.seasonId ||
    parsed.snapshot.studyTarget !== scope.studyTarget ||
    parsed.snapshot.learnerSourceLocale !== scope.learnerSourceLocale
  ) throw new Error("progress_snapshot_corrupt");
  const revision = parsed.schemaVersion === LEGACY_PROGRESS_STORAGE_SCHEMA ? 0 : parsed.revision;
  if (!Number.isSafeInteger(revision) || Number(revision) < 0) throw new Error("progress_snapshot_corrupt");
  return Object.freeze({ snapshot: deepFreeze(parsed.snapshot), revision: Number(revision) });
};

export const createProgressStore = (storage: ProgressStorage, isCurrentGeneration: ProgressGenerationGuard): {
  load(scope: ProgressAccountScope): Promise<ProgressSnapshot | undefined>;
  loadRecord(scope: ProgressAccountScope): Promise<ProgressStoredSnapshot | undefined>;
  save(scope: ProgressAccountScope, snapshot: ProgressSnapshot, expectedRevision: number | null): Promise<number>;
  clear(scope: ProgressAccountScope): Promise<void>;
  peek(scope: ProgressAccountScope): ProgressSnapshot | undefined;
  peekRecord(scope: ProgressAccountScope): ProgressStoredSnapshot | undefined;
} => {
  const loadRecord = async (scope: ProgressAccountScope): Promise<ProgressStoredSnapshot | undefined> => {
    if (!isCurrentGeneration(scope)) return undefined;
    const key = progressAccountKey(scope);
    const storageKey = progressStorageKey(scope);
    return withProgressStorageLock(`snapshot:${storageKey}`, async () => {
      const raw = await storage.getItem(storageKey);
      if (!isCurrentGeneration(scope)) return undefined;
      if (!raw) return undefined;
      try {
        const record = parseStored(raw, scope, key);
        if (!isCurrentGeneration(scope)) return undefined;
        primeProgressPeek(key, record.snapshot, record.revision);
        return record;
      } catch { return undefined; }
    }, storage.operationTimeoutMs);
  };
  return {
    async load(scope) {
      return (await loadRecord(scope))?.snapshot;
    },
    loadRecord,
    async save(scope, snapshot, expectedRevision) {
      if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
      if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)) throw new Error("progress_snapshot_revision_invalid");
      let detachedInput: ProgressSnapshot;
      try { detachedInput = deepFreeze(JSON.parse(canonicalJsonV1(snapshot)) as ProgressSnapshot); } catch { throw new Error("progress_snapshot_invalid"); }
      if (!validSnapshot(detachedInput) || detachedInput.accountScopeHash !== scope.accountScopeHash || detachedInput.seasonId !== scope.seasonId || detachedInput.studyTarget !== scope.studyTarget || detachedInput.learnerSourceLocale !== scope.learnerSourceLocale) throw new Error("progress_snapshot_scope_mismatch");
      const key = progressAccountKey(scope);
      const storageKey = progressStorageKey(scope);
      return withProgressStorageLock(`snapshot:${storageKey}`, async () => {
        if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
        const raw = await storage.getItem(storageKey);
        if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
        const currentRevision = raw === null ? null : parseStored(raw, scope, key).revision;
        if (currentRevision !== expectedRevision) throw new Error("progress_snapshot_revision_conflict");
        const revision = (currentRevision ?? 0) + 1;
        const encoded = JSON.stringify({ schemaVersion: PROGRESS_STORAGE_SCHEMA, accountKey: key, revision, snapshot: detachedInput } satisfies Stored);
        if (utf8ByteLength(encoded) > PROGRESS_STORAGE_MAX_BYTES) throw new Error("progress_snapshot_overflow");
        const detached = deepFreeze((JSON.parse(encoded) as Stored).snapshot);
        await storage.setItem(storageKey, encoded);
        if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
        primeProgressPeek(key, detached, revision);
        return revision;
      }, storage.operationTimeoutMs);
    },
    async clear(scope) {
      if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
      if (!storage.removeItem) throw new Error("progress_storage_remove_unsupported");
      const storageKey = progressStorageKey(scope);
      await withProgressStorageLock(`snapshot:${storageKey}`, async () => {
        if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
        await storage.removeItem!(storageKey);
        if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
        clearProgressPeek(progressAccountKey(scope));
      }, storage.operationTimeoutMs);
    },
    peek: (scope) => isCurrentGeneration(scope) ? peekProgress(progressAccountKey(scope)) : undefined,
    peekRecord: (scope) => isCurrentGeneration(scope) ? peekProgressRecord(progressAccountKey(scope)) : undefined,
  };
};
