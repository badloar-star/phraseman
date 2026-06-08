import {
  prerequisiteLessonsForDay,
  computePlanDayLessonRecommendation,
} from '../app/plan_day_lesson_recommendation';
import type { PlanDay } from '../app/personal_plan_catalog';

function makeDay(partial: Partial<PlanDay>): PlanDay {
  return {
    id: 'voyazh_d001',
    dayIndex: 1,
    weekIndex: 1,
    title: 'Day',
    focus: '',
    phraseGoal: '',
    theory: '',
    tasks: [],
    ...partial,
  };
}

describe('plan day lesson recommendation', () => {
  it('uses authored curriculum prerequisites when present', () => {
    const day = makeDay({
      curriculum: { lessonPrerequisites: [1, 3, 7], allowedGrammarTags: [] },
    });
    expect(prerequisiteLessonsForDay(day)).toEqual([1, 3, 7]);
  });

  it('falls back to the lesson gate for generated days without curriculum', () => {
    const day = makeDay({ dayIndex: 1, curriculum: undefined });
    const prereqs = prerequisiteLessonsForDay(day);
    expect(prereqs).toHaveLength(1);
    expect(prereqs[0]).toBeGreaterThanOrEqual(8); // day-1 gate frontier
  });

  it('recommends only lessons the learner has not passed', () => {
    const day = makeDay({
      curriculum: { lessonPrerequisites: [1, 3, 7], allowedGrammarTags: [] },
    });
    const result = computePlanDayLessonRecommendation(day, [1, 3]);
    expect(result.prerequisiteLessonIds).toEqual([1, 3, 7]);
    expect(result.recommendedLessonIds).toEqual([7]);
  });

  it('recommends nothing when all prerequisites are passed', () => {
    const day = makeDay({
      curriculum: { lessonPrerequisites: [1, 3], allowedGrammarTags: [] },
    });
    expect(computePlanDayLessonRecommendation(day, [1, 3, 5]).recommendedLessonIds).toEqual([]);
  });

  it('dedupes and sorts prerequisites, ignores out-of-range lesson ids', () => {
    const day = makeDay({
      curriculum: { lessonPrerequisites: [7, 3, 3, 99, 0, 1], allowedGrammarTags: [] },
    });
    expect(prerequisiteLessonsForDay(day)).toEqual([1, 3, 7]);
  });
});
