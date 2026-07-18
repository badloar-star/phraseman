import { parseGeneratedSurfaceArtifact, buildSurfaceGenerationPrompt } from './surface_generation';

describe('generated flashcard surface', () => {
  it('builds a flashcard prompt without changing the lesson blueprint', () => {
    const prompt = buildSurfaceGenerationPrompt({ surface: 'flashcard', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, topic: 'identity', sourcePhrases: ['I am ready'] });
    expect(prompt).toContain('surface=flashcard');
    expect(prompt).toContain('studyTarget=fr');
    expect(prompt).toContain('back must be the exact learner-facing meaning only in sourceLocale=ru');
    expect(prompt).toContain('front must be written only in studyTarget=fr');
    expect(prompt).toContain('JSON only');
  });

  it('validates flashcards and rejects every other surface output', () => {
    const flashcard = { lessonId: 1, surface: 'flashcard', items: [{ id: 'c1', front: 'I am', back: 'Je suis' }] };
    expect(parseGeneratedSurfaceArtifact(JSON.stringify(flashcard))).toMatchObject({ surface: 'flashcard', lessonId: 1 });
    for (const surface of ['quiz', 'arena', 'lesson']) {
      expect(() => parseGeneratedSurfaceArtifact(JSON.stringify({ ...flashcard, surface }))).toThrow('generated_surface_invalid');
    }
  });
});
