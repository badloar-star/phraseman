import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

/**
 * Кольцо прогресса сундука Бонус-лиги: дуга наматывается один раз (1100мс),
 * в центре — контент (подарок). Без циклов и setInterval.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LeagueChestRingProps {
  percent: number; // 0..100
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  fillColor: string;
  children?: React.ReactNode;
  testID?: string;
}

function LeagueChestRingComponent({ percent, size = 76, strokeWidth = 6, trackColor, fillColor, children, testID }: LeagueChestRingProps) {
  const reduceMotion = useReduceMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(100, percent));

  const anim = useRef(new Animated.Value(reduceMotion ? target : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(target);
      return undefined;
    }
    const a = Animated.timing(anim, {
      toValue: target,
      duration: 1100,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset — одноразово
    });
    a.start();
    return () => a.stop();
  }, [anim, target, reduceMotion]);

  const strokeDashoffset = anim.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] });
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]} testID={testID}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export const LeagueChestRing = memo(LeagueChestRingComponent);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
