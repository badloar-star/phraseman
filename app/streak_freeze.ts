import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDayKey } from './local_date';

export type StreakFreezeRecord = {
  active?: unknown;
  date?: unknown;
};

// Локальная дата устройства — см. app/local_date.ts. Заморозка живёт максимум
// один день, так что здесь достаточно единой схемы (не нужен гибкий UTC/local
// компаратор): freeze.date пишется и читается в одном и том же локальном формате.
export const streakFreezeDateKey = (date: Date = new Date()): string =>
  getLocalDayKey(date);

export function isStreakFreezeActiveToday(
  freeze: StreakFreezeRecord | null | undefined,
  todayKey: string = streakFreezeDateKey(),
): boolean {
  return freeze?.active === true && freeze.date === todayKey;
}

export function parseStreakFreeze(raw: string | null): StreakFreezeRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export async function readStreakFreezeActive(todayKey: string = streakFreezeDateKey()): Promise<boolean> {
  try {
    return isStreakFreezeActiveToday(parseStreakFreeze(await AsyncStorage.getItem('streak_freeze')), todayKey);
  } catch {
    return false;
  }
}

/* expo-router: keep this utility from being treated as a screen */
export default function __StreakFreezeRouteShim() {
  return null;
}
