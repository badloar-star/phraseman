import React, { memo, useEffect } from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export const AMBIENT_RELIC_OPACITY = 0.07;
export const AMBIENT_RELIC_WIDTH_RATIO = 1.2;

type LeagueAmbientRelicProps = {
  source: ImageSourcePropType;
  active: boolean;
  reduceMotion: boolean;
  viewportWidth: number;
};

function LeagueAmbientRelicComponent({
  source,
  active,
  reduceMotion,
  viewportWidth,
}: LeagueAmbientRelicProps) {
  const motion = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(motion);
    motion.value = 0;

    if (!active || reduceMotion) return undefined;

    motion.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3_600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3_600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(motion);
      motion.value = 0;
    };
  }, [active, motion, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -8 * motion.value },
      { scale: 1 + 0.015 * motion.value },
    ],
  }));

  const relicSize = Math.max(1, Math.round(viewportWidth * AMBIENT_RELIC_WIDTH_RATIO));

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="league-ambient-relic"
      style={[styles.layer, animatedStyle]}
    >
      <Image
        source={source}
        resizeMode="contain"
        style={{
          width: relicSize,
          height: relicSize,
          opacity: AMBIENT_RELIC_OPACITY,
        }}
      />
    </Animated.View>
  );
}

export const LeagueAmbientRelic = memo(LeagueAmbientRelicComponent);

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
