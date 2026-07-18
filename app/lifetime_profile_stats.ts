/**
 * Сводные «за всё время» метрики для экрана статистики.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCustomCards } from './flashcards/storage';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import { bumpStatsDaily } from './stats_daily_breakdown';
import {
  diagnosticLastKey,
  lessonProgressKey,
  lessonWordsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

const WORD_REQUIRED = 3;
const MIN_ACTIVE_MS = 60_000;

const K_DAILY_CLAIMS = 'lifetime_daily_tasks_claimed_v1';

const K_SHARDS_EARNED = 'shards_lifetime_earned_v1';
const K_SHARDS_SPENT = 'shards_lifetime_spent_v1';

/** Сколько фраз в одном уроке по сетке прогресса (см. lesson1). */
const LESSON_PHRASE_SLOTS_CAP = 50;
const LIFETIME_STATS_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];

function parseIntSafe(v: string | null, def = 0): number {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

async function readCounter(key: string): Promise<number> {
  return parseIntSafe(await AsyncStorage.getItem(key), 0);
}

async function incCounter(key: string, delta: number): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  try {
    const cur = await readCounter(key);
    await AsyncStorage.setItem(key, String(cur + Math.floor(delta)));
  } catch {
    /* ignore */
  }
}

export async function bumpDailyTaskClaimed(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await incCounter(K_DAILY_CLAIMS, 1);
  await bumpStatsDaily('daily_tasks_claimed', 1, studyTarget);
}

export async function bumpLifetimeShardsEarned(amount: number): Promise<void> {
  await incCounter(K_SHARDS_EARNED, amount);
  await bumpStatsDaily('shards_earned', amount);
}

export async function bumpLifetimeShardsSpent(amount: number): Promise<void> {
  await incCounter(K_SHARDS_SPENT, amount);
  await bumpStatsDaily('shards_spent', amount);
}

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
    } catch {
      /* skip */
    }
  }
  return sum;
}


const extractPoints = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'points' in val && typeof (val as { points: unknown }).points === 'number') {
    return (val as { points: number }).points;
  }
  return 0;
};

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
    } catch {
      /* skip */
    }
  }
  return sum;
}

export type LifetimeProfileStats = {
  wordsLearned: number;
  flashcardsSaved: number;
  phrasesLearned: number;
  englishLevel: string | null;
  dailyTasksClaimed: number;
  shardsEarned: number;
  shardsSpent: number;
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
    'dailyTasksClaimed',
    'shardsEarned',
    'shardsSpent',
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
  } catch {
    /* ignore */
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
    dailyStatsRaw,
    fgDaily,
    flashCards,
    phrasesLearned,
    dailyClaims,
    shardsE,
    shardsS,
  ] = await Promise.all([
    countLearnedWordsTotal(),
    AsyncStorage.getItem(diagnosticLastKey('en')),
    AsyncStorage.getItem('daily_stats'),
    getForegroundDailyMsMap(),
    readAllCustomCards(),
    countPhrasesLearnedFromLessonProgress(),
    readCounter(K_DAILY_CLAIMS),
    readCounter(K_SHARDS_EARNED),
    readCounter(K_SHARDS_SPENT),
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

  const statsMap: Record<string, unknown> = dailyStatsRaw ? JSON.parse(dailyStatsRaw) : {};
  const unionDates = new Set([...Object.keys(statsMap), ...Object.keys(fgDaily)]);
  const sortedUnion = [...unionDates].sort();
  let run = 0;
  let longest = 0;
  let appDaysUnion = 0;
  for (const d of sortedUnion) {
    const pts = extractPoints(statsMap[d]);
    const ms = fgDaily[d] ?? 0;
    const active = pts > 0 || ms >= MIN_ACTIVE_MS;
    if (active) {
      appDaysUnion++;
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const result: LifetimeProfileStats = {
    wordsLearned,
    flashcardsSaved: flashCards.length,
    phrasesLearned,
    englishLevel: diagnosticLevel,
    dailyTasksClaimed: dailyClaims,
    shardsEarned: shardsE,
    shardsSpent: shardsS,
    appDaysUnion,
    longestStreakDays: longest,
  };
  void persistLifetimeProfileStatsCache(result);
  return result;
}

/** Целочисленный рандом [min..max]. */
function devRand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * DEV-сид для «За всё время»: заполняет lifetime-счётчики (осколки, задания)
 * и кладёт выученные слова/фразы в lessonWordsKey/lessonProgressKey,
 * чтобы countLearnedWordsTotal/countPhrasesLearnedFromLessonProgress вернули
 * ненулевые значения. Нужен, чтобы ИИ-разбор увидел полный lifetime-блок.
 *
 * Только для QA/dev (вызывается из админ-панели). Пишет реальные ключи —
 * сбрасывает кэш, чтобы экран сразу подхватил.
 */
export async function devSeedLifetimeStatsScenario(studyTarget?: RuntimeStudyTarget): Promise<void> {
  const { LESSONS_WITH_WORDS } = await import('./lesson_words');
  const wordLessons = [...LESSONS_WITH_WORDS].slice(0, 8);

  const entries: Array<[string, string]> = [];

  // Слова: 6–12 «выученных» (count >= WORD_REQUIRED) на урок.
  for (const id of wordLessons) {
    const map: Record<string, number> = {};
    const learned = devRand(6, 12);
    for (let i = 0; i < learned; i++) {
      map[`w_${id}_${i}`] = devRand(WORD_REQUIRED, WORD_REQUIRED + 4);
    }
    entries.push([lessonWordsKey(id, studyTarget), JSON.stringify(map)]);
  }

  // Фразы: массив прогресса с 'correct' для первых уроков.
  for (let lessonId = 1; lessonId <= 6; lessonId++) {
    const correct = devRand(8, 24);
    const arr = Array.from({ length: correct }, () => 'correct');
    entries.push([lessonProgressKey(lessonId, studyTarget), JSON.stringify(arr)]);
  }

  // Lifetime-счётчики.
  entries.push(
    [K_DAILY_CLAIMS, String(devRand(4, 20))],
    [K_SHARDS_EARNED, String(devRand(200, 1500))],
    [K_SHARDS_SPENT, String(devRand(50, 800))],
  );

  await AsyncStorage.multiSet(entries);
  await AsyncStorage.removeItem(LIFETIME_PROFILE_STATS_CACHE_KEY);
}
