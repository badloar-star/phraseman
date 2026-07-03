import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPhraseRecallItems } from '../app/personal_plan_phrase_recall_items';

describe('generated personal plan scaffold task routes', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'mitap')!;
  const day = plan.days[0];
  const visibleTasks = tasksForMinutes(day, 15);

  it('shows the full day-1 mode ladder for generated scaffold plans', () => {
    // Day-1 ladder follows the mitap mode profile (Ф3): even the mix plan
    // surfaces speaking inside the first short session.
    const expectedKinds = [
      'plan_phrase_lesson',
      'plan_missing_word',
      'plan_listen_choose',
      'plan_pronunciation_repeat',
      'plan_choose_natural_phrase',
      'plan_listen_build',
      'plan_phrase_recall',
    ];

    expect(allTasksForDay(day).map((task) => task.kind)).toEqual(expectedKinds);
    expect(tasksForMinutes(day, 5).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 3));
    expect(tasksForMinutes(day, 10).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 4));
    expect(tasksForMinutes(day, 15).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 5));
    expect(tasksForMinutes(day, 20).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 6));
    expect(tasksForMinutes(day, 20).some((task) => task.destination.type === 'lesson')).toBe(false);
  });

  it('keeps the main phrase-introduction task first while varying the remaining daily order', () => {
    const firstWeekOrders = plan.days.slice(0, 7).map((item) => allTasksForDay(item).map((task) => task.kind));
    const firstTaskKinds = firstWeekOrders.map((order) => order[0]);
    const uniqueTailOrders = new Set(firstWeekOrders.map((order) => order.slice(1).join('>')));

    expect(firstTaskKinds).toEqual(Array(7).fill('plan_phrase_lesson'));
    expect(uniqueTailOrders.size).toBeGreaterThanOrEqual(4);
    expect(firstWeekOrders[1]).not.toEqual(firstWeekOrders[0]);
    expect(firstWeekOrders[2]).not.toEqual(firstWeekOrders[1]);
  });

  it('opens every generated day-1 exercise card with its own renderer type', () => {
    const exerciseTasks = tasksForMinutes(day, 20).filter((task) => task.destination.type === 'plan_exercise');

    expect(exerciseTasks.map((task) => task.destination.type === 'plan_exercise' ? task.destination.exerciseType : null)).toEqual([
      'plan_missing_word',
      'plan_listen_choose',
      'plan_pronunciation_repeat',
      'plan_choose_natural_phrase',
      'plan_listen_build',
    ]);

    for (const task of exerciseTasks) {
      const router = { push: jest.fn() };
      openPersonalPlanTask(router as any, plan, day, task, 'mitap-instance-1');
      const destination = task.destination.type === 'plan_exercise' ? task.destination : null;

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/personal_plan_exercise',
        params: expect.objectContaining({
          rendererType: destination?.exerciseType,
          lessonId: 'mitap_d001_content_unit',
          contentUnitIds: expect.stringMatching(/^mitap_d001_content_unit_phrase_1,/),
        }),
      });
    }
  });

  it('opens generated route phrase cards in a dedicated plan exercise mode, not a lesson shell', () => {
    const router = { push: jest.fn() };
    const task = visibleTasks.find((item) => item.kind === 'plan_phrase_lesson')!;

    openPersonalPlanTask(router as any, plan, day, task, 'mitap-instance-1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: expect.objectContaining({
        rendererType: 'plan_phrase_build',
        planId: 'mitap',
        planDayIndex: '1',
        planTaskId: task.id,
        planInstanceId: 'mitap-instance-1',
        lessonId: 'mitap_d001_content_unit',
        contentUnitIds: expect.stringMatching(/^mitap_d001_content_unit_phrase_1,/),
        requiredCorrect: '5',
      }),
    });
  });

  it('opens generated recall cards instead of doing nothing', () => {
    const router = { push: jest.fn() };
    const task = allTasksForDay(day).find((item) => item.kind === 'plan_phrase_recall')!;

    openPersonalPlanTask(router as any, plan, day, task, 'mitap-instance-1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: expect.objectContaining({
        rendererType: 'plan_phrase_recall',
        planId: 'mitap',
        planDayIndex: '1',
        planTaskId: task.id,
        planInstanceId: 'mitap-instance-1',
        lessonId: 'mitap_d001_content_unit',
        contentUnitIds: expect.stringMatching(/^mitap_d001_content_unit_phrase_1,/),
        requiredCorrect: '4',
      }),
    });
  });

  it('provides generated scaffold phrase content for the new modes', async () => {
    const lesson = getPersonalPlanPhraseLesson('mitap_d001_content_unit');

    expect(lesson).toEqual(expect.objectContaining({
      id: 'mitap_d001_content_unit',
      planId: 'mitap',
      afterLessonId: 1,
    }));
    expect(lesson?.phrases).toHaveLength(6);
    expect(lesson?.phrases[0]).toEqual(expect.objectContaining({
      id: 'mitap_d001_content_unit_phrase_1',
      english: expect.any(String),
      russian: expect.any(String),
    }));

    const contentUnitIds = lesson!.phrases.slice(0, 5).map((phrase) => String(phrase.id));
    expect(getPersonalPlanChooseNaturalPhraseItems({
      lessonId: 'mitap_d001_content_unit',
      contentUnitIds,
    })).toHaveLength(5);

    await expect(getPersonalPlanPhraseRecallItems({
      planInstanceId: 'mitap-instance-1',
      lessonId: 'mitap_d001_content_unit',
      contentUnitIds: contentUnitIds.slice(0, 4),
    })).resolves.toHaveLength(4);
  });
});
