// Cloud Functions currently allow 30 seconds for explanation generation. Keep
// the client watchdog slightly wider so a valid server reply at the deadline is
// not discarded locally as a timeout; truly stalled requests still recover.
const DEFAULT_EXPLAIN_CALLABLE_TIMEOUT_MS = 35000;

/**
 * Базовый таймаут, экспортируемый для расчёта укороченного окна ПОВТОРНОЙ
 * попытки (app/ai_callable_resilience.ts → aiAttemptTimeoutMs).
 * зачем: без укорочения два полных окна подряд складывались бы в ~72 секунды
 * ожидания перед показом ошибки.
 */
export const EXPLAIN_CALLABLE_TIMEOUT_MS = DEFAULT_EXPLAIN_CALLABLE_TIMEOUT_MS;

export class ExplainCallableTimeoutError extends Error {
  readonly code = 'explain_callable_timeout';

  constructor(label: string, timeoutMs: number) {
    super(`${label} callable timed out after ${timeoutMs}ms`);
    this.name = 'ExplainCallableTimeoutError';
  }
}

export function withExplainCallableTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = DEFAULT_EXPLAIN_CALLABLE_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ExplainCallableTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
