export type AccountDeleteEnqueueOperation<T> = {
  dispatchSettled: Promise<void>;
  acknowledgment: Promise<T>;
};

export function startAccountDeleteEnqueueWithDeadline<T>(
  warmup: () => Promise<unknown>,
  invoke: () => Promise<T>,
  timeoutMs: number,
): AccountDeleteEnqueueOperation<T> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let markDispatchSettled!: () => void;
  const dispatchSettled = new Promise<void>((resolve) => { markDispatchSettled = resolve; });

  const operation = (async () => {
    try {
      await warmup();
      if (expired) throw new Error('account_delete_enqueue_timeout');
      const acknowledgment = invoke();
      markDispatchSettled();
      return await acknowledgment;
    } catch (error) {
      markDispatchSettled();
      throw error;
    }
  })();

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      expired = true;
      markDispatchSettled();
      reject(new Error('account_delete_enqueue_timeout'));
    }, timeoutMs);
  });

  const acknowledgment = Promise.race([operation, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
  return { dispatchSettled, acknowledgment };
}

export async function runAccountDeleteEnqueueWithDeadline<T>(
  warmup: () => Promise<unknown>,
  invoke: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return startAccountDeleteEnqueueWithDeadline(warmup, invoke, timeoutMs).acknowledgment;
}
