import { validateLessonArtifact, type LessonArtifact } from './contracts';

const phrase = (id: number) => ({ id: `p-${id}`, sourceText: `Source ${id}`, targetText: `Target ${id}` });

const validLesson: LessonArtifact = {
  lessonId: 1,
  phrases: Array.from({ length: 50 }, (_, index) => phrase(index + 1)),
  vocabulary: [{ lemma: 'hello', partOfSpeech: 'interjection', targetText: 'bonjour' }],
  drills: [
    { kind: 'irregular_verbs', applicable: false, itemCount: 0 },
    { kind: 'prepositions', applicable: true, itemCount: 3 },
  ],
};

describe('language factory lesson QA contract', () => {
  it('accepts a complete 50-phrase lesson with applicable drills only', () => {
    expect(validateLessonArtifact(validLesson)).toEqual({ ok: true, errors: [] });
  });

  it('rejects wrong phrase count, duplicates, and empty vocabulary', () => {
    const result = validateLessonArtifact({
      ...validLesson,
      phrases: [phrase(1), { ...phrase(2), targetText: 'Target 1' }],
      vocabulary: [],
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(['phrase_count_expected_50', 'phrase_duplicate', 'vocabulary_required']));
  });

  it('rejects generated items inside a non-applicable drill', () => {
    const result = validateLessonArtifact({
      ...validLesson,
      drills: [{ kind: 'irregular_verbs', applicable: false, itemCount: 2 }],
    });
    expect(result.errors).toContain('non_applicable_drill_has_items');
  });
});
