// ════════════════════════════════════════════════════════════════════════════
// constellations/rewards.ts — чистый расчёт наград за матч (спек E1–E4).
//
// БЕЗ firebase-admin: вся денежно-рейтинговая математика тестируется юнитами.
// Firestore-начисление (arena_profiles + users.shards + shard_log + дроп) живёт
// в match_service.finalizeConstellationMatch и вызывает computeMatchRewards.
//
// Инварианты:
// - Боту награды не начисляются вообще (isBot → всё 0).
// - Защита новичка: первые newbieProtectionMatches матчей отрицательные дельты
//   ★/SR НЕ применяются (только вверх) — «−1 новичку, которого выбили» = отток.
// - Анти-бот-фарм: < 2 живых людей → пыль и звездопад режутся вдвое (как в C1).
// ════════════════════════════════════════════════════════════════════════════

import type { ConstellationConfig } from './config';

export interface RewardInput {
  place: number;              // 1..4
  isBot: boolean;
  golden: boolean;            // матч-Звездопад
  wager: number;              // ставка осколками (0/1/2/5)
  dustEarned: number;         // пыль Полярной, накопленная за матч
  starfallEarned: number;     // осколки событий Звездопада за матч
  matchesPlayedBefore: number;// сколько матчей режима сыграно ДО этого
  perfectCaptures: number;
  livingHumans: number;       // сколько людей дожили (для анти-фарма)
  cfg: ConstellationConfig;
}

export interface MatchRewards {
  xp: number;
  shards: number;
  starDelta: number;
  srDelta: number;
  collectibleEligible: boolean;
}

const ZERO_REWARDS: MatchRewards = {
  xp: 0, shards: 0, starDelta: 0, srDelta: 0, collectibleEligible: false,
};

/** Индекс места 1..4 → индекс массива 0..3 (с клипом). */
function placeIdx(place: number): number {
  return Math.min(3, Math.max(0, Math.floor(place) - 1));
}

/**
 * Защита новичка (E2): первые cfg.newbieProtectionMatches матчей режима
 * отрицательная дельта ★/SR гасится в 0 (положительная проходит всегда).
 */
export function resolveStarDeltaWithNewbieGuard(
  delta: number,
  matchesPlayedBefore: number,
  cfg: ConstellationConfig,
): number {
  if (delta >= 0) return delta;
  return matchesPlayedBefore < cfg.newbieProtectionMatches ? 0 : delta;
}

/** Выплата ставки (C3): 1 место ×winMultiplier, 2 — возврат, 3-4 — сгорела. */
function wagerPayout(place: number, wager: number, cfg: ConstellationConfig): number {
  if (wager <= 0) return 0;
  if (place === 1) return wager * cfg.wager.winMultiplier;
  if (place === 2) return wager;
  return 0;
}

export function computeMatchRewards(input: RewardInput): MatchRewards {
  if (input.isBot) return { ...ZERO_REWARDS };
  const { cfg } = input;
  const idx = placeIdx(input.place);

  const xp = cfg.rewards.xpByPlace[idx] ?? 0;

  // Анти-бот-фарм: < 2 живых людей → пыль и звездопад вдвое (C1).
  const antiFarm = input.livingHumans < 2;
  const dust = antiFarm ? Math.floor(input.dustEarned / 2) : input.dustEarned;
  const starfall = antiFarm ? Math.floor(input.starfallEarned / 2) : input.starfallEarned;

  const placeShards = cfg.rewards.shardsByPlace[idx] ?? 0;
  const shards = placeShards + dust + starfall + wagerPayout(input.place, input.wager, cfg);

  const rawStar = cfg.rewards.starDeltaByPlace[idx] ?? 0;
  const rawSr = cfg.rewards.srDeltaByPlace[idx] ?? 0;
  const starDelta = resolveStarDeltaWithNewbieGuard(rawStar, input.matchesPlayedBefore, cfg);
  const srDelta = resolveStarDeltaWithNewbieGuard(rawSr, input.matchesPlayedBefore, cfg);

  return {
    xp,
    shards,
    starDelta,
    srDelta,
    collectibleEligible: true, // туториал отсекается вызывающим кодом (не-туториал)
  };
}
