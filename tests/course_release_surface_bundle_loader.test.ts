import { loadCanonicalCourseReleaseSurfaceBundle } from '../app/language_runtime/course_release_surface_bundle_loader';

const hash = 'a'.repeat(64);
const release = {
  releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: hash,
  schemaVersion: '1', contentVersion: '1', createdAt: '2026-07-10T00:00:00.000Z', minAppVersion: '1',
  artifacts: Object.fromEntries(['lesson', 'quiz', 'flashcard', 'arena'].map((surface) => [surface, { releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', surface, contentHash: hash, objectGeneration: '1', byteSize: 10, entryIndex: `${surface}/index.json` }])) as any,
} as const;

describe('canonical surface bundle loader', () => {
  it('keeps the fetched bundle on the exact release requested by target and source', async () => {
    const bundle = { releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'quiz' as const, entries: [{ lessonId: 1, contentHash: hash, payload: { lessonId: 1 } }] };
    await expect(loadCanonicalCourseReleaseSurfaceBundle(
      { studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'quiz' },
      { fetchRelease: async () => release as any, fetchBundle: async () => bundle },
    )).resolves.toBe(bundle);
  });

  it('rejects a bundle from another release even when target and source look valid', async () => {
    const wrong = { releaseId: 'de-ru-r2', studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'quiz' as const, entries: [{ lessonId: 1, contentHash: hash, payload: { lessonId: 1 } }] };
    await expect(loadCanonicalCourseReleaseSurfaceBundle(
      { studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'quiz' },
      { fetchRelease: async () => release as any, fetchBundle: async () => wrong },
    )).rejects.toThrow('course_surface_bundle_identity_mismatch');
  });
});
