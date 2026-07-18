import type { Lang } from '../constants/i18n';

export type InsightDailyRow = {
  date: string;
  xp: number;
  foregroundMs: number;
  active: boolean;
};

export type StatsLearningInsights = {
  rhythm: InsightDailyRow[];
  regularity: { activeDays: number; totalDays: number; ratio: number };
  weekComparison: { currentXp: number; previousXp: number; currentMinutes: number; previousMinutes: number };
  bestWeek: { xp: number; startDate: string | null; endDate: string | null };
  speed: Array<{ date: string; xpPerMinute: number | null }>;
  bestTime: { status: 'unavailable' };
};

const WEEK_DAYS = 7;

function safeNumber(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function sum(rows: readonly InsightDailyRow[], pick: (row: InsightDailyRow) => number): number {
  return rows.reduce((total, row) => total + safeNumber(pick(row)), 0);
}

export function formatCompactDuration(ms: number, lang: Lang): string {
  const totalMinutes = Math.floor(safeNumber(ms) / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (lang === 'ru') {
    return hours > 0 ? `${hours} ч ${String(minutes).padStart(2, '0')} мин` : `${minutes} мин`;
  }
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`;
}

export function buildStatsLearningInsights(inputRows: readonly InsightDailyRow[]): StatsLearningInsights {
  const rows = [...inputRows]
    .filter((row) => typeof row.date === 'string' && row.date.length > 0)
    .map((row) => ({
      ...row,
      xp: Math.floor(safeNumber(row.xp)),
      foregroundMs: Math.floor(safeNumber(row.foregroundMs)),
      active: row.active === true,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
  const rhythm = rows.slice(-WEEK_DAYS);
  const previousWeek = rows.slice(Math.max(0, rows.length - WEEK_DAYS * 2), Math.max(0, rows.length - WEEK_DAYS));
  const activeDays = rhythm.filter((row) => row.active).length;

  let bestWeek: StatsLearningInsights['bestWeek'] = { xp: 0, startDate: null, endDate: null };
  for (let start = 0; start < rows.length; start += 1) {
    const window = rows.slice(start, start + WEEK_DAYS);
    const xp = sum(window, (row) => row.xp);
    if (xp > bestWeek.xp) {
      bestWeek = { xp, startDate: window[0]?.date ?? null, endDate: window.at(-1)?.date ?? null };
    }
  }

  return {
    rhythm,
    regularity: { activeDays, totalDays: WEEK_DAYS, ratio: activeDays / WEEK_DAYS },
    weekComparison: {
      currentXp: sum(rhythm, (row) => row.xp),
      previousXp: sum(previousWeek, (row) => row.xp),
      currentMinutes: Math.floor(sum(rhythm, (row) => row.foregroundMs) / 60_000),
      previousMinutes: Math.floor(sum(previousWeek, (row) => row.foregroundMs) / 60_000),
    },
    bestWeek,
    speed: rhythm.map((row) => ({
      date: row.date,
      xpPerMinute: row.foregroundMs > 0 ? Math.round((row.xp / (row.foregroundMs / 60_000)) * 10) / 10 : null,
    })),
    bestTime: { status: 'unavailable' },
  };
}
