import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';
import type { ThemeMode } from '../constants/theme';

const ENERGY_IMAGES: Record<ThemeMode, any> = {
  dark: require('../assets/images/energy/energy-forest.webp'),
  neon: require('../assets/images/energy/energy-neon.webp'),
  gold: require('../assets/images/energy/energy-gold.webp'),
  coral: require('../assets/images/energy/energy-coral.webp'),
  minimalDark: require('../assets/images/energy/energy-graphite.webp'),
  minimalLight: require('../assets/images/energy/energy-sketch.webp'),
};

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number;
  animateChange?: boolean;
  shouldShake?: boolean;
  themeMode?: ThemeMode;
  tintColor?: string;
}

export default function EnergyIcon({
  filled,
  size = 30,
  animateChange = true,
  shouldShake = false,
  themeMode,
  tintColor,
}: EnergyIconProps) {
  const emptyOpacity = 0.4;
  const opacityAnim = useRef(new Animated.Value(filled ? 1 : emptyOpacity)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const energyImage = themeMode ? ENERGY_IMAGES[themeMode] : ENERGY_IMAGES.dark;

  useEffect(() => {
    if (animateChange) {
      Animated.timing(opacityAnim, {
        toValue: filled ? 1 : emptyOpacity,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(filled ? 1 : emptyOpacity);
    }
  }, [filled, animateChange, opacityAnim, emptyOpacity]);

  useEffect(() => {
    if (shouldShake) {
      shakeAnim.setValue(0);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -3, duration: 52, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 72, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -2, duration: 60, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }
  }, [shouldShake, shakeAnim]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        opacity: opacityAnim,
        transform: [{ translateX: shakeAnim }],
      }}
    >
      <Image
        source={energyImage}
        style={{
          width: size,
          height: size,
          ...(tintColor ? { tintColor } : {}),
        }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
