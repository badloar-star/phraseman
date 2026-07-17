/**
 * Посуточные счётчики для графиков «Весь путь».
 * Хранятся в AsyncStorage и синхронизируются с Firestore через cloud_sync (ключ stats_daily_breakdown_v1).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { streakCalendarShortWeekdays } from '../constants/streak_stats_i18n';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import type { Lang } from '../constants/i18n';
import { syncToCloud } from './cloud_sync';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureArenaAuthUid } from './user_id_policy';
import { statsDailyBreakdownKey, type RuntimeStudyTarget } from './target_storage_keys';

const STORAGE_KEY = 'stats_daily_breakdown_v1';

const MIN_ACTIVE_MS = 60_000;
const MAX_DAY_ROWS = 500;

export type StatsDailyMetric =
  | 'lessons_completed'
  | 'words_learned'
  | 'flashcards_saved'
  | 'phrases_learned'
  | 'quizzes_completed'
  | 'arena_wins'
  | 'arena_losses'
  | 'daily_tasks_claimed'
  | 'plan_tasks_completed'
  | 'shards_earned'
  | 'shards_spent';

const METRICS_LIST: StatsDailyMetric[] = [
  'lessons_completed',
  'words_learned',
  'flashcards_saved',
  'phrases_learned',
  'quizzes_completed',
  'arena_wins',
  'arena_losses',
  'daily_tasks_claimed',
  'plan_tasks_completed',
  'shards_earned',
  'shards_spent',
];

/** Что можно открыть из блока «Весь путь». */
export type LifetimeTotalsChartKind =
  | StatsDailyMetric
  | 'app_days'
  | 'longest_streak';

type DayRow = Partial<Record<StatsDailyMetric, number>>;
type Store = Record<string, DayRow>;

function parseStore(raw: unknown): Store {
  if (raw == null) return {};
  let s: string;
  if (typeof raw === 'string') s = raw;
  else if (typeof raw === 'object') {
    try {
      s = JSON.stringify(raw);
    } catch {
      return {};
    }
  } else s = String(raw);
  try {
    const o = JSON.parse(s) as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Store) : {};
  } catch {
    return {};
  }
}

function pruneStore(s: Store): Store {
  const keys = Object.keys(s).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort();
  const drop = Math.max(0, keys.length - MAX_DAY_ROWS);
  const keep = keys.slice(drop);
  const out: Store = {};
  for (const k of keep) out[k] = s[k];
  return out;
}

/** Объединить локальное и облачное (max по каждой метрике за день), записать локально; строка для progress в Firestore. */
export async function reconcileStatsDailyBreakdownWithCloud(
  cloudRaw: unknown,
  studyTarget?: RuntimeStudyTarget,
): Promise<string> {
  let local: Store = {};
  try {
    const raw = await AsyncStorage.getItem(statsDailyBreakdownKey(studyTarget));
    local = parseStore(raw);
  } catch {
    local = {};
  }
  const remote = parseStore(cloudRaw);
  const merged = pruneStore(mergeDailyBreakdownStores(local, remote));
  const str = JSON.stringify(merged);
  try {
    await AsyncStorage.setItem(statsDailyBreakdownKey(studyTarget), str);
  } catch {
    /* ignore */
  }
  return str;
}

function mergeDailyBreakdownStores(local: Store, remote: Store): Store {
  const dates = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Store = {};
  for (const d of dates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const rowA = local[d] ?? {};
    const rowB = remote[d] ?? {};
    const rowOut: DayRow = {};
    for (const metric of METRICS_LIST) {
      const v = Math.max(
        Math.max(0, Math.floor(Number(rowA[metric] ?? 0))),
        Math.max(0, Math.floor(Number(rowB[metric] ?? 0))),
      );
      if (v > 0) rowOut[metric] = v;
    }
    if (Object.keys(rowOut).length > 0) out[d] = rowOut;
  }
  return out;
}

export type LifetimeChartDay = {
  date: string;
  shortLabel: string;
  dayNum: string;
  value: number;
  active: boolean;
};

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

function enumerateDatesInclusive(fromStr: string, toStr: string): string[] {
  if (fromStr > toStr) return [];
  const out: string[] = [];
  const cur = new Date(fromStr + 'T12:00:00');
  const endT = new Date(toStr + 'T12:00:00').getTime();
  while (cur.getTime() <= endT) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Понедельник календарной недели локального времени для даты `todayStr`. */
function mondayOfLocalCalendarWeek(todayStr: string): string {
  const d = new Date(todayStr + 'T12:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Дни оси «Весь путь»: две календарные недели, от текущего понедельника до следующего воскресенья. */
function buildLifetimePathChartDateRange(todayStr: string): string[] {
  const mon = mondayOfLocalCalendarWeek(todayStr);
  const end = new Date(mon + 'T12:00:00');
  end.setDate(end.getDate() + 13);
  return enumerateDatesInclusive(mon, toDateStr(end));
}



function extractDailyPoints(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && 'points' in val && typeof (val as { points: unknown }).points === 'number') {
    return (val as { points: number }).points;
  }
  return 0;
}

function mergeArenaHistoryCount(localValue: number, historyValue: number): number {
  return Math.max(
    Math.max(0, Math.floor(Number(localValue) || 0)),
    Math.max(0, Math.floor(Number(historyValue) || 0)),
  );
}

async function loadArenaHistoryDailyCounts(
  fromStr: string,
  toStr: string,
): Promise<{ wins: Record<string, number>; losses: Record<string, number> }> {
  const empty = { wins: {}, losses: {} };
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return empty;
  try {
    const uid = await ensureArenaAuthUid();
    if (!uid) return empty;
    const fromMs = new Date(fromStr + 'T00:00:00.000Z').getTime();
    const toMs = new Date(toStr + 'T23:59:59.999Z').getTime();
    const snap = await firestore()
      .collection('arena_profiles')
      .doc(uid)
      .collection('match_history')
      .where('createdAt', '>=', fromMs)
      .where('createdAt', '<=', toMs)
      .get();
    const wins: Record<string, number> = {};
    const losses: Record<string, number> = {};
    snap.forEach((doc) => {
      const d = doc.data() as { createdAt?: unknown; won?: unknown; isDraw?: unknown };
      const createdAt = typeof d.createdAt === 'number' ? d.createdAt : 0;
      if (!createdAt || d.isDraw === true) return;
      const day = toDateStr(new Date(createdAt));
      if (day < fromStr || day > toStr) return;
      if (d.won === true) wins[day] = (wins[day] ?? 0) + 1;
      else losses[day] = (losses[day] ?? 0) + 1;
    });
    return { wins, losses };
  } catch {
    return empty;
  }
}

/** Увеличить счётчик за сегодняшнюю дату (UTC‑день как в daily_stats). */
export async function bumpStatsDaily(
  metric: StatsDailyMetric,
  delta: number,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  const day = toDateStr(new Date());
  const add = Math.floor(delta);
  try {
    const raw = await AsyncStorage.getItem(statsDailyBreakdownKey(studyTarget));
    const store = parseStore(raw);
    const row = { ...(store[day] ?? {}) };
    row[metric] = Math.max(0, Math.floor(Number(row[metric] ?? 0) + add));
    store[day] = row;
    const pruned = pruneStore(store);
    await AsyncStorage.setItem(statsDailyBreakdownKey(studyTarget), JSON.stringify(pruned));
    void import('./activity_365_analytics')
      .then(({ invalidateActivity365Cache }) => invalidateActivity365Cache())
      .catch(() => {});
  } catch {
    /* ignore */
  }
  void syncToCloud();
}

function randIntInclusive(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Первые `dayCount` дат оси «Весь путь» (те же ключи, что у графика), с понедельника текущей календарной недели. */
export function getLifetimePathChartHeadDatesForRandom(dayCount: number): string[] {
  const todayStr = toDateStr(new Date());
  const range = buildLifetimePathChartDateRange(todayStr);
  const n = Math.max(1, Math.min(14, Math.floor(dayCount)));
  return range.slice(0, Math.min(n, range.length));
}

export type DevLifetimePathRandomSums = {
  wordsLearned: number;
  flashcardsSaved: number;
  phrasesLearned: number;
  quizzesTotal: number;
  arenaWins: number;
  arenaLosses: number;
  dailyTasksClaimed: number;
  shardsEarned: number;
  shardsSpent: number;
};

const ZERO_DEV_SUMS: DevLifetimePathRandomSums = {
  wordsLearned: 0,
  flashcardsSaved: 0,
  phrasesLearned: 0,
  quizzesTotal: 0,
  arenaWins: 0,
  arenaLosses: 0,
  dailyTasksClaimed: 0,
  shardsEarned: 0,
  shardsSpent: 0,
};

/**
 * Для экрана статистики (dev): перезаписать посуточные метрики для первых N дней оси «Весь путь»
 * (те же даты, что у графика, с понедельника недели) случайными числами.
 * Возвращает суммы по этим дням — цифры слева можно подставить под график.
 */
export async function devRandomizeLifetimePathDailyMetrics(dayCount: number): Promise<DevLifetimePathRandomSums> {
  const dates = getLifetimePathChartHeadDatesForRandom(dayCount);
  const sums: DevLifetimePathRandomSums = { ...ZERO_DEV_SUMS };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const store = parseStore(raw);
    for (const day of dates) {
      const row: Required<DayRow> = {
        lessons_completed: randIntInclusive(0, 3),
        words_learned: randIntInclusive(0, 45),
        flashcards_saved: randIntInclusive(0, 14),
        phrases_learned: randIntInclusive(0, 60),
        quizzes_completed: randIntInclusive(0, 8),
        arena_wins: randIntInclusive(0, 6),
        arena_losses: randIntInclusive(0, 6),
        daily_tasks_claimed: randIntInclusive(0, 5),
        plan_tasks_completed: randIntInclusive(0, 5),
        shards_earned: randIntInclusive(0, 90),
        shards_spent: randIntInclusive(0, 55),
      };
      store[day] = row;
      sums.wordsLearned += row.words_learned;
      sums.flashcardsSaved += row.flashcards_saved;
      sums.phrasesLearned += row.phrases_learned;
      sums.quizzesTotal += row.quizzes_completed;
      sums.arenaWins += row.arena_wins;
      sums.arenaLosses += row.arena_losses;
      sums.dailyTasksClaimed += row.daily_tasks_claimed;
      sums.shardsEarned += row.shards_earned;
      sums.shardsSpent += row.shards_spent;
    }
    const pruned = pruneStore(store);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    return { ...ZERO_DEV_SUMS };
  }
  void syncToCloud();
  return sums;
}

/**
 * Посуточный ряд для графиков «Весь путь»: текущая и следующая календарные недели.
 * Будущие дни возвращаются нулями, чтобы ось была просторной, но линия строилась только по факту.
 * `longest_streak` — без данных (null).
 */
/**
 * Слова и фразы, выученные за последние 7 дней (включая сегодня) и за 7 дней до них.
 * Для строки «+N слов и +M фраз за неделю» в карточке недели на экране статистики.
 */
export async function loadWeeklyLearnedCounts(
  studyTarget?: RuntimeStudyTarget,
): Promise<{ words7: number; phrases7: number }> {
  let store: Store = {};
  try {
    store = parseStore(await AsyncStorage.getItem(statsDailyBreakdownKey(studyTarget)));
  } catch {
    store = {};
  }
  const cursor = new Date(toDateStr(new Date()) + 'T12:00:00');
  let words7 = 0;
  let phrases7 = 0;
  for (let i = 0; i < 7; i++) {
    const row = store[toDateStr(cursor)];
    words7 += Math.max(0, Math.floor(Number(row?.words_learned ?? 0)));
    phrases7 += Math.max(0, Math.floor(Number(row?.phrases_learned ?? 0)));
    cursor.setDate(cursor.getDate() - 1);
  }
  return { words7, phrases7 };
}

export async function loadLifetimeTotalsChartDays(
  kind: LifetimeTotalsChartKind,
  lang: Lang,
  ruReportOnly: boolean,
): Promise<LifetimeChartDay[] | null> {
  if (kind === 'longest_streak') return null;

  const wdays = streakCalendarShortWeekdays(lang, ruReportOnly);
  const todayStr = toDateStr(new Date());

  if (kind === 'app_days') {
    let statsRaw: string | null = '';
    let fgDaily: Record<string, number> = {};
    try {
      [statsRaw, fgDaily] = await Promise.all([
        AsyncStorage.getItem('daily_stats'),
        getForegroundDailyMsMap(),
      ]);
    } catch {
      statsRaw = '';
      fgDaily = {};
    }
    const statsMap: Record<string, unknown> = statsRaw ? JSON.parse(statsRaw) : {};
    const dates = buildLifetimePathChartDateRange(todayStr);
    return dates.map(dateStr => {
      const cal = new Date(dateStr + 'T12:00:00');
      const pts = extractDailyPoints(statsMap[dateStr]);
      const ms = fgDaily[dateStr] ?? 0;
      const active = pts > 0 || ms >= MIN_ACTIVE_MS;
      return {
        date: dateStr,
        shortLabel: wdays[cal.getDay()],
        dayNum: String(cal.getDate()),
        value: active ? 1 : 0,
        active,
      };
    });
  }

  let store: Store = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    store = parseStore(raw);
  } catch {
    store = {};
  }

  const dates = buildLifetimePathChartDateRange(todayStr);
  const arenaHistory = kind === 'arena_wins' || kind === 'arena_losses'
    ? await loadArenaHistoryDailyCounts(dates[0], dates[dates.length - 1])
    : null;
  return dates.map(dateStr => {
    const cal = new Date(dateStr + 'T12:00:00');
    const row = store[dateStr];
    const localValue = Math.max(0, Math.floor(Number(row?.[kind as StatsDailyMetric] ?? 0)));
    const value = kind === 'arena_wins'
      ? mergeArenaHistoryCount(localValue, arenaHistory?.wins[dateStr] ?? 0)
      : kind === 'arena_losses'
        ? mergeArenaHistoryCount(localValue, arenaHistory?.losses[dateStr] ?? 0)
        : localValue;
    return {
      date: dateStr,
      shortLabel: wdays[cal.getDay()],
      dayNum: String(cal.getDate()),
      value,
      active: value > 0,
    };
  });
}
