import {
  beginInitialAccountGeneration,
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  waitForRestoreApplicationIdleWithDeadline,
  withRestoreApplicationLock,
} from '../app/account_generation';

describe('account generation', () => {
  it('adopts the initial anonymous boot generation exactly once', () => {
    const token = beginInitialAccountGeneration('resolved-anon-uid');
    expect(token).not.toBeNull();
    expect(isCurrentAccountGeneration(token!, 'resolved-anon-uid')).toBe(true);
  });

  it('invalidates work from the previous account', () => {
    const first = beginAccountGeneration('stable-a');
    const token = captureAccountGeneration();
    expect(isCurrentAccountGeneration(token)).toBe(true);

    beginAccountGeneration('stable-b');
    expect(isCurrentAccountGeneration(token)).toBe(false);
    expect(first.generation).toBeLessThan(captureAccountGeneration().generation);
  });

  it('invalidates in-flight work on sign-out/delete even without a replacement account', () => {
    beginAccountGeneration('stable-a');
    const token = captureAccountGeneration();
    invalidateAccountGeneration();
    expect(isCurrentAccountGeneration(token)).toBe(false);
    expect(captureAccountGeneration().stableId).toBeNull();
  });

  it('rejects a token when the expected stable id does not match', () => {
    beginAccountGeneration('stable-a');
    const token = captureAccountGeneration();
    expect(isCurrentAccountGeneration(token, 'stable-b')).toBe(false);
    expect(isCurrentAccountGeneration(token, 'stable-a')).toBe(true);
  });

  it('bounds transition waiting when a local mutation lock never settles', async () => {
    jest.useFakeTimers();
    let release!: () => void;
    void withRestoreApplicationLock(() => new Promise<void>((resolve) => { release = resolve; }));
    await Promise.resolve();

    const waiting = waitForRestoreApplicationIdleWithDeadline(250);
    await jest.advanceTimersByTimeAsync(250);
    await expect(waiting).resolves.toBe(false);

    release();
    await Promise.resolve();
    jest.useRealTimers();
  });

});
