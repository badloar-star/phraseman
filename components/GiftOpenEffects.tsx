/**
 * Подсветка раскрытой награды. БЕЗ конфетти и БЕЗ «палок» (разлетающихся искр/лучей):
 * по просьбе — только мягкое статичное радиальное свечение по цвету редкости за
 * иконкой награды. Никакого движения, никаких частиц.
 *
 * Публичный контракт сохранён: <GiftOpenBurst tier size /> + animTierF2p /
 * animTierPrem / тип GiftAnimTier. Компонент используют 3 потребителя на размерах
 * 132 / 136 / 210: LevelGiftModal, LevelGiftDualModal, CollectibleDropModal.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';

export type GiftAnimTier = 'sparkle' | 'confetti' | 'epic' | 'premium';

/** Цвет мягкого свечения по ярусу. */
const GLOW: Record<GiftAnimTier, string> = {
  sparkle:  'rgba(56,189,248,0.38)',
  confetti: 'rgba(56,189,248,0.38)',
  epic:     'rgba(245,158,11,0.42)',
  premium:  'rgba(124,58,237,0.42)',
};

/**
 * Мягкий радиальный ореол за иконкой награды. Статичный — ничего не двигается и не
 * разлетается. Размер и центр привязаны к контейнеру `size`.
 */
function GiftOpenBurstBase({ tier, size = 100 }: { tier: GiftAnimTier; size?: number }) {
  const glow = GLOW[tier] ?? GLOW.sparkle;
  const d = Math.round(size * 0.82);
  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      <View style={{ width: d, height: d, borderRadius: d / 2, overflow: 'hidden', opacity: 0.85 }}>
        <LinearGradient
          colors={[glow, 'transparent']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </View>
  );
}

export const GiftOpenBurst = memo(GiftOpenBurstBase);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function animTierF2p(r: string): GiftAnimTier {
  if (r === 'epic') return 'epic';
  if (r === 'rare') return 'confetti';
  return 'sparkle';
}

export function animTierPrem(): GiftAnimTier {
  return 'premium';
}
