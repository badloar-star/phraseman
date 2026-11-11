/**
 * Подъём элемента при появлении — из макета в точности (docs/design/v2-app/elevate-mechanics.css:117–118, `.rise`):
 * 520 мс cubic-bezier(.2,1,.3,1), из прозрачности 0 и сдвига вниз на 18, с задержкой `delayMs`.
 * Числа — в constants/gameMotion.ts.
 */
import React, { memo, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { GAME_EASE, GAME_MOTION } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type Props = Readonly<{ delayMs?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }>;

function GameRise({ delayMs = 0, style, children }: Props) {
  const reduceMotion = useReduceMotion();
  const value = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      value.value = 1;
      return undefined;
    }
    const c = GAME_EASE.out;
    value.value = withDelay(delayMs, withTiming(1, { duration: GAME_MOTION.riseMs, easing: Easing.bezier(c[0], c[1], c[2], c[3]) }));
    return () => cancelAnimation(value);
  }, [delayMs, reduceMotion, value]);

  const animated = useAnimatedStyle(() => ({ opacity: value.value, transform: [{ translateY: (1 - value.value) * GAME_MOTION.riseShift }] }));
  return <Reanimated.View style={[style, animated]}>{children}</Reanimated.View>;
}

export default memo(GameRise);
