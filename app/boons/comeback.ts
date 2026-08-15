// Weekly Boons — «День возвращения» (Comeback Day).
//
// Если пользователь пропустил 2+ дня (что НЕ ловит streak_repair — он берёт ровно
// 1 пропущенный день, streak_repair.ts:79), при возврате даём бонус: бесплатную
// заморозку серии + щедрый дроп/награду. Не путать со streak-repair.
//
// Источник «когда был активен» — ключ last_active_date (YYYY-MM-DD, тот же, что
// читает streak_repair). Чистая функция вычисления вынесена для тестов.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUtcDayKey } from '../local_date';

/** Минимум пропущенных дней, чтобы считать это «возвращением». */
export const COMEBACK_MIN_MISSED_DAYS = 2;

/** Ключ «возврат уже отмечен сегодня» (идемпотентность за сутки). */
export const COMEBACK_GRANTED_KEY = 'boon_comeback_granted_v1';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateStr(s: string | null | undefined): s is string {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
}

/**
 * Сколько ПОЛНЫХ дней прошло между lastActiveKey и todayKey (оба YYYY-MM-DD, UTC).
 * Возвращает 0, если дата невалидна или сегодня/в будущем.
 */
export function daysSinceLastActive(lastActiveKey: string | null | undefined, todayKey: string): number {
  if (!isValidDateStr(lastActiveKey) || !isValidDateStr(todayKey)) return 0;
  const last = Date.parse(`${lastActiveKey}T00:00:00Z`);
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  if (!Number.isFinite(last) || !Number.isFinite(today)) return 0;
  const diff = Math.floor((today - last) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/**
 * Чистая проверка права на comeback-бонус: пропущено >= COMEBACK_MIN_MISSED_DAYS
 * И сегодня бонус ещё не выдавался (grantedKey !== todayKey).
 */
export function isComebackEligible(
  lastActiveKey: string | null | undefined,
  grantedKey: string | null | undefined,
  todayKey: string,
): boolean {
  if (grantedKey === todayKey) return false; // уже выдали сегодня
  return daysSinceLastActive(lastActiveKey, todayKey) >= COMEBACK_MIN_MISSED_DAYS;
}

/** Считает право на comeback-бонус из AsyncStorage (без побочек, только чтение). */
export async function checkComebackEligible(todayKey: string = getUtcDayKey()): Promise<boolean> {
  try {
    const [lastActive, granted] = await Promise.all([
      AsyncStorage.getItem('last_active_date'),
      AsyncStorage.getItem(COMEBACK_GRANTED_KEY),
    ]);
    return isComebackEligible(lastActive, granted, todayKey);
  } catch {
    return false;
  }
}

/** Помечает, что comeback-бонус выдан сегодня (идемпотентность за сутки). */
export async function markComebackGranted(todayKey: string = getUtcDayKey()): Promise<void> {
  try {
    await AsyncStorage.setItem(COMEBACK_GRANTED_KEY, todayKey);
  } catch {
    // best-effort
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
