"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const outline_grounding_1 = require("./outline_grounding");
describe('lesson outline blueprint grounding', () => {
    const registry = { blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: 'a'.repeat(64), version: 'v1', evidence: [{ evidenceId: 'e1', kind: 'human_review', authority: 'Phraseman', url: 'https://example.com', retrievedAt: '2026-07-12T00:00:00.000Z', claim: 'Sequence' }], lessons: { 16: { lessonId: 16, topic: 'Phrasal verbs', sourcePhrases: ['Turn back here.', 'Go on until the bridge.'], vocabularyFocus: ['turn back', 'go on'], drills: ['phrasal_verbs'] } } };
    it('binds the outline to the exact immutable English lesson blueprint', () => {
        expect((0, outline_grounding_1.buildLessonOutlineGrounding)(registry, 16)).toEqual({ registryId: 'english-core-32:v1', blueprintHash: 'a'.repeat(64), blueprintLesson: registry.lessons[16], evidenceIds: ['e1'] });
    });
    it('fails when the selected lesson has no blueprint coverage', () => {
        expect(() => (0, outline_grounding_1.buildLessonOutlineGrounding)(registry, 17)).toThrow('lesson_blueprint_missing');
    });
});
//# sourceMappingURL=outline_grounding.test.js.map