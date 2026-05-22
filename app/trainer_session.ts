// Утилиты дневного лимита сессий Тренера (вынесено из trainer.tsx для тестируемости)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
import {
  trainerFreeSessionKey,
  trainerSessionEntryKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { trainerSessionContentAvailableForTarget } from './trainer_target_gate';

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

export async function hasUsedFreeSessionToday(studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return true;
  try {
    const raw = await AsyncStorage.getItem(trainerFreeSessionKey(studyTarget));
    if (!raw) return false;
    const data = JSON.parse(raw) as { date: string; count: number };
    return data.date === todayKey() && data.count >= 1;
  } catch {
    return false;
  }
}

export async function markFreeSessionUsed(studyTarget?: RuntimeStudyTarget): Promise<void> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return;
  try {
    const key = trainerFreeSessionKey(studyTarget);
    const raw = await AsyncStorage.getItem(key);
    let data: { date: string; count: number } = { date: todayKey(), count: 0 };
    if (raw) {
      const parsed = JSON.parse(raw) as typeof data;
      if (parsed.date === todayKey()) data = parsed;
    }
    data.count += 1;
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

export async function getFreeSessionsLeftToday(studyTarget?: RuntimeStudyTarget): Promise<number> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return 0;
  try {
    const raw = await AsyncStorage.getItem(trainerFreeSessionKey(studyTarget));
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
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return false;
  try {
    if (!hasPremium) {
      const freeLeft = await getFreeSessionsLeftToday(studyTarget);
      if (freeLeft <= 0) return false;
    }

    const entry: TrainerSessionEntry = {
      route,
      date: todayKey(),
      expiresAt: Date.now() + ENTRY_TTL_MS,
      nonce: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    await AsyncStorage.setItem(trainerSessionEntryKey(studyTarget), JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export async function consumeTrainerSessionEntry(
  route: TrainerSessionRoute,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return false;
  const key = trainerSessionEntryKey(studyTarget);
  try {
    const hasPremium = await getVerifiedPremiumStatus();
    if (hasPremium) return true;

    const raw = await AsyncStorage.getItem(key);
    if (!raw) return false;
    const entry = JSON.parse(raw) as Partial<TrainerSessionEntry>;
    await AsyncStorage.removeItem(key);

    const valid =
      entry.route === route &&
      entry.date === todayKey() &&
      typeof entry.expiresAt === 'number' &&
      entry.expiresAt >= Date.now();
    if (valid) await markFreeSessionUsed(studyTarget);
    return valid;
  } catch {
    await AsyncStorage.removeItem(key).catch(() => {});
    return false;
  }
}

export default function __RouteShim() { return null; }
