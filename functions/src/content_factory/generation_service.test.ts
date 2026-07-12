import { buildLessonGenerationPrompt, parseGeneratedLessonArtifact } from './generation_service';

describe('language factory generation service', () => {
  it('builds a target-scoped strict JSON prompt from the server blueprint', () => {
    const prompt = buildLessonGenerationPrompt({
      studyTarget: 'fr', sourceLocale: 'en', lessonId: 1, blueprintVersion: 'en-v1',
      sourcePhrases: ['I am ready'], topic: 'identity', vocabularyFocus: ['be'], drills: ['part_of_speech'],
    });
    expect(prompt).toContain('studyTarget=fr');
    expect(prompt).toContain('sourceLocale=en');
    expect(prompt).toContain('exactly 50');
    expect(prompt).toContain('JSON only');
  });

  it('accepts only a complete lesson artifact shape', () => {
    const parsed = parseGeneratedLessonArtifact(JSON.stringify({
      lessonId: 1,
      phrases: Array.from({ length: 50 }, (_, index) => ({ id: `p-${index}`, sourceText: `source ${index}`, targetText: `target ${index}` })),
      vocabulary: [{ lemma: 'be', partOfSpeech: 'verb', targetText: 'être' }],
      drills: [{ kind: 'part_of_speech', applicable: true, itemCount: 1 }],
    }));
    expect(parsed.lessonId).toBe(1);
    expect(() => parseGeneratedLessonArtifact('{"lessonId":1,"phrases":[]}')).toThrow('generated_lesson_invalid');
  });
});
