// Вычисление СЛЕДУЮЩЕГО незавершённого задания дня — чтобы после завершения
// текущего задания сразу открывать следующее (без модала «Задание закрыто» и
// возврата в меню плана). Переиспользует buildTodayPlanRuntime: то же правило
// «какие задания дня видимы», что и на главном экране плана.
//
// Возвращает данные, готовые для openPersonalPlanTask, либо null — если
// следующего задания нет (тогда вызывающий ведёт на экран плана).
import {
  getPlanById,
  visibleTasksForMinutes,
  type PersonalPlanDefinition,
  type PlanDailyTask,
  type PlanDay,
} from './personal_plan_catalog';
import {
  buildTodayPlanRuntime,
  readPersonalPlanState,
} from './personal_plan_state';
import { planTaskCompletionKey, readCompletedPlanTasks } from './personal_plan_progress';
import { resolvePersonalPlanFlashcardsReviewCount } from './personal_plan_flashcards_review_gate';
import type { RuntimeStudyTarget } from './target_storage_keys';
import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { getMistakePracticeReadyCount } from './mistake_practice_insights';

export type NextPlanTask = {
  plan: PersonalPlanDefinition;
  day: PlanDay;
  task: PlanDailyTask;
  planInstanceId: string;
};

function taskHasAvailableMaterial(
  task: PlanDailyTask,
  dueFlashcardsCount: number,
  mistakePracticeReadyCount: number,
): boolean {
  if (task.destination.type === 'flashcards') {
    return dueFlashcardsCount >= (task.destination.requiredCards ?? 1);
  }
  if (task.destination.type === 'mistake_practice') {
    return mistakePracticeReadyCount >= task.destination.length;
  }
  return true;
}

function isMistakeStudyTarget(value: RuntimeStudyTarget | undefined): value is MistakeStudyTarget {
  return value === 'en' || value === 'fr';
}

/**
 * Найти первое незавершённое задание текущего дня плана, исключая только что
 * закрытое (по taskId). Все due-counts читаются из AsyncStorage параллельно —
 * это быстро (без сети). Возвращает null, если активного плана нет или заданий
 * дня больше не осталось.
 */
export async function resolveNextPlanTask(input: {
  completedTaskId: string;
  studyTarget?: RuntimeStudyTarget;
}): Promise<NextPlanTask | null> {
  const state = await readPersonalPlanState();
  if (!state) return null;
  const mistakeStudyTarget = isMistakeStudyTarget(input.studyTarget)
    ? input.studyTarget
    : null;

  const plan = getPlanById(state.planId);
  const [completedTasks, dueFlashcardsCount, mistakePracticeReadyCount] = await Promise.all([
    readCompletedPlanTasks(),
    resolvePersonalPlanFlashcardsReviewCount(input.studyTarget).catch(() => 0),
    mistakeStudyTarget
      ? getMistakePracticeReadyCount(mistakeStudyTarget).catch(() => 0)
      : Promise.resolve(0),
  ]);
  const runtime = buildTodayPlanRuntime({
    plan,
    state,
    completedTasks,
    duePracticeCount: 0,
    duePracticeWordCount: 0,
    dueTrainerCount: 0,
    duePlanTrainerWeakSpotCount: 0,
    dueFlashcardsCount,
  });

  const isDone = (task: PlanDailyTask): boolean =>
    Boolean(completedTasks[planTaskCompletionKey(state.planInstanceId, task.id)]);

  // Первое незавершённое задание дня, кроме только что закрытого (на случай,
  // если completed ещё не успел записаться — не зацикливаемся на том же).
  const candidates = visibleTasksForMinutes(
    runtime.visibleDay,
    state.minutesPerDay,
    99,
    {
      mistakePracticeReadyCount,
    },
  ).filter((task) => taskHasAvailableMaterial(
    task,
    dueFlashcardsCount,
    mistakePracticeReadyCount,
  ));
  const next = candidates.find((task) => task.id !== input.completedTaskId && !isDone(task));
  if (!next) return null;

  return {
    plan,
    day: runtime.visibleDay,
    task: next,
    planInstanceId: state.planInstanceId,
  };
}
