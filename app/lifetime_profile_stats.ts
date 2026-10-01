/**
 * Сводные «за всё время» метрики для экрана статистики.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCustomCards } from './flashcards/storage';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import {
  diagnosticLastKey,
  lessonProgressKey,
  lessonWordsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { DebugLogger } from './debug-logger';

const WORD_REQUIRED = 3;
const MIN_ACTIVE_MS = 60_000;

// зачем (PM-289, D70): счётчики жемчуга «заработано/потрачено за всё время» удалены
// вместе с валютой — ни один экран их больше не показывает.

/** Сколько фраз в одном уроке по сетке прогресса (см. lesson1). */
const LESSON_PHRASE_SLOTS_CAP = 50;
const LIFETIME_STATS_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];

/**
 * Сколько фраз из уроков сейчас в состоянии «выучено» (correct / replay_correct),
 * по всем урокам 1–32. Считаем только первые LESSON_PHRASE_SLOTS_CAP ячеек на урок
 * (защита от раздутых массивов в хранилище).
 */
async function countPhrasesLearnedFromLessonProgress(): Promise<number> {
  const keys = Array.from({ length: 32 }, (_, i) => i + 1).flatMap(lessonId =>
    LIFETIME_STATS_TARGETS.map(studyTarget => lessonProgressKey(lessonId, studyTarget)),
  );
  const rows = await AsyncStorage.multiGet(keys);
  let sum = 0;
  for (const [, val] of rows) {
    if (!val) continue;
    try {
      const p: unknown = JSON.parse(val);
      if (!Array.isArray(p)) continue;
      const slice = p.slice(0, LESSON_PHRASE_SLOTS_CAP);
      sum += slice.filter(x => x === 'correct' || x === 'replay_correct').length;
    } catch (e) {
      // skip
      DebugLogger.error('lifetime_profile_stats:slice', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return sum;
}


async function countLearnedWordsTotal(): Promise<number> {
  const { LESSONS_WITH_WORDS } = await import('./lesson_words');
  const lessons = [...LESSONS_WITH_WORDS];
  const keys = lessons.flatMap(id =>
    LIFETIME_STATS_TARGETS.map(studyTarget => lessonWordsKey(id, studyTarget)),
  );
  const rows = await AsyncStorage.multiGet(keys);
  let sum = 0;
  for (const [, val] of rows) {
    if (!val) continue;
    try {
      const data = JSON.parse(val) as unknown;
      if (Array.isArray(data)) {
        sum += data.length;
        continue;
      }
      if (typeof data === 'object' && data !== null) {
        for (const c of Object.values(data as Record<string, unknown>)) {
          const n = typeof c === 'number' ? c : Number(c);
          if (Number.isFinite(n) && n >= WORD_REQUIRED) sum++;
        }
      }
    } catch (e) {
      // skip
      DebugLogger.error('lifetime_profile_stats:n', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return sum;
}

export type LifetimeProfileStats = {
  wordsLearned: number;
  flashcardsSaved: number;
  phrasesLearned: number;
  englishLevel: string | null;
  appDaysUnion: number;
  longestStreakDays: number;
};

const LIFETIME_PROFILE_STATS_CACHE_KEY = 'lifetime_profile_stats_snapshot_v1';

function isLifetimeProfileStatsSnapshot(o: unknown): o is LifetimeProfileStats {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  const nums = [
    'wordsLearned',
    'flashcardsSaved',
    'phrasesLearned',
    'appDaysUnion',
    'longestStreakDays',
  ] as const;
  for (const k of nums) {
    const v = r[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false;
  }
  if (r.englishLevel !== null && typeof r.englishLevel !== 'string') return false;
  return true;
}

/** Мгновенный снимок для экрана статистики (без ожидания тяжёлого пересчёта и арены). */
export async function readLifetimeProfileStatsCache(): Promise<LifetimeProfileStats | null> {
  try {
    const raw = await AsyncStorage.getItem(LIFETIME_PROFILE_STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isLifetimeProfileStatsSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function persistLifetimeProfileStatsCache(s: LifetimeProfileStats): Promise<void> {
  try {
    await AsyncStorage.setItem(LIFETIME_PROFILE_STATS_CACHE_KEY, JSON.stringify(s));
  } catch (e) {
      // ignore
      DebugLogger.error('lifetime_profile_stats:persistLifetimeProfileStatsCache', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function loadLifetimeProfileStats(): Promise<LifetimeProfileStats> {
  const readAllCustomCards = async () => {
    const lists = await Promise.all(LIFETIME_STATS_TARGETS.map(studyTarget => readCustomCards(studyTarget)));
    return lists.flat();
  };

  const [
    wordsLearned,
    diagnosticLastRaw,
    fgDaily,
    flashCards,
    phrasesLearned,
  ] = await Promise.all([
    countLearnedWordsTotal(),
    AsyncStorage.getItem(diagnosticLastKey('en')),
    getForegroundDailyMsMap(),
    readAllCustomCards(),
    countPhrasesLearnedFromLessonProgress(),
  ]);
  let diagnosticLevel: string | null = null;
  if (diagnosticLastRaw) {
    try {
      const parsed = JSON.parse(diagnosticLastRaw);
      diagnosticLevel = typeof parsed?.level === 'string' ? parsed.level.trim() || null : null;
    } catch {
      diagnosticLevel = null;
    }
  }

  const sortedDates = Object.keys(fgDaily).sort();
  let run = 0;
  let longest = 0;
  let appDaysUnion = 0;
  let previousActiveDay: string | null = null;
  for (const d of sortedDates) {
    const ms = fgDaily[d] ?? 0;
    const active = ms >= MIN_ACTIVE_MS;
    if (active) {
      appDaysUnion++;
      const dayTime = Date.parse(`${d}T00:00:00Z`);
      const previousTime = previousActiveDay ? Date.parse(`${previousActiveDay}T00:00:00Z`) : NaN;
      run = dayTime - previousTime === 86_400_000 ? run + 1 : 1;
      longest = Math.max(longest, run);
      previousActiveDay = d;
    } else {
      run = 0;
      previousActiveDay = null;
    }
  }

  const result: LifetimeProfileStats = {
    wordsLearned,
    flashcardsSaved: flashCards.length,
    phrasesLearned,
    englishLevel: diagnosticLevel,
    appDaysUnion,
    longestStreakDays: longest,
  };
  void persistLifetimeProfileStatsCache(result);
  return result;
}
