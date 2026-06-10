import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import CircularProgress from './CircularProgress';

/**
 * SpeakingScoreRing — the Rosetta-style result ring for Speaking Mode.
 *
 * Thin local wrapper that animates the fill from 0 to the final score, then
 * renders the shared CircularProgress at each frame. The shared component is
 * intentionally left untouched (other screens depend on it), so the animation
 * lives here only.
 *
 * Driven by an Animated.Value whose listener mirrors the rounded value into
 * state, because CircularProgress takes a plain `pct` number (it is not an
 * Animated-aware component).
 */

export interface SpeakingScoreRingProps {
  /** Final score 0..100 to fill to. */
  score: number;
  /** Ring fill color (e.g. green on pass, red on fail). */
  color: string;
  /** Track / background color behind the fill. */
  trackColor: string;
  /** Percent label color. */
  textColor: string;
  /** Hole color (center of the ring). Defaults to the track color. */
  innerBg?: string;
  size?: number;
  strokeWidth?: number;
  fontSize?: number;
  /** Fill duration in ms. */
  durationMs?: number;
  /** DEV/preview: skip the animation and show the final value immediately. */
  animate?: boolean;
}

function SpeakingScoreRing({
  score,
  color,
  trackColor,
  textColor,
  innerBg,
  size = 100,
  strokeWidth = 8,
  fontSize = 30,
  durationMs = 600,
  animate = true,
}: SpeakingScoreRingProps) {
  const target = Math.max(0, Math.min(100, Math.round(score)));
  const progress = useRef(new Animated.Value(animate ? 0 : target)).current;
  const [shown, setShown] = useState(animate ? 0 : target);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setShown(Math.round(value)));
    if (animate) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: target,
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
        // Numeric tween read via listener -> JS driver required.
        useNativeDriver: false,
      }).start();
    } else {
      progress.setValue(target);
      setShown(target);
    }
    return () => progress.removeListener(id);
  }, [target, animate, durationMs, progress]);

  return (
    <CircularProgress
      pct={shown}
      size={size}
      sw={strokeWidth}
      color={color}
      bg={trackColor}
      textColor={textColor}
      innerBg={innerBg}
      fontSize={fontSize}
    />
  );
}

export default memo(SpeakingScoreRing);
