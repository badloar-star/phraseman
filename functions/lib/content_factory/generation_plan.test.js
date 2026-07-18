"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const generation_plan_1 = require("./generation_plan");
describe('legacy content generation plan identity', () => {
    it('canonicalizes related legacy checkboxes once in stable release order', () => {
        expect((0, generation_plan_1.canonicalizeFactorySurfaces)(['vocabulary', 'lessons', 'drills', 'arena_questions', 'quizzes', 'cards'])).toEqual([
            'lesson', 'flashcard',
        ]);
    });
    it('uses requested lesson IDs and canonical surfaces in an order-independent fingerprint', () => {
        const first = (0, generation_plan_1.generationPlanFingerprint)([2, 1], ['lessons', 'vocabulary']);
        const same = (0, generation_plan_1.generationPlanFingerprint)([1, 2], ['drills']);
        const changedLessons = (0, generation_plan_1.generationPlanFingerprint)([1, 3], ['drills']);
        const changedSurfaces = (0, generation_plan_1.generationPlanFingerprint)([1, 2], ['cards']);
        expect(first).toBe(same);
        expect(changedLessons).not.toBe(first);
        expect(changedSurfaces).not.toBe(first);
    });
});
//# sourceMappingURL=generation_plan.test.js.map