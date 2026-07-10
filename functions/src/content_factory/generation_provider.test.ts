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

  it('generates quiz/card/arena units through the same provider seam', async () => {
    const provider: GenerationProvider = { generate: async ({ prompt }) => prompt.includes('flashcard') ? JSON.stringify({ lessonId: 1, surface: 'flashcard', items: [{ id: 'c1', front: 'I am', back: 'Je suis' }] }) : JSON.stringify({ lessonId: 1, surface: 'quiz', items: [{ id: 'q1', prompt: 'Как?', answer: 'Je suis', options: ['Je suis', 'Tu es'] }] }) };
    const result = await generateSurfaceUnit({ provider, model: 'fake', surface: 'flashcard', studyTarget: 'fr', sourceLocale: 'ru', lessonId: 1, topic: 'identity', sourcePhrases: ['I am ready'] });
    expect(result.surface).toBe('flashcard');
  });
});
