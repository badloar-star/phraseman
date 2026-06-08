// Утилиты дневного лимита сессий Тренера (вынесено из trainer.tsx для тестируемости)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
import { getEffectiveFreeTrainerSessions, FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT } from './remote_flags';
import { getCanonicalUserId } from './user_id_policy';
import { trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import type { RuntimeStudyTarget } from './target_storage_keys';

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

/** Сколько бесплатных сессий тренажёра в день доступно пользователю (флаг + A/B). */
async function dailyFreeSessionCap(): Promise<number> {
  const userId = await getCanonicalUserId().catch(() => null);
  return getEffectiveFreeTrainerSessions(userId);
}

export function hasReservedTrainerSessionEntrySync(
  _route: TrainerSessionRoute,
  _studyTarget?: RuntimeStudyTarget,
): boolean {
  return false;
}

export async function hasUsedFreeSessionToday(studyTarget?: RuntimeStudyTarget): Promise<boolean> {
  // Закрытый source-gate (например, French) — тренировок нет, хранилище не трогаем.
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return true;
  try {
    const raw = await AsyncStorage.getItem(DAILY_FREE_SESSION_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as { date: string; count: number };
    if (data.date !== todayKey()) return false;
    return data.count >= (await dailyFreeSessionCap());
  } catch {
    return false;
  }
}

export async function markFreeSessionUsed(studyTarget?: RuntimeStudyTarget): Promise<void> {
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return;
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

export async function getFreeSessionsLeftToday(studyTarget?: RuntimeStudyTarget): Promise<number> {
  // Закрытый source-gate (French) — 0 сессий, хранилище не читаем.
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return 0;
  try {
    const cap = await dailyFreeSessionCap();
    const raw = await AsyncStorage.getItem(DAILY_FREE_SESSION_KEY);
    if (!raw) return cap;
    const data = JSON.parse(raw) as { date: string; count: number };
    if (data.date !== todayKey()) return cap;
    return Math.max(0, cap - data.count);
  } catch {
    // Согласованность с дефолтом (раньше было хардкод 1, что урезало группы B/C).
    return FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT;
  }
}

export async function reserveTrainerSessionEntry(
  route: TrainerSessionRoute,
  hasPremium: boolean,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  // Закрытый source-gate (French) — резерв запрещён, хранилище не трогаем.
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
    await AsyncStorage.setItem(TRAINER_SESSION_ENTRY_KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

export async function consumeTrainerSessionEntry(
  route: TrainerSessionRoute,
  studyTarget?: RuntimeStudyTarget,
): Promise<boolean> {
  // Закрытый source-gate (French) — потребление запрещено, хранилище не трогаем.
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return false;
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
    if (valid) await markFreeSessionUsed(studyTarget);
    return valid;
  } catch {
    await AsyncStorage.removeItem(TRAINER_SESSION_ENTRY_KEY).catch(() => {});
    return false;
  }
}

export default function __RouteShim() { return null; }
