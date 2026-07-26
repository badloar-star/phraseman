"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const published_artifact_1 = require("./published_artifact");
const artifact = {
    packId: 'fr.en.lessons.v1', studyTarget: 'fr', sourceLocale: 'en', surface: 'lessons', revision: 4, contentHash: 'hash-4',
    lessonId: 1,
    phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `source ${index}`, targetText: `target ${index}` })),
    vocabulary: [{ lemma: 'be', partOfSpeech: 'verb', targetText: 'être' }],
    drills: [{ kind: 'part_of_speech', applicable: true, itemCount: 1 }],
};
describe('published content artifact identity', () => {
    it('uses a stable lesson-scoped document id and accepts a complete artifact', () => {
        expect((0, published_artifact_1.publishedArtifactDocId)(artifact.packId, artifact.lessonId)).toBe('fr.en.lessons.v1:1');
        expect((0, published_artifact_1.validatePublishedLessonArtifact)(artifact)).toEqual({ ok: true, errors: [] });
    });
    it('rejects a target or revision mismatch before runtime delivery', () => {
        expect((0, published_artifact_1.validatePublishedLessonArtifact)({ ...artifact, surface: 'quizzes' }).errors).toContain('surface_mismatch');
        expect(() => (0, published_artifact_1.assertPublishedArtifactMatchesPointer)(artifact, { packId: artifact.packId, studyTarget: 'fr', sourceLocale: 'en', revision: 3, contentHash: artifact.contentHash })).toThrow('published_artifact_identity_mismatch');
    });
});
//# sourceMappingURL=published_artifact.test.js.map