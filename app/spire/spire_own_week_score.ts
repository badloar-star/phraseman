import { useSyncExternalStore } from 'react';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from '../account_generation';
import { starsWeekBuckets } from '../stars_view';

export const STARS_WEEK_SNAPSHOT_SCHEMA_VERSION = 'stars-week-snapshot.v1' as const;
export const OWN_AUTHORITATIVE_WEEK_SCORE_SCHEMA_VERSION = 'own-authoritative-week-score.v1' as const;

export type StarsWeekSnapshotV1 = Readonly<{
  schemaVersion: typeof STARS_WEEK_SNAPSHOT_SCHEMA_VERSION;
  seq: number;
  current: Readonly<{ weekKey: string; earned: number }>;
  previous: Readonly<{ weekKey: string; earned: number }> | null;
}>;

export type OwnAuthoritativeWeekScoreStateV1 = Readonly<{
  schemaVersion: typeof OWN_AUTHORITATIVE_WEEK_SCORE_SCHEMA_VERSION;
  ownerStableId: string;
  accountGeneration: number;
  sourceSeq: number;
  current: Readonly<{ weekKey: string; earned: number }>;
  previous: Readonly<{ weekKey: string; earned: number }> | null;
}>;

export type OwnWeekScoreApplyOutcome = 'applied' | 'idempotent' | 'older' | 'conflict' | 'invalid' | 'stale';

let current: OwnAuthoritativeWeekScoreStateV1 | null = null;
let version = 0;
const listeners = new Set<() => void>();
let generationSubscription: { remove: () => void } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWeekKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-W\d{2}$/.test(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseBucket(value: unknown): Readonly<{ weekKey: string; earned: number }> | null {
  if (!isRecord(value) || !isWeekKey(value.weekKey) || !isNonNegativeSafeInteger(value.earned)) return null;
  return Object.freeze({ weekKey: value.weekKey, earned: value.earned });
}

export function parseStarsWeekSnapshotV1(value: unknown): StarsWeekSnapshotV1 | null {
  if (
    !isRecord(value)
    || value.schemaVersion !== STARS_WEEK_SNAPSHOT_SCHEMA_VERSION
    || !isNonNegativeSafeInteger(value.seq)
  ) return null;
  const currentBucket = parseBucket(value.current);
  if (!currentBucket) return null;
  let previous: StarsWeekSnapshotV1['previous'] = null;
  if (value.previous !== null) {
    previous = parseBucket(value.previous);
    if (!previous || previous.weekKey === currentBucket.weekKey) return null;
  }
  return Object.freeze({
    schemaVersion: STARS_WEEK_SNAPSHOT_SCHEMA_VERSION,
    seq: value.seq,
    current: currentBucket,
    previous,
  });
}

export function parseRawStarsWeekSnapshotV1(value: unknown): StarsWeekSnapshotV1 | null {
  if (!isRecord(value) || !isNonNegativeSafeInteger(value.seq)) return null;
  // зачем: недельный счётчик читается только вместе со своим ключом недели — через проекцию (правило линта D-11).
  const buckets = starsWeekBuckets(value);
  if (!buckets) return null;
  return Object.freeze({
    schemaVersion: STARS_WEEK_SNAPSHOT_SCHEMA_VERSION,
    seq: value.seq,
    current: buckets.current,
    previous: buckets.previous,
  });
}

function sameBuckets(
  left: Pick<OwnAuthoritativeWeekScoreStateV1, 'current' | 'previous'>,
  right: StarsWeekSnapshotV1,
): boolean {
  return left.current.weekKey === right.current.weekKey
    && left.current.earned === right.current.earned
    && left.previous?.weekKey === right.previous?.weekKey
    && left.previous?.earned === right.previous?.earned;
}

function publish(next: OwnAuthoritativeWeekScoreStateV1 | null): void {
  if (next === current) return;
  current = next;
  version += 1;
  for (const listener of listeners) listener();
}

function installGenerationSubscription(): void {
  generationSubscription?.remove();
  generationSubscription = subscribeAccountGeneration((token) => {
    if (
      current
      && (token.phase !== 'active'
        || token.stableId !== current.ownerStableId
        || token.generation !== current.accountGeneration)
    ) publish(null);
  });
}

installGenerationSubscription();

function applySnapshot(
  token: AccountGenerationToken,
  snapshot: StarsWeekSnapshotV1 | null,
): OwnWeekScoreApplyOutcome {
  const ownerStableId = token.stableId?.trim() || null;
  if (!ownerStableId || !isCurrentAccountGeneration(token, ownerStableId)) return 'stale';
  if (!snapshot) return 'invalid';
  if (
    current
    && (current.ownerStableId !== ownerStableId || current.accountGeneration !== token.generation)
  ) {
    // зачем (сторож «[SPIRE] везде», spire_game_source_contract; координатор 12.11): редкая ветка — счёт прошлого владельца снят; видно в журнале
    console.log('[SPIRE]', JSON.stringify({ weekScore: 'reset_owner_changed', sameOwner: current.ownerStableId === ownerStableId })); // guard-ok: ветка смены владельца, без id
    publish(null);
  }
  if (current) {
    if (snapshot.seq < current.sourceSeq) return 'older';
    if (snapshot.seq === current.sourceSeq) {
      if (sameBuckets(current, snapshot)) return 'idempotent';
      console.warn('[SPIRE-WEEK-SCORE] week_snapshot_same_seq_conflict');
      return 'conflict';
    }
  }
  if (!isCurrentAccountGeneration(token, ownerStableId)) return 'stale';
  publish(Object.freeze({
    schemaVersion: OWN_AUTHORITATIVE_WEEK_SCORE_SCHEMA_VERSION,
    ownerStableId,
    accountGeneration: token.generation,
    sourceSeq: snapshot.seq,
    current: snapshot.current,
    previous: snapshot.previous,
  }));
  return 'applied';
}

export function applyOwnWeekScoreWireSnapshot(
  token: AccountGenerationToken,
  value: unknown,
): OwnWeekScoreApplyOutcome {
  return applySnapshot(token, parseStarsWeekSnapshotV1(value));
}

export function applyOwnWeekScoreRawStars(
  token: AccountGenerationToken,
  value: unknown,
): OwnWeekScoreApplyOutcome {
  return applySnapshot(token, parseRawStarsWeekSnapshotV1(value));
}

/**
 * Недельный снимок из ответа сервера на начисление монет вне Пика (урок, практика, награды).
 * зачем (U33): счёт Пика — монеты всех режимов, а раньше снимок приходил только с отчётом об этаже.
 * Никогда не бросает: кошелёк вызывающего не должен зависеть от недельной проекции. Нет поля (старый сервер) — тихий no-op.
 */
export function applyOwnWeekScoreFromAck(
  token: AccountGenerationToken,
  value: unknown,
  source: string,
): OwnWeekScoreApplyOutcome | 'absent' | 'failed' {
  if (value === undefined || value === null) return 'absent';
  try {
    const outcome = applySnapshot(token, parseStarsWeekSnapshotV1(value));
    // зачем («сперва логи»): отброшенный снимок — причина, по которой счёт на экране не сдвинулся; успех не шумит.
    if (outcome !== 'applied' && outcome !== 'idempotent') console.warn(`[SPIRE-WEEK-SCORE] ${source} outcome=${outcome}`); // guard-ok: причина отказа
    return outcome;
  } catch (error: unknown) {
    console.warn(`[SPIRE-WEEK-SCORE] ${source} apply_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: weekly branch fail-soft
    return 'failed';
  }
}

export function peekOwnAuthoritativeWeekScore(): OwnAuthoritativeWeekScoreStateV1 | null {
  if (!current) return null;
  const token = captureAccountGeneration();
  return isCurrentAccountGeneration(token, current.ownerStableId)
    && token.generation === current.accountGeneration
    ? current
    : null;
}

export function selectOwnAuthoritativeWeekCoins(
  token: AccountGenerationToken,
  exactWeekKey: string,
): number | undefined {
  const ownerStableId = token.stableId?.trim() || null;
  if (
    !ownerStableId
    || !isCurrentAccountGeneration(token, ownerStableId)
    || !current
    || current.ownerStableId !== ownerStableId
    || current.accountGeneration !== token.generation
  ) return undefined;
  if (current.current.weekKey === exactWeekKey) return current.current.earned;
  if (current.previous?.weekKey === exactWeekKey) return current.previous.earned;
  return undefined;
}

export function subscribeOwnAuthoritativeWeekScore(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getOwnAuthoritativeWeekScoreVersion(): number {
  return version;
}

export function useOwnAuthoritativeWeekCoins(
  ownerStableId: string | null | undefined,
  exactWeekKey: string | null | undefined,
): number | undefined {
  useSyncExternalStore(
    subscribeOwnAuthoritativeWeekScore,
    getOwnAuthoritativeWeekScoreVersion,
    getOwnAuthoritativeWeekScoreVersion,
  );
  if (!ownerStableId || !exactWeekKey) return undefined;
  const token = captureAccountGeneration();
  if (token.stableId !== ownerStableId.trim()) return undefined;
  return selectOwnAuthoritativeWeekCoins(token, exactWeekKey);
}

export function __resetOwnAuthoritativeWeekScoreForTests(): void {
  current = null;
  version = 0;
  listeners.clear();
  installGenerationSubscription();
}

