/**
 * cards-2.0 (E13): «сила слова» — точки Weak/Medium/Strong на карточках (§2).
 *
 * Маппинг из SRS-данных (никакой своей записи — только чтение):
 *  - active_recall_items (SM-2): interval 1–3 дн → weak, 7–14 → medium, ≥30 → strong;
 *  - trainer_store_v1 (correctStreak → INTERVALS [1,3,7,14,30]): streak 0–1 → weak,
 *    2–3 → medium, ≥4 → strong.
 * Карточка без данных — «не тренировалась» (null, точки не рисуем).
 * При наличии обоих источников берём более сильный (лучший прогресс не прячем).
 *
 * Ключ — нормализованный EN (englishRecallSurface + lowercase): recall-фразы
 * хранятся с chunk-маркерами ` — `, карточки — обычной прозой.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { englishRecallSurface } from '../phrase_target_utils';

export type WordStrength = 'weak' | 'medium' | 'strong';

/** Пороги §2: интервалы SRS 1–3 → Weak, 7–14 → Medium, 30 → Strong. */
export const STRENGTH_MEDIUM_MIN_INTERVAL_DAYS = 7;
export const STRENGTH_STRONG_MIN_INTERVAL_DAYS = 30;

/** По SM-2 записи active_recall_items. Чистая. */
export function strengthFromSrs(intervalDays: number, repetitions: number): WordStrength {
  const interval = Number.isFinite(intervalDays) ? intervalDays : 0;
  const reps = Number.isFinite(repetitions) ? repetitions : 0;
  if (reps <= 0) return 'weak'; // ошибка записана, верных повторов ещё нет
  if (interval >= STRENGTH_STRONG_MIN_INTERVAL_DAYS) return 'strong';
  if (interval >= STRENGTH_MEDIUM_MIN_INTERVAL_DAYS) return 'medium';
  return 'weak';
}

/**
 * По trainer_store correctStreak (INTERVALS [1,3,7,14,30]): следующий интервал
 * для streak N — INTERVALS[min(N, 4)] → те же пороги, что strengthFromSrs.
 */
export function strengthFromStreak(correctStreak: number): WordStrength {
  const streak = Number.isFinite(correctStreak) ? Math.max(0, Math.floor(correctStreak)) : 0;
  if (streak >= 4) return 'strong'; // интервал 30
  if (streak >= 2) return 'medium'; // интервалы 7 / 14
  return 'weak'; // интервалы 1 / 3
}

const STRENGTH_RANK: Record<WordStrength, number> = { weak: 1, medium: 2, strong: 3 };

/** Число точек для UI (1/2/3). */
export function strengthDotCount(s: WordStrength): 1 | 2 | 3 {
  return STRENGTH_RANK[s] as 1 | 2 | 3;
}

export function strongerOf(a: WordStrength, b: WordStrength): WordStrength {
  return STRENGTH_RANK[a] >= STRENGTH_RANK[b] ? a : b;
}

/** Нормализованный ключ EN-текста карточки/фразы. */
export function strengthKey(en: string): string {
  return englishRecallSurface(en ?? '').toLowerCase();
}

/** Подмножества входных записей — только нужные поля (толерантно к лишним). */
export type SrsLikeItem = { phrase?: unknown; interval?: unknown; repetitions?: unknown };
export type TrainerLikeItem = { key?: unknown; correctStreak?: unknown; archived?: unknown };

export type WordStrengthMap = Map<string, WordStrength>;

/**
 * Карта нормализованный EN → сила. Чистая (для юнит-тестов); battle-путь —
 * loadWordStrengthMap ниже. Битые записи пропускаются.
 */
export function buildWordStrengthMap(
  recallItems: readonly SrsLikeItem[] | null | undefined,
  trainerItems: readonly TrainerLikeItem[] | null | undefined,
): WordStrengthMap {
  const map: WordStrengthMap = new Map();
  const put = (rawKey: unknown, strength: WordStrength) => {
    if (typeof rawKey !== 'string') return;
    const key = strengthKey(rawKey);
    if (!key) return;
    const prev = map.get(key);
    map.set(key, prev ? strongerOf(prev, strength) : strength);
  };
  for (const item of recallItems ?? []) {
    if (!item || typeof item !== 'object') continue;
    put(item.phrase, strengthFromSrs(Number(item.interval), Number(item.repetitions)));
  }
  for (const item of trainerItems ?? []) {
    if (!item || typeof item !== 'object') continue;
    // Архив = «выучено» тренером → strong; активные — по correctStreak.
    put(item.key, item.archived === true ? 'strong' : strengthFromStreak(Number(item.correctStreak)));
  }
  return map;
}

/** Сила карточки по её EN; null — «не тренировалась» (точки не рисуем). */
export function strengthFor(en: string, map: WordStrengthMap | null | undefined): WordStrength | null {
  if (!map) return null;
  return map.get(strengthKey(en)) ?? null;
}

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

/** Прочитать оба SRS-источника из AsyncStorage и собрать карту (fail-soft → пустая). */
export async function loadWordStrengthMap(): Promise<WordStrengthMap> {
  try {
    const [recallRaw, trainerRaw] = await Promise.all([
      AsyncStorage.getItem('active_recall_items').catch(() => null),
      AsyncStorage.getItem('trainer_store_v1').catch(() => null),
    ]);
    return buildWordStrengthMap(
      parseArray(recallRaw) as SrsLikeItem[],
      parseArray(trainerRaw) as TrainerLikeItem[],
    );
  } catch {
    return new Map();
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
