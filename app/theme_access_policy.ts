import type { ThemeMode } from '../constants/theme';

/**
 * Legacy access vocabulary retained for source compatibility only.
 * User-facing theme access is owned by the Liquid Glass registry.
 */
export type ThemeAccessTier = 'free' | 'plus' | 'shards' | 'reward' | 'unavailable';

/**
 * `dark` is the asset-safe legacy alias for the free Graphite material.
 * No retired visual theme remains selectable through this compatibility API.
 */
export const SELECTABLE_THEME_MODES = ['dark'] as const satisfies readonly ThemeMode[];

export type SelectableThemeMode = typeof SELECTABLE_THEME_MODES[number];

/** Historical export kept so old callers compile; legacy themes are never sold. */
export const THEME_PRICE_SHARDS = 200;

export function isSelectableThemeMode(themeMode: unknown): themeMode is SelectableThemeMode {
  return themeMode === 'dark';
}

export function themeAccessTier(themeMode: unknown): ThemeAccessTier {
  return isSelectableThemeMode(themeMode) ? 'free' : 'unavailable';
}

export function isThemePlusOnly(_themeMode: unknown): boolean {
  return false;
}

export function isThemeRewardOnly(_themeMode: unknown): boolean {
  return false;
}

export function isThemeShardPurchasable(_themeMode: unknown): boolean {
  return false;
}

export function themePriceShards(_themeMode: unknown): number {
  return 0;
}

/**
 * Compatibility-only access check. Old ownership, grandfathering, rewards,
 * Plus state and developer flags cannot revive a retired visual theme.
 */
export function isThemeUnlockedFor(
  themeMode: unknown,
  _access: {
    hasPremium?: boolean;
    ownedThemeModes?: ReadonlySet<string> | readonly string[];
    isGoldUnlocked?: boolean;
    grandfatheredModes?: ReadonlySet<string> | readonly string[];
    devUnlockAll?: boolean;
  } = {},
): boolean {
  return isSelectableThemeMode(themeMode);
}
