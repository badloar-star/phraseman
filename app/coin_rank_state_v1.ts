// ═══ Текущий ранг монеты человека (PM-076, PM-075) ═══════════════════════════
// зачем (владелец 2026-09-24, D03/D60/D61/D62): одна картинка = и валюта, и аватар.
// Ранг монеты — новое поле аккаунта; до этой задачи его не было нигде, поэтому у всех
// по умолчанию ранг 0 (первая медная монета, бесплатный старт).
//
// Где живёт: AsyncStorage, ключ `coin_rank_v1:<owner>` — рядом с рунным кошельком и
// под его account-local префиксом в cloud_sync (путешествует в резервной копии вместе
// с кошельком и стирается вместе с аккаунтом). Пишет ранг ТОЛЬКО повышение
// (app/coin_rank_upgrade_v1.ts) — одним multiSet вместе с тратой монет, поэтому
// «монеты сняли, а ранг не поднялся» невозможно по построению.
//
// Кэш в памяти + подписчики — чтобы аватар обновился в тот же кадр, что и списание
// (optimistic: сети в повышении нет вовсе, телефон авторитетен, как у всех рунных трат).
import { readStoredItem } from './storage_snapshot';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COIN_RANK_MIN, isValidCoinRank } from './coin_rank_table_v1';
import { DebugLogger } from './debug-logger';

const LOG = '[COIN-RANK]';

export const COIN_RANK_STATE_PREFIX = 'coin_rank_v1:';

export type CoinRankUpgradeEntry = Readonly<{
  toRank: number;
  operationId: string;
  price: number;
  atMs: number;
}>;

export type CoinRankStateV1 = Readonly<{
  schemaVersion: 'coin-rank-state.v1';
  ownerStableId: string;
  rank: number;
  /** Журнал повышений: по одной строке на ранг, для разбора жалоб «списало, а ранга нет». */
  upgrades: readonly CoinRankUpgradeEntry[];
}>;

export function coinRankStateKey(ownerStableId: string): string {
  const owner = ownerStableId.trim();
  if (!owner) throw new Error('coin_rank_owner_invalid');
  return `${COIN_RANK_STATE_PREFIX}${encodeURIComponent(owner)}`;
}

export function emptyCoinRankState(ownerStableId: string): CoinRankStateV1 {
  return Object.freeze({
    schemaVersion: 'coin-rank-state.v1' as const,
    ownerStableId,
    rank: COIN_RANK_MIN,
    upgrades: Object.freeze([]) as readonly CoinRankUpgradeEntry[],
  });
}

function isEntry(value: unknown): value is CoinRankUpgradeEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as CoinRankUpgradeEntry;
  return isValidCoinRank(v.toRank)
    && typeof v.operationId === 'string' && v.operationId.length > 0
    && Number.isSafeInteger(v.price) && v.price > 0
    && Number.isSafeInteger(v.atMs) && v.atMs >= 0;
}

/**
 * Разбор записи. Пустая запись = ранг 0 (честный дефолт). Битая или чужая запись —
 * ИСКЛЮЧЕНИЕ, а не тихий ноль: молча показать ранг 0 человеку, заплатившему за ранг 7,
 * хуже, чем явно отказать в повышении и оставить след в логах.
 */
export function parseCoinRankState(raw: string | null, ownerStableId: string): CoinRankStateV1 {
  if (raw === null) return emptyCoinRankState(ownerStableId);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    DebugLogger.warn(LOG, `parse: не JSON ${JSON.stringify({ owner: ownerStableId, error: String(error) })}`);
    throw new Error('coin_rank_state_corrupt');
  }
  const v = parsed as Partial<CoinRankStateV1>;
  if (!v || typeof v !== 'object'
    || v.schemaVersion !== 'coin-rank-state.v1'
    || v.ownerStableId !== ownerStableId
    || !isValidCoinRank(v.rank)
    || !Array.isArray(v.upgrades)
    || !v.upgrades.every(isEntry)) {
    DebugLogger.warn(LOG, `parse: запись не прошла проверку ${JSON.stringify({ owner: ownerStableId, rank: v?.rank, schema: v?.schemaVersion })}`);
    throw new Error('coin_rank_state_corrupt');
  }
  return v as CoinRankStateV1;
}

// ── Кэш в памяти и подписчики (для мгновенного показа аватара) ──
const cache = new Map<string, number>();
const listeners = new Set<(ownerStableId: string, rank: number) => void>();

/** Ранг из памяти или null, если в этом запуске ещё не читали. Синхронно — для первого кадра. */
export function peekCoinRank(ownerStableId: string | null | undefined): number | null {
  const owner = ownerStableId?.trim();
  if (!owner) return null;
  return cache.get(owner) ?? null;
}

/** Кладёт ранг в память и будит подписчиков. Вызывать ТОЛЬКО после записи на диск. */
export function publishCoinRank(ownerStableId: string, rank: number): void {
  if (!isValidCoinRank(rank)) {
    DebugLogger.warn(LOG, `publish: отказ, невалидный ранг ${JSON.stringify({ owner: ownerStableId, rank })}`);
    return;
  }
  cache.set(ownerStableId, rank); // guard-ok: Map в памяти процесса, не Firestore
  listeners.forEach((listener) => {
    try {
      listener(ownerStableId, rank);
    } catch (error) {
      DebugLogger.warn(LOG, `publish: подписчик бросил исключение ${JSON.stringify({ error: String(error) })}`);
    }
  });
}

export function subscribeCoinRank(listener: (ownerStableId: string, rank: number) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * Прочитать ранг с диска (для показа). Битая запись → null + лог: показ откатится
 * на прежний аватар, а не выдумает ранг 0.
 */
// зачем (§122, PM-220): ранг читается на старте несколькими потребителями (5 раз за запуск) — через снапшот: хранилище один раз.
export async function readCoinRank(ownerStableId: string): Promise<number | null> {
  try {
    const state = parseCoinRankState(await readStoredItem(coinRankStateKey(ownerStableId)), ownerStableId);
    cache.set(ownerStableId, state.rank); // guard-ok: Map в памяти процесса, не Firestore
    return state.rank;
  } catch (error) {
    DebugLogger.warn(LOG, `read: не удалось прочитать ранг, показ без монеты ${JSON.stringify({ owner: ownerStableId, error: String(error) })}`);
    return null;
  }
}

export function __resetCoinRankCacheForTests(): void {
  cache.clear();
  listeners.clear();
}
