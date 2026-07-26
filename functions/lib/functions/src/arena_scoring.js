"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_SCORING = void 0;
exports.calculateArenaPoints = calculateArenaPoints;
exports.ARENA_SCORING = {
    correctBase: 100,
    speedBonusMax: 50,
    speedBonusThresholdMs: 2000,
    streakBonus: 30,
    streakThreshold: 3,
    firstAnswerBonus: 20,
    outspeedBonus: 15,
    outspeedThresholdMs: 10000,
};
function calculateArenaPoints(answer, correct, timeMs, context) {
    const isCorrect = answer != null && answer === correct;
    if (!isCorrect) {
        return {
            isCorrect: false,
            points: 0,
            bonus: { speed: 0, streak: 0, first: 0, outspeed: 0 },
        };
    }
    const safeTimeMs = Number.isFinite(timeMs) ? Math.max(0, timeMs) : exports.ARENA_SCORING.speedBonusThresholdMs;
    const speedBonus = safeTimeMs < exports.ARENA_SCORING.speedBonusThresholdMs
        ? Math.round(exports.ARENA_SCORING.speedBonusMax
            * (1 - safeTimeMs / exports.ARENA_SCORING.speedBonusThresholdMs))
        : 0;
    const streak = (context?.previousCorrectStreak ?? 0) + 1;
    const streakBonus = streak > 0 && streak % exports.ARENA_SCORING.streakThreshold === 0
        ? exports.ARENA_SCORING.streakBonus
        : 0;
    const firstBonus = context?.hasAnyCorrectBefore ? 0 : exports.ARENA_SCORING.firstAnswerBonus;
    // Keep current app behavior in real matches: outspeed is based on fast answer threshold.
    const outspeedBonus = safeTimeMs < exports.ARENA_SCORING.outspeedThresholdMs
        ? exports.ARENA_SCORING.outspeedBonus
        : 0;
    const points = exports.ARENA_SCORING.correctBase + speedBonus + streakBonus + firstBonus + outspeedBonus;
    return {
        isCorrect: true,
        points,
        bonus: {
            speed: speedBonus,
            streak: streakBonus,
            first: firstBonus,
            outspeed: outspeedBonus,
        },
    };
}
//# sourceMappingURL=arena_scoring.js.map