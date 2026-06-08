import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const BAR_COUNT = 9;
const BAR_PEAKS = [0.35, 0.65, 0.9, 1.0, 0.75, 1.0, 0.85, 0.6, 0.3];
const BAR_DELAYS = [0, 70, 140, 30, 110, 60, 180, 90, 20];

type PlaybackWaveformProps = {
  playing: boolean;
  color: string;
  idleColor: string;
  height?: number;
};

export function PlaybackWaveform({ playing, color, idleColor, height = 56 }: PlaybackWaveformProps) {
  const bars = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!playing) {
      bars.forEach((bar) => {
        Animated.timing(bar, {
          toValue: 0,
          duration: 300,
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
            duration: 420 + (index % 4) * 70,
            delay: BAR_DELAYS[index],
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(bar, {
            toValue: 0.15,
            duration: 380 + (index % 3) * 80,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [playing, bars]);

  return (
    <View
      style={[styles.row, { height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {bars.map((bar, index) => {
        const peak = BAR_PEAKS[index] ?? 0.6;
        const minH = 5;
        const maxH = (height - 8) * peak;
        return (
          <Animated.View
            key={`pb-bar-${index}`}
            style={[
              styles.bar,
              {
                backgroundColor: playing ? color : idleColor,
                height: bar.interpolate({
                  inputRange: [0, 1],
                  outputRange: [minH, maxH],
                }),
                opacity: playing
                  ? bar.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })
                  : 0.28,
                shadowColor: playing ? color : 'transparent',
                shadowOpacity: playing ? 0.6 : 0,
                shadowRadius: 6,
                elevation: playing ? 2 : 0,
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
    gap: 5,
  },
  bar: {
    width: 5,
    borderRadius: 4,
  },
});

export default function __RouteShim() {
  return null;
}
