import { loadCanonicalCourseReleaseLessonRows } from '../app/language_runtime/course_release_lesson_loader';

const hash = 'a'.repeat(64);
const release = {
  releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', blueprintId: 'english-core-32', blueprintLocale: 'en' as const, blueprintHash: hash,
  schemaVersion: 'course-release.v1', contentVersion: 'v1', createdAt: '2026-07-10T00:00:00.000Z', minAppVersion: '1.0.0',
  artifacts: Object.fromEntries(['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => [surface, { releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface, contentHash: hash, objectGeneration: 'g1', byteSize: 100, entryIndex: `course-releases/fr-ru-r1/${surface}/index.json` }])) as any,
};
const payload = { lessonId: 1, phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `Source ${index}`, targetText: `Target ${index}.` })), vocabulary: [{}], drills: [] };

describe('canonical lesson release loader', () => {
  it('loads release and lesson through the same exact target/source identity', async () => {
    const calls: string[] = [];
    const rows = await loadCanonicalCourseReleaseLessonRows({ studyTarget: 'fr', learnerSourceLocale: 'ru', lessonId: 1 }, {
      async fetchRelease(target, source) { calls.push(`${target}:${source}`); return release; },
      async fetchEntry(value, surface, lessonId) { calls.push(`${value.releaseId}:${surface}:${lessonId}`); return { releaseId: value.releaseId, studyTarget: value.studyTarget, learnerSourceLocale: value.learnerSourceLocale, surface, lessonId, contentHash: hash, payload }; },
    });
    expect(calls).toEqual(['fr:ru', 'fr-ru-r1:lesson:1']);
    expect(rows).toHaveLength(50);
  });

  it('never falls back to a different target when release identity is wrong', async () => {
    await expect(loadCanonicalCourseReleaseLessonRows({ studyTarget: 'de', learnerSourceLocale: 'ru', lessonId: 1 }, {
      async fetchRelease() { return release; },
      async fetchEntry() { throw new Error('must not run'); },
    })).rejects.toThrow('course_release_identity_mismatch');
  });
});
