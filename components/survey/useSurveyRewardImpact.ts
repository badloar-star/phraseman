import { useEffect, useRef } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CHK, LUM, SURVEY_HYBRID } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

export function useSurveyRewardImpact(visible: boolean) {
  const reduceMotion = useReduceMotion();
  const playedRef = useRef(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const stop = () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(scale);
    };
    if (!visible || playedRef.current) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      if (visible) playedRef.current = true;
      return stop;
    }

    playedRef.current = true;
    opacity.value = 0;
    translateY.value = reduceMotion ? 0 : SURVEY_HYBRID.rewardLiftPx;
    scale.value = reduceMotion ? 1 : SURVEY_HYBRID.rewardStartScale;
    opacity.value = withTiming(1, {
      duration: reduceMotion ? LUM.heroFadeMs : LUM.resolveMs,
      easing: Easing.out(Easing.cubic),
    });
    if (!reduceMotion) {
      translateY.value = withTiming(0, {
        duration: CHK.fallMs,
        easing: Easing.bezier(...CHK.fallBezier),
      });
      scale.value = withSpring(1, CHK.squash);
    }

    return stop;
  }, [opacity, reduceMotion, scale, translateY, visible]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
}
