// ════════════════════════════════════════════════════════════════════════════
// constellation_starfield.tsx — мерцающий звёздный фон режима «Созвездия».
//
// Даёт экрану «жизнь» (жалоба «нет ощущения что страница живая»). Бесконечный
// цикл мерцания ГЕЙТИТСЯ фокусом (Performance Bible): при уходе с экрана
// звёзды замирают, не жгут кадры в фоне. Сид от индекса — стабильная раскладка
// без Math.random в рендере. Переиспользуется на экране матча и результатов.
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function TwinkleStar(
  { x, y, r, delay, dur, focused }: { x: number; y: number; r: number; delay: number; dur: number; focused: boolean },
) {
  const o = useSharedValue(0.3);
  useEffect(() => {
    if (!focused) { o.value = 0.4; return; }
    o.value = withDelay(delay, withRepeat(
      withTiming(0.9, { duration: dur, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    ));
  }, [o, delay, dur, focused]);
  const props = useAnimatedProps(() => ({ opacity: o.value }));
  return <AnimatedCircle cx={x} cy={y} r={r} fill="#EAF2FF" animatedProps={props} />;
}

/** Мерцающий звёздный фон. count — число звёзд (меньше на слабых экранах). */
export function ConstellationStarfield({ count = 44 }: { count?: number }) {
  const focused = useIsScreenFocused();
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => {
    const s = Math.sin(i * 127.3) * 10000;
    const frac = (n: number) => n - Math.floor(n);
    return {
      x: frac(s) * 100,
      y: frac(s * 1.7) * 100,
      r: (0.6 + frac(s * 2.3) * 1.6) * 0.12,
      delay: frac(s * 3.1) * 2500,
      dur: 1400 + frac(s * 4.7) * 2200,
    };
  }), [count]);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%"
      viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
      {stars.map((st, i) => (
        <TwinkleStar key={i} x={st.x} y={st.y} r={st.r} delay={st.delay} dur={st.dur} focused={focused} />
      ))}
    </Svg>
  );
}
