import {
  LESSON_COUNT,
  LESSON_GRAMMAR_MAP,
  lessonGrammarEntry,
  lessonForConstruction,
  constructionsUpToLesson,
} from '../app/lesson_grammar_map';

describe('lesson grammar map', () => {
  it('covers exactly the 32 core lessons in order', () => {
    expect(LESSON_GRAMMAR_MAP).toHaveLength(LESSON_COUNT);
    LESSON_GRAMMAR_MAP.forEach((entry, index) => {
      expect(entry.lessonId).toBe(index + 1);
      expect(entry.constructions.length).toBeGreaterThan(0);
    });
  });

  it('only requires earlier lessons (no forward dependencies)', () => {
    for (const entry of LESSON_GRAMMAR_MAP) {
      for (const required of entry.requiresLessons) {
        expect(required).toBeLessThan(entry.lessonId);
      }
    }
  });

  it('maps known constructions to the lesson that introduces them', () => {
    expect(lessonForConstruction('to-be')).toBe(1);
    expect(lessonForConstruction('present-simple')).toBe(3);
    expect(lessonForConstruction('gerund')).toBe(22);
    expect(lessonForConstruction('present-perfect')).toBe(24);
    expect(lessonForConstruction('complex-object')).toBe(31);
    expect(lessonForConstruction('not-a-real-construction')).toBeUndefined();
  });

  it('exposes entries by id', () => {
    expect(lessonGrammarEntry(1)?.level).toBe('A1');
    expect(lessonGrammarEntry(24)?.level).toBe('B1');
    expect(lessonGrammarEntry(99)).toBeUndefined();
  });

  it('accumulates constructions up to a lesson', () => {
    const early = constructionsUpToLesson(3);
    expect(early.has('to-be')).toBe(true);
    expect(early.has('present-simple')).toBe(true);
    expect(early.has('gerund')).toBe(false);
    expect(early.has('present-perfect')).toBe(false);

    const late = constructionsUpToLesson(LESSON_COUNT);
    expect(late.has('gerund')).toBe(true);
    expect(late.has('present-perfect')).toBe(true);
  });
});
