import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import SceneBackdropFill from '../scene/SceneBackdropFill';

import { useAhaTheme } from './use_aha_theme';

const FADE_IN_MS = 600;

/** Лёгкий фон сцен без старых растровых иллюстраций и Ken Burns. */
export default function SceneBackdrop() {
  const T = useAhaTheme();
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fadeIn, {
      toValue: 1,
      duration: FADE_IN_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [fadeIn]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fadeIn }]}>
      {/* зачем (вердикт владельца 29.10, scenePalette): фон онбординга — утверждённая сцена; «жидкие пятна» прежнего вида убраны — свет сцены даёт сама палитра */}
      <SceneBackdropFill screen="home" logName="onboarding_aha" idPrefix="ahaBg" fallback={[T.bgGradient[0], T.bgGradient[1]]} />
    </Animated.View>
  );
}
