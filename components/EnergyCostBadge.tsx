/**
 * Единый знак цены запуска: один прозрачный ассет для всех тем и нативная
 * подпись `−1`/`∞`. Знак выступает над кнопкой и не перехватывает касания.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { useEnergy } from './EnergyContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { ENERGY_COST_BADGE_HYBRID, LUM, SUITE } from '../constants/motionHybrid';

const ENERGY_START_COST_IMAGE = require('../assets/images/energy/energy-start-cost.webp');

interface EnergyCostBadgeProps {
  /** Сколько единиц спишется. По умолчанию 1 — единое правило экономики. */
  cost?: number;
  /** Подсветить как предупреждение (например, это последняя единица). */
  urgent?: boolean;
  /** Позиция угла относительно родителя-кнопки. */
  corner?: 'topRight' | 'topLeft';
  /** Для маленьких иконочных CTA, сохраняя тот же единственный ассет. */
  compact?: boolean;
  /** Для особенно плотных шапок: уменьшает только графику, не область нажатия CTA. */
  micro?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function EnergyCostBadge({
  cost = 1,
  urgent = false,
  corner = 'topRight',
  compact = false,
  micro = false,
  style,
  testID,
}: EnergyCostBadgeProps) {
  const { theme: t } = useTheme();
  const { isUnlimited } = useEnergy();
  const reduceMotion = useReduceMotion();

  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      pulse.setValue(0);
      return;
    }
    enter.setValue(0);
    pulse.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(enter, {
        toValue: 1,
        duration: LUM.contentMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(LUM.rimMs),
        Animated.spring(pulse, {
          toValue: 1,
          ...SUITE.pulse,
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 0,
          ...SUITE.pulse,
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [enter, pulse, reduceMotion]);

  const assetScale = Animated.add(
    enter.interpolate({
      inputRange: [0, 1],
      outputRange: [ENERGY_COST_BADGE_HYBRID.entryScale, 1],
    }),
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0, ENERGY_COST_BADGE_HYBRID.pulseScale - 1],
    }),
  );
  const translateY = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [ENERGY_COST_BADGE_HYBRID.entryShiftPx, 0],
  });
  const rotate = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [
      `${ENERGY_COST_BADGE_HYBRID.idleRotationDeg}deg`,
      `${ENERGY_COST_BADGE_HYBRID.pulseRotationDeg}deg`,
    ],
  });
  const label = isUnlimited ? '∞' : `−${cost}`;

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLabel={isUnlimited ? 'Безлимитная энергия' : `Стоимость запуска: ${cost} энергия`}
      style={[
        styles.badge,
        compact ? styles.badgeCompact : null,
        micro ? styles.badgeMicro : null,
        corner === 'topRight'
          ? (micro ? styles.topRightMicro : compact ? styles.topRightCompact : styles.topRight)
          : (micro ? styles.topLeftMicro : compact ? styles.topLeftCompact : styles.topLeft),
        { opacity: enter },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ translateY }, { scale: assetScale }, { rotate }] }}>
        <Image
          source={ENERGY_START_COST_IMAGE}
          style={[styles.asset, compact ? styles.assetCompact : null, micro ? styles.assetMicro : null]}
          contentFit="contain"
          accessible={false}
          importantForAccessibility="no"
        />
      </Animated.View>
      <Text
        maxFontSizeMultiplier={1.2}
        style={[
          styles.label,
          compact ? styles.labelCompact : null,
          micro ? styles.labelMicro : null,
          {
            color: urgent ? t.wrong : t.textPrimary,
            textShadowColor: t.bgPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    width: 42,
    height: 42,
    zIndex: 20,
    elevation: 20,
  },
  asset: { width: 42, height: 42 },
  badgeCompact: { width: 32, height: 32 },
  assetCompact: { width: 32, height: 32 },
  badgeMicro: { width: 24, height: 24 },
  assetMicro: { width: 24, height: 24 },
  topRight: { top: -18, right: 0 },
  topLeft: { top: -18, left: -12 },
  topRightCompact: { top: -14, right: 0 },
  topLeftCompact: { top: -14, left: -8 },
  topRightMicro: { top: -10, right: 0 },
  topLeftMicro: { top: -10, left: -6 },
  label: {
    position: 'absolute',
    right: 39,
    top: 18,
    fontWeight: '700',
    fontSize: 15,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  labelCompact: { right: 30, top: 13, fontSize: 12 },
  labelMicro: { right: 22, top: 9, fontSize: 10 },
});

export default memo(EnergyCostBadge);
