import { runAccountDeleteEnqueueWithDeadline } from '../app/account_delete_enqueue';

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
});
