import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { detachBoundedWalletJson } from '../../modules/learning-v2/contracts/wallet';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  deriveLearningV2EconomicAccountScopeHash,
} from '../../modules/learning-v2/progress/economic_account_scope';
import { deriveProgressAccountScopeHash } from './learning_v2/progress_event';
import {
  normalizeProgressAuthUid,
  readProgressAccountBinding,
  type ProgressAccountBinding,
} from './learning_v2/progress_event_callable';
import {
  V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION,
  parseProtectedLearningV2WalletRewardReceipt,
} from './coin_exchange_wallet_reward';

const REQUEST_KEYS = ['accountScopeHash', 'rewardId', 'rewardFingerprint'] as const;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Reflect.ownKeys(value).length === keys.length && Reflect.ownKeys(value).every(
    (key) => typeof key === 'string' && keys.includes(key),
  );

export interface LearningV2WalletRewardResolverDependencies {
  readonly db?: admin.firestore.Firestore;
  readonly resolveAccountBinding?: (
    authUid: string,
  ) => Promise<ProgressAccountBinding>;
  readonly readProtectedReceipt?: (
    stableUid: string,
    rewardId: string,
  ) => Promise<unknown>;
}

export interface LearningV2WalletRewardResolverRequest {
  readonly data: unknown;
  readonly auth?: { readonly uid?: unknown } | null;
}

export function createLearningV2AccountBindingHandler(
  dependencies: Pick<LearningV2WalletRewardResolverDependencies, 'db' | 'resolveAccountBinding'> = {},
) {
  const resolveBinding = dependencies.resolveAccountBinding ??
    ((authUid: string) => readProgressAccountBinding(
      dependencies.db ?? admin.firestore(),
      authUid,
    ));
  return async (request: Pick<LearningV2WalletRewardResolverRequest, 'auth'>) => {
    const authUid = normalizeProgressAuthUid(request.auth?.uid);
    const binding = await resolveBinding(authUid);
    return Object.freeze({
      schemaVersion: 'learning-v2-account-binding.v2' as const,
      stableUid: binding.stableUid,
      accountGeneration: binding.accountGeneration,
      economicAccountScopeHash: deriveLearningV2EconomicAccountScopeHash(binding.stableUid),
      progressAccountScopeHash: deriveProgressAccountScopeHash(
        binding.stableUid,
        binding.accountGeneration,
      ),
    });
  };
}

/**
 * Authenticated read of exact protected source bytes. It never accepts amount,
 * reason, origin, generation or wallet revision from the caller.
 */
export function createLearningV2WalletRewardResolverHandler(
  dependencies: LearningV2WalletRewardResolverDependencies = {},
) {
  const resolveBinding = dependencies.resolveAccountBinding ??
    ((authUid: string) => readProgressAccountBinding(
      dependencies.db ?? admin.firestore(),
      authUid,
    ));
  const readReceipt = dependencies.readProtectedReceipt ?? (async (
    stableUid: string,
    rewardId: string,
  ) => {
    const db = dependencies.db ?? admin.firestore();
    const snapshot = await db.collection('users').doc(stableUid)
      .collection(V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION).doc(rewardId).get();
    return snapshot.exists ? snapshot.data() : null;
  });
  return async (request: LearningV2WalletRewardResolverRequest) => {
    const authUid = normalizeProgressAuthUid(request.auth?.uid);
    let detached: unknown;
    try {
      detached = detachBoundedWalletJson(
        request.data,
        'wallet_reward_request_invalid',
      );
    } catch {
      throw new HttpsError('invalid-argument', 'wallet_reward_request_invalid');
    }
    if (!isRecord(detached) || !exactKeys(detached, REQUEST_KEYS) ||
      typeof detached.accountScopeHash !== 'string' ||
      !ACCOUNT.test(detached.accountScopeHash) ||
      typeof detached.rewardId !== 'string' || !ID.test(detached.rewardId) ||
      typeof detached.rewardFingerprint !== 'string' ||
      !HASH.test(detached.rewardFingerprint)) {
      throw new HttpsError('invalid-argument', 'wallet_reward_request_invalid');
    }
    const binding = await resolveBinding(authUid);
    const expectedScopeHash = deriveLearningV2EconomicAccountScopeHash(
      binding.stableUid,
    );
    if (detached.accountScopeHash !== expectedScopeHash) {
      throw new HttpsError('failed-precondition', 'account_generation_mismatch');
    }
    const stored = await readReceipt(binding.stableUid, detached.rewardId);
    if (stored === null || stored === undefined) {
      throw new HttpsError('not-found', 'wallet_reward_receipt_missing');
    }
    let receipt;
    try { receipt = parseProtectedLearningV2WalletRewardReceipt(stored); }
    catch { throw new HttpsError('data-loss', 'wallet_reward_receipt_indeterminate'); }
    if (receipt.accountScopeHash !== expectedScopeHash ||
      receipt.rewardId !== detached.rewardId ||
      receipt.rewardFingerprint !== detached.rewardFingerprint) {
      throw new HttpsError('failed-precondition', 'wallet_reward_receipt_conflict');
    }
    return Object.freeze({
      schemaVersion: 'learning-v2-server-wallet-reward-resolution.v1' as const,
      rewardId: receipt.rewardId,
      rewardFingerprint: receipt.rewardFingerprint,
      encoded: receipt.encoded,
    });
  };
}

export const resolveLearningV2WalletRewardReceipt = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request) => createLearningV2WalletRewardResolverHandler()(request),
);

export const getLearningV2AccountBinding = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request) => createLearningV2AccountBindingHandler()(request),
);
