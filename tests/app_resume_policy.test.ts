import {
  createCoalescedAsyncRunner,
  getForegroundRefreshKind,
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
});

