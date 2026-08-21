import {
  createMistakeCorrectionRewardHandler,
  materializeMistakeCorrectionWalletReward,
  parseMistakeCorrectionRewardClaim,
} from './mistake_practice_wallet_reward';
import {
  materializeServerWalletRewardReceiptCandidate,
} from '../../modules/learning-v2/progress/server_wallet_reward_receipt';
import { materializeProtectedLearningV2WalletRewardReceipt } from './coin_exchange_wallet_reward';
import { WALLET_SUBUNITS_PER_STAR } from '../../modules/learning-v2/contracts/wallet';

describe('mistake correction wallet reward', () => {
  const claim = {
    mistakeId: `mistake:v1:${'a'.repeat(64)}`,
    cycleId: `mistake-cycle:v1:${'b'.repeat(64)}`,
    studyTarget: 'en' as const,
    rewardVersion: 1 as const,
  };

  test('accepts only the exact bounded claim', () => {
    expect(parseMistakeCorrectionRewardClaim(claim)).toEqual(claim);
    expect(() => parseMistakeCorrectionRewardClaim({ ...claim, stars: 999 }))
      .toThrow('mistake_correction_reward_invalid');
  });

  test('server fixes amount at one star and produces a replay-stable receipt', () => {
    const first = materializeMistakeCorrectionWalletReward({
      ...claim,
      accountScopeHash: 'a'.repeat(64),
      accountGeneration: 3,
    });
    const replay = materializeMistakeCorrectionWalletReward({
      ...claim,
      accountScopeHash: 'a'.repeat(64),
      accountGeneration: 3,
    });

    expect(first).toEqual(replay);
    expect(first.materialization.receipt.amountSubunits).toBe(10_000);
    expect(first.materialization.receipt.operationReason).toBe('repeat_session');
    expect(first.request.rewardId).toMatch(/^mistake-correction:[a-f0-9]{64}$/);
  });

  const binding = { stableUid: 'stable-user', accountGeneration: 3 };

  const handlerFixture = (stored?: unknown, getFailure?: Error) => {
    const create = jest.fn();
    const get = jest.fn(async () => {
      if (getFailure) throw getFailure;
      return { exists: stored !== undefined, data: () => stored };
    });
    const db = {
      collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({}) }) }) }),
      runTransaction: async (work: (transaction: { get: typeof get; create: typeof create }) => Promise<unknown>) =>
        work({ get, create }),
    };
    return {
      create,
      handler: createMistakeCorrectionRewardHandler({
        db: db as never,
        resolveAccountBinding: async () => binding,
      }),
    };
  };

  test('rejects a syntactically valid but unproven correction claim without minting', async () => {
    const fixture = handlerFixture();
    await expect(fixture.handler({ data: claim, auth: { uid: 'firebase-user' } }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(fixture.create).not.toHaveBeenCalled();
  });

  test('replays an already-issued receipt only for the same bound account', async () => {
    const existing = materializeMistakeCorrectionWalletReward({
      ...claim,
      accountScopeHash: require('../../modules/learning-v2/progress/economic_account_scope')
        .deriveLearningV2EconomicAccountScopeHash(binding.stableUid),
      accountGeneration: binding.accountGeneration,
    });
    const fixture = handlerFixture(existing.protectedReceipt);
    await expect(fixture.handler({ data: claim, auth: { uid: 'firebase-user' } }))
      .resolves.toEqual(expect.objectContaining({ request: existing.request }));
    expect(fixture.create).not.toHaveBeenCalled();
  });

  test('rejects a receipt belonging to another account and propagates storage failure', async () => {
    const foreign = materializeMistakeCorrectionWalletReward({
      ...claim,
      accountScopeHash: 'f'.repeat(64),
      accountGeneration: binding.accountGeneration,
    });
    await expect(handlerFixture(foreign.protectedReceipt).handler({ data: claim, auth: { uid: 'firebase-user' } }))
      .rejects.toMatchObject({ code: 'data-loss' });
    await expect(handlerFixture(undefined, new Error('storage_down')).handler({ data: claim, auth: { uid: 'firebase-user' } }))
      .rejects.toThrow('storage_down');
  });

  test.each([
    ['wrong amount', WALLET_SUBUNITS_PER_STAR * 2, 1],
    ['wrong ordinal', WALLET_SUBUNITS_PER_STAR, 2],
  ] as const)('rejects replay-only historical receipt with %s', async (_label, amountSubunits, requiredSessionOrdinal) => {
    const existing = materializeMistakeCorrectionWalletReward({
      ...claim,
      accountScopeHash: require('../../modules/learning-v2/progress/economic_account_scope')
        .deriveLearningV2EconomicAccountScopeHash(binding.stableUid),
      accountGeneration: binding.accountGeneration,
    });
    const hostile = materializeServerWalletRewardReceiptCandidate({
      rewardId: existing.request.rewardId,
      operationId: existing.materialization.receipt.operationId,
      accountScopeHash: existing.materialization.receipt.accountScopeHash,
      accountGeneration: binding.accountGeneration + 7,
      amountSubunits,
      operationReason: 'repeat_session',
      origin: {
        kind: 'course', courseId: 'mistake-practice', studyTarget: claim.studyTarget,
        requiredSessionOrdinal,
      },
    });
    const protectedReceipt = materializeProtectedLearningV2WalletRewardReceipt(hostile);

    await expect(handlerFixture(protectedReceipt).handler({ data: claim, auth: { uid: 'firebase-user' } }))
      .rejects.toMatchObject({ code: 'data-loss' });
  });
});
