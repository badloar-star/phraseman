/**
 * ARENA SEASON — клиентское ЗЕРКАЛО чистой математики сезона.
 *
 * Поведение обязано совпадать с functions/src/arena_season.ts (закреплено парными
 * тестами: tests/arena_season_client.test.ts и functions/src/arena_season.test.ts).
 *
 * ВАЖНО: эта математика на клиенте используется ТОЛЬКО для оптимистичного показа
 * (мгновенно нарисовать SR/ранг до ответа сервера). Персист рангов/SR делает ТОЛЬКО
 * сервер (PvP — onArenaSessionFinished; бот — CF arenaBotMatchRecord). Клиент в
 * arena_profiles не пишет. См. phraseman_arena_rank_duplicate_math.
 */

export const RANK_LEVELS = ['I', 'II', 'III'] as const;
export const RANK_TIERS = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
] as const;
export type RankLevel = (typeof RANK_LEVELS)[number];
export type RankTier = (typeof RANK_TIERS)[number];

export type MatchOutcome = 'win' | 'loss' | 'draw' | 'neutral';

export const SR_WIN = 25;
export const SR_LOSS = 20;
export const SR_BOT_WIN = 12;
export const SEASON_ROLLBACK_STEPS = 3;
export const SEASON_FLOOR_INDEX = 2; // bronze III

/** Тюнингуемые величины SR (зеркало серверного ArenaSeasonConfig). */
export interface ArenaSrConfig {
  srWin: number;
  srLoss: number;
  srBotWin: number;
}
export const ARENA_SR_DEFAULTS: ArenaSrConfig = { srWin: SR_WIN, srLoss: SR_LOSS, srBotWin: SR_BOT_WIN };

/**
 * Тюнинг SR из Remote Config (те же ключи arena_sr_*, что читает сервер из
 * remote_config/app.numbers) с fallback на дефолты. Для оптимистичного показа,
 * чтобы клиент совпадал с сервером, если админ изменил SR. Импортируется лениво,
 * чтобы arena_season_math оставался чистым модулем для парных тестов.
 */
export function arenaSrConfigFromFlags(): ArenaSrConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const flags = require('./remote_flags') as {
      getArenaSrWin: () => number; getArenaSrLoss: () => number; getArenaSrBotWin: () => number;
    };
    return { srWin: flags.getArenaSrWin(), srLoss: flags.getArenaSrLoss(), srBotWin: flags.getArenaSrBotWin() };
  } catch {
    return { ...ARENA_SR_DEFAULTS };
  }
}

export function rankIndex(tier: string, level: string): number {
  const ti = RANK_TIERS.indexOf(tier as RankTier);
  const li = RANK_LEVELS.indexOf(level as RankLevel);
  return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}

export function indexToRank(index: number): { tier: RankTier; level: RankLevel } {
  const clamped = Math.max(0, Math.min(23, Math.trunc(Number.isFinite(index) ? index : 0)));
  return { tier: RANK_TIERS[Math.floor(clamped / 3)], level: RANK_LEVELS[clamped % 3] };
}

export function applySeasonRollback(
  tier: string, level: string, steps: number, floorIndex: number,
): { tier: RankTier; level: RankLevel; stars: 0 } {
  const safeSteps = Math.max(0, Math.trunc(Number.isFinite(steps) ? steps : 0));
  const safeFloor = Math.max(0, Math.min(23, Math.trunc(Number.isFinite(floorIndex) ? floorIndex : 0)));
  const newIndex = Math.max(safeFloor, rankIndex(tier, level) - safeSteps);
  const r = indexToRank(newIndex);
  return { tier: r.tier, level: r.level, stars: 0 };
}

export function applySeasonRatingDelta(
  sr: number, peakSR: number, outcome: MatchOutcome, isBot: boolean,
  cfg: ArenaSrConfig = ARENA_SR_DEFAULTS,
): { sr: number; peakSR: number } {
  const base = Number.isFinite(sr) ? sr : 0;
  let next = base;
  if (outcome === 'win') next = base + (isBot ? cfg.srBotWin : cfg.srWin);
  else if (outcome === 'loss') next = Math.max(0, base - cfg.srLoss);
  const safePeak = Number.isFinite(peakSR) ? peakSR : 0;
  return { sr: next, peakSR: Math.max(safePeak, next) };
}

export function seasonIdForDate(date: Date): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function quarterEndMs(date: Date): number {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3);
  return Date.UTC(y, q * 3 + 3, 1);
}

/** Номер сезона для UI («Сезон N»): порядковый с 2026-Q3 (старт фичи) = 1. */
export function seasonNumberFromId(seasonId: string): number {
  const m = /^(\d{4})-Q([1-4])$/.exec(seasonId);
  if (!m) return 1;
  const year = Number(m[1]);
  const q = Number(m[2]);
  const BASE_YEAR = 2026;
  const BASE_Q = 3; // 2026-Q3 = Сезон 1
  const n = (year - BASE_YEAR) * 4 + (q - BASE_Q) + 1;
  return n >= 1 ? n : 1;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
