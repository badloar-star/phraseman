import { parseActiveLanguageCatalog, resolveActiveLanguagePack } from '../app/language_runtime/catalog_client';

describe('generic active language runtime catalog', () => {
  it('requires exact target/source/surface identity', () => {
    const catalog = parseActiveLanguageCatalog({
      fetchedAt: '2026-07-10T00:00:00.000Z',
      entries: [{ surface: 'lessons', studyTarget: 'fr', packId: 'fr-a1', revision: 2, contentHash: 'hash', sourceLocale: 'en' }],
    });
    expect(resolveActiveLanguagePack(catalog, 'fr', 'en', 'lessons')?.packId).toBe('fr-a1');
    expect(resolveActiveLanguagePack(catalog, 'fr', 'ru', 'lessons')).toBeNull();
  });
});
