import { phrasesForPlanDay } from '../app/personal_plan_day_phrases';
import { getPlanById, type PlanDay } from '../app/personal_plan_catalog';

describe('phrasesForPlanDay', () => {
  const plan = getPlanById('gavan');

  it('returns display phrases with english text for a real early plan day', () => {
    const day = plan.days.find((d) => d.dayIndex === 1) as PlanDay;
    const phrases = phrasesForPlanDay(day);
    expect(Array.isArray(phrases)).toBe(true);
    // Day 1 of a real plan teaches phrases, so we expect at least one.
    expect(phrases.length).toBeGreaterThan(0);
    for (const p of phrases) {
      expect(typeof p.id).toBe('string');
      expect(p.english.length).toBeGreaterThan(0);
      expect(typeof p.russian).toBe('string');
    }
  });

  it('de-duplicates phrases by english text (a phrase practised twice appears once)', () => {
    const day = plan.days.find((d) => d.dayIndex === 1) as PlanDay;
    const phrases = phrasesForPlanDay(day);
    const keys = phrases.map((p) => p.english.toLowerCase());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('never throws and returns an array for every day in a full plan', () => {
    for (const day of plan.days) {
      expect(() => phrasesForPlanDay(day)).not.toThrow();
      expect(Array.isArray(phrasesForPlanDay(day))).toBe(true);
    }
  });

  it('returns an empty array for a day with no phrase-bearing tasks', () => {
    const emptyDay: PlanDay = {
      id: 'synthetic-empty',
      dayIndex: 999,
      weekIndex: 1,
      title: 'Quiz only',
      focus: '',
      phraseGoal: '',
      theory: '',
      tasks: [
        {
          id: 't1',
          kind: 'plan_quiz',
          title: 'Quiz',
          subtitle: '',
          minutes: 5,
          requiredFor: [5, 10, 15, 20],
          destination: { type: 'quiz', quizId: 'q1', questionCount: 10, level: 'easy' },
        },
      ],
    };
    expect(phrasesForPlanDay(emptyDay)).toEqual([]);
  });
});
