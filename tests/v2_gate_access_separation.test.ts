import { evaluateV2Gate } from '../modules/learning-v2/contracts/stars';

describe('V2 access and mastery separation', () => {
  const base = {
    alreadyUnlocked: false,
    grandfathered: false,
    requiredLoopsComplete: true,
    capabilityFallbackComplete: true,
    priorEpisodePerformanceEarned: 18,
    localMinimum: 14,
    cumulativeAccessEarned: 10,
    requiredCumulativeAccess: 14,
    purchasedAccessAppliedToThisGate: 0,
    checkpointDecision: 'not_required' as const,
  };

  it('opens from earned access and reports the earned basis', () => {
    expect(evaluateV2Gate({ ...base, cumulativeAccessEarned: 14 })).toEqual({
      allowed: true,
      basis: 'earned',
    });
  });

  it('allows a scoped boost without changing earned or mastery inputs', () => {
    expect(
      evaluateV2Gate({ ...base, purchasedAccessAppliedToThisGate: 4 }),
    ).toEqual({ allowed: true, basis: 'earned_plus_boost' });
  });

  it('never lets a boost replace loops, local performance, or checkpoint', () => {
    expect(
      evaluateV2Gate({
        ...base,
        requiredLoopsComplete: false,
        purchasedAccessAppliedToThisGate: 99,
      }),
    ).toEqual({ allowed: false, reason: 'required_loops' });
    expect(
      evaluateV2Gate({
        ...base,
        capabilityFallbackComplete: false,
        purchasedAccessAppliedToThisGate: 99,
      }),
    ).toEqual({ allowed: false, reason: 'capability_fallback' });
    expect(
      evaluateV2Gate({
        ...base,
        priorEpisodePerformanceEarned: 1,
        purchasedAccessAppliedToThisGate: 99,
      }),
    ).toEqual({ allowed: false, reason: 'local_performance' });
    expect(
      evaluateV2Gate({
        ...base,
        checkpointDecision: 'failed',
        purchasedAccessAppliedToThisGate: 99,
      }),
    ).toEqual({ allowed: false, reason: 'checkpoint' });
  });
});
