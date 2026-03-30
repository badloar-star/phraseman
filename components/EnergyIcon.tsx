import React, { useRef, useEffect } from 'react';
import { Animated, Image } from 'react-native';

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number; // default 20
  animateChange?: boolean;
  shouldShake?: boolean; // Trigger shake animation when energy runs out
}

export default function EnergyIcon({
  filled,
  themeColor,
  size = 20,
  animateChange = true,
  shouldShake = false,
}: EnergyIconProps) {
  const opacityAnim = useRef(new Animated.Value(filled ? 1 : 0.4)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Animate when filled state changes
  useEffect(() => {
    if (animateChange) {
      Animated.timing(opacityAnim, {
        toValue: filled ? 1 : 0.4,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(filled ? 1 : 0.4);
    }
  }, [filled, animateChange, opacityAnim]);

  // Shake animation when shouldShake is triggered
  useEffect(() => {
    if (shouldShake) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: -5,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 5,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -5,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [shouldShake, shakeAnim]);

  const energyImage = require('../assets/images/levels/energy.png');

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
          opacity: filled ? 1 : 0.35,
        }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
