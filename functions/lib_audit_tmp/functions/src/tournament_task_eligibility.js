"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eligibleTournamentCellCounts = eligibleTournamentCellCounts;
exports.loadEligibleTournamentCellCounts = loadEligibleTournamentCellCounts;
const tournament_pool_plan_1 = require("./tournament_pool_plan");
const tournament_core_1 = require("./tournament_core");
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function eligibleTournamentCellCounts(docs) {
    const counts = {};
    for (const mode of tournament_pool_plan_1.TOURNAMENT_MODES) {
        for (const difficulty of [1, 2, 3])
            counts[`${mode}:${difficulty}`] = 0;
    }
    for (const doc of docs) {
        const data = doc.data();
        const task = {
            taskId: doc.id,
            mode: typeof data.mode === 'string' ? data.mode : '',
            isVoice: data.isVoice === true,
            difficulty: Number(data.difficulty),
            payload: isRecord(data.payload) ? data.payload : {},
            explanation: isRecord(data.explanation)
                ? {
                    ruleNote: String(data.explanation.ruleNote ?? ''),
                    example: String(data.explanation.example ?? ''),
                    // New rooms require a reason for every wrong option.  Preserve the
                    // stored array while checking eligibility instead of silently
                    // reconstructing an older, incomplete explanation shape.
                    ...(Array.isArray(data.explanation.wrongOptionReasons)
                        ? { wrongOptionReasons: data.explanation.wrongOptionReasons }
                        : {}),
                }
                : undefined,
            tags: Array.isArray(data.tags) ? data.tags.filter((tag) => typeof tag === 'string') : [],
            verified: data.verified === true,
        };
        if (data.source !== 'ai' || !(0, tournament_core_1.validateTournamentTaskForNewRoom)(task).ok)
            continue;
        const key = `${task.mode}:${task.difficulty}`;
        if (key in counts)
            counts[key] += 1;
    }
    return counts;
}
async function loadEligibleTournamentCellCounts(collection) {
    const snap = await collection.where('verified', '==', true).where('source', '==', 'ai').get();
    return eligibleTournamentCellCounts(snap.docs);
}
//# sourceMappingURL=tournament_task_eligibility.js.map