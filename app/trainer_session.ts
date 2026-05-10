// Утилиты дневного лимита сессий Тренера (вынесено из trainer.tsx для тестируемости)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DAILY_FREE_SESSION_KEY = 'trainer_free_session_v1';

const todayKey = (): string => new Date().toISOString().split('T')[0];

export async function hasUsedFreeSessionToday(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_FREE_SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { date: string; count: number };
    return data.date === todayKey() && data.count >= 1;
  } catch {
    return false;
  }
}

export async function markFreeSessionUsed(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_FREE_SESSION_KEY);
    let data: { date: string; count: number } = { date: todayKey(), count: 0 };
    if (raw) {
      const parsed = JSON.parse(raw) as typeof data;
      if (parsed.date === todayKey()) data = parsed;
    }
    data.count += 1;
    await AsyncStorage.setItem(DAILY_FREE_SESSION_KEY, JSON.stringify(data));
  } catch {}
}

export async function getFreeSessionsLeftToday(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_FREE_SESSION_KEY);
    if (!raw) return 1;
    const data = JSON.parse(raw) as { date: string; count: number };
    if (data.date !== todayKey()) return 1;
    return Math.max(0, 1 - data.count);
  } catch {
    return 1;
  }
}

export default function __RouteShim() { return null; }
