import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { MOTION_DURATION } from '../constants/motion';

/**
 * Плавное появление/смена затемнения под центрированными модалками (Modal + animationType="none").
 */
export function useModalBackdropFade(visible: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // opacity: useNativeDriver: false — на Fabric/Android стабильнее (нет странных сбоев на shadowProps/Float)
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? MOTION_DURATION.normal : MOTION_DURATION.fast,
      useNativeDriver: false,
    }).start();
  }, [visible, opacity]);

  return opacity;
}
