import type { ArenaKeyValueStore } from './match_store';

const ARENA_SCOPED_REVIEW_SCHEMA = 'arena-review-cache.v1' as const;
const ARENA_SCOPED_REVIEW_TTL_MS = 24 * 60 * 60 * 1_000;

type ArenaScopedReviewEntry = Readonly<{
  schemaVersion: typeof ARENA_SCOPED_REVIEW_SCHEMA;
  stableUid: string;
  matchId: string;
  savedAtWallMs: number;
  rows: readonly unknown[];
}>;

const scopedReviewMemory = new Map<string, ArenaScopedReviewEntry>();

function scopedReviewKey(stableUid: string, matchId: string): string {
  return `${stableUid}\u0000${matchId}`;
}

function scopedReviewStorageKey(stableUid: string, matchId: string): string {
  return `arena.review.v1.${encodeURIComponent(stableUid)}.${encodeURIComponent(matchId)}`;
}

function scopedReviewUsable(
  value: unknown,
  stableUid: string,
  matchId: string,
  wallNowMs: number,
): ArenaScopedReviewEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Partial<ArenaScopedReviewEntry>;
  if (row.schemaVersion !== ARENA_SCOPED_REVIEW_SCHEMA
    || row.stableUid !== stableUid
    || row.matchId !== matchId
    || !Array.isArray(row.rows)
    || !Number.isFinite(row.savedAtWallMs)) return null;
  const savedAtWallMs = Math.trunc(Number(row.savedAtWallMs));
  if (savedAtWallMs > wallNowMs + 60_000 || wallNowMs - savedAtWallMs > ARENA_SCOPED_REVIEW_TTL_MS) return null;
  return { schemaVersion: ARENA_SCOPED_REVIEW_SCHEMA, stableUid, matchId, savedAtWallMs, rows: row.rows };
}

export function arenaRememberScopedReview(input: Readonly<{
  stableUid: string;
  matchId: string;
  rows: readonly unknown[];
  wallNowMs: number;
  store?: ArenaKeyValueStore;
}>): void {
  const entry: ArenaScopedReviewEntry = {
    schemaVersion: ARENA_SCOPED_REVIEW_SCHEMA,
    stableUid: input.stableUid,
    matchId: input.matchId,
    savedAtWallMs: Math.trunc(input.wallNowMs),
    rows: input.rows,
  };
  scopedReviewMemory.set(scopedReviewKey(input.stableUid, input.matchId), entry);
  if (input.store) {
    void input.store.setItem(
      scopedReviewStorageKey(input.stableUid, input.matchId),
      JSON.stringify(entry),
    ).catch(() => {});
  }
}

export function arenaPeekScopedReview(
  stableUid: string,
  matchId: string,
  wallNowMs: number,
): readonly unknown[] | null {
  const entry = scopedReviewMemory.get(scopedReviewKey(stableUid, matchId));
  return entry ? scopedReviewUsable(entry, stableUid, matchId, wallNowMs)?.rows ?? null : null;
}

export async function arenaLoadScopedReview(
  store: ArenaKeyValueStore,
  stableUid: string,
  matchId: string,
  wallNowMs: number,
): Promise<readonly unknown[] | null> {
  const memory = arenaPeekScopedReview(stableUid, matchId, wallNowMs);
  if (memory) return memory;
  let raw: string | null;
  try {
    raw = await store.getItem(scopedReviewStorageKey(stableUid, matchId));
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const usable = scopedReviewUsable(parsed, stableUid, matchId, wallNowMs);
  if (!usable) return null;
  scopedReviewMemory.set(scopedReviewKey(stableUid, matchId), usable);
  return usable.rows;
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
