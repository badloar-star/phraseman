import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';

export type StatsCardArtName =
  | 'streak'
  | 'multipliers'
  | 'practiceBalance'
  | 'weekRhythm'
  | 'percentiles'
  | 'archiveMap'
  | 'wager';

export type StatsCardArtScrim = 'soft' | 'stats' | 'medium' | 'strong';

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
  scrim?: StatsCardArtScrim;
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

  const darkLevel = scrim === 'stats' ? -0.5 : level;
  const start = 0.7 + darkLevel * 0.06;
  const mid = 0.52 + darkLevel * 0.06;
  const end = 0.8 + darkLevel * 0.05;
  return [`rgba(5,7,10,${start})`, `rgba(9,10,14,${mid})`, `rgba(4,5,8,${end})`] as const;
}

function defaultGradientOpacity(theme?: StatsArtTheme, isGoldTheme?: boolean): number {
  if (isLightCardTheme(theme)) return 0.72;
  if (isGoldTheme) return 0.48;
  return 0.36;
}

function semanticTonalGradient(name: StatsCardArtName, theme?: StatsArtTheme, isGoldTheme?: boolean): readonly [string, string, string] {
  const light = isLightCardTheme(theme);
  if (isGoldTheme) {
    return [
      'rgba(255,232,170,0.18)',
      name === 'percentiles' || name === 'multipliers' ? 'rgba(245,207,122,0.16)' : 'rgba(185,133,46,0.10)',
      'rgba(0,0,0,0)',
    ] as const;
  }
  if (light) {
    switch (name) {
      case 'streak':
        return ['rgba(255,138,76,0.18)', 'rgba(255,185,122,0.10)', 'rgba(255,255,255,0)'] as const;
      case 'multipliers':
        return ['rgba(245,190,65,0.20)', 'rgba(255,224,128,0.12)', 'rgba(255,255,255,0)'] as const;
      case 'practiceBalance':
        return ['rgba(42,190,112,0.18)', 'rgba(125,211,252,0.09)', 'rgba(255,255,255,0)'] as const;
      case 'weekRhythm':
        return ['rgba(45,212,191,0.16)', 'rgba(96,165,250,0.09)', 'rgba(255,255,255,0)'] as const;
      case 'percentiles':
        return ['rgba(168,85,247,0.18)', 'rgba(236,72,153,0.08)', 'rgba(255,255,255,0)'] as const;
      case 'wager':
        return ['rgba(251,146,60,0.18)', 'rgba(245,158,11,0.10)', 'rgba(255,255,255,0)'] as const;
      case 'archiveMap':
      default:
        return ['rgba(34,197,94,0.14)', 'rgba(59,130,246,0.07)', 'rgba(255,255,255,0)'] as const;
    }
  }
  switch (name) {
    case 'streak':
      return ['rgba(255,107,53,0.32)', 'rgba(255,178,92,0.12)', 'rgba(0,0,0,0)'] as const;
    case 'multipliers':
      return ['rgba(255,212,59,0.30)', 'rgba(255,160,64,0.11)', 'rgba(0,0,0,0)'] as const;
    case 'practiceBalance':
      return ['rgba(59,224,131,0.30)', 'rgba(80,170,255,0.10)', 'rgba(0,0,0,0)'] as const;
    case 'weekRhythm':
      return ['rgba(39,214,200,0.28)', 'rgba(96,165,250,0.10)', 'rgba(0,0,0,0)'] as const;
    case 'percentiles':
      return ['rgba(184,132,255,0.32)', 'rgba(255,93,162,0.10)', 'rgba(0,0,0,0)'] as const;
    case 'wager':
      return ['rgba(255,177,59,0.32)', 'rgba(255,111,64,0.11)', 'rgba(0,0,0,0)'] as const;
    case 'archiveMap':
    default:
      return ['rgba(88,204,137,0.26)', 'rgba(78,163,255,0.09)', 'rgba(0,0,0,0)'] as const;
  }
}

function semanticTonalOpacity(theme?: StatsArtTheme, isGoldTheme?: boolean, scrim: StatsCardArtSurfaceProps['scrim'] = 'medium'): number {
  if (isLightCardTheme(theme)) return scrim === 'stats' ? 0.66 : 0.48;
  if (isGoldTheme) return scrim === 'stats' ? 0.58 : 0.44;
  return scrim === 'stats' ? 0.82 : 0.62;
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
  scrim = 'medium',
  style,
  testID,
}: StatsCardArtSurfaceProps) {
  return (
    <View
      testID={testID}
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
        colors={semanticTonalGradient(name, theme, isGoldTheme)}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius, opacity: semanticTonalOpacity(theme, isGoldTheme, scrim) }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.035)', 'rgba(255,255,255,0)']}
        locations={[0, 0.34, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.94, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius, opacity: isGoldTheme ? 0.32 : 0.24 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={scrimColors(theme, isGoldTheme, scrim)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
      />
      {children}
    </View>
  );
}

export default memo(StatsCardArtSurface);
