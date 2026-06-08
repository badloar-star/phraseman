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
};

/**
 * Animated voice waveform shown while the microphone is recording.
 * Each bar pulses on a staggered loop to give a "live listening" feel.
 * Falls back to a calm flat row of dots when inactive.
 */
export function VoiceWaveform({ active, color, idleColor }: VoiceWaveformProps) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
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
  }, [active, bars]);

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
