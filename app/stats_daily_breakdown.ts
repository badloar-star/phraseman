/**
 * Посуточные счётчики для графиков «Весь путь».
 * Хранятся в AsyncStorage и синхронизируются с Firestore через cloud_sync (ключ stats_daily_breakdown_v1).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streakCalendarShortWeekdays } from '../constants/streak_stats_i18n';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import type { Lang } from '../constants/i18n';
import { syncToCloud } from './cloud_sync';
import { statsDailyBreakdownKey, type RuntimeStudyTarget } from './target_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { FRIENDS_TOGETHER_UI_ENABLED } from './friends_together/together_config';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

const STORAGE_KEY = 'stats_daily_breakdown_v1';

const MIN_ACTIVE_MS = 60_000;
const MAX_DAY_ROWS = 500;

export type StatsDailyMetric =
  | 'lessons_completed'
  | 'words_learned'
  | 'flashcards_saved'
  | 'phrases_learned'
  | 'plan_tasks_completed';
// зачем (PM-289, D70): метрики жемчуга (shards_earned/shards_spent) удалены вместе
// с валютой; старые строки в хранилище просто игнорируются при чтении.

const METRICS_LIST: StatsDailyMetric[] = [
  'lessons_completed',
  'words_learned',
  'flashcards_saved',
  'phrases_learned',
  'plan_tasks_completed',
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
  let storedRaw: string | null = null;
  const startedAt = Date.now();
  try {
    const raw = await AsyncStorage.getItem(statsDailyBreakdownKey(studyTarget));
    storedRaw = typeof raw === 'string' ? raw : null;
    local = parseStore(raw);
  } catch (error: unknown) {
    // зачем (12.10): был немой catch — нечитаемый диск выглядел как «локальной статистики нет».
    console.warn(`[STATS-RECONCILE] read:failed target=${String(studyTarget)} reason=${error instanceof Error ? error.message : String(error)} → считаем локальное пустым`);
    local = {};
  }
  const readMs = Date.now() - startedAt;
  const remote = parseStore(cloudRaw);
  const merged = pruneStore(mergeDailyBreakdownStores(local, remote));
  const str = JSON.stringify(merged);
  // зачем (координатор 12.10, «сначала логи»): что пришло из облака и что лежит локально — у нового гостя оба пустые,
  // и тогда вся сверка лишь пишет «{}». Размеры и дни, без содержимого.
  console.warn(`[STATS-RECONCILE] in target=${String(studyTarget)} cloudType=${cloudRaw === undefined ? 'none' : typeof cloudRaw} cloudDays=${Object.keys(remote).length} localStored=${storedRaw === null ? 'none' : `${storedRaw.length}b`} localDays=${Object.keys(local).length} mergedDays=${Object.keys(merged).length} readMs=${readMs}`);
  // зачем (замер холодного старта 04.10: запись stats_daily_breakdown 3 с в очереди, два раза за старт, в том числе для языка, которым
  // человек не пользуется): объединение с облаком чаще всего ничего не меняет — тогда пишем НЕ ТО ЖЕ САМОЕ. Результат и возврат прежние.
  if (storedRaw === str) {
    console.warn(`[STATS-RECONCILE] write:skipped unchanged target=${String(studyTarget)} bytes=${str.length}`);
    return str;
  }
  try {
    await AsyncStorage.setItem(statsDailyBreakdownKey(studyTarget), str);
  } catch (e) {
      // ignore
      DebugLogger.error('stats_daily_breakdown:str', e instanceof Error ? e : new Error(String(e)), 'warning');
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



/** Увеличить счётчик за сегодняшнюю дату (UTC‑день). */
export async function bumpStatsDaily(
  metric: StatsDailyMetric,
  delta: number,
  studyTarget?: RuntimeStudyTarget,
  accountToken?: AccountGenerationToken,
): Promise<void> {
  if (!Number.isFinite(delta) || delta <= 0) return;
  const operationToken = accountToken ?? captureAccountGeneration();
  if (!operationToken.stableId || !isCurrentAccountGeneration(operationToken)) return;
  const day = toDateStr(new Date());
  const add = Math.floor(delta);
  try {
    const raw = await AsyncStorage.getItem(statsDailyBreakdownKey(studyTarget));
    if (!isCurrentAccountGeneration(operationToken)) return;
    const store = parseStore(raw);
    const row = { ...(store[day] ?? {}) };
    row[metric] = Math.max(0, Math.floor(Number(row[metric] ?? 0) + add));
    store[day] = row;
    const pruned = pruneStore(store);
    const commit = async (): Promise<boolean> => {
      if (!isCurrentAccountGeneration(operationToken)) return false;
      await AsyncStorage.setItem(statsDailyBreakdownKey(studyTarget), JSON.stringify(pruned));
      return isCurrentAccountGeneration(operationToken);
    };
    const committed = await withAccountTransitionLock(commit);
    if (!committed) return;
    void import('./activity_365_analytics')
      .then(({ invalidateActivity365Cache }) => invalidateActivity365Cache())
      .catch(noteSwallowedHandler('stats_daily_breakdown:promise_1'));
    // зачем (идея 6 «Итог недели друга», закон владельца «телефон решает»): после занятия телефон сам пересчитывает свою неделю —
    // запись friends_week_v1 уходит тем же склеенным патчем синхронизации. Модуль грузится только при включённом интерфейсе «Вместе».
    if (metric === 'lessons_completed' && FRIENDS_TOGETHER_UI_ENABLED) {
      void import('./friends_together/friend_week_store')
        .then(({ refreshMyFriendWeek }) => refreshMyFriendWeek('lesson_completed'))
        .catch(noteSwallowedHandler('stats_daily_breakdown:friend_week'));
    }
  } catch (e) {
      // ignore
      DebugLogger.error('stats_daily_breakdown:committed', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  if (isCurrentAccountGeneration(operationToken)) void syncToCloud();
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
};

const ZERO_DEV_SUMS: DevLifetimePathRandomSums = {
  wordsLearned: 0,
  flashcardsSaved: 0,
  phrasesLearned: 0,
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
      const row: DayRow = {
        lessons_completed: randIntInclusive(0, 3),
        words_learned: randIntInclusive(0, 45),
        flashcards_saved: randIntInclusive(0, 14),
        phrases_learned: randIntInclusive(0, 60),
      };
      store[day] = row;
      sums.wordsLearned += row.words_learned ?? 0;
      sums.flashcardsSaved += row.flashcards_saved ?? 0;
      sums.phrasesLearned += row.phrases_learned ?? 0;
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
    let fgDaily: Record<string, number> = {};
    try {
      fgDaily = await getForegroundDailyMsMap();
    } catch {
      fgDaily = {};
    }
    const dates = buildLifetimePathChartDateRange(todayStr);
    return dates.map(dateStr => {
      const cal = new Date(dateStr + 'T12:00:00');
      const ms = fgDaily[dateStr] ?? 0;
      const active = ms >= MIN_ACTIVE_MS;
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
  return dates.map(dateStr => {
    const cal = new Date(dateStr + 'T12:00:00');
    const row = store[dateStr];
    const value = Math.max(0, Math.floor(Number(row?.[kind as StatsDailyMetric] ?? 0)));
    return {
      date: dateStr,
      shortLabel: wdays[cal.getDay()],
      dayNum: String(cal.getDate()),
      value,
      active: value > 0,
    };
  });
}
