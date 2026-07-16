import {
  evaluateAccessBoostEligibility,
  type AccessBoostPolicy,
} from '../../modules/learning-v2/contracts/access_boost';
import {
  validateAccessQuoteForPurchase,
  type V2AccessPurchaseRequest,
  type V2AccessQuote,
} from '../../modules/learning-v2/contracts/access_quote';

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
}

export interface V2AccessAccountRecord {
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly shards: number;
}

export interface V2AccessPurchaseReceipt {
  readonly opId: string;
  readonly stableId: string;
  readonly seasonId: string;
  readonly gateId: string;
  readonly accessStarsApplied: number;
  readonly shardsSpent: number;
  readonly balanceAfter: number;
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
}

export interface FinalizeV2AccessPurchaseInput {
  readonly operationId: string;
  readonly fingerprint: string;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly request: V2AccessPurchaseRequest;
  readonly nowMs: number;
}

const operationKey = (stableId: string, operationId: string): string =>
  `learning-v2:access-operation:${stableId}:${operationId}`;
const quoteKey = (quoteId: string): string => `learning-v2:access-quote:${quoteId}`;
const gateKey = (seasonId: string, gateId: string): string =>
  `learning-v2:access-gate:${seasonId}:${gateId}`;
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
    input.stableId.length === 0 ||
    input.request.stableId !== input.stableId ||
    !Number.isSafeInteger(input.accountGeneration) ||
    input.accountGeneration < 1 ||
    !Number.isSafeInteger(input.nowMs)
  ) {
    throw new Error('access_purchase_identity_invalid');
  }
  return repository.runTransaction(async (transaction) => {
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

    const [quoteDocument, gateDocument, accountDocument] = await Promise.all([
      transaction.get<V2AccessQuote>(quoteKey(input.request.quoteId)),
      transaction.get<V2AccessGateRecord>(gateKey(input.request.seasonId, input.request.gateId)),
      transaction.get<V2AccessAccountRecord>(accountKey(input.stableId)),
    ]);
    const quote = quoteDocument.data;
    const gate = gateDocument.data;
    const account = accountDocument.data;
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
    const quoteValidation = validateAccessQuoteForPurchase(quote, input.request, input.nowMs);
    if (!quoteValidation.valid) throw new Error(`access_${quoteValidation.reason}`);
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
    if (!eligibility.eligible) throw new Error(`access_${eligibility.reason}`);
    if (eligibility.totalCostShards !== quote.totalCostShards) {
      throw new Error('access_quote_policy_mismatch');
    }
    if (account.shards < eligibility.totalCostShards) throw new Error('access_insufficient_balance');
    const balanceAfter = account.shards - eligibility.totalCostShards;
    const receipt: V2AccessPurchaseReceipt = {
      opId: input.operationId,
      stableId: input.stableId,
      seasonId: input.request.seasonId,
      gateId: input.request.gateId,
      accessStarsApplied: eligibility.accessStarsToApply,
      shardsSpent: eligibility.totalCostShards,
      balanceAfter,
      basis: 'earned_plus_boost',
    };
    transaction.update(accountKey(input.stableId), { shards: balanceAfter });
    transaction.update(gateKey(input.request.seasonId, input.request.gateId), {
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
