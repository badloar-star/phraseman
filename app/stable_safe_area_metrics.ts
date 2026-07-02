import Constants from 'expo-constants';
import { Dimensions, Platform, StatusBar } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets, type EdgeInsets, type Metrics } from 'react-native-safe-area-context';

const windowFrame = Dimensions?.get?.('window') ?? { width: 0, height: 0 };

function getFallbackTopInset(): number {
  const statusBarHeight = Platform?.OS === 'android'
    ? StatusBar?.currentHeight
    : Constants.statusBarHeight;
  return Math.max(0, Math.round(statusBarHeight ?? 0));
}

function withStableTopInset(metrics: Metrics | null): Metrics {
  const fallbackTop = getFallbackTopInset();
  const baseFrame = metrics?.frame ?? {
    x: 0,
    y: 0,
    width: windowFrame.width,
    height: windowFrame.height,
  };
  const baseInsets = metrics?.insets ?? {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };

  return {
    frame: baseFrame,
    insets: {
      ...baseInsets,
      top: Math.max(baseInsets.top, fallbackTop),
    },
  };
}

export const stableInitialWindowMetrics: Metrics = withStableTopInset(initialWindowMetrics);

export function getStableSafeAreaTopInset(nativeTopInset: number): number {
  return Math.max(nativeTopInset, stableInitialWindowMetrics.insets.top);
}

export function getStableSafeAreaBottomInset(nativeBottomInset: number): number {
  return Math.max(nativeBottomInset, stableInitialWindowMetrics.insets.bottom);
}

export function useStableSafeAreaInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  return {
    ...insets,
    top: getStableSafeAreaTopInset(insets.top),
    bottom: getStableSafeAreaBottomInset(insets.bottom),
  };
}
