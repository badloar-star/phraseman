import React, { memo } from 'react';
import { Text } from 'react-native';

type MedalType = 'bronze' | 'silver' | 'gold';

interface MedalIconProps {
  type: MedalType;
  size?: number;
}

const MEDAL_EMOJI: Record<MedalType, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold:   '🥇',
};

function MedalIcon({ type, size = 24 }: MedalIconProps) {
  return <Text style={{ fontSize: size }}>{MEDAL_EMOJI[type]}</Text>;
}

export default memo(MedalIcon);
