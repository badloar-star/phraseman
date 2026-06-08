import React, { memo } from 'react';
import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import {
  getLevelGiftImage,
  type LevelGiftImageTheme,
  type LevelGiftImageVariant,
} from '../constants/levelGiftImages';

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
          opacity,
        },
        style,
      ]}
    >
      <Image
        source={getLevelGiftImage(safeTheme, safeVariant)}
        contentFit="contain"
        style={[{ width: size, height: size } satisfies ImageStyle, imageStyle]}
      />
    </View>
  );
}

export default memo(LevelGiftArt);
