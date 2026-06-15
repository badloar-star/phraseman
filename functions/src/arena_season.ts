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

// Базовые величины (дефолты). Это ЕДИНЫЙ источник правды и одновременно
// fallback: админ может переопределить их в Firestore (admin_runtime_config/
// arena_season), читаемом и сервером (resolveArenaSeasonConfig), и клиентом
// (app/remote_flags arena_sr_*). При отсутствии дока поведение НЕ меняется.
export const SR_WIN = 25;
export const SR_LOSS = 20;
export const SR_BOT_WIN = 12;
export const SEASON_ROLLBACK_STEPS = 3;
export const SEASON_FLOOR_INDEX = 2; // bronze III

/** Тюнингуемые величины арены/сезона (всё опционально → fallback на дефолты выше). */
export interface ArenaSeasonConfig {
  srWin: number;
  srLoss: number;
  srBotWin: number;
  rollbackSteps: number;
  floorIndex: number;
}
export const ARENA_SEASON_DEFAULTS: ArenaSeasonConfig = {
  srWin: SR_WIN,
  srLoss: SR_LOSS,
  srBotWin: SR_BOT_WIN,
  rollbackSteps: SEASON_ROLLBACK_STEPS,
  floorIndex: SEASON_FLOOR_INDEX,
};

function cleanInt(value: unknown, fallback: number, min: number, max: number): number {
  const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  const n = typeof raw === 'number' ? raw : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Нормализует сырой Firestore-док в полный конфиг (каждое поле — с fallback). */
export function arenaSeasonConfigFromData(
  data: Record<string, unknown> | undefined,
): ArenaSeasonConfig {
  const d = data ?? {};
  return {
    srWin: cleanInt(d.arena_sr_win, SR_WIN, 0, 999),
    srLoss: cleanInt(d.arena_sr_loss, SR_LOSS, 0, 999),
    srBotWin: cleanInt(d.arena_sr_bot_win, SR_BOT_WIN, 0, 999),
    rollbackSteps: cleanInt(d.arena_season_rollback_steps, SEASON_ROLLBACK_STEPS, 0, 23),
    floorIndex: cleanInt(d.arena_season_floor_index, SEASON_FLOOR_INDEX, 0, 23),
  };
}

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
  cfg: Pick<ArenaSeasonConfig, 'srWin' | 'srLoss' | 'srBotWin'> = ARENA_SEASON_DEFAULTS,
): { sr: number; peakSR: number } {
  const base = Number.isFinite(sr) ? sr : 0;
  let next = base;
  if (outcome === 'win') next = base + (isBot ? cfg.srBotWin : cfg.srWin);
  else if (outcome === 'loss') next = Math.max(0, base - cfg.srLoss);
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
