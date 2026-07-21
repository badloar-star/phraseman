"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldApplyProgressProjection = exports.deriveProgressProjectionFromServerScore = exports.deriveProgressProjection = void 0;
const stars_1 = require("../../../modules/learning-v2/contracts/stars");
const server_score_resolver_1 = require("./server_score_resolver");
const deriveProgressProjection = (input) => {
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(input.starSlotId) || !/^[A-Za-z0-9._-]{1,128}$/.test(input.activityId) || !input.progressCompatibilityKey.trim())
        throw new Error("v2_progress_projection_identity_invalid");
    const result = (0, stars_1.applyBestPerformanceStars)({ previous: input.previousBestStars, candidate: input.candidateStars });
    return { performanceStars: result.next, performanceStarsDelta: result.performanceStarsDelta, accessStarsEarnedDelta: result.accessStarsEarnedDelta, accessStarsPurchasedDelta: 0, starSlotId: input.starSlotId, activityId: input.activityId, progressCompatibilityKey: input.progressCompatibilityKey };
};
exports.deriveProgressProjection = deriveProgressProjection;
/** Build a writable projection only from a server-policy resolution. */
const deriveProgressProjectionFromServerScore = (input) => {
    (0, server_score_resolver_1.assertServerScoreResolution)(input.resolution);
    const result = (0, stars_1.applyBestPerformanceStars)({
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
exports.deriveProgressProjectionFromServerScore = deriveProgressProjectionFromServerScore;
const shouldApplyProgressProjection = (existingBestStars, next) => {
    if (existingBestStars === undefined)
        return true;
    if (!Number.isInteger(existingBestStars) || Number(existingBestStars) < 0 || Number(existingBestStars) > 3)
        throw new Error("v2_progress_projection_state_invalid");
    return next.performanceStars > Number(existingBestStars);
};
exports.shouldApplyProgressProjection = shouldApplyProgressProjection;
