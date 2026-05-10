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

const STORAGE_KEY = 'mistake_log_v1';
/** Максимум записей в буфере — старые вытесняются. */
const MAX_ENTRIES = 500;
/** Окно аналитики (30 дней в мс). */
const ANALYTICS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type MistakeMode = 'lesson' | 'lesson_words' | 'quiz' | 'trainer';

/** Классификация ошибки (грубая, без NLP). */
export type MistakeWhat = 'wrong_pick' | 'wrong_order' | 'forgot';

export interface MistakeEntry {
  /** Английская фраза (ключ совпадает с RecallItem.phrase). */
  phrase: string;
  lessonId: number;
  mode: MistakeMode;
  what: MistakeWhat;
  /** Unix timestamp (мс). */
  ts: number;
}

export interface PhraseMistakeStat {
  phrase: string;
  lessonId: number;
  count: number;
  lastTs: number;
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

/** Сохранить список (trimmed to MAX_ENTRIES, newest last). */
const save = async (entries: MistakeEntry[]): Promise<void> => {
  try {
    const trimmed = entries.slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    DebugLogger.error('mistake_log:save', error, 'warning');
  }
};

// Последовательная очередь записей — предотвращает потерю данных при конкурентных вызовах
let writeQueue: Promise<void> = Promise.resolve();

/** Дождаться завершения всех pending logMistake вызовов. Используется в тестах. */
export const flushMistakeLog = (): Promise<void> => writeQueue;

/** Загрузить все записи из хранилища. */
export const loadMistakeLog = async (): Promise<MistakeEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return parseEntries(raw);
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
): void => {
  const normalizedPhrase = phrase?.trim();
  if (!normalizedPhrase || !Number.isFinite(lessonId) || lessonId <= 0) return;
  const entry: MistakeEntry = { phrase: normalizedPhrase, lessonId, mode, what, ts: Date.now() };
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
