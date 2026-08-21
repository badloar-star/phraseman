import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
  detachBoundedWalletJson,
  type WalletAuthorizedOperationV1,
} from '../contracts/wallet';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from '../policies/decision_registry';
import type { OwnerRepositoryWalletCreditAuthorityInput } from './owner_repository';
import { parseWalletAppliedReceipt } from './wallet_reducer';

export interface MistakeCorrectionWalletCompositeV1 {
  readonly schemaVersion: 'mistake-correction-wallet-composite.v1';
  readonly accountScopeHash: string;
  readonly rewardKey: string;
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly studyTarget: 'en' | 'fr';
  readonly correctionEventId: string;
  readonly correctionEventFingerprint: string;
  readonly rewardVersion: 1;
}

const KEYS = [
  'schemaVersion',
  'accountScopeHash',
  'rewardKey',
  'mistakeId',
  'cycleId',
  'studyTarget',
  'correctionEventId',
  'correctionEventFingerprint',
  'rewardVersion',
] as const;
const HASH = /^[a-f0-9]{64}$/;
const MISTAKE = /^mistake:v1:[a-f0-9]{64}$/;
const CYCLE = /^mistake-cycle:v1:[a-f0-9]{64}$/;
const EVENT = /^mistake-practice:v1:[a-f0-9]{64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const fail = (): never => { throw new Error('mistake_correction_wallet_composite_invalid'); };

export function deriveLegacyMistakeCorrectionOperationId(
  input: Pick<MistakeCorrectionWalletCompositeV1, 'mistakeId' | 'cycleId' | 'studyTarget'>,
): string {
  return `mistake-correction:${hashCanonicalBody({
    schemaVersion: 'mistake-correction-wallet-reward.v1',
    mistakeId: input.mistakeId,
    cycleId: input.cycleId,
    studyTarget: input.studyTarget,
    rewardVersion: 1,
  })}`;
}

export function parseMistakeCorrectionWalletComposite(
  input: unknown,
): MistakeCorrectionWalletCompositeV1 {
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(input, 'mistake_correction_wallet_composite_invalid');
  } catch {
    return fail();
  }
  if (!isRecord(detached) || Object.keys(detached).length !== KEYS.length ||
    Object.keys(detached).some((key) => !KEYS.includes(key as typeof KEYS[number])) ||
    detached.schemaVersion !== 'mistake-correction-wallet-composite.v1' ||
    typeof detached.accountScopeHash !== 'string' || !HASH.test(detached.accountScopeHash) ||
    typeof detached.rewardKey !== 'string' ||
    typeof detached.mistakeId !== 'string' || !MISTAKE.test(detached.mistakeId) ||
    typeof detached.cycleId !== 'string' || !CYCLE.test(detached.cycleId) ||
    (detached.studyTarget !== 'en' && detached.studyTarget !== 'fr') ||
    typeof detached.correctionEventId !== 'string' || !EVENT.test(detached.correctionEventId) ||
    typeof detached.correctionEventFingerprint !== 'string' || !HASH.test(detached.correctionEventFingerprint) ||
    detached.rewardVersion !== 1) return fail();
  const expectedRewardKey = `mistake-correction:v1:${sha256Utf8(canonicalJsonV1({
    mistakeId: detached.mistakeId,
    cycleId: detached.cycleId,
    studyTarget: detached.studyTarget,
    rewardVersion: 1,
  }))}`;
  if (detached.rewardKey !== expectedRewardKey) return fail();
  return Object.freeze({
    schemaVersion: 'mistake-correction-wallet-composite.v1',
    accountScopeHash: detached.accountScopeHash,
    rewardKey: detached.rewardKey,
    mistakeId: detached.mistakeId,
    cycleId: detached.cycleId,
    studyTarget: detached.studyTarget,
    correctionEventId: detached.correctionEventId,
    correctionEventFingerprint: detached.correctionEventFingerprint,
    rewardVersion: 1,
  });
}

export function materializeMistakeCorrectionCompositeCandidate(input: Readonly<{
  candidate: MistakeCorrectionWalletCompositeV1;
  accountScopeHash: string;
  accountGeneration: number;
  walletRevisionBefore: number;
}>): WalletAuthorizedOperationV1 {
  const candidate = parseMistakeCorrectionWalletComposite(input.candidate);
  if (candidate.accountScopeHash !== input.accountScopeHash) {
    throw new Error('mistake_correction_wallet_composite_owner_mismatch');
  }
  const sourceReceiptRef = {
    receiptType: 'mistake_correction_composite' as const,
    receiptId: candidate.rewardKey,
    receiptFingerprint: candidate.correctionEventFingerprint,
  };
  return createWalletAuthorizedOperation({
    schemaVersion: 'learning-v2-wallet-authorized-operation.v1',
    authority: 'client_authoritative_composite',
    operationId: deriveLegacyMistakeCorrectionOperationId(candidate),
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: input.accountScopeHash,
      operationReason: 'mistake_correction',
      sourceReceiptRef,
    }),
    accountScopeHash: input.accountScopeHash,
    accountGeneration: input.accountGeneration,
    currency: 'access_star',
    walletRevisionBefore: input.walletRevisionBefore,
    kind: 'earning_credit',
    amountSubunits: WALLET_SUBUNITS_PER_STAR,
    earningCategory: 'repeat',
    operationReason: 'mistake_correction',
    sourceReceiptRef,
    origin: {
      kind: 'mistake_correction',
      studyTarget: candidate.studyTarget,
      mistakeId: candidate.mistakeId,
      cycleId: candidate.cycleId,
      correctionEventId: candidate.correctionEventId,
    },
  });
}

export function createMistakeCorrectionCompositeAuthority() {
  return async (input: OwnerRepositoryWalletCreditAuthorityInput): Promise<WalletAuthorizedOperationV1> => {
    const candidate = parseMistakeCorrectionWalletComposite(input.candidate);
    if (candidate.accountScopeHash !== input.scope.accountScopeHash) {
      throw new Error('mistake_correction_wallet_composite_owner_mismatch');
    }
    const next = materializeMistakeCorrectionCompositeCandidate({
      candidate,
      accountScopeHash: input.scope.accountScopeHash,
      accountGeneration: input.scope.generation,
      walletRevisionBefore: input.walletState.revision,
    });
    if (input.canonicalAppliedReceipt === null) return next;
    let canonical;
    try {
      canonical = parseWalletAppliedReceipt(input.canonicalAppliedReceipt);
    } catch {
      return fail();
    }
    const legacyOperationId = deriveLegacyMistakeCorrectionOperationId(candidate);
    if (canonical.authorizedOperation.operationId !== legacyOperationId) return next;
    if (canonical.authorizedOperation.authority === 'trusted_server_boundary') {
      const operation = canonical.authorizedOperation;
      if (operation.accountScopeHash !== candidate.accountScopeHash ||
        operation.currency !== 'access_star' || operation.amountSubunits !== WALLET_SUBUNITS_PER_STAR ||
        operation.operationReason !== 'repeat_session' || operation.kind !== 'earning_credit' ||
        operation.sourceReceiptRef.receiptType !== 'repeat_reward_settlement' ||
        operation.sourceReceiptRef.receiptId !== legacyOperationId ||
        operation.origin.kind !== 'course' || operation.origin.courseId !== 'mistake-practice' ||
        operation.origin.studyTarget !== candidate.studyTarget) return fail();
      return operation;
    }
    const expected = materializeMistakeCorrectionCompositeCandidate({
      candidate,
      accountScopeHash: input.scope.accountScopeHash,
      accountGeneration: canonical.accountGeneration,
      walletRevisionBefore: canonical.revisionBefore,
    });
    if (!same(expected, canonical.authorizedOperation)) return fail();
    return canonical.authorizedOperation;
  };
}
