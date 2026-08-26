import { projectLearningV2InteractionRuneAwardV1 } from "../modules/learning-v2/progress/interaction_rune_award_v1";

/**
 * Owner-approved Learning V2 reward ladder (2026-08-02, still canonical):
 * 3 — first attempt without help; 2 — second attempt; 1 — after a hint or
 * more than one earlier error; 0 — skipped. Runes are the renamed spendable
 * reward; the end-of-session 0..3 stars remain a separate quality summary.
 */
export const learningV2InteractionRuneAwardV1 =
  projectLearningV2InteractionRuneAwardV1;

export function createLearningV2InteractionRuneAwardLedgerV1(): Readonly<{
  claim: (interactionId: string, count: 1 | 2 | 3) => 0 | 1 | 2 | 3;
  total: () => number;
  reset: () => void;
}> {
  const awarded = new Set<string>();
  let total = 0;
  return Object.freeze({
    claim(interactionId: string, count: 1 | 2 | 3) {
      if (awarded.has(interactionId)) return 0;
      awarded.add(interactionId);
      total += count;
      return count;
    },
    total() {
      return total;
    },
    reset() {
      awarded.clear();
      total = 0;
    },
  });
}
