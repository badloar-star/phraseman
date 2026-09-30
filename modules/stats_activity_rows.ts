const MIN_ACTIVE_MS = 60_000;
const DAY_MS = 86_400_000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type StatsActivityDay = {
  date: string;
  dayNum: string;
  active: boolean;
  streak: number;
};

export type StatsActivityTimeDay = {
  date: string;
  dayNum: string;
  ms: number;
  active: boolean;
};

export type StatsActivityRows = {
  days: StatsActivityDay[];
  allDays: StatsActivityDay[];
  allTimeDays: StatsActivityTimeDay[];
  bestStreak: number;
  activeDays: number;
};

function safeCount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function storedStreak(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  return safeCount((value as { streak?: unknown }).streak);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isValidPastDayKey(key: string, todayKey: string): boolean {
  if (!DATE_KEY.test(key) || key > todayKey) return false;
  const date = new Date(`${key}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && dayKey(date) === key;
}

export function buildStatsActivityRows(
  streakHistory: Record<string, unknown>,
  foregroundMsByDate: Record<string, number>,
  currentStreak: number,
  now = new Date(),
): StatsActivityRows {
  const today = new Date(now);
  today.setUTCHours(12, 0, 0, 0);
  const todayKey = dayKey(today);
  const activeKeys = Object.keys(foregroundMsByDate)
    .filter((key) => isValidPastDayKey(key, todayKey) && safeCount(foregroundMsByDate[key]) >= MIN_ACTIVE_MS)
    .sort();
  const activeSet = new Set(activeKeys);

  const makeDay = (date: string): StatsActivityDay => ({
    date,
    dayNum: String(Number(date.slice(-2))),
    active: activeSet.has(date),
    streak: storedStreak(streakHistory[date]),
  });
  const days: StatsActivityDay[] = [];
  for (let offset = 13; offset >= 0; offset--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - offset);
    days.push(makeDay(dayKey(date)));
  }

  const earliest = new Date(today);
  earliest.setUTCDate(earliest.getUTCDate() - 59);
  const firstKey = activeKeys.length === 0
    ? todayKey
    : activeKeys[0] > dayKey(earliest) ? activeKeys[0] : dayKey(earliest);
  const allDays: StatsActivityDay[] = [];
  for (const date = new Date(`${firstKey}T12:00:00.000Z`); date <= today; date.setUTCDate(date.getUTCDate() + 1)) {
    allDays.push(makeDay(dayKey(date)));
  }
  const allTimeDays: StatsActivityTimeDay[] = allDays.map(({ date, dayNum, active }) => ({
    date,
    dayNum,
    ms: safeCount(foregroundMsByDate[date]),
    active,
  }));

  let longestTimeStreak = 0;
  let run = 0;
  let previousDayMs = Number.NEGATIVE_INFINITY;
  for (const key of activeKeys) {
    const dayMs = Date.parse(`${key}T00:00:00.000Z`);
    run = dayMs - previousDayMs === DAY_MS ? run + 1 : 1;
    previousDayMs = dayMs;
    longestTimeStreak = Math.max(longestTimeStreak, run);
  }
  const historicalStreak = Object.values(streakHistory).reduce<number>(
    (best, value) => Math.max(best, storedStreak(value)),
    0,
  );

  return {
    days,
    allDays,
    allTimeDays,
    bestStreak: Math.max(safeCount(currentStreak), historicalStreak, longestTimeStreak),
    activeDays: activeKeys.length,
  };
}
