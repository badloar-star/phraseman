import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';

describe('personal plan choose-natural-phrase live route', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];

  it('opens a dedicated plan exercise screen with choice renderer params', () => {
    const router = { push: jest.fn() };
    const task: PlanDailyTask = {
      id: 'gavan_d002_choose_phrase',
      kind: 'plan_choose_natural_phrase',
      title: 'Выбрать фразу',
      subtitle: 'Выбери спокойный вариант под смысл.',
      minutes: 4,
      requiredFor: [10, 15, 20],
      destination: {
        type: 'plan_exercise',
        exerciseType: 'plan_choose_natural_phrase',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: ['gavan_d1_phrase_3', 'gavan_d1_phrase_5'],
        requiredCorrect: 2,
      },
    };

    openPersonalPlanTask(router as any, plan, day, task, 'instance_2');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_choose_natural_phrase',
        planId: 'gavan',
        planDayIndex: '1',
        planTaskId: 'gavan_d002_choose_phrase',
        planInstanceId: 'instance_2',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: 'gavan_d1_phrase_3,gavan_d1_phrase_5',
        requiredCorrect: '2',
      },
    });
  });

  it('builds natural choice items from approved route phrases', () => {
    const items = getPersonalPlanChooseNaturalPhraseItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_3'],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      id: 'gavan_d1_phrase_3',
      promptRu: 'Все нормально.',
      correctAnswer: "It's okay.",
      options: expect.arrayContaining(["It's okay.", "I'm okay.", "You're right."]),
      explanation: expect.objectContaining({
        correctRu: expect.stringContaining('It’s okay'),
        wrongRu: expect.stringContaining('ситуации'),
      }),
    }));

    const allCopy = JSON.stringify(items);
    expect(allCopy).not.toMatch(/alex|beta|phone|email|087|apartment|rent|landlord|viewing|@/i);
    expect(items[0].options).toHaveLength(4);
  });
});
