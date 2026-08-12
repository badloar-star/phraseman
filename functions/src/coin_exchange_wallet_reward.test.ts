import {
  materializeCoinExchangeWalletReward,
  parseCoinExchangeWalletRewardRequest,
  parseProtectedCoinExchangeWalletRewardReceipt,
} from './coin_exchange_wallet_reward';
import { WALLET_SUBUNITS_PER_STAR } from '../../modules/learning-v2/contracts/wallet';

const input = {
  accountScopeHash: 'a'.repeat(64),
  accountGeneration: 4,
  idempotencyKey: 'cx_test_1234',
  starsGranted: 240,
};

describe('coin exchange protected Learning V2 wallet reward', () => {
  it('materializes one revision-independent protected receipt and client request', () => {
    const value = materializeCoinExchangeWalletReward(input);
    expect(value.materialization.receipt).toMatchObject({
      rewardId: 'cx:cx_test_1234',
      operationId: 'coin-exchange:cx_test_1234',
      accountGeneration: 4,
      amountSubunits: 240 * WALLET_SUBUNITS_PER_STAR,
      operationReason: 'coin_exchange',
      origin: { kind: 'coin_exchange', tradeId: 'cx:cx_test_1234' },
    });
    expect(value.materialization.receipt).not.toHaveProperty('walletRevisionBefore');
    expect(parseCoinExchangeWalletRewardRequest(value.request)).toEqual(value.request);
    expect(parseProtectedCoinExchangeWalletRewardReceipt(value.protectedReceipt)).toEqual(
      value.protectedReceipt,
    );
  });

  it('is deterministic and fails closed on a conflicting protected envelope', () => {
    const first = materializeCoinExchangeWalletReward(input);
    const second = materializeCoinExchangeWalletReward(input);
    expect(second).toEqual(first);
    expect(() => parseProtectedCoinExchangeWalletRewardReceipt({
      ...first.protectedReceipt,
      rewardFingerprint: 'b'.repeat(64),
    })).toThrow('coin_exchange_wallet_reward_indeterminate');
    expect(parseCoinExchangeWalletRewardRequest({
      ...first.request,
      extra: true,
    })).toBeNull();
  });

  it('rejects invalid generation, zero reward and unsafe subunit overflow', () => {
    expect(() => materializeCoinExchangeWalletReward({ ...input, accountGeneration: 0 }))
      .toThrow('coin_exchange_wallet_reward_invalid');
    expect(() => materializeCoinExchangeWalletReward({ ...input, starsGranted: 0 }))
      .toThrow('coin_exchange_wallet_reward_invalid');
    expect(() => materializeCoinExchangeWalletReward({
      ...input,
      starsGranted: 100_000_001,
    })).toThrow('coin_exchange_wallet_reward_invalid');
  });
});
