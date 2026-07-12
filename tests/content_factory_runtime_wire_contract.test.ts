import { parseCourseRelease, resolveCourseReleaseArtifact } from '../app/language_runtime/course_release_contract';

const hash = 'a'.repeat(64);
const release = {
  releaseId: 'fr-ru-release-0001', studyTarget: 'fr', learnerSourceLocale: 'ru', blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: hash,
  schemaVersion: 'course-release-v1', contentVersion: '2026.07.10.1', createdAt: '2026-07-10T00:00:00.000Z', minAppVersion: '1.0.0',
  artifacts: Object.fromEntries(['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => [surface, { releaseId: 'fr-ru-release-0001', studyTarget: 'fr', learnerSourceLocale: 'ru', surface, contentHash: hash, objectGeneration: 'g1', byteSize: 100, entryIndex: 'index.json' }])),
};

describe('runtime course release wire contract', () => {
  it('resolves only the exact target/source/surface artifact', () => {
    const parsed = parseCourseRelease(release);
    expect(resolveCourseReleaseArtifact(parsed, 'fr', 'ru', 'quiz')?.surface).toBe('quiz');
    expect(resolveCourseReleaseArtifact(parsed, 'es', 'ru', 'quiz')).toBeNull();
    expect(resolveCourseReleaseArtifact(parsed, 'fr', 'uk', 'quiz')).toBeNull();
  });

  it('rejects a mixed-release artifact map', () => {
    expect(() => parseCourseRelease({ ...release, artifacts: { ...release.artifacts, arena: { ...release.artifacts.arena, releaseId: 'other' } } })).toThrow('course_release_invalid');
  });
});
