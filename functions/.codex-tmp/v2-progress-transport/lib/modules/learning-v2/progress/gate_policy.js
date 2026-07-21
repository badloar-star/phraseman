"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateGatePolicy = exports.localPerformanceMinimum = exports.episodeGateRequirement = void 0;
const stars_1 = require("../contracts/stars");
Object.defineProperty(exports, "episodeGateRequirement", { enumerable: true, get: function () { return stars_1.cumulativeAccessRequirement; } });
Object.defineProperty(exports, "localPerformanceMinimum", { enumerable: true, get: function () { return stars_1.localPerformanceMinimum; } });
const evaluateGatePolicy = (input) => {
    if (!Number.isInteger(input.targetEpisode) ||
        input.targetEpisode < 2 ||
        input.targetEpisode > 32)
        throw new Error("gate_target_invalid");
    const checkpointDecision = input.checkpointDecision;
    return (0, stars_1.evaluateV2Gate)({
        alreadyUnlocked: input.alreadyUnlocked,
        grandfathered: input.grandfathered ?? false,
        requiredLoopsComplete: input.requiredLoopsComplete,
        capabilityFallbackComplete: input.capabilityFallbackComplete,
        priorEpisodePerformanceEarned: input.priorEpisodePerformanceEarned,
        localMinimum: (0, stars_1.localPerformanceMinimum)(input.targetEpisode - 1),
        cumulativeAccessEarned: input.cumulativeAccessEarned,
        requiredCumulativeAccess: (0, stars_1.cumulativeAccessRequirement)(input.targetEpisode),
        purchasedAccessAppliedToThisGate: input.purchasedAccessApplied,
        checkpointDecision,
    });
};
exports.evaluateGatePolicy = evaluateGatePolicy;
