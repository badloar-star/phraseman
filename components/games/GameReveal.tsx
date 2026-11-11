/**
 * Блок, который проявляется на своём месте, — из макета в точности (docs/design/v2-app/elevate-mechanics.css):
 *  • `.why` / `.why.hid` (строки 151–152): прозрачность 360 мс, сдвиг снизу 14 → 0 за 520 мс cubic-bezier(.2,1,.3,1);
 *  • `.fade` / `.hid` (строки 119–120): только прозрачность, 320 мс — вариант `plain`.
 * Место под блок занято всегда, поэтому всё, что ниже, не прыгает. Числа — в constants/gameMotion.ts.
 */
import React, { memo, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GAME_EASE, GAME_MOTION } from '../../constants/gameMotion';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type Props = Readonly<{ shown: boolean; plain?: boolean; style?: StyleProp<ViewStyle>; children: React.ReactNode }>;

const bezier = (c: readonly number[]) => Easing.bezier(c[0], c[1], c[2], c[3]);

function GameReveal({ shown, plain = false, style, children }: Props) {
  const reduceMotion = useReduceMotion();
  const fade = useSharedValue(shown ? 1 : 0);
  const shift = useSharedValue(shown ? 1 : 0);
  const distance = plain ? 0 : GAME_MOTION.whyShift;

  useEffect(() => {
    const target = shown ? 1 : 0;
    fade.value = withTiming(target, { duration: reduceMotion ? 0 : plain ? GAME_MOTION.fadeMs : GAME_MOTION.whyFadeMs, easing: bezier(GAME_EASE.ease) });
    shift.value = withTiming(target, { duration: reduceMotion ? 0 : GAME_MOTION.whyShiftMs, easing: bezier(GAME_EASE.out) });
  }, [fade, plain, reduceMotion, shift, shown]);

  const animated = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: (1 - shift.value) * distance }] }));
  return <Reanimated.View pointerEvents={shown ? 'auto' : 'none'} style={[style, animated]}>{children}</Reanimated.View>;
}

export default memo(GameReveal);
