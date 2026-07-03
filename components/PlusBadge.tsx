import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { GOLD_GRADIENTS, GOLD_RICH } from '../constants/goldTheme';
import type { ThemeMode } from '../constants/theme';
import { LinearGradient } from './SafeLinearGradient';

type PlusBadgeSize = 'xs' | 'sm' | 'md';

type PlusBadgeProps = {
  label?: string;
  themeMode: ThemeMode | string;
  size?: PlusBadgeSize;
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const BADGE_SIZE: Record<PlusBadgeSize, {
  padX: number;
  padY: number;
  icon: number;
  font: number;
  gap: number;
}> = {
  xs: { padX: 6, padY: 2, icon: 8, font: 9, gap: 3 },
  sm: { padX: 8, padY: 3, icon: 9, font: 10, gap: 3 },
  md: { padX: 10, padY: 5, icon: 12, font: 12, gap: 5 },
};

export default function PlusBadge({
  label = 'Plus',
  themeMode,
  size = 'sm',
  showIcon = true,
  style,
  testID,
}: PlusBadgeProps) {
  const s = BADGE_SIZE[size];
  const fg = themeMode === 'business' ? '#0A0A0A' : GOLD_RICH.bronzeDark;

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          gap: s.gap,
          paddingHorizontal: s.padX,
          paddingVertical: s.padY,
        },
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={GOLD_GRADIENTS.primaryButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {showIcon ? <Ionicons name="diamond" size={s.icon} color={fg} /> : null}
      <Text
        style={[styles.text, { color: fg, fontSize: s.font }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: GOLD_RICH.hairlineStrong,
  },
  text: {
    fontWeight: '900',
    letterSpacing: 0,
  },
});
