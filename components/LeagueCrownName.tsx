import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LEAGUE_CROWN_NICK_COLOR } from '../app/services/league_chest_rewards';
import { GOLD_RICH } from '../constants/goldTheme';
import { useTheme } from './ThemeContext';

type Props = {
  text: string;
  fontSize: number;
  active?: boolean;
  fontWeight?: '700' | '800' | '900';
  iconScale?: number;
  count?: number;
};

const LEAGUE_CROWN_ICON = require('../assets/images/league/league_crown.webp');

function LeagueCrownName({
  text,
  fontSize,
  active = true,
  fontWeight = '900',
  iconScale = 1.25,
  count,
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
  const safeCount = Math.max(0, Math.floor(Number(count) || 0));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0, alignSelf: 'flex-start' }}>
      <Image
        source={LEAGUE_CROWN_ICON}
        contentFit="contain"
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
          // Раньше flex:1: в схлопнутом (по контенту) родительском ряду это давало
          // Text нулевую ширину → имя коронованных ПРОПАДАЛО. flexShrink берёт
          // естественную ширину по тексту и ужимается только при нехватке места.
          flexShrink: 1,
        }}
      >
        {text}
      </Text>
      {safeCount > 0 ? (
        <Text
          numberOfLines={1}
          style={{
            fontSize: Math.max(11, Math.round(fontSize * 0.74)),
            color: crownColor,
            fontWeight: '900',
            flexShrink: 0,
          }}
        >
          x{safeCount}
        </Text>
      ) : null}
    </View>
  );
}

export default memo(LeagueCrownName);

