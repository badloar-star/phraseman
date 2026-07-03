import React, { memo, useEffect, useRef, useState } from 'react';
import { Easing } from 'react-native';

import CircularProgress from './CircularProgress';

/**
 * SpeakingScoreRing — the Rosetta-style result ring for Speaking Mode.
 *
 * Thin local wrapper that animates the fill from 0 to the final score, then
 * renders the shared CircularProgress at each frame. The shared component is
 * intentionally left untouched (other screens depend on it), so the animation
 * lives here only.
 *
 * PERF: CircularProgress is NOT an SVG — it draws the arc with three rotated
 * Views, so every `pct` change forces a JS-thread re-layout of those rotated
 * layers. The previous version drove the fill from an Animated.Value whose
 * listener fired on EVERY frame (~60/s) and called setState each time, which
 * meant ~60–90 full re-layouts in 600ms → visible stutter, worst on Android.
 *
 * Fix: drive the fill with a small fixed number of quantised steps on a timer.
 * The eye reads ~20 steps as perfectly smooth, but that is ~4× fewer JS
 * re-layouts, so the ring no longer lags. No native module / SVG / Reanimated
 * dependency is introduced; the shared CircularProgress stays untouched.
 */

// Cap the number of state updates during the fill. 20 frames over the default
// 600ms (~33ms/frame, ~30fps of *state* updates) looks smooth to the eye while
// keeping the rotated-View re-layouts cheap. Easing is applied per step so the
// motion still decelerates like the old cubic-out tween.
const FILL_STEPS = 20;

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
  const [shown, setShown] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setShown(target);
      return undefined;
    }
    // Quantised, timer-driven fill: a fixed, small number of state updates with
    // cubic-out easing per step. This replaces the per-frame Animated listener
    // that re-rendered the rotated-View ring ~60–90 times in 600ms (the lag).
    setShown(0);
    let step = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const delayMs = Math.max(16, Math.round(durationMs / FILL_STEPS));
    const tick = () => {
      step += 1;
      const t = step / FILL_STEPS; // 0..1 progress through the fill
      const eased = Easing.out(Easing.cubic)(t);
      setShown(Math.round(eased * target));
      if (step >= FILL_STEPS) {
        // Guarantee we land exactly on the target (rounding can fall 1 short).
        setShown(target);
        return;
      }
      timeoutId = setTimeout(tick, delayMs);
    };
    timeoutId = setTimeout(tick, delayMs);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [target, animate, durationMs]);

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
