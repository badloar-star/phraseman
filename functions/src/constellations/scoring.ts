// ════════════════════════════════════════════════════════════════════════════
// constellations/scoring.ts — чистый расчёт очков и мест (спек A7a/A8).
//
// БЕЗ firebase-admin: вся денежно-рейтинговая математика тестируется юнитами.
// Значения-ручки приходят параметрами из ConstellationConfig — модуль не
// знает про Firestore и дефолты.
// ════════════════════════════════════════════════════════════════════════════

import { connectedGroups, parseHexKey, ringOf } from './hex';

export interface StarPoints {
  outer: number;
  middle: number;
  inner: number;
  polar: number;
}

/** Очки за владение звёздами на конец матча — по кольцам (A8). */
export function starPointsFor(starKeys: readonly string[], starPoints: StarPoints): number {
  let total = 0;
  for (const key of starKeys) {
    total += starPoints[ringOf(parseHexKey(key))];
  }
  return total;
}

/**
 * Бонус смежности «собери созвездие» (A7a): каждое созвездие из minSize+
 * соединённых звёзд даёт perGroup очков за раунд — за ГРУППУ, не за звезду.
 */
export function roundConstellationBonus(
  ownedKeys: readonly string[],
  opts: { minSize: number; perGroup: number },
): number {
  const groups = connectedGroups(ownedKeys);
  const qualifying = groups.filter((g) => g.length >= opts.minSize);
  return qualifying.length * opts.perGroup;
}

export interface FinalScoreInput {
  uid: string;
  starKeys: readonly string[];
  /** Накопленные за матч бонусы: Полярная, выбивания, созвездия, ×2 последнего раунда. */
  bonusPoints: number;
}

export function computeFinalScores(
  rows: readonly FinalScoreInput[],
  starPoints: StarPoints,
): Array<{ uid: string; total: number }> {
  return rows.map((row) => ({
    uid: row.uid,
    total: starPointsFor(row.starKeys, starPoints) + row.bonusPoints,
  }));
}

export interface RankableRow {
  uid: string;
  points: number;
  starCount: number;
  perfectCaptures: number;
  avgAnswerMs: number;
}

/**
 * Места 1–4 (A8): очки → число звёзд → идеальные захваты → меньшее среднее
 * время ответа. Полное равенство разруливается uid — результат детерминирован
 * и не зависит от порядка вставки (важно для идемпотентной финализации).
 */
export function rankPlayers(rows: readonly RankableRow[]): Array<{ uid: string; place: number }> {
  const sorted = [...rows].sort((a, b) =>
    b.points - a.points
    || b.starCount - a.starCount
    || b.perfectCaptures - a.perfectCaptures
    || a.avgAnswerMs - b.avgAnswerMs
    || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  return sorted.map((row, i) => ({ uid: row.uid, place: i + 1 }));
}
