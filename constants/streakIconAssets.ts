import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from './theme';

export const STREAK_ICON_TIERS = [1, 2, 3, 5, 7, 10, 20, 35, 60, 100] as const;

export type StreakIconTierDays = typeof STREAK_ICON_TIERS[number];

export interface StreakIconVariant {
  source: ImageSourcePropType;
  assetPath: string;
  tierDays: StreakIconTierDays;
  backgroundColor: string;
  borderColor: string;
  glowColor: string;
  accentColor: string;
  intensity: number;
}

type ThemeTierMap<T> = Record<ThemeMode, Record<StreakIconTierDays, T>>;

const DEFAULT_THEME_MODE: ThemeMode = 'minimalDark';

// «Чёрное кино»: fire/freeze icons use DALL-E object-cutout foreground assets.
const STREAK_FIRE_ICON_ASSET_PATHS: ThemeTierMap<string> = {
  dark: {
    1: 'assets/images/streak_icons/dark/streak-fire-dark-001.webp',
    2: 'assets/images/streak_icons/dark/streak-fire-dark-002.webp',
    3: 'assets/images/streak_icons/dark/streak-fire-dark-003.webp',
    5: 'assets/images/streak_icons/dark/streak-fire-dark-005.webp',
    7: 'assets/images/streak_icons/dark/streak-fire-dark-007.webp',
    10: 'assets/images/streak_icons/dark/streak-fire-dark-010.webp',
    20: 'assets/images/streak_icons/dark/streak-fire-dark-020.webp',
    35: 'assets/images/streak_icons/dark/streak-fire-dark-035.webp',
    60: 'assets/images/streak_icons/dark/streak-fire-dark-060.webp',
    100: 'assets/images/streak_icons/dark/streak-fire-dark-100.webp',
  },
  gold: {
    1: 'assets/images/streak_icons/gold/streak-fire-gold-001.webp',
    2: 'assets/images/streak_icons/gold/streak-fire-gold-002.webp',
    3: 'assets/images/streak_icons/gold/streak-fire-gold-003.webp',
    5: 'assets/images/streak_icons/gold/streak-fire-gold-005.webp',
    7: 'assets/images/streak_icons/gold/streak-fire-gold-007.webp',
    10: 'assets/images/streak_icons/gold/streak-fire-gold-010.webp',
    20: 'assets/images/streak_icons/gold/streak-fire-gold-020.webp',
    35: 'assets/images/streak_icons/gold/streak-fire-gold-035.webp',
    60: 'assets/images/streak_icons/gold/streak-fire-gold-060.webp',
    100: 'assets/images/streak_icons/gold/streak-fire-gold-100.webp',
  },
  coral: {
    1: 'assets/images/streak_icons/coral/streak-fire-coral-001.webp',
    2: 'assets/images/streak_icons/coral/streak-fire-coral-002.webp',
    3: 'assets/images/streak_icons/coral/streak-fire-coral-003.webp',
    5: 'assets/images/streak_icons/coral/streak-fire-coral-005.webp',
    7: 'assets/images/streak_icons/coral/streak-fire-coral-007.webp',
    10: 'assets/images/streak_icons/coral/streak-fire-coral-010.webp',
    20: 'assets/images/streak_icons/coral/streak-fire-coral-020.webp',
    35: 'assets/images/streak_icons/coral/streak-fire-coral-035.webp',
    60: 'assets/images/streak_icons/coral/streak-fire-coral-060.webp',
    100: 'assets/images/streak_icons/coral/streak-fire-coral-100.webp',
  },
  minimalDark: {
    1: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-001.webp',
    2: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-002.webp',
    3: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-003.webp',
    5: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-005.webp',
    7: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-007.webp',
    10: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-010.webp',
    20: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-020.webp',
    35: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-035.webp',
    60: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-060.webp',
    100: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-100.webp',
  },
  midnight: {
    1: 'assets/images/streak_icons/midnight/streak-fire-midnight-001.webp',
    2: 'assets/images/streak_icons/midnight/streak-fire-midnight-002.webp',
    3: 'assets/images/streak_icons/midnight/streak-fire-midnight-003.webp',
    5: 'assets/images/streak_icons/midnight/streak-fire-midnight-005.webp',
    7: 'assets/images/streak_icons/midnight/streak-fire-midnight-007.webp',
    10: 'assets/images/streak_icons/midnight/streak-fire-midnight-010.webp',
    20: 'assets/images/streak_icons/midnight/streak-fire-midnight-020.webp',
    35: 'assets/images/streak_icons/midnight/streak-fire-midnight-035.webp',
    60: 'assets/images/streak_icons/midnight/streak-fire-midnight-060.webp',
    100: 'assets/images/streak_icons/midnight/streak-fire-midnight-100.webp',
  },
  ember: {
    1: 'assets/images/streak_icons/ember/streak-fire-ember-001.webp',
    2: 'assets/images/streak_icons/ember/streak-fire-ember-002.webp',
    3: 'assets/images/streak_icons/ember/streak-fire-ember-003.webp',
    5: 'assets/images/streak_icons/ember/streak-fire-ember-005.webp',
    7: 'assets/images/streak_icons/ember/streak-fire-ember-007.webp',
    10: 'assets/images/streak_icons/ember/streak-fire-ember-010.webp',
    20: 'assets/images/streak_icons/ember/streak-fire-ember-020.webp',
    35: 'assets/images/streak_icons/ember/streak-fire-ember-035.webp',
    60: 'assets/images/streak_icons/ember/streak-fire-ember-060.webp',
    100: 'assets/images/streak_icons/ember/streak-fire-ember-100.webp',
  },
  aurora: {
    1: 'assets/images/streak_icons/aurora/streak-fire-aurora-001.webp',
    2: 'assets/images/streak_icons/aurora/streak-fire-aurora-002.webp',
    3: 'assets/images/streak_icons/aurora/streak-fire-aurora-003.webp',
    5: 'assets/images/streak_icons/aurora/streak-fire-aurora-005.webp',
    7: 'assets/images/streak_icons/aurora/streak-fire-aurora-007.webp',
    10: 'assets/images/streak_icons/aurora/streak-fire-aurora-010.webp',
    20: 'assets/images/streak_icons/aurora/streak-fire-aurora-020.webp',
    35: 'assets/images/streak_icons/aurora/streak-fire-aurora-035.webp',
    60: 'assets/images/streak_icons/aurora/streak-fire-aurora-060.webp',
    100: 'assets/images/streak_icons/aurora/streak-fire-aurora-100.webp',
  },
  volt: {
    1: 'assets/images/streak_icons/volt/streak-fire-volt-001.webp',
    2: 'assets/images/streak_icons/volt/streak-fire-volt-002.webp',
    3: 'assets/images/streak_icons/volt/streak-fire-volt-003.webp',
    5: 'assets/images/streak_icons/volt/streak-fire-volt-005.webp',
    7: 'assets/images/streak_icons/volt/streak-fire-volt-007.webp',
    10: 'assets/images/streak_icons/volt/streak-fire-volt-010.webp',
    20: 'assets/images/streak_icons/volt/streak-fire-volt-020.webp',
    35: 'assets/images/streak_icons/volt/streak-fire-volt-035.webp',
    60: 'assets/images/streak_icons/volt/streak-fire-volt-060.webp',
    100: 'assets/images/streak_icons/volt/streak-fire-volt-100.webp',
  },
  business: {
    1: 'assets/images/streak_icons/business/streak-fire-business-001.webp',
    2: 'assets/images/streak_icons/business/streak-fire-business-002.webp',
    3: 'assets/images/streak_icons/business/streak-fire-business-003.webp',
    5: 'assets/images/streak_icons/business/streak-fire-business-005.webp',
    7: 'assets/images/streak_icons/business/streak-fire-business-007.webp',
    10: 'assets/images/streak_icons/business/streak-fire-business-010.webp',
    20: 'assets/images/streak_icons/business/streak-fire-business-020.webp',
    35: 'assets/images/streak_icons/business/streak-fire-business-035.webp',
    60: 'assets/images/streak_icons/business/streak-fire-business-060.webp',
    100: 'assets/images/streak_icons/business/streak-fire-business-100.webp',
  },
  businessLight: {
    1: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-001.webp',
    2: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-002.webp',
    3: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-003.webp',
    5: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-005.webp',
    7: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-007.webp',
    10: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-010.webp',
    20: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-020.webp',
    35: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-035.webp',
    60: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-060.webp',
    100: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-100.webp',
  },
};

const STREAK_FIRE_ICON_SOURCES: ThemeTierMap<ImageSourcePropType> = {
  dark: {
    1: require('../assets/images/streak_icons/dark/streak-fire-dark-001.webp'),
    2: require('../assets/images/streak_icons/dark/streak-fire-dark-002.webp'),
    3: require('../assets/images/streak_icons/dark/streak-fire-dark-003.webp'),
    5: require('../assets/images/streak_icons/dark/streak-fire-dark-005.webp'),
    7: require('../assets/images/streak_icons/dark/streak-fire-dark-007.webp'),
    10: require('../assets/images/streak_icons/dark/streak-fire-dark-010.webp'),
    20: require('../assets/images/streak_icons/dark/streak-fire-dark-020.webp'),
    35: require('../assets/images/streak_icons/dark/streak-fire-dark-035.webp'),
    60: require('../assets/images/streak_icons/dark/streak-fire-dark-060.webp'),
    100: require('../assets/images/streak_icons/dark/streak-fire-dark-100.webp'),
  },
  gold: {
    1: require('../assets/images/streak_icons/gold/streak-fire-gold-001.webp'),
    2: require('../assets/images/streak_icons/gold/streak-fire-gold-002.webp'),
    3: require('../assets/images/streak_icons/gold/streak-fire-gold-003.webp'),
    5: require('../assets/images/streak_icons/gold/streak-fire-gold-005.webp'),
    7: require('../assets/images/streak_icons/gold/streak-fire-gold-007.webp'),
    10: require('../assets/images/streak_icons/gold/streak-fire-gold-010.webp'),
    20: require('../assets/images/streak_icons/gold/streak-fire-gold-020.webp'),
    35: require('../assets/images/streak_icons/gold/streak-fire-gold-035.webp'),
    60: require('../assets/images/streak_icons/gold/streak-fire-gold-060.webp'),
    100: require('../assets/images/streak_icons/gold/streak-fire-gold-100.webp'),
  },
  coral: {
    1: require('../assets/images/streak_icons/coral/streak-fire-coral-001.webp'),
    2: require('../assets/images/streak_icons/coral/streak-fire-coral-002.webp'),
    3: require('../assets/images/streak_icons/coral/streak-fire-coral-003.webp'),
    5: require('../assets/images/streak_icons/coral/streak-fire-coral-005.webp'),
    7: require('../assets/images/streak_icons/coral/streak-fire-coral-007.webp'),
    10: require('../assets/images/streak_icons/coral/streak-fire-coral-010.webp'),
    20: require('../assets/images/streak_icons/coral/streak-fire-coral-020.webp'),
    35: require('../assets/images/streak_icons/coral/streak-fire-coral-035.webp'),
    60: require('../assets/images/streak_icons/coral/streak-fire-coral-060.webp'),
    100: require('../assets/images/streak_icons/coral/streak-fire-coral-100.webp'),
  },
  minimalDark: {
    1: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-001.webp'),
    2: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-002.webp'),
    3: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-003.webp'),
    5: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-005.webp'),
    7: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-007.webp'),
    10: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-010.webp'),
    20: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-020.webp'),
    35: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-035.webp'),
    60: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-060.webp'),
    100: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-100.webp'),
  },
  midnight: {
    1: require('../assets/images/streak_icons/midnight/streak-fire-midnight-001.webp'),
    2: require('../assets/images/streak_icons/midnight/streak-fire-midnight-002.webp'),
    3: require('../assets/images/streak_icons/midnight/streak-fire-midnight-003.webp'),
    5: require('../assets/images/streak_icons/midnight/streak-fire-midnight-005.webp'),
    7: require('../assets/images/streak_icons/midnight/streak-fire-midnight-007.webp'),
    10: require('../assets/images/streak_icons/midnight/streak-fire-midnight-010.webp'),
    20: require('../assets/images/streak_icons/midnight/streak-fire-midnight-020.webp'),
    35: require('../assets/images/streak_icons/midnight/streak-fire-midnight-035.webp'),
    60: require('../assets/images/streak_icons/midnight/streak-fire-midnight-060.webp'),
    100: require('../assets/images/streak_icons/midnight/streak-fire-midnight-100.webp'),
  },
  ember: {
    1: require('../assets/images/streak_icons/ember/streak-fire-ember-001.webp'),
    2: require('../assets/images/streak_icons/ember/streak-fire-ember-002.webp'),
    3: require('../assets/images/streak_icons/ember/streak-fire-ember-003.webp'),
    5: require('../assets/images/streak_icons/ember/streak-fire-ember-005.webp'),
    7: require('../assets/images/streak_icons/ember/streak-fire-ember-007.webp'),
    10: require('../assets/images/streak_icons/ember/streak-fire-ember-010.webp'),
    20: require('../assets/images/streak_icons/ember/streak-fire-ember-020.webp'),
    35: require('../assets/images/streak_icons/ember/streak-fire-ember-035.webp'),
    60: require('../assets/images/streak_icons/ember/streak-fire-ember-060.webp'),
    100: require('../assets/images/streak_icons/ember/streak-fire-ember-100.webp'),
  },
  aurora: {
    1: require('../assets/images/streak_icons/aurora/streak-fire-aurora-001.webp'),
    2: require('../assets/images/streak_icons/aurora/streak-fire-aurora-002.webp'),
    3: require('../assets/images/streak_icons/aurora/streak-fire-aurora-003.webp'),
    5: require('../assets/images/streak_icons/aurora/streak-fire-aurora-005.webp'),
    7: require('../assets/images/streak_icons/aurora/streak-fire-aurora-007.webp'),
    10: require('../assets/images/streak_icons/aurora/streak-fire-aurora-010.webp'),
    20: require('../assets/images/streak_icons/aurora/streak-fire-aurora-020.webp'),
    35: require('../assets/images/streak_icons/aurora/streak-fire-aurora-035.webp'),
    60: require('../assets/images/streak_icons/aurora/streak-fire-aurora-060.webp'),
    100: require('../assets/images/streak_icons/aurora/streak-fire-aurora-100.webp'),
  },
  volt: {
    1: require('../assets/images/streak_icons/volt/streak-fire-volt-001.webp'),
    2: require('../assets/images/streak_icons/volt/streak-fire-volt-002.webp'),
    3: require('../assets/images/streak_icons/volt/streak-fire-volt-003.webp'),
    5: require('../assets/images/streak_icons/volt/streak-fire-volt-005.webp'),
    7: require('../assets/images/streak_icons/volt/streak-fire-volt-007.webp'),
    10: require('../assets/images/streak_icons/volt/streak-fire-volt-010.webp'),
    20: require('../assets/images/streak_icons/volt/streak-fire-volt-020.webp'),
    35: require('../assets/images/streak_icons/volt/streak-fire-volt-035.webp'),
    60: require('../assets/images/streak_icons/volt/streak-fire-volt-060.webp'),
    100: require('../assets/images/streak_icons/volt/streak-fire-volt-100.webp'),
  },
  business: {
    1: require('../assets/images/streak_icons/business/streak-fire-business-001.webp'),
    2: require('../assets/images/streak_icons/business/streak-fire-business-002.webp'),
    3: require('../assets/images/streak_icons/business/streak-fire-business-003.webp'),
    5: require('../assets/images/streak_icons/business/streak-fire-business-005.webp'),
    7: require('../assets/images/streak_icons/business/streak-fire-business-007.webp'),
    10: require('../assets/images/streak_icons/business/streak-fire-business-010.webp'),
    20: require('../assets/images/streak_icons/business/streak-fire-business-020.webp'),
    35: require('../assets/images/streak_icons/business/streak-fire-business-035.webp'),
    60: require('../assets/images/streak_icons/business/streak-fire-business-060.webp'),
    100: require('../assets/images/streak_icons/business/streak-fire-business-100.webp'),
  },
  businessLight: {
    1: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-001.webp'),
    2: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-002.webp'),
    3: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-003.webp'),
    5: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-005.webp'),
    7: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-007.webp'),
    10: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-010.webp'),
    20: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-020.webp'),
    35: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-035.webp'),
    60: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-060.webp'),
    100: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-100.webp'),
  },
};

const FIRE_CHROME: Record<ThemeMode, { rgb: readonly [number, number, number]; accent: string }> = {
  dark: { rgb: [38, 217, 177], accent: '#26D9B1' },
  gold: { rgb: [246, 201, 92], accent: '#F6C95C' },
  coral: { rgb: [255, 100, 100], accent: '#FF6464' },
  minimalDark: { rgb: [110, 168, 255], accent: '#6EA8FF' },
  business: { rgb: [212, 178, 106], accent: '#0095F6' },
  businessLight: { rgb: [168, 128, 47], accent: '#0095F6' },
  midnight: { rgb: [255, 210, 122], accent: '#FFD27A' },
  ember: { rgb: [255, 138, 42], accent: '#FF8A2A' },
  aurora: { rgb: [242, 210, 122], accent: '#F2D27A' },
  volt: { rgb: [255, 232, 92], accent: '#FFE85C' },
};

const FREEZE_CHROME: Record<ThemeMode, { rgb: readonly [number, number, number]; accent: string }> = {
  dark: { rgb: [100, 210, 255], accent: '#64D2FF' },
  gold: { rgb: [246, 227, 161], accent: '#F6E3A1' },
  coral: { rgb: [111, 231, 220], accent: '#6FE7DC' },
  minimalDark: { rgb: [156, 163, 175], accent: '#9CA3AF' },
  business: { rgb: [201, 202, 198], accent: '#A8A8A8' },
  businessLight: { rgb: [122, 125, 133], accent: '#8E8E8E' },
  midnight: { rgb: [143, 160, 255], accent: '#8FA0FF' },
  ember: { rgb: [122, 200, 232], accent: '#7AC8E8' },
  aurora: { rgb: [46, 157, 255], accent: '#2E9DFF' },
  volt: { rgb: [111, 231, 220], accent: '#6FE7DC' },
};

const STREAK_FREEZE_ICON_ASSET_PATH = 'assets/images/streak_icons/streak-freeze.webp';
const STREAK_FREEZE_ICON_SOURCE = require('../assets/images/streak_icons/streak-freeze.webp');

const STREAK_FREEZE_ICON_ASSET_PATHS: Record<ThemeMode, string> = {
  dark: 'assets/images/streak_icons/dark/streak-freeze-dark.webp',
  gold: 'assets/images/streak_icons/gold/streak-freeze-gold.webp',
  coral: 'assets/images/streak_icons/coral/streak-freeze-coral.webp',
  minimalDark: 'assets/images/streak_icons/minimalDark/streak-freeze-minimalDark.webp',
  business: 'assets/images/streak_icons/business/streak-freeze-business.webp',
  businessLight: 'assets/images/streak_icons/businessLight/streak-freeze-businessLight.webp',
  midnight: 'assets/images/streak_icons/midnight/streak-freeze-midnight.webp',
  ember: 'assets/images/streak_icons/ember/streak-freeze-ember.webp',
  aurora: 'assets/images/streak_icons/aurora/streak-freeze-aurora.webp',
  volt: 'assets/images/streak_icons/volt/streak-freeze-volt.webp',
};

const STREAK_FREEZE_ICON_SOURCES: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/streak_icons/dark/streak-freeze-dark.webp'),
  gold: require('../assets/images/streak_icons/gold/streak-freeze-gold.webp'),
  coral: require('../assets/images/streak_icons/coral/streak-freeze-coral.webp'),
  minimalDark: require('../assets/images/streak_icons/minimalDark/streak-freeze-minimalDark.webp'),
  business: require('../assets/images/streak_icons/business/streak-freeze-business.webp'),
  businessLight: require('../assets/images/streak_icons/businessLight/streak-freeze-businessLight.webp'),
  midnight: require('../assets/images/streak_icons/midnight/streak-freeze-midnight.webp'),
  ember: require('../assets/images/streak_icons/ember/streak-freeze-ember.webp'),
  aurora: require('../assets/images/streak_icons/aurora/streak-freeze-aurora.webp'),
  volt: require('../assets/images/streak_icons/volt/streak-freeze-volt.webp'),
};

const STREAK_FREEZE_ICON_SOURCE_PROMPTS: Record<ThemeMode, string> = {
  dark: 'assets/images/streak_icons/sources/streak-freeze-dark-dalle-source.png',
  gold: 'assets/images/streak_icons/sources/streak-freeze-gold-dalle-source.png',
  coral: 'assets/images/streak_icons/sources/streak-freeze-coral-dalle-source.png',
  minimalDark: 'assets/images/streak_icons/sources/streak-freeze-minimalDark-dalle-source.png',
  business: 'assets/images/streak_icons/sources/streak-freeze-business-dalle-source.png',
  businessLight: 'generated:scripts/generate_business_line_icons.mjs',
  midnight: 'assets/images/cinema_dalle_sources/midnight-object-rewards-dalle.png#streak-icons',
  ember: 'assets/images/cinema_dalle_sources/ember-object-rewards-dalle.png#streak-icons',
  aurora: 'assets/images/cinema_dalle_sources/aurora-object-rewards-dalle.png#streak-icons',
  volt: 'assets/images/cinema_dalle_sources/volt-object-rewards-dalle.png#streak-icons',
};

function rgba(rgb: readonly [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha.toFixed(2)})`;
}

function normalizeThemeMode(themeMode: ThemeMode | null | undefined): ThemeMode {
  return themeMode && STREAK_FIRE_ICON_SOURCES[themeMode] ? themeMode : DEFAULT_THEME_MODE;
}

export function streakIconTierForDays(streakDays: number): StreakIconTierDays {
  if (!Number.isFinite(streakDays) || streakDays <= 1) return 1;
  const tier = [...STREAK_ICON_TIERS].filter((candidate) => candidate <= streakDays).at(-1) ?? 1;
  return tier as StreakIconTierDays;
}

export function streakIconIntensity(tierDays: StreakIconTierDays): number {
  return STREAK_ICON_TIERS.indexOf(tierDays) / (STREAK_ICON_TIERS.length - 1);
}

export function getStreakFireIconVariant(
  themeMode: ThemeMode,
  streakDays: number,
): StreakIconVariant {
  const safeThemeMode = normalizeThemeMode(themeMode);
  const tierDays = streakIconTierForDays(streakDays);
  const intensity = streakIconIntensity(tierDays);
  const chrome = FIRE_CHROME[safeThemeMode];
  return {
    source: STREAK_FIRE_ICON_SOURCES[safeThemeMode][tierDays],
    assetPath: STREAK_FIRE_ICON_ASSET_PATHS[safeThemeMode][tierDays],
    tierDays,
    backgroundColor: rgba(chrome.rgb, 0.12 + intensity * 0.10),
    borderColor: rgba(chrome.rgb, 0.36 + intensity * 0.28),
    glowColor: rgba(chrome.rgb, 0.22 + intensity * 0.18),
    accentColor: chrome.accent,
    intensity,
  };
}

export function getStreakFreezeIconVariant(themeMode: ThemeMode): StreakIconVariant {
  const safeThemeMode = normalizeThemeMode(themeMode);
  const chrome = FREEZE_CHROME[safeThemeMode];
  return {
    source: STREAK_FREEZE_ICON_SOURCES[safeThemeMode] ?? STREAK_FREEZE_ICON_SOURCE,
    assetPath: STREAK_FREEZE_ICON_ASSET_PATHS[safeThemeMode] ?? STREAK_FREEZE_ICON_ASSET_PATH,
    tierDays: 10,
    backgroundColor: rgba(chrome.rgb, 0.16),
    borderColor: rgba(chrome.rgb, 0.54),
    glowColor: rgba(chrome.rgb, 0.30),
    accentColor: chrome.accent,
    intensity: 1,
  };
}

export const STREAK_ICON_MODEL = {
  tiers: STREAK_ICON_TIERS,
  fireAssetPaths: STREAK_FIRE_ICON_ASSET_PATHS,
  freezeAssetPaths: STREAK_FREEZE_ICON_ASSET_PATHS,
  freezeAssetPath: STREAK_FREEZE_ICON_ASSET_PATH,
  modelSheetPath: 'assets/images/streak_icons/streak-fire-model-sheet.webp',
  sourcePrompts: {
    fire: 'assets/images/streak_icons/sources/streak-fire-dalle-source.png',
    freeze: 'assets/images/streak_icons/sources/streak-freeze-dalle-source.png',
    freezeThemes: STREAK_FREEZE_ICON_SOURCE_PROMPTS,
  },
} as const;
