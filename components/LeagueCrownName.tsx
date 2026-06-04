import React from 'react';
import { Image, Text, View } from 'react-native';
import { LEAGUE_CROWN_NICK_COLOR } from '../app/services/league_chest_rewards';
import { GOLD_RICH } from '../constants/goldTheme';
import { useTheme } from './ThemeContext';

type Props = {
  text: string;
  fontSize: number;
  active?: boolean;
  fontWeight?: '700' | '800' | '900';
  iconScale?: number;
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.webp');

export default function LeagueCrownName({
  text,
  fontSize,
  active = true,
  fontWeight = '900',
  iconScale = 1.25,
}: Props) {
  const { themeMode } = useTheme();
  const crownColor = themeMode === 'gold'
    ? GOLD_RICH.metalGold
    : LEAGUE_CROWN_NICK_COLOR;

  if (!active) {
    return (
      <Text numberOfLines={1} style={{ fontSize, fontWeight, flexShrink: 1 }}>
        {text}
      </Text>
    );
  }

  const iconSize = Math.max(18, Math.round(fontSize * iconScale));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <Image
        source={LEAGUE_CROWN_ICON}
        resizeMode="contain"
        style={{
          width: iconSize,
          height: iconSize,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize,
          color: crownColor,
          fontWeight,
          flex: 1,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

