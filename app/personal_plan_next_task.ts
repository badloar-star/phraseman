// Вычисление СЛЕДУЮЩЕГО незавершённого задания дня — чтобы после завершения
// текущего задания сразу открывать следующее (без модала «Задание закрыто» и
// возврата в меню плана). Переиспользует buildTodayPlanRuntime: то же правило
// «какие задания дня видимы», что и на главном экране плана.
//
// Возвращает данные, готовые для openPersonalPlanTask, либо null — если
// следующего задания нет (тогда вызывающий ведёт на экран плана).
import {
  getPlanById,
  type PersonalPlanDefinition,
  type PlanDailyTask,
  type PlanDay,
} from './personal_plan_catalog';
import {
  buildTodayPlanRuntime,
  readPersonalPlanState,
} from './personal_plan_state';
import { planTaskCompletionKey, readCompletedPlanTasks } from './personal_plan_progress';
import { countDueItemsToday } from './active_recall';
import { getTrainerCounts } from './trainer_store';
import { resolvePersonalPlanTrainerWeakSpotDueCount } from './personal_plan_trainer_weak_spot_gate';
import { resolvePersonalPlanFlashcardsReviewCount } from './personal_plan_flashcards_review_gate';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type NextPlanTask = {
  plan: PersonalPlanDefinition;
  day: PlanDay;
  task: PlanDailyTask;
  planInstanceId: string;
};

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

  const plan = getPlanById(state.planId);
  const [completedTasks, duePracticeCount, trainerCounts, duePlanTrainerWeakSpotCount, dueFlashcardsCount] = await Promise.all([
    readCompletedPlanTasks(),
    countDueItemsToday(input.studyTarget).catch(() => 0),
    getTrainerCounts(input.studyTarget).catch(() => ({ words: 0, phrases: 0, arena: 0 } as Record<string, number>)),
    resolvePersonalPlanTrainerWeakSpotDueCount({ planInstanceId: state.planInstanceId, mode: 'weak', studyTarget: input.studyTarget }).catch(() => 0),
    resolvePersonalPlanFlashcardsReviewCount(input.studyTarget).catch(() => 0),
  ]);
  const dueTrainerCount = (trainerCounts.words ?? 0) + (trainerCounts.phrases ?? 0) + (trainerCounts.arena ?? 0);

  const runtime = buildTodayPlanRuntime({
    plan,
    state,
    completedTasks,
    duePracticeCount,
    duePracticeWordCount: trainerCounts.words ?? 0,
    dueTrainerCount,
    duePlanTrainerWeakSpotCount,
    dueFlashcardsCount,
  });

  const isDone = (task: PlanDailyTask): boolean =>
    Boolean(completedTasks[planTaskCompletionKey(state.planInstanceId, task.id)]);

  // Первое незавершённое задание дня, кроме только что закрытого (на случай,
  // если completed ещё не успел записаться — не зацикливаемся на том же).
  const next = runtime.tasks.find((task) => task.id !== input.completedTaskId && !isDone(task));
  if (!next) return null;

  return {
    plan,
    day: runtime.visibleDay,
    task: next,
    planInstanceId: state.planInstanceId,
  };
}
