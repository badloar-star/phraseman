import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import {
  readProgressAccountBinding,
  normalizeProgressAuthUid,
  type ProgressAccountBinding,
} from './learning_v2/progress_event_callable';
import {
  deriveLearningV2EconomicAccountScopeHash,
} from '../../modules/learning-v2/progress/economic_account_scope';
import { hashCanonicalBody } from '../../modules/learning-v2/policies/decision_registry';
import { WALLET_SUBUNITS_PER_STAR } from '../../modules/learning-v2/contracts/wallet';
import {
  materializeServerWalletRewardReceiptCandidate,
  materializeServerWalletRewardRequest,
  parseServerWalletRewardReceiptRaw,
} from '../../modules/learning-v2/progress/server_wallet_reward_receipt';
import {
  V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION,
  materializeProtectedLearningV2WalletRewardReceipt,
  parseProtectedLearningV2WalletRewardReceipt,
} from './coin_exchange_wallet_reward';

export interface MistakeCorrectionRewardClaimV1 {
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly studyTarget: 'en' | 'fr';
  readonly rewardVersion: 1;
}

const CLAIM_KEYS = ['mistakeId', 'cycleId', 'studyTarget', 'rewardVersion'] as const;
const MISTAKE_ID = /^mistake:v1:[a-f0-9]{64}$/;
const CYCLE_ID = /^mistake-cycle:v1:[a-f0-9]{64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseMistakeCorrectionRewardClaim(
  input: unknown,
): MistakeCorrectionRewardClaimV1 {
  if (
    !isRecord(input)
    || Object.getPrototypeOf(input) !== Object.prototype
    || Reflect.ownKeys(input).length !== CLAIM_KEYS.length
    || Reflect.ownKeys(input).some((key) =>
      typeof key !== 'string' || !CLAIM_KEYS.includes(key as typeof CLAIM_KEYS[number]))
    || typeof input.mistakeId !== 'string'
    || !MISTAKE_ID.test(input.mistakeId)
    || typeof input.cycleId !== 'string'
    || !CYCLE_ID.test(input.cycleId)
    || (input.studyTarget !== 'en' && input.studyTarget !== 'fr')
    || input.rewardVersion !== 1
  ) {
    throw new Error('mistake_correction_reward_invalid');
  }
  return Object.freeze({
    mistakeId: input.mistakeId,
    cycleId: input.cycleId,
    studyTarget: input.studyTarget,
    rewardVersion: 1,
  });
}

const rewardHash = (claim: MistakeCorrectionRewardClaimV1): string =>
  hashCanonicalBody({
    schemaVersion: 'mistake-correction-wallet-reward.v1',
    mistakeId: claim.mistakeId,
    cycleId: claim.cycleId,
    studyTarget: claim.studyTarget,
    rewardVersion: claim.rewardVersion,
  });

export function materializeMistakeCorrectionWalletReward(
  input: MistakeCorrectionRewardClaimV1 & {
    readonly accountScopeHash: string;
    readonly accountGeneration: number;
  },
) {
  const claim = parseMistakeCorrectionRewardClaim({
    mistakeId: input.mistakeId,
    cycleId: input.cycleId,
    studyTarget: input.studyTarget,
    rewardVersion: input.rewardVersion,
  });
  const identity = rewardHash(claim);
  const rewardId = `mistake-correction:${identity}`;
  const materialization = materializeServerWalletRewardReceiptCandidate({
    rewardId,
    operationId: rewardId,
    accountScopeHash: input.accountScopeHash,
    accountGeneration: input.accountGeneration,
    amountSubunits: WALLET_SUBUNITS_PER_STAR,
    operationReason: 'repeat_session',
    origin: {
      kind: 'course',
      courseId: 'mistake-practice',
      studyTarget: claim.studyTarget,
      requiredSessionOrdinal: 1,
    },
  });
  return Object.freeze({
    materialization,
    protectedReceipt: materializeProtectedLearningV2WalletRewardReceipt(materialization),
    request: materializeServerWalletRewardRequest(materialization),
  });
}

type FirestoreLike = Pick<admin.firestore.Firestore, 'collection' | 'runTransaction'>;

export interface MistakeCorrectionRewardDependencies {
  readonly db?: FirestoreLike;
  readonly resolveAccountBinding?: (authUid: string) => Promise<ProgressAccountBinding>;
}

export function createMistakeCorrectionRewardHandler(
  dependencies: MistakeCorrectionRewardDependencies = {},
) {
  const db = dependencies.db ?? admin.firestore();
  const resolveBinding = dependencies.resolveAccountBinding
    ?? ((authUid: string) => readProgressAccountBinding(db as admin.firestore.Firestore, authUid));
  return async (request: { readonly data: unknown; readonly auth?: { readonly uid?: unknown } | null }) => {
    const authUid = normalizeProgressAuthUid(request.auth?.uid);
    let claim: MistakeCorrectionRewardClaimV1;
    try {
      claim = parseMistakeCorrectionRewardClaim(request.data);
    } catch {
      throw new HttpsError('invalid-argument', 'mistake_correction_reward_invalid');
    }
    const binding = await resolveBinding(authUid);
    const accountScopeHash = deriveLearningV2EconomicAccountScopeHash(binding.stableUid);
    const candidate = materializeMistakeCorrectionWalletReward({
      ...claim,
      accountScopeHash,
      accountGeneration: binding.accountGeneration,
    });
    const receiptRef = db.collection('users').doc(binding.stableUid)
      .collection(V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION)
      .doc(candidate.request.rewardId);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(receiptRef);
      if (snapshot.exists) {
        let stored;
        try {
          stored = parseProtectedLearningV2WalletRewardReceipt(snapshot.data());
          const receipt = parseServerWalletRewardReceiptRaw(stored.encoded).receipt;
          if (
            stored.accountScopeHash !== accountScopeHash
            || receipt.rewardId !== candidate.request.rewardId
            || receipt.operationId !== candidate.materialization.receipt.operationId
            || receipt.amountSubunits !== WALLET_SUBUNITS_PER_STAR
            || receipt.operationReason !== 'repeat_session'
            || receipt.origin.kind !== 'course'
            || receipt.origin.courseId !== 'mistake-practice'
            || receipt.origin.studyTarget !== claim.studyTarget
            || receipt.origin.requiredSessionOrdinal !== 1
          ) {
            throw new Error('mistake_correction_reward_conflict');
          }
        } catch {
          throw new HttpsError('data-loss', 'mistake_correction_reward_conflict');
        }
        return Object.freeze({
          schemaVersion: 'mistake-correction-wallet-reward-resolution.v1' as const,
          request: Object.freeze({
            schemaVersion: 'learning-v2-server-wallet-reward-request.v1' as const,
            rewardId: stored.rewardId,
            rewardFingerprint: stored.rewardFingerprint,
          }),
        });
      }
      // Personal mistake progress is client-authoritative and is not persisted as
      // server-verifiable evidence. A caller-controlled tuple is therefore never
      // sufficient authority to mint a protected server wallet receipt. Existing
      // receipts remain replayable for compatibility; new grants fail closed until
      // correction + grant can be committed as one immutable composite operation.
      throw new HttpsError('failed-precondition', 'mistake_correction_evidence_unavailable');
    });
  };
}

export const grantMistakeCorrectionReward = onCall(
  HOT_CALLABLE_OPTIONS,
  async (request) => createMistakeCorrectionRewardHandler()(request),
);
