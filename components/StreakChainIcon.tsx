import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';
import type { ThemeMode } from '../constants/theme';
import { getStreakFireIconVariant, getStreakFreezeIconVariant } from '../constants/streakIconAssets';

interface StreakChainIconProps {
  themeMode: ThemeMode;
  streakDays: number;
  frozen?: boolean;
  inactive?: boolean;
  size: number;
  style?: StyleProp<ImageStyle>;
}

export function StreakChainIcon({
  themeMode,
  streakDays,
  frozen = false,
  inactive = false,
  size,
  style,
}: StreakChainIconProps) {
  const variant = frozen
    ? getStreakFreezeIconVariant(themeMode)
    : getStreakFireIconVariant(themeMode, streakDays);

  return (
    <Image
      source={variant.source}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={[
        { width: size, height: size, opacity: inactive && !frozen ? 0.42 : 1 },
        style,
      ]}
    />
  );
}
