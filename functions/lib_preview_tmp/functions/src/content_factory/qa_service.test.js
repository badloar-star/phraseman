"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const qa_service_1 = require("./qa_service");
const validArtifact = {
    lessonId: 1,
    phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p${index}`, sourceText: `Source ${index}`, targetText: `Cible ${index}` })),
    vocabulary: [{ lemma: 'aller', partOfSpeech: 'verb', targetText: 'aller' }],
    drills: [{ kind: 'irregular_verbs', applicable: false, itemCount: 0 }],
};
describe('deterministic lesson QA service', () => {
    it('creates a stable passing receipt with artifact hash and source ids', () => {
        const result = (0, qa_service_1.runLessonQa)({ artifact: validArtifact, blueprintHash: 'blueprint-hash', sourceEvidence: [{ evidenceId: 'src-1', kind: 'official_curriculum', authority: 'Authority', url: 'https://example.com/curriculum', retrievedAt: '2026-07-10', claim: 'Lesson order' }], now: '2026-07-10T00:00:00.000Z' });
        expect(result).toMatchObject({ status: 'passed', qaResultId: expect.stringContaining('qa_1_'), blueprintHash: 'blueprint-hash', sourceEvidenceIds: ['src-1'] });
        expect(result.artifactHash).toHaveLength(64);
    });
    it('fails without evidence or with a duplicate phrase', () => {
        const result = (0, qa_service_1.runLessonQa)({ artifact: { ...validArtifact, phrases: [...validArtifact.phrases.slice(0, 49), validArtifact.phrases[0]] }, blueprintHash: 'blueprint-hash', sourceEvidence: [] });
        expect(result.status).toBe('failed');
        expect(result.errors).toEqual(expect.arrayContaining(['phrase_duplicate', 'source_evidence_required']));
    });
});
//# sourceMappingURL=qa_service.test.js.map