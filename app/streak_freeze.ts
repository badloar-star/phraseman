import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreakFreezeRecord = {
  active?: unknown;
  date?: unknown;
};

export const streakFreezeDateKey = (date: Date = new Date()): string =>
  date.toISOString().split('T')[0];

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
