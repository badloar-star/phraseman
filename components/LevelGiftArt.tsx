import React, { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import {
  LEVEL_GIFT_IMAGE_THEMES,
  getLevelGiftGradient,
  type LevelGiftImageTheme,
  type LevelGiftImageVariant,
} from '../constants/levelGiftImages';

const isGiftTheme = (theme: string | null | undefined): theme is LevelGiftImageTheme =>
  LEVEL_GIFT_IMAGE_THEMES.includes(theme as LevelGiftImageTheme);

const isGiftVariant = (variant: string | null | undefined): variant is LevelGiftImageVariant =>
  variant === 'common' || variant === 'rare' || variant === 'epic' || variant === 'premium';

const resolveTheme = (theme: string | null | undefined): LevelGiftImageTheme =>
  isGiftTheme(theme) ? theme : 'minimalDark';

const resolveVariant = (variant: string | null | undefined): LevelGiftImageVariant =>
  isGiftVariant(variant) ? variant : 'common';

function LevelGiftArt({
  themeMode,
  variant,
  size,
  opacity,
  style,
  imageStyle,
}: {
  themeMode: string | null | undefined;
  variant: string | null | undefined;
  size: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ViewStyle>;
}) {
  const safeTheme = resolveTheme(themeMode);
  const safeVariant = resolveVariant(variant);
  const gradient = getLevelGiftGradient(safeTheme, safeVariant);

  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          opacity,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: Math.max(8, size * 0.24),
            overflow: 'hidden',
            borderWidth: Math.max(1, size * 0.035),
            borderColor: gradient.accent,
          },
          imageStyle,
        ]}
      >
        <LinearGradient
          colors={gradient.colors}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ flex: 1 }}
        />
        <View
          style={{
            position: 'absolute',
            top: Math.max(3, size * 0.1),
            left: Math.max(3, size * 0.1),
            right: Math.max(3, size * 0.1),
            height: Math.max(1, size * 0.06),
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.32)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.27,
            top: size * 0.27,
            width: size * 0.46,
            height: size * 0.46,
            borderRadius: size * 0.16,
            borderWidth: Math.max(1, size * 0.045),
            borderColor: gradient.accent,
            backgroundColor: 'rgba(255,255,255,0.10)',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
}

export default memo(LevelGiftArt);
