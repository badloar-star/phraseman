import {
  unlockedKindsForWeek,
  isKindUnlockedForWeek,
  requiredCorrectForWeek,
} from '../app/plan_week_mode_progression';

describe('plan week mode progression', () => {
  it('week 1 is recognition/construction only — no listening, speaking, recall or quiz', () => {
    const kinds = unlockedKindsForWeek(1);
    expect(kinds).toContain('plan_missing_word');
    expect(kinds).toContain('plan_choose_natural_phrase');
    expect(kinds).not.toContain('plan_listen_choose');
    expect(kinds).not.toContain('plan_pronunciation_repeat');
    expect(kinds).not.toContain('plan_phrase_recall');
    expect(kinds).not.toContain('plan_quiz');
  });

  it('week 2 adds listening but still no speaking/quiz', () => {
    const kinds = unlockedKindsForWeek(2);
    expect(kinds).toContain('plan_listen_choose');
    expect(kinds).toContain('plan_listen_build');
    expect(kinds).not.toContain('plan_pronunciation_repeat');
    expect(kinds).not.toContain('plan_quiz');
  });

  it('week 3 adds speaking and recall', () => {
    const kinds = unlockedKindsForWeek(3);
    expect(kinds).toContain('plan_pronunciation_repeat');
    expect(kinds).toContain('plan_phrase_recall');
    expect(kinds).not.toContain('plan_quiz');
  });

  it('week 4+ keeps the full non-quiz plan set', () => {
    const kinds = unlockedKindsForWeek(4);
    expect(kinds).toEqual(unlockedKindsForWeek(3));
    expect(kinds).not.toContain('plan_quiz');
    // weeks beyond 4 keep the same full non-quiz set
    expect(unlockedKindsForWeek(10)).toEqual(unlockedKindsForWeek(4));
  });

  it('is additive — later weeks keep all earlier modes', () => {
    const w1 = unlockedKindsForWeek(1);
    const w4 = unlockedKindsForWeek(4);
    for (const kind of w1) expect(w4).toContain(kind);
  });

  it('always keeps the lesson slice and phrase set', () => {
    for (const week of [1, 2, 3, 4]) {
      const kinds = unlockedKindsForWeek(week);
      expect(kinds).toContain('linked_lesson_slice');
      expect(kinds).toContain('plan_phrase_lesson');
    }
  });

  it('does not gate non-progression kinds', () => {
    expect(isKindUnlockedForWeek('trainer_weak_spot', 1)).toBe(true);
    expect(isKindUnlockedForWeek('plan_quiz', 1)).toBe(false);
    expect(isKindUnlockedForWeek('plan_quiz', 4)).toBe(false);
  });

  it('handles invalid week indexes as week 1', () => {
    expect(unlockedKindsForWeek(0)).toEqual(unlockedKindsForWeek(1));
    expect(unlockedKindsForWeek(-3)).toEqual(unlockedKindsForWeek(1));
    expect(unlockedKindsForWeek(NaN)).toEqual(unlockedKindsForWeek(1));
  });

  it('grows required-correct gently with the week', () => {
    expect(requiredCorrectForWeek(3, 1)).toBe(3);
    expect(requiredCorrectForWeek(3, 3)).toBe(4);
    expect(requiredCorrectForWeek(3, 5)).toBe(5);
    // never below 1
    expect(requiredCorrectForWeek(0, 1)).toBe(1);
  });
});
