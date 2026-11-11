/**
 * Число, которое подскакивает при смене значения, — из макета в точности (docs/design/v2-app/kit.css:137, `numup`;
 * elevate-mechanics.css:56, `.bump`): 650 мс cubic-bezier(.3,1.4,.5,1), на 35 % пути — вверх на 5 и крупнее в 1,22,
 * затем обратно. При первом показе не подскакивает. Числа — в constants/gameMotion.ts.
 */
import React, { memo, useEffect, useRef } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { GAME_EASE, GAME_MOTION } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type Props = Readonly<{ value: string; style?: StyleProp<TextStyle> }>;

function GameBumpText({ value, style }: Props) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (reduceMotion) return undefined;
    const c = GAME_EASE.spring;
    const spring = Easing.bezier(c[0], c[1], c[2], c[3]);
    t.value = 0;
    t.value = withSequence(
      withTiming(1, { duration: GAME_MOTION.bumpMs * GAME_MOTION.bumpPeakAt, easing: spring }),
      withTiming(0, { duration: GAME_MOTION.bumpMs * (1 - GAME_MOTION.bumpPeakAt), easing: spring }),
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, t, value]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: GAME_MOTION.bumpShift * t.value }, { scale: 1 + (GAME_MOTION.bumpScale - 1) * t.value }] }));
  return <Reanimated.Text style={[style, animated]}>{value}</Reanimated.Text>;
}

export default memo(GameBumpText);
