import {
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';
import {
  commitLearningV2CoinExchangeReward,
  commitLearningV2ServerWalletReward,
  commitMistakeCorrectionWalletComposite,
  createLearningV2OwnerRepositoryAsyncStorage,
  parseLearningV2AccountBinding,
} from '../app/learning_v2_owner_repository_runtime';
import { materializeServerWalletRewardReceiptCandidate } from '../modules/learning-v2/progress/server_wallet_reward_receipt';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import { deriveProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';

const binding = {
  schemaVersion: 'learning-v2-account-binding.v2' as const,
  stableUid: 'stable-user-1',
  accountGeneration: 4,
  economicAccountScopeHash: deriveLearningV2EconomicAccountScopeHash('stable-user-1'),
  progressAccountScopeHash: deriveProgressAccountScopeHash('stable-user-1', 4),
};

const memoryStorage = () => {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) { values.set(key, value); },
    async removeItem(key: string) { values.delete(key); },
  };
};

describe('Learning V2 app Owner Repository runtime', () => {
  it('strictly parses durable binding and rolls back a stale root CAS', async () => {
    expect(parseLearningV2AccountBinding(binding)).toEqual(binding);
    let getterRuns = 0;
    const hostile = Object.defineProperty({}, 'stableUid', {
      enumerable: true,
      get: () => { getterRuns += 1; return binding.stableUid; },
    });
    expect(() => parseLearningV2AccountBinding(hostile))
      .toThrow('learning_v2_account_binding_invalid');
    expect(getterRuns).toBe(0);
    expect(() => parseLearningV2AccountBinding({
      ...binding,
      progressAccountScopeHash: 'f'.repeat(64),
    })).toThrow('learning_v2_account_binding_invalid');
    const token = beginAccountGeneration(binding.stableUid);
    const memory = memoryStorage();
    let invalidateOnSet = true;
    const storage = createLearningV2OwnerRepositoryAsyncStorage(binding, token, {
      ...memory,
      async setItem(key, value) {
        memory.values.set(key, value);
        if (invalidateOnSet) {
          invalidateOnSet = false;
          invalidateAccountGeneration();
        }
      },
    });
    await expect(storage.compareAndSet(
      'root',
      null,
      'next',
      { accountScopeHash: binding.economicAccountScopeHash, generation: 4 },
    )).resolves.toBe('stale_generation');
    expect(memory.values.has('root')).toBe(false);
  });

  it('mounts the current account and commits/replays one protected exchange reward', async () => {
    const token = beginAccountGeneration(binding.stableUid);
    const memory = memoryStorage();
    const reward = materializeServerWalletRewardReceiptCandidate({
      rewardId: 'cx:cx_test_1234',
      operationId: 'coin-exchange:cx_test_1234',
      accountScopeHash: binding.economicAccountScopeHash,
      accountGeneration: binding.accountGeneration,
      amountSubunits: 2_400_000,
      operationReason: 'coin_exchange',
      origin: { kind: 'coin_exchange', tradeId: 'cx:cx_test_1234' },
    });
    const dependencies = {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding, token, memory),
      accountToken: token,
      resolveAccountBinding: async () => binding,
      resolveRewardReceipt: async () => reward.encoded,
    };
    const request = {
      schemaVersion: 'learning-v2-server-wallet-reward-request.v1' as const,
      rewardId: reward.receipt.rewardId,
      rewardFingerprint: reward.receipt.rewardFingerprint,
    };
    const applied = await commitLearningV2CoinExchangeReward(request, dependencies);
    expect(applied.status).toBe('applied');
    expect(applied.appliedReceipt.amountSubunits).toBe(2_400_000);
    const writesBeforeReplay = memory.values.size;
    const replayed = await commitLearningV2CoinExchangeReward(request, dependencies);
    expect(replayed.status).toBe('replayed');
    expect(memory.values.size).toBe(writesBeforeReplay);
  });

  it('atomically commits one client-authoritative mistake correction star and replays after crash', async () => {
    const token = beginAccountGeneration(binding.stableUid);
    const memory = memoryStorage();
    const dependencies = {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding, token, memory),
      accountToken: token,
      resolveAccountBinding: async () => binding,
    };
    const compositeBase = {
      schemaVersion: 'mistake-correction-wallet-composite.v1' as const,
      accountScopeHash: binding.economicAccountScopeHash,
      mistakeId: `mistake:v1:${'b'.repeat(64)}`,
      cycleId: `mistake-cycle:v1:${'c'.repeat(64)}`,
      studyTarget: 'en' as const,
      correctionEventId: `mistake-practice:v1:${'d'.repeat(64)}`,
      correctionEventFingerprint: 'e'.repeat(64),
      rewardVersion: 1 as const,
    };
    const composite = {
      ...compositeBase,
      rewardKey: `mistake-correction:v1:${sha256Utf8(canonicalJsonV1({
        mistakeId: compositeBase.mistakeId,
        cycleId: compositeBase.cycleId,
        studyTarget: compositeBase.studyTarget,
        rewardVersion: 1,
      }))}`,
    };
    const applied = await commitMistakeCorrectionWalletComposite(composite, dependencies);
    expect(applied.status).toBe('applied');
    expect(applied.appliedReceipt).toMatchObject({
      amountSubunits: 10_000,
      authorizedOperation: { authority: 'client_authoritative_composite' },
    });
    const writesBeforeCrashRetry = memory.values.size;
    const replay = await commitMistakeCorrectionWalletComposite(composite, dependencies);
    expect(replay.status).toBe('replayed');
    expect(replay.appliedReceipt).toEqual(applied.appliedReceipt);
    expect(memory.values.size).toBe(writesBeforeCrashRetry);
  });

  it('rejects an immutable correction composite captured for another mounted owner', async () => {
    const token = beginAccountGeneration(binding.stableUid);
    const memory = memoryStorage();
    const base = {
      schemaVersion: 'mistake-correction-wallet-composite.v1' as const,
      accountScopeHash: 'f'.repeat(64),
      mistakeId: `mistake:v1:${'b'.repeat(64)}`,
      cycleId: `mistake-cycle:v1:${'c'.repeat(64)}`,
      studyTarget: 'en' as const,
      correctionEventId: `mistake-practice:v1:${'d'.repeat(64)}`,
      correctionEventFingerprint: 'e'.repeat(64),
      rewardVersion: 1 as const,
    };
    await expect(commitMistakeCorrectionWalletComposite({
      ...base,
      rewardKey: `mistake-correction:v1:${sha256Utf8(canonicalJsonV1({
        mistakeId: base.mistakeId,
        cycleId: base.cycleId,
        studyTarget: base.studyTarget,
        rewardVersion: 1,
      }))}`,
    }, {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding, token, memory),
      accountToken: token,
      resolveAccountBinding: async () => binding,
    })).rejects.toThrow('mistake_correction_wallet_composite_owner_mismatch');
    expect([...memory.values.values()].join('\n')).not.toContain(base.mistakeId);
  });

  it('settles a historical protected correction grant without adding a second star', async () => {
    const token = beginAccountGeneration(binding.stableUid);
    const memory = memoryStorage();
    const mistakeId = `mistake:v1:${'b'.repeat(64)}`;
    const cycleId = `mistake-cycle:v1:${'c'.repeat(64)}`;
    const studyTarget = 'en' as const;
    const legacyId = `mistake-correction:${hashCanonicalBody({
      schemaVersion: 'mistake-correction-wallet-reward.v1',
      mistakeId, cycleId, studyTarget, rewardVersion: 1,
    })}`;
    const legacy = materializeServerWalletRewardReceiptCandidate({
      rewardId: legacyId,
      operationId: legacyId,
      accountScopeHash: binding.economicAccountScopeHash,
      accountGeneration: binding.accountGeneration,
      amountSubunits: 10_000,
      operationReason: 'repeat_session',
      origin: { kind: 'course', courseId: 'mistake-practice', studyTarget, requiredSessionOrdinal: 1 },
    });
    const dependencies = {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding, token, memory),
      accountToken: token,
      resolveAccountBinding: async () => binding,
      resolveRewardReceipt: async () => legacy.encoded,
    };
    const first = await commitLearningV2ServerWalletReward({
      schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
      rewardId: legacy.receipt.rewardId,
      rewardFingerprint: legacy.receipt.rewardFingerprint,
    }, dependencies);
    const compositeBase = {
      schemaVersion: 'mistake-correction-wallet-composite.v1' as const,
      accountScopeHash: binding.economicAccountScopeHash,
      mistakeId, cycleId, studyTarget,
      correctionEventId: `mistake-practice:v1:${'d'.repeat(64)}`,
      correctionEventFingerprint: 'e'.repeat(64), rewardVersion: 1 as const,
    };
    const replay = await commitMistakeCorrectionWalletComposite({
      ...compositeBase,
      rewardKey: `mistake-correction:v1:${sha256Utf8(canonicalJsonV1({
        mistakeId, cycleId, studyTarget, rewardVersion: 1,
      }))}`,
    }, dependencies);
    expect(first.snapshot.walletState.balanceSubunits).toBe(10_000);
    expect(replay.status).toBe('replayed');
    expect(replay.snapshot.walletState.balanceSubunits).toBe(10_000);
  });

  it('keeps one account-global wallet across a server generation rollover', async () => {
    const memory = memoryStorage();
    const token4 = beginAccountGeneration(binding.stableUid);
    const first = materializeServerWalletRewardReceiptCandidate({
      rewardId: 'cx:rollover-first',
      operationId: 'coin-exchange:rollover-first',
      accountScopeHash: binding.economicAccountScopeHash,
      accountGeneration: 4,
      amountSubunits: 100_000,
      operationReason: 'coin_exchange',
      origin: { kind: 'coin_exchange', tradeId: 'cx:rollover-first' },
    });
    const requestFor = (reward: typeof first) => ({
      schemaVersion: 'learning-v2-server-wallet-reward-request.v1' as const,
      rewardId: reward.receipt.rewardId,
      rewardFingerprint: reward.receipt.rewardFingerprint,
    });
    await commitLearningV2CoinExchangeReward(requestFor(first), {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding, token4, memory),
      accountToken: token4,
      resolveAccountBinding: async () => binding,
      resolveRewardReceipt: async () => first.encoded,
    });

    invalidateAccountGeneration();
    const token5 = beginAccountGeneration(binding.stableUid);
    const binding5 = {
      ...binding,
      accountGeneration: 5,
      progressAccountScopeHash: deriveProgressAccountScopeHash(binding.stableUid, 5),
    };
    const second = materializeServerWalletRewardReceiptCandidate({
      rewardId: 'cx:rollover-second',
      operationId: 'coin-exchange:rollover-second',
      accountScopeHash: binding.economicAccountScopeHash,
      // The protected entitlement was confirmed before the owner-generation
      // rollover and must remain redeemable afterward.
      accountGeneration: 4,
      amountSubunits: 200_000,
      operationReason: 'coin_exchange',
      origin: { kind: 'coin_exchange', tradeId: 'cx:rollover-second' },
    });
    const applied = await commitLearningV2CoinExchangeReward(requestFor(second), {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding5, token5, memory),
      accountToken: token5,
      resolveAccountBinding: async () => binding5,
      resolveRewardReceipt: async () => second.encoded,
    });
    expect(applied.status).toBe('applied');
    expect(applied.snapshot.root.currentGeneration).toBe(5);
    expect(applied.snapshot.walletState.balanceSubunits).toBe(300_000);
    expect(applied.snapshot.walletState.revision).toBe(2);

    const writesBeforeOldReplay = memory.values.size;
    const replayedFirst = await commitLearningV2CoinExchangeReward(requestFor(first), {
      storage: createLearningV2OwnerRepositoryAsyncStorage(binding5, token5, memory),
      accountToken: token5,
      resolveAccountBinding: async () => binding5,
      resolveRewardReceipt: async () => first.encoded,
    });
    expect(replayedFirst.status).toBe('replayed');
    expect(replayedFirst.appliedReceipt.amountSubunits).toBe(100_000);
    expect(memory.values.size).toBe(writesBeforeOldReplay);
  });
});
