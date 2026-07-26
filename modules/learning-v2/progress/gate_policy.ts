import {
  cumulativeAccessRequirement,
  evaluateV2Gate,
  localPerformanceMinimum,
} from "../contracts/stars";

export {
  cumulativeAccessRequirement as episodeGateRequirement,
  localPerformanceMinimum,
};

export interface GatePolicyInput {
  readonly targetEpisode: number;
  readonly alreadyUnlocked: boolean;
  readonly grandfathered?: boolean;
  readonly requiredLoopsComplete: boolean;
  readonly capabilityFallbackComplete: boolean;
  readonly priorEpisodePerformanceEarned: number;
  readonly checkpointDecision:
    | "not_required"
    | "passed"
    | "failed"
    | "incomplete"
    | "needs_work";
  readonly cumulativeAccessEarned: number;
  readonly purchasedAccessApplied: number;
}

export const evaluateGatePolicy = (input: GatePolicyInput) => {
  if (
    !Number.isInteger(input.targetEpisode) ||
    input.targetEpisode < 2 ||
    input.targetEpisode > 32
  )
    throw new Error("gate_target_invalid");
  const checkpointDecision = input.checkpointDecision;
  return evaluateV2Gate({
    alreadyUnlocked: input.alreadyUnlocked,
    grandfathered: input.grandfathered ?? false,
    requiredLoopsComplete: input.requiredLoopsComplete,
    capabilityFallbackComplete: input.capabilityFallbackComplete,
    priorEpisodePerformanceEarned: input.priorEpisodePerformanceEarned,
    localMinimum: localPerformanceMinimum(input.targetEpisode - 1),
    cumulativeAccessEarned: input.cumulativeAccessEarned,
    requiredCumulativeAccess: cumulativeAccessRequirement(input.targetEpisode),
    purchasedAccessAppliedToThisGate: input.purchasedAccessApplied,
    checkpointDecision,
  });
};
