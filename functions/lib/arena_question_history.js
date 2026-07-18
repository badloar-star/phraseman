"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeArenaQuestionHistory = mergeArenaQuestionHistory;
const MAX_RECENT_QUESTIONS = 100;
function mergeArenaQuestionHistory(previous, selected) {
    return Object.freeze([...new Set([...selected, ...previous].filter((id) => typeof id === 'string' && id.length > 0))].slice(0, MAX_RECENT_QUESTIONS));
}
//# sourceMappingURL=arena_question_history.js.map