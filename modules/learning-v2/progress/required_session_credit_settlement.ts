import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
  deriveWalletSemanticSubjectFingerprint,
  isWalletIdentifier,
  type WalletAuthorizedOperationV1,
} from "../contracts/wallet";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { OwnerRepositoryWalletCreditAuthorityInput } from "./owner_repository";
import {
  parseRequiredSessionTaskSlotsSettledCandidate,
  type RequiredSessionTaskSlotsSettledCandidateV1,
} from "./required_session_reducer";

export interface RequiredSessionCreditSettlementV1 {
  readonly schemaVersion: "learning-v2-required-session-credit-settlement.v1";
  readonly recordKind: "required_session_credit_settlement";
  readonly settlementId: string;
  readonly operationId: string;
  readonly settledCandidate: RequiredSessionTaskSlotsSettledCandidateV1;
  readonly walletRevisionBefore: number;
  readonly settlementFingerprint: string;
  readonly outcome: "credited" | "zero_credit";
  readonly authorizedOperation: WalletAuthorizedOperationV1 | null;
  readonly recordFingerprint: string;
}

export interface RequiredSessionCreditSettlementMaterializationV1 {
  readonly settlement: RequiredSessionCreditSettlementV1;
  readonly encoded: string;
  readonly authority: "structural_candidate";
}

export interface RequiredSessionCreditRequestV1 {
  readonly schemaVersion: "learning-v2-required-session-credit-request.v1";
  readonly settlementId: string;
  readonly candidateFingerprint: string;
}

export interface RequiredSessionCreditSettlementResolver {
  resolveSettlement(input: {
    readonly accountScopeHash: string;
    readonly settlementId: string;
  }): Promise<unknown> | unknown;
}

const MAX_BYTES = 256 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const CREATE_KEYS = [
  "settlementId",
  "operationId",
  "walletRevisionBefore",
  "settledCandidate",
] as const;
const RECORD_KEYS = [
  "schemaVersion",
  "recordKind",
  "settlementId",
  "operationId",
  "settledCandidate",
  "walletRevisionBefore",
  "settlementFingerprint",
  "outcome",
  "authorizedOperation",
  "recordFingerprint",
] as const;
const REQUEST_KEYS = [
  "schemaVersion",
  "settlementId",
  "candidateFingerprint",
] as const;
const OPTIONS_KEYS = ["resolveSettlement"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    own.every((key) => typeof key === "string" && keys.includes(key))
  );
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return value;
};
const invalid = (): never => {
  throw new Error("required_session_credit_settlement_invalid");
};
const indeterminate = (): never => {
  throw new Error("required_session_credit_settlement_indeterminate");
};
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const detachRecord = (
  input: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> => {
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(input, code);
  } catch {
    throw new Error(code);
  }
  if (!isRecord(detached) || !exactKeys(detached, keys))
    throw new Error(code);
  return detached;
};
const readDataRecord = (
  input: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    throw new Error(code);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key)) ||
    keys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })
  )
    throw new Error(code);
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};

const settlementBody = (input: {
  readonly settlementId: string;
  readonly operationId: string;
  readonly walletRevisionBefore: number;
  readonly settledCandidate: RequiredSessionTaskSlotsSettledCandidateV1;
}) => ({
  schemaVersion: "learning-v2-required-session-credit-settlement-body.v1" as const,
  settlementId: input.settlementId,
  operationId: input.operationId,
  settledCandidate: input.settledCandidate,
  walletRevisionBefore: input.walletRevisionBefore,
});

/**
 * Builds canonical bytes only. The result is not authorization until a
 * server-only verifier persists it and the resolver below reads those exact
 * bytes from that protected durable store.
 */
export const materializeRequiredSessionCreditSettlementCandidate = (
  input: unknown,
): RequiredSessionCreditSettlementMaterializationV1 => {
  const value = detachRecord(
    input,
    CREATE_KEYS,
    "required_session_credit_settlement_invalid",
  );
  if (
    !isWalletIdentifier(value.settlementId) ||
    !isWalletIdentifier(value.operationId) ||
    !safe(value.walletRevisionBefore)
  )
    return invalid();
  let settledCandidate: RequiredSessionTaskSlotsSettledCandidateV1;
  try {
    settledCandidate = parseRequiredSessionTaskSlotsSettledCandidate(
      value.settledCandidate,
    );
  } catch {
    return invalid();
  }
  if (settledCandidate.runKindClaim !== "initial") return invalid();
  const walletRevisionBefore = Number(value.walletRevisionBefore);
  const body = settlementBody({
    settlementId: value.settlementId,
    operationId: value.operationId,
    walletRevisionBefore,
    settledCandidate,
  });
  const settlementFingerprint = hashCanonicalBody(body);
  const amountSubunits =
    settledCandidate.projectedBasePerformanceStars * WALLET_SUBUNITS_PER_STAR;
  if (!Number.isSafeInteger(amountSubunits)) return invalid();
  let authorizedOperation: WalletAuthorizedOperationV1 | null = null;
  if (amountSubunits > 0) {
    const sourceReceiptRef = {
      receiptType: "required_session_credit_settlement" as const,
      receiptId: value.settlementId,
      receiptFingerprint: settlementFingerprint,
    };
    authorizedOperation = createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: value.operationId,
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash: settledCandidate.accountScopeHash,
        operationReason: "initial_required_session",
        sourceReceiptRef,
      }),
      accountScopeHash: settledCandidate.accountScopeHash,
      accountGeneration: settledCandidate.accountGeneration,
      currency: "access_star",
      walletRevisionBefore,
      kind: "earning_credit",
      amountSubunits,
      earningCategory: "lesson",
      operationReason: "initial_required_session",
      sourceReceiptRef,
      origin: {
        kind: "course",
        courseId: settledCandidate.courseId,
        studyTarget: settledCandidate.studyTarget,
        requiredSessionOrdinal: settledCandidate.requiredSessionOrdinal,
      },
    });
  }
  const withoutFingerprint = {
    schemaVersion: "learning-v2-required-session-credit-settlement.v1" as const,
    recordKind: "required_session_credit_settlement" as const,
    settlementId: value.settlementId,
    operationId: value.operationId,
    settledCandidate,
    walletRevisionBefore,
    settlementFingerprint,
    outcome: amountSubunits > 0 ? ("credited" as const) : ("zero_credit" as const),
    authorizedOperation,
  };
  const settlement = deepFreeze({
    ...withoutFingerprint,
    recordFingerprint: hashCanonicalBody(withoutFingerprint),
  });
  return deepFreeze({
    settlement,
    encoded: canonicalJsonV1(settlement),
    authority: "structural_candidate" as const,
  });
};

export const parseRequiredSessionCreditSettlementRaw = (
  raw: unknown,
): RequiredSessionCreditSettlementMaterializationV1 => {
  if (typeof raw !== "string") return indeterminate();
  let parsed: unknown;
  try {
    if (utf8ByteLengthV1(raw) > MAX_BYTES) return indeterminate();
    parsed = JSON.parse(raw);
    if (canonicalJsonV1(parsed) !== raw) return indeterminate();
  } catch {
    return indeterminate();
  }
  let value: Readonly<Record<string, unknown>>;
  try {
    value = detachRecord(
      parsed,
      RECORD_KEYS,
      "required_session_credit_settlement_indeterminate",
    );
  } catch {
    return indeterminate();
  }
  if (
    value.schemaVersion !==
      "learning-v2-required-session-credit-settlement.v1" ||
    value.recordKind !== "required_session_credit_settlement" ||
    typeof value.settlementFingerprint !== "string" ||
    !HASH.test(value.settlementFingerprint) ||
    typeof value.recordFingerprint !== "string" ||
    !HASH.test(value.recordFingerprint)
  )
    return indeterminate();
  let rebuilt: RequiredSessionCreditSettlementMaterializationV1;
  try {
    rebuilt = materializeRequiredSessionCreditSettlementCandidate({
      settlementId: value.settlementId,
      operationId: value.operationId,
      walletRevisionBefore: value.walletRevisionBefore,
      settledCandidate: value.settledCandidate,
    });
  } catch {
    return indeterminate();
  }
  if (!same(rebuilt.settlement, value) || rebuilt.encoded !== raw)
    return indeterminate();
  return rebuilt;
};

const parseRequest = (input: unknown): RequiredSessionCreditRequestV1 => {
  const value = detachRecord(
    input,
    REQUEST_KEYS,
    "required_session_credit_request_invalid",
  );
  if (
    value.schemaVersion !== "learning-v2-required-session-credit-request.v1" ||
    !isWalletIdentifier(value.settlementId) ||
    typeof value.candidateFingerprint !== "string" ||
    !HASH.test(value.candidateFingerprint)
  )
    throw new Error("required_session_credit_request_invalid");
  return deepFreeze(value as unknown as RequiredSessionCreditRequestV1);
};

/**
 * Repository authority adapter. Its resolver must be a server-only lookup over
 * immutable, previously verified settlement bytes; client JSON is only a key
 * and an exact candidate-fingerprint assertion.
 */
export const createRequiredSessionWalletCreditAuthority = (
  input: unknown,
): ((request: OwnerRepositoryWalletCreditAuthorityInput) => Promise<unknown>) => {
  const options = readDataRecord(
    input,
    OPTIONS_KEYS,
    "required_session_credit_authority_invalid",
  );
  if (typeof options.resolveSettlement !== "function")
    throw new Error("required_session_credit_authority_invalid");
  const resolveSettlement = options.resolveSettlement as RequiredSessionCreditSettlementResolver["resolveSettlement"];
  return async (request: OwnerRepositoryWalletCreditAuthorityInput) => {
    const candidate = parseRequest(request.candidate);
    let raw: unknown;
    try {
      raw = await resolveSettlement({
        accountScopeHash: request.scope.accountScopeHash,
        settlementId: candidate.settlementId,
      });
    } catch {
      throw new Error("required_session_credit_settlement_unavailable");
    }
    const materialized = parseRequiredSessionCreditSettlementRaw(raw);
    const settlement = materialized.settlement;
    if (
      settlement.settlementId !== candidate.settlementId ||
      settlement.settledCandidate.candidateFingerprint !==
        candidate.candidateFingerprint ||
      settlement.settledCandidate.accountScopeHash !==
        request.scope.accountScopeHash ||
      settlement.outcome !== "credited" ||
      settlement.authorizedOperation === null
    )
      throw new Error("required_session_credit_settlement_conflict");
    const operation = settlement.authorizedOperation;
    if (
      request.canonicalAppliedReceipt !== null &&
      same(request.canonicalAppliedReceipt.authorizedOperation, operation)
    ) {
      return operation;
    }
    // A verified head receipt may belong to a different settlement. In that
    // case this is a new canonical effect, not a replay conflict: the stored
    // settlement still has to be authorized for the exact current wallet.
    if (
      operation.accountGeneration !== request.scope.generation ||
      operation.walletRevisionBefore !== request.walletState.revision
    )
      throw new Error("required_session_credit_settlement_stale");
    return operation;
  };
};
