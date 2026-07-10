import { assertSurfaceMatchesPack, validateGeneratedSurfaceItem } from './surface_contract';

describe('generated quiz/card/arena surface contract', () => {
  it('requires pack identity and rejects cross-language delivery', () => {
    const item = { id: 'q1', packId: 'fr-a1', studyTarget: 'fr', lessonId: 1, surface: 'arena_questions' as const, difficulty: 'beginner' as const };
    validateGeneratedSurfaceItem(item);
    expect(() => assertSurfaceMatchesPack(item, { packId: 'es-a1', studyTarget: 'es' })).toThrow('cross_language_or_revision_mismatch');
  });
});
