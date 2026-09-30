import React from 'react';
import { View } from 'react-native';
import RetiredRasterFallback from './feedback/RetiredRasterFallback';

type Props = Readonly<{
  rewardId: string;
  size: number;
  accessibilityLabel: string;
  fallbackColor?: string;
}>;

/**
 * The level-spin asset catalogue was retired with the spin surface.  This
 * component remains only as a compatibility presentation boundary for the
 * still-live attempt-recovery overlay, so it must not revive static spin
 * assets or their Metro import graph.
 */
export default function LevelSpinRewardArt({
  rewardId: _rewardId,
  size,
  accessibilityLabel,
  fallbackColor = '#A68B60',
}: Props) {
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
