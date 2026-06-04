import {
  GAVAN_WEEK1_BLUEPRINT_DRAFT,
} from '../app/personal_plan_harbor_week1_blueprint_draft';
import {
  type PersonalPlanContentQualityIssue,
  validatePersonalPlanContentQuality,
} from '../app/personal_plan_content_quality_contract';
import {
  type PersonalPlanWeekDayDraft,
  validatePersonalPlanWeekContentQuality,
} from '../app/personal_plan_week_content_quality_gate';

describe('GAVAN_WEEK1_BLUEPRINT_DRAFT', () => {
  it('passes the week-level content quality gate', () => {
    const result = validatePersonalPlanWeekContentQuality(
      GAVAN_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary).toEqual(expect.objectContaining({
      totalDays: 7,
      validDays: 7,
      invalidDays: 0,
    }));
    expect(result.summary.uniqueGoalCount).toBeGreaterThanOrEqual(5);
  });

  it('contains exactly seven days', () => {
    expect(GAVAN_WEEK1_BLUEPRINT_DRAFT.days).toHaveLength(7);
  });

  it('starts with a universal day one', () => {
    expect(GAVAN_WEEK1_BLUEPRINT_DRAFT.days[0].scope).toEqual(
      expect.objectContaining({
        weekIndex: 1,
        dayIndex: 1,
        mode: 'universal_start',
      }),
    );
  });

  it('does not include exact personal data or narrow day-one issues', () => {
    const issues: PersonalPlanContentQualityIssue[] = GAVAN_WEEK1_BLUEPRINT_DRAFT.days.flatMap(
      (day: PersonalPlanWeekDayDraft) => day.phrases.flatMap((phrase) => (
        validatePersonalPlanContentQuality(phrase, day.scope).issues
      )),
    );

    expect(issues.map((issue) => issue.code)).not.toEqual(
      expect.arrayContaining([
        'exact_personal_data',
        'too_narrow_for_day_one',
      ]),
    );
  });

  it('keeps narrow scenario tags below overload threshold', () => {
    const result = validatePersonalPlanWeekContentQuality(
      GAVAN_WEEK1_BLUEPRINT_DRAFT,
    );

    expect(result.issues.map((issue) => issue.code)).not.toContain(
      'narrow_scenario_overload',
    );
  });

  it('fails if a similar blueprint repeats a narrow scenario and starts with personal data', () => {
    const corruptedDays: PersonalPlanWeekDayDraft[] = GAVAN_WEEK1_BLUEPRINT_DRAFT.days.map((day) => ({
      ...day,
      focusTags: [...day.focusTags],
      exerciseGoals: [...day.exerciseGoals],
      phrases: day.phrases.map((phrase) => ({
        ...phrase,
        explanations: phrase.explanations?.map((explanation) => ({ ...explanation })),
        visibleOptions: phrase.visibleOptions ? [...phrase.visibleOptions] : undefined,
        newWords: phrase.newWords ? [...phrase.newWords] : undefined,
        firstSeenConstructions: phrase.firstSeenConstructions ? [...phrase.firstSeenConstructions] : undefined,
      })),
    }));

    corruptedDays[0].phrases[0] = {
      id: 'bad-personal-start',
      english: 'My phone number is 0871234567.',
      russian: 'Мой номер телефона 0871234567.',
      visibleOptions: ['My phone number is 0871234567.'],
      explanations: [
        {
          title: 'Phone number',
          body: 'Phone number значит номер телефона.',
          covers: ['phone number'],
        },
      ],
      newWords: ['phone number'],
      firstSeenConstructions: [],
    };
    corruptedDays[1].focusTags = ['rent'];
    corruptedDays[2].exerciseGoals = ['rent'];
    corruptedDays[3].focusTags = ['rent'];

    const result = validatePersonalPlanWeekContentQuality({
      ...GAVAN_WEEK1_BLUEPRINT_DRAFT,
      days: corruptedDays,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'day_failed_quality_gate', dayId: 'gavan-week1-day1' }),
      expect.objectContaining({ code: 'narrow_scenario_overload', detail: 'rent:3' }),
    ]));
    expect(result.dayResults[0].dayIssueCodes).toEqual(expect.arrayContaining([
      'exact_personal_data',
      'day_one_contains_personal_data',
      'too_narrow_for_day_one',
      'day_one_contains_narrow_phrase',
    ]));
  });
});

