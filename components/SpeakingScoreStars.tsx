import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { STAR_COUNT, starsForScore } from '../app/speaking_score_stars';

export { starsForScore } from '../app/speaking_score_stars';

/**
 * SpeakingScoreStars — three-star result for Speaking Mode, replacing the
 * percent ring. Warmer and more game-like than a number: the learner earns 1–3
 * stars for the phrase, three stars = a clean pass.
 *
 * Star tiers are derived from the same `passThreshold` the ring used, so the
 * visual stays coherent with the pass rule (no separate magic numbers):
 *   • 1 star  — any real attempt (score > 0), below the pass bar;
 *   • 2 stars — score ≥ passThreshold (this is a pass);
 *   • 3 stars — score ≥ the "great" bar (midpoint between pass and 100, min 90).
 *
 * PERF: pure RN Animated (native driver) — a tiny staggered pop per earned star.
 * No SVG, no Reanimated, no per-frame JS state updates (the ring's old cost).
 * Empty stars are drawn in a muted tone (owner rule: tone, not borders).
 */

export interface SpeakingScoreStarsProps {
  /** Final score 0..100. */
  score: number;
  /** The pass bar (percent). Second star lights at this score. */
  passThreshold: number;
  /** Earned-star fill color. */
  color: string;
  /** Empty-star tone (muted). */
  emptyColor: string;
  size?: number;
  /** DEV/preview: skip the pop animation and show final state immediately. */
  animate?: boolean;
}

function SpeakingScoreStars({
  score,
  passThreshold,
  color,
  emptyColor,
  size = 40,
  animate = true,
}: SpeakingScoreStarsProps) {
  const earned = starsForScore(score, passThreshold);

  // One Animated.Value per star, driving a pop (scale + fade) as it lands.
  const pops = useRef(
    Array.from({ length: STAR_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (!animate) {
      pops.forEach((v, i) => v.setValue(i < earned ? 1 : 0));
      return undefined;
    }
    pops.forEach((v) => v.setValue(0));
    const animations = pops.map((v, i) =>
      Animated.timing(v, {
        toValue: i < earned ? 1 : 0,
        duration: 260,
        delay: i * 140,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
    );
    const seq = Animated.stagger(0, animations);
    seq.start();
    return () => seq.stop();
  }, [earned, animate, pops]);

  return (
    <View style={styles.row} accessibilityRole="image">
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const isEarned = i < earned;
        const pop = pops[i];
        // Earned stars pop in; empty stars sit still at full size, muted tone.
        const scale = isEarned
          ? pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })
          : 1;
        const opacity = isEarned
          ? pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })
          : 1;
        return (
          <Animated.View
            key={`star-${i}`}
            style={[styles.star, { transform: [{ scale }], opacity }]}
          >
            <Ionicons
              name={isEarned ? 'star' : 'star-outline'}
              size={size}
              color={isEarned ? color : emptyColor}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  star: { alignItems: 'center', justifyContent: 'center' },
});

export default memo(SpeakingScoreStars);
