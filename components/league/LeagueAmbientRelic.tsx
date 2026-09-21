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

  // зачем (владелец 2026-09-21, «в лиге лагает скролл» на TestFlight): раньше
  // тут рядом с translateY жило масштабирование на 1.5% от motion. Слой —
  // полноэкранный и РАЗМЕРОМ В 1.2 ЭКРАНА (AMBIENT_RELIC_WIDTH_RATIO), поэтому
  // масштабирование заставляло систему пересэмплировать огромную картинку
  // КАЖДЫЙ кадр, и делало это параллельно со скроллом списка — две тяжёлые
  // задачи на композитор одновременно. translateY двигает уже готовый слой и
  // стоит копейки. Разница на глаз неразличима: амплитуда была 1.5%, причём при
  // прозрачности 0.07 (AMBIENT_RELIC_OPACITY) — то есть её физически не видно.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 * motion.value }],
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
