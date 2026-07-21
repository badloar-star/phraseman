import { applyBestPerformanceStars } from "../../../modules/learning-v2/contracts/stars";
import { assertServerScoreResolution, type ServerScoreResolution } from "./server_score_resolver";

export interface ProgressProjectionInput {
  readonly starSlotId: string;
  readonly previousBestStars: number;
  readonly candidateStars: number;
  readonly activityId: string;
  readonly progressCompatibilityKey: string;
}

export interface ProgressProjection {
  readonly performanceStars: number;
  readonly performanceStarsDelta: number;
  readonly accessStarsEarnedDelta: number;
  readonly accessStarsPurchasedDelta: 0;
  readonly starSlotId: string;
  readonly activityId: string;
  readonly progressCompatibilityKey: string;
}

export const deriveProgressProjection = (input: ProgressProjectionInput): ProgressProjection => {
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(input.starSlotId) || !/^[A-Za-z0-9._-]{1,128}$/.test(input.activityId) || !input.progressCompatibilityKey.trim()) throw new Error("v2_progress_projection_identity_invalid");
  const result = applyBestPerformanceStars({ previous: input.previousBestStars, candidate: input.candidateStars });
  return { performanceStars: result.next, performanceStarsDelta: result.performanceStarsDelta, accessStarsEarnedDelta: result.accessStarsEarnedDelta, accessStarsPurchasedDelta: 0, starSlotId: input.starSlotId, activityId: input.activityId, progressCompatibilityKey: input.progressCompatibilityKey };
};

/** Build a writable projection only from a server-policy resolution. */
export const deriveProgressProjectionFromServerScore = (input: {
  readonly previousBestStars: number;
  readonly resolution: ServerScoreResolution;
}): ProgressProjection => {
  assertServerScoreResolution(input.resolution);
  const result = applyBestPerformanceStars({
    previous: input.previousBestStars,
    candidate: input.resolution.candidatePerformanceStars,
  });
  return {
    performanceStars: result.next,
    performanceStarsDelta: result.performanceStarsDelta,
    accessStarsEarnedDelta: result.accessStarsEarnedDelta,
    accessStarsPurchasedDelta: 0,
    starSlotId: input.resolution.starSlotId,
    activityId: input.resolution.activityId,
    progressCompatibilityKey: input.resolution.progressCompatibilityKey,
  };
};

export const shouldApplyProgressProjection = (existingBestStars: unknown, next: ProgressProjection): boolean => {
  if (existingBestStars === undefined) return true;
  if (!Number.isInteger(existingBestStars) || Number(existingBestStars) < 0 || Number(existingBestStars) > 3) throw new Error("v2_progress_projection_state_invalid");
  return next.performanceStars > Number(existingBestStars);
};
