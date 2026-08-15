import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';
import { commitLearningV2ServerWalletReward } from '../app/learning_v2_owner_repository_runtime';
import {
  __resetLearningV2WalletBalanceMemoryForTests,
  hydrateCurrentLearningV2WalletBalance,
  peekCurrentLearningV2WalletBalance,
  publishLearningV2WalletBalanceState,
} from '../app/learning_v2_wallet_balance_store';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import { deriveProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import { materializeServerWalletRewardReceiptCandidate } from '../modules/learning-v2/progress/server_wallet_reward_receipt';

describe('Learning V2 authoritative wallet balance projection', () => {
  beforeEach(async () => {
    __resetAccountGenerationForTests();
    __resetLearningV2WalletBalanceMemoryForTests();
    await AsyncStorage.clear();
  });

  it('shows the committed Owner Repository balance and rehydrates it without network', async () => {
    const stableUid = 'wallet-display-user';
    const accountGeneration = 3;
    const token = beginAccountGeneration(stableUid);
    const economicAccountScopeHash = deriveLearningV2EconomicAccountScopeHash(stableUid);
    const binding = Object.freeze({
      schemaVersion: 'learning-v2-account-binding.v2' as const,
      stableUid,
      accountGeneration,
      economicAccountScopeHash,
      progressAccountScopeHash: deriveProgressAccountScopeHash(stableUid, accountGeneration),
    });
    const reward = materializeServerWalletRewardReceiptCandidate({
      rewardId: 'required-session:display:1',
      operationId: 'required-session:display:1',
      accountScopeHash: economicAccountScopeHash,
      accountGeneration,
      amountSubunits: 330_000,
      operationReason: 'initial_required_session',
      origin: {
        kind: 'course',
        courseId: 'english-core',
        studyTarget: 'en',
        requiredSessionOrdinal: 1,
      },
    });
    const firstCommit = await commitLearningV2ServerWalletReward({
      schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
      rewardId: reward.receipt.rewardId,
      rewardFingerprint: reward.receipt.rewardFingerprint,
    }, {
      accountToken: token,
      resolveAccountBinding: async () => binding,
      resolveRewardReceipt: async () => reward.encoded,
    });

    expect(peekCurrentLearningV2WalletBalance()).toMatchObject({
      accountScopeHash: economicAccountScopeHash,
      balanceSubunits: 330_000,
      walletRevision: 1,
    });
    const secondReward = materializeServerWalletRewardReceiptCandidate({
      rewardId: 'required-session:display:2',
      operationId: 'required-session:display:2',
      accountScopeHash: economicAccountScopeHash,
      accountGeneration,
      amountSubunits: 20_000,
      operationReason: 'initial_required_session',
      origin: {
        kind: 'course',
        courseId: 'english-core',
        studyTarget: 'en',
        requiredSessionOrdinal: 2,
      },
    });
    await commitLearningV2ServerWalletReward({
      schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
      rewardId: secondReward.receipt.rewardId,
      rewardFingerprint: secondReward.receipt.rewardFingerprint,
    }, {
      accountToken: token,
      resolveAccountBinding: async () => binding,
      resolveRewardReceipt: async () => secondReward.encoded,
    });
    expect(peekCurrentLearningV2WalletBalance()).toMatchObject({
      balanceSubunits: 350_000,
      walletRevision: 2,
    });
    // A slower local read of revision 1 must not visually roll back revision 2.
    expect(publishLearningV2WalletBalanceState(firstCommit.snapshot.walletState, token))
      .toMatchObject({ balanceSubunits: 350_000, walletRevision: 2 });

    __resetLearningV2WalletBalanceMemoryForTests();
    expect(peekCurrentLearningV2WalletBalance()).toBeNull();
    await expect(hydrateCurrentLearningV2WalletBalance()).resolves.toMatchObject({
      balanceSubunits: 350_000,
      walletRevision: 2,
    });
  });

  it('never exposes the previous account balance after an account transition', async () => {
    const stableUid = 'wallet-account-a';
    const token = beginAccountGeneration(stableUid);
    const economicAccountScopeHash = deriveLearningV2EconomicAccountScopeHash(stableUid);
    const binding = Object.freeze({
      schemaVersion: 'learning-v2-account-binding.v2' as const,
      stableUid,
      accountGeneration: 1,
      economicAccountScopeHash,
      progressAccountScopeHash: deriveProgressAccountScopeHash(stableUid, 1),
    });
    const reward = materializeServerWalletRewardReceiptCandidate({
      rewardId: 'required-session:account-a:1',
      operationId: 'required-session:account-a:1',
      accountScopeHash: economicAccountScopeHash,
      accountGeneration: 1,
      amountSubunits: 30_000,
      operationReason: 'initial_required_session',
      origin: {
        kind: 'course',
        courseId: 'english-core',
        studyTarget: 'en',
        requiredSessionOrdinal: 1,
      },
    });
    await commitLearningV2ServerWalletReward({
      schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
      rewardId: reward.receipt.rewardId,
      rewardFingerprint: reward.receipt.rewardFingerprint,
    }, {
      accountToken: token,
      resolveAccountBinding: async () => binding,
      resolveRewardReceipt: async () => reward.encoded,
    });
    expect(peekCurrentLearningV2WalletBalance()?.balanceSubunits).toBe(30_000);

    invalidateAccountGeneration();
    beginAccountGeneration('wallet-account-b');
    expect(peekCurrentLearningV2WalletBalance()).toBeNull();
    await expect(hydrateCurrentLearningV2WalletBalance()).resolves.toBeNull();
  });
});
