// Pure, immutable state for the per-word drill inside the speaking panel.
//
// Holds ONLY the drill's own bookkeeping: which word (by index in the phrase's
// token/word-report array) is currently open, and which words the learner has
// already polished to "clean" during this drill session. The panel derives what
// to render from this; the recognition lifecycle stays in the panel.
//
// Every transition returns a NEW object (project immutability rule) so a stale
// reference is never mutated under React. No React/native imports here.

export interface WordDrillState {
  /** Index of the open word card, or null when no card is open. */
  openIndex: number | null;
  /** Indices the learner has driven to clean during this session. */
  cleaned: ReadonlySet<number>;
}

export function initWordDrillState(): WordDrillState {
  return { openIndex: null, cleaned: new Set<number>() };
}

/**
 * Open the card for `index`. Tapping the already-open word closes it (toggle);
 * tapping a different word switches to it (only one card open at a time).
 */
export function openWord(state: WordDrillState, index: number): WordDrillState {
  const nextOpen = state.openIndex === index ? null : index;
  return { openIndex: nextOpen, cleaned: state.cleaned };
}

/** Close any open card without changing what has been cleaned. */
export function closeWord(state: WordDrillState): WordDrillState {
  if (state.openIndex === null) return state;
  return { openIndex: null, cleaned: state.cleaned };
}

/**
 * Mark `index` as cleaned (idempotent). Returns the SAME reference when nothing
 * changes so React can skip a needless re-render.
 */
export function markWordClean(state: WordDrillState, index: number): WordDrillState {
  if (state.cleaned.has(index)) return state;
  const cleaned = new Set(state.cleaned);
  cleaned.add(index);
  return { openIndex: state.openIndex, cleaned };
}

/** Whether `index` has been polished to clean in this drill session. */
export function isWordCleaned(state: WordDrillState, index: number): boolean {
  return state.cleaned.has(index);
}

/**
 * True when every originally-problematic word has been cleaned — the trigger
 * for the "phrase is perfect" celebration. `problemIndices` is the set of word
 * indices that started fuzzy/missed after the phrase attempt; a word already
 * clean at attempt time is NOT a problem and never blocks all-clean.
 *
 * Returns false for an empty problem set: with nothing to fix there is no drill
 * to celebrate finishing.
 */
export function allProblemsCleaned(
  state: WordDrillState,
  problemIndices: readonly number[],
): boolean {
  if (problemIndices.length === 0) return false;
  return problemIndices.every((i) => state.cleaned.has(i));
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
