import { buildCourseRelease } from './release_sealing';

const hash = 'a'.repeat(64);
const artifact = (surface: 'lesson' | 'flashcard') => ({
  releaseId: 'fr-en-job-1', studyTarget: 'fr', learnerSourceLocale: 'en', surface,
  contentHash: hash, objectGeneration: 'g1', byteSize: 128, entryIndex: `course-releases/fr-en-job-1/${surface}/index.json`,
});

describe('course release sealing', () => {
  it('builds a complete immutable release only from approved complete units', () => {
    const release = buildCourseRelease({
      releaseId: 'fr-en-job-1', studyTarget: 'fr', learnerSourceLocale: 'en', blueprintId: 'english-core-32', blueprintHash: hash,
      contentVersion: 'job-1', minAppVersion: '1.0.0', reviewStatus: 'approved', reviewerId: 'reviewer-1',
      unitStates: { lesson: 'succeeded', flashcard: 'succeeded' },
      artifacts: { lesson: artifact('lesson'), flashcard: artifact('flashcard') },
    });
    expect(release.artifacts.flashcard.entryIndex).toContain('/flashcard/index.json');
  });

  it('rejects partial or unreviewed releases', () => {
    expect(() => buildCourseRelease({
      releaseId: 'fr-en-job-1', studyTarget: 'fr', learnerSourceLocale: 'en', blueprintId: 'english-core-32', blueprintHash: hash,
      contentVersion: 'job-1', minAppVersion: '1.0.0', reviewStatus: 'pending', reviewerId: '',
      unitStates: { lesson: 'failed', flashcard: 'succeeded' },
      artifacts: { lesson: artifact('lesson'), flashcard: artifact('flashcard') },
    })).toThrow('course_release_not_sealable');
  });
});
