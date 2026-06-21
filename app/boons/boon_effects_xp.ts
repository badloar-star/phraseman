// Weekly Boons — XP-множители: «Двойной четверг» (×2) и «Ранняя пташка» (×1.1 до 10:00).
//
// Оба применяются в едином choke-point начисления XP (xp_manager.ts), в той же
// аддитивной формуле, что и клубный/стрик/comeback-множители: + (M - 1).
//
// double_xp — primary-бонус дня (по UTC-дню, как вся ротация).
// early_bird — always-on модификатор, активен ТОЛЬКО до 10:00 ЛОКАЛЬНОГО времени.

import { getTodaysBoons, isBoonModifierActive } from './boon_engine';

/** ×2 множитель «Двойного четверга». */
export const DOUBLE_XP_MULTIPLIER = 2;
/** Небольшой множитель «Ранней пташки». */
export const EARLY_BIRD_MULTIPLIER = 1.1;
/** Час (локальный), до которого активна «Ранняя пташка» (строго <). */
export const EARLY_BIRD_BEFORE_HOUR = 10;

/** Множитель «Двойного XP» (×2, если primary-бонус дня = double_xp, иначе 1). */
export function doubleXpMultiplier(): number {
  return getTodaysBoons().primary === 'double_xp' ? DOUBLE_XP_MULTIPLIER : 1;
}

/**
 * Множитель «Ранней пташки»: ×1.1, если модификатор early_bird включён И сейчас
 * раньше 10:00 локально. localHour прокидывается для тестов.
 */
export function earlyBirdMultiplier(localHour: number = new Date().getHours()): number {
  if (localHour >= EARLY_BIRD_BEFORE_HOUR) return 1;
  return isBoonModifierActive('early_bird') ? EARLY_BIRD_MULTIPLIER : 1;
}

/**
 * Суммарный аддитивный вклад бонусных XP-множителей: (doubleXp - 1) + (earlyBird - 1).
 * Прибавляется к totalMultiplier в xp_manager. Чистая (час прокидывается для тестов).
 */
export function boonXpMultiplierContribution(localHour: number = new Date().getHours()): number {
  return doubleXpMultiplier() - 1 + (earlyBirdMultiplier(localHour) - 1);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
