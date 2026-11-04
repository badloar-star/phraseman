import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { LUM } from '../constants/motionHybrid';
import { useSystemReduceMotion } from './use_system_reduce_motion';

/**
 * Мягкое появление блока: opacity 0→1 и сдвиг снизу 8→0, только transform/opacity на нативном драйвере.
 * зачем (владелец одобрил Волну 2, пункт 8 «пустые состояния»): пустой блок не должен «выскакивать» —
 * тупик читается спокойнее, когда появляется плавно. Одна кривая и длительность с остальным китом (LUM.contentMs).
 * `active=false` держит блок скрытым (например, пока не готов замер раскладки); reduce-motion — сразу без движения.
 */
export function useSoftAppear(active: boolean = true): Readonly<{ opacity: Animated.Value; transform: ReadonlyArray<{ translateY: Animated.AnimatedInterpolation<number> }> }> {
  const reduceMotion = useSystemReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      progress.setValue(0);
      return undefined;
    }
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: LUM.contentMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => progress.stopAnimation();
  }, [active, progress, reduceMotion]);
  const translateY = useRef(progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })).current;
  return { opacity: progress, transform: [{ translateY }] };
}
