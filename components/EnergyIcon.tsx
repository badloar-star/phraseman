import React, { useRef, useEffect } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface EnergyIconProps {
  filled: boolean;
  themeColor: string;
  size?: number; // default 20
  animateChange?: boolean;
}

export default function EnergyIcon({
  filled,
  themeColor,
  size = 20,
  animateChange = true,
}: EnergyIconProps) {
  const opacityAnim = useRef(new Animated.Value(filled ? 1 : 0.4)).current;

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

  // Lightning bolt SVG path (normalized to 24×24 viewBox)
  const lightningPath =
    'M12 2 L6 12 L10 12 L8 22 L16 12 L12 12 L14 2 Z';

  return (
    <Animated.View
      style={{
        width: size,
        height: size * 1.2,
        opacity: opacityAnim,
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
