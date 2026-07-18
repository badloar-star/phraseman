import { generateLessonUnit, generateSurfaceUnit, type GenerationProvider } from './generation_provider';

const generated = JSON.stringify({
  lessonId: 1,
  phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `source ${index}`, targetText: `target ${index}` })),
  vocabulary: [{ lemma: 'be', partOfSpeech: 'verb', targetText: 'être' }],
  drills: [{ kind: 'part_of_speech', applicable: true, itemCount: 1 }],
});

describe('generation provider seam', () => {
  it('generates one lesson unit through an injected provider and returns QA-bound output', async () => {
    const provider: GenerationProvider = { generate: async () => generated };
    const result = await generateLessonUnit({ provider, model: 'fake', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, blueprintVersion: 'v1', blueprintHash: 'a'.repeat(64), topic: 'identity', sourcePhrases: ['I am ready'], vocabularyFocus: ['be'], drills: ['part_of_speech'], sourceEvidence: [{ evidenceId: 'e1', kind: 'official_curriculum', authority: 'A', url: 'https://example.com', retrievedAt: '2026-07-10', claim: 'A' }] });
    expect(result.qa.status).toBe('passed');
    expect(result.artifact.phrases).toHaveLength(50);
  });

  it('fails closed when provider returns malformed JSON', async () => {
    const provider: GenerationProvider = { generate: async () => '{"bad":true}' };
    await expect(generateLessonUnit({ provider, model: 'fake', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, blueprintVersion: 'v1', blueprintHash: 'a'.repeat(64), topic: 'identity', sourcePhrases: ['I am ready'], vocabularyFocus: ['be'], drills: [], sourceEvidence: [{ evidenceId: 'e1', kind: 'official_curriculum', authority: 'A', url: 'https://example.com', retrievedAt: '2026-07-10', claim: 'A' }] })).rejects.toThrow('generated_lesson_invalid');
  });

  it('generates a flashcard unit through the injected provider seam', async () => {
    const provider: GenerationProvider = { generate: async () =>
      JSON.stringify({ lessonId: 1, surface: 'flashcard', items: [{ id: 'c1', front: 'Je suis', back: 'Я есть' }] }) };
    const common = { provider, model: 'fake', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, topic: 'identity', sourcePhrases: ['I am ready'] } as const;
    const flashcard = await generateSurfaceUnit({ ...common, surface: 'flashcard' });
    expect(flashcard.artifact.surface).toBe('flashcard');
    expect(flashcard.qa.status).toBe('passed');
  });

  it('fails closed when the provider returns a retired surface', async () => {
    const provider: GenerationProvider = { generate: async () => JSON.stringify({ lessonId: 1, surface: 'quiz', items: [{ id: 'q1' }] }) };
    await expect(generateSurfaceUnit({ provider, model: 'fake', surface: 'flashcard', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, topic: 'identity', sourcePhrases: ['I am ready'] })).rejects.toThrow('generated_surface_invalid');
  });
});
