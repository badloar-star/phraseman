import {
  lessonGateForDay,
  allowedConstructionsForDay,
  phraseFitsDay,
  recommendedLessonsForDay,
} from '../app/plan_lesson_gate';
import { LESSON_COUNT } from '../app/lesson_grammar_map';

describe('plan lesson gate', () => {
  it('keeps day 1 on early-lesson grammar only', () => {
    const gate = lessonGateForDay(1);
    expect(gate).toBeGreaterThanOrEqual(8);
    expect(gate).toBeLessThan(22); // no gerund on day 1

    const allowed = allowedConstructionsForDay(1);
    expect(allowed.has('to-be')).toBe(true);
    expect(allowed.has('present-simple')).toBe(true);
    expect(allowed.has('gerund')).toBe(false);
    expect(allowed.has('present-perfect')).toBe(false);
  });

  it('is monotonic non-decreasing across days and clamps to lesson count', () => {
    let previous = 0;
    for (let day = 1; day <= 120; day += 1) {
      const gate = lessonGateForDay(day);
      expect(gate).toBeGreaterThanOrEqual(previous);
      expect(gate).toBeLessThanOrEqual(LESSON_COUNT);
      previous = gate;
    }
    expect(lessonGateForDay(200)).toBe(LESSON_COUNT);
  });

  it('handles invalid day indexes safely', () => {
    expect(lessonGateForDay(0)).toBe(lessonGateForDay(1));
    expect(lessonGateForDay(-5)).toBe(lessonGateForDay(1));
    expect(lessonGateForDay(NaN)).toBe(lessonGateForDay(1));
  });

  it('blocks phrases that need not-yet-unlocked grammar early, allows them later', () => {
    // a phrase using the gerund (lesson 22) must not fit day 1
    expect(phraseFitsDay(['gerund'], 1)).toBe(false);
    // but fits a late day when lesson 22 is unlocked
    expect(phraseFitsDay(['gerund'], 60)).toBe(true);
    // an early-grammar phrase fits day 1
    expect(phraseFitsDay(['to-be', 'present-simple'], 1)).toBe(true);
  });

  it('treats unknown (thematic) tags as non-blocking', () => {
    expect(phraseFitsDay(['airport-help', 'taxi-request'], 1)).toBe(true);
    expect(phraseFitsDay([], 1)).toBe(true);
  });

  it('recommends the lessons that introduce a day grammar, minus passed ones', () => {
    // day uses present-perfect (lesson 24) and to-be (lesson 1)
    const required = ['present-perfect', 'to-be'];
    expect(recommendedLessonsForDay(required, [])).toEqual([1, 24]);
    // learner already passed lesson 1
    expect(recommendedLessonsForDay(required, [1])).toEqual([24]);
    // learner passed everything relevant -> no recommendation
    expect(recommendedLessonsForDay(required, [1, 24])).toEqual([]);
  });

  it('ignores thematic tags when recommending lessons', () => {
    expect(recommendedLessonsForDay(['airport-help', 'present-simple'], [])).toEqual([3]);
  });
});
