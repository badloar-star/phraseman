import { assertSurfaceMatchesPack, validateGeneratedSurfaceItem } from './surface_contract';

describe('generated card surface contract', () => {
  it('requires pack identity and rejects cross-language delivery', () => {
    const item = { id: 'card-1', packId: 'fr-a1', studyTarget: 'fr', revision: 4, contentHash: 'hash-fr', sourceLocale: 'en', lessonId: 1, surface: 'cards' as const, difficulty: 'beginner' as const };
    validateGeneratedSurfaceItem(item);
    expect(() => assertSurfaceMatchesPack(item, { packId: 'fr-a1', studyTarget: 'fr', revision: 3, contentHash: 'hash-fr', sourceLocale: 'en' })).toThrow('cross_language_or_revision_mismatch');
  });
});
