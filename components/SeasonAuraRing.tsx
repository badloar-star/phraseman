// зачем: Season Pass утверждён с четырьмя сгенерированными кольцами-аурами
// (docs/plans/2026-08-03-season-pass-gift-catalog.ru.md, «окей оставляем»
// 2026-08-03) — пульс масштаба + медленное кручение, как в спецификации
// season_status_rewards.template.html (--pd 8.4-9.2s, --sd 22-36s).
// Это НЕ AvatarAura.tsx: тот движок рисует ауру процедурно градиентными
// слоями по цветам из constants/avatar_auras.ts, здесь — готовые PNG-кольца.
// Разные рендер-пути для одной концепции, переиспользовать чужой нельзя
// без переписывания общего компонента (используется везде, не только тут).
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, type ImageSourcePropType } from 'react-native';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';

interface Props {
  source: ImageSourcePropType;
  size: number;
  pulse?: boolean;
  spin?: boolean;
  pulseDurationMs?: number;
  spinDurationMs?: number;
}

function SeasonAuraRing({ source, size, pulse = true, spin = false, pulseDurationMs = 8600, spinDurationMs = 28000 }: Props) {
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const shouldAnimate = isFocused && !reduceMotion;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shouldAnimate || !pulse) {
      scaleAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(scaleAnim, {
      toValue: 1,
      duration: pulseDurationMs,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseDurationMs, scaleAnim, shouldAnimate]);

  useEffect(() => {
    if (!shouldAnimate || !spin) {
      rotateAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.timing(rotateAnim, {
      toValue: 1,
      duration: spinDurationMs,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [rotateAnim, shouldAnimate, spin, spinDurationMs]);

  const scale = scaleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.955, 1.045, 0.955] });
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.Image
      source={source}
      resizeMode="contain"
      accessible={false}
      style={{
        width: size,
        height: size,
        transform: [{ scale: pulse ? scale : 1 }, { rotate: spin ? rotate : '0deg' }],
      }}
    />
  );
}

export default memo(SeasonAuraRing);
