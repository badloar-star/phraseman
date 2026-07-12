import { refreshRuntimeStudyTargetCatalog } from '../app/language_runtime/runtime_catalog_bootstrap';
import { studyTargetsForSourceLocale } from '../app/study_target';

describe('runtime target catalog bootstrap', () => {
  it('applies only complete canonical target/source releases to the synchronous picker registry', async () => {
    const surfaces = ['lesson', 'quiz', 'flashcard', 'arena'];
    await refreshRuntimeStudyTargetCatalog({
      async readCache() { return null; },
      async writeCache() {},
      async fetchCatalog() { return { fetchedAt: '2026-07-10T00:00:00.000Z', entries: surfaces.map((surface) => ({ surface, studyTarget: 'de', packId: 'de-ru-r1', revision: 1, contentHash: 'a'.repeat(64), sourceLocale: 'ru', canonicalRelease: true })) }; },
    }, true);
    expect(studyTargetsForSourceLocale('ru')).toEqual(['de', 'en']);
    expect(studyTargetsForSourceLocale('uk')).toEqual(['en']);
  });
});
