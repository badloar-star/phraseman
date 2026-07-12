import { parseActiveLanguageCatalog, resolveActiveLanguagePack } from './catalog_client';

describe('active language catalog client', () => {
  it('rejects duplicate or malformed target entries and resolves exact target only', () => {
    const catalog = parseActiveLanguageCatalog({ fetchedAt: '2026-07-10T00:00:00.000Z', entries: [{ surface: 'lessons', studyTarget: 'fr', packId: 'fr-a1', revision: 2, contentHash: 'hash', sourceLocale: 'en' }] });
    expect(resolveActiveLanguagePack(catalog, 'fr', 'en', 'lessons')?.packId).toBe('fr-a1');
    expect(resolveActiveLanguagePack(catalog, 'fr', 'ru', 'lessons')).toBeNull();
    expect(resolveActiveLanguagePack(catalog, 'es', 'en', 'lessons')).toBeNull();
    expect(() => parseActiveLanguageCatalog({ fetchedAt: 'now', entries: [{ surface: 'lessons', studyTarget: 'fr', packId: 'a', revision: 1, contentHash: 'h', sourceLocale: 'en' }, { surface: 'lessons', studyTarget: 'fr', packId: 'b', revision: 2, contentHash: 'h2', sourceLocale: 'en' }] })).toThrow('catalog_duplicate_target_surface');
  });
});
