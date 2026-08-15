import {
  evaluateAccessBoostEligibility,
  type AccessBoostPolicy,
} from '../../modules/learning-v2/contracts/access_boost';
import {
  validateAccessQuoteForPurchase,
  type V2AccessPurchaseRequest,
  type V2AccessQuote,
} from '../../modules/learning-v2/contracts/access_quote';
import type { Firestore, Transaction, UpdateData } from 'firebase-admin/firestore';

export interface V2AccessGateRecord {
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly seasonId: string;
  readonly gateId: string;
  readonly releaseId: string;
  readonly policyVersion: string;
  readonly requiredLoopsComplete: boolean;
  readonly capabilityFallbackComplete: boolean;
  readonly localPerformanceComplete: boolean;
  readonly checkpointComplete: boolean;
  readonly honestBlockCount: number;
  readonly recoveryReviewImpressionCount: number;
  readonly earnedDeficit: number;
  readonly purchasedForGate: number;
  readonly purchasedForChapter: number;
  readonly purchasedForSeason: number;
  readonly unlocked: boolean;
  readonly decisionRegistryRef?: { readonly id: string; readonly version: number; readonly contentHash: string };
}

export interface V2AccessAccountRecord {
  readonly stableId: string;
  readonly accountGeneration: number;
}

export interface V2AccessPurchaseReceipt {
  readonly opId: string;
  readonly stableId: string;
  readonly seasonId: string;
  readonly gateId: string;
  readonly accessStarsApplied: number;
  readonly shardsSpent: number;
  readonly basis: 'earned_plus_boost';
}

export interface V2AccessOperationRecord {
  readonly operationId: string;
  readonly fingerprint: string;
  readonly receipt: V2AccessPurchaseReceipt;
}

export interface V2AccessPurchaseTransaction {
  get<T>(key: string): Promise<{ readonly exists: boolean; readonly data?: T }>;
  create(key: string, value: unknown): void;
  update(key: string, value: unknown): void;
}

export interface V2AccessPurchaseRepository {
  runTransaction<T>(fn: (transaction: V2AccessPurchaseTransaction) => Promise<T>): Promise<T>;
  /** Server-side deterministic race seam; never populated from callable input. */
  readonly testHooks?: Readonly<{
    readonly afterBindingReads?: () => void | Promise<void>;
  }>;
}

export const firestoreV2AccessPath = (key: string): string => {
  const safeSegment = (value: string): boolean => /^[A-Za-z0-9._-]{1,160}$/.test(value) && value !== '.' && value !== '..';
  if (key.startsWith('auth_links:')) {
    const authUid = key.slice('auth_links:'.length);
    if (!authUid || authUid.length > 128 || authUid.includes('/')) throw new Error('access_firestore_key_invalid');
    return `auth_links/${authUid}`;
  }
  if (key.startsWith('account_deletion_tombstones:')) {
    const stableId = key.slice('account_deletion_tombstones:'.length);
    if (!safeSegment(stableId)) throw new Error('access_firestore_key_invalid');
    return `account_deletion_tombstones/${stableId}`;
  }
  if (key.startsWith('learning-v2:access-operation:')) {
    const parts = key.slice('learning-v2:access-operation:'.length).split(':');
    if (parts.length !== 2 || parts.some((part) => !safeSegment(part))) throw new Error('access_firestore_key_invalid');
    return `users/${parts[0]}/v2_access_operations/${parts[1]}`;
  }
  if (key.startsWith('learning-v2:access-quote:')) {
    const parts = key.slice('learning-v2:access-quote:'.length).split(':');
    if (parts.length !== 2 || parts.some((part) => !safeSegment(part))) throw new Error('access_firestore_key_invalid');
    return `users/${parts[0]}/v2_access_quotes/${parts[1]}`;
  }
  if (key.startsWith('learning-v2:access-gate:')) {
    const parts = key.slice('learning-v2:access-gate:'.length).split(':');
    if (parts.length !== 3 || parts.some((part) => !safeSegment(part))) throw new Error('access_firestore_key_invalid');
    return `users/${parts[0]}/v2_gate_receipts/${parts[1]}__${parts[2]}`;
  }
  if (key.startsWith('learning-v2:access-receipt:')) {
    const parts = key.slice('learning-v2:access-receipt:'.length).split(':');
    if (parts.length !== 2 || parts.some((part) => !safeSegment(part))) throw new Error('access_firestore_key_invalid');
    return `users/${parts[0]}/v2_access_ledger/${parts[1]}`;
  }
  if (key.startsWith('users:')) {
    const userId = key.slice('users:'.length);
    if (!safeSegment(userId)) throw new Error('access_firestore_key_invalid');
    return `users/${userId}`;
  }
  throw new Error('access_firestore_key_invalid');
};

export interface FinalizeV2AccessPurchaseInput {
  readonly operationId: string;
  readonly fingerprint: string;
  /** Firebase Auth UID used only to re-read the canonical anchor at commit time. */
  readonly authUid: string;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly request: V2AccessPurchaseRequest;
  readonly nowMs: number;
  readonly decisionRegistryRef?: { readonly id: string; readonly version: number; readonly contentHash: string };
}

const operationKey = (stableId: string, operationId: string): string =>
  `learning-v2:access-operation:${stableId}:${operationId}`;
const authLinkKey = (authUid: string): string => `auth_links:${authUid}`;
const tombstoneKey = (stableId: string): string =>
  `account_deletion_tombstones:${stableId}`;
const quoteKey = (stableId: string, quoteId: string): string =>
  `learning-v2:access-quote:${stableId}:${quoteId}`;
const gateKey = (stableId: string, seasonId: string, gateId: string): string =>
  `learning-v2:access-gate:${stableId}:${seasonId}:${gateId}`;
const accountKey = (stableId: string): string => `users:${stableId}`;
const receiptKey = (stableId: string, operationId: string): string =>
  `learning-v2:access-receipt:${stableId}:${operationId}`;

const sameRequestFields = (
  quote: V2AccessQuote,
  request: V2AccessPurchaseRequest,
): boolean =>
  quote.stableId === request.stableId &&
  quote.seasonId === request.seasonId &&
  quote.gateId === request.gateId &&
  quote.releaseId === request.releaseId &&
  quote.policyVersion === request.policyVersion;

export async function finalizeV2AccessPurchase(
  repository: V2AccessPurchaseRepository,
  policy: AccessBoostPolicy,
  input: FinalizeV2AccessPurchaseInput,
): Promise<{ readonly replayed: boolean; readonly receipt: V2AccessPurchaseReceipt }> {
  if (
    !/^[A-Za-z0-9._-]{8,160}$/.test(input.operationId) ||
    !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
    typeof input.authUid !== 'string' ||
    input.authUid.trim().length === 0 ||
    input.authUid.length > 128 ||
    input.authUid.includes('/') ||
    typeof input.stableId !== 'string' ||
    input.stableId.length === 0 ||
    input.request.stableId !== input.stableId ||
    input.request.opId !== input.operationId ||
    !Number.isSafeInteger(input.accountGeneration) ||
    input.accountGeneration < 1 ||
    !Number.isSafeInteger(input.nowMs) ||
    input.nowMs < 0
  ) {
    throw new Error('access_purchase_identity_invalid');
  }
  return repository.runTransaction(async (transaction) => {
    const [authLinkDocument, accountDocument, tombstoneDocument] =
      await Promise.all([
        transaction.get<{ readonly stable_id?: unknown }>(
          authLinkKey(input.authUid),
        ),
        transaction.get<V2AccessAccountRecord>(accountKey(input.stableId)),
        transaction.get(tombstoneKey(input.stableId)),
      ]);
    await repository.testHooks?.afterBindingReads?.();
    if (!authLinkDocument.exists) {
      throw new Error('access_identity_anchor_missing');
    }
    if (
      typeof authLinkDocument.data?.stable_id !== 'string' ||
      authLinkDocument.data.stable_id.trim() !== input.stableId
    ) {
      throw new Error('access_stable_identity_mismatch');
    }
    if (tombstoneDocument.exists) {
      throw new Error('access_account_delete_pending');
    }
    const account = accountDocument.data;
    const liveGeneration = Number(
      account?.accountGeneration ??
        (account as unknown as { readonly generation?: unknown } | undefined)
          ?.generation,
    );
    if (
      !accountDocument.exists ||
      !account ||
      !Number.isSafeInteger(liveGeneration) ||
      liveGeneration < 1 ||
      liveGeneration !== input.accountGeneration
    ) {
      throw new Error('access_account_generation_mismatch');
    }

    const operation = await transaction.get<V2AccessOperationRecord>(
      operationKey(input.stableId, input.operationId),
    );
    if (operation.exists) {
      if (operation.data?.fingerprint !== input.fingerprint) {
        throw new Error('access_purchase_replay_mismatch');
      }
      if (!operation.data?.receipt) throw new Error('access_purchase_operation_invalid');
      return { replayed: true, receipt: operation.data.receipt };
    }

    const [quoteDocument, gateDocument] = await Promise.all([
      transaction.get<V2AccessQuote>(quoteKey(input.stableId, input.request.quoteId)),
      transaction.get<V2AccessGateRecord>(gateKey(input.stableId, input.request.seasonId, input.request.gateId)),
    ]);
    const quote = quoteDocument.data;
    const gate = gateDocument.data;
    if (!quoteDocument.exists || !quote || !gateDocument.exists || !gate || !accountDocument.exists || !account) {
      throw new Error('access_purchase_binding_unavailable');
    }
    if (
      !sameRequestFields(quote, input.request) ||
      gate.stableId !== input.stableId ||
      gate.accountGeneration !== input.accountGeneration ||
      gate.seasonId !== input.request.seasonId ||
      gate.gateId !== input.request.gateId ||
      gate.releaseId !== input.request.releaseId ||
      gate.policyVersion !== input.request.policyVersion ||
      account.stableId !== input.stableId ||
      account.accountGeneration !== input.accountGeneration
    ) {
      throw new Error('access_purchase_binding_mismatch');
    }
    if (
      input.decisionRegistryRef &&
      (!gate.decisionRegistryRef ||
        gate.decisionRegistryRef.id !== input.decisionRegistryRef.id ||
        gate.decisionRegistryRef.version !== input.decisionRegistryRef.version ||
        gate.decisionRegistryRef.contentHash !== input.decisionRegistryRef.contentHash)
    ) {
      throw new Error('access_decision_registry_mismatch');
    }
    if (gate.unlocked) throw new Error('access_gate_already_unlocked');
    const quoteValidation = validateAccessQuoteForPurchase(quote, input.request, input.nowMs);
    if (quoteValidation.valid === false) throw new Error(`access_${quoteValidation.reason}`);
    const eligibility = evaluateAccessBoostEligibility(
      {
        requiredLoopsComplete: gate.requiredLoopsComplete,
        capabilityFallbackComplete: gate.capabilityFallbackComplete,
        localPerformanceComplete: gate.localPerformanceComplete,
        checkpointComplete: gate.checkpointComplete,
        honestBlockCount: gate.honestBlockCount,
        recoveryReviewImpressionCount: gate.recoveryReviewImpressionCount,
        earnedDeficit: gate.earnedDeficit,
        purchasedForGate: gate.purchasedForGate,
        purchasedForChapter: gate.purchasedForChapter,
        purchasedForSeason: gate.purchasedForSeason,
        serverQuoteAvailable: true,
      },
      policy,
    );
    if (eligibility.eligible === false) throw new Error(`access_${eligibility.reason}`);
    if (eligibility.totalCostShards !== quote.totalCostShards) {
      throw new Error('access_quote_policy_mismatch');
    }
    // Client composite operation owns affordability/debit; the protected
    // adapter persists only the gate and receipt.
    const receipt: V2AccessPurchaseReceipt = {
      opId: input.operationId,
      stableId: input.stableId,
      seasonId: input.request.seasonId,
      gateId: input.request.gateId,
      accessStarsApplied: eligibility.accessStarsToApply,
      shardsSpent: eligibility.totalCostShards,
      basis: 'earned_plus_boost',
    };
    transaction.update(gateKey(input.stableId, input.request.seasonId, input.request.gateId), {
      purchasedForGate: gate.purchasedForGate + eligibility.accessStarsToApply,
      purchasedForChapter: gate.purchasedForChapter + eligibility.accessStarsToApply,
      purchasedForSeason: gate.purchasedForSeason + eligibility.accessStarsToApply,
      earnedDeficit: 0,
      unlocked: true,
    });
    transaction.create(receiptKey(input.stableId, input.operationId), receipt);
    transaction.create(operationKey(input.stableId, input.operationId), {
      operationId: input.operationId,
      fingerprint: input.fingerprint,
      receipt,
    });
    return { replayed: false, receipt };
  });
}

export const makeFirestoreV2AccessRepository = (
  db: Firestore,
): V2AccessPurchaseRepository => ({
  runTransaction: <T>(fn: (transaction: V2AccessPurchaseTransaction) => Promise<T>) =>
    db.runTransaction(async (transaction: Transaction) =>
      fn({
        get: async <R>(key: string) => {
          const snapshot = await transaction.get(db.doc(firestoreV2AccessPath(key)));
          return {
            exists: snapshot.exists,
            data: snapshot.exists ? (snapshot.data() as R) : undefined,
          };
        },
        create: (key: string, value: unknown) => {
          const ref = db.doc(firestoreV2AccessPath(key));
          const candidate = transaction as unknown as {
            create?: (document: unknown, data: unknown) => void;
            set?: (document: unknown, data: unknown) => void;
          };
          if (candidate.create) candidate.create(ref, value);
          else if (candidate.set) candidate.set(ref, value);
          else throw new Error('access_firestore_create_unavailable');
        },
        update: (key: string, value: unknown) => {
          const ref = db.doc(firestoreV2AccessPath(key));
          const candidate = transaction as unknown as {
            update?: (document: unknown, data: UpdateData<Record<string, unknown>>) => void;
            set?: (document: unknown, data: unknown, options?: { merge?: boolean }) => void;
          };
          if (candidate.update) candidate.update(ref, value as UpdateData<Record<string, unknown>>);
          else if (candidate.set) candidate.set(ref, value, { merge: true });
          else throw new Error('access_firestore_update_unavailable');
        },
      }),
    ),
});
