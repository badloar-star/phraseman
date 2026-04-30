import React, { useRef, useEffect } from 'react';
import { Animated, Easing, Image } from 'react-native';
import { ThemeMode } from '../constants/theme';

const ENERGY_IMAGES: Partial<Record<ThemeMode, any>> = {
  dark:   require('../assets/images/levels/ENERGY FOREST.png'),
  neon:   require('../assets/images/levels/ENERGY NEON.png'),
  gold:   require('../assets/images/levels/ENERGY CORAL.png'),
  ocean:  require('../assets/images/levels/ENERGY FOREST.png'),
  sakura: require('../assets/images/levels/ENERGY CORAL.png'),
  minimalDark: require('../assets/images/levels/ENERGY FOREST.png'),
  minimalLight: require('../assets/images/levels/ENERGY CORAL.png'),
};

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number; // default 20
  animateChange?: boolean;
  shouldShake?: boolean; // Trigger shake animation when energy runs out
  themeMode?: ThemeMode;
  tintColor?: string; // override tint for premium blue
  isPremium?: boolean;
}

export default function EnergyIcon({
  filled,
  themeColor,
  size = 20,
  animateChange = true,
  shouldShake = false,
  themeMode,
  tintColor,
  isPremium = false,
}: EnergyIconProps) {
  const isLightTheme = themeMode === 'ocean' || themeMode === 'sakura';
  const emptyOpacity = isLightTheme ? 0.6 : 0.4;
  const opacityAnim = useRef(new Animated.Value(filled ? 1 : emptyOpacity)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Animate when filled state changes
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

  // Shake animation when shouldShake is triggered
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

  const fallbackEnergyImage = require('../assets/images/levels/ENERGY FOREST.png');
  const energyImage = isPremium
    ? require('../assets/images/levels/PREMIUM ENERGY.png')
    : (themeMode ? ENERGY_IMAGES[themeMode] : undefined) ?? fallbackEnergyImage;

  // Compute tint for light themes where default PNG colors are hard to see
  const computedTint = (() => {
    if (isPremium) return undefined; // premium image has its own colors — no tint
    if (tintColor) return tintColor;
    if (themeMode === 'ocean') return filled ? '#0076C0' : '#1A4F72';
    if (themeMode === 'sakura') return filled ? '#C0006A' : '#7B1F4E';
    return undefined;
  })();

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
          ...(computedTint ? { tintColor: computedTint } : {}),
        }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
