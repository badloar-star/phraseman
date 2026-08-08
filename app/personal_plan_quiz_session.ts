import type { PersonalPlanTaskProgress } from './personal_plan_task_progress';

export type PersonalPlanQuizProgressStorage = { read(instanceId: string, taskId: string): Promise<PersonalPlanTaskProgress | null>; save(instanceId: string, taskId: string, progress: Pick<PersonalPlanTaskProgress, 'index' | 'correctIds' | 'attemptSequence'>): Promise<void> };
export type PersonalPlanQuizCompletionInput = { markCompleted(): Promise<void>; award(): Promise<void>; clearProgress(): Promise<void>; resolveNext(): Promise<unknown | null>; navigateNext(next: unknown): void; navigateHome(): void };

export const validatePersonalPlanQuizRoute = (input: { routePlanId: string; routeInstanceId: string; activePlanId?: string | null; activeInstanceId?: string | null }) => Boolean(input.routePlanId) && input.routePlanId === input.activePlanId && Boolean(input.routeInstanceId) && input.routeInstanceId === input.activeInstanceId;
export const loadPersonalPlanQuizProgress = (storage: PersonalPlanQuizProgressStorage, instanceId: string, taskId: string) => storage.read(instanceId, taskId);
export const savePersonalPlanQuizProgress = (storage: PersonalPlanQuizProgressStorage, instanceId: string, taskId: string, index: number, correctIds: string[], attemptSequence = 0) => storage.save(instanceId, taskId, { index, correctIds, attemptSequence });

export async function completePersonalPlanQuiz(input: PersonalPlanQuizCompletionInput): Promise<boolean> {
  try { await input.markCompleted(); } catch { return false; }
  await Promise.allSettled([input.award(), input.clearProgress()]);
  const next = await input.resolveNext().catch(() => null);
  if (next) input.navigateNext(next); else input.navigateHome();
  return true;
}

/** Screen-used gate: collapse concurrent final-Continue presses and permit retry after a failed write. */
export function createPersonalPlanQuizCompletionGate() {
  let inFlight: Promise<boolean> | null = null;
  let completed = false;
  return {
    complete(input: PersonalPlanQuizCompletionInput): Promise<boolean> {
      if (completed) return Promise.resolve(true);
      if (inFlight) return inFlight;
      inFlight = completePersonalPlanQuiz(input).then((ok) => {
        completed = ok;
        return ok;
      }).finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
