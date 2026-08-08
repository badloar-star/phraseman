// Утилиты дневного лимита сессий Тренера (вынесено из trainer.tsx для тестируемости)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus } from './premium_guard';
// зачем: getEffectiveFreeTrainerSessions/getCanonicalUserId/FREE_TRAINER_SESSIONS_PER_DAY_DEFAULT
// больше не импортируются — тренажёр стал бесплатным без дневного лимита (см. dailyFreeSessionCap).
import { trainerSessionContentAvailableForTarget } from './trainer_target_gate';
import { trainerFreeSessionKey, trainerSessionEntryKey, type RuntimeStudyTarget } from './target_storage_keys';

export const DAILY_FREE_SESSION_KEY = 'trainer_free_session_v1';
export const TRAINER_SESSION_ENTRY_KEY = 'trainer_session_entry_v1';

const ENTRY_TTL_MS = 2 * 60 * 1000;

export type TrainerSessionRoute =
  | '/trainer_words_session'
  | '/trainer_phrases_session';

interface TrainerSessionEntry {
  route: TrainerSessionRoute;
  date: string;
  expiresAt: number;
  nonce: string;
}

const todayKey = (): string => new Date().toISOString().split('T')[0];

/**
 * Сколько бесплатных сессий тренажёра в день доступно пользователю.
 *
 * зачем: владелец сделал тренажёр («Моя практика») полностью бесплатным —
 * дневного лимита больше нет ни у кого. Возвращаем Infinity, поэтому
 * hasUsedFreeSessionToday никогда не даёт true, getFreeSessionsLeftToday
 * всегда > 0, а reserve/consume пропускают вход без проверки премиума.
 * Счётчик в AsyncStorage продолжает писаться (аналитика/откат), но ни на
 * что не влияет. Remote-ключ free_trainer_sessions_per_day и A/B-функция
 * getEffectiveFreeTrainerSessions намеренно больше не читаются здесь —
 * вернуть лимит = вернуть этот вызов.
 */
async function dailyFreeSessionCap(): Promise<number> {
  return Number.POSITIVE_INFINITY;
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
    const raw = await AsyncStorage.getItem(trainerFreeSessionKey(studyTarget));
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
    const raw = await AsyncStorage.getItem(trainerFreeSessionKey(studyTarget));
    let data: { date: string; count: number } = { date: todayKey(), count: 0 };
    if (raw) {
      const parsed = JSON.parse(raw) as typeof data;
      if (parsed.date === todayKey()) data = parsed;
    }
    data.count += 1;
    await AsyncStorage.setItem(trainerFreeSessionKey(studyTarget), JSON.stringify(data));
  } catch {}
}

export async function getFreeSessionsLeftToday(studyTarget?: RuntimeStudyTarget): Promise<number> {
  // Закрытый source-gate (French) — 0 сессий, хранилище не читаем.
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return 0;
  try {
    const cap = await dailyFreeSessionCap();
    const raw = await AsyncStorage.getItem(trainerFreeSessionKey(studyTarget));
    if (!raw) return cap;
    const data = JSON.parse(raw) as { date: string; count: number };
    if (data.date !== todayKey()) return cap;
    return Math.max(0, cap - data.count);
  } catch {
    // зачем: тренажёр бесплатный без лимита — сбой чтения хранилища не должен
    // внезапно возвращать дневной кап и запирать вход (fail-open, как cap выше).
    return Number.POSITIVE_INFINITY;
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
  // Закрытый source-gate (French) — потребление запрещено, хранилище не трогаем.
  if (!trainerSessionContentAvailableForTarget(studyTarget)) return false;
  try {
    const hasPremium = await getVerifiedPremiumStatus();
    if (hasPremium) return true;

    const raw = await AsyncStorage.getItem(trainerSessionEntryKey(studyTarget));
    if (!raw) return false;
    const entry = JSON.parse(raw) as Partial<TrainerSessionEntry>;
    await AsyncStorage.removeItem(trainerSessionEntryKey(studyTarget));

    const valid =
      entry.route === route &&
      entry.date === todayKey() &&
      typeof entry.expiresAt === 'number' &&
      entry.expiresAt >= Date.now();
    if (valid) await markFreeSessionUsed(studyTarget);
    return valid;
  } catch {
    await AsyncStorage.removeItem(trainerSessionEntryKey(studyTarget)).catch(() => {});
    return false;
  }
}

export default function __RouteShim() { return null; }
