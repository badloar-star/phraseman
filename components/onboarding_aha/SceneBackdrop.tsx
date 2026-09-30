import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AHA_THEME } from './aha_theme';

const FADE_IN_MS = 600;

/** Лёгкий фон сцен без старых растровых иллюстраций и Ken Burns. */
export default function SceneBackdrop() {
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
      <LinearGradient
        colors={AHA_THEME.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.liquidBlob, styles.liquidBlobOne]} />
      <View style={[styles.liquidBlob, styles.liquidBlobTwo]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  liquidBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.38,
  },
  liquidBlobOne: {
    width: 260,
    height: 260,
    top: -72,
    left: -72,
    backgroundColor: AHA_THEME.blobBlue,
  },
  liquidBlobTwo: {
    width: 300,
    height: 300,
    right: -130,
    bottom: 80,
    backgroundColor: AHA_THEME.blobViolet,
  },
});
