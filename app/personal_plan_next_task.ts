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
import {
  planTaskCompletionKey,
  readCompletedPlanTasksStrict,
} from './personal_plan_progress';
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

// Заведомо выше любого реального дневного requirement, но сумма трёх trainer-
// очередей остаётся безопасным целым числом.
const UNKNOWN_MATERIAL_IS_AVAILABLE = 1_000_000;
const sessionCompletedTaskKeys = new Set<string>();

function rememberSessionCompletion(key: string): void {
  // Защита от бесконечного роста в очень долгой сессии. Текущий ключ добавляется
  // после очистки, поэтому антицикл для только что завершённого задания сохраняется.
  if (sessionCompletedTaskKeys.size >= 1024) sessionCompletedTaskKeys.clear();
  sessionCompletedTaskKeys.add(key);
}

function taskHasAvailableMaterial(
  task: PlanDailyTask,
  duePracticeCount: number,
  duePracticeWordCount: number,
  dueTrainerCount: number,
  duePlanTrainerWeakSpotCount: number,
  dueFlashcardsCount: number,
): boolean {
  if (task.destination.type === 'practice') {
    return duePracticeCount >= (task.destination.requiredPhrases ?? 0)
      && duePracticeWordCount >= (task.destination.requiredWords ?? 0);
  }
  if (task.destination.type === 'trainer') {
    if (task.kind === 'trainer_weak_spot' || task.destination.planScoped) {
      return duePlanTrainerWeakSpotCount >= (task.destination.requiredItems ?? 1);
    }
    return dueTrainerCount >= (task.destination.requiredItems ?? 1);
  }
  if (task.destination.type === 'flashcards') {
    return dueFlashcardsCount >= (task.destination.requiredCards ?? 1);
  }
  return true;
}

/**
 * Найти первое незавершённое задание текущего дня плана, исключая только что
 * закрытое (по taskId).
 *
 * Важный fail-safe: ошибка чтения очереди НЕ превращается в ноль. Ноль означал
 * «материала нет» и мог ложно завершить день. При неизвестном количестве мы
 * считаем материал потенциально доступным и открываем следующий экран — уже он
 * покажет собственный retry-state, если источник действительно недоступен.
 */
export async function resolveNextPlanTask(input: {
  completedTaskId: string;
  studyTarget?: RuntimeStudyTarget;
}): Promise<NextPlanTask | null> {
  const state = await readPersonalPlanState();
  if (!state) return null;

  const plan = getPlanById(state.planId);
  const completedKey = planTaskCompletionKey(state.planInstanceId, input.completedTaskId);
  rememberSessionCompletion(completedKey);

  const [completedResult, practiceResult, trainerResult, weakSpotResult, flashcardsResult] = await Promise.allSettled([
    readCompletedPlanTasksStrict(),
    countDueItemsToday(input.studyTarget),
    getTrainerCounts(input.studyTarget),
    resolvePersonalPlanTrainerWeakSpotDueCount({
      planInstanceId: state.planInstanceId,
      mode: 'weak',
      studyTarget: input.studyTarget,
    }),
    resolvePersonalPlanFlashcardsReviewCount(input.studyTarget),
  ]);

  const completedTasks = completedResult.status === 'fulfilled' ? completedResult.value : {};
  const duePracticeCount = practiceResult.status === 'fulfilled'
    ? practiceResult.value
    : UNKNOWN_MATERIAL_IS_AVAILABLE;
  const trainerCounts = trainerResult.status === 'fulfilled'
    ? trainerResult.value
    : {
        words: UNKNOWN_MATERIAL_IS_AVAILABLE,
        phrases: UNKNOWN_MATERIAL_IS_AVAILABLE,
        arena: UNKNOWN_MATERIAL_IS_AVAILABLE,
      };
  const duePlanTrainerWeakSpotCount = weakSpotResult.status === 'fulfilled'
    ? weakSpotResult.value
    : UNKNOWN_MATERIAL_IS_AVAILABLE;
  const dueFlashcardsCount = flashcardsResult.status === 'fulfilled'
    ? flashcardsResult.value
    : UNKNOWN_MATERIAL_IS_AVAILABLE;
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

  const isDone = (task: PlanDailyTask): boolean => {
    const key = planTaskCompletionKey(state.planInstanceId, task.id);
    return Boolean(completedTasks[key]) || sessionCompletedTaskKeys.has(key);
  };

  const visible = visibleTasksForMinutes(
    runtime.visibleDay,
    state.minutesPerDay,
    99,
    { planTrainerWeakSpotAvailable: duePlanTrainerWeakSpotCount > 0 },
  );
  const currentIndex = visible.findIndex((task) => task.id === input.completedTaskId);
  const ordered = currentIndex >= 0
    ? [...visible.slice(currentIndex + 1), ...visible.slice(0, currentIndex)]
    : visible;

  // Если persisted completion-map не прочитался, не оборачиваемся к заданиям,
  // стоявшим ДО текущего: именно такое оборачивание создавало цикл A → B → A.
  const eligibleOrder = completedResult.status === 'rejected' && currentIndex >= 0
    ? visible.slice(currentIndex + 1)
    : ordered;

  const next = eligibleOrder.find((task) => (
    task.id !== input.completedTaskId
    && !isDone(task)
    && taskHasAvailableMaterial(
      task,
      duePracticeCount,
      trainerCounts.words ?? 0,
      dueTrainerCount,
      duePlanTrainerWeakSpotCount,
      dueFlashcardsCount,
    )
  ));
  if (!next) return null;

  return {
    plan,
    day: runtime.visibleDay,
    task: next,
    planInstanceId: state.planInstanceId,
  };
}
