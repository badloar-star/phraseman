/**
 * Компас — прямой маршрут на «повтори вслух» из активного плана. Волна 2.3 (доводка).
 *
 * Задача Компаса kind='pronunciation' соответствует задаче плана
 * `plan_pronunciation_repeat`, которая ЕСТЬ в каждом дне каждого личного плана.
 * Но экран /personal_plan_exercise открывается только с план-параметрами
 * (planId, planInstanceId, planDayIndex, planTaskId, lessonId, contentUnitIds,
 * requiredCorrect), которых нет в самой задаче Компаса. Поэтому здесь мы
 * ДОЧИТЫВАЕМ активный план и собираем тот же переход, что делает прод-навигация
 * плана (см. openPersonalPlanTask, case 'plan_exercise').
 *
 * Возвращает готовый маршрут ИЛИ null, если активного плана нет / в дне нет
 * задачи произношения — тогда вызывающий слой берёт fallback (/personal_plan).
 *
 * Async + чтение AsyncStorage — поэтому вынесено из чистой compass_task_route.
 */
import { readPersonalPlanState } from '../personal_plan_state';
import { getPlanById } from '../personal_plan_catalog';
import type { CompassRoute } from './compass_task_route';

/**
 * Прямой маршрут на произношение текущего дня активного плана, либо null.
 */
export async function resolvePronunciationRoute(): Promise<CompassRoute | null> {
  try {
    const state = await readPersonalPlanState();
    if (!state) return null;

    const plan = getPlanById(state.planId);
    // currentDayIndex 1-based; days — 0-based массив.
    const day = plan.days[state.currentDayIndex - 1];
    if (!day) return null;

    const task = day.tasks.find(
      (tk) => tk.destination.type === 'plan_exercise' && tk.destination.exerciseType === 'plan_pronunciation_repeat',
    );
    if (!task || task.destination.type !== 'plan_exercise') return null;

    const dest = task.destination;
    return {
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_pronunciation_repeat',
        planId: plan.id,
        planInstanceId: state.planInstanceId,
        planTaskId: task.id,
        planDayIndex: String(day.dayIndex),
        lessonId: dest.lessonId,
        contentUnitIds: dest.contentUnitIds.join(','),
        requiredCorrect: String(dest.requiredCorrect),
      },
    };
  } catch {
    return null;
  }
}
