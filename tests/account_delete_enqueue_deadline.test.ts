import * as AccountDeleteEnqueue from '../app/account_delete_enqueue';

const { runAccountDeleteEnqueueWithDeadline } = AccountDeleteEnqueue;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('account deletion enqueue deadline', () => {
  it('bounds App Check warmup and never invokes the callable after the deadline', async () => {
    const warmup = deferred<void>();
    const invoke = jest.fn(async () => 'queued');

    await expect(runAccountDeleteEnqueueWithDeadline(
      () => warmup.promise,
      invoke,
      10,
    )).rejects.toThrow('account_delete_enqueue_timeout');

    warmup.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns the callable acknowledgement when warmup and dispatch fit the deadline', async () => {
    await expect(runAccountDeleteEnqueueWithDeadline(
      async () => undefined,
      async () => 'queued',
      100,
    )).resolves.toBe('queued');
  });

  it('exposes a dispatch barrier separately from the deferred acknowledgement', async () => {
    const start = (AccountDeleteEnqueue as typeof AccountDeleteEnqueue & {
      startAccountDeleteEnqueueWithDeadline?: <T>(
        warmup: () => Promise<unknown>,
        invoke: () => Promise<T>,
        timeoutMs: number,
      ) => { dispatchSettled: Promise<void>; acknowledgment: Promise<T> };
    }).startAccountDeleteEnqueueWithDeadline;
    expect(start).toEqual(expect.any(Function));

    const warmup = deferred<void>();
    const acknowledgement = deferred<string>();
    const invoke = jest.fn(() => acknowledgement.promise);
    const operation = start!(
      () => warmup.promise,
      invoke,
      100,
    );

    let dispatchSettled = false;
    void operation.dispatchSettled.then(() => { dispatchSettled = true; });
    await Promise.resolve();
    expect(dispatchSettled).toBe(false);
    expect(invoke).not.toHaveBeenCalled();

    warmup.resolve();
    await operation.dispatchSettled;
    expect(invoke).toHaveBeenCalledTimes(1);

    let acknowledged = false;
    void operation.acknowledgment.then(() => { acknowledged = true; });
    await Promise.resolve();
    expect(acknowledged).toBe(false);

    acknowledgement.resolve('queued');
    await expect(operation.acknowledgment).resolves.toBe('queued');
  });
});
