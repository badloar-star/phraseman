import {
  createPhoneStateDurabilityRecovery,
  phoneStateRecoveryCopyRu,
} from '../app/phone_state_recovery';

describe('PhoneState local durability recovery', () => {
  test('cleans reproducible caches, retries once, then exposes automatic recovery', async () => {
    const cleanup = jest.fn(async () => undefined);
    const commit = jest.fn<Promise<void>, []>(async () => { throw new Error('disk_full'); });
    const recovery = createPhoneStateDurabilityRecovery({ cleanupReproducibleCaches: cleanup });

    await expect(recovery.commit(commit)).resolves.toBe(false);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(2);
    expect(recovery.getSnapshot()).toMatchObject({ visible: true, automaticRetry: true });

    commit.mockResolvedValueOnce(undefined);
    await expect(recovery.retryPending()).resolves.toBe(true);
    expect(recovery.getSnapshot().visible).toBe(false);
  });

  test('recovery copy never claims internet, cloud, or completed saving', () => {
    expect(phoneStateRecoveryCopyRu).toBe('Освобождаем место и восстанавливаем сохранение…');
    expect(phoneStateRecoveryCopyRu).not.toMatch(/интернет|облако|сохранено/i);
  });
});
