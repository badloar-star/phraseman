// зачем (владелец 01.10 «без экрана недоступно — тихий повтор»; координатор 12.10): старт свободного разговора при сбое
// повторяется тихо, как у сценарного диалога (app/dialogue_v2_session.tsx: 5 повторов через 4 с), и только после этого
// показывается панель ошибки с «Повторить».

export const FREEFORM_START_SILENT_RETRIES = 5;
export const FREEFORM_START_RETRY_DELAY_MS = 4_000;

export type FreeformStartRetryPlan =
  | Readonly<{ kind: 'retry'; nextAttempt: number; delayMs: number }>
  | Readonly<{ kind: 'give_up' }>;

/** failedAttempt — номер провалившейся попытки (0 — первый старт). */
export function planFreeformStartRetry(
  failedAttempt: number,
  delayMs: number = FREEFORM_START_RETRY_DELAY_MS,
): FreeformStartRetryPlan {
  if (!Number.isInteger(failedAttempt) || failedAttempt < 0 || failedAttempt >= FREEFORM_START_SILENT_RETRIES) {
    return Object.freeze({ kind: 'give_up' as const });
  }
  return Object.freeze({ kind: 'retry' as const, nextAttempt: failedAttempt + 1, delayMs });
}
