import {
  validatePersonalPlanWeekContentQuality,
  PersonalPlanWeekDayDraft,
} from '../app/personal_plan_week_content_quality_gate';
import {
  PersonalPlanContentQualityScope,
  PersonalPlanPhraseDraft,
} from '../app/personal_plan_content_quality_contract';

function makeScope(dayIndex: number, mode: PersonalPlanContentQualityScope['mode']): PersonalPlanContentQualityScope {
  return {
    planId: 'harbor',
    weekIndex: 1,
    dayIndex,
    mode,
  };
}

function makePhrase(
  id: string,
  overrides: Partial<PersonalPlanPhraseDraft> = {},
): PersonalPlanPhraseDraft {
  return {
    id,
    english: "I'm here.",
    russian: 'Я здесь.',
    visibleOptions: ["I'm here."],
    explanations: [
      {
        title: "I'm",
        body: "I'm - короткая живая форма I am. Here значит здесь.",
        covers: ["I'm", 'here'],
      },
    ],
    newWords: ['here'],
    firstSeenConstructions: ["I'm"],
    ...overrides,
  };
}

function makeDay(
  dayIndex: number,
  overrides: Partial<PersonalPlanWeekDayDraft> = {},
): PersonalPlanWeekDayDraft {
  const goalNames = [
    'arrival',
    'repeat_request',
    'simple_pause',
    'polite_help',
    'confirming',
    'short_answer',
    'review',
  ];

  return {
    dayId: `harbor-week1-day${dayIndex}`,
    scope: makeScope(dayIndex, dayIndex === 1 ? 'universal_start' : 'regular_day'),
    phrases: [
      makePhrase(`phrase-${dayIndex}`),
    ],
    focusTags: [goalNames[dayIndex - 1]],
    exerciseGoals: [`goal-${goalNames[dayIndex - 1]}`],
    ...overrides,
  };
}

function makeValidWeek(): PersonalPlanWeekDayDraft[] {
  return [1, 2, 3, 4, 5, 6, 7].map((dayIndex) => makeDay(dayIndex));
}

describe('validatePersonalPlanWeekContentQuality', () => {
  it('passes a valid seven-day Harbor blueprint', () => {
    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days: makeValidWeek(),
    });

    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      totalDays: 7,
      validDays: 7,
      invalidDays: 0,
      uniqueGoalCount: 14,
    });
    expect(result.issues).toEqual([]);
  });

  it('fails if the week does not contain exactly seven days', () => {
    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days: makeValidWeek().slice(0, 6),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'invalid_day_count',
      detail: '6',
    });
  });

  it('fails if day one is not universal_start', () => {
    const days = makeValidWeek();
    days[0] = makeDay(1, {
      scope: makeScope(1, 'regular_day'),
    });

    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'day_one_not_universal_start',
      dayId: 'harbor-week1-day1',
    });
  });

  it('fails if week identity, day order, ids, or plan ownership are corrupted', () => {
    const days = makeValidWeek();
    days[1] = makeDay(1, {
      dayId: 'harbor-week1-day1',
      scope: {
        ...makeScope(1, 'regular_day'),
        planId: 'voyage',
      },
    });

    const result = validatePersonalPlanWeekContentQuality({
      weekId: ' ',
      planId: 'harbor',
      days,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_week_identity' }),
      expect.objectContaining({ code: 'duplicate_day_id', dayId: 'harbor-week1-day1' }),
      expect.objectContaining({ code: 'duplicate_day_index', detail: '1' }),
      expect.objectContaining({ code: 'day_sequence_invalid', detail: '1,1,3,4,5,6,7' }),
      expect.objectContaining({ code: 'day_plan_mismatch', dayId: 'harbor-week1-day1', detail: 'voyage' }),
    ]));
  });

  it('fails if any day fails the day-level content gate', () => {
    const days = makeValidWeek();
    days[2] = makeDay(3, {
      phrases: [
        makePhrase('bad-explanation', {
          english: "I'm here for my appointment.",
          russian: 'Я здесь на встречу.',
          explanations: [
            {
              body: "I'm - короткая форма I am.",
              covers: ["I'm"],
            },
          ],
          newWords: ['appointment', 'here'],
          firstSeenConstructions: ["I'm"],
        }),
      ],
    });

    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'day_failed_quality_gate',
      dayId: 'harbor-week1-day3',
    });
    expect(result.dayResults[2].valid).toBe(false);
  });

  it('fails if the week has low goal variety', () => {
    const days = makeValidWeek().map((day) => ({
      ...day,
      focusTags: ['arrival'],
      exerciseGoals: ['build_phrase'],
    }));

    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'low_week_variety',
      detail: '2',
    });
  });

  it('fails if the same narrow scenario is overloaded across the week', () => {
    const days = makeValidWeek();
    days[1] = makeDay(2, {
      focusTags: ['apartment'],
    });
    days[2] = makeDay(3, {
      focusTags: ['apartment'],
    });
    days[3] = makeDay(4, {
      focusTags: ['apartment'],
    });

    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'narrow_scenario_overload',
      detail: 'apartment:3',
    });
  });

  it('counts narrow scenario overload inside exercise goals as well as focus tags', () => {
    const days = makeValidWeek();
    days[1] = makeDay(2, {
      exerciseGoals: ['rent'],
    });
    days[2] = makeDay(3, {
      exerciseGoals: ['rent'],
    });
    days[3] = makeDay(4, {
      exerciseGoals: ['rent'],
    });

    const result = validatePersonalPlanWeekContentQuality({
      weekId: 'harbor-week1',
      planId: 'harbor',
      days,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'narrow_scenario_overload',
      detail: 'rent:3',
    });
  });
});
