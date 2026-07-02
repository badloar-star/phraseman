// Honesty adjustment for the speaking ("Устно") score.
//
// The live recognition is biased toward the target phrase (contextualStrings):
// the engine, knowing the answer, "hears" a rough attempt as the correct
// phrase — inflating the score. After the attempt we re-recognize the SAME
// persisted audio WITHOUT any biasing (the control pass) and cap the final
// score so it can't exceed what a neutral engine heard by more than a fair
// tolerance.
//
// Rule: final = min(biased, control + TOLERANCE).
//   - Normal engine variance (gap ≤ TOLERANCE) leaves the score untouched.
//   - A huge gap ("the engine only got it because we told it the answer")
//     honestly drags the score down, and the UI explains why (say_clearer).
// The control score is null when the pass was unavailable / errored / heard
// nothing usable — we NEVER penalize for infrastructure failures, only for a
// successful neutral transcription that disagrees.
//
// Pure, no React/native imports, fully unit-testable.

/** Allowed gap between the biased and control scores before we intervene. */
export const CONTROL_SCORE_TOLERANCE = 25;

export type HonestyAdjustedScore = {
  /** Final honest score, 0..100. */
  score: number;
  /** True when the control pass lowered the score (drives the hint). */
  flagged: boolean;
};

export function applyControlScore(
  biasedScore: number,
  controlScore: number | null | undefined,
): HonestyAdjustedScore {
  const biased = clampScore(biasedScore);
  if (typeof controlScore !== 'number' || !Number.isFinite(controlScore)) {
    return { score: biased, flagged: false };
  }
  const control = clampScore(controlScore);
  const score = Math.min(biased, control + CONTROL_SCORE_TOLERANCE);
  return { score, flagged: score < biased };
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
