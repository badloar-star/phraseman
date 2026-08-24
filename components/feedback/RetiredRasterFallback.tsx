import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

type RetiredRasterFallbackProps = {
  kind: 'gift' | 'league' | 'boon';
  size: number;
  color: string;
  accessibilityLabel?: string;
};

const ICON_BY_KIND = {
  gift: 'gift-outline',
  league: 'trophy-outline',
  boon: 'sparkles-outline',
} as const;

function withAlpha(color: string, alphaHex: string): string {
  return /^#[\da-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

function RetiredRasterFallback({
  kind,
  size,
  color,
  accessibilityLabel,
}: RetiredRasterFallbackProps) {
  const outerRadius = Math.round(size * 0.3);
  const innerSize = Math.round(size * 0.68);
  const iconSize = Math.max(16, Math.round(size * 0.42));

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: outerRadius,
          borderColor: withAlpha(color, '59'),
          backgroundColor: withAlpha(color, '14'),
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: Math.round(innerSize * 0.34),
            backgroundColor: withAlpha(color, '20'),
          },
        ]}
      >
        <Ionicons name={ICON_BY_KIND[kind]} size={iconSize} color={color} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            width: Math.round(size * 0.42),
            borderTopColor: withAlpha(color, '73'),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    top: '12%',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default memo(RetiredRasterFallback);
