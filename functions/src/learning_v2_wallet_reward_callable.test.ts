import { HttpsError } from 'firebase-functions/v2/https';
import { deriveLearningV2EconomicAccountScopeHash } from '../../modules/learning-v2/progress/economic_account_scope';
import { deriveProgressAccountScopeHash } from './learning_v2/progress_event';
import { materializeCoinExchangeWalletReward } from './coin_exchange_wallet_reward';
import {
  createLearningV2AccountBindingHandler,
  createLearningV2WalletRewardResolverHandler,
} from './learning_v2_wallet_reward_callable';

const stableUid = 'stable-user-1';
const accountGeneration = 4;
const accountScopeHash = deriveLearningV2EconomicAccountScopeHash(stableUid);
const reward = materializeCoinExchangeWalletReward({
  accountScopeHash,
  accountGeneration,
  idempotencyKey: 'cx_test_1234',
  starsGranted: 240,
});
const request = {
  data: {
    accountScopeHash,
    rewardId: reward.request.rewardId,
    rewardFingerprint: reward.request.rewardFingerprint,
  },
  auth: { uid: 'firebase-user-1' },
};

const handler = (stored: unknown = reward.protectedReceipt) =>
  createLearningV2WalletRewardResolverHandler({
    resolveAccountBinding: async () => ({ stableUid, accountGeneration }),
    readProtectedReceipt: async () => stored,
  });

describe('resolveLearningV2WalletRewardReceipt', () => {
  it('returns the durable server generation and derived account scope', async () => {
    const resolve = createLearningV2AccountBindingHandler({
      resolveAccountBinding: async () => ({ stableUid, accountGeneration }),
    });
    await expect(resolve({ auth: request.auth })).resolves.toEqual({
      schemaVersion: 'learning-v2-account-binding.v2',
      stableUid,
      accountGeneration,
      economicAccountScopeHash: accountScopeHash,
      progressAccountScopeHash: deriveProgressAccountScopeHash(stableUid, accountGeneration),
    });
    const nextGeneration = createLearningV2AccountBindingHandler({
      resolveAccountBinding: async () => ({ stableUid, accountGeneration: 5 }),
    });
    await expect(nextGeneration({ auth: request.auth })).resolves.toMatchObject({
      accountGeneration: 5,
      economicAccountScopeHash: accountScopeHash,
      progressAccountScopeHash: deriveProgressAccountScopeHash(stableUid, 5),
    });
  });
  it('returns only exact protected bytes to the bound account', async () => {
    await expect(handler()(request)).resolves.toEqual({
      schemaVersion: 'learning-v2-server-wallet-reward-resolution.v1',
      rewardId: reward.request.rewardId,
      rewardFingerprint: reward.request.rewardFingerprint,
      encoded: reward.materialization.encoded,
    });
  });

  it('rejects missing auth, stale scope and missing receipt', async () => {
    await expect(handler()({ ...request, auth: null })).rejects.toBeInstanceOf(HttpsError);
    await expect(handler()({
      ...request,
      data: { ...request.data, accountScopeHash: 'b'.repeat(64) },
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(handler(null)(request)).rejects.toMatchObject({ code: 'not-found' });
  });

  it('fails closed on fingerprint conflict, corrupt bytes and accessors', async () => {
    await expect(handler()({
      ...request,
      data: { ...request.data, rewardFingerprint: 'b'.repeat(64) },
    })).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(handler({
      ...reward.protectedReceipt,
      encoded: `${reward.protectedReceipt.encoded} `,
    })(request)).rejects.toMatchObject({ code: 'data-loss' });
    let getterRuns = 0;
    const hostile = Object.defineProperty({}, 'accountScopeHash', {
      enumerable: true,
      get: () => { getterRuns += 1; return accountScopeHash; },
    });
    await expect(handler()({ data: hostile, auth: request.auth }))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    expect(getterRuns).toBe(0);
  });
});
