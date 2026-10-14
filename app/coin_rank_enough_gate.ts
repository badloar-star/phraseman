// ═══════════════════════════════════════════════════════════════════════════
// coin_rank_enough_gate.ts — m14A «Хватает на ранг N»: когда показать окно (логика; вид — components/coin_rank_moments).
//
// зачем (координатор 14.10): когда монет ВПЕРВЫЕ хватает на следующий ранг монеты, окно предлагает перейти к покупке ранга
// (оно само ничего не даёт). Ровно 1 раз на ранг: баланс упал и снова вырос — на тот же ранг окна нет. Под флагом moments_v3.
// Firebase: 0 чтений — баланс (проекция рун) и ранг (coin_rank_state) уже на телефоне. Лог [RANK-ENOUGH].
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isMomentsV3Enabled } from '../components/spire/moments/moments_flag';
import { nextCoinRankRow } from './coin_rank_table_v1';
import { DebugLogger } from './debug-logger';
import { readRemoteConfigCacheRaw } from './remote_config_client';

const LOG = '[RANK-ENOUGH]';
const OFFERED_PREFIX = 'coin_rank_enough_offered_v1';
const DEV_ENV_ON = process.env.EXPO_PUBLIC_MOMENTS_DEV === '1';
const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export type RankEnoughDecision =
  | Readonly<{ show: true; rank: number; nextRank: number; price: number; balance: number }>
  | Readonly<{ show: false; reason: 'max_rank' | 'not_enough' | 'already_offered' | 'unknown_state' }>;

/** Чистое решение: хватает ли монет на следующий ранг и не предлагали ли его уже. */
export function decideRankEnough(input: Readonly<{ rank: number | null; balance: number | null; offeredRanks: readonly number[] }>): RankEnoughDecision {
  if (input.rank === null || input.balance === null || !Number.isFinite(input.balance)) return { show: false, reason: 'unknown_state' };
  const next = nextCoinRankRow(input.rank);
  if (!next) return { show: false, reason: 'max_rank' };
  if (input.balance < next.priceToReach) return { show: false, reason: 'not_enough' };
  if (input.offeredRanks.includes(next.rank)) return { show: false, reason: 'already_offered' };
  return { show: true, rank: input.rank, nextRank: next.rank, price: next.priceToReach, balance: input.balance };
}

const offeredKey = (owner: string): string => `${OFFERED_PREFIX}:${owner}`;

export async function readOfferedRanks(owner: string): Promise<readonly number[]> {
  try {
    const raw = await AsyncStorage.getItem(offeredKey(owner));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch (error) {
    // Не прочитали — считаем «ничего не предлагали»: худший случай — окно ещё раз, а не потеря подсказки.
    DebugLogger.warn(LOG, `отметки не прочитались (${String(error).slice(0, 120)}) — считаем пустыми`);
    return [];
  }
}

/** Окно реально получило слот — этот ранг больше не предлагаем. */
export async function markRankOffered(owner: string, nextRank: number): Promise<void> {
  try {
    const current = await readOfferedRanks(owner);
    if (current.includes(nextRank)) return;
    await AsyncStorage.setItem(offeredKey(owner), JSON.stringify([...current, nextRank].slice(-40)));
    DebugLogger.info(LOG, `показано: ранг ${nextRank} отмечен как предложенный`);
  } catch (error) {
    DebugLogger.warn(LOG, `отметка ранга ${nextRank} не записалась (${String(error).slice(0, 120)}) — окно может повториться`);
  }
}

export async function readRankEnoughFlag(): Promise<boolean> {
  try {
    const raw = await readRemoteConfigCacheRaw();
    const bools = raw ? (JSON.parse(raw) as { bools?: Record<string, unknown> }).bools : null;
    return isMomentsV3Enabled(bools) || (IS_DEV && DEV_ENV_ON);
  } catch (error) {
    DebugLogger.warn(LOG, `флаг moments_v3 не прочитан — окно выключено (${String(error).slice(0, 120)})`);
    return false;
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
