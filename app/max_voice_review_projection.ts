import type { MaxVoiceReviewReceiptV1 } from './max_voice_finalize_types';

/**
 * Compact display projection for MAX review cards.
 *
 * The server payload remains available for expanded details and practice. Only
 * the calm top-level narrative is shortened here, at word boundaries.
 */

export interface ReviewCorrectionLike {
  original: string;
  corrected: string;
  note: string;
  kind?: 'fix' | 'polish';
}

export type TomorrowActionKind = 'phrase' | 'tip' | 'fallback';

export interface TomorrowAction {
  kind: TomorrowActionKind;
  text: string;
}

export interface MaxReviewProjection {
  sessionId: string;
  hero: string;
  worked: string[];
  correction: MaxVoiceReviewReceiptV1['correction'];
  tomorrowActions: string[];
  targetPhrase: string | null;
  nextConversation: string | null;
  goal: MaxVoiceReviewReceiptV1['goal'];
  durationSec: number;
  status: MaxVoiceReviewReceiptV1['status'];
}

export function projectMaxReview(receipt: MaxVoiceReviewReceiptV1): MaxReviewProjection {
  const worked = receipt.worked
    .map((item) => compactReviewText(item, 180))
    .filter(Boolean)
    .slice(0, 2);
  return {
    sessionId: receipt.sessionId,
    hero: worked[0] ?? '',
    worked,
    correction: receipt.correction,
    tomorrowActions: Array.from(receipt.tomorrowActions).slice(0, 3),
    targetPhrase: receipt.targetPhrase,
    nextConversation: receipt.nextTopic,
    goal: receipt.goal,
    durationSec: receipt.durationSec,
    status: receipt.status,
  };
}

export function compactReviewText(value: string, maxChars: number): string {
  const normalized = value.trim().replace(/\s+/gu, ' ');
  if (normalized.length <= maxChars) return normalized;
  const budget = Math.max(2, Math.floor(maxChars) - 1);
  const head = normalized.slice(0, budget);
  const wordBoundary = head.lastIndexOf(' ');
  const cutAt = wordBoundary >= Math.floor(budget * 0.6) ? wordBoundary : budget;
  return `${head.slice(0, cutAt).trimEnd()}…`;
}

export function projectReviewHighlight<T extends ReviewCorrectionLike>(correction: T): {
  original: string;
  corrected: string;
  note: string;
  full: T;
} {
  return {
    original: compactReviewText(correction.original, 96),
    corrected: compactReviewText(correction.corrected, 112),
    note: compactReviewText(correction.note, 150),
    full: correction,
  };
}

export function resolveTomorrowPlan(input: {
  homework: readonly string[];
  tip: string;
  nextTopic: string;
  fallbackAction: string;
}): { actions: TomorrowAction[]; detailsActions: TomorrowAction[]; nextTopic: string } {
  const allActions: TomorrowAction[] = [];
  const seen = new Set<string>();
  const add = (raw: string, kind: TomorrowActionKind): void => {
    const value = raw.trim().replace(/\s+/gu, ' ');
    const key = value.toLocaleLowerCase();
    if (value === '' || seen.has(key)) return;
    seen.add(key);
    allActions.push({ kind, text: value });
  };

  for (const phrase of input.homework) add(phrase, 'phrase');
  add(input.tip, 'tip');
  if (allActions.length === 0) add(input.fallbackAction, 'fallback');

  return {
    actions: allActions.slice(0, 3),
    detailsActions: allActions.slice(3),
    nextTopic: input.nextTopic.trim().replace(/\s+/gu, ' '),
  };
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
