import {
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';
import {
  exchangeCoinsForStarsDurably,
  resumePendingCoinExchangeWalletRewards,
} from '../app/coin_exchange_wallet_outbox';

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    values,
    async getAllKeys() { return [...values.keys()]; },
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) { values.set(key, value); },
    async removeItem(key: string) { values.delete(key); },
  };
};
const result = {
  starsGranted: 240,
  rateUsed: 80,
  walletRewardRequest: {
    schemaVersion: 'learning-v2-server-wallet-reward-request.v1' as const,
    rewardId: 'cx:cx_test_1234',
    rewardFingerprint: 'a'.repeat(64),
  },
};

describe('coin exchange wallet outbox', () => {
  it('persists intent before exchange and resumes exact reward after a commit failure', async () => {
    const token = beginAccountGeneration('stable-user-1');
    const storage = memoryStorage();
    const exchange = jest.fn(async () => result);
    const commit = jest.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    await expect(exchangeCoinsForStarsDurably(3, {
      storage, accountToken: token, exchange, commitReward: commit,
      createIdempotencyKey: () => 'cx_test_1234',
    })).resolves.toEqual(result);
    expect(storage.values.size).toBe(1);
    await expect(resumePendingCoinExchangeWalletRewards({
      storage, accountToken: token, exchange, commitReward: commit,
    })).resolves.toBe(1);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(2);
    expect(storage.values.size).toBe(0);
  });

  it('retries a lost exchange response with the same idempotency key', async () => {
    const token = beginAccountGeneration('stable-user-2');
    const storage = memoryStorage();
    const exchange = jest.fn()
      .mockRejectedValueOnce(new Error('lost_response'))
      .mockResolvedValueOnce(result);
    const commit = jest.fn(async () => undefined);
    await expect(exchangeCoinsForStarsDurably(3, {
      storage, accountToken: token, exchange, commitReward: commit,
      createIdempotencyKey: () => 'cx_test_1234',
    })).rejects.toThrow('lost_response');
    await expect(resumePendingCoinExchangeWalletRewards({
      storage, accountToken: token, exchange, commitReward: commit,
    })).resolves.toBe(1);
    expect(exchange.mock.calls.map((call) => call[1])).toEqual([
      'cx_test_1234', 'cx_test_1234',
    ]);
  });

  it('does not let a stale account finish or delete the old entry', async () => {
    const token = beginAccountGeneration('stable-user-3');
    const storage = memoryStorage();
    await expect(exchangeCoinsForStarsDurably(3, {
      storage,
      accountToken: token,
      createIdempotencyKey: () => 'cx_test_1234',
      exchange: async () => {
        invalidateAccountGeneration();
        return result;
      },
      commitReward: async () => undefined,
    })).rejects.toThrow('coin_exchange_outbox_account_stale');
    expect(storage.values.size).toBe(1);
  });
});
