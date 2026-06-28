// Running union of words heard across ALL recognition events of one attempt.
//
// Why: on FAST native speech the on-device recognizer segments the utterance and
// emits interim/final hypotheses that REPLACE each other — each carrying only the
// words decoded in that window ("I would" … then the tail "coffee please"). If we
// only keep the best WHOLE hypothesis, a segmented fast utterance is never
// reassembled and scores like "only the last word(s)". Accumulating the union of
// words across the whole attempt reconstructs the full phrase.
//
// Order matters for scoring (orderAccuracy via LCS), so the union preserves
// FIRST-SEEN order, and we only feed it the TOP hypothesis of each event (never
// the lower-ranked alternatives) so we don't pull in words from wrong guesses.
//
// Pure, no imports — fully unit-testable.

export class TranscriptAccumulator {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];

  /** Add the TOP hypothesis transcript of one event; keeps first-seen order. */
  add(transcript: string): void {
    const words = String(transcript ?? '')
      .toLowerCase()
      .replace(/[’`]/g, "'")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
    for (const w of words) {
      const key = w.replace(/[^a-z0-9']/g, '');
      if (!key || this.seen.has(key)) continue;
      this.seen.add(key);
      this.order.push(key);
    }
  }

  /** The accumulated union as a single space-joined transcript, in first-seen order. */
  union(): string {
    return this.order.join(' ');
  }

  /** Number of distinct words accumulated. */
  size(): number {
    return this.order.length;
  }

  reset(): void {
    this.seen.clear();
    this.order.length = 0;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
