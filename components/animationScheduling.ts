export type ScheduledAnimatedStateUpdate = {
  cancel: () => void;
};

export type ScheduledAnimatedStateUpdateRef = {
  current: ScheduledAnimatedStateUpdate[];
};

export function scheduleAnimatedStateUpdate(update: () => void): ScheduledAnimatedStateUpdate {
  let cancelled = false;
  const run = () => {
    if (!cancelled) update();
  };

  if (typeof globalThis.requestAnimationFrame === 'function') {
    const frame = globalThis.requestAnimationFrame(run);
    return {
      cancel: () => {
        cancelled = true;
        globalThis.cancelAnimationFrame?.(frame);
      },
    };
  }

  const timer = setTimeout(run, 0);
  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timer);
    },
  };
}

export function scheduleTrackedAnimatedStateUpdate(
  pendingRef: ScheduledAnimatedStateUpdateRef,
  update: () => void,
): ScheduledAnimatedStateUpdate {
  let scheduled: ScheduledAnimatedStateUpdate | null = null;
  scheduled = scheduleAnimatedStateUpdate(() => {
    if (scheduled) {
      pendingRef.current = pendingRef.current.filter((task) => task !== scheduled);
    }
    update();
  });
  pendingRef.current.push(scheduled);
  return scheduled;
}

export function cancelScheduledAnimatedStateUpdates(
  pendingRef: ScheduledAnimatedStateUpdateRef,
): void {
  pendingRef.current.forEach((task) => task.cancel());
  pendingRef.current = [];
}
