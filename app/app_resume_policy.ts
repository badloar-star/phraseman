export const SHORT_BACKGROUND_CLOUD_REFRESH_MS = 5 * 60 * 1000;
export const LONG_BACKGROUND_CLOUD_REFRESH_MS = 30 * 60 * 1000;
/**
 * Reserve the first moment after foregrounding for touch handling and the next
 * frame. Optional housekeeping is queued after this window instead of making
 * the just-restored screen feel frozen.
 */
export const FOREGROUND_INTERACTION_GRACE_MS = 900;
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

export type ScheduledForegroundTaskHandle = {
  cancel: () => void;
};

type ScheduledForegroundTask = {
  key: string;
  readyAt: number;
  run: () => Promise<void> | void;
  cancelled: boolean;
};

const FOREGROUND_TASK_GAP_MS = 80;
const scheduledForegroundTasks = new Map<string, ScheduledForegroundTask>();
let foregroundDrainTimer: ReturnType<typeof setTimeout> | null = null;
let foregroundDrainInFlight = false;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function scheduleForegroundDrain(delayMs: number): void {
  if (foregroundDrainTimer) clearTimeout(foregroundDrainTimer);
  foregroundDrainTimer = setTimeout(() => {
    foregroundDrainTimer = null;
    if (foregroundDrainInFlight) {
      scheduleForegroundDrain(FOREGROUND_TASK_GAP_MS);
      return;
    }
    void drainForegroundTasks();
  }, Math.max(0, delayMs));
}

async function drainForegroundTasks(): Promise<void> {
  if (foregroundDrainInFlight) return;
  foregroundDrainInFlight = true;
  try {
    while (scheduledForegroundTasks.size > 0) {
      const now = Date.now();
      let next: ScheduledForegroundTask | null = null;
      for (const task of scheduledForegroundTasks.values()) {
        if (!next || task.readyAt < next.readyAt) next = task;
      }
      if (!next) return;
      if (next.readyAt > now) {
        scheduleForegroundDrain(next.readyAt - now);
        return;
      }

      scheduledForegroundTasks.delete(next.key);
      if (!next.cancelled) {
        await Promise.resolve(next.run()).catch(() => {});
      }
      if (scheduledForegroundTasks.size > 0) {
        await wait(FOREGROUND_TASK_GAP_MS);
      }
    }
  } finally {
    foregroundDrainInFlight = false;
    if (scheduledForegroundTasks.size > 0 && !foregroundDrainTimer) {
      scheduleForegroundDrain(0);
    }
  }
}

export function scheduleCoalescedForegroundTask(
  key: string,
  run: () => Promise<void> | void,
  delayMs = FOREGROUND_INTERACTION_GRACE_MS,
): ScheduledForegroundTaskHandle {
  const previous = scheduledForegroundTasks.get(key);
  if (previous) previous.cancelled = true;
  const task: ScheduledForegroundTask = {
    key,
    readyAt: Date.now() + Math.max(0, delayMs),
    run,
    cancelled: false,
  };
  scheduledForegroundTasks.set(key, task);
  scheduleForegroundDrain(delayMs);
  return {
    cancel: () => {
      task.cancelled = true;
      if (scheduledForegroundTasks.get(key) === task) {
        scheduledForegroundTasks.delete(key);
      }
    },
  };
}
