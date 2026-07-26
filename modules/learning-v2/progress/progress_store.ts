import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProgressSnapshot } from "./progress_types";
import { assertProgressSnapshot } from "./progress_reducer";
import { peekProgress, primeProgressPeek, clearProgressPeek } from "./progress_peek_cache";

export interface ProgressStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
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

export const PROGRESS_STORAGE_SCHEMA = "v2-progress-storage.v1" as const;
export const PROGRESS_STORAGE_MAX_BYTES = 512 * 1024;
export const progressAccountKey = (scope: ProgressAccountScope): string => {
  const scopeHash = scope.accountScopeHash.trim();
  if (!/^[a-f0-9]{16,128}$/.test(scopeHash)) throw new Error("progress_scope_hash_invalid");
  if (!Number.isSafeInteger(scope.generation) || scope.generation < 0) throw new Error("progress_generation_invalid");
  if (!scope.seasonId.trim() || !scope.studyTarget.trim() || !scope.learnerSourceLocale.trim()) throw new Error("progress_scope_dimensions_invalid");
  return `v2:progress:v1:${scopeHash}:${scope.seasonId}:${scope.studyTarget}:${scope.learnerSourceLocale}:g${scope.generation}`;
};
export const progressStorageKey = (scope: ProgressAccountScope): string => `learning_v2_progress:${progressAccountKey(scope)}`;

type Stored = { readonly schemaVersion: typeof PROGRESS_STORAGE_SCHEMA; readonly accountKey: string; readonly snapshot: ProgressSnapshot };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const validSnapshot = (value: unknown): value is ProgressSnapshot => {
  if (!isRecord(value) || value.schemaVersion !== "v2-progress.v1") return false;
  try { assertProgressSnapshot(value as unknown as ProgressSnapshot); return true; } catch { return false; }
};

export const createProgressStore = (storage: ProgressStorage, isCurrentGeneration: ProgressGenerationGuard): {
  load(scope: ProgressAccountScope): Promise<ProgressSnapshot | undefined>;
  save(scope: ProgressAccountScope, snapshot: ProgressSnapshot): Promise<void>;
  clear(scope: ProgressAccountScope): Promise<void>;
  peek(scope: ProgressAccountScope): ProgressSnapshot | undefined;
} => ({
  async load(scope) {
    if (!isCurrentGeneration(scope)) return undefined;
    const key = progressAccountKey(scope);
    const raw = await storage.getItem(progressStorageKey(scope));
    if (!raw || raw.length > PROGRESS_STORAGE_MAX_BYTES) return undefined;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.schemaVersion !== PROGRESS_STORAGE_SCHEMA || parsed.accountKey !== key || !validSnapshot(parsed.snapshot) || parsed.snapshot.accountScopeHash !== scope.accountScopeHash || parsed.snapshot.seasonId !== scope.seasonId || parsed.snapshot.studyTarget !== scope.studyTarget || parsed.snapshot.learnerSourceLocale !== scope.learnerSourceLocale) return undefined;
      primeProgressPeek(key, parsed.snapshot);
      return parsed.snapshot;
    } catch { return undefined; }
  },
  async save(scope, snapshot) {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
    if (!validSnapshot(snapshot) || snapshot.accountScopeHash !== scope.accountScopeHash) throw new Error("progress_snapshot_scope_mismatch");
    const key = progressAccountKey(scope);
    const encoded = JSON.stringify({ schemaVersion: PROGRESS_STORAGE_SCHEMA, accountKey: key, snapshot } satisfies Stored);
    if (encoded.length > PROGRESS_STORAGE_MAX_BYTES) throw new Error("progress_snapshot_overflow");
    await storage.setItem(progressStorageKey(scope), encoded);
    primeProgressPeek(key, snapshot);
  },
  async clear(scope) {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
    if (storage.removeItem) await storage.removeItem(progressStorageKey(scope));
    clearProgressPeek(progressAccountKey(scope));
  },
  peek: (scope) => isCurrentGeneration(scope) ? peekProgress(progressAccountKey(scope)) : undefined,
});
