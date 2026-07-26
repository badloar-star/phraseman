import { mergeProgressEvidenceIndex, type MaterializedProgressEvidence } from "./progress_event_evidence";
import { deriveProgressProjectionFromServerScore, shouldApplyProgressProjection, type ProgressProjection } from "./progress_event_projection";
import { assertServerScoreResolution, type ServerScoreResolution } from "./server_score_resolver";
import type { LearningMaterializationRef } from "../../../modules/learning-v2/contracts/evidence";

export interface ProgressTransactionPlan {
  readonly nextEvidenceIndex: Readonly<Record<string, LearningMaterializationRef>>;
  readonly applyProjection: boolean;
  readonly projection: ProgressProjection;
  readonly evidenceComponentFingerprint: string;
}

export const prepareProgressTransactionPlan = (input: {
  readonly existingEvidenceIndex: Readonly<Record<string, LearningMaterializationRef>>;
  readonly existingBestStars?: unknown;
  readonly materialized: MaterializedProgressEvidence;
  readonly projection: ProgressProjection;
  /** Present only when the projection was produced by the server scorer. */
  readonly trustedScoreResolution?: ServerScoreResolution;
}): ProgressTransactionPlan => {
  if (input.trustedScoreResolution) {
    assertServerScoreResolution(input.trustedScoreResolution);
    const materializedAttempt = input.materialized.attemptRef;
    if ((materializedAttempt && (input.trustedScoreResolution.attemptRef.opId !== materializedAttempt.opId || input.trustedScoreResolution.attemptRef.attemptBodyHash !== materializedAttempt.attemptBodyHash)) || input.trustedScoreResolution.evidenceComponentFingerprint !== input.materialized.componentFingerprint || input.trustedScoreResolution.starSlotId !== input.projection.starSlotId || input.trustedScoreResolution.activityId !== input.projection.activityId || input.trustedScoreResolution.progressCompatibilityKey !== input.projection.progressCompatibilityKey) {
      throw new Error("v2_progress_projection_context_mismatch");
    }
  } else {
    // The client may describe a candidate score, but it cannot create stars.
    // Until a trusted server scorer is wired into the callable, positive client
    // claims remain fail-closed, including on a first write.
    if (input.existingBestStars === undefined) {
      if (input.projection.performanceStars !== 0 || input.projection.performanceStarsDelta !== 0 || input.projection.accessStarsEarnedDelta !== 0) {
        throw new Error("v2_progress_projection_untrusted");
      }
    } else {
      if (!Number.isInteger(input.existingBestStars) || Number(input.existingBestStars) < 0 || Number(input.existingBestStars) > 3) {
        throw new Error("v2_progress_projection_state_invalid");
      }
      if (input.projection.performanceStars > Number(input.existingBestStars) || input.projection.performanceStarsDelta !== 0 || input.projection.accessStarsEarnedDelta !== 0) {
        throw new Error("v2_progress_projection_untrusted");
      }
    }
  }
  return {
    nextEvidenceIndex: mergeProgressEvidenceIndex(input.existingEvidenceIndex, input.materialized.refs),
    applyProjection: shouldApplyProgressProjection(input.existingBestStars, input.projection),
    projection: input.projection,
    evidenceComponentFingerprint: input.materialized.componentFingerprint,
  };
};

/**
 * Integration seam for the future callable: it ignores any client candidate
 * and derives the projection from the already validated server resolution.
 */
export const prepareProgressTransactionPlanFromServerScore = (input: {
  readonly existingEvidenceIndex: Readonly<Record<string, LearningMaterializationRef>>;
  readonly existingBestStars?: unknown;
  readonly materialized: MaterializedProgressEvidence;
  readonly resolution: ServerScoreResolution;
}): ProgressTransactionPlan => {
  const projection = deriveProgressProjectionFromServerScore({ previousBestStars: input.existingBestStars === undefined ? 0 : Number(input.existingBestStars), resolution: input.resolution });
  return prepareProgressTransactionPlan({ ...input, projection, trustedScoreResolution: input.resolution });
};
