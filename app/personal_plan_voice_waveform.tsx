import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BAR_COUNT = 7;
// Per-bar relative heights so the waveform looks organic, not uniform.
const BAR_PEAKS = [0.45, 0.8, 1.0, 0.65, 1.0, 0.8, 0.45];
const BAR_DELAYS = [0, 90, 180, 60, 150, 110, 40];

type VoiceWaveformProps = {
  active: boolean;
  color: string;
  idleColor: string;
  /**
   * Live microphone level, 0..1 (from speaking_volume.nextVolumeLevel).
   * When provided, bar heights track the real voice level instead of the
   * decorative auto-pulse. When omitted (e.g. dev preview with no mic), the
   * waveform falls back to the staggered pulse loop so it still looks alive.
   */
  level?: number;
};

/**
 * Animated voice waveform shown while the microphone is recording.
 *
 * Two modes:
 * - `level` supplied -> bars react to the real voice level (each bar scaled by
 *   its BAR_PEAKS weight so it reads as an equalizer, not one column).
 * - `level` omitted -> staggered pulse loop ("live listening" feel) as a
 *   fallback. Inactive collapses to a calm flat row.
 */
export function VoiceWaveform({ active, color, idleColor, level }: VoiceWaveformProps) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0)),
  ).current;
  const levelDriven = typeof level === 'number';

  // Level-driven mode: glide each bar to (level * peak) on every level change.
  useEffect(() => {
    if (!levelDriven) return;
    if (!active) {
      bars.forEach((bar) => {
        Animated.timing(bar, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
      return;
    }
    const clamped = Math.max(0, Math.min(1, level as number));
    bars.forEach((bar, index) => {
      const peak = BAR_PEAKS[index] ?? 0.7;
      Animated.timing(bar, {
        toValue: clamped * peak,
        duration: 110,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [levelDriven, active, level, bars]);

  // Fallback mode: staggered auto-pulse loop when no level is supplied.
  useEffect(() => {
    if (levelDriven) return;
    if (!active) {
      bars.forEach((bar) => {
        Animated.timing(bar, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    const loops = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 360 + (index % 3) * 80,
            delay: BAR_DELAYS[index],
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.2,
            duration: 320 + (index % 2) * 90,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [levelDriven, active, bars]);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {bars.map((bar, index) => {
        const peak = BAR_PEAKS[index] ?? 0.7;
        return (
          <Animated.View
            key={`wave-bar-${index}`}
            style={[
              styles.bar,
              {
                backgroundColor: active ? color : idleColor,
                height: bar.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 6 + peak * 30],
                }),
                opacity: active
                  ? bar.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] })
                  : 0.4,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
  },
  bar: {
    width: 5,
    borderRadius: 3,
  },
});

// This file lives in app/ but is a helper component, not a route.
// Expo Router requires a default export for every file in app/.
export default function __RouteShim() {
  return null;
}
