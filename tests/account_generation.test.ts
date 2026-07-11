import {
  beginInitialAccountGeneration,
  beginAccountGeneration,
  __resetAccountGenerationForTests,
  captureAccountGeneration,
  invalidateAccountGeneration,
  isCurrentAccountGeneration,
  ensureAccountGeneration,
  waitForRestoreApplicationIdleWithDeadline,
  withRestoreApplicationLock,
} from '../app/account_generation';

describe('account generation', () => {
  beforeEach(() => __resetAccountGenerationForTests());

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

  it('keeps repeated reads of the same stable id in one generation', () => {
    const first = ensureAccountGeneration('stable-a');
    expect(ensureAccountGeneration(' stable-a ')).toEqual(first);
  });

  it('reactivates the same id after an explicit invalidation', () => {
    const first = ensureAccountGeneration('stable-a');
    const invalid = invalidateAccountGeneration();
    const next = ensureAccountGeneration('stable-a');
    expect(next.generation).toBe(invalid.generation + 1);
    expect(isCurrentAccountGeneration(first)).toBe(false);
  });

  it('normalizes blank ids to the active anonymous identity', () => {
    expect(ensureAccountGeneration('   ')).toMatchObject({ stableId: null, phase: 'active' });
  });

});
