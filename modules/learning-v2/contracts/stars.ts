/** Pure V2 performance/access-star and gate projections.
 *
 * Earned performance stars are the writable reward projection for a stable
 * slot. Access stars are derived one-for-one from the same positive delta;
 * neither is LearningEvidence or a mastery decision. Purchased access is
 * accepted only as a gate-scoped additive input.
 */

export interface BestPerformanceStarInput {
  readonly previous: number;
  readonly candidate: number;
}

export interface BestPerformanceStarProjection {
  readonly next: number;
  readonly performanceStarsDelta: number;
  readonly accessStarsEarnedDelta: number;
}

export interface GateInput {
  readonly alreadyUnlocked: boolean;
  readonly grandfathered: boolean;
  readonly requiredLoopsComplete: boolean;
  readonly priorEpisodePerformanceEarned: number;
  readonly localMinimum: number;
  readonly cumulativeAccessEarned: number;
  readonly requiredCumulativeAccess: number;
  readonly purchasedAccessAppliedToThisGate: number;
  readonly checkpointDecision:
    | 'not_required'
    | 'passed'
    | 'failed'
    | 'incomplete'
    | 'needs_work';
}

export type GateEvaluation =
  | { readonly allowed: true; readonly basis: 'grandfathered' | 'earned' | 'earned_plus_boost' }
  | {
      readonly allowed: false;
      readonly reason: 'required_loops' | 'local_performance' | 'checkpoint' | 'cumulative_access';
    };

const isIntegerInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const assertNonNegativeInteger = (value: number, code: string): void => {
  if (!Number.isInteger(value) || value < 0) throw new Error(code);
};

const assertGateInput = (input: GateInput): void => {
  assertNonNegativeInteger(input.priorEpisodePerformanceEarned, 'gate_input_invalid');
  assertNonNegativeInteger(input.localMinimum, 'gate_input_invalid');
  assertNonNegativeInteger(input.cumulativeAccessEarned, 'gate_input_invalid');
  assertNonNegativeInteger(input.requiredCumulativeAccess, 'gate_input_invalid');
  assertNonNegativeInteger(input.purchasedAccessAppliedToThisGate, 'gate_input_invalid');
  if (typeof input.alreadyUnlocked !== 'boolean' || typeof input.grandfathered !== 'boolean') {
    throw new Error('gate_input_invalid');
  }
  if (typeof input.requiredLoopsComplete !== 'boolean') throw new Error('gate_input_invalid');
  if (!['not_required', 'passed', 'failed', 'incomplete', 'needs_work'].includes(input.checkpointDecision)) {
    throw new Error('gate_input_invalid');
  }
};

export const applyBestPerformanceStars = (
  input: BestPerformanceStarInput,
): BestPerformanceStarProjection => {
  if (
    !isIntegerInRange(input.previous, 0, 3) ||
    !isIntegerInRange(input.candidate, 0, 3)
  ) {
    throw new Error('performance_stars_invalid');
  }
  const next = Math.max(input.previous, input.candidate);
  const delta = next - input.previous;
  return {
    next,
    performanceStarsDelta: delta,
    accessStarsEarnedDelta: delta,
  };
};

export const sumBestPerformanceStars = (bestBySlot: readonly number[]): number => {
  if (bestBySlot.length > 8 || bestBySlot.some((value) => !isIntegerInRange(value, 0, 3))) {
    throw new Error('star_slots_invalid');
  }
  return bestBySlot.reduce((sum, value) => sum + value, 0);
};

export const cumulativeAccessRequirement = (targetEpisode: number): number => {
  if (!Number.isInteger(targetEpisode) || targetEpisode < 2 || targetEpisode > 32) {
    throw new Error('gate_target_invalid');
  }
  const ratio = 0.55 + 0.10 * ((targetEpisode - 2) / 30);
  return Math.ceil(24 * (targetEpisode - 1) * ratio);
};

export const localPerformanceMinimum = (priorEpisode: number): number => {
  if (!Number.isInteger(priorEpisode) || priorEpisode < 1 || priorEpisode > 32) {
    throw new Error('episode_target_invalid');
  }
  if (priorEpisode <= 8) return 14;
  if (priorEpisode <= 16) return 15;
  if (priorEpisode <= 24) return 16;
  return 17;
};

export const evaluateV2Gate = (input: GateInput): GateEvaluation => {
  assertGateInput(input);
  if (input.alreadyUnlocked || input.grandfathered) {
    return { allowed: true, basis: 'grandfathered' };
  }
  if (!input.requiredLoopsComplete) return { allowed: false, reason: 'required_loops' };
  if (input.priorEpisodePerformanceEarned < input.localMinimum) {
    return { allowed: false, reason: 'local_performance' };
  }
  if (input.checkpointDecision !== 'not_required' && input.checkpointDecision !== 'passed') {
    return { allowed: false, reason: 'checkpoint' };
  }
  const access = input.cumulativeAccessEarned + input.purchasedAccessAppliedToThisGate;
  if (access < input.requiredCumulativeAccess) {
    return { allowed: false, reason: 'cumulative_access' };
  }
  return {
    allowed: true,
    basis: input.purchasedAccessAppliedToThisGate > 0 ? 'earned_plus_boost' : 'earned',
  };
};
