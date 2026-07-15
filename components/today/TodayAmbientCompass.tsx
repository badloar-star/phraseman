import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

type Props = {
  ownerVisible: boolean;
  entryEpoch: number;
  accent: string;
  muted: string;
};

const STAGE_SIZE = 188;
const OUTER_RING_SIZE = 164;
const INNER_RING_SIZE = 116;
const CORE_SIZE = 70;
const ENTRY_DURATION_MS = 840;

export default function TodayAmbientCompass({ ownerVisible, entryEpoch, accent, muted }: Props) {
  const { width } = useWindowDimensions();
  const scale = Math.max(1, Math.min(1.28, (width - 44) / 264));
  const active = useRuntimeActive(ownerVisible);
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  const drift = useSharedValue(0);
  const ringEntry = useSharedValue(1);
  const coreEntry = useSharedValue(1);
  const needleAngle = useSharedValue(21);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(drift);
    cancelAnimation(ringEntry);
    cancelAnimation(coreEntry);
    cancelAnimation(needleAngle);

    if (active && !reduceMotion) {
      ringEntry.value = 0.42;
      coreEntry.value = 0.86;
      needleAngle.value = -38;
      ringEntry.value = withSequence(
        withTiming(1.15, { duration: 560, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 280, easing: Easing.inOut(Easing.quad) }),
      );
      coreEntry.value = withSequence(
        withTiming(1.05, { duration: 540, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      );
      needleAngle.value = withSequence(
        withTiming(27, { duration: 570, easing: Easing.out(Easing.cubic) }),
        withTiming(21, { duration: 270, easing: Easing.inOut(Easing.quad) }),
      );
      breath.value = withDelay(
        ENTRY_DURATION_MS,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
            withTiming(0, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      );
      drift.value = withDelay(
        ENTRY_DURATION_MS,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 4600, easing: Easing.inOut(Easing.sin) }),
            withTiming(-1, { duration: 4600, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          true,
        ),
      );
    } else {
      ringEntry.value = 1;
      coreEntry.value = 1;
      needleAngle.value = 21;
      breath.value = 0;
      drift.value = 0;
    }

    return () => {
      cancelAnimation(breath);
      cancelAnimation(drift);
      cancelAnimation(ringEntry);
      cancelAnimation(coreEntry);
      cancelAnimation(needleAngle);
    };
  }, [active, breath, coreEntry, drift, entryEpoch, needleAngle, reduceMotion, ringEntry]);

  const outerRingStyle = useAnimatedStyle(() => ({
    opacity: 0.62 + breath.value * 0.2,
    transform: [{ scale: ringEntry.value * (0.985 + breath.value * 0.025) }],
  }));
  const innerRingStyle = useAnimatedStyle(() => ({
    opacity: 0.46 + breath.value * 0.18,
    transform: [{ scale: ringEntry.value * (1.015 - breath.value * 0.018) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + breath.value * 0.1,
    transform: [{ scale: coreEntry.value * (0.96 + breath.value * 0.12) }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreEntry.value * (1 + breath.value * 0.025) }],
  }));
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleAngle.value + drift.value * 2}deg` }],
  }));

  return (
    <View
      style={[styles.frame, { width: STAGE_SIZE * scale, height: STAGE_SIZE * scale }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.stage, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.glow, { backgroundColor: accent }, glowStyle]} />
        <Animated.View style={[styles.outerRing, { borderColor: `${accent}30` }, outerRingStyle]} />
        <Animated.View style={[styles.innerRing, { borderColor: `${muted}2B` }, innerRingStyle]} />
        <Animated.View style={[styles.core, { backgroundColor: `${accent}1C`, borderColor: `${accent}52` }, coreStyle]}>
          <Animated.View style={[styles.needle, needleStyle]}>
            <Svg width={14} height={50} viewBox="0 0 14 50">
              <Path d="M7 0 L14 25 L7 21 L0 25 Z" fill={accent} />
              <Path d="M7 50 L0 25 L7 29 L14 25 Z" fill={muted} fillOpacity={0.58} />
              <Circle cx="7" cy="25" r="2.4" fill="#F4F6EF" />
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  stage: { width: STAGE_SIZE, height: STAGE_SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 126, height: 126, borderRadius: 63 },
  outerRing: { position: 'absolute', width: OUTER_RING_SIZE, height: OUTER_RING_SIZE, borderRadius: OUTER_RING_SIZE / 2, borderWidth: 1 },
  innerRing: { position: 'absolute', width: INNER_RING_SIZE, height: INNER_RING_SIZE, borderRadius: INNER_RING_SIZE / 2, borderWidth: 1, borderStyle: 'dashed' },
  core: { width: CORE_SIZE, height: CORE_SIZE, borderRadius: CORE_SIZE / 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#79A92B', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
  needle: { width: 14, height: 50 },
});
