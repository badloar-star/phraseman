import {
  resolveOrderedActivationMilestones,
  summarizeActivationCohort,
  summarizeFirstTouchCohorts,
} from './evidence_cohort_semantics';

describe('evidence cohort semantics', () => {
  const day = (iso: string) => Date.parse(`${iso}T00:00:00.000Z`);

  it('separates exact-day from rolling retention and excludes immature cohorts', () => {
    const result = summarizeFirstTouchCohorts([
      {
        firstTouchMs: day('2026-05-01'),
        activeDayMs: [day('2026-05-01'), day('2026-05-02'), day('2026-05-09'), day('2026-06-02')],
      },
      {
        firstTouchMs: day('2026-05-01'),
        activeDayMs: [day('2026-05-01'), day('2026-05-08')],
      },
      {
        firstTouchMs: day('2026-05-30'),
        activeDayMs: [day('2026-05-30'), day('2026-05-31')],
      },
    ], day('2026-06-05'));

    expect(result.summary.d1).toEqual({ eligible: 3, exactReturned: 2, rollingReturned: 3 });
    expect(result.summary.d7).toEqual({ eligible: 2, exactReturned: 1, rollingReturned: 2 });
    expect(result.summary.d14).toEqual({ eligible: 2, exactReturned: 0, rollingReturned: 1 });
    expect(result.summary.d30).toEqual({ eligible: 2, exactReturned: 0, rollingReturned: 1 });
    expect(result.activeDayBuckets).toEqual({ one: 0, twoToThree: 2, fourToSeven: 1, eightPlus: 0 });
  });

  it('rejects impossible first-touch timestamps instead of silently re-cohorting them', () => {
    const result = summarizeFirstTouchCohorts([
      { firstTouchMs: 0, activeDayMs: [day('2026-05-02')] },
      { firstTouchMs: day('2026-05-03'), activeDayMs: [day('2026-05-02')] },
    ], day('2026-06-05'));

    expect(result.validInstances).toBe(0);
    expect(result.invalidInstances).toBe(2);
  });

  it('keeps activation milestones ordered within the first-touch cohort', () => {
    const result = summarizeActivationCohort([
      { onboarding: true, learningStarted: true, learningCompleted: true, returnedWithin72h: true, returnedD7: false },
      { onboarding: true, learningStarted: true, learningCompleted: false, returnedWithin72h: false, returnedD7: false },
      { onboarding: false, learningStarted: false, learningCompleted: false, returnedWithin72h: false, returnedD7: false },
    ]);

    expect(result).toEqual({
      cohort: 3,
      onboarding: 2,
      learningStarted: 2,
      learningCompleted: 1,
      returnedWithin72h: 1,
      returnedD7: 0,
    });
  });

  it('does not count downstream activation when an upstream milestone is absent', () => {
    const result = summarizeActivationCohort([
      { onboarding: false, learningStarted: true, learningCompleted: true, returnedWithin72h: true, returnedD7: true },
      { onboarding: true, learningStarted: false, learningCompleted: true, returnedWithin72h: true, returnedD7: true },
    ]);

    expect(result).toEqual({
      cohort: 2,
      onboarding: 1,
      learningStarted: 0,
      learningCompleted: 0,
      returnedWithin72h: 0,
      returnedD7: 0,
    });
  });

  it('skips early invalid events and selects the first later event after each milestone', () => {
    const hour = 60 * 60 * 1000;
    const result = resolveOrderedActivationMilestones({
      firstTouchMs: 0,
      onboardingCompletedMs: [10 * hour],
      lessonStartedMs: [5 * hour, 20 * hour],
      lessonCompletedMs: [15 * hour, 30 * hour],
      sessionStartedMs: [25 * hour, 40 * hour, 7 * 24 * hour],
    });

    expect(result).toEqual({
      onboardingCompletedAt: 10 * hour,
      learningStartedAt: 20 * hour,
      learningCompletedAt: 30 * hour,
      returnedWithin72hAt: 40 * hour,
      returnedD7At: 7 * 24 * hour,
    });
  });
});
