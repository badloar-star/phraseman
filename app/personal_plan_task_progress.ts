// Resume-прогресс ВНУТРИ задания плана: на каком вопросе остановились и какие
// уже отвечены верно. Пишется пошагово (после каждого верного ответа), чтобы
// выход посреди задания не сбрасывал прогресс. По завершении задания запись
// очищается (его дальше отмечает markPersonalPlanTaskCompleted в
// personal_plan_progress.ts — отдельный ключ «задание закрыто»).
//
// Восстанавливаем на НАЧАЛО текущего вопроса: сам незавершённый вопрос
// проходится заново (это безопасно), уже верные не переспрашиваются.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { planTaskCompletionKey } from './personal_plan_progress';

export const PLAN_TASK_PROGRESS_KEY = 'personal_plan_task_progress_v1';

export type PersonalPlanTaskProgress = {
  /** Индекс текущего (незавершённого) вопроса, на который вернёмся при входе. */
  index: number;
  /** id вопросов, уже отвеченных верно (чтобы не переспрашивать). */
  correctIds: string[];
  updatedAt: string;
};

type ProgressMap = Record<string, PersonalPlanTaskProgress>;

async function readAll(): Promise<ProgressMap> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_TASK_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAll(map: ProgressMap): Promise<void> {
  await AsyncStorage.setItem(PLAN_TASK_PROGRESS_KEY, JSON.stringify(map));
}

/** Прочитать сохранённую позицию задания (null — если задание ещё не начато). */
export async function readPlanTaskProgress(
  planInstanceId: string | null | undefined,
  taskId: string,
): Promise<PersonalPlanTaskProgress | null> {
  if (!taskId) return null;
  const map = await readAll();
  const entry = map[planTaskCompletionKey(planInstanceId, taskId)];
  if (!entry || typeof entry.index !== 'number') return null;
  return {
    index: Math.max(0, Math.floor(entry.index)),
    correctIds: Array.isArray(entry.correctIds) ? entry.correctIds.filter((id): id is string => typeof id === 'string') : [],
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '',
  };
}

/** Сохранить позицию задания (пошагово, после верного ответа). */
export async function savePlanTaskProgress(
  planInstanceId: string | null | undefined,
  taskId: string,
  progress: Pick<PersonalPlanTaskProgress, 'index' | 'correctIds'>,
): Promise<void> {
  if (!taskId) return;
  const map = await readAll();
  map[planTaskCompletionKey(planInstanceId, taskId)] = {
    index: Math.max(0, Math.floor(progress.index)),
    correctIds: [...new Set(progress.correctIds)],
    updatedAt: new Date().toISOString(),
  };
  await writeAll(map);
}

/** Очистить позицию задания (по завершении — resume больше не нужен). */
export async function clearPlanTaskProgress(
  planInstanceId: string | null | undefined,
  taskId: string,
): Promise<void> {
  if (!taskId) return;
  const map = await readAll();
  const key = planTaskCompletionKey(planInstanceId, taskId);
  if (key in map) {
    delete map[key];
    await writeAll(map);
  }
}
