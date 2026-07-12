"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_release_runtime_1 = require("./arena_release_runtime");
describe('canonical arena release runtime', () => {
    it('maps reviewed arena payloads to immutable release-bound questions', () => {
        const rows = (0, arena_release_runtime_1.arenaQuestionsFromCourseSurfaceEntries)({ studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' }, [{ lessonId: 1, payload: { lessonId: 1, surface: 'arena', items: [{ id: 'a/1', prompt: 'Как сказать?', answer: 'Ich bin bereit', options: ['Ich bin bereit', 'Du bist bereit', 'Er ist bereit', 'Wir sind bereit'] }] } }]);
        expect(rows).toEqual([
            expect.objectContaining({ level: 'A1', question: 'Как сказать?', correct: 'Ich bin bereit', releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru' }),
        ]);
        expect(rows[0].id).toMatch(/^cr_[a-f0-9]{40}$/);
    });
    it('rejects arena questions without exactly four unique target-language options', () => {
        const identity = { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' };
        expect(() => (0, arena_release_runtime_1.arenaQuestionsFromCourseSurfaceEntries)(identity, [{ lessonId: 1, payload: { lessonId: 1, surface: 'arena', items: [{ id: 'a1', prompt: 'Q', answer: 'A', options: ['A', 'B'] }] } }])).toThrow('arena_release_payload_invalid');
    });
});
//# sourceMappingURL=arena_release_runtime.test.js.map