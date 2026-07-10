import { assertSurfaceMatchesPack, validateGeneratedSurfaceItem } from './surface_contract';

describe('generated quiz/card/arena surface contract', () => {
  it('requires pack identity and rejects cross-language delivery', () => {
    const item = { id: 'q1', packId: 'fr-a1', studyTarget: 'fr', revision: 4, contentHash: 'hash-fr', sourceLocale: 'en', lessonId: 1, surface: 'arena_questions' as const, difficulty: 'beginner' as const };
    validateGeneratedSurfaceItem(item);
    expect(() => assertSurfaceMatchesPack(item, { packId: 'fr-a1', studyTarget: 'fr', revision: 3, contentHash: 'hash-fr', sourceLocale: 'en' })).toThrow('cross_language_or_revision_mismatch');
  });
});
