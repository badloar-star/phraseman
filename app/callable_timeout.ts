// Общий клиентский таймаут для httpsCallable-вызовов.
//
// Дефолт RN Firebase — ~70 секунд: на «висящей» сети (Wi-Fi с captive-порталом,
// заблокированный Firebase) кнопки «Отправить репорт», «Подарить», «Промокод»
// крутили спиннер больше минуты. 30 секунд — тот же порог, что уже проверен
// в explain-клиентах (explain_callable_timeout.ts).

const DEFAULT_CALLABLE_TIMEOUT_MS = 30_000;

export class CallableTimeoutError extends Error {
  readonly code = 'callable_timeout';

  constructor(label: string, timeoutMs: number) {
    super(`${label} callable timed out after ${timeoutMs}ms`);
    this.name = 'CallableTimeoutError';
  }
}

export function withCallableTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = DEFAULT_CALLABLE_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      reject(new CallableTimeoutError(label, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// Required by Expo Router — not a screen
export default {};
