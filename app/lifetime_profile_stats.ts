/**
 * Сводные «за всё время» метрики для экрана статистики.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { readCustomCards } from './flashcards/storage';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureArenaAuthUid } from './user_id_policy';
import type { ArenaProfile } from './types/arena';
import { bumpStatsDaily } from './stats_daily_breakdown';

const WORD_REQUIRED = 3;
const MIN_ACTIVE_MS = 60_000;

const K_QUIZ_EASY = 'lifetime_quiz_easy_v1';
const K_QUIZ_MEDIUM = 'lifetime_quiz_medium_v1';
const K_QUIZ_HARD = 'lifetime_quiz_hard_v1';
const K_QUIZ_MIGRATED = 'lifetime_quiz_counters_migrated_v1';

const K_DAILY_CLAIMS = 'lifetime_daily_tasks_claimed_v1';

const K_SHARDS_EARNED = 'shards_lifetime_earned_v1';
const K_SHARDS_SPENT = 'shards_lifetime_spent_v1';

/** Сколько фраз в одном уроке по сетке прогресса (см. lesson1). */
const LESSON_PHRASE_SLOTS_CAP = 50;

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

/** Одно полное прохождение квиза (лёгкий / средний / сложный). */
export async function bumpQuizSessionCompleted(level: 'easy' | 'medium' | 'hard' | null | undefined): Promise<void> {
  if (!level || (level !== 'easy' && level !== 'medium' && level !== 'hard')) return;
  const key = level === 'easy' ? K_QUIZ_EASY : level === 'medium' ? K_QUIZ_MEDIUM : K_QUIZ_HARD;
  await incCounter(key, 1);
  await bumpStatsDaily('quizzes_completed', 1);
}

async function ensureQuizCountersMigrated(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(K_QUIZ_MIGRATED)) return;
    const legacy = parseIntSafe(await AsyncStorage.getItem('quiz_hard_count'), 0);
    if (legacy > 0) {
      const cur = await readCounter(K_QUIZ_HARD);
      if (cur < legacy) await AsyncStorage.setItem(K_QUIZ_HARD, String(legacy));
    }
    await AsyncStorage.setItem(K_QUIZ_MIGRATED, '1');
  } catch {
    /* ignore */
  }
}

export async function bumpDailyTaskClaimed(): Promise<void> {
  await incCounter(K_DAILY_CLAIMS, 1);
  await bumpStatsDaily('daily_tasks_claimed', 1);
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
  const keys = Array.from({ length: 32 }, (_, i) => `lesson${i + 1}_progress`);
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
  const keys = lessons.map(id => `lesson${id}_words`);
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

async function loadArenaWinsLosses(): Promise<{ wins: number; losses: number }> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return { wins: 0, losses: 0 };
  try {
    const uid = await ensureArenaAuthUid();
    if (!uid) return { wins: 0, losses: 0 };
    const snap = await firestore().collection('arena_profiles').doc(uid).get();
    if (!snap.exists) return { wins: 0, losses: 0 };
    const data = snap.data() as ArenaProfile;
    const played = data.stats?.matchesPlayed ?? 0;
    const won = data.stats?.matchesWon ?? 0;
    const losses = Math.max(0, played - won);
    return { wins: won, losses };
  } catch {
    return { wins: 0, losses: 0 };
  }
}

export type LifetimeProfileStats = {
  wordsLearned: number;
  flashcardsSaved: number;
  phrasesLearned: number;
  quizzesTotal: number;
  arenaWins: number;
  arenaLosses: number;
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
    'quizzesTotal',
    'arenaWins',
    'arenaLosses',
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
  await ensureQuizCountersMigrated();

  const [
    wordsLearned,
    diagnosticLastRaw,
    dailyStatsRaw,
    fgDaily,
    flashCards,
    phrasesLearned,
    quizzesE,
    quizzesM,
    quizzesH,
    dailyClaims,
    shardsE,
    shardsS,
    arena,
  ] = await Promise.all([
    countLearnedWordsTotal(),
    AsyncStorage.getItem('diagnostic_last'),
    AsyncStorage.getItem('daily_stats'),
    getForegroundDailyMsMap(),
    readCustomCards(),
    countPhrasesLearnedFromLessonProgress(),
    readCounter(K_QUIZ_EASY),
    readCounter(K_QUIZ_MEDIUM),
    readCounter(K_QUIZ_HARD),
    readCounter(K_DAILY_CLAIMS),
    readCounter(K_SHARDS_EARNED),
    readCounter(K_SHARDS_SPENT),
    loadArenaWinsLosses(),
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
    quizzesTotal: quizzesE + quizzesM + quizzesH,
    arenaWins: arena.wins,
    arenaLosses: arena.losses,
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
