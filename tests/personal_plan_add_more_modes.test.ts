import {
  nextTaskAfterVisibleSlice,
  PERSONAL_PLAN_CATALOG,
  visibleTasksForMinutes,
} from '../app/personal_plan_catalog';

describe('personal plan add-more modes', () => {
  const voyazh = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === 'voyazh')!;
  const day8 = voyazh.days[7];

  it('offers previous-day phrase recall from the add-more queue', () => {
    const next = nextTaskAfterVisibleSlice(day8, 20, 0);

    expect(next?.kind).toBe('plan_phrase_recall');
    expect(next?.destination).toEqual(expect.objectContaining({
      type: 'plan_phrase_recall',
      lessonId: 'voyazh_d007_content_unit',
      recallScope: 'previous_day',
      sourceDayIndex: 7,
    }));
  });

  it('reveals plan-scoped mistakes only when this plan has weak-spot material', () => {
    expect(nextTaskAfterVisibleSlice(day8, 20, 1)?.kind).not.toBe('trainer_weak_spot');

    const mistakeTask = nextTaskAfterVisibleSlice(day8, 20, 1, {
      planTrainerWeakSpotAvailable: true,
    });

    expect(mistakeTask).toEqual(expect.objectContaining({
      id: 'voyazh_d008_plan_mistakes',
      kind: 'trainer_weak_spot',
      title: 'Разобрать ошибки маршрута',
      destination: expect.objectContaining({
        type: 'trainer',
        mode: 'weak',
        planScoped: true,
        requiredItems: 1,
      }),
    }));

    expect(visibleTasksForMinutes(day8, 20, 2, {
      planTrainerWeakSpotAvailable: true,
    }).map((task) => task.id)).toContain('voyazh_d008_plan_mistakes');
  });
});
