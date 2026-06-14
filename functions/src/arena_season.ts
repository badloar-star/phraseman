/**
 * ARENA SEASON — чистая математика сезона (SR на потолке, мягкий откат, id сезона).
 *
 * Вынесено отдельно, чтобы покрыть юнит-тестами и иметь ОДИН источник правды.
 * Клиентское зеркало: app/arena_season_math.ts — поведение обязано совпадать
 * (закреплено парными тестами). См. урок про дубль математики:
 * docs/.../phraseman_arena_rank_duplicate_math.
 *
 * SR живёт ТОЛЬКО на потолке (Легенда III). Ниже потолка — обычные звёзды
 * (см. arena_rank_progression.ts). Откат сезона мягкий: −N рангов с полом.
 */

export const RANK_LEVELS = ['I', 'II', 'III'] as const;
export const RANK_TIERS = [
  'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'grandmaster', 'legend',
] as const;
export type RankLevel = (typeof RANK_LEVELS)[number];
export type RankTier = (typeof RANK_TIERS)[number];

export type MatchOutcome = 'win' | 'loss' | 'draw' | 'neutral';

// Базовые величины (дефолты). На клиенте могут переопределяться Remote Config;
// сервер использует эти константы детерминированно.
export const SR_WIN = 25;
export const SR_LOSS = 20;
export const SR_BOT_WIN = 12;
export const SEASON_ROLLBACK_STEPS = 3;
export const SEASON_FLOOR_INDEX = 2; // bronze III

/** Плоский индекс ранга 0–23 (Бронза I = 0 … Легенда III = 23). */
export function rankIndex(tier: string, level: string): number {
  const ti = RANK_TIERS.indexOf(tier as RankTier);
  const li = RANK_LEVELS.indexOf(level as RankLevel);
  return (ti >= 0 ? ti : 0) * 3 + (li >= 0 ? li : 0);
}

/** Обратное преобразование индекса 0–23 в tier/level (с клампом в границы). */
export function indexToRank(index: number): { tier: RankTier; level: RankLevel } {
  const clamped = Math.max(0, Math.min(23, Math.trunc(Number.isFinite(index) ? index : 0)));
  return { tier: RANK_TIERS[Math.floor(clamped / 3)], level: RANK_LEVELS[clamped % 3] };
}

/**
 * Мягкий сезонный откат: сдвиг вниз на `steps` рангов, но не ниже `floorIndex`.
 * Звёзды обнуляются. Низы (Бронза I/II) не наказываем — пол = Бронза III.
 */
export function applySeasonRollback(
  tier: string, level: string, steps: number, floorIndex: number,
): { tier: RankTier; level: RankLevel; stars: 0 } {
  const safeSteps = Math.max(0, Math.trunc(Number.isFinite(steps) ? steps : 0));
  const safeFloor = Math.max(0, Math.min(23, Math.trunc(Number.isFinite(floorIndex) ? floorIndex : 0)));
  const newIndex = Math.max(safeFloor, rankIndex(tier, level) - safeSteps);
  const r = indexToRank(newIndex);
  return { tier: r.tier, level: r.level, stars: 0 };
}

/**
 * Изменение SR за матч НА ПОТОЛКЕ. Победа +SR (бот = половина), поражение −SR
 * (пол 0), ничья/нейтрально без изменений. peakSR только растёт.
 */
export function applySeasonRatingDelta(
  sr: number, peakSR: number, outcome: MatchOutcome, isBot: boolean,
): { sr: number; peakSR: number } {
  const base = Number.isFinite(sr) ? sr : 0;
  let next = base;
  if (outcome === 'win') next = base + (isBot ? SR_BOT_WIN : SR_WIN);
  else if (outcome === 'loss') next = Math.max(0, base - SR_LOSS);
  const safePeak = Number.isFinite(peakSR) ? peakSR : 0;
  return { sr: next, peakSR: Math.max(safePeak, next) };
}

/** Квартальный id сезона: 2026-Q1 … 2026-Q4 (по UTC-месяцу). */
export function seasonIdForDate(date: Date): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

/** Миллисекунды начала следующего квартала (UTC) — конец текущего сезона. */
export function quarterEndMs(date: Date): number {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3);
  return Date.UTC(y, q * 3 + 3, 1);
}
