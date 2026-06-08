import React, { memo } from 'react';
import {
  ImageBackground,
  StyleSheet,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useAdaptiveBackgroundSource } from './adaptiveBackgroundAssets';
import type { ThemeMode } from '../constants/theme';

export const STATS_CARD_ART = {
  streak: require('../assets/images/statistics/cards/stats-card-streak.webp'),
  multipliers: require('../assets/images/statistics/cards/stats-card-multipliers.webp'),
  practiceBalance: require('../assets/images/statistics/cards/stats-card-practice-balance.webp'),
  weekRhythm: require('../assets/images/statistics/cards/stats-card-week-rhythm.webp'),
  percentiles: require('../assets/images/statistics/cards/stats-card-percentiles.webp'),
  archiveMap: require('../assets/images/statistics/cards/stats-card-archive-map.webp'),
  wager: require('../assets/images/statistics/cards/stats-card-wager.webp'),
} as const satisfies Record<string, ImageSourcePropType>;

export type StatsCardArtName = keyof typeof STATS_CARD_ART;

export const STATS_CARD_ART_BY_THEME = {
  dark: {
    streak: require('../assets/images/statistics/cards/dark/stats-card-streak-dark.webp'),
    multipliers: require('../assets/images/statistics/cards/dark/stats-card-multipliers-dark.webp'),
    practiceBalance: require('../assets/images/statistics/cards/dark/stats-card-practice-balance-dark.webp'),
    weekRhythm: require('../assets/images/statistics/cards/dark/stats-card-week-rhythm-dark.webp'),
    percentiles: require('../assets/images/statistics/cards/dark/stats-card-percentiles-dark.webp'),
    archiveMap: require('../assets/images/statistics/cards/dark/stats-card-archive-map-dark.webp'),
    wager: require('../assets/images/statistics/cards/dark/stats-card-wager-dark.webp'),
  },
  neon: {
    streak: require('../assets/images/statistics/cards/neon/stats-card-streak-neon.webp'),
    multipliers: require('../assets/images/statistics/cards/neon/stats-card-multipliers-neon.webp'),
    practiceBalance: require('../assets/images/statistics/cards/neon/stats-card-practice-balance-neon.webp'),
    weekRhythm: require('../assets/images/statistics/cards/neon/stats-card-week-rhythm-neon.webp'),
    percentiles: require('../assets/images/statistics/cards/neon/stats-card-percentiles-neon.webp'),
    archiveMap: require('../assets/images/statistics/cards/neon/stats-card-archive-map-neon.webp'),
    wager: require('../assets/images/statistics/cards/neon/stats-card-wager-neon.webp'),
  },
  gold: {
    streak: require('../assets/images/statistics/cards/gold/stats-card-streak-gold.webp'),
    multipliers: require('../assets/images/statistics/cards/gold/stats-card-multipliers-gold.webp'),
    practiceBalance: require('../assets/images/statistics/cards/gold/stats-card-practice-balance-gold.webp'),
    weekRhythm: require('../assets/images/statistics/cards/gold/stats-card-week-rhythm-gold.webp'),
    percentiles: require('../assets/images/statistics/cards/gold/stats-card-percentiles-gold.webp'),
    archiveMap: require('../assets/images/statistics/cards/gold/stats-card-archive-map-gold.webp'),
    wager: require('../assets/images/statistics/cards/gold/stats-card-wager-gold.webp'),
  },
  coral: {
    streak: require('../assets/images/statistics/cards/coral/stats-card-streak-coral.webp'),
    multipliers: require('../assets/images/statistics/cards/coral/stats-card-multipliers-coral.webp'),
    practiceBalance: require('../assets/images/statistics/cards/coral/stats-card-practice-balance-coral.webp'),
    weekRhythm: require('../assets/images/statistics/cards/coral/stats-card-week-rhythm-coral.webp'),
    percentiles: require('../assets/images/statistics/cards/coral/stats-card-percentiles-coral.webp'),
    archiveMap: require('../assets/images/statistics/cards/coral/stats-card-archive-map-coral.webp'),
    wager: require('../assets/images/statistics/cards/coral/stats-card-wager-coral.webp'),
  },
  minimalLight: {
    streak: require('../assets/images/statistics/cards/minimal-light/stats-card-streak-minimal-light.webp'),
    multipliers: require('../assets/images/statistics/cards/minimal-light/stats-card-multipliers-minimal-light.webp'),
    practiceBalance: require('../assets/images/statistics/cards/minimal-light/stats-card-practice-balance-minimal-light.webp'),
    weekRhythm: require('../assets/images/statistics/cards/minimal-light/stats-card-week-rhythm-minimal-light.webp'),
    percentiles: require('../assets/images/statistics/cards/minimal-light/stats-card-percentiles-minimal-light.webp'),
    archiveMap: require('../assets/images/statistics/cards/minimal-light/stats-card-archive-map-minimal-light.webp'),
    wager: require('../assets/images/statistics/cards/minimal-light/stats-card-wager-minimal-light.webp'),
  },
  minimalDark: {
    streak: require('../assets/images/statistics/cards/minimal-dark/stats-card-streak-minimal-dark.webp'),
    multipliers: require('../assets/images/statistics/cards/minimal-dark/stats-card-multipliers-minimal-dark.webp'),
    practiceBalance: require('../assets/images/statistics/cards/minimal-dark/stats-card-practice-balance-minimal-dark.webp'),
    weekRhythm: require('../assets/images/statistics/cards/minimal-dark/stats-card-week-rhythm-minimal-dark.webp'),
    percentiles: require('../assets/images/statistics/cards/minimal-dark/stats-card-percentiles-minimal-dark.webp'),
    archiveMap: require('../assets/images/statistics/cards/minimal-dark/stats-card-archive-map-minimal-dark.webp'),
    wager: require('../assets/images/statistics/cards/minimal-dark/stats-card-wager-minimal-dark.webp'),
  },
  compass: {
    streak: require('../assets/images/statistics/cards/compass-premium/stats-card-streak-compass-premium.webp'),
    multipliers: require('../assets/images/statistics/cards/compass-premium/stats-card-multipliers-compass-premium.webp'),
    practiceBalance: require('../assets/images/statistics/cards/compass-premium/stats-card-practice-balance-compass-premium.webp'),
    weekRhythm: require('../assets/images/statistics/cards/compass-premium/stats-card-week-rhythm-compass-premium.webp'),
    percentiles: require('../assets/images/statistics/cards/compass-premium/stats-card-percentiles-compass-premium.webp'),
    archiveMap: require('../assets/images/statistics/cards/compass-premium/stats-card-archive-map-compass-premium.webp'),
    wager: require('../assets/images/statistics/cards/compass-premium/stats-card-wager-compass-premium.webp'),
  },
} as const satisfies Record<ThemeMode, Record<StatsCardArtName, ImageSourcePropType>>;

type StatsArtTheme = {
  bgCard?: string;
};

type StatsCardArtSurfaceProps = {
  children: React.ReactNode;
  name: StatsCardArtName;
  radius: number;
  theme?: StatsArtTheme;
  isGoldTheme?: boolean;
  gradientColors?: readonly string[];
  gradientLocations?: readonly number[];
  gradientOpacity?: number;
  imageStyle?: StyleProp<ImageStyle>;
  scrim?: 'soft' | 'medium' | 'strong';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

function parseHexColor(hex?: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const value = hex.trim().replace(/^#/, '');
  if (value.length !== 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return null;
  return { r, g, b };
}

function isLightCardTheme(theme?: StatsArtTheme): boolean {
  const rgb = parseHexColor(theme?.bgCard);
  if (!rgb) return false;
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luma > 0.72;
}

function scrimColors(theme?: StatsArtTheme, isGoldTheme?: boolean, scrim: StatsCardArtSurfaceProps['scrim'] = 'medium') {
  const level = scrim === 'strong' ? 1 : scrim === 'soft' ? -1 : 0;
  const light = isLightCardTheme(theme);

  if (light) {
    const start = 0.82 + level * 0.05;
    const mid = 0.68 + level * 0.05;
    const end = 0.9 + level * 0.04;
    return [`rgba(255,255,255,${start})`, `rgba(255,255,255,${mid})`, `rgba(255,255,255,${end})`] as const;
  }

  if (isGoldTheme) {
    const start = 0.74 + level * 0.06;
    const mid = 0.56 + level * 0.06;
    const end = 0.84 + level * 0.05;
    return [`rgba(10,6,1,${start})`, `rgba(14,10,3,${mid})`, `rgba(8,5,1,${end})`] as const;
  }

  const start = 0.7 + level * 0.06;
  const mid = 0.52 + level * 0.06;
  const end = 0.8 + level * 0.05;
  return [`rgba(5,7,10,${start})`, `rgba(9,10,14,${mid})`, `rgba(4,5,8,${end})`] as const;
}

function defaultGradientOpacity(theme?: StatsArtTheme, isGoldTheme?: boolean): number {
  if (isLightCardTheme(theme)) return 0.72;
  if (isGoldTheme) return 0.48;
  return 0.36;
}

function resolveStatsCardArt(name: StatsCardArtName, themeMode: ThemeMode): ImageSourcePropType {
  return STATS_CARD_ART_BY_THEME[themeMode]?.[name] ?? STATS_CARD_ART[name];
}

function StatsCardArtSurface({
  children,
  name,
  radius,
  theme,
  isGoldTheme,
  gradientColors,
  gradientLocations,
  gradientOpacity,
  imageStyle,
  scrim = 'medium',
  style,
  testID,
}: StatsCardArtSurfaceProps) {
  const { themeMode } = useTheme();
  const backgroundSource = useAdaptiveBackgroundSource(resolveStatsCardArt(name, themeMode));

  return (
    <ImageBackground
      testID={testID}
      source={backgroundSource}
      resizeMode="cover"
      imageStyle={[{ borderRadius: radius }, imageStyle]}
      style={[{ backgroundColor: theme?.bgCard, overflow: 'hidden' }, style]}
    >
      {gradientColors && gradientColors.length >= 2 ? (
        <LinearGradient
          pointerEvents="none"
          colors={gradientColors as [string, string, ...string[]]}
          locations={gradientLocations as [number, number, ...number[]] | undefined}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius, opacity: gradientOpacity ?? defaultGradientOpacity(theme, isGoldTheme) }]}
        />
      ) : null}
      <LinearGradient
        pointerEvents="none"
        colors={scrimColors(theme, isGoldTheme, scrim)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      {children}
    </ImageBackground>
  );
}

export default memo(StatsCardArtSurface);
