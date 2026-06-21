// Weekly Boons — выдача наград модальных бонусов (Mystery Monday, Comeback) и
// гард «один раз за период». Чистая часть (выбор награды, расчёт claim-ключа)
// вынесена для тестов; запись в стор — тонкая обёртка над shards_system.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addShardsRaw } from '../shards_system';
import { getTodayKey } from '../daily_tasks';
import { utcWeekNumberFromTodayKey } from './boon_engine';

/** Описание разовой награды бонуса. */
export interface BoonReward {
  shards: number;
}

/** Тиры награды «Загадочного понедельника» (переменная, но без «пустых»). */
interface RewardTier {
  weight: number;
  shards: number;
}

const MYSTERY_TIERS: readonly RewardTier[] = [
  { weight: 60, shards: 3 },
  { weight: 27, shards: 5 },
  { weight: 10, shards: 8 },
  { weight: 3, shards: 15 },
];

/**
 * Детерминированный выбор тира по «броску» [0,1). Чистая функция: один и тот же
 * roll → один и тот же тир (для тестов и воспроизводимости).
 */
export function pickMysteryReward(roll: number): BoonReward {
  const total = MYSTERY_TIERS.reduce((s, tier) => s + tier.weight, 0);
  const r = Math.min(Math.max(roll, 0), 0.999999) * total;
  let acc = 0;
  for (const tier of MYSTERY_TIERS) {
    acc += tier.weight;
    if (r < acc) return { shards: tier.shards };
  }
  return { shards: MYSTERY_TIERS[0].shards };
}

/** Фиксированная награда «Дня возвращения». */
export const COMEBACK_REWARD: BoonReward = { shards: 5 };

/** Текущий week-id (UTC, ISO-неделя-подобный номер) — для недельных claim-ключей. */
export function currentWeekId(todayKey: string = getTodayKey()): string {
  return `w${utcWeekNumberFromTodayKey(todayKey)}`;
}

/** Прочитать, был ли claim по ключу совершён в данном периоде. */
export async function isClaimed(storageKey: string, periodId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(storageKey)) === periodId;
  } catch {
    return false;
  }
}

/** Пометить claim совершённым в данном периоде. */
export async function markClaimed(storageKey: string, periodId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, periodId);
  } catch {
    // best-effort
  }
}

/** Начислить осколки награды (через raw, чтобы задать произвольную сумму). */
export async function grantBoonReward(reward: BoonReward, logReason: string): Promise<void> {
  if (reward.shards > 0) {
    await addShardsRaw(reward.shards, logReason).catch(() => 0);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
