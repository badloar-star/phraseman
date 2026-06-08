/**
 * paywall_progress_mirror.ts — «зеркало прогресса» для пейвола.
 *
 * Цель (план монетизации #5): показать накопленный пользователем актив перед
 * стеной (endowment-эффект, gain-framing по Библии). Переиспользуется в
 * intro_ended (#2: «за 3 дня ты…») и в high-value контекстах (lifetime «уже твоё»).
 *
 * Данные читаются из уже существующих источников, асинхронно и без сети:
 *   - lifetime: readLifetimeProfileStatsCache() (мгновенный снимок);
 *   - дельта за период: stats_daily_breakdown_v1 (посуточные счётчики, en+fr);
 *   - streak/xp: AsyncStorage 'streak_count' / 'user_total_xp'.
 *
 * Ничего не мутирует — только читает. Все ошибки проглатываются (пейвол не должен
 * падать из-за статистики), при сбое возвращается «пустой» прогресс.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readLifetimeProfileStatsCache } from './lifetime_profile_stats';
import { statsDailyBreakdownKey, type RuntimeStudyTarget } from './target_storage_keys';
import type { StatsDailyMetric } from './stats_daily_breakdown';

/** Таргеты, по которым суммируем посуточные метрики (как в lifetime_profile_stats). */
const MIRROR_TARGETS: readonly RuntimeStudyTarget[] = ['en', 'fr'];

/** Порог «стоит ли показывать зеркало»: ниже него блок прячем (пустые числа анти-продают). */
const MIN_LESSONS_TO_SHOW = 2;
const MIN_PHRASES_TO_SHOW = 10;

export interface ProgressMirror {
  lessons: number;
  phrases: number;
  words: number;
  xp: number;
  streak: number;
}

const EMPTY_MIRROR: ProgressMirror = { lessons: 0, phrases: 0, words: 0, xp: 0, streak: 0 };

function parseIntSafe(v: string | null): number {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** YYYY-MM-DD для метки времени (UTC-день, как в stats_daily_breakdown). */
function toDateStr(ms: number): string {
  return new Date(ms).toISOString().split('T')[0]!;
}

/**
 * Сумма посуточной метрики по всем дням с `startedAtMs` (включительно) по `nowMs`,
 * сложенная по всем таргетам (en + fr). Источник — stats_daily_breakdown_v1.
 */
export async function sumDailyBreakdownSince(
  metric: StatsDailyMetric,
  startedAtMs: number,
  nowMs: number = Date.now(),
): Promise<number> {
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) return 0;
  const fromDay = toDateStr(startedAtMs);
  const toDay = toDateStr(nowMs);

  let total = 0;
  // один батч-запрос по обоим таргетам вместо последовательных round-trip'ов
  const rows = await AsyncStorage.multiGet(MIRROR_TARGETS.map((t) => statsDailyBreakdownKey(t)));
  for (const [, raw] of rows) {
    if (!raw) continue;
    try {
      const store = JSON.parse(raw) as unknown;
      if (!store || typeof store !== 'object' || Array.isArray(store)) continue;
      for (const [day, row] of Object.entries(store as Record<string, unknown>)) {
        if (!isYmd(day) || day < fromDay || day > toDay) continue;
        if (!row || typeof row !== 'object') continue;
        const v = (row as Record<string, unknown>)[metric];
        const n = typeof v === 'number' ? v : Number(v);
        if (Number.isFinite(n) && n > 0) total += Math.floor(n);
      }
    } catch {
      /* skip target */
    }
  }
  return total;
}

/** Lifetime «уже твоё»: мгновенный снимок из кэша + streak/xp. */
export async function readProgressMirror(): Promise<ProgressMirror> {
  try {
    const [cache, streakRaw, xpRaw] = await Promise.all([
      readLifetimeProfileStatsCache(),
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('user_total_xp'),
    ]);
    return {
      lessons: 0, // в lifetime-кэше нет числа уроков; для lifetime-режима фразы важнее
      phrases: cache?.phrasesLearned ?? 0,
      words: cache?.wordsLearned ?? 0,
      xp: parseIntSafe(xpRaw),
      streak: parseIntSafe(streakRaw),
    };
  } catch {
    return { ...EMPTY_MIRROR };
  }
}

/**
 * Прогресс «за интро» (с момента старта 72ч полного доступа).
 * lessons здесь не считаем по дельте (нет посуточного счётчика уроков) — берём
 * фразы/слова из stats_daily_breakdown за период, xp/streak — текущие.
 */
export async function readIntroProgress(nowMs: number = Date.now()): Promise<ProgressMirror> {
  try {
    const startedRaw = await AsyncStorage.getItem('intro_full_access_started_at_v1');
    const startedAt = parseIntSafe(startedRaw);
    if (!startedAt) return { ...EMPTY_MIRROR };

    const [phrases, words, streakRaw, xpRaw] = await Promise.all([
      sumDailyBreakdownSince('phrases_learned', startedAt, nowMs),
      sumDailyBreakdownSince('words_learned', startedAt, nowMs),
      AsyncStorage.getItem('streak_count'),
      AsyncStorage.getItem('user_total_xp'),
    ]);

    return {
      lessons: 0,
      phrases,
      words,
      xp: parseIntSafe(xpRaw),
      streak: parseIntSafe(streakRaw),
    };
  } catch {
    return { ...EMPTY_MIRROR };
  }
}

/** Стоит ли вообще показывать блок: при скудных данных — нет (пустые числа анти-продают). */
export function isMirrorWorthShowing(m: ProgressMirror): boolean {
  return m.lessons >= MIN_LESSONS_TO_SHOW || m.phrases >= MIN_PHRASES_TO_SHOW;
}
