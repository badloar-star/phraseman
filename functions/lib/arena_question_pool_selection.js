"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectArenaPoolQuestions = selectArenaPoolQuestions;
function selectArenaPoolQuestions(rows, request) {
    const eligible = rows.filter((row) => row.availability === 'active'
        && row.studyTarget === request.studyTarget
        && row.learnerSourceLocale === request.learnerSourceLocale
        && row.level === request.level);
    const fresh = eligible.filter((row) => !request.excludedIds.has(row.id));
    const selected = (fresh.length >= request.count ? fresh : eligible).slice(0, request.count);
    return Object.freeze({ ids: Object.freeze(selected.map((row) => row.id)), fallback: fresh.length >= request.count ? 'none' : 'allow_recent' });
}
//# sourceMappingURL=arena_question_pool_selection.js.map