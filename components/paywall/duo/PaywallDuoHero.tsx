// PaywallDuoHero — знак уровня и свечение первого экрана пейвола «Два пути».
// зачем (владелец 11.11): при выборе Plus знак и цвет окна меняются на «плюсовые» (фиолетовый круг ◆), при выборе Ultra —
// обратно (коралловый шестиугольник ✦). Оба слоя лежат друг на друге и меняются прозрачностью/масштабом на UI-потоке:
// раскладка не трогается, первый кадр = финальная геометрия.
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Polygon, Stop } from 'react-native-svg';

import type { SubscriptionTier } from '../../../app/subscription_tier';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { LinearGradient } from '../../SafeLinearGradient';

export const DUO_MARK_SIZE = 84;
/** Длительность и кривая смены уровня — как в макете (0,34 с, cubic-bezier(.23,1,.32,1)). */
export const DUO_TIER_SWITCH_MS = 340;
const DUO_EASE = Easing.bezier(0.23, 1, 0.32, 1);
// theme-exempt: чернила глифа на ярком градиенте уровня (≥ 4,5 к обоим цветам градиента).
// theme-exempt: цвета уровней — ровно из утверждённого макета variant-a.html (владелец 11.11: «в точности 1 к 1»), темой не красятся.
export const DUO_TIER_COLORS: Readonly<Record<SubscriptionTier, readonly [string, string, string]>> = Object.freeze({
  ultra: ['#FF7A59', '#FF5F8F', '#FF4FD0'], // theme-exempt: макет --c1/--c2/--c3 Ultra
  plus: ['#A99BFF', '#8E7CFF', '#5F90DB'], // theme-exempt: макет --c1/--c2/--c3 Plus
});
export const DUO_TIER_INK: Readonly<Record<SubscriptionTier, string>> = Object.freeze({ ultra: '#2B0717', plus: '#0F0A33' });

/** 0 — Ultra, 1 — Plus; одно значение ведёт знак, свечение и всё, что должно меняться вместе с ними. */
export function useDuoTierMix(tier: SubscriptionTier): Animated.Value {
  const reduceMotion = useReduceMotion();
  const target = tier === 'plus' ? 1 : 0;
  const mix = useRef(new Animated.Value(target)).current;
  useEffect(() => {
    if (reduceMotion) { mix.setValue(target); return undefined; }
    const animation = Animated.timing(mix, { toValue: target, duration: DUO_TIER_SWITCH_MS, easing: DUO_EASE, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [mix, reduceMotion, target]);
  return mix;
}

const HEX = '42,0 78.1,21 78.1,63 42,84 5.9,63 5.9,21';

function Mark({ tier }: { tier: SubscriptionTier }) {
  const [from, mid, to] = DUO_TIER_COLORS[tier];
  const id = `duo-mark-${tier}`;
  return (
    <Svg width={DUO_MARK_SIZE} height={DUO_MARK_SIZE} viewBox="0 0 84 84">
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="0.5" stopColor={mid} />
          <Stop offset="1" stopColor={to} />
        </SvgLinearGradient>
      </Defs>
      {tier === 'ultra' ? <Polygon points={HEX} fill={`url(#${id})`} /> : <Circle cx="42" cy="42" r="40" fill={`url(#${id})`} />}
      {tier === 'ultra'
        // четырёхлучевая звезда ✦
        ? <Polygon points="42,22 47,37 62,42 47,47 42,62 37,47 22,42 37,37" fill={DUO_TIER_INK.ultra} />
        // ромб ◆
        : <Polygon points="42,24 60,42 42,60 24,42" fill={DUO_TIER_INK.plus} />}
    </Svg>
  );
}

export const PaywallDuoHero = memo(function PaywallDuoHero({ mix }: { mix: Animated.Value }) {
  const layer = (showAt: 0 | 1) => ({
    opacity: mix.interpolate({ inputRange: [0, 1], outputRange: showAt === 0 ? [1, 0] : [0, 1] }),
    transform: [
      { scale: mix.interpolate({ inputRange: [0, 1], outputRange: showAt === 0 ? [1, 0.8] : [0.8, 1] }) },
      { rotate: mix.interpolate({ inputRange: [0, 1], outputRange: showAt === 0 ? ['0deg', '-30deg'] : ['30deg', '0deg'] }) },
    ],
  });
  return (
    <View testID="paywall-duo-hero" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={S.hero}>
      <Animated.View testID="paywall-duo-mark-ultra" style={[StyleSheet.absoluteFill, layer(0)]}><Mark tier="ultra" /></Animated.View>
      <Animated.View testID="paywall-duo-mark-plus" style={[StyleSheet.absoluteFill, layer(1)]}><Mark tier="plus" /></Animated.View>
    </View>
  );
});

/** Мягкое свечение цвета уровня под шапкой окна: два слоя, меняются прозрачностью вместе со знаком. */
export const PaywallDuoGlow = memo(function PaywallDuoGlow({ mix, isLight, height = 360 }: { mix: Animated.Value; isLight: boolean; height?: number }) {
  // макет: свечение цветом --c2 с плотностью 26 % у верхнего края, к низу — в ноль
  const strength = isLight ? '2B' : '42';
  const glow = (tier: SubscriptionTier) => {
    const color = DUO_TIER_COLORS[tier][1];
    return [`${color}${strength}`, `${color}00`] as const;
  };
  return (
    <View pointerEvents="none" style={[S.glow, { height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: mix.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <LinearGradient pointerEvents="none" colors={[...glow('ultra')]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: mix }]}>
        <LinearGradient pointerEvents="none" colors={[...glow('plus')]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
});

const S = StyleSheet.create({
  hero: { width: DUO_MARK_SIZE, height: DUO_MARK_SIZE, marginBottom: 26 },
  glow: { position: 'absolute', left: 0, right: 0, top: 0 },
});
