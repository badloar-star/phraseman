export async function runAccountDeleteEnqueueWithDeadline<T>(
  warmup: () => Promise<unknown>,
  invoke: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const operation = (async () => {
    await warmup();
    if (expired) throw new Error('account_delete_enqueue_timeout');
    return invoke();
  })();

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new Error('account_delete_enqueue_timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
