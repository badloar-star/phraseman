const progressStorageLocks = new Map<string, Promise<void>>();
const indeterminateProgressStorageKeys = new Set<string>();

/**
 * Serializes every read-modify-write operation for one logical progress key.
 * The lock is keyed by the durable key rather than the JavaScript storage
 * wrapper, so two adapters over the same backend cannot bypass it.
 */
export const withProgressStorageLock = async <T>(
  key: string,
  task: () => Promise<T>,
  timeoutMs: number | null = 15_000,
): Promise<T> => {
  if (indeterminateProgressStorageKeys.has(key)) throw new Error("progress_storage_indeterminate");
  if (timeoutMs !== null && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 60_000)) {
    throw new Error("progress_storage_timeout_invalid");
  }
  const prior = progressStorageLocks.get(key) ?? Promise.resolve();
  let release: (() => void) | undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chain = prior.then(() => current);
  progressStorageLocks.set(key, chain);
  await prior;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (indeterminateProgressStorageKeys.has(key)) throw new Error("progress_storage_indeterminate");
    if (timeoutMs === null) return await task();
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          indeterminateProgressStorageKeys.add(key);
          reject(new Error("progress_storage_indeterminate"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    release?.();
    if (progressStorageLocks.get(key) === chain) progressStorageLocks.delete(key);
  }
};
