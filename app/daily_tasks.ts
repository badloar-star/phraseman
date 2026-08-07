// Runtime eligibility facade for daily tasks.
// The original implementation lives in daily_tasks_core.ts so we can keep all
// existing task/progress/reward behavior intact while applying user-specific
// availability checks at the public boundary.

import { countDueItemsToday } from './active_recall';
import {
  getTodayTasksSafe as getTodayTasksSafeCore,
  loadTodayProgress as loadTodayProgressCore,
  rerollTodayDailyTaskSet as rerollTodayDailyTaskSetCore,
  type DailyTask,
  type TaskProgress,
} from './daily_tasks_core';
import type { RuntimeStudyTarget } from './target_storage_keys';

export * from './daily_tasks_core';

const RECALL_TASK_TYPES: ReadonlySet<DailyTask['type']> = new Set([
  'recall_session',
  'recall_answers',
  'recall_perfect',
]);

const RECALL_PERFECT_MIN_CARDS = 5;

/**
 * Number of cards that must still be available right now for a recall task to
 * remain achievable. Completed/claimed tasks are never removed.
 */
const recallCardsStillRequired = (task: DailyTask, progress?: TaskProgress): number => {
  if (progress?.completed || progress?.claimed) return 0;

  switch (task.type) {
    case 'recall_session':
      return 1;
    case 'recall_perfect':
      return RECALL_PERFECT_MIN_CARDS;
    case 'recall_answers':
      return Math.max(0, task.target - Math.max(0, progress?.current ?? 0));
    default:
      return 0;
  }
};

const filterRuntimeImpossibleRecallTasks = async (
  tasks: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask[]> => {
  if (!tasks.some((task) => RECALL_TASK_TYPES.has(task.type))) return tasks;

  const [dueCount, progress] = await Promise.all([
    countDueItemsToday(studyTarget),
    loadTodayProgressCore(tasks, studyTarget),
  ]);
  const progressById = new Map(progress.map((row) => [row.taskId, row]));

  return tasks.filter((task) => {
    if (!RECALL_TASK_TYPES.has(task.type)) return true;
    const row = progressById.get(task.id);
    if (row?.completed || row?.claimed) return true;
    return dueCount >= recallCardsStillRequired(task, row);
  });
};

/**
 * Public safe task list: in addition to the core level/premium/word/trainer
 * checks, never expose a recall objective that cannot be completed with the
 * cards currently available to the user.
 */
export const getTodayTasksSafe = async (
  studyTarget?: RuntimeStudyTarget,
): Promise<DailyTask[]> => {
  const tasks = await getTodayTasksSafeCore(studyTarget);
  return filterRuntimeImpossibleRecallTasks(tasks, studyTarget);
};

/** Keep progress reconciliation aligned with the exact task list shown in UI. */
export const loadTodayProgress = async (
  tasksForReconcile?: DailyTask[],
  studyTarget?: RuntimeStudyTarget,
): Promise<TaskProgress[]> => {
  const tasks = tasksForReconcile ?? (await getTodayTasksSafe(studyTarget));
  return loadTodayProgressCore(tasks, studyTarget);
};

/**
 * A full-set reroll can select a recall task in the core lottery. Re-resolve
 * through the same runtime eligibility gate before returning it to the UI.
 */
export const rerollTodayDailyTaskSet = async (studyTarget?: RuntimeStudyTarget) => {
  const result = await rerollTodayDailyTaskSetCore(studyTarget);
  if (!result.ok) return result;
  return { ...result, tasks: await getTodayTasksSafe(studyTarget) };
};
