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

export interface ResolvedAccessBoostPolicy {
  readonly policy: AccessBoostPolicy;
  readonly eligibleDeficit: { readonly min: number; readonly max: number };
  readonly recoveryImpressionCount: number;
  readonly quoteTtlSeconds: number;
  readonly policyVersion: number;
  readonly registryRef: { readonly id: string; readonly version: number; readonly contentHash: string };
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
const safePositiveInteger = (value: number): boolean => positiveInteger(value) && Number.isSafeInteger(value);

const validPolicy = (policy: AccessBoostPolicy): boolean =>
  safePositiveInteger(policy.unitPriceShards) &&
  safePositiveInteger(policy.maxPurchasedPerGate) &&
  safePositiveInteger(policy.maxPurchasedPerChapter) &&
  safePositiveInteger(policy.maxPurchasedPerSeason) &&
  policy.maxPurchasedPerGate <= policy.maxPurchasedPerChapter &&
  policy.maxPurchasedPerChapter <= policy.maxPurchasedPerSeason;

export const evaluateAccessBoostEligibility = (
  input: AccessBoostEligibilityInput,
  policy: AccessBoostPolicy,
): AccessBoostEligibility => {
  if (!validPolicy(policy)) return { eligible: false, reason: 'policy_invalid' };
  if (
    typeof input.requiredLoopsComplete !== 'boolean' ||
    typeof input.capabilityFallbackComplete !== 'boolean' ||
    typeof input.localPerformanceComplete !== 'boolean' ||
    typeof input.checkpointComplete !== 'boolean' ||
    typeof input.serverQuoteAvailable !== 'boolean'
  ) {
    return { eligible: false, reason: 'policy_invalid' };
  }
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
  if (
    input.purchasedForGate > input.purchasedForChapter ||
    input.purchasedForChapter > input.purchasedForSeason
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
  const totalCostShards = input.earnedDeficit * policy.unitPriceShards;
  if (!Number.isSafeInteger(totalCostShards)) {
    return { eligible: false, reason: 'policy_invalid' };
  }
  return {
    eligible: true,
    accessStarsToApply: input.earnedDeficit,
    totalCostShards,
  };
};

export const accessBoostPolicyFromRegistry = (
  registry: {
    readonly body: {
      readonly version: number;
      readonly decisions: {
        readonly 'HYP-V2-006': {
          readonly settings: {
            readonly accessBoostPriceShards: number;
            readonly maxBoostsPerGate: number;
            readonly maxBoostsPerChapter: number;
            readonly maxBoostsPerSeason: number;
            readonly eligibleDeficit: { readonly min: number; readonly max: number };
            readonly recoveryImpressionCount: number;
            readonly quoteTtlSeconds: number;
          };
        };
      };
    };
    readonly record: { readonly ref: { readonly id: string; readonly version: number; readonly contentHash: string } };
  },
): ResolvedAccessBoostPolicy => {
  const entry = registry.body.decisions['HYP-V2-006'];
  const settings = entry.settings;
  if (
    registry.record.ref.version !== registry.body.version ||
    registry.record.ref.id.length === 0 ||
    !/^[a-f0-9]{64}$/.test(registry.record.ref.contentHash)
  ) {
    throw new Error('decision_registry_binding_invalid');
  }
  return {
    policy: {
      unitPriceShards: settings.accessBoostPriceShards,
      maxPurchasedPerGate: settings.maxBoostsPerGate,
      maxPurchasedPerChapter: settings.maxBoostsPerChapter,
      maxPurchasedPerSeason: settings.maxBoostsPerSeason,
    },
    eligibleDeficit: settings.eligibleDeficit,
    recoveryImpressionCount: settings.recoveryImpressionCount,
    quoteTtlSeconds: settings.quoteTtlSeconds,
    policyVersion: registry.body.version,
    registryRef: registry.record.ref,
  };
};
