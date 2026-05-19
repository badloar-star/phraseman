import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';
import type { ThemeMode } from '../constants/theme';

type EnergyVariant = 'normal' | 'frozen';
type EnergyAssetThemeMode = ThemeMode | 'crimson';

const ENERGY_IMAGES: Partial<Record<EnergyAssetThemeMode, any>> = {
  dark: require('../assets/images/energy/energy-forest.webp'),
  neon: require('../assets/images/energy/energy-neon.webp'),
  gold: require('../assets/images/energy/energy-gold.webp'),
  coral: require('../assets/images/energy/energy-coral.webp'),
  crimson: require('../assets/images/energy/energy-crimson.webp'),
  minimalDark: require('../assets/images/energy/energy-graphite.webp'),
  minimalLight: require('../assets/images/energy/energy-sketch.webp'),
};

const PREMIUM_ENERGY_IMAGES: Partial<Record<EnergyAssetThemeMode, any>> = {
  minimalLight: require('../assets/images/energy/energy-sketch-premium.webp'),
};

const FROZEN_ENERGY_IMAGES: Partial<Record<EnergyAssetThemeMode, any>> = {
  dark: require('../assets/images/energy/energy-forest-frozen.webp'),
  neon: require('../assets/images/energy/energy-neon-frozen.webp'),
  gold: require('../assets/images/energy/energy-gold-frozen.webp'),
  coral: require('../assets/images/energy/energy-coral-frozen.webp'),
  crimson: require('../assets/images/energy/energy-crimson-frozen.webp'),
  minimalDark: require('../assets/images/energy/energy-graphite-frozen.webp'),
  minimalLight: require('../assets/images/energy/energy-sketch-frozen.webp'),
};

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number;
  animateChange?: boolean;
  shouldShake?: boolean;
  themeMode?: ThemeMode;
  tintColor?: string;
  isPremium?: boolean;
  variant?: EnergyVariant;
}

export default function EnergyIcon({
  filled,
  size = 30,
  animateChange = true,
  shouldShake = false,
  themeMode,
  tintColor,
  isPremium = false,
  variant = 'normal',
}: EnergyIconProps) {
  const emptyOpacity = 0.4;
  const opacityAnim = useRef(new Animated.Value(filled ? 1 : emptyOpacity)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  const fallbackEnergyImage = require('../assets/images/energy/energy-forest.webp');
  const themedEnergyImage = themeMode
    ? (variant === 'frozen' ? FROZEN_ENERGY_IMAGES[themeMode] : ENERGY_IMAGES[themeMode])
    : undefined;
  const premiumEnergyImage = themeMode && variant === 'normal' && isPremium
    ? PREMIUM_ENERGY_IMAGES[themeMode]
    : undefined;
  const energyImage = variant === 'frozen'
    ? themedEnergyImage ?? FROZEN_ENERGY_IMAGES.dark ?? fallbackEnergyImage
    : premiumEnergyImage ?? themedEnergyImage ?? fallbackEnergyImage;

  const computedTint = (() => {
    if (variant === 'frozen') return undefined;
    if (isPremium) return undefined;
    if (tintColor) return tintColor;
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
