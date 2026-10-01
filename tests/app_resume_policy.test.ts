import {
  createCoalescedAsyncRunner,
  FOREGROUND_INTERACTION_GRACE_MS,
  FOREGROUND_TASK_DEADLINE_MS,
  getForegroundRefreshKind,
  scheduleCoalescedForegroundTask,
  shouldRunDeepForegroundRefresh,
  SHORT_BACKGROUND_CLOUD_REFRESH_MS,
} from '../app/app_resume_policy';

describe('app resume policy', () => {
  it('keeps short background round trips local-only', () => {
    expect(getForegroundRefreshKind(2_000)).toBe('local');
    expect(getForegroundRefreshKind(SHORT_BACKGROUND_CLOUD_REFRESH_MS - 1)).toBe('local');
  });

  it('allows cloud refresh only after a long background round trip', () => {
    expect(getForegroundRefreshKind(SHORT_BACKGROUND_CLOUD_REFRESH_MS)).toBe('cloud');
  });

  it('does not run deep foreground refresh without a real background duration', () => {
    expect(shouldRunDeepForegroundRefresh(null)).toBe(false);
    expect(shouldRunDeepForegroundRefresh(undefined)).toBe(false);
  });

  it('keeps short background round trips out of deep foreground refresh', () => {
    expect(shouldRunDeepForegroundRefresh(2_000)).toBe(false);
    expect(shouldRunDeepForegroundRefresh(SHORT_BACKGROUND_CLOUD_REFRESH_MS - 1)).toBe(false);
    expect(shouldRunDeepForegroundRefresh(SHORT_BACKGROUND_CLOUD_REFRESH_MS)).toBe(true);
  });

  it('coalesces overlapping async resume work into one queued rerun', async () => {
    const calls: string[] = [];
    const gate: { releaseFirstRun: (() => void) | null } = { releaseFirstRun: null };
    const runner = createCoalescedAsyncRunner(async () => {
      calls.push(`run-${calls.length + 1}`);
      if (calls.length === 1) {
        await new Promise<void>((resolve) => {
          gate.releaseFirstRun = resolve;
        });
      }
    });

    const first = runner();
    const second = runner();
    const third = runner();

    expect(calls).toEqual(['run-1']);
    if (!gate.releaseFirstRun) throw new Error('first run was not waiting');
    gate.releaseFirstRun();
    await Promise.all([first, second, third]);

    expect(calls).toEqual(['run-1', 'run-2']);
  });

  it('coalesces foreground tasks by key and spaces different tasks', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    try {
      const calls: string[] = [];
      scheduleCoalescedForegroundTask('same-key', () => { calls.push('old'); }, 0);
      scheduleCoalescedForegroundTask('same-key', () => { calls.push('new'); }, 0);
      scheduleCoalescedForegroundTask('other-key', () => { calls.push('other'); }, 0);

      await jest.advanceTimersByTimeAsync(0);
      expect(calls).toEqual(['new']);

      await jest.advanceTimersByTimeAsync(79);
      expect(calls).toEqual(['new']);

      await jest.advanceTimersByTimeAsync(1);
      expect(calls).toEqual(['new', 'other']);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps foreground housekeeping off the first interactive moment by default', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    try {
      const calls: string[] = [];
      scheduleCoalescedForegroundTask('resume-housekeeping', () => { calls.push('run'); });

      await jest.advanceTimersByTimeAsync(FOREGROUND_INTERACTION_GRACE_MS - 1);
      expect(calls).toEqual([]);

      await jest.advanceTimersByTimeAsync(1);
      expect(calls).toEqual(['run']);
    } finally {
      jest.useRealTimers();
    }
  });

  it('cancels scheduled foreground work before it runs', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    try {
      const calls: string[] = [];
      const handle = scheduleCoalescedForegroundTask('cancel-me', () => { calls.push('cancelled'); }, 500);
      handle.cancel();

      await jest.advanceTimersByTimeAsync(500);
      expect(calls).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  // зачем: PM-215-A1 — зависшая задача не должна держать всю очередь (head-of-line blocking).
  it('moves on after the per-task deadline when a task never settles', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const calls: string[] = [];
      scheduleCoalescedForegroundTask('hung', () => new Promise<void>(() => {}), 0);
      scheduleCoalescedForegroundTask('after-hung', () => { calls.push('after'); }, 0);

      await jest.advanceTimersByTimeAsync(FOREGROUND_TASK_DEADLINE_MS - 1);
      expect(calls).toEqual([]);

      await jest.advanceTimersByTimeAsync(1 + 80);
      expect(calls).toEqual(['after']);
      expect(warn.mock.calls.some(([message]) => String(message).includes('[RUNTIME-QUEUE] дедлайн'))).toBe(true);
    } finally {
      warn.mockRestore();
      jest.useRealTimers();
    }
  });

  // зачем: PM-229/PM-215 — отказ задачи пишет причину и не останавливает очередь.
  it('logs a failing task with its key and keeps draining', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const calls: string[] = [];
      scheduleCoalescedForegroundTask('boom', () => { throw new Error('storage_down'); }, 0);
      scheduleCoalescedForegroundTask('next', () => { calls.push('next'); }, 0);

      await jest.advanceTimersByTimeAsync(0);
      await jest.advanceTimersByTimeAsync(80);
      expect(calls).toEqual(['next']);
      const failure = warn.mock.calls.find(([message]) => String(message).includes('[RUNTIME-QUEUE] задача упала'));
      expect(failure).toBeDefined();
      expect(String(failure?.[1])).toContain('storage_down');
      expect(String(failure?.[1])).toContain('boom');
    } finally {
      warn.mockRestore();
      jest.useRealTimers();
    }
  });
});
