const DEFAULT_EXPLAIN_CALLABLE_TIMEOUT_MS = 30000;

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
