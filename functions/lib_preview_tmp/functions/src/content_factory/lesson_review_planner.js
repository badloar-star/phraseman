"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planLessonPhraseLedgerReview = planLessonPhraseLedgerReview;
const dedupe_ledger_1 = require("./dedupe_ledger");
function planLessonPhraseLedgerReview(input) {
    if (input.status === 'rejected') {
        const staleLessonIds = Object.freeze(Object.keys(input.ledger.lessons).map(Number).filter((id) => id >= input.lessonId).sort((a, b) => a - b));
        return Object.freeze({ ledger: (0, dedupe_ledger_1.rollbackLessonLedger)(input.ledger, input.lessonId), staleLessonIds });
    }
    const previousEntry = input.ledger.lessons[input.lessonId];
    const approved = (0, dedupe_ledger_1.approveLessonLedger)(input.ledger, { lessonId: input.lessonId, phraseArtifactId: input.phraseArtifactId, candidates: input.candidates });
    const staleLessonIds = previousEntry && previousEntry.phraseArtifactId !== input.phraseArtifactId ? Object.freeze([input.lessonId, ...approved.staleLessonIds]) : approved.staleLessonIds;
    return Object.freeze({ ledger: approved.ledger, staleLessonIds });
}
//# sourceMappingURL=lesson_review_planner.js.map