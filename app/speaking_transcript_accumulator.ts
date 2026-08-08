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
  private readonly order: string[] = [];
  private lastEventWords: string[] = [];
  private segmentOpen = false;

  /** Add the TOP hypothesis transcript of one event; keeps first-seen order. */
  add(transcript: string, isFinal: boolean): void {
    const words = String(transcript ?? '')
      .toLowerCase()
      .replace(/[’`]/g, "'")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
    const incoming = words
      .map((w) => w.replace(/[^a-z0-9']/g, ''))
      .filter(Boolean);
    if (incoming.length === 0) return;

    const startsNewSegment = !this.segmentOpen;
    const matchesLastEvent = incoming.length === this.lastEventWords.length
      && incoming.every((word, index) => this.lastEventWords[index] === word);
    const replaysOpenSegment = this.segmentOpen && matchesLastEvent;

    if (!replaysOpenSegment) {
      if (startsNewSegment && matchesLastEvent) {
        this.order.push(...incoming);
      } else {
        this.merge(incoming, startsNewSegment);
      }
    }

    this.lastEventWords = incoming;
    this.segmentOpen = !isFinal;
  }

  private merge(incoming: string[], startsNewSegment: boolean): void {
    // Native recognizers emit both cumulative hypotheses and tail fragments.
    // Merge sequences by overlap, not by a global Set: a Set destroys legitimate
    // repeated words ("the ... the"), while suffix/prefix overlap removes only
    // the duplicate portion of adjacent recognition events.
    if (this.order.length === 0) {
      this.order.push(...incoming);
      return;
    }

    // In continuous recognition, a result after a final belongs to a new segment.
    // Keep a genuine repeated one-word segment even when that word already occurs
    // elsewhere in the accumulated transcript. Its own interim -> final replay is
    // filtered above while the segment is open.
    if (startsNewSegment && incoming.length === 1) {
      this.order.push(incoming[0]!);
      return;
    }

    const isExactRepeat = incoming.length === this.order.length
      && incoming.every((word, index) => this.order[index] === word);
    if (isExactRepeat) {
      // A recognizer repeating a complete cumulative hypothesis is noise. A real
      // repeated one-word segment was already preserved by the boundary branch.
      return;
    }

    const maxOverlap = Math.min(this.order.length, incoming.length);
    let overlap = 0;
    for (let size = maxOverlap; size > 0; size -= 1) {
      const offset = this.order.length - size;
      if (incoming.slice(0, size).every((word, index) => this.order[offset + index] === word)) {
        overlap = size;
        break;
      }
    }
    if (overlap > 0) {
      this.order.push(...incoming.slice(overlap));
      return;
    }

    // Some recognizers revise a cumulative hypothesis instead of extending it
    // ("I would like" -> "I really would like"). Replace the old hypothesis when
    // the incoming sequence preserves most of it, otherwise continue as fragments.
    const lcsLength = (() => {
      const previous = Array(incoming.length + 1).fill(0) as number[];
      for (const existingWord of this.order) {
        let diagonal = 0;
        for (let index = 1; index <= incoming.length; index += 1) {
          const above = previous[index]!;
          previous[index] = existingWord === incoming[index - 1]
            ? diagonal + 1
            : Math.max(previous[index]!, previous[index - 1]!);
          diagonal = above;
        }
      }
      return previous[incoming.length]!;
    })();
    if (incoming.length >= this.order.length && lcsLength / this.order.length >= 0.6) {
      this.order.splice(0, this.order.length, ...incoming);
      return;
    }

    const isExistingSlice = (() => {
      if (incoming.length > this.order.length) return false;
      for (let start = 0; start <= this.order.length - incoming.length; start += 1) {
        if (incoming.every((word, index) => this.order[start + index] === word)) return true;
      }
      return false;
    })();
    if (isExistingSlice) return;

    this.order.push(...incoming);
  }

  /** The accumulated union as a single space-joined transcript, in first-seen order. */
  union(): string {
    return this.order.join(' ');
  }

  /** Number of word occurrences accumulated. */
  size(): number {
    return this.order.length;
  }

  reset(): void {
    this.order.length = 0;
    this.lastEventWords = [];
    this.segmentOpen = false;
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
