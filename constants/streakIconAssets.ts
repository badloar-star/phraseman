import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from './theme';

export const STREAK_ICON_TIERS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

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
    10: 'assets/images/streak_icons/dark/streak-fire-dark-010.webp',
    20: 'assets/images/streak_icons/dark/streak-fire-dark-020.webp',
    30: 'assets/images/streak_icons/dark/streak-fire-dark-030.webp',
    40: 'assets/images/streak_icons/dark/streak-fire-dark-040.webp',
    50: 'assets/images/streak_icons/dark/streak-fire-dark-050.webp',
    60: 'assets/images/streak_icons/dark/streak-fire-dark-060.webp',
    70: 'assets/images/streak_icons/dark/streak-fire-dark-070.webp',
    80: 'assets/images/streak_icons/dark/streak-fire-dark-080.webp',
    90: 'assets/images/streak_icons/dark/streak-fire-dark-090.webp',
    100: 'assets/images/streak_icons/dark/streak-fire-dark-100.webp',
  },
  gold: {
    10: 'assets/images/streak_icons/gold/streak-fire-gold-010.webp',
    20: 'assets/images/streak_icons/gold/streak-fire-gold-020.webp',
    30: 'assets/images/streak_icons/gold/streak-fire-gold-030.webp',
    40: 'assets/images/streak_icons/gold/streak-fire-gold-040.webp',
    50: 'assets/images/streak_icons/gold/streak-fire-gold-050.webp',
    60: 'assets/images/streak_icons/gold/streak-fire-gold-060.webp',
    70: 'assets/images/streak_icons/gold/streak-fire-gold-070.webp',
    80: 'assets/images/streak_icons/gold/streak-fire-gold-080.webp',
    90: 'assets/images/streak_icons/gold/streak-fire-gold-090.webp',
    100: 'assets/images/streak_icons/gold/streak-fire-gold-100.webp',
  },
  coral: {
    10: 'assets/images/streak_icons/coral/streak-fire-coral-010.webp',
    20: 'assets/images/streak_icons/coral/streak-fire-coral-020.webp',
    30: 'assets/images/streak_icons/coral/streak-fire-coral-030.webp',
    40: 'assets/images/streak_icons/coral/streak-fire-coral-040.webp',
    50: 'assets/images/streak_icons/coral/streak-fire-coral-050.webp',
    60: 'assets/images/streak_icons/coral/streak-fire-coral-060.webp',
    70: 'assets/images/streak_icons/coral/streak-fire-coral-070.webp',
    80: 'assets/images/streak_icons/coral/streak-fire-coral-080.webp',
    90: 'assets/images/streak_icons/coral/streak-fire-coral-090.webp',
    100: 'assets/images/streak_icons/coral/streak-fire-coral-100.webp',
  },
  minimalDark: {
    10: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-010.webp',
    20: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-020.webp',
    30: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-030.webp',
    40: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-040.webp',
    50: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-050.webp',
    60: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-060.webp',
    70: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-070.webp',
    80: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-080.webp',
    90: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-090.webp',
    100: 'assets/images/streak_icons/minimalDark/streak-fire-minimalDark-100.webp',
  },
  business: {
    10: 'assets/images/streak_icons/business/streak-fire-business-010.webp',
    20: 'assets/images/streak_icons/business/streak-fire-business-020.webp',
    30: 'assets/images/streak_icons/business/streak-fire-business-030.webp',
    40: 'assets/images/streak_icons/business/streak-fire-business-040.webp',
    50: 'assets/images/streak_icons/business/streak-fire-business-050.webp',
    60: 'assets/images/streak_icons/business/streak-fire-business-060.webp',
    70: 'assets/images/streak_icons/business/streak-fire-business-070.webp',
    80: 'assets/images/streak_icons/business/streak-fire-business-080.webp',
    90: 'assets/images/streak_icons/business/streak-fire-business-090.webp',
    100: 'assets/images/streak_icons/business/streak-fire-business-100.webp',
  },
  businessLight: {
    10: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-010.webp',
    20: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-020.webp',
    30: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-030.webp',
    40: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-040.webp',
    50: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-050.webp',
    60: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-060.webp',
    70: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-070.webp',
    80: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-080.webp',
    90: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-090.webp',
    100: 'assets/images/streak_icons/businessLight/streak-fire-businessLight-100.webp',
  },
  midnight: {
    10: 'assets/images/streak_icons/midnight/streak-fire-midnight-010.webp',
    20: 'assets/images/streak_icons/midnight/streak-fire-midnight-020.webp',
    30: 'assets/images/streak_icons/midnight/streak-fire-midnight-030.webp',
    40: 'assets/images/streak_icons/midnight/streak-fire-midnight-040.webp',
    50: 'assets/images/streak_icons/midnight/streak-fire-midnight-050.webp',
    60: 'assets/images/streak_icons/midnight/streak-fire-midnight-060.webp',
    70: 'assets/images/streak_icons/midnight/streak-fire-midnight-070.webp',
    80: 'assets/images/streak_icons/midnight/streak-fire-midnight-080.webp',
    90: 'assets/images/streak_icons/midnight/streak-fire-midnight-090.webp',
    100: 'assets/images/streak_icons/midnight/streak-fire-midnight-100.webp',
  },
  ember: {
    10: 'assets/images/streak_icons/ember/streak-fire-ember-010.webp',
    20: 'assets/images/streak_icons/ember/streak-fire-ember-020.webp',
    30: 'assets/images/streak_icons/ember/streak-fire-ember-030.webp',
    40: 'assets/images/streak_icons/ember/streak-fire-ember-040.webp',
    50: 'assets/images/streak_icons/ember/streak-fire-ember-050.webp',
    60: 'assets/images/streak_icons/ember/streak-fire-ember-060.webp',
    70: 'assets/images/streak_icons/ember/streak-fire-ember-070.webp',
    80: 'assets/images/streak_icons/ember/streak-fire-ember-080.webp',
    90: 'assets/images/streak_icons/ember/streak-fire-ember-090.webp',
    100: 'assets/images/streak_icons/ember/streak-fire-ember-100.webp',
  },
  aurora: {
    10: 'assets/images/streak_icons/aurora/streak-fire-aurora-010.webp',
    20: 'assets/images/streak_icons/aurora/streak-fire-aurora-020.webp',
    30: 'assets/images/streak_icons/aurora/streak-fire-aurora-030.webp',
    40: 'assets/images/streak_icons/aurora/streak-fire-aurora-040.webp',
    50: 'assets/images/streak_icons/aurora/streak-fire-aurora-050.webp',
    60: 'assets/images/streak_icons/aurora/streak-fire-aurora-060.webp',
    70: 'assets/images/streak_icons/aurora/streak-fire-aurora-070.webp',
    80: 'assets/images/streak_icons/aurora/streak-fire-aurora-080.webp',
    90: 'assets/images/streak_icons/aurora/streak-fire-aurora-090.webp',
    100: 'assets/images/streak_icons/aurora/streak-fire-aurora-100.webp',
  },
  volt: {
    10: 'assets/images/streak_icons/volt/streak-fire-volt-010.webp',
    20: 'assets/images/streak_icons/volt/streak-fire-volt-020.webp',
    30: 'assets/images/streak_icons/volt/streak-fire-volt-030.webp',
    40: 'assets/images/streak_icons/volt/streak-fire-volt-040.webp',
    50: 'assets/images/streak_icons/volt/streak-fire-volt-050.webp',
    60: 'assets/images/streak_icons/volt/streak-fire-volt-060.webp',
    70: 'assets/images/streak_icons/volt/streak-fire-volt-070.webp',
    80: 'assets/images/streak_icons/volt/streak-fire-volt-080.webp',
    90: 'assets/images/streak_icons/volt/streak-fire-volt-090.webp',
    100: 'assets/images/streak_icons/volt/streak-fire-volt-100.webp',
  },
};

const STREAK_FIRE_ICON_SOURCES: ThemeTierMap<ImageSourcePropType> = {
  dark: {
    10: require('../assets/images/streak_icons/dark/streak-fire-dark-010.webp'),
    20: require('../assets/images/streak_icons/dark/streak-fire-dark-020.webp'),
    30: require('../assets/images/streak_icons/dark/streak-fire-dark-030.webp'),
    40: require('../assets/images/streak_icons/dark/streak-fire-dark-040.webp'),
    50: require('../assets/images/streak_icons/dark/streak-fire-dark-050.webp'),
    60: require('../assets/images/streak_icons/dark/streak-fire-dark-060.webp'),
    70: require('../assets/images/streak_icons/dark/streak-fire-dark-070.webp'),
    80: require('../assets/images/streak_icons/dark/streak-fire-dark-080.webp'),
    90: require('../assets/images/streak_icons/dark/streak-fire-dark-090.webp'),
    100: require('../assets/images/streak_icons/dark/streak-fire-dark-100.webp'),
  },
  gold: {
    10: require('../assets/images/streak_icons/gold/streak-fire-gold-010.webp'),
    20: require('../assets/images/streak_icons/gold/streak-fire-gold-020.webp'),
    30: require('../assets/images/streak_icons/gold/streak-fire-gold-030.webp'),
    40: require('../assets/images/streak_icons/gold/streak-fire-gold-040.webp'),
    50: require('../assets/images/streak_icons/gold/streak-fire-gold-050.webp'),
    60: require('../assets/images/streak_icons/gold/streak-fire-gold-060.webp'),
    70: require('../assets/images/streak_icons/gold/streak-fire-gold-070.webp'),
    80: require('../assets/images/streak_icons/gold/streak-fire-gold-080.webp'),
    90: require('../assets/images/streak_icons/gold/streak-fire-gold-090.webp'),
    100: require('../assets/images/streak_icons/gold/streak-fire-gold-100.webp'),
  },
  coral: {
    10: require('../assets/images/streak_icons/coral/streak-fire-coral-010.webp'),
    20: require('../assets/images/streak_icons/coral/streak-fire-coral-020.webp'),
    30: require('../assets/images/streak_icons/coral/streak-fire-coral-030.webp'),
    40: require('../assets/images/streak_icons/coral/streak-fire-coral-040.webp'),
    50: require('../assets/images/streak_icons/coral/streak-fire-coral-050.webp'),
    60: require('../assets/images/streak_icons/coral/streak-fire-coral-060.webp'),
    70: require('../assets/images/streak_icons/coral/streak-fire-coral-070.webp'),
    80: require('../assets/images/streak_icons/coral/streak-fire-coral-080.webp'),
    90: require('../assets/images/streak_icons/coral/streak-fire-coral-090.webp'),
    100: require('../assets/images/streak_icons/coral/streak-fire-coral-100.webp'),
  },
  minimalDark: {
    10: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-010.webp'),
    20: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-020.webp'),
    30: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-030.webp'),
    40: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-040.webp'),
    50: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-050.webp'),
    60: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-060.webp'),
    70: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-070.webp'),
    80: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-080.webp'),
    90: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-090.webp'),
    100: require('../assets/images/streak_icons/minimalDark/streak-fire-minimalDark-100.webp'),
  },
  business: {
    10: require('../assets/images/streak_icons/business/streak-fire-business-010.webp'),
    20: require('../assets/images/streak_icons/business/streak-fire-business-020.webp'),
    30: require('../assets/images/streak_icons/business/streak-fire-business-030.webp'),
    40: require('../assets/images/streak_icons/business/streak-fire-business-040.webp'),
    50: require('../assets/images/streak_icons/business/streak-fire-business-050.webp'),
    60: require('../assets/images/streak_icons/business/streak-fire-business-060.webp'),
    70: require('../assets/images/streak_icons/business/streak-fire-business-070.webp'),
    80: require('../assets/images/streak_icons/business/streak-fire-business-080.webp'),
    90: require('../assets/images/streak_icons/business/streak-fire-business-090.webp'),
    100: require('../assets/images/streak_icons/business/streak-fire-business-100.webp'),
  },
  businessLight: {
    10: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-010.webp'),
    20: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-020.webp'),
    30: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-030.webp'),
    40: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-040.webp'),
    50: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-050.webp'),
    60: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-060.webp'),
    70: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-070.webp'),
    80: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-080.webp'),
    90: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-090.webp'),
    100: require('../assets/images/streak_icons/businessLight/streak-fire-businessLight-100.webp'),
  },
  midnight: {
    10: require('../assets/images/streak_icons/midnight/streak-fire-midnight-010.webp'),
    20: require('../assets/images/streak_icons/midnight/streak-fire-midnight-020.webp'),
    30: require('../assets/images/streak_icons/midnight/streak-fire-midnight-030.webp'),
    40: require('../assets/images/streak_icons/midnight/streak-fire-midnight-040.webp'),
    50: require('../assets/images/streak_icons/midnight/streak-fire-midnight-050.webp'),
    60: require('../assets/images/streak_icons/midnight/streak-fire-midnight-060.webp'),
    70: require('../assets/images/streak_icons/midnight/streak-fire-midnight-070.webp'),
    80: require('../assets/images/streak_icons/midnight/streak-fire-midnight-080.webp'),
    90: require('../assets/images/streak_icons/midnight/streak-fire-midnight-090.webp'),
    100: require('../assets/images/streak_icons/midnight/streak-fire-midnight-100.webp'),
  },
  ember: {
    10: require('../assets/images/streak_icons/ember/streak-fire-ember-010.webp'),
    20: require('../assets/images/streak_icons/ember/streak-fire-ember-020.webp'),
    30: require('../assets/images/streak_icons/ember/streak-fire-ember-030.webp'),
    40: require('../assets/images/streak_icons/ember/streak-fire-ember-040.webp'),
    50: require('../assets/images/streak_icons/ember/streak-fire-ember-050.webp'),
    60: require('../assets/images/streak_icons/ember/streak-fire-ember-060.webp'),
    70: require('../assets/images/streak_icons/ember/streak-fire-ember-070.webp'),
    80: require('../assets/images/streak_icons/ember/streak-fire-ember-080.webp'),
    90: require('../assets/images/streak_icons/ember/streak-fire-ember-090.webp'),
    100: require('../assets/images/streak_icons/ember/streak-fire-ember-100.webp'),
  },
  aurora: {
    10: require('../assets/images/streak_icons/aurora/streak-fire-aurora-010.webp'),
    20: require('../assets/images/streak_icons/aurora/streak-fire-aurora-020.webp'),
    30: require('../assets/images/streak_icons/aurora/streak-fire-aurora-030.webp'),
    40: require('../assets/images/streak_icons/aurora/streak-fire-aurora-040.webp'),
    50: require('../assets/images/streak_icons/aurora/streak-fire-aurora-050.webp'),
    60: require('../assets/images/streak_icons/aurora/streak-fire-aurora-060.webp'),
    70: require('../assets/images/streak_icons/aurora/streak-fire-aurora-070.webp'),
    80: require('../assets/images/streak_icons/aurora/streak-fire-aurora-080.webp'),
    90: require('../assets/images/streak_icons/aurora/streak-fire-aurora-090.webp'),
    100: require('../assets/images/streak_icons/aurora/streak-fire-aurora-100.webp'),
  },
  volt: {
    10: require('../assets/images/streak_icons/volt/streak-fire-volt-010.webp'),
    20: require('../assets/images/streak_icons/volt/streak-fire-volt-020.webp'),
    30: require('../assets/images/streak_icons/volt/streak-fire-volt-030.webp'),
    40: require('../assets/images/streak_icons/volt/streak-fire-volt-040.webp'),
    50: require('../assets/images/streak_icons/volt/streak-fire-volt-050.webp'),
    60: require('../assets/images/streak_icons/volt/streak-fire-volt-060.webp'),
    70: require('../assets/images/streak_icons/volt/streak-fire-volt-070.webp'),
    80: require('../assets/images/streak_icons/volt/streak-fire-volt-080.webp'),
    90: require('../assets/images/streak_icons/volt/streak-fire-volt-090.webp'),
    100: require('../assets/images/streak_icons/volt/streak-fire-volt-100.webp'),
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
  if (!Number.isFinite(streakDays) || streakDays <= 0) return 10;
  const tier = Math.ceil(streakDays / 10) * 10;
  return Math.min(100, Math.max(10, tier)) as StreakIconTierDays;
}

export function streakIconIntensity(tierDays: StreakIconTierDays): number {
  return (tierDays - 10) / 90;
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
