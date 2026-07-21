"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareProgressTransactionPlanFromServerScore = exports.prepareProgressTransactionPlan = void 0;
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_projection_1 = require("./progress_event_projection");
const server_score_resolver_1 = require("./server_score_resolver");
const prepareProgressTransactionPlan = (input) => {
    if (input.trustedScoreResolution) {
        (0, server_score_resolver_1.assertServerScoreResolution)(input.trustedScoreResolution);
        const materializedAttempt = input.materialized.attemptRef;
        if ((materializedAttempt && (input.trustedScoreResolution.attemptRef.opId !== materializedAttempt.opId || input.trustedScoreResolution.attemptRef.attemptBodyHash !== materializedAttempt.attemptBodyHash)) || input.trustedScoreResolution.evidenceComponentFingerprint !== input.materialized.componentFingerprint || input.trustedScoreResolution.starSlotId !== input.projection.starSlotId || input.trustedScoreResolution.activityId !== input.projection.activityId || input.trustedScoreResolution.progressCompatibilityKey !== input.projection.progressCompatibilityKey) {
            throw new Error("v2_progress_projection_context_mismatch");
        }
    }
    else {
        // The client may describe a candidate score, but it cannot create stars.
        // Until a trusted server scorer is wired into the callable, positive client
        // claims remain fail-closed, including on a first write.
        if (input.existingBestStars === undefined) {
            if (input.projection.performanceStars !== 0 || input.projection.performanceStarsDelta !== 0 || input.projection.accessStarsEarnedDelta !== 0) {
                throw new Error("v2_progress_projection_untrusted");
            }
        }
        else {
            if (!Number.isInteger(input.existingBestStars) || Number(input.existingBestStars) < 0 || Number(input.existingBestStars) > 3) {
                throw new Error("v2_progress_projection_state_invalid");
            }
            if (input.projection.performanceStars > Number(input.existingBestStars) || input.projection.performanceStarsDelta !== 0 || input.projection.accessStarsEarnedDelta !== 0) {
                throw new Error("v2_progress_projection_untrusted");
            }
        }
    }
    return {
        nextEvidenceIndex: (0, progress_event_evidence_1.mergeProgressEvidenceIndex)(input.existingEvidenceIndex, input.materialized.refs),
        applyProjection: (0, progress_event_projection_1.shouldApplyProgressProjection)(input.existingBestStars, input.projection),
        projection: input.projection,
        evidenceComponentFingerprint: input.materialized.componentFingerprint,
    };
};
exports.prepareProgressTransactionPlan = prepareProgressTransactionPlan;
/**
 * Integration seam for the future callable: it ignores any client candidate
 * and derives the projection from the already validated server resolution.
 */
const prepareProgressTransactionPlanFromServerScore = (input) => {
    const projection = (0, progress_event_projection_1.deriveProgressProjectionFromServerScore)({ previousBestStars: input.existingBestStars === undefined ? 0 : Number(input.existingBestStars), resolution: input.resolution });
    return (0, exports.prepareProgressTransactionPlan)({ ...input, projection, trustedScoreResolution: input.resolution });
};
exports.prepareProgressTransactionPlanFromServerScore = prepareProgressTransactionPlanFromServerScore;
