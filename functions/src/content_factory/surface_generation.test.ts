import { parseGeneratedSurfaceArtifact, buildSurfaceGenerationPrompt } from './surface_generation';

describe('generated quiz/card/arena surfaces', () => {
  it('builds a surface-specific prompt without changing the lesson blueprint', () => {
    const prompt = buildSurfaceGenerationPrompt({ surface: 'arena', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, topic: 'identity', sourcePhrases: ['I am ready'] });
    expect(prompt).toContain('surface=arena');
    expect(prompt).toContain('studyTarget=fr');
    expect(prompt).toContain('prompt must be written only in sourceLocale=ru');
    expect(prompt).toContain('answer and every option must be written only in studyTarget=fr');
    expect(prompt).toContain('JSON only');
  });

  it('validates all three surface item shapes and rejects wrong surface output', () => {
    const base = { lessonId: 1, surface: 'quiz', items: [{ id: 'q1', prompt: 'Как?', answer: 'Je suis', options: ['Je suis', 'Tu es'] }] };
    expect(parseGeneratedSurfaceArtifact(JSON.stringify(base))).toMatchObject({ surface: 'quiz', lessonId: 1 });
    expect(parseGeneratedSurfaceArtifact(JSON.stringify({ ...base, surface: 'flashcard', items: [{ id: 'c1', front: 'I am', back: 'Je suis' }] }))).toMatchObject({ surface: 'flashcard' });
    expect(parseGeneratedSurfaceArtifact(JSON.stringify({ ...base, surface: 'arena', items: [{ id: 'a1', prompt: 'Как?', answer: 'Je suis', options: ['Je suis', 'Tu es', 'Il est', 'Nous sommes'] }] }))).toMatchObject({ surface: 'arena' });
    expect(() => parseGeneratedSurfaceArtifact(JSON.stringify({ ...base, surface: 'lesson' }))).toThrow('generated_surface_invalid');
  });
});
