export type LearningV2LocalCompletionRetryInputV1 = Readonly<{
  commit: () => Promise<void>;
  wait?: (delayMs: number) => Promise<void>;
  retryDelaysMs?: readonly number[];
  onAttemptFailure?: (error: unknown, attempt: number) => void;
}>;

const DEFAULT_RETRY_DELAYS_MS = Object.freeze([
  250, 1_000, 5_000, 15_000, 30_000,
]);

const waitWithTimer = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

/**
 * Retries a device-owned completion commit without ever involving UI state.
 * Returning false is diagnostic only: the caller must never show a blocking
 * save screen or roll back the already completed session.
 */
export async function retryLearningV2LocalCompletionV1(
  input: LearningV2LocalCompletionRetryInputV1,
): Promise<boolean> {
  const wait = input.wait ?? waitWithTimer;
  const delays = input.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      await input.commit();
      return true;
    } catch (error: unknown) {
      input.onAttemptFailure?.(error, attempt + 1);
      if (attempt === delays.length) return false;
      const delayMs = delays[attempt];
      if (delayMs === undefined) return false;
      await wait(delayMs);
    }
  }
  return false;
}
