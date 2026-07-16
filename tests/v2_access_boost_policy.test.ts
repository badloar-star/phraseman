import {
  evaluateAccessBoostEligibility,
  type AccessBoostPolicy,
  type AccessBoostEligibilityInput,
} from '../modules/learning-v2/contracts/access_boost';

const policy: AccessBoostPolicy = {
  unitPriceShards: 3,
  maxPurchasedPerGate: 3,
  maxPurchasedPerChapter: 3,
  maxPurchasedPerSeason: 12,
};

const base: AccessBoostEligibilityInput = {
  requiredLoopsComplete: true,
  capabilityFallbackComplete: true,
  localPerformanceComplete: true,
  checkpointComplete: true,
  honestBlockCount: 2,
  recoveryReviewImpressionCount: 1,
  earnedDeficit: 2,
  purchasedForGate: 0,
  purchasedForChapter: 0,
  purchasedForSeason: 0,
  serverQuoteAvailable: true,
};

describe('V2 Access Boost policy', () => {
  it('allows only a complete, server-quoted deficit within all caps', () => {
    expect(evaluateAccessBoostEligibility(base, policy)).toEqual({
      eligible: true,
      accessStarsToApply: 2,
      totalCostShards: 6,
    });
  });

  it.each([
    ['loops', { requiredLoopsComplete: false }],
    ['fallback', { capabilityFallbackComplete: false }],
    ['local performance', { localPerformanceComplete: false }],
    ['checkpoint', { checkpointComplete: false }],
    ['two honest blocks', { honestBlockCount: 1 }],
    ['review impression', { recoveryReviewImpressionCount: 0 }],
    ['server quote', { serverQuoteAvailable: false }],
  ])('rejects when %s is missing', (_label, override) => {
    expect(evaluateAccessBoostEligibility({ ...base, ...override }, policy).eligible).toBe(false);
  });

  it('rejects an out-of-range or partially closable deficit', () => {
    expect(evaluateAccessBoostEligibility({ ...base, earnedDeficit: 0 }, policy)).toEqual({
      eligible: false,
      reason: 'deficit_invalid',
    });
    expect(evaluateAccessBoostEligibility({ ...base, earnedDeficit: 4 }, policy)).toEqual({
      eligible: false,
      reason: 'deficit_exceeds_cap',
    });
  });

  it('rejects if any gate/chapter/season cap cannot cover the full deficit', () => {
    expect(
      evaluateAccessBoostEligibility({ ...base, purchasedForGate: 2 }, policy),
    ).toEqual({ eligible: false, reason: 'deficit_exceeds_cap' });
    expect(
      evaluateAccessBoostEligibility({ ...base, purchasedForChapter: 2 }, policy),
    ).toEqual({ eligible: false, reason: 'deficit_exceeds_cap' });
    expect(
      evaluateAccessBoostEligibility({ ...base, purchasedForSeason: 11 }, policy),
    ).toEqual({ eligible: false, reason: 'deficit_exceeds_cap' });
  });
});
