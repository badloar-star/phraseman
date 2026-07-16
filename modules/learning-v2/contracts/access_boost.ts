/** Pure eligibility policy for the server-authoritative V2 Access Boost.
 * This never spends shards or unlocks a gate; it only validates the inputs
 * that a quote/purchase transaction must re-check against authoritative data.
 */

export interface AccessBoostPolicy {
  readonly unitPriceShards: number;
  readonly maxPurchasedPerGate: number;
  readonly maxPurchasedPerChapter: number;
  readonly maxPurchasedPerSeason: number;
}

export interface AccessBoostEligibilityInput {
  readonly requiredLoopsComplete: boolean;
  readonly capabilityFallbackComplete: boolean;
  readonly localPerformanceComplete: boolean;
  readonly checkpointComplete: boolean;
  readonly honestBlockCount: number;
  readonly recoveryReviewImpressionCount: number;
  readonly earnedDeficit: number;
  readonly purchasedForGate: number;
  readonly purchasedForChapter: number;
  readonly purchasedForSeason: number;
  readonly serverQuoteAvailable: boolean;
}

export type AccessBoostEligibility =
  | { readonly eligible: true; readonly accessStarsToApply: number; readonly totalCostShards: number }
  | {
      readonly eligible: false;
      readonly reason:
        | 'required_learning_incomplete'
        | 'insufficient_recovery_attempts'
        | 'review_not_shown'
        | 'deficit_invalid'
        | 'deficit_exceeds_cap'
        | 'quote_unavailable'
        | 'policy_invalid';
    };

const positiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;
const nonNegativeInteger = (value: number): boolean => Number.isInteger(value) && value >= 0;

const validPolicy = (policy: AccessBoostPolicy): boolean =>
  positiveInteger(policy.unitPriceShards) &&
  positiveInteger(policy.maxPurchasedPerGate) &&
  positiveInteger(policy.maxPurchasedPerChapter) &&
  positiveInteger(policy.maxPurchasedPerSeason) &&
  policy.maxPurchasedPerGate <= policy.maxPurchasedPerChapter &&
  policy.maxPurchasedPerChapter <= policy.maxPurchasedPerSeason;

export const evaluateAccessBoostEligibility = (
  input: AccessBoostEligibilityInput,
  policy: AccessBoostPolicy,
): AccessBoostEligibility => {
  if (!validPolicy(policy)) return { eligible: false, reason: 'policy_invalid' };
  if (
    !input.requiredLoopsComplete ||
    !input.capabilityFallbackComplete ||
    !input.localPerformanceComplete ||
    !input.checkpointComplete
  ) {
    return { eligible: false, reason: 'required_learning_incomplete' };
  }
  if (!nonNegativeInteger(input.honestBlockCount) || input.honestBlockCount < 2) {
    return { eligible: false, reason: 'insufficient_recovery_attempts' };
  }
  if (
    !nonNegativeInteger(input.recoveryReviewImpressionCount) ||
    input.recoveryReviewImpressionCount < 1
  ) {
    return { eligible: false, reason: 'review_not_shown' };
  }
  if (!input.serverQuoteAvailable) return { eligible: false, reason: 'quote_unavailable' };
  if (!nonNegativeInteger(input.earnedDeficit) || input.earnedDeficit < 1) {
    return { eligible: false, reason: 'deficit_invalid' };
  }
  if (
    !nonNegativeInteger(input.purchasedForGate) ||
    !nonNegativeInteger(input.purchasedForChapter) ||
    !nonNegativeInteger(input.purchasedForSeason)
  ) {
    return { eligible: false, reason: 'deficit_exceeds_cap' };
  }
  const remainingGate = policy.maxPurchasedPerGate - input.purchasedForGate;
  const remainingChapter = policy.maxPurchasedPerChapter - input.purchasedForChapter;
  const remainingSeason = policy.maxPurchasedPerSeason - input.purchasedForSeason;
  if (
    input.earnedDeficit > 3 ||
    input.earnedDeficit > remainingGate ||
    input.earnedDeficit > remainingChapter ||
    input.earnedDeficit > remainingSeason
  ) {
    return { eligible: false, reason: 'deficit_exceeds_cap' };
  }
  return {
    eligible: true,
    accessStarsToApply: input.earnedDeficit,
    totalCostShards: input.earnedDeficit * policy.unitPriceShards,
  };
};
