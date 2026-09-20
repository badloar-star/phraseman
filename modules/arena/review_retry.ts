import type { ArenaKeyValueStore } from './match_store';
import type { ArenaStudyTarget } from './target_registry';

const ARENA_SCOPED_REVIEW_SCHEMA = 'arena-review-cache.v2' as const;
const ARENA_LEGACY_SCOPED_REVIEW_SCHEMA = 'arena-review-cache.v1' as const;
const ARENA_SCOPED_REVIEW_TTL_MS = 24 * 60 * 60 * 1_000;

type ArenaScopedReviewEntry = Readonly<{
  schemaVersion: typeof ARENA_SCOPED_REVIEW_SCHEMA;
  stableUid: string;
  studyTarget: ArenaStudyTarget;
  matchId: string;
  savedAtWallMs: number;
  rows: readonly unknown[];
}>;

/**
 * Process-local account generation is a race fence only. It is deliberately
 * not serialized: the durable cache remains keyed by canonical stableUid so a
 * later generation of the same account can reuse its own review safely.
 */
export type ArenaReviewAccountScope = Readonly<{
  stableUid: string;
  accountGeneration: number;
  studyTarget: ArenaStudyTarget;
}>;

const scopedReviewMemory = new Map<string, ArenaScopedReviewEntry>();

function scopedReviewKey(stableUid: string, studyTarget: ArenaStudyTarget, matchId: string): string {
  return `${stableUid}\u0000${studyTarget}\u0000${matchId}`;
}

function scopedReviewStorageKey(stableUid: string, studyTarget: ArenaStudyTarget, matchId: string): string {
  return `arena.review.v2.${encodeURIComponent(stableUid)}.${studyTarget}.${encodeURIComponent(matchId)}`;
}

function legacyScopedReviewStorageKey(stableUid: string, matchId: string): string {
  return `arena.review.v1.${encodeURIComponent(stableUid)}.${encodeURIComponent(matchId)}`;
}

function scopedReviewUsable(
  value: unknown,
  stableUid: string,
  studyTarget: ArenaStudyTarget,
  matchId: string,
  wallNowMs: number,
): ArenaScopedReviewEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Partial<ArenaScopedReviewEntry>;
  if (row.schemaVersion !== ARENA_SCOPED_REVIEW_SCHEMA
    || row.stableUid !== stableUid
    || row.studyTarget !== studyTarget
    || row.matchId !== matchId
    || !Array.isArray(row.rows)
    || !Number.isFinite(row.savedAtWallMs)) return null;
  const savedAtWallMs = Math.trunc(Number(row.savedAtWallMs));
  if (savedAtWallMs > wallNowMs + 60_000 || wallNowMs - savedAtWallMs > ARENA_SCOPED_REVIEW_TTL_MS) return null;
  return { schemaVersion: ARENA_SCOPED_REVIEW_SCHEMA, stableUid, studyTarget, matchId, savedAtWallMs, rows: row.rows };
}

export function arenaRememberScopedReview(input: Readonly<{
  scope: ArenaReviewAccountScope;
  matchId: string;
  rows: readonly unknown[];
  wallNowMs: number;
  store?: ArenaKeyValueStore;
}>): void {
  const entry: ArenaScopedReviewEntry = {
    schemaVersion: ARENA_SCOPED_REVIEW_SCHEMA,
    stableUid: input.scope.stableUid,
    studyTarget: input.scope.studyTarget,
    matchId: input.matchId,
    savedAtWallMs: Math.trunc(input.wallNowMs),
    rows: input.rows,
  };
  scopedReviewMemory.set(scopedReviewKey(input.scope.stableUid, input.scope.studyTarget, input.matchId), entry);
  if (input.store) {
    void input.store.setItem(
      scopedReviewStorageKey(input.scope.stableUid, input.scope.studyTarget, input.matchId),
      JSON.stringify(entry),
    ).catch(() => {});
  }
}

export function arenaPeekScopedReview(
  scope: ArenaReviewAccountScope,
  matchId: string,
  wallNowMs: number,
): readonly unknown[] | null {
  const entry = scopedReviewMemory.get(scopedReviewKey(scope.stableUid, scope.studyTarget, matchId));
  return entry ? scopedReviewUsable(entry, scope.stableUid, scope.studyTarget, matchId, wallNowMs)?.rows ?? null : null;
}

export async function arenaLoadScopedReview(
  store: ArenaKeyValueStore,
  scope: ArenaReviewAccountScope,
  matchId: string,
  wallNowMs: number,
): Promise<readonly unknown[] | null> {
  const memory = arenaPeekScopedReview(scope, matchId, wallNowMs);
  if (memory) return memory;
  let raw: string | null;
  try {
    raw = await store.getItem(scopedReviewStorageKey(scope.stableUid, scope.studyTarget, matchId));
  } catch {
    return null;
  }
  if (!raw && scope.studyTarget === 'en') {
    try {
      const legacyKey = legacyScopedReviewStorageKey(scope.stableUid, matchId);
      const legacyRaw = await store.getItem(legacyKey);
      const legacy = legacyRaw ? JSON.parse(legacyRaw) as Record<string, unknown> : null;
      if (legacy?.schemaVersion === ARENA_LEGACY_SCOPED_REVIEW_SCHEMA) {
        const candidate = { ...legacy, schemaVersion: ARENA_SCOPED_REVIEW_SCHEMA, studyTarget: 'en' };
        const migrated = scopedReviewUsable(candidate, scope.stableUid, 'en', matchId, wallNowMs);
        if (migrated) {
          await store.setItem(scopedReviewStorageKey(scope.stableUid, 'en', matchId), JSON.stringify(migrated));
          await store.removeItem(legacyKey);
          scopedReviewMemory.set(scopedReviewKey(scope.stableUid, 'en', matchId), migrated);
          return migrated.rows;
        }
      }
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const usable = scopedReviewUsable(parsed, scope.stableUid, scope.studyTarget, matchId, wallNowMs);
  if (!usable) return null;
  scopedReviewMemory.set(scopedReviewKey(scope.stableUid, scope.studyTarget, matchId), usable);
  return usable.rows;
}

/** Accepts an async review completion only while its captured account/screen is current. */
export async function arenaAwaitScopedReview(input: Readonly<{
  scope: ArenaReviewAccountScope;
  request: () => Promise<readonly unknown[] | null>;
  isCurrent: (scope: ArenaReviewAccountScope) => boolean;
  isAlive: () => boolean;
  accept: (rows: readonly unknown[]) => void;
}>): Promise<'accepted' | 'empty' | 'stale'> {
  const rows = await input.request();
  if (!input.isAlive() || !input.isCurrent(input.scope)) return 'stale';
  if (rows === null) return 'empty';
  input.accept(rows);
  return 'accepted';
}

/** Только для тестов и account lifecycle reset. */
export function arenaResetScopedReviews(): void {
  scopedReviewMemory.clear();
}

/**
 * Закрывает короткую гонку между показом результата и записью разбора.
 * Повтор строго один: это не опрос и не новый постоянный источник чтений.
 */
export async function arenaReadReviewWithRetry<T>(
  read: () => Promise<T | null>,
  wait: () => Promise<void>,
): Promise<T | null> {
  const first = await read();
  if (first !== null) return first;
  await wait();
  return read();
}
