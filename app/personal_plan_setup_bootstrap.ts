export const PERSONAL_PLAN_SETUP_BOOTSTRAP_TIMEOUT_MS = 2_500;

/**
 * Bounds device-storage hydration so setup remains reachable when the native
 * storage bridge stalls. The underlying read may still finish later, but its
 * result is intentionally ignored after the fail-open deadline wins.
 */
export async function racePersonalPlanSetupBootstrap<T>(
  work: Promise<T>,
  fallback: T,
  timeoutMs = PERSONAL_PLAN_SETUP_BOOTSTRAP_TIMEOUT_MS,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      work,
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), Math.max(0, timeoutMs));
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

