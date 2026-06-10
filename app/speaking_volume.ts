// Pure helpers for the speaking ("Устно") mode live equalizer.
// Turn the raw `volumechange` value from expo-speech-recognition into a smooth
// 0..1 level the waveform can render. Kept separate from the React component so
// the math is unit-testable and deterministic. No React / native imports here.
//
// expo-speech-recognition emits `volumechange` with a value in roughly -2..10.
// The library docs say to treat anything below 0 as inaudible (silence).

/** Lower bound of the raw native volume value (treated as silence). */
export const RAW_VOLUME_MIN = 0;
/** Upper bound of the raw native volume value (treated as full level). */
export const RAW_VOLUME_MAX = 10;
/** Default smoothing factor: weight given to the newest sample (0..1). */
export const VOLUME_SMOOTHING = 0.4;

/**
 * Normalize a raw `volumechange` value (~ -2..10) into a 0..1 level.
 * Anything at or below 0 is silence -> 0. Values above 10 clamp to 1.
 * Non-finite input (NaN/undefined cast) is treated as silence so a bad native
 * payload can never crash the equalizer.
 */
export function normalizeVolume(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  if (raw <= RAW_VOLUME_MIN) return 0;
  if (raw >= RAW_VOLUME_MAX) return 1;
  return (raw - RAW_VOLUME_MIN) / (RAW_VOLUME_MAX - RAW_VOLUME_MIN);
}

/**
 * Exponential smoothing so the bars glide instead of jumping between samples.
 * `factor` is the weight of the newest sample (default 0.4): higher = snappier,
 * lower = smoother. Inputs are clamped to 0..1; non-finite values are ignored
 * (returns the previous level), so a dropped frame holds steady rather than
 * flickering to zero.
 */
export function smoothVolume(
  prev: number,
  next: number,
  factor: number = VOLUME_SMOOTHING,
): number {
  const safePrev = Number.isFinite(prev) ? Math.max(0, Math.min(1, prev)) : 0;
  if (!Number.isFinite(next)) return safePrev;
  const safeNext = Math.max(0, Math.min(1, next));
  const safeFactor = Math.max(0, Math.min(1, factor));
  return safePrev * (1 - safeFactor) + safeNext * safeFactor;
}

/**
 * Convenience: take the previous smoothed level and a raw native sample, return
 * the next smoothed 0..1 level. This is the single call the panel makes per
 * `volumechange` event.
 */
export function nextVolumeLevel(
  prevLevel: number,
  rawSample: number,
  factor: number = VOLUME_SMOOTHING,
): number {
  return smoothVolume(prevLevel, normalizeVolume(rawSample), factor);
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
