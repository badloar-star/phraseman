// ═══════════════════════════════════════════════════════════════════════════
// SceneStarTwinkle.tsx — мерцающие звёзды «Глубокого неба» (тёмные сцены).
//
// зачем (владелец 29.10: «с небом в тёмных темах, то есть со светящимися звёздами»; координатор: мерцание на UI-треде, без setState в кадрах, при «Убрать анимации» — статика):
// каждая 5-я звезда из палитры (14 из 70) рисуется отдельным Animated.View с общим значением на звезду; остальные звёзды остаются в Svg фона. Положение — в процентах
// от области сцены, поэтому слой не зависит от размеров канвы палитры. Цикл крутит Reanimated (withRepeat), React не перерисовывается. Слой лежит под иконками
// (в SceneBackdrop, первым в родителе), касаний не ловит.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../../hooks/use_reduce_motion';

/** Каждая N-я звезда палитры мерцает (остальные статичны в Svg фона). */
export const SCENE_TWINKLE_EVERY = 5;
const DOT = 3;

type Star = Readonly<{ x: number; y: number; r: number; a: number }>;
type Props = Readonly<{ stars: ReadonlyArray<Star> }>;

function Dot({ star, index, animate }: { star: Star; index: number; animate: boolean }) {
  const o = useSharedValue(star.a);
  useEffect(() => {
    if (!animate) {
      cancelAnimation(o);
      o.value = star.a;
      return undefined;
    }
    const low = Math.max(0.12, star.a * 0.25);
    const dur = 1300 + (index % 4) * 350;
    const ease = Easing.inOut(Easing.sin);
    o.value = withDelay((index * 430) % 2600, withRepeat(withSequence(withTiming(1, { duration: dur, easing: ease }), withTiming(low, { duration: dur, easing: ease })), -1, false));
    return () => cancelAnimation(o);
  }, [animate, index, o, star.a]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  const size = Math.max(DOT, star.r * 2.2);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute', left: `${star.x * 100}%`, top: `${star.y * 100}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: size / 2,
          backgroundColor: '#FFFFFF', // theme-exempt: звёзды неба сцены — материал арта, не токен темы
          shadowColor: '#FFFFFF', shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, // theme-exempt: свечение звезды
        },
        style,
      ]}
    />
  );
}

function SceneStarTwinkle({ stars }: Props) {
  const reduce = useReduceMotion();
  const picked = useMemo(() => stars.filter((_, i) => i % SCENE_TWINKLE_EVERY === 0), [stars]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {picked.map((s, i) => <Dot key={i} star={s} index={i} animate={!reduce} />)}
    </View>
  );
}

export default memo(SceneStarTwinkle);
