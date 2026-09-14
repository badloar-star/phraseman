import { createChargedOperationGuard } from '../app/revenue_quota_energy_guard';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

test.each(['recall', 'speaking'] as const)(
  '%s unmount while quota is pending refunds exactly once and cannot grant afterward',
  async () => {
    const quota = deferred<{ status: 'unavailable' }>();
    const charged = createChargedOperationGuard();
    const refund = jest.fn(async (_operationId: string, _reason: string) => undefined);
    const acknowledge = jest.fn();
    const grant = jest.fn();
    const paywall = jest.fn();
    let cancelled = false;
    charged.charge('energy:test:start');

    const pending = (async () => {
      const result = await quota.promise;
      if (cancelled || result.status !== ('allowed' as string)) {
        const operationId = charged.take();
        if (operationId) await refund(operationId, 'quota_refused');
        if (!cancelled && result.status === ('exhausted' as string)) paywall();
        return;
      }
      const operationId = charged.take();
      if (operationId) acknowledge(operationId);
      grant();
    })();

    cancelled = true;
    const cleanupOperationId = charged.take();
    if (cleanupOperationId) await refund(cleanupOperationId, 'entry_cancelled');
    quota.resolve({ status: 'unavailable' });
    await pending;

    expect(refund).toHaveBeenCalledTimes(1);
    expect(refund).toHaveBeenCalledWith('energy:test:start', 'entry_cancelled');
    expect(acknowledge).not.toHaveBeenCalled();
    expect(grant).not.toHaveBeenCalled();
    expect(paywall).not.toHaveBeenCalled();
  },
);
