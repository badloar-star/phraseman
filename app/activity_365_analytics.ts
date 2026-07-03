import AsyncStorage from '@react-native-async-storage/async-storage';
import { getForegroundDailyMsMap } from './foreground_usage_ms';

export const ACTIVITY_365_GOAL_KEY = 'activity_365_goal_v1';
export const STATS_DAILY_BREAKDOWN_KEY = 'stats_daily_breakdown_v1';
export const FOREGROUND_DAILY_MS_KEY = 'phraseman_foreground_daily_ms_v1';

const WINDOW_DAYS = 365;
const MIN_ACTIVE_MS = 60_000;

export type Activity365Filter = 'all' | 'lessons' | 'quizzes' | 'review' | 'arena';
export type Activity365Level = 0 | 1 | 2 | 3 | 4;

export type Activity365Day = {
  date: string;
  level: Activity365Level;
  xp: number;
  minutes: number;
  active: boolean;
  future: boolean;
  metrics: {
    lessons: number;
    quizzes: number;
    review: number;
    arena: number;
    wordsLearned: number;
    phrasesLearned: number;
    flashcardsSaved: number;
    dailyTasksClaimed: number;
    planTasksCompleted: number;
  };
};

export type Activity365MonthSummary = {
  key: string;
  year: number;
  month: number;
  activeDays: number;
  totalXp: number;
  totalMinutes: number;
};

export type Activity365Insight = {
  kind: 'improved' | 'missed_weekday' | 'steady' | 'warmup' | 'restart';
  titleRu: string;
  titleUk: string;
  titleEs: string;
  bodyRu: string;
  bodyUk: string;
  bodyEs: string;
};

export type Activity365NextStepKind = 'first_day' | 'warmup' | 'build_week' | 'continue_streak' | 'restart';

export function activity365NextStepKind(activeDays: number, currentStreak: number): Activity365NextStepKind {
  if (activeDays <= 0) return 'first_day';
  if (activeDays < 3) return 'warmup';
  if (activeDays < 7) return 'build_week';
  if (currentStreak > 0) return 'continue_streak';
  return 'restart';
}

export type Activity365GoalAnalytics = {
  goal: number;
  /** true только если юзер сам выбрал цель (в сторе валидное значение). При false
   *  `goal` = дефолтный пресет, прогноз показывать НЕ нужно (баг «цель уже стоит»). */
  chosen: boolean;
  activeDays: number;
  remainingDays: number;
  forecastDate: string | null;
  requiredDaysPerWeek: number;
  onTrack: boolean;
};

export type Activity365Analytics = {
  days: Activity365Day[];
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  biggestGap: number;
  last30ActiveDays: number;
  consistencyScore: number;
  bestMonth: Activity365MonthSummary | null;
  weakestMonth: Activity365MonthSummary | null;
  currentMonth: Activity365MonthSummary | null;
  insights: Activity365Insight[];
  goal: Activity365GoalAnalytics;
};

type DailyBreakdownRow = Partial<{
  words_learned: number;
  flashcards_saved: number;
  phrases_learned: number;
  quizzes_completed: number;
  arena_wins: number;
  arena_losses: number;
  daily_tasks_claimed: number;
  plan_tasks_completed: number;
}>;

type DailyBreakdownStore = Record<string, DailyBreakdownRow>;

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function addDaysUtcKey(dateKey: string, deltaDays: number): string {
  // Integer arithmetic: parse YYYY-MM-DD → epoch ms, add days, reformat — avoids Date allocation per call
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  const epochMs = Date.UTC(y, m - 1, d) + deltaDays * 86_400_000;
  const dt = new Date(epochMs);
  return toDateKey(dt);
}

function inclusiveDaySpan(a: string, b: string): number {
  const t0 = new Date(`${a}T12:00:00Z`).getTime();
  const t1 = new Date(`${b}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((t1 - t0) / 86400000) + 1);
}

function extractPoints(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.max(0, Math.floor(val));
  if (
    typeof val === 'object' &&
    val !== null &&
    'points' in val &&
    typeof (val as { points: unknown }).points === 'number'
  ) {
    return Math.max(0, Math.floor((val as { points: number }).points));
  }
  return 0;
}

function parseObject<T extends Record<string, unknown>>(raw: string | null): T {
  if (!raw) return {} as T;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : {} as T;
  } catch {
    return {} as T;
  }
}

function percentileThresholds(sorted: number[]): [number, number, number, number] {
  if (sorted.length === 0) return [1, 2, 3, 4];
  const pick = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))] ?? 1;
  return [pick(0.33), pick(0.55), pick(0.77), pick(1)];
}

function levelForValue(value: number, thr: [number, number, number, number], activeFallback: boolean): Activity365Level {
  if (value <= 0) return activeFallback ? 1 : 0;
  const [t1, t2, t3, t4] = thr;
  if (value <= t1) return 1;
  if (value <= t2) return 2;
  if (value <= t3) return 3;
  return value >= t4 ? 4 : 3;
}

function findFirstActivityKey(
  statsMap: Record<string, unknown>,
  fgDaily: Record<string, number>,
  breakdown: DailyBreakdownStore,
  endStr: string,
): string | null {
  const limitStart = addDaysUtcKey(endStr, -800);
  let best: string | null = null;
  const consider = (k: string, active: boolean) => {
    if (!active || !/^\d{4}-\d{2}-\d{2}$/.test(k) || k < limitStart || k > endStr) return;
    if (!best || k < best) best = k;
  };
  for (const [k, v] of Object.entries(statsMap)) consider(k, extractPoints(v) > 0 || (fgDaily[k] ?? 0) >= MIN_ACTIVE_MS);
  for (const [k, ms] of Object.entries(fgDaily)) consider(k, ms >= MIN_ACTIVE_MS);
  for (const [k, row] of Object.entries(breakdown)) {
    const sum = Object.values(row ?? {}).reduce((acc, val) => acc + Math.max(0, Math.floor(Number(val) || 0)), 0);
    consider(k, sum > 0);
  }
  return best;
}

function metricsForRow(row: DailyBreakdownRow | undefined): Activity365Day['metrics'] {
  const n = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
  const wordsLearned = n(row?.words_learned);
  const phrasesLearned = n(row?.phrases_learned);
  const flashcardsSaved = n(row?.flashcards_saved);
  const dailyTasksClaimed = n(row?.daily_tasks_claimed);
  const planTasksCompleted = n(row?.plan_tasks_completed);
  const arena = n(row?.arena_wins) + n(row?.arena_losses);
  return {
    lessons: wordsLearned + phrasesLearned,
    quizzes: n(row?.quizzes_completed),
    review: flashcardsSaved + dailyTasksClaimed,
    arena,
    wordsLearned,
    phrasesLearned,
    flashcardsSaved,
    dailyTasksClaimed,
    planTasksCompleted,
  };
}

function monthNameKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function summarizeMonths(days: Activity365Day[], todayKey: string) {
  const map = new Map<string, Activity365MonthSummary>();
  for (const day of days) {
    if (day.future || day.date > todayKey) continue;
    const key = monthNameKey(day.date);
    const [yearRaw, monthRaw] = key.split('-');
    const prev = map.get(key) ?? {
      key,
      year: Number(yearRaw),
      month: Number(monthRaw),
      activeDays: 0,
      totalXp: 0,
      totalMinutes: 0,
    };
    prev.activeDays += day.active ? 1 : 0;
    prev.totalXp += day.xp;
    prev.totalMinutes += day.minutes;
    map.set(key, prev);
  }
  const months = [...map.values()];
  const nonEmpty = months.filter(m => m.activeDays > 0 || m.totalXp > 0 || m.totalMinutes > 0);
  const bestMonth = nonEmpty.length
    ? [...nonEmpty].sort((a, b) => (b.activeDays - a.activeDays) || (b.totalXp - a.totalXp))[0] ?? null
    : null;
  const weakestMonth = nonEmpty.length >= 2
    ? [...nonEmpty].sort((a, b) => (a.activeDays - b.activeDays) || (a.totalXp - b.totalXp))[0] ?? null
    : null;
  const currentMonth = map.get(todayKey.slice(0, 7)) ?? null;
  return { bestMonth, weakestMonth, currentMonth };
}

function summarizeStreaks(days: Activity365Day[], todayKey: string) {
  let activeDays = 0;
  let longestStreak = 0;
  let currentRun = 0;
  let biggestGap = 0;
  let gapRun = 0;
  let todayIndex = -1;
  for (let i = 0; i < days.length; i++) {
    const day = days[i]!;
    if (day.future || day.date > todayKey) continue;
    todayIndex = i;
    if (day.active) {
      activeDays += 1;
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
      gapRun = 0;
    } else {
      currentRun = 0;
      gapRun += 1;
      biggestGap = Math.max(biggestGap, gapRun);
    }
  }

  let currentStreak = 0;
  for (let i = todayIndex; i >= 0; i--) {
    if (!days[i]?.active) break;
    currentStreak += 1;
  }
  const last30ActiveDays = days
    .filter(day => !day.future && day.date <= todayKey)
    .slice(-30)
    .filter(day => day.active)
    .length;
  return { activeDays, currentStreak, longestStreak, biggestGap, last30ActiveDays };
}

function buildConsistencyScore(params: {
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  last30ActiveDays: number;
  biggestGap: number;
}): number {
  const activePart = Math.min(1, params.activeDays / 220) * 34;
  const recentPart = Math.min(1, params.last30ActiveDays / 24) * 30;
  const currentPart = Math.min(1, params.currentStreak / 21) * 20;
  const longPart = Math.min(1, params.longestStreak / 60) * 16;
  const gapPenalty = Math.min(12, Math.max(0, params.biggestGap - 7) * 0.9);
  return Math.max(0, Math.min(100, Math.round(activePart + recentPart + currentPart + longPart - gapPenalty)));
}

function activeCount(days: Activity365Day[], fromInclusive: number, toExclusive: number): number {
  return days.slice(Math.max(0, fromInclusive), Math.max(0, toExclusive)).filter(day => day.active && !day.future).length;
}

function weekdayLabelRu(dow: number): string {
  return ['воскресеньям', 'понедельникам', 'вторникам', 'средам', 'четвергам', 'пятницам', 'субботам'][dow] ?? 'этим дням';
}

function weekdayLabelUk(dow: number): string {
  return ['неділях', 'понеділках', 'вівторках', 'середах', 'четвергах', 'п\'ятницях', 'суботах'][dow] ?? 'цих днях';
}

function weekdayLabelEs(dow: number): string {
  return ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'][dow] ?? 'días';
}

function buildInsights(days: Activity365Day[], todayKey: string, currentStreak: number): Activity365Insight[] {
  const observed = days.filter(day => !day.future && day.date <= todayKey);
  const activeObserved = observed.filter(day => day.active).length;
  const last14 = activeCount(observed, observed.length - 14, observed.length);
  const prev14 = activeCount(observed, observed.length - 28, observed.length - 14);
  const insights: Activity365Insight[] = [];

  if (activeObserved > 0 && activeObserved < 3) {
    insights.push({
      kind: 'warmup',
      titleRu: 'Первый импульс',
      titleUk: 'Перший імпульс',
      titleEs: 'Primer impulso',
      bodyRu: 'Первые данные уже есть. Сейчас важнее спокойно закрепить старт, чем оценивать ритм.',
      bodyUk: 'Перші дані вже є. Зараз важливіше спокійно закріпити старт, ніж оцінювати ритм.',
      bodyEs: 'Ya hay primeros datos. Ahora importa más consolidar el inicio que evaluar el ritmo.',
    });
  }

  if (prev14 > 0 && last14 > prev14) {
    const pct = Math.round(((last14 - prev14) / prev14) * 100);
    insights.push({
      kind: 'improved',
      titleRu: 'Темп растёт',
      titleUk: 'Темп зростає',
      titleEs: 'El ritmo sube',
      bodyRu: `Последние 2 недели стабильнее предыдущих на ${pct}%. Продолжай в том же ритме.`,
      bodyUk: `Останні 2 тижні стабільніші за попередні на ${pct}%. Тримай цей ритм.`,
      bodyEs: `Las últimas 2 semanas son un ${pct}% más constantes que las anteriores.`,
    });
  }

  const recent = observed.slice(-90);
  const missesByDow = Array.from({ length: 7 }, (_, dow) => ({ dow, missed: 0, total: 0 }));
  for (const day of recent) {
    const dow = new Date(`${day.date}T12:00:00Z`).getUTCDay();
    missesByDow[dow]!.total += 1;
    if (!day.active) missesByDow[dow]!.missed += 1;
  }
  const weakDow = missesByDow
    .filter(row => row.total >= 6 && row.missed >= 2)
    .sort((a, b) => (b.missed / b.total) - (a.missed / a.total))[0];
  if (weakDow) {
    insights.push({
      kind: 'missed_weekday',
      titleRu: 'Нашёлся слабый день',
      titleUk: 'Знайшовся слабкий день',
      titleEs: 'Hay un día débil',
      bodyRu: `Ты чаще пропускаешь по ${weekdayLabelRu(weakDow.dow)}. Попробуй короткую 5-минутную сессию утром.`,
      bodyUk: `Ти частіше пропускаєш по ${weekdayLabelUk(weakDow.dow)}. Спробуй коротку 5-хвилинну сесію зранку.`,
      bodyEs: `Sueles saltarte los ${weekdayLabelEs(weakDow.dow)}. Prueba una sesión corta de 5 minutos por la mañana.`,
    });
  }

  if (insights.length === 0 && currentStreak >= 7) {
    insights.push({
      kind: 'steady',
      titleRu: 'Ритм закрепляется',
      titleUk: 'Ритм закріплюється',
      titleEs: 'El hábito se consolida',
      bodyRu: `Серия ${currentStreak} дней уже работает как привычка. Самое ценное сейчас — не повышать нагрузку резко.`,
      bodyUk: `Серія ${currentStreak} днів уже працює як звичка. Найцінніше зараз — не підвищувати навантаження різко.`,
      bodyEs: `Una racha de ${currentStreak} días ya parece hábito. Ahora conviene no subir la carga de golpe.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      kind: 'restart',
      titleRu: 'Точка перезапуска',
      titleUk: 'Точка перезапуску',
      titleEs: 'Punto de reinicio',
      bodyRu: 'Сделай сегодня маленькую сессию: один активный день важнее идеального плана.',
      bodyUk: 'Зроби сьогодні маленьку сесію: один активний день важливіший за ідеальний план.',
      bodyEs: 'Haz hoy una sesión pequeña: un día activo vale más que un plan perfecto.',
    });
  }

  return insights.slice(0, 2);
}

function buildGoal(goal: number, chosen: boolean, activeDays: number, todayKey: string, observedDays: number): Activity365GoalAnalytics {
  const remainingDays = Math.max(0, goal - activeDays);
  const elapsedDays = Math.max(1, Math.min(WINDOW_DAYS, Math.floor(observedDays)));
  const pace = activeDays / elapsedDays;
  const daysLeftInWindow = Math.max(0, WINDOW_DAYS - elapsedDays);
  const requiredDaysPerWeek = daysLeftInWindow > 0 ? Math.min(7, (remainingDays / daysLeftInWindow) * 7) : 0;
  const daysUntilGoal = pace > 0 && remainingDays > 0 ? Math.ceil(remainingDays / pace) : 0;
  return {
    goal,
    chosen,
    activeDays,
    remainingDays,
    // Прогноз держим пустым, пока цель не выбрана юзером — иначе выглядит как навязанная.
    forecastDate: !chosen ? null : remainingDays === 0 ? todayKey : pace > 0 ? addDaysUtcKey(todayKey, daysUntilGoal) : null,
    requiredDaysPerWeek: Math.round(requiredDaysPerWeek * 10) / 10,
    onTrack: remainingDays === 0 || remainingDays <= Math.ceil(daysLeftInWindow * pace),
  };
}

export function valueForFilter(day: Activity365Day, filter: Activity365Filter): number {
  if (filter === 'all') return day.xp;
  return day.metrics[filter];
}

export function levelForFilter(days: Activity365Day[], day: Activity365Day, filter: Activity365Filter): Activity365Level {
  if (filter === 'all') return day.level;
  const values = days.map(d => valueForFilter(d, filter)).filter(v => v > 0).sort((a, b) => a - b);
  const thr = percentileThresholds(values);
  return levelForValue(valueForFilter(day, filter), thr, false);
}

export function activity365ObservedMonthKeys(days: Activity365Day[]): string[] {
  const keys = new Set<string>();
  for (const day of days) {
    if (day.future) continue;
    keys.add(day.date.slice(0, 7));
  }
  return Array.from(keys).sort();
}

const EMPTY_ACTIVITY_365_METRICS: Activity365Day['metrics'] = {
  lessons: 0,
  quizzes: 0,
  review: 0,
  arena: 0,
  wordsLearned: 0,
  phrasesLearned: 0,
  flashcardsSaved: 0,
  dailyTasksClaimed: 0,
  planTasksCompleted: 0,
};

export function emptyActivity365Day(date: string, future = false): Activity365Day {
  return {
    date,
    level: 0,
    xp: 0,
    minutes: 0,
    active: false,
    future,
    metrics: { ...EMPTY_ACTIVITY_365_METRICS },
  };
}

export function latestObservedActivity365Date(days: readonly Activity365Day[]): string | null {
  let latest: string | null = null;
  for (const day of days) {
    if (day.future) continue;
    if (!latest || day.date > latest) latest = day.date;
  }
  return latest;
}

export function activity365MonthGridCells(
  days: readonly Activity365Day[],
  monthKey: string | null,
  todayKey: string | null = latestObservedActivity365Date(days),
): { year: number; month: number; cells: Array<{ day: Activity365Day | null }> } {
  if (!monthKey) return { year: 0, month: 0, cells: [] };
  const monthParts = monthKey.split('-').map((x) => parseInt(x, 10));
  const yy = monthParts[0] ?? NaN;
  const mm = monthParts[1] ?? NaN;
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || mm < 1 || mm > 12) {
    return { year: 0, month: 0, cells: [] };
  }

  const byDate = new Map<string, Activity365Day>();
  for (const day of days) {
    if (day.date.startsWith(`${monthKey}-`)) byDate.set(day.date, day);
  }

  const daysInMonth = new Date(yy, mm, 0).getDate();
  const jsFirstDow = new Date(yy, mm - 1, 1).getDay();
  const leadBlanks = (jsFirstDow + 6) % 7;
  const cells: Array<{ day: Activity365Day | null }> = [];
  for (let i = 0; i < leadBlanks; i++) cells.push({ day: null });
  for (let dn = 1; dn <= daysInMonth; dn++) {
    const dateKey = `${monthKey}-${String(dn).padStart(2, '0')}`;
    const future = todayKey ? dateKey > todayKey : false;
    cells.push({ day: byDate.get(dateKey) ?? emptyActivity365Day(dateKey, future) });
  }
  return { year: yy, month: mm, cells };
}

export function computeActivity365Analytics(params: {
  statsMap: Record<string, unknown>;
  fgDaily: Record<string, number>;
  breakdown: DailyBreakdownStore;
  goal: number;
  /** Юзер выбрал цель явно? Если не передан — считаем дефолтом (не выбрана). */
  goalChosen?: boolean;
  now?: Date;
}): Activity365Analytics {
  const now = params.now ?? new Date();
  const todayKey = toDateKey(now);
  const firstAct = findFirstActivityKey(params.statsMap, params.fgDaily, params.breakdown, todayKey);
  let timelineStart = addDaysUtcKey(todayKey, -(WINDOW_DAYS - 1));
  if (firstAct != null && inclusiveDaySpan(firstAct, todayKey) <= WINDOW_DAYS) {
    timelineStart = firstAct;
  }

  const xpsInWindow: number[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const ds = addDaysUtcKey(timelineStart, i);
    if (ds > todayKey) break;
    const xp = extractPoints(params.statsMap[ds]);
    if (xp > 0) xpsInWindow.push(xp);
  }
  xpsInWindow.sort((a, b) => a - b);
  const thr = percentileThresholds(xpsInWindow);

  const days: Activity365Day[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const ds = addDaysUtcKey(timelineStart, i);
    const xp = ds <= todayKey ? extractPoints(params.statsMap[ds]) : 0;
    const ms = ds <= todayKey ? Math.max(0, Math.floor(Number(params.fgDaily[ds] ?? 0))) : 0;
    const metrics = metricsForRow(params.breakdown[ds]);
    const metricSum = Object.values(metrics).reduce((acc, val) => acc + val, 0);
    const active = ds <= todayKey && (xp > 0 || ms >= MIN_ACTIVE_MS || metricSum > 0);
    days.push({
      date: ds,
      level: levelForValue(xp, thr, active),
      xp,
      minutes: Math.round(ms / 60000),
      active,
      future: ds > todayKey,
      metrics,
    });
  }

  const streaks = summarizeStreaks(days, todayKey);
  const consistencyScore = buildConsistencyScore(streaks);
  const months = summarizeMonths(days, todayKey);
  const insights = buildInsights(days, todayKey, streaks.currentStreak);
  const observedDays = inclusiveDaySpan(timelineStart, todayKey);
  const goal = buildGoal(params.goal, params.goalChosen ?? false, streaks.activeDays, todayKey, observedDays);

  return {
    days,
    ...streaks,
    consistencyScore,
    ...months,
    insights,
    goal,
  };
}

const ANALYTICS_CACHE_TTL_MS = 60_000; // 1 min — avoids recompute on every tab focus
let _analyticsCache: { result: Activity365Analytics; expiresAt: number } | null = null;
let _analyticsInFlight: Promise<Activity365Analytics> | null = null;

export function invalidateActivity365Cache(): void {
  _analyticsCache = null;
}

export async function loadActivity365Analytics(): Promise<Activity365Analytics> {
  const now = Date.now();
  if (_analyticsCache && now < _analyticsCache.expiresAt) {
    return _analyticsCache.result;
  }
  if (_analyticsInFlight) return _analyticsInFlight;

  _analyticsInFlight = (async () => {
    try {
      const [statsRaw, fgDaily, breakdownRaw, goalRaw] = await Promise.all([
        AsyncStorage.getItem('daily_stats'),
        getForegroundDailyMsMap(),
        AsyncStorage.getItem(STATS_DAILY_BREAKDOWN_KEY),
        AsyncStorage.getItem(ACTIVITY_365_GOAL_KEY),
      ]);
      const goalChosen = [100, 180, 365].includes(Number(goalRaw));
      const goal = goalChosen ? Number(goalRaw) : 180;
      const result = computeActivity365Analytics({
        statsMap: parseObject<Record<string, unknown>>(statsRaw),
        fgDaily,
        breakdown: parseObject<DailyBreakdownStore>(breakdownRaw),
        goal,
        goalChosen,
      });
      _analyticsCache = { result, expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS };
      return result;
    } finally {
      _analyticsInFlight = null;
    }
  })();

  return _analyticsInFlight;
}

function rand(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export async function devSeedActivity365Scenario(
  scenario: 'strong' | 'gaps' | 'restart' | 'random' = 'random',
): Promise<Activity365Analytics> {
  const todayKey = toDateKey(new Date());
  const start = addDaysUtcKey(todayKey, -(WINDOW_DAYS - 1));
  const stats: Record<string, { points: number }> = {};
  const fg: Record<string, number> = {};
  const breakdown: DailyBreakdownStore = {};
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const date = addDaysUtcKey(start, i);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    let activeChance = 0.52;
    if (scenario === 'strong') activeChance = i > 40 ? 0.82 : 0.58;
    if (scenario === 'gaps') activeChance = dow === 0 || dow === 6 ? 0.2 : 0.62;
    if (scenario === 'restart') activeChance = i < 285 ? 0.3 : i < 340 ? 0.08 : 0.72;
    const active = Math.random() < activeChance;
    if (!active) continue;
    const points = rand(8, scenario === 'strong' ? 160 : 90);
    stats[date] = { points };
    fg[date] = rand(3, 38) * 60_000;
    breakdown[date] = {
      words_learned: rand(0, 18),
      phrases_learned: rand(0, 24),
      quizzes_completed: rand(0, 4),
      flashcards_saved: rand(0, 8),
      arena_wins: rand(0, 2),
      arena_losses: rand(0, 2),
      daily_tasks_claimed: rand(0, 3),
    };
  }
  await AsyncStorage.multiSet([
    ['daily_stats', JSON.stringify(stats)],
    [FOREGROUND_DAILY_MS_KEY, JSON.stringify(fg)],
    [STATS_DAILY_BREAKDOWN_KEY, JSON.stringify(breakdown)],
    [ACTIVITY_365_GOAL_KEY, '180'],
  ]);
  // Сбрасываем in-memory кэш аналитики, иначе экран статистики/ИИ-разбор
  // подтянут СТАРЫЕ числа (год), если analytics уже грузились до сида.
  invalidateActivity365Cache();
  return computeActivity365Analytics({ statsMap: stats, fgDaily: fg, breakdown, goal: 180 });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
