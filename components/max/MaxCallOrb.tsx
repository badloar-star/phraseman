import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { MaxHomeOrbLayers } from '../../app/max_home_orb_assets';
import { orbAudioResponse, smoothRemoteAudioLevel } from '../../app/max_call_audio_level';
import { MAX_CALL_ORB_HYBRID } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import MaxHomeOrb from '../home/MaxHomeOrb';

export type MaxCallOrbRef = { setAudioLevel(level: number | null): void };
type Props = { layers: MaxHomeOrbLayers; ownerVisible: boolean };

export const MaxCallOrb = forwardRef<MaxCallOrbRef, Props>(function MaxCallOrb(
  { layers, ownerVisible },
  ref,
) {
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useRef(reduceMotion);
  const lastTargetRef = useRef(1);
  const smoothedLevelRef = useRef(0);
  const scale = useSharedValue(1);
  reduceMotionRef.current = reduceMotion;

  useEffect(() => {
    if (ownerVisible && !reduceMotion) return;
    cancelAnimation(scale);
    lastTargetRef.current = 1;
    smoothedLevelRef.current = 0;
    scale.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: MAX_CALL_ORB_HYBRID.resetMs,
          easing: Easing.out(Easing.sin),
        });
  }, [ownerVisible, reduceMotion, scale]);

  useImperativeHandle(ref, () => ({
    setAudioLevel(level) {
      if (
        reduceMotionRef.current
        || !ownerVisible
        || level === null
        || !Number.isFinite(level)
      ) {
        lastTargetRef.current = 1;
        smoothedLevelRef.current = 0;
        scale.value = reduceMotionRef.current
          ? 1
          : withTiming(1, {
              duration: MAX_CALL_ORB_HYBRID.resetMs,
              easing: Easing.out(Easing.sin),
            });
        return;
      }

      const smoothed = smoothRemoteAudioLevel(smoothedLevelRef.current, level);
      smoothedLevelRef.current = smoothed;
      // зачем: кривая отклика живёт в чистом модуле и покрыта тестами —
      // компонент не имеет права считать масштаб по-своему, иначе экран и
      // юнит-тесты разъедутся (ровно так пульсация и потерялась).
      const target = 1 + orbAudioResponse(smoothed) * MAX_CALL_ORB_HYBRID.audioScaleMax;
      const growing = target > lastTargetRef.current;
      lastTargetRef.current = target;
      scale.value = withTiming(target, {
        duration: growing ? MAX_CALL_ORB_HYBRID.attackMs : MAX_CALL_ORB_HYBRID.releaseMs,
        easing: Easing.inOut(Easing.sin),
      });
    },
  }), [ownerVisible, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      testID="max-call-orb"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={animatedStyle}
    >
      <MaxHomeOrb
        layers={layers}
        size={MAX_CALL_ORB_HYBRID.size}
        ownerVisible={ownerVisible}
      />
    </Animated.View>
  );
});
