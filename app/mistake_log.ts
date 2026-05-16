// ════════════════════════════════════════════════════════════════════════════
// mistake_log.ts — аналитический лог ошибок (НЕ SRS)
//
// Отличие от active_recall.ts:
//  - active_recall хранит RecallItem (SM-2 планировщик) → «когда повторять»
//  - mistake_log хранит сырые события ошибок → «где ошибаюсь» (аналитика)
//
// Используется для:
//  - Plan 04 (Premium Analytics): «Mistake Patterns» — самые частые ошибки
//  - Trainer «Слабые места»: top-N фраз по ошибкам за последние 30 дней
//
// Storage: FIFO buffer 500 записей, CircularJSON сохраняет в AsyncStorage.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { isCategory, normalizeTokenKey, normalizeWordCategory, type WordCategory } from './pos_taxonomy';

const STORAGE_KEY = 'mistake_log_v1';
/** Максимум записей в буфере — старые вытесняются после compaction. */
const MAX_ENTRIES = 2000;
const MAX_LEGACY_ENTRIES_WHEN_FULL = 250;
/** Окно аналитики (30 дней в мс). */
const ANALYTICS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type MistakeMode = 'lesson' | 'lesson_words' | 'quiz' | 'trainer' | 'diagnostic' | 'coach' | 'exam' | 'arena';

/** Классификация ошибки (грубая, без NLP). */
export type MistakeWhat = 'wrong_pick' | 'wrong_order' | 'forgot';

export interface MistakeTokenMeta {
  phraseId?: string | number;
  tokenText?: string;
  tokenIndex?: number;
  expected?: string;
  picked?: string;
  rawCategory?: string;
  category?: WordCategory;
  grammarTag?: string;
}

export interface MistakeEntry {
  /** Английская фраза (ключ совпадает с RecallItem.phrase). */
  phrase: string;
  lessonId: number;
  mode: MistakeMode;
  what: MistakeWhat;
  phraseId?: string | number;
  tokenText?: string;
  tokenIndex?: number;
  expected?: string;
  picked?: string;
  rawCategory?: string;
  category?: WordCategory;
  grammarTag?: string;
  version?: 1 | 2;
  /** Unix timestamp (мс). */
  ts: number;
}

export interface PhraseMistakeStat {
  phrase: string;
  lessonId: number;
  count: number;
  lastTs: number;
}

export interface PhraseMistakeCategoryStat extends PhraseMistakeStat {
  categoryCounts: Partial<Record<WordCategory, number>>;
  exactCategoryCounts: Partial<Record<WordCategory, number>>;
  topCategory?: WordCategory;
  topCategoryCount: number;
}

export interface MistakeLogDebugEvent {
  phrase: string;
  lessonId: number;
  mode: MistakeMode;
  what: MistakeWhat;
  tokenText?: string;
  tokenIndex?: number;
  expected?: string;
  picked?: string;
  rawCategory?: string;
  storedCategory?: WordCategory;
  resolvedCategory?: WordCategory;
  grammarTag?: string;
  categorySource: string;
  confidence: number;
  exactSignal: boolean;
  version?: 1 | 2;
  ts: number;
  ageDays: number;
}

export interface MistakeLogDebugSnapshot {
  total: number;
  exact: number;
  legacy: number;
  unresolved: number;
  exactCoveragePct: number;
  byMode: Array<{ mode: MistakeMode; count: number }>;
  byCategory: Array<{ category: WordCategory; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  events: MistakeLogDebugEvent[];
}

// ── Read / Write ──────────────────────────────────────────────────────────────

const parseEntries = (raw: string | null): MistakeEntry[] => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as MistakeEntry[]) : [];
  } catch {
    return [];
  }
};

function isValidStoredEntry(entry: MistakeEntry): boolean {
  return Boolean(
    entry.phrase?.trim() &&
    Number.isFinite(entry.lessonId) &&
    entry.lessonId >= 0 &&
    !(entry.lessonId === 0 && entry.mode !== 'diagnostic' && entry.mode !== 'coach') &&
    Number.isFinite(entry.ts),
  );
}

function compactEntriesForStorage(entries: MistakeEntry[], now = Date.now()): MistakeEntry[] {
  const windowStart = now - ANALYTICS_WINDOW_MS;
  const recent = entries
    .filter(isValidStoredEntry)
    .filter((entry) => entry.ts >= windowStart)
    .sort((a, b) => a.ts - b.ts);

  if (recent.length <= MAX_ENTRIES) return recent;

  const exact = recent.filter(hasExactCategorySignal);
  const legacy = recent.filter((entry) => !hasExactCategorySignal(entry));
  const legacyBudget = Math.min(MAX_LEGACY_ENTRIES_WHEN_FULL, Math.max(0, MAX_ENTRIES - exact.length));
  return [...legacy.slice(-legacyBudget), ...exact.slice(-MAX_ENTRIES)]
    .sort((a, b) => a.ts - b.ts)
    .slice(-MAX_ENTRIES);
}

/** Сохранить список (compacted to MAX_ENTRIES, newest last). */
const save = async (entries: MistakeEntry[]): Promise<void> => {
  try {
    const trimmed = compactEntriesForStorage(entries);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    DebugLogger.error('mistake_log:save', error, 'warning');
  }
};

// Последовательная очередь записей — предотвращает потерю данных при конкурентных вызовах
let writeQueue: Promise<void> = Promise.resolve();

/** Дождаться завершения всех pending logMistake вызовов. Используется в тестах. */
export const flushMistakeLog = (): Promise<void> => writeQueue;

export const compactMistakeLog = async (): Promise<void> => {
  await flushMistakeLog();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    await save(parseEntries(raw));
  } catch (error) {
    DebugLogger.error('mistake_log:compact', error, 'warning');
  }
};

/** Загрузить все записи из хранилища. */
export const loadMistakeLog = async (): Promise<MistakeEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return compactEntriesForStorage(parseEntries(raw));
  } catch (error) {
    DebugLogger.error('mistake_log:load', error, 'warning');
    return [];
  }
};

// ── Record ────────────────────────────────────────────────────────────────────

/**
 * Записать ошибку в лог. Fire-and-forget (не блокирует UI).
 * Арена НЕ пишется в лог (по дизайн-решению — не учебный режим).
 */
export const logMistake = (
  phrase: string,
  lessonId: number,
  mode: MistakeMode,
  what: MistakeWhat,
  meta: MistakeTokenMeta = {},
): void => {
  const normalizedPhrase = phrase?.trim();
  if (
    !normalizedPhrase ||
    !Number.isFinite(lessonId) ||
    lessonId < 0 ||
    (lessonId === 0 && mode !== 'diagnostic' && mode !== 'coach')
  ) return;
  const normalizedToken =
    meta.tokenText?.trim() ||
    meta.expected?.trim() ||
    (mode === 'lesson_words' ? normalizedPhrase : '');
  const resolved = isCategory(meta.category)
    ? { category: meta.category, grammarTag: meta.grammarTag }
    : normalizeWordCategory(meta.rawCategory, normalizedToken);
  const hasMeta = Object.values(meta).some((value) => value !== undefined && value !== null && value !== '');
  const entry: MistakeEntry = {
    phrase: normalizedPhrase,
    lessonId,
    mode,
    what,
    phraseId: meta.phraseId,
    tokenText: normalizedToken || undefined,
    tokenIndex: Number.isFinite(meta.tokenIndex) ? meta.tokenIndex : undefined,
    expected: meta.expected?.trim() || undefined,
    picked: meta.picked?.trim() || undefined,
    rawCategory: meta.rawCategory,
    category: resolved.category !== 'other' ? resolved.category : undefined,
    grammarTag: resolved.grammarTag || meta.grammarTag,
    version: hasMeta ? 2 : 1,
    ts: Date.now(),
  };
  // Цепочка гарантирует, что конкурентные вызовы не потеряют записи (read-modify-write)
  writeQueue = writeQueue.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const entries = parseEntries(raw);
      entries.push(entry);
      await save(entries);
    } catch (error) {
      DebugLogger.error('mistake_log:logMistake', error, 'warning');
    }
  });
};

// ── Analytics ────────────────────────────────────────────────────────────────

/**
 * Самые частые ошибки за последние 30 дней, sorted by count DESC.
 * @param limit - максимальное кол-во результатов (default 20)
 */
export const normalizeMistakeToken = normalizeTokenKey;

export function getMistakeEntryCategory(
  entry: Pick<MistakeEntry, 'category' | 'rawCategory' | 'tokenText' | 'expected' | 'mode' | 'phrase'>,
): WordCategory | undefined {
  if (entry.category && entry.category !== 'other') return entry.category;
  const token = entry.tokenText || entry.expected || (entry.mode === 'lesson_words' ? entry.phrase : undefined);
  const resolved = normalizeWordCategory(entry.rawCategory, token);
  return resolved.category !== 'other' ? resolved.category : undefined;
}

function hasExactCategorySignal(entry: MistakeEntry): boolean {
  return Boolean(entry.category || entry.tokenText || entry.expected || entry.rawCategory || entry.mode === 'lesson_words');
}

function countMapValue<T extends string>(map: Map<T, number>, key: T | undefined): void {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toDebugEvent(entry: MistakeEntry, now: number): MistakeLogDebugEvent {
  const token = entry.tokenText || entry.expected || (entry.mode === 'lesson_words' ? entry.phrase : undefined);
  const normalized = entry.category && entry.category !== 'other'
    ? {
        category: entry.category,
        source: 'stored',
        confidence: 1,
        grammarTag: entry.grammarTag,
      }
    : normalizeWordCategory(entry.rawCategory, token);
  const resolvedCategory = normalized.category !== 'other' ? normalized.category : undefined;
  return {
    phrase: entry.phrase,
    lessonId: entry.lessonId,
    mode: entry.mode,
    what: entry.what,
    tokenText: entry.tokenText,
    tokenIndex: entry.tokenIndex,
    expected: entry.expected,
    picked: entry.picked,
    rawCategory: entry.rawCategory,
    storedCategory: entry.category,
    resolvedCategory,
    grammarTag: normalized.grammarTag || entry.grammarTag,
    categorySource: normalized.source,
    confidence: normalized.confidence,
    exactSignal: hasExactCategorySignal(entry),
    version: entry.version,
    ts: entry.ts,
    ageDays: Math.round(Math.max(0, (now - entry.ts) / (24 * 60 * 60 * 1000)) * 10) / 10,
  };
}

export const getMistakeLogDebugSnapshot = async (limit = 40): Promise<MistakeLogDebugSnapshot> => {
  const now = Date.now();
  const entries = await loadMistakeLog();
  const byMode = new Map<MistakeMode, number>();
  const byCategory = new Map<WordCategory, number>();
  const bySource = new Map<string, number>();
  let exact = 0;
  let unresolved = 0;

  const events = [...entries]
    .sort((a, b) => b.ts - a.ts)
    .map((entry) => {
      const event = toDebugEvent(entry, now);
      if (event.exactSignal) exact += 1;
      if (!event.resolvedCategory) unresolved += 1;
      countMapValue(byMode, event.mode);
      countMapValue(byCategory, event.resolvedCategory);
      countMapValue(bySource, event.categorySource);
      return event;
    });

  return {
    total: entries.length,
    exact,
    legacy: Math.max(0, entries.length - exact),
    unresolved,
    exactCoveragePct: entries.length > 0 ? Math.round((exact / entries.length) * 100) : 0,
    byMode: Array.from(byMode.entries())
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count || a.mode.localeCompare(b.mode)),
    byCategory: Array.from(byCategory.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    bySource: Array.from(bySource.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    events: events.slice(0, limit),
  };
};

export const getTopMistakePhrases = async (limit = 20): Promise<PhraseMistakeStat[]> => {
  try {
    const entries = await loadMistakeLog();
    const windowStart = Date.now() - ANALYTICS_WINDOW_MS;
    const recent = entries.filter((e) => e.ts >= windowStart);
    const map = new Map<string, PhraseMistakeStat>();
    for (const e of recent) {
      const key = e.phrase.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (e.ts > existing.lastTs) existing.lastTs = e.ts;
      } else {
        map.set(key, { phrase: e.phrase.trim(), lessonId: e.lessonId, count: 1, lastTs: e.ts });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    DebugLogger.error('mistake_log:getTopMistakePhrases', error, 'warning');
    return [];
  }
};

export const getTopMistakePhraseDetails = async (
  limit = 20,
  minCount = 1,
): Promise<PhraseMistakeCategoryStat[]> => {
  try {
    const entries = await loadMistakeLog();
    const windowStart = Date.now() - ANALYTICS_WINDOW_MS;
    const recent = entries.filter((e) => e.ts >= windowStart);
    const map = new Map<string, PhraseMistakeCategoryStat>();

    for (const e of recent) {
      const key = e.phrase.trim().toLowerCase();
      const existing = map.get(key) ?? {
        phrase: e.phrase.trim(),
        lessonId: e.lessonId,
        count: 0,
        lastTs: e.ts,
        categoryCounts: {},
        exactCategoryCounts: {},
        topCategoryCount: 0,
      };

      existing.count += 1;
      if (e.ts > existing.lastTs) existing.lastTs = e.ts;

      const category = getMistakeEntryCategory(e);
      if (category) {
        existing.categoryCounts[category] = (existing.categoryCounts[category] ?? 0) + 1;
        if (hasExactCategorySignal(e)) {
          existing.exactCategoryCounts[category] = (existing.exactCategoryCounts[category] ?? 0) + 1;
        }
        const count = existing.categoryCounts[category] ?? 0;
        if (!existing.topCategory || count > existing.topCategoryCount) {
          existing.topCategory = category;
          existing.topCategoryCount = count;
        }
      }

      map.set(key, existing);
    }

    return Array.from(map.values())
      .filter((s) => s.count >= minCount)
      .sort((a, b) => b.count - a.count || b.lastTs - a.lastTs)
      .slice(0, limit);
  } catch (error) {
    DebugLogger.error('mistake_log:getTopMistakePhraseDetails', error, 'warning');
    return [];
  }
};

/**
 * Фразы-кандидаты для режима «Слабые места» Тренера:
 * top-N фраз из лога ошибок за 30 дней, с ≥ minCount ошибками.
 */
export const getWeakPhrases = async (limit = 20, minCount = 2): Promise<string[]> => {
  const stats = await getTopMistakePhrases(limit * 2);
  return stats
    .filter((s) => s.count >= minCount)
    .slice(0, limit)
    .map((s) => s.phrase);
};

/**
 * Общая статистика по уроку — сколько ошибок за 30 дней в этом уроке.
 */
export const getMistakeCountByLesson = async (): Promise<Record<number, number>> => {
  try {
    const entries = await loadMistakeLog();
    const windowStart = Date.now() - ANALYTICS_WINDOW_MS;
    const result: Record<number, number> = {};
    for (const e of entries) {
      if (e.ts < windowStart) continue;
      result[e.lessonId] = (result[e.lessonId] ?? 0) + 1;
    }
    return result;
  } catch {
    return {};
  }
};

/** Сколько записей в логе (для диагностики). */
export const getMistakeLogCount = async (): Promise<number> => {
  const entries = await loadMistakeLog();
  return entries.length;
};

/** Очистить лог (для тестов / reset). */
export const clearMistakeLog = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    // Сбрасываем кэш индекса phrase_analytics чтобы следующий запрос пересчитал
    const { invalidatePhraseIndex } = await import('./phrase_analytics');
    invalidatePhraseIndex();
  } catch (error) {
    DebugLogger.error('mistake_log:clear', error, 'warning');
  }
};

/* expo-router route shim */
export default function __RouteShim() { return null; }
