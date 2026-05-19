import React from 'react';
import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import {
  getLevelGiftImage,
  type LevelGiftImageTheme,
  type LevelGiftImageVariant,
} from '../constants/levelGiftImages';

type GiftArtBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const SOURCE_SIZE = 512;
const MIN_SAFE_PADDING = 28;
const SAFE_PADDING_RATIO = 0.12;

const GIFT_ART_BOUNDS: Record<LevelGiftImageTheme, Record<LevelGiftImageVariant, GiftArtBounds>> = {
  coral: {
    common: { left: 46, top: 84, width: 420, height: 373 },
    rare: { left: 67, top: 55, width: 378, height: 402 },
    epic: { left: 76, top: 47, width: 360, height: 418 },
    premium: { left: 55, top: 43, width: 401, height: 426 },
  },
  dark: {
    common: { left: 47, top: 84, width: 419, height: 373 },
    rare: { left: 66, top: 55, width: 379, height: 402 },
    epic: { left: 76, top: 47, width: 360, height: 418 },
    premium: { left: 55, top: 43, width: 401, height: 426 },
  },
  gold: {
    common: { left: 47, top: 81, width: 410, height: 374 },
    rare: { left: 71, top: 56, width: 365, height: 399 },
    epic: { left: 76, top: 47, width: 360, height: 418 },
    premium: { left: 55, top: 43, width: 399, height: 426 },
  },
  minimalDark: {
    common: { left: 55, top: 80, width: 410, height: 377 },
    rare: { left: 67, top: 55, width: 378, height: 402 },
    epic: { left: 75, top: 47, width: 361, height: 418 },
    premium: { left: 55, top: 43, width: 401, height: 425 },
  },
  minimalLight: {
    common: { left: 56, top: 77, width: 409, height: 380 },
    rare: { left: 78, top: 55, width: 366, height: 402 },
    epic: { left: 78, top: 47, width: 358, height: 418 },
    premium: { left: 55, top: 43, width: 401, height: 426 },
  },
  neon: {
    common: { left: 46, top: 85, width: 420, height: 371 },
    rare: { left: 73, top: 56, width: 366, height: 400 },
    epic: { left: 79, top: 47, width: 354, height: 418 },
    premium: { left: 55, top: 43, width: 402, height: 425 },
  },
};

const isGiftTheme = (theme: string | null | undefined): theme is LevelGiftImageTheme =>
  theme === 'coral' ||
  theme === 'dark' ||
  theme === 'gold' ||
  theme === 'minimalDark' ||
  theme === 'minimalLight' ||
  theme === 'neon';

const isGiftVariant = (variant: string | null | undefined): variant is LevelGiftImageVariant =>
  variant === 'common' || variant === 'rare' || variant === 'epic' || variant === 'premium';

const resolveTheme = (theme: string | null | undefined): LevelGiftImageTheme =>
  isGiftTheme(theme) ? theme : 'minimalDark';

const resolveVariant = (variant: string | null | undefined): LevelGiftImageVariant =>
  isGiftVariant(variant) ? variant : 'common';

const cropImageStyle = (bounds: GiftArtBounds, size: number): ImageStyle => {
  const maxDim = Math.max(bounds.width, bounds.height);
  const padding = Math.max(MIN_SAFE_PADDING, Math.round(maxDim * SAFE_PADDING_RATIO));
  const cropSize = maxDim + padding * 2;
  const cropLeft = bounds.left - (cropSize - bounds.width) / 2;
  const cropTop = bounds.top - (cropSize - bounds.height) / 2;
  const scale = size / cropSize;

  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SOURCE_SIZE * scale,
    height: SOURCE_SIZE * scale,
    transform: [
      { translateX: -cropLeft * scale },
      { translateY: -cropTop * scale },
    ],
  };
};

export default function LevelGiftArt({
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
  imageStyle?: StyleProp<ImageStyle>;
}) {
  const safeTheme = resolveTheme(themeMode);
  const safeVariant = resolveVariant(variant);

  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          overflow: 'hidden',
          position: 'relative',
          opacity,
        },
        style,
      ]}
    >
      <Image
        source={getLevelGiftImage(safeTheme, safeVariant)}
        resizeMode="contain"
        style={[cropImageStyle(GIFT_ART_BOUNDS[safeTheme][safeVariant], size), imageStyle]}
      />
    </View>
  );
}
