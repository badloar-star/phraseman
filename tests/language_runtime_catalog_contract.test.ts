import { courseReleaseTargetsForSourceLocale, parseActiveLanguageCatalog, resolveActiveLanguagePack } from '../app/language_runtime/catalog_client';

describe('generic active language runtime catalog', () => {
  it('requires exact target/source/surface identity', () => {
    const catalog = parseActiveLanguageCatalog({
      fetchedAt: '2026-07-10T00:00:00.000Z',
      entries: [{ surface: 'lessons', studyTarget: 'fr', packId: 'fr-a1', revision: 2, contentHash: 'hash', sourceLocale: 'en' }],
    });
    expect(resolveActiveLanguagePack(catalog, 'fr', 'en', 'lessons')?.packId).toBe('fr-a1');
    expect(resolveActiveLanguagePack(catalog, 'fr', 'ru', 'lessons')).toBeNull();
  });

  it('keeps source catalogs separate and exposes only complete canonical releases', () => {
    const surfaces = ['lesson', 'quiz', 'flashcard', 'arena'];
    const catalog = parseActiveLanguageCatalog({ fetchedAt: '2026-07-10T00:00:00.000Z', entries: [
      ...surfaces.map((surface) => ({ surface, studyTarget: 'de', packId: 'de-ru-r1', revision: 1, contentHash: 'a'.repeat(64), sourceLocale: 'ru', canonicalRelease: true })),
      ...surfaces.map((surface) => ({ surface, studyTarget: 'de', packId: 'de-uk-r1', revision: 1, contentHash: 'b'.repeat(64), sourceLocale: 'uk', canonicalRelease: true })),
      { surface: 'lesson', studyTarget: 'it', packId: 'it-ru-r1', revision: 1, contentHash: 'c'.repeat(64), sourceLocale: 'ru', canonicalRelease: true },
    ] });
    expect(courseReleaseTargetsForSourceLocale(catalog, 'ru')).toEqual(['de']);
    expect(courseReleaseTargetsForSourceLocale(catalog, 'uk')).toEqual(['de']);
  });
});
