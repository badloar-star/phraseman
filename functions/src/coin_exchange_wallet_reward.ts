import { WALLET_SUBUNITS_PER_STAR } from '../../modules/learning-v2/contracts/wallet';
import {
  materializeServerWalletRewardReceiptCandidate,
  parseServerWalletRewardReceiptRaw,
  type ServerWalletRewardReceiptMaterializationV1,
} from '../../modules/learning-v2/progress/server_wallet_reward_receipt';

export const V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION = 'v2_wallet_reward_receipts';

export interface CoinExchangeWalletRewardRequestV1 {
  readonly schemaVersion: 'learning-v2-server-wallet-reward-request.v1';
  readonly rewardId: string;
  readonly rewardFingerprint: string;
}

export interface ProtectedCoinExchangeWalletRewardReceiptV1 {
  readonly schemaVersion: 'learning-v2-protected-wallet-reward-receipt.v1';
  readonly accountScopeHash: string;
  readonly rewardId: string;
  readonly rewardFingerprint: string;
  readonly encoded: string;
}

export type ProtectedLearningV2WalletRewardReceiptV1 =
  ProtectedCoinExchangeWalletRewardReceiptV1;

const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Reflect.ownKeys(value).length === keys.length && Reflect.ownKeys(value).every(
    (key) => typeof key === 'string' && keys.includes(key),
  );
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const safe = (value: unknown, minimum = 0) =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum;

/**
 * Creates the protected, revision-independent source receipt inside the same
 * server transaction as the coin debit/star credit. It does not touch the
 * local owner repository and cannot authorize itself outside protected storage.
 */
export function materializeCoinExchangeWalletReward(input: {
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly idempotencyKey: string;
  readonly starsGranted: number;
}): Readonly<{
  materialization: ServerWalletRewardReceiptMaterializationV1;
  protectedReceipt: ProtectedCoinExchangeWalletRewardReceiptV1;
  request: CoinExchangeWalletRewardRequestV1;
}> {
  if (!ACCOUNT.test(input.accountScopeHash) || !safe(input.accountGeneration, 1) ||
    !/^[A-Za-z0-9_:-]{8,80}$/.test(input.idempotencyKey) ||
    !safe(input.starsGranted, 1)) throw new Error('coin_exchange_wallet_reward_invalid');
  const amountSubunits = input.starsGranted * WALLET_SUBUNITS_PER_STAR;
  if (!Number.isSafeInteger(amountSubunits) || amountSubunits > 1_000_000_000_000) {
    throw new Error('coin_exchange_wallet_reward_invalid');
  }
  const rewardId = `cx:${input.idempotencyKey}`;
  const materialization = materializeServerWalletRewardReceiptCandidate({
    rewardId,
    operationId: `coin-exchange:${input.idempotencyKey}`,
    accountScopeHash: input.accountScopeHash,
    accountGeneration: input.accountGeneration,
    amountSubunits,
    operationReason: 'coin_exchange',
    origin: { kind: 'coin_exchange', tradeId: rewardId },
  });
  const request = Object.freeze({
    schemaVersion: 'learning-v2-server-wallet-reward-request.v1' as const,
    rewardId,
    rewardFingerprint: materialization.receipt.rewardFingerprint,
  });
  const protectedReceipt = materializeProtectedLearningV2WalletRewardReceipt(
    materialization,
  );
  return Object.freeze({ materialization, protectedReceipt, request });
}

export function materializeProtectedLearningV2WalletRewardReceipt(
  materialization: ServerWalletRewardReceiptMaterializationV1,
): ProtectedLearningV2WalletRewardReceiptV1 {
  const parsed = parseServerWalletRewardReceiptRaw(materialization.encoded);
  if (parsed.receipt.recordFingerprint !==
    materialization.receipt.recordFingerprint) {
    throw new Error('learning_v2_wallet_reward_indeterminate');
  }
  return Object.freeze({
    schemaVersion: 'learning-v2-protected-wallet-reward-receipt.v1' as const,
    accountScopeHash: parsed.receipt.accountScopeHash,
    rewardId: parsed.receipt.rewardId,
    rewardFingerprint: parsed.receipt.rewardFingerprint,
    encoded: materialization.encoded,
  });
}

export function parseCoinExchangeWalletRewardRequest(
  input: unknown,
): CoinExchangeWalletRewardRequestV1 | null {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
    !exactKeys(input, ['schemaVersion', 'rewardId', 'rewardFingerprint']) ||
    input.schemaVersion !== 'learning-v2-server-wallet-reward-request.v1' ||
    typeof input.rewardId !== 'string' || !ID.test(input.rewardId) ||
    typeof input.rewardFingerprint !== 'string' || !HASH.test(input.rewardFingerprint)) {
    return null;
  }
  return Object.freeze({
    schemaVersion: input.schemaVersion,
    rewardId: input.rewardId,
    rewardFingerprint: input.rewardFingerprint,
  });
}

export function parseProtectedCoinExchangeWalletRewardReceipt(
  input: unknown,
): ProtectedCoinExchangeWalletRewardReceiptV1 {
  const parsed = parseProtectedLearningV2WalletRewardReceipt(input);
  const receipt = parseServerWalletRewardReceiptRaw(parsed.encoded).receipt;
  if (receipt.operationReason !== 'coin_exchange') {
    throw new Error('coin_exchange_wallet_reward_indeterminate');
  }
  return parsed;
}

export function parseProtectedLearningV2WalletRewardReceipt(
  input: unknown,
): ProtectedLearningV2WalletRewardReceiptV1 {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype ||
    !exactKeys(input, ['schemaVersion', 'accountScopeHash', 'rewardId', 'rewardFingerprint', 'encoded']) ||
    input.schemaVersion !== 'learning-v2-protected-wallet-reward-receipt.v1' ||
    typeof input.accountScopeHash !== 'string' || !ACCOUNT.test(input.accountScopeHash) ||
    typeof input.rewardId !== 'string' || !ID.test(input.rewardId) ||
    typeof input.rewardFingerprint !== 'string' || !HASH.test(input.rewardFingerprint) ||
    typeof input.encoded !== 'string') throw new Error('learning_v2_wallet_reward_indeterminate');
  let parsed;
  try { parsed = parseServerWalletRewardReceiptRaw(input.encoded); }
  catch { throw new Error('learning_v2_wallet_reward_indeterminate'); }
  if (parsed.receipt.accountScopeHash !== input.accountScopeHash ||
    parsed.receipt.rewardId !== input.rewardId ||
    parsed.receipt.rewardFingerprint !== input.rewardFingerprint) {
    throw new Error('learning_v2_wallet_reward_indeterminate');
  }
  return Object.freeze({
    schemaVersion: input.schemaVersion,
    accountScopeHash: input.accountScopeHash,
    rewardId: input.rewardId,
    rewardFingerprint: input.rewardFingerprint,
    encoded: input.encoded,
  });
}
