"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const release_sealing_1 = require("./release_sealing");
const hash = 'a'.repeat(64);
const artifact = (surface) => ({
    releaseId: 'fr-en-job-1', studyTarget: 'fr', learnerSourceLocale: 'en', surface,
    contentHash: hash, objectGeneration: 'g1', byteSize: 128, entryIndex: `course-releases/fr-en-job-1/${surface}/index.json`,
});
describe('course release sealing', () => {
    it('builds a complete immutable release only from approved complete units', () => {
        const release = (0, release_sealing_1.buildCourseRelease)({
            releaseId: 'fr-en-job-1', studyTarget: 'fr', learnerSourceLocale: 'en', blueprintId: 'english-core-32', blueprintHash: hash,
            contentVersion: 'job-1', minAppVersion: '1.0.0', reviewStatus: 'approved', reviewerId: 'reviewer-1',
            unitStates: { lesson: 'succeeded', quiz: 'succeeded', flashcard: 'succeeded', arena: 'succeeded' },
            artifacts: { lesson: artifact('lesson'), quiz: artifact('quiz'), flashcard: artifact('flashcard'), arena: artifact('arena') },
        });
        expect(release.artifacts.arena.entryIndex).toContain('/arena/index.json');
    });
    it('rejects partial or unreviewed releases', () => {
        expect(() => (0, release_sealing_1.buildCourseRelease)({
            releaseId: 'fr-en-job-1', studyTarget: 'fr', learnerSourceLocale: 'en', blueprintId: 'english-core-32', blueprintHash: hash,
            contentVersion: 'job-1', minAppVersion: '1.0.0', reviewStatus: 'pending', reviewerId: '',
            unitStates: { lesson: 'succeeded', quiz: 'failed', flashcard: 'succeeded', arena: 'succeeded' },
            artifacts: { lesson: artifact('lesson'), quiz: artifact('quiz'), flashcard: artifact('flashcard'), arena: artifact('arena') },
        })).toThrow('course_release_not_sealable');
    });
});
//# sourceMappingURL=release_sealing.test.js.map