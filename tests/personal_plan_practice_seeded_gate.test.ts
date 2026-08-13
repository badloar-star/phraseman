import { openPersonalPlanTask, planTaskDestinationLabel } from '../app/personal_plan_navigation';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';
import {
  PERSONAL_PRACTICE_SEEDED_MIN_PHRASES,
  PERSONAL_PRACTICE_SEEDED_MIN_WORDS,
  resolvePersonalPracticeSeededReadiness,
} from '../app/personal_plan_practice_seeded_gate';

describe('personal_practice_seeded gate and route', () => {
  it('requires real due material before showing My Practice inside a plan', () => {
    expect(PERSONAL_PRACTICE_SEEDED_MIN_PHRASES).toBe(3);
    expect(PERSONAL_PRACTICE_SEEDED_MIN_WORDS).toBe(5);

    expect(resolvePersonalPracticeSeededReadiness({
      duePhraseCount: 2,
      dueWordCount: 4,
    })).toEqual(expect.objectContaining({
      status: 'blocked',
      reason: 'not_enough_due_material',
    }));

    expect(resolvePersonalPracticeSeededReadiness({
      duePhraseCount: 3,
      dueWordCount: 0,
    })).toEqual(expect.objectContaining({
      status: 'ready',
      reason: 'enough_due_phrases',
    }));

    expect(resolvePersonalPracticeSeededReadiness({
      duePhraseCount: 0,
      dueWordCount: 5,
    })).toEqual(expect.objectContaining({
      status: 'ready',
      reason: 'enough_due_words',
    }));
  });

  it('opens seeded practice as the real review session with plan completion context', () => {
    const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
    const day = plan.days[1];
    const task: PlanDailyTask = {
      id: 'gavan_d002_personal_practice',
      kind: 'personal_practice_seeded',
      title: 'Моя практика',
      subtitle: 'Короткое повторение того, что уже просится назад.',
      minutes: 5,
      requiredFor: [15, 20],
      destination: {
        type: 'practice',
        trainingId: 'gavan_due_review',
        requiredPhrases: 3,
        requiredWords: 5,
      },
    };
    const router = { push: jest.fn() };

    expect(planTaskDestinationLabel(task.destination)).toBe('Моя практика · 3 фразы');

    openPersonalPlanTask(router as any, plan, day, task, 'gavan-instance-1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/review',
      params: {
        planPracticeTask: '1',
        trainingId: 'gavan_due_review',
        requiredPhrases: '3',
        requiredWords: '5',
        planTaskId: 'gavan_d002_personal_practice',
        planInstanceId: 'gavan-instance-1',
        planId: 'gavan',
        planDayIndex: '2',
      },
    });
  });
});
