import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatCompactNumber } from '../format_compact_number';
import {
  activeRecallItemsKey,
  mistakeLogKey,
  statsDailyBreakdownKey,
  storageStudyTarget,
  type RuntimeStudyTarget,
} from '../target_storage_keys';

const EVENING_START_HOUR = 18;
const FREE_USED_KEY = 'compass_day_closing_free_used_v1';
const SEEN_PREFIX = 'compass_day_closing_seen_v1';
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_MISTAKE_WINDOW_MS = 30 * DAY_MS;
const FRESH_RECALL_WINDOW_MS = 7 * DAY_MS;
const WEAK_EASE_THRESHOLD = 1.7;
const HARD_ERROR_THRESHOLD = 3;
const SESSION_LIMIT = 7;

type DailyStatsRow = { points?: unknown; streak?: unknown };
type DailyStatsStore = Record<string, DailyStatsRow | number | null | undefined>;

type DailyBreakdownRow = Partial<Record<
  | 'phrases_learned'
  | 'flashcards_saved'
  | 'quizzes_completed'
  | 'daily_tasks_claimed'
  | 'plan_tasks_completed'
  | 'arena_wins'
  | 'arena_losses',
  unknown
>>;
type DailyBreakdownStore = Record<string, DailyBreakdownRow | null | undefined>;
type StoredRecallItem = {
  phrase?: unknown;
  nextDue?: unknown;
  easeFactor?: unknown;
  errorCount?: unknown;
  createdAt?: unknown;
  repetitions?: unknown;
};
type StoredMistakeEntry = {
  phrase?: unknown;
  ts?: unknown;
  category?: unknown;
  rawCategory?: unknown;
};

export type DayClosingHighlightKind =
  | 'phrases'
  | 'xp'
  | 'plan'
  | 'tasks'
  | 'cards'
  | 'rounds'
  | 'streak';

export interface DayClosingHighlight {
  kind: DayClosingHighlightKind;
  value: string;
}

export type DayClosingFocusKind =
  | 'due'
  | 'weak_phrase'
  | 'weak_area'
  | 'targeted_review'
  | 'fresh_phrases'
  | 'cards'
  | 'plan'
  | 'round'
  | 'one_phrase';

export interface DayClosingFocus {
  kind: DayClosingFocusKind;
  value?: string;
  rawCount?: number;
  phrase?: string;
  category?: string;
}

export interface DayClosingRitual {
  dateKey: string;
  isPremium: boolean;
  /**
   * Запертая витрина для бесплатного: полный ритуал уже был показан один раз,
   * дальше цифры и фокус прячутся за замком + мост к полному доступу.
   * undefined/false = полный ритуал (премиум или первый бесплатный раз).
   */
  locked?: boolean;
  xpToday: number;
  streak: number;
  phrasesLearned: number;
  flashcardsSaved: number;
  quizzesCompleted: number;
  dailyTasksClaimed: number;
  planTasksCompleted: number;
  highlights: DayClosingHighlight[];
  repeatKind: 'fresh_phrases' | 'cards' | 'plan' | 'round' | 'one_phrase';
  focus: DayClosingFocus;
}

export function dayClosingSeenKey(studyTarget: RuntimeStudyTarget, dateKey: string): string {
  return `${SEEN_PREFIX}_${storageStudyTarget(studyTarget)}_${dateKey}`;
}

export function dayClosingFreeUsedKey(): string {
  return FREE_USED_KEY;
}

export function utcDateKey(nowMs: number): string {
  return new Date(nowMs).toISOString().split('T')[0];
}

export function isDayClosingWindow(nowMs: number): boolean {
  return new Date(nowMs).getHours() >= EVENING_START_HOUR;
}

function readNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function parseJsonObject<T extends object>(raw: string | null): T {
  if (!raw) return {} as T;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function dayPoints(row: DailyStatsStore[string]): number {
  if (typeof row === 'number') return readNumber(row);
  if (row && typeof row === 'object') return readNumber(row.points);
  return 0;
}

function endOfLocalDayMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function normalizeCategory(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const key = value.trim().toLowerCase();
  return key || undefined;
}

function compactPhrase(value: string): string {
  const oneLine = value.trim().replace(/\s+/g, ' ');
  if (oneLine.length <= 44) return oneLine;
  return `${oneLine.slice(0, 41).trim()}...`;
}

function readRecallStats(raw: string | null, nowMs: number): {
  dueCount: number;
  weakCount: number;
  hardCount: number;
  freshCount: number;
} {
  const end = endOfLocalDayMs(nowMs);
  const freshStart = nowMs - FRESH_RECALL_WINDOW_MS;
  const items = parseJsonArray<StoredRecallItem>(raw)
    .filter((item) => typeof item?.phrase === 'string' && item.phrase.trim().length > 0);

  const dueCount = items.filter((item) => readNumber(item.nextDue) > 0 && readNumber(item.nextDue) <= end).length;
  const weakCount = items.filter((item) => {
    const ease = Number(item.easeFactor);
    return (Number.isFinite(ease) && ease <= WEAK_EASE_THRESHOLD) || readNumber(item.errorCount) >= 2;
  }).length;
  const hardCount = items.filter((item) => readNumber(item.errorCount) >= HARD_ERROR_THRESHOLD).length;
  const freshCount = items.filter((item) => readNumber(item.createdAt) >= freshStart && readNumber(item.repetitions) < 3).length;
  return { dueCount, weakCount, hardCount, freshCount };
}

function readMistakeStats(raw: string | null, nowMs: number): {
  topPhrase?: string;
  topPhraseCount: number;
  topCategory?: string;
  topCategoryCount: number;
} {
  const recentStart = nowMs - RECENT_MISTAKE_WINDOW_MS;
  const phraseCounts = new Map<string, { phrase: string; count: number; lastTs: number }>();
  const categoryCounts = new Map<string, number>();

  for (const entry of parseJsonArray<StoredMistakeEntry>(raw)) {
    const phrase = typeof entry.phrase === 'string' ? entry.phrase.trim() : '';
    const ts = readNumber(entry.ts);
    if (!phrase || ts < recentStart) continue;

    const phraseKey = phrase.toLowerCase();
    const prev = phraseCounts.get(phraseKey);
    if (prev) {
      prev.count += 1;
      if (ts > prev.lastTs) prev.lastTs = ts;
    } else {
      phraseCounts.set(phraseKey, { phrase, count: 1, lastTs: ts });
    }

    const category = normalizeCategory(entry.category) ?? normalizeCategory(entry.rawCategory);
    if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
  }

  const topPhrase = Array.from(phraseCounts.values())
    .sort((a, b) => b.count - a.count || b.lastTs - a.lastTs)[0];
  const topCategory = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return {
    topPhrase: topPhrase ? compactPhrase(topPhrase.phrase) : undefined,
    topPhraseCount: topPhrase?.count ?? 0,
    topCategory: topCategory?.[0],
    topCategoryCount: topCategory?.[1] ?? 0,
  };
}

function chooseRepeatKind(row: {
  phrasesLearned: number;
  flashcardsSaved: number;
  planTasksCompleted: number;
  quizzesCompleted: number;
}): DayClosingRitual['repeatKind'] {
  if (row.phrasesLearned > 0) return 'fresh_phrases';
  if (row.flashcardsSaved > 0) return 'cards';
  if (row.planTasksCompleted > 0) return 'plan';
  if (row.quizzesCompleted > 0) return 'round';
  return 'one_phrase';
}

function chooseFocus(input: {
  base: {
    phrasesLearned: number;
    flashcardsSaved: number;
    planTasksCompleted: number;
    quizzesCompleted: number;
  };
  recall: ReturnType<typeof readRecallStats>;
  mistakes: ReturnType<typeof readMistakeStats>;
}): DayClosingFocus {
  if (input.mistakes.topPhrase && input.mistakes.topPhraseCount >= 2) {
    return {
      kind: 'weak_phrase',
      phrase: input.mistakes.topPhrase,
      rawCount: input.mistakes.topPhraseCount,
      value: formatCompactNumber(input.mistakes.topPhraseCount),
    };
  }
  if (input.recall.dueCount > 0) {
    const count = Math.min(SESSION_LIMIT, input.recall.dueCount);
    return { kind: 'due', rawCount: count, value: formatCompactNumber(count) };
  }
  if (input.mistakes.topCategory && input.mistakes.topCategoryCount >= 2) {
    return {
      kind: 'weak_area',
      category: input.mistakes.topCategory,
      rawCount: input.mistakes.topCategoryCount,
      value: formatCompactNumber(input.mistakes.topCategoryCount),
    };
  }
  if (input.recall.weakCount > 0 || input.recall.hardCount > 0) {
    const count = Math.min(SESSION_LIMIT, Math.max(input.recall.weakCount, input.recall.hardCount, input.recall.freshCount, 1));
    return { kind: 'targeted_review', rawCount: count, value: formatCompactNumber(count) };
  }

  return { kind: chooseRepeatKind(input.base) };
}

function buildHighlights(input: Omit<DayClosingRitual, 'dateKey' | 'isPremium' | 'highlights' | 'repeatKind' | 'focus'>): DayClosingHighlight[] {
  const items: DayClosingHighlight[] = [];
  if (input.phrasesLearned > 0) items.push({ kind: 'phrases', value: formatCompactNumber(input.phrasesLearned) });
  if (input.xpToday > 0) items.push({ kind: 'xp', value: formatCompactNumber(input.xpToday) });
  if (input.planTasksCompleted > 0) items.push({ kind: 'plan', value: formatCompactNumber(input.planTasksCompleted) });
  if (input.dailyTasksClaimed > 0) items.push({ kind: 'tasks', value: formatCompactNumber(input.dailyTasksClaimed) });
  if (input.flashcardsSaved > 0) items.push({ kind: 'cards', value: formatCompactNumber(input.flashcardsSaved) });
  if (input.quizzesCompleted > 0) items.push({ kind: 'rounds', value: formatCompactNumber(input.quizzesCompleted) });
  if (input.streak > 0) items.push({ kind: 'streak', value: formatCompactNumber(input.streak) });
  return items.slice(0, 3);
}

export function shouldBlockDayClosingForFree(params: {
  hasPremiumAccess: boolean;
  freeUsed: string | null;
}): boolean {
  return !params.hasPremiumAccess && params.freeUsed != null;
}

export async function markDayClosingSeen(params: {
  studyTarget: RuntimeStudyTarget;
  dateKey: string;
  hasPremiumAccess: boolean;
}): Promise<void> {
  const pairs: [string, string][] = [[dayClosingSeenKey(params.studyTarget, params.dateKey), '1']];
  if (!params.hasPremiumAccess) pairs.push([FREE_USED_KEY, '1']);
  await AsyncStorage.multiSet(pairs).catch(() => {});
}

export async function loadDayClosingRitual(params: {
  studyTarget: RuntimeStudyTarget;
  nowMs: number;
  hasPremiumAccess: boolean;
}): Promise<DayClosingRitual | null> {
  const { studyTarget, nowMs, hasPremiumAccess } = params;
  if (!isDayClosingWindow(nowMs)) return null;

  const dateKey = utcDateKey(nowMs);
  const [seen, freeUsed, dailyStatsRaw, breakdownRaw, streakRaw, recallRaw, mistakesRaw] = await AsyncStorage.multiGet([
    dayClosingSeenKey(studyTarget, dateKey),
    FREE_USED_KEY,
    'daily_stats',
    statsDailyBreakdownKey(studyTarget),
    'streak_count',
    activeRecallItemsKey(studyTarget),
    mistakeLogKey(studyTarget),
  ]).catch(() => [] as [string, string | null][]);

  const values = new Map<string, string | null>([seen, freeUsed, dailyStatsRaw, breakdownRaw, streakRaw, recallRaw, mistakesRaw].filter(Boolean) as [string, string | null][]);
  if (values.get(dayClosingSeenKey(studyTarget, dateKey)) != null) return null;
  // Бесплатный после первого полного ритуала НЕ теряет вечер молча: получает ту
  // же модалку, но запертую (цифры спрятаны, фокус-тизер, мост к полному доступу).
  const locked = shouldBlockDayClosingForFree({ hasPremiumAccess, freeUsed: values.get(FREE_USED_KEY) ?? null });

  const dailyStats = parseJsonObject<DailyStatsStore>(values.get('daily_stats') ?? null);
  const breakdown = parseJsonObject<DailyBreakdownStore>(values.get(statsDailyBreakdownKey(studyTarget)) ?? null);
  const row = breakdown[dateKey] ?? {};
  const xpToday = dayPoints(dailyStats[dateKey]);
  const base = {
    xpToday,
    streak: readNumber(values.get('streak_count')),
    phrasesLearned: readNumber(row.phrases_learned),
    flashcardsSaved: readNumber(row.flashcards_saved),
    quizzesCompleted: readNumber(row.quizzes_completed),
    dailyTasksClaimed: readNumber(row.daily_tasks_claimed),
    planTasksCompleted: readNumber(row.plan_tasks_completed),
  };

  const hasActivity =
    base.xpToday > 0 ||
    base.phrasesLearned > 0 ||
    base.flashcardsSaved > 0 ||
    base.quizzesCompleted > 0 ||
    base.dailyTasksClaimed > 0 ||
    base.planTasksCompleted > 0 ||
    readNumber(row.arena_wins) > 0 ||
    readNumber(row.arena_losses) > 0;
  if (!hasActivity) return null;

  const highlights = buildHighlights(base);
  if (highlights.length === 0) return null;
  const recall = readRecallStats(values.get(activeRecallItemsKey(studyTarget)) ?? null, nowMs);
  const mistakes = readMistakeStats(values.get(mistakeLogKey(studyTarget)) ?? null, nowMs);

  return {
    dateKey,
    isPremium: hasPremiumAccess,
    locked,
    ...base,
    highlights,
    repeatKind: chooseRepeatKind(base),
    focus: chooseFocus({ base, recall, mistakes }),
  };
}
