import React, { memo } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';

type TonalSurfaceTone = 'card' | 'subtle' | 'raised';

type TonalSurfaceProps = ViewProps & {
  children?: React.ReactNode;
  tone?: TonalSurfaceTone;
  radius?: number;
  backgroundColor?: string;
  gradientColors?: readonly [string, string, ...string[]];
  gradientLocations?: readonly [number, number, ...number[]];
  style?: StyleProp<ViewStyle>;
};

function alpha(hex: string, value: number): string {
  const clean = String(hex).trim().replace(/^#/, '');
  if (clean.length !== 6) return hex;
  const parsed = parseInt(clean, 16);
  if (Number.isNaN(parsed)) return hex;
  return `rgba(${(parsed >> 16) & 255},${(parsed >> 8) & 255},${parsed & 255},${value})`;
}

function toneOpacity(tone: TonalSurfaceTone): number {
  if (tone === 'subtle') return 0.34;
  if (tone === 'raised') return 0.72;
  return 0.56;
}

function glowOpacity(tone: TonalSurfaceTone): [number, number] {
  if (tone === 'subtle') return [0.1, 0.035];
  if (tone === 'raised') return [0.22, 0.08];
  return [0.16, 0.05];
}

function TonalSurface({
  children,
  tone = 'card',
  radius = 18,
  backgroundColor,
  gradientColors,
  gradientLocations,
  style,
  ...rest
}: TonalSurfaceProps) {
  const { theme: t } = useTheme();
  const baseColor = backgroundColor ?? (tone === 'raised' ? t.bgSurface : t.bgCard);
  const colors = gradientColors ?? ([t.cardGradient[0], alpha(t.bgCard, 0.92), t.cardGradient[1]] as const);
  const locations = gradientLocations ?? (gradientColors ? undefined : ([0, 0.5, 1] as const));
  const [glowTop, glowMid] = glowOpacity(tone);

  return (
    <View
      style={[{ backgroundColor: baseColor, borderRadius: radius, overflow: 'hidden' }, style]}
      {...rest}
    >
      <LinearGradient
        pointerEvents="none"
        colors={colors}
        locations={locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { opacity: toneOpacity(tone) }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          alpha(t.accent, glowTop),
          alpha(t.accent, glowMid),
          'rgba(0,0,0,0)',
        ]}
        locations={[0, 0.34, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.86, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(255,255,255,0.13)',
          'rgba(255,255,255,0.035)',
          'rgba(255,255,255,0)',
        ]}
        locations={[0, 0.24, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

export default memo(TonalSurface);
