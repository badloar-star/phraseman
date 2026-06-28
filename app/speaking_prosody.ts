// Prosody (rhythm / stress) analysis from the loudness samples the recognizer
// already streams via `volumechange` — NO new native module, NO rebuild.
//
// The on-device speech recognizer emits a volume sample (~ -2..10) every ~250ms
// while listening (enabled in buildSpeakingStartOptions). We collect those into a
// loudness contour, normalize it, find the stressed (loudest) syllable region,
// and compare the learner's stress placement to the phrase's expected stressed
// word. This gives real rhythm/stress feedback locally.
//
// HONEST SCOPE: this is ENERGY/loudness-based stress, not true F0 pitch. A native
// pitch tracker (e.g. a YIN module behind an Expo config plugin) would add the
// rising/falling intonation curve, but needs a native rebuild — out of scope for
// a pure-JS, build-free step. Energy stress is the high-value, low-risk part.
//
// Pure, no React/native imports, fully unit-testable.

/** A single loudness reading: raw volumechange value + ms since attempt start. */
export type LoudnessSample = {
  value: number;
  atMs: number;
};

export type ProsodyContourPoint = {
  /** 0..1 position along the utterance. */
  t: number;
  /** 0..1 normalized loudness. */
  level: number;
};

export type ProsodyAnalysis = {
  /** Smoothed, normalized contour for drawing. */
  contour: ProsodyContourPoint[];
  /** 0..1 position of the loudest (stressed) region, or null if too little data. */
  stressedAt: number | null;
  /** True when the contour is essentially flat (monotone delivery). */
  monotone: boolean;
};

const MIN_SAMPLES = 4;

/** Clamp a raw volumechange value (-2..10) into 0..1. */
function clamp01(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const v = (raw + 2) / 12; // -2 -> 0, 10 -> 1
  return Math.max(0, Math.min(1, v));
}

/** Simple centered moving average to smooth jitter. */
function smooth(values: readonly number[], window: number): number[] {
  const half = Math.floor(window / 2);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let k = i - half; k <= i + half; k += 1) {
      if (k >= 0 && k < values.length) {
        sum += values[k]!;
        count += 1;
      }
    }
    out.push(count > 0 ? sum / count : 0);
  }
  return out;
}

/**
 * Build a normalized loudness contour and locate the stressed region.
 * `monotoneThreshold` is the min peak-to-trough spread (0..1) below which the
 * delivery is considered monotone.
 */
export function analyzeProsody(
  samples: readonly LoudnessSample[],
  monotoneThreshold = 0.18,
): ProsodyAnalysis {
  const usable = samples.filter((s) => Number.isFinite(s.value) && Number.isFinite(s.atMs));
  if (usable.length < MIN_SAMPLES) {
    return { contour: [], stressedAt: null, monotone: false };
  }
  const t0 = usable[0]!.atMs;
  const tEnd = usable[usable.length - 1]!.atMs;
  const span = Math.max(1, tEnd - t0);

  const levels = smooth(usable.map((s) => clamp01(s.value)), 3);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const range = max - min;

  // Normalize to 0..1 within this attempt so the contour fills the chart.
  const contour: ProsodyContourPoint[] = usable.map((s, idx) => ({
    t: (s.atMs - t0) / span,
    level: range > 1e-6 ? (levels[idx]! - min) / range : 0,
  }));

  // Stressed region = the time of the max smoothed loudness.
  let peakIdx = 0;
  for (let idx = 1; idx < levels.length; idx += 1) {
    if (levels[idx]! > levels[peakIdx]!) peakIdx = idx;
  }
  const stressedAt = contour[peakIdx]!.t;

  const monotone = range < monotoneThreshold;
  return { contour, stressedAt, monotone };
}

/**
 * Expected stressed word index for a phrase, as a fraction 0..1 of its length.
 * Heuristic: the longest content word (>=4 letters), else the last word — good
 * enough to tell the learner "stress fell early/late vs expected".
 */
export function expectedStressPosition(targetText: string): number | null {
  const words = targetText.split(/\s+/).map((w) => w.replace(/[^a-zA-Z']/g, '')).filter(Boolean);
  if (words.length === 0) return null;
  let bestIdx = words.length - 1;
  let bestLen = 0;
  words.forEach((w, idx) => {
    if (w.length > bestLen) {
      bestLen = w.length;
      bestIdx = idx;
    }
  });
  // Center of that word's slot along the phrase.
  return (bestIdx + 0.5) / words.length;
}

export type StressFeedback = 'on_target' | 'too_early' | 'too_late' | 'monotone' | 'unknown';

/** Compare measured stress to expected; tolerance is fraction of utterance. */
export function stressFeedback(
  analysis: ProsodyAnalysis,
  expected: number | null,
  tolerance = 0.25,
): StressFeedback {
  if (analysis.monotone) return 'monotone';
  if (analysis.stressedAt == null || expected == null) return 'unknown';
  const diff = analysis.stressedAt - expected;
  if (Math.abs(diff) <= tolerance) return 'on_target';
  return diff < 0 ? 'too_early' : 'too_late';
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
