"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repeatRewardRateBasisPoints = exports.sumRequiredSessionStars = exports.projectRequiredTaskStars = exports.projectRequiredSessionUnlock = exports.requiredSessionUnlockPrice = exports.LEARNING_V2_COURSE_ECONOMY_POLICY_V1 = void 0;
const TOTAL_REQUIRED_SESSIONS = 32 * 12;
const REQUIRED_TASKS_PER_SESSION = 12;
const unlockPriceLadder = Object.freeze([0, 45, 50, 55, 60, 65]);
const repeatRewardBasisPoints = Object.freeze({
    perfect: 2_000,
    good: 1_200,
    with_errors: 500,
    skipped: 0,
});
/** Versioned owner policy. Fractional repeat value is exact in 1/10,000 stars. */
exports.LEARNING_V2_COURSE_ECONOMY_POLICY_V1 = Object.freeze({
    schemaVersion: "learning-v2-course-economy.v1",
    totalRequiredSessions: TOTAL_REQUIRED_SESSIONS,
    requiredTasksPerSession: REQUIRED_TASKS_PER_SESSION,
    maximumBaseStarsPerSession: REQUIRED_TASKS_PER_SESSION * 3,
    unlockPriceLadder,
    repeatRewardBasisPoints,
    repeatRewardRounding: "exact_wallet_subunits",
});
/** Returns the price of the next required session across the whole course. */
const requiredSessionUnlockPrice = (previouslyUnlockedRequiredSessions) => {
    if (!Number.isSafeInteger(previouslyUnlockedRequiredSessions) ||
        previouslyUnlockedRequiredSessions < 0 ||
        previouslyUnlockedRequiredSessions >= TOTAL_REQUIRED_SESSIONS) {
        throw new Error("course_economy_progress_invalid");
    }
    const ladderIndex = Math.min(previouslyUnlockedRequiredSessions, unlockPriceLadder.length - 1);
    return unlockPriceLadder[ladderIndex];
};
exports.requiredSessionUnlockPrice = requiredSessionUnlockPrice;
const projectRequiredSessionUnlock = (input) => {
    if (!Number.isSafeInteger(input.requiredSessionOrdinal) ||
        input.requiredSessionOrdinal < 1 ||
        input.requiredSessionOrdinal > TOTAL_REQUIRED_SESSIONS ||
        typeof input.alreadyUnlocked !== "boolean" ||
        !Number.isSafeInteger(input.currentBalance) ||
        input.currentBalance < 0) {
        throw new Error("course_economy_unlock_input_invalid");
    }
    if (input.alreadyUnlocked) {
        return Object.freeze({
            allowed: true,
            chargedStars: 0,
            nextBalance: input.currentBalance,
            basis: "already_unlocked",
        });
    }
    const requiredStars = (0, exports.requiredSessionUnlockPrice)(input.requiredSessionOrdinal - 1);
    if (input.currentBalance < requiredStars) {
        return Object.freeze({
            allowed: false,
            reason: "insufficient_stars",
            requiredStars,
            currentBalance: input.currentBalance,
        });
    }
    return Object.freeze({
        allowed: true,
        chargedStars: requiredStars,
        nextBalance: input.currentBalance - requiredStars,
        basis: requiredStars === 0 ? "free_first_session" : "stars",
    });
};
exports.projectRequiredSessionUnlock = projectRequiredSessionUnlock;
const projectRequiredTaskStars = (input) => {
    if ((input.disposition !== "completed" &&
        input.disposition !== "skipped" &&
        input.disposition !== "technical_invalid") ||
        !Number.isSafeInteger(input.learnerAttempts) ||
        input.learnerAttempts < 0 ||
        typeof input.hintUsed !== "boolean" ||
        (input.disposition === "completed" && input.learnerAttempts < 1)) {
        throw new Error("course_economy_task_result_invalid");
    }
    if (input.disposition === "technical_invalid") {
        return { stars: 0, countsAsLearnerError: false, retryRequired: true };
    }
    if (input.disposition === "skipped") {
        return { stars: 0, countsAsLearnerError: false, retryRequired: false };
    }
    const stars = input.hintUsed
        ? 1
        : input.learnerAttempts === 1
            ? 3
            : input.learnerAttempts === 2
                ? 2
                : 1;
    return {
        stars,
        countsAsLearnerError: input.learnerAttempts > 1,
        retryRequired: false,
    };
};
exports.projectRequiredTaskStars = projectRequiredTaskStars;
const sumRequiredSessionStars = (taskStars) => {
    if (taskStars.length !== REQUIRED_TASKS_PER_SESSION ||
        taskStars.some((stars) => !Number.isSafeInteger(stars) || stars < 0 || stars > 3)) {
        throw new Error("course_economy_session_stars_invalid");
    }
    return taskStars.reduce((total, stars) => total + stars, 0);
};
exports.sumRequiredSessionStars = sumRequiredSessionStars;
const repeatRewardRateBasisPoints = (qualityBand) => {
    if (!Object.prototype.hasOwnProperty.call(repeatRewardBasisPoints, qualityBand)) {
        throw new Error("course_economy_repeat_band_invalid");
    }
    return repeatRewardBasisPoints[qualityBand];
};
exports.repeatRewardRateBasisPoints = repeatRewardRateBasisPoints;
//# sourceMappingURL=course_economy.js.map