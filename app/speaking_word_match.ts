// Pure helpers for the speaking ("Устно") mode word-by-word highlight.
// Kept separate from the React component so the matching logic is unit-testable
// and reusable. No React / native imports here.

export function normalizeSpokenWord(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9']+/g, '')
    .trim();
}

/** Display tokens of the target phrase (whitespace split, punctuation kept). */
export function speakingTargetTokens(target: string): string[] {
  return target.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * For each target token, whether it has been "heard" in the transcript so far.
 *
 * Order-tolerant: a target word lights up once it appears anywhere in the
 * recognized words, so partial / out-of-order recognition still gives
 * progressive feedback. Tokens that normalize to empty (pure punctuation)
 * are treated as already matched so they never block "all matched".
 */
export function speakingMatchedFlags(target: string, transcript: string): boolean[] {
  const heard = new Set(
    transcript
      .split(/\s+/)
      .map(normalizeSpokenWord)
      .filter((w) => w.length > 0),
  );
  return speakingTargetTokens(target).map((tok) => {
    const n = normalizeSpokenWord(tok);
    return n.length === 0 ? true : heard.has(n);
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
