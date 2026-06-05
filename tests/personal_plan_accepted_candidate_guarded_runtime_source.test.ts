import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';

const REQUIRED_RUNTIME_TASK_KINDS = [
  'plan_phrase_lesson',
  'plan_missing_word',
  'plan_choose_natural_phrase',
  'plan_listen_choose',
  'plan_listen_build',
  'plan_pronunciation_repeat',
  'plan_phrase_recall',
  'plan_quiz',
];

describe('accepted candidate guarded runtime source binding', () => {
  it('binds the accepted 28-day candidate cycle for every plan into runtime catalog metadata', () => {
    const acceptedDays = PERSONAL_PLAN_CATALOG.flatMap((plan) =>
      plan.days
        .filter((day) => day.dayIndex <= 28)
        .map((day) => ({ plan, day }))
    );

    expect(acceptedDays).toHaveLength(140);
    for (const { plan, day } of acceptedDays) {
      expect(day.source?.status).toBe('accepted_candidate_runtime_bound');
      expect(day.source?.candidateId).toBe(`${plan.id}_d${String(day.dayIndex).padStart(3, '0')}_chat_draft_candidate`);
      expect(day.source?.sourceRuntimeWriteAllowed).toBe(true);
      expect(day.source?.liveRegistrationAllowed).toBe(false);
      expect(day.source?.generatedContentCreationAllowed).toBe(false);
      expect(day.source?.productionReady).toBe(false);
      expect(day.status).not.toBe('scaffold');
      expect(allTasksForDay(day).map((task) => task.kind)).toEqual(REQUIRED_RUNTIME_TASK_KINDS);
      expect(allTasksForDay(day).some((task) => task.destination.type === 'lesson')).toBe(false);
    }
  });

  it('keeps selected minutes as the initial visible slice while the full accepted day pool stays available', () => {
    const gavan = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'gavan')!;
    const day2 = gavan.days[1];

    expect(day2.source?.status).toBe('accepted_candidate_runtime_bound');
    expect(allTasksForDay(day2)).toHaveLength(8);
    expect(tasksForMinutes(day2, 5)).toHaveLength(3);
    expect(tasksForMinutes(day2, 10)).toHaveLength(4);
    expect(tasksForMinutes(day2, 15)).toHaveLength(5);
    expect(tasksForMinutes(day2, 20)).toHaveLength(6);
  });

  it('does not mark candidate-bound source as production-ready or live audio/pronunciation ready', () => {
    const candidateBound = PERSONAL_PLAN_CATALOG.flatMap((plan) =>
      plan.days.filter((day) => day.source?.status === 'accepted_candidate_runtime_bound')
    );

    expect(candidateBound).toHaveLength(140);
    expect(candidateBound.every((day) => day.source?.productionReady === false)).toBe(true);
    expect(candidateBound.every((day) => day.source?.liveRegistrationAllowed === false)).toBe(true);
    expect(candidateBound.every((day) => day.source?.audioReadiness === 'not_live_registered')).toBe(true);
    expect(candidateBound.every((day) => day.source?.pronunciationReadiness === 'needs_real_scorer_recording_evidence')).toBe(true);
  });
});
