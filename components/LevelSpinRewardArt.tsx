import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { levelSpinRewardImageSource } from '../app/level_spin_reward_assets';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';

type Props = Readonly<{
  rewardId: string;
  size: number;
  accessibilityLabel: string;
  fallbackColor?: string;
}>;

/** Renders label-free universal reward art; the surrounding UI owns all text. */
export default function LevelSpinRewardArt({
  rewardId,
  size,
  accessibilityLabel,
  fallbackColor = '#A68B60',
}: Props) {
  const source = levelSpinRewardImageSource(rewardId);

  if (!source) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <RetiredRasterFallback kind="gift" size={size} color={fallbackColor} />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
