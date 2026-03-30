import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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

  // Lightning bolt SVG path (normalized to 24×24 viewBox)
  const lightningPath =
    'M12 2 L6 12 L10 12 L8 22 L16 12 L12 12 L14 2 Z';

  return (
    <Animated.View
      style={{
        width: size,
        height: size * 1.2,
        opacity: opacityAnim,
        transform: [{ translateX: shakeAnim }],
      }}
    >
      <Svg
        width={size}
        height={size * 1.2}
        viewBox="0 0 24 28"
        fill="none"
      >
        <Path
          d={lightningPath}
          fill={filled ? themeColor : themeColor}
          fillOpacity={filled ? 1 : 0.35}
          stroke={themeColor}
          strokeWidth={filled ? 0 : 0.5}
        />
      </Svg>
    </Animated.View>
  );
}
