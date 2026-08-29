/**
 * cards-2.1 (FIX владельца, 2026-08-13): «что даёт счёт в блице?».
 *
 * Счёт раунда сам по себе ни на что не влиял. Смысл ему даёт ЛИЧНЫЙ РЕКОРД:
 * побил прошлый лучший — на экране результата видно «Новый рекорд!», не побил —
 * видно текущий счёт и лучший результат. Никакой новой валюты, наград, осколков
 * и звёзд в разделе не появляется (прямое требование владельца).
 *
 * Хранение локальное, отдельный ключ по образцу остальных ключей раздела
 * (`fc_mode_prefs_v1` → `fc_blitz_best_v1`): существующие ключи не трогаем.
 * Все записи — через одну очередь (withWriteLock, образец mode_prefs.ts).
 * Чистые функции разбора экспортированы для юнит-тестов (tests/fc_blitz_record.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../debug-logger';

export const FC_BLITZ_BEST_KEY = 'fc_blitz_best_v1';

/** Рекорд + когда поставлен (время — на будущее, в UI пока не показываем). */
export type FcBlitzRecord = {
  best: number;
  updatedAt: number;
};

export const EMPTY_BLITZ_RECORD: FcBlitzRecord = { best: 0, updatedAt: 0 };

/** Счёт всегда неотрицательное целое: мусор/NaN/бесконечность → 0. */
export function normalizeScore(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0;
  return n > 0 ? n : 0;
}

/** Толерантный разбор сырого JSON — битые/чужие поля отбрасываются молча. */
export function parseBlitzRecord(raw: string | null | undefined): FcBlitzRecord {
  if (!raw || !raw.trim()) return EMPTY_BLITZ_RECORD;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_BLITZ_RECORD;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_BLITZ_RECORD;
  const row = parsed as Record<string, unknown>;
  return {
    best: normalizeScore(row.best),
    updatedAt: normalizeScore(row.updatedAt),
  };
}

/**
 * Итог раунда против прошлого рекорда. Рекорд засчитывается только СТРОГО выше
 * прошлого (повтор того же числа рекордом не считается) и только при ненулевом
 * счёте: «новый рекорд: 0» на первом же брошенном раунде — обман.
 */
export type FcBlitzScoreOutcome = {
  /** Счёт этого раунда (нормализованный). */
  score: number;
  /** Лучший результат ПОСЛЕ этого раунда. */
  best: number;
  /** Прошлый лучший — до этого раунда. */
  previousBest: number;
  isRecord: boolean;
};

export function applyBlitzScore(previousBest: unknown, score: unknown): FcBlitzScoreOutcome {
  const prev = normalizeScore(previousBest);
  const value = normalizeScore(score);
  const isRecord = value > 0 && value > prev;
  return { score: value, best: isRecord ? value : prev, previousBest: prev, isRecord };
}

// ── Хранение: очередь записи + in-memory кэш ─────────────────────────────────

let recordMemory: FcBlitzRecord | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();
function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(() => fn());
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Только для юнит-тестов: сброс модульного состояния. */
export function __resetBlitzRecordForTests(): void {
  recordMemory = null;
  writeQueue = Promise.resolve();
}

/** Лучший результат (0 — рекорда ещё нет). Никогда не бросает. */
export async function getBlitzBest(): Promise<number> {
  if (recordMemory) return recordMemory.best;
  try {
    const record = parseBlitzRecord(await AsyncStorage.getItem(FC_BLITZ_BEST_KEY));
    recordMemory = record;
    return record.best;
  } catch {
    return recordMemory?.best ?? 0;
  }
}

/**
 * Записать итог раунда. Возвращает исход (счёт / рекорд / побит ли) — экран
 * результата рисует по нему подпись. Запись fail-soft: память обновлена,
 * следующая успешная запись перезапишет диск.
 */
export function commitBlitzScore(score: number, now = Date.now()): Promise<FcBlitzScoreOutcome> {
  return withWriteLock(async () => {
    let previousBest = 0;
    try {
      const record = parseBlitzRecord(await AsyncStorage.getItem(FC_BLITZ_BEST_KEY));
      recordMemory = record;
      previousBest = record.best;
    } catch {
      previousBest = recordMemory?.best ?? 0;
    }
    const outcome = applyBlitzScore(previousBest, score);
    if (!outcome.isRecord) return outcome;
    const next: FcBlitzRecord = { best: outcome.best, updatedAt: normalizeScore(now) };
    recordMemory = next;
    try {
      await AsyncStorage.setItem(FC_BLITZ_BEST_KEY, JSON.stringify(next));
    } catch (e) {
      // fail-soft: рекорд уже в памяти, следующий успешный write его сохранит
      DebugLogger.error('blitz_record:outcome', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    return outcome;
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
