// Pure, testable model for the rich voice equalizer.
//
// expo-speech-recognition only gives us a single `volumechange` scalar (one
// loudness value per ~100ms) — there is no real spectrum / pitch data. To make
// the equalizer read as "reacting to tone and loudness" (not one pulsing block)
// we synthesise a believable multi-band display from that scalar:
//
//   • loudness  -> overall bar energy (taller when you speak louder)
//   • "tone"    -> derived from how fast the loudness is changing (transients).
//                   A rising/sharp signal (consonants, emphasis) pushes energy
//                   toward the higher bands; a steady vowel sits low/mid. This
//                   is a perceptual approximation, not an FFT, but it makes the
//                   bars shift their shape with the character of the voice
//                   instead of all moving together.
//
// No React / native imports here so the math stays deterministic and unit-tested.

import { normalizeVolume, smoothVolume } from './speaking_volume';

/** Number of bars in the rich equalizer. Odd so it has a clear centre. */
export const EQ_BAR_COUNT = 13;

/**
 * Static per-band weighting curve (0..1), bell-shaped around the centre so the
 * equalizer looks like a voice spectrum (energy concentrated in the mid bands)
 * rather than a flat wall. Index 0 = lowest band, last = highest band.
 */
export const EQ_BAND_WEIGHTS: readonly number[] = Array.from(
  { length: EQ_BAR_COUNT },
  (_, i) => {
    const centre = (EQ_BAR_COUNT - 1) / 2;
    const dist = Math.abs(i - centre) / centre; // 0 at centre, 1 at edges
    // Bell curve: full energy in the middle, ~0.35 at the very edges.
    return 0.35 + 0.65 * (1 - dist * dist);
  },
);

/** State carried between frames so the model can react to change, not just level. */
export interface EqualizerState {
  /** Smoothed overall loudness, 0..1. */
  level: number;
  /**
   * Smoothed "tone tilt", 0..1. Higher = brighter/sharper (energy tilts to the
   * high bands); lower = darker/steady (energy sits in the low-mid bands).
   */
  tilt: number;
}

/** Resting state: silent, neutral tilt. */
export const EQ_INITIAL_STATE: EqualizerState = { level: 0, tilt: 0.4 };

const LEVEL_SMOOTHING = 0.35; // weight of newest loudness sample
const TILT_SMOOTHING = 0.25; // tilt glides slower than level so it reads as timbre
const TILT_FROM_TRANSIENT = 6; // how strongly loudness change pushes the tilt up

/**
 * Advance the equalizer state by one raw `volumechange` sample.
 *
 * Returns a NEW state (immutable) — the caller keeps the previous state and
 * feeds it back in on the next sample. Non-finite input holds the previous
 * state so a dropped native frame never makes the bars jump or crash.
 */
export function advanceEqualizer(prev: EqualizerState, rawSample: number): EqualizerState {
  // A dropped/garbage native frame must not read as "the user went silent":
  // hold the previous state untouched so the bars stay steady, not collapse.
  if (!Number.isFinite(rawSample)) return prev;

  const target = normalizeVolume(rawSample); // 0..1 loudness for this frame
  const nextLevel = smoothVolume(prev.level, target, LEVEL_SMOOTHING);

  // Transient = how much louder/sharper this frame is than the last. Positive
  // jumps (onsets, consonants) brighten the tone; decays darken it.
  const transient = Math.max(0, target - prev.level);
  const tiltTarget = Math.max(0, Math.min(1, transient * TILT_FROM_TRANSIENT));
  const nextTilt = smoothVolume(prev.tilt, tiltTarget, TILT_SMOOTHING);

  return { level: nextLevel, tilt: nextTilt };
}

/**
 * Project the current state onto per-bar heights (each 0..1).
 *
 * Each band's height = overall level × its static bell weight × a tilt factor
 * that lifts high bands when the tone is bright and low bands when it is dark.
 * The result is an organic, voice-shaped equalizer that changes silhouette with
 * loudness AND tone from a single scalar input.
 */
export function equalizerBarHeights(state: EqualizerState): number[] {
  const { level, tilt } = state;
  const centre = (EQ_BAR_COUNT - 1) / 2;
  return EQ_BAND_WEIGHTS.map((weight, i) => {
    const bandPos = (i - centre) / centre; // -1 (low) .. +1 (high)
    // tilt 0.5 = flat; >0.5 lifts high bands, <0.5 lifts low bands.
    const tiltFactor = 1 + (tilt - 0.5) * bandPos * 1.2;
    const h = level * weight * Math.max(0, tiltFactor);
    return Math.max(0, Math.min(1, h));
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
