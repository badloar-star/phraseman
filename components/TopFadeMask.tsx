import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from './SafeLinearGradient';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';

const DEFAULT_FEATHER_HEIGHT = 36;

export interface TopFadeMaskProps {
  /**
   * Optional visible header height below the safe area. Default screens use 0,
   * so only the top safe zone is tinted.
   */
  headerHeight?: number;
  /**
   * Feather extension below the safe area/header. This is an alpha mask fade,
   * not stacked blur bands.
   */
  extra?: number;
  /** Static tint strength 0..1. */
  maxOpacity?: number;
  /** Kept for API compatibility with the previous feathered implementation. */
  solidRatio?: number;
  tone?: 'dark' | 'light';
  scrollY?: Animated.Value;
  showThreshold?: number;
  zIndex?: number;
  style?: ViewStyle;
}

function rgbaWithAlpha(rgb: string, a: number): string {
  const clamped = Math.min(1, Math.max(0, a));
  return `rgba(${rgb},${clamped.toFixed(3)})`;
}

export default function TopFadeMask({
  headerHeight = 0,
  extra = DEFAULT_FEATHER_HEIGHT,
  maxOpacity = 0.72,
  tone,
  scrollY,
  showThreshold = 6,
  zIndex = 5,
  style,
}: TopFadeMaskProps) {
  const insets = useStableSafeAreaInsets();

  const maskOpacity = useRef(new Animated.Value(scrollY ? 0 : 1)).current;
  const shownRef = useRef(!scrollY);

  useEffect(() => {
    if (!scrollY) return undefined;
    const id = scrollY.addListener(({ value }) => {
      const shouldShow = value > showThreshold;
      if (shouldShow === shownRef.current) return;
      shownRef.current = shouldShow;
      Animated.timing(maskOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: shouldShow ? 180 : 260,
        useNativeDriver: true,
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, showThreshold, maskOpacity]);

  const height = insets.top + headerHeight + extra;
  if (height <= 0) return null;

  const animatedOpacity = scrollY ? maskOpacity : undefined;
  const resolvedTone = tone ?? 'dark';
  const rgb = resolvedTone === 'light' ? '255,255,255' : '0,0,0';
  const strength = Math.min(1, Math.max(0, maxOpacity));
  const scrim = rgbaWithAlpha(rgb, strength * 0.62);
  const featherStart = Math.max(0, Math.min(1, (height - extra) / height));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.mask, { height, zIndex, elevation: zIndex }, style, animatedOpacity ? { opacity: animatedOpacity } : null]}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={['rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
            locations={[0, featherStart, 1]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
      </MaskedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  mask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
