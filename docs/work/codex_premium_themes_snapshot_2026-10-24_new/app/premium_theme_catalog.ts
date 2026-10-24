import type { LiquidGlassThemeId } from '../constants/liquidGlassThemePalette';

export const PREMIUM_THEME_IDS = [
  'grad_full_olive',
  'grad_full_ref_signal_lime',
  'grad_full_ref_storm_violet',
  'grad_full_titanium',
  'grad_full_horizon',
  'grad_full_ref_gravity_blue',
] as const satisfies readonly LiquidGlassThemeId[];

export type PremiumThemeId = typeof PREMIUM_THEME_IDS[number];
export type PremiumThemeUnlockCondition =
  | 'plus_purchase'
  | 'final_coin_rank'
  | 'streak_365'
  | 'final_spire'
  | 'video_200_hours'
  | 'learning_v2_complete';

export type PremiumThemeProgressUnit = 'purchase' | 'rank' | 'days' | 'tier' | 'hours' | 'sessions';
export type PremiumThemeProgress = Readonly<{
  current: number;
  target: number;
  unit: PremiumThemeProgressUnit;
}>;
export type PremiumThemeProgressByCondition = Readonly<Partial<Record<PremiumThemeUnlockCondition, PremiumThemeProgress>>>;

export const PREMIUM_THEME_CONDITIONS = Object.freeze([
  'plus_purchase', 'final_coin_rank', 'streak_365', 'final_spire', 'video_200_hours', 'learning_v2_complete',
] as const satisfies readonly PremiumThemeUnlockCondition[]);

export type PremiumThemeCatalogEntry = Readonly<{
  id: PremiumThemeId;
  packId: 'olive' | 'lime' | 'amethyst' | 'titanium' | 'horizon' | 'singularity';
  condition: PremiumThemeUnlockCondition;
  prefetchAt: number | null;
  unlockAt: number | null;
}>;

export const PREMIUM_THEME_CATALOG: readonly PremiumThemeCatalogEntry[] = Object.freeze([
  { id: 'grad_full_olive', packId: 'olive', condition: 'plus_purchase', prefetchAt: null, unlockAt: null },
  { id: 'grad_full_ref_signal_lime', packId: 'lime', condition: 'final_coin_rank', prefetchAt: 18, unlockAt: 19 },
  { id: 'grad_full_ref_storm_violet', packId: 'amethyst', condition: 'streak_365', prefetchAt: 350, unlockAt: 365 },
  { id: 'grad_full_titanium', packId: 'titanium', condition: 'final_spire', prefetchAt: 10, unlockAt: 11 },
  { id: 'grad_full_horizon', packId: 'horizon', condition: 'video_200_hours', prefetchAt: 180 * 60 * 60, unlockAt: 200 * 60 * 60 },
  { id: 'grad_full_ref_gravity_blue', packId: 'singularity', condition: 'learning_v2_complete', prefetchAt: 1776, unlockAt: 1792 },
]);

const BY_ID = new Map(PREMIUM_THEME_CATALOG.map((entry) => [entry.id, entry]));
const BY_CONDITION = new Map(PREMIUM_THEME_CATALOG.map((entry) => [entry.condition, entry]));

export function isPremiumThemeId(value: unknown): value is PremiumThemeId {
  return typeof value === 'string' && BY_ID.has(value as PremiumThemeId);
}

export function premiumThemeById(id: unknown): PremiumThemeCatalogEntry | null {
  return isPremiumThemeId(id) ? BY_ID.get(id) ?? null : null;
}

export function premiumThemeByCondition(condition: PremiumThemeUnlockCondition): PremiumThemeCatalogEntry {
  const entry = BY_CONDITION.get(condition);
  if (!entry) throw new Error(`premium_theme_condition_unregistered:${condition}`);
  return entry;
}

