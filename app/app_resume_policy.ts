export const SHORT_BACKGROUND_CLOUD_REFRESH_MS = 5 * 60 * 1000;
export const LONG_BACKGROUND_CLOUD_REFRESH_MS = 30 * 60 * 1000;
export const FOREGROUND_LIGHT_REFRESH_DELAY_MS = 900;
export const FOREGROUND_CLOUD_REFRESH_DELAY_MS = 2_500;

export type ForegroundRefreshKind = 'none' | 'local' | 'cloud';

export function getForegroundRefreshKind(backgroundDurationMs: number): ForegroundRefreshKind {
  if (!Number.isFinite(backgroundDurationMs) || backgroundDurationMs <= 0) return 'local';
  if (backgroundDurationMs >= SHORT_BACKGROUND_CLOUD_REFRESH_MS) return 'cloud';
  return 'local';
}

export function shouldRunDeepForegroundRefresh(backgroundDurationMs: number | null | undefined): boolean {
  if (backgroundDurationMs == null) return false;
  return getForegroundRefreshKind(backgroundDurationMs) === 'cloud';
}

export function createCoalescedAsyncRunner(run: () => Promise<void>): () => Promise<void> {
  let inFlight: Promise<void> | null = null;
  let queued = false;

  return () => {
    if (inFlight) {
      queued = true;
      return inFlight;
    }

    inFlight = (async () => {
      try {
        do {
          queued = false;
          await run();
        } while (queued);
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };
}
