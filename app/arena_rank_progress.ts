// Чистая логика «видимого прогресса ранга» для лобби Арены.
//
// Цель (из аудита): сейчас игрок НЕ видит, насколько он близок к следующему рангу —
// прогрессия ощущается пустой. Здесь — расчёт доли прогресса и подписи «до повышения N звёзд»,
// чтобы нарисовать живой бар на главном экране.
//
// Опирается только на rankIndex (0–23) и звёзды (0–3). Без React/сети — легко тестируется.

import { indexToRank } from './arena_season_math';

/** 3 звезды = повышение в следующий ранг. */
export const STARS_PER_RANK = 3;
/** Максимальный индекс ранга (Легенда III). */
export const MAX_RANK_INDEX = 23;

export interface RankProgress {
  /** Доля прогресса к следующему рангу, 0..1. */
  ratio: number;
  /** Сколько звёзд до повышения (0, если уже на потолке). */
  starsToNext: number;
  /** Текущее число звёзд после клампинга (0..3). */
  stars: number;
  /** Достигнут ли потолок (Легенда III) — дальше звёзд нет, работает SR. */
  atCeiling: boolean;
  /** Подпись локали-независимо: ключ для i18n + число. */
  starsRemaining: number;
}

/**
 * Прогресс к следующему рангу по текущему rankIndex и числу звёзд.
 *
 * На потолке (Легенда III) звёзды не копятся → ratio=1, starsToNext=0, atCeiling=true.
 */
export function computeRankProgress(rankIndex: number, stars: number): RankProgress {
  const safeIndex = Math.max(0, Math.min(MAX_RANK_INDEX, Math.trunc(Number.isFinite(rankIndex) ? rankIndex : 0)));
  const safeStars = Math.max(0, Math.min(STARS_PER_RANK, Math.trunc(Number.isFinite(stars) ? stars : 0)));
  const atCeiling = safeIndex >= MAX_RANK_INDEX;

  if (atCeiling) {
    return { ratio: 1, starsToNext: 0, stars: safeStars, atCeiling: true, starsRemaining: 0 };
  }

  const starsToNext = Math.max(0, STARS_PER_RANK - safeStars);
  const ratio = Math.max(0, Math.min(1, safeStars / STARS_PER_RANK));
  return { ratio, starsToNext, stars: safeStars, atCeiling: false, starsRemaining: starsToNext };
}

/** Индекс следующего ранга (для показа «→ Серебро I»). На потолке возвращает тот же индекс. */
export function nextRankIndex(rankIndex: number): number {
  const safe = Math.max(0, Math.min(MAX_RANK_INDEX, Math.trunc(Number.isFinite(rankIndex) ? rankIndex : 0)));
  return Math.min(MAX_RANK_INDEX, safe + 1);
}

/** Тир и уровень следующего ранга — для подписи цели прогресса. */
export function nextRank(rankIndex: number): { tier: string; level: string } {
  return indexToRank(nextRankIndex(rankIndex));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
