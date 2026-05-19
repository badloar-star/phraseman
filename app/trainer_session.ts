// Утилиты дневного лимита сессий Тренера (вынесено из trainer.tsx для тестируемости)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';

export const DAILY_FREE_SESSION_KEY = 'trainer_free_session_v1';
export const TRAINER_SESSION_ENTRY_KEY = 'trainer_session_entry_v1';

const ENTRY_TTL_MS = 2 * 60 * 1000;

export type TrainerSessionRoute =
  | '/trainer_words_session'
  | '/trainer_phrases_session'
  | '/trainer_arena_session';

interface TrainerSessionEntry {
  route: TrainerSessionRoute;
  date: string;
  expiresAt: number;
  nonce: string;
}

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

export async function reserveTrainerSessionEntry(
  route: TrainerSessionRoute,
  hasPremium: boolean,
): Promise<boolean> {
  try {
    if (!hasPremium) {
      const freeLeft = await getFreeSessionsLeftToday();
      if (freeLeft <= 0) return false;
    }

    const entry: TrainerSessionEntry = {
      route,
      date: todayKey(),
      expiresAt: Date.now() + ENTRY_TTL_MS,
      nonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    await AsyncStorage.setItem(TRAINER_SESSION_ENTRY_KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export async function consumeTrainerSessionEntry(route: TrainerSessionRoute): Promise<boolean> {
  try {
    const hasPremium = await getVerifiedPremiumStatus();
    if (hasPremium) return true;

    const raw = await AsyncStorage.getItem(TRAINER_SESSION_ENTRY_KEY);
    if (!raw) return false;
    const entry = JSON.parse(raw) as Partial<TrainerSessionEntry>;
    await AsyncStorage.removeItem(TRAINER_SESSION_ENTRY_KEY);

    const valid =
      entry.route === route &&
      entry.date === todayKey() &&
      typeof entry.expiresAt === 'number' &&
      entry.expiresAt >= Date.now();
    if (valid) await markFreeSessionUsed();
    return valid;
  } catch {
    await AsyncStorage.removeItem(TRAINER_SESSION_ENTRY_KEY).catch(() => {});
    return false;
  }
}

export default function __RouteShim() { return null; }
