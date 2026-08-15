import {
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
  deriveWalletSemanticSubjectFingerprint,
  isWalletIdentifier,
  type WalletAuthorizedOperationV1,
  type WalletOperationOrigin,
  type WalletOperationReason,
  type WalletSourceReceiptRef,
} from "../contracts/wallet";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { OwnerRepositoryWalletCreditAuthorityInput } from "./owner_repository";

export type ServerWalletCreditReason = Exclude<
  WalletOperationReason,
  "initial_required_session" | "legacy_opening_balance"
>;

export interface ServerWalletCreditSettlementV1 {
  readonly schemaVersion: "learning-v2-server-wallet-credit-settlement.v1";
  readonly recordKind: "server_wallet_credit_settlement";
  readonly settlementId: string;
  readonly operationId: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly walletRevisionBefore: number;
  readonly amountSubunits: number;
  readonly operationReason: ServerWalletCreditReason;
  readonly origin: WalletOperationOrigin;
  readonly settlementFingerprint: string;
  readonly authorizedOperation: WalletAuthorizedOperationV1;
  readonly recordFingerprint: string;
}

export interface ServerWalletCreditSettlementMaterializationV1 {
  readonly settlement: ServerWalletCreditSettlementV1;
  readonly encoded: string;
  readonly authority: "structural_candidate";
}

export interface ServerWalletCreditSettlementResolver {
  resolveSettlement(input: {
    readonly accountScopeHash: string;
    readonly settlementId: string;
  }): Promise<unknown> | unknown;
}

const CREATE_KEYS = [
  "settlementId",
  "operationId",
  "accountScopeHash",
  "accountGeneration",
  "walletRevisionBefore",
  "amountSubunits",
  "operationReason",
  "origin",
] as const;
const RECORD_KEYS = [
  "schemaVersion",
  "recordKind",
  ...CREATE_KEYS,
  "settlementFingerprint",
  "authorizedOperation",
  "recordFingerprint",
] as const;
const REQUEST_KEYS = [
  "schemaVersion",
  "settlementId",
  "settlementFingerprint",
] as const;
const REASONS = [
  "repeat_session",
  "plan_completion",
  "dictionary_activity",
  "irregular_verbs_activity",
  "tournament_reward",
  "coin_exchange",
] as const;
const MAX_BYTES = 128 * 1024;
const MAX_AMOUNT = 1_000_000_000_000;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const safe = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && !Object.is(value, -0) &&
  Number(value) >= minimum && Number(value) <= maximum;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return value;
};
const same = (left: unknown, right: unknown) =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const fail = (code: string): never => { throw new Error(code); };
const detachRecord = (
  input: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> => {
  let detached: unknown;
  try { detached = detachBoundedWalletJson(input, code); }
  catch { return fail(code); }
  if (!isRecord(detached) || !exactKeys(detached, keys)) return fail(code);
  return detached;
};
const readRecord = (
  input: unknown,
  keys: readonly string[],
  code: string,
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    return fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (own.length !== keys.length || own.some((key) =>
    typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })) return fail(code);
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};

type SettlementCombination = Readonly<{
  kind: "earning_credit" | "external_credit";
  earningCategory: WalletAuthorizedOperationV1["earningCategory"];
  receiptType: WalletSourceReceiptRef["receiptType"];
  originKind: WalletOperationOrigin["kind"];
}>;
const COMBINATIONS = {
  repeat_session: {
    kind: "earning_credit", earningCategory: "repeat",
    receiptType: "repeat_reward_settlement", originKind: "course",
  },
  plan_completion: {
    kind: "earning_credit", earningCategory: "plan",
    receiptType: "plan_reward_settlement", originKind: "course",
  },
  dictionary_activity: {
    kind: "earning_credit", earningCategory: "dictionary",
    receiptType: "dictionary_reward_settlement", originKind: "course",
  },
  irregular_verbs_activity: {
    kind: "earning_credit", earningCategory: "irregular_verbs",
    receiptType: "irregular_verbs_reward_settlement", originKind: "course",
  },
  tournament_reward: {
    kind: "earning_credit", earningCategory: "tournament",
    receiptType: "tournament_reward", originKind: "tournament",
  },
  coin_exchange: {
    kind: "external_credit", earningCategory: null,
    receiptType: "coin_exchange_trade", originKind: "coin_exchange",
  },
} as const satisfies Readonly<Record<ServerWalletCreditReason, SettlementCombination>>;
const combination = (reason: ServerWalletCreditReason): SettlementCombination =>
  COMBINATIONS[reason];

export const materializeServerWalletCreditSettlementCandidate = (
  input: unknown,
): ServerWalletCreditSettlementMaterializationV1 => {
  const value = detachRecord(input, CREATE_KEYS, "server_wallet_credit_settlement_invalid");
  if (!isWalletIdentifier(value.settlementId) ||
    !isWalletIdentifier(value.operationId) ||
    typeof value.accountScopeHash !== "string" ||
    !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.accountGeneration) || !safe(value.walletRevisionBefore) ||
    !safe(value.amountSubunits, 1, MAX_AMOUNT) ||
    !REASONS.includes(value.operationReason as never) ||
    !isRecord(value.origin)) return fail("server_wallet_credit_settlement_invalid");
  const reason = value.operationReason as ServerWalletCreditReason;
  const expected = combination(reason);
  if (value.origin.kind !== expected.originKind)
    return fail("server_wallet_credit_settlement_invalid");
  const body = {
    schemaVersion: "learning-v2-server-wallet-credit-settlement-body.v1" as const,
    settlementId: value.settlementId as string,
    operationId: value.operationId as string,
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    walletRevisionBefore: Number(value.walletRevisionBefore),
    amountSubunits: Number(value.amountSubunits),
    operationReason: reason,
    origin: value.origin,
  };
  const settlementFingerprint = hashCanonicalBody(body);
  const sourceReceiptRef = {
    receiptType: expected.receiptType,
    receiptId: value.settlementId as string,
    receiptFingerprint: settlementFingerprint,
  };
  let authorizedOperation: WalletAuthorizedOperationV1;
  try {
    authorizedOperation = createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: value.operationId,
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash: value.accountScopeHash,
        operationReason: reason,
        sourceReceiptRef,
      }),
      accountScopeHash: value.accountScopeHash,
      accountGeneration: value.accountGeneration,
      currency: "access_star",
      walletRevisionBefore: value.walletRevisionBefore,
      kind: expected.kind,
      amountSubunits: value.amountSubunits,
      earningCategory: expected.earningCategory,
      operationReason: reason,
      sourceReceiptRef,
      origin: value.origin,
    });
  } catch { return fail("server_wallet_credit_settlement_invalid"); }
  const withoutFingerprint = {
    schemaVersion: "learning-v2-server-wallet-credit-settlement.v1" as const,
    recordKind: "server_wallet_credit_settlement" as const,
    settlementId: body.settlementId,
    operationId: body.operationId,
    accountScopeHash: body.accountScopeHash,
    accountGeneration: body.accountGeneration,
    walletRevisionBefore: body.walletRevisionBefore,
    amountSubunits: body.amountSubunits,
    operationReason: body.operationReason,
    origin: authorizedOperation.origin,
    settlementFingerprint,
    authorizedOperation,
  };
  const settlement = deepFreeze({
    ...withoutFingerprint,
    recordFingerprint: hashCanonicalBody(withoutFingerprint),
  });
  const encoded = canonicalJsonV1(settlement);
  if (utf8ByteLengthV1(encoded) > MAX_BYTES)
    return fail("server_wallet_credit_settlement_invalid");
  return deepFreeze({ settlement, encoded, authority: "structural_candidate" as const });
};

export const parseServerWalletCreditSettlementRaw = (
  raw: unknown,
): ServerWalletCreditSettlementMaterializationV1 => {
  if (typeof raw !== "string") return fail("server_wallet_credit_settlement_indeterminate");
  let value: Readonly<Record<string, unknown>>;
  try {
    if (utf8ByteLengthV1(raw) > MAX_BYTES)
      return fail("server_wallet_credit_settlement_indeterminate");
    const parsed = JSON.parse(raw);
    if (canonicalJsonV1(parsed) !== raw)
      return fail("server_wallet_credit_settlement_indeterminate");
    value = detachRecord(parsed, RECORD_KEYS,
      "server_wallet_credit_settlement_indeterminate");
  } catch { return fail("server_wallet_credit_settlement_indeterminate"); }
  if (value.schemaVersion !== "learning-v2-server-wallet-credit-settlement.v1" ||
    value.recordKind !== "server_wallet_credit_settlement" ||
    typeof value.settlementFingerprint !== "string" ||
    !HASH.test(value.settlementFingerprint) ||
    typeof value.recordFingerprint !== "string" ||
    !HASH.test(value.recordFingerprint))
    return fail("server_wallet_credit_settlement_indeterminate");
  let rebuilt: ServerWalletCreditSettlementMaterializationV1;
  try {
    rebuilt = materializeServerWalletCreditSettlementCandidate({
      settlementId: value.settlementId,
      operationId: value.operationId,
      accountScopeHash: value.accountScopeHash,
      accountGeneration: value.accountGeneration,
      walletRevisionBefore: value.walletRevisionBefore,
      amountSubunits: value.amountSubunits,
      operationReason: value.operationReason,
      origin: value.origin,
    });
  } catch { return fail("server_wallet_credit_settlement_indeterminate"); }
  if (!same(rebuilt.settlement, value) || rebuilt.encoded !== raw)
    return fail("server_wallet_credit_settlement_indeterminate");
  return rebuilt;
};

export const createServerWalletCreditAuthority = (
  input: unknown,
): ((request: OwnerRepositoryWalletCreditAuthorityInput) => Promise<unknown>) => {
  const options = readRecord(input, ["resolveSettlement"],
    "server_wallet_credit_authority_invalid");
  if (typeof options.resolveSettlement !== "function")
    return fail("server_wallet_credit_authority_invalid");
  const resolve = options.resolveSettlement as
    ServerWalletCreditSettlementResolver["resolveSettlement"];
  return async (request) => {
    const candidate = detachRecord(request.candidate, REQUEST_KEYS,
      "server_wallet_credit_request_invalid");
    if (candidate.schemaVersion !== "learning-v2-server-wallet-credit-request.v1" ||
      !isWalletIdentifier(candidate.settlementId) ||
      typeof candidate.settlementFingerprint !== "string" ||
      !HASH.test(candidate.settlementFingerprint))
      return fail("server_wallet_credit_request_invalid");
    let raw: unknown;
    try {
      raw = await resolve({
        accountScopeHash: request.scope.accountScopeHash,
        settlementId: candidate.settlementId,
      });
    } catch { return fail("server_wallet_credit_settlement_unavailable"); }
    const materialized = parseServerWalletCreditSettlementRaw(raw);
    const settlement = materialized.settlement;
    if (settlement.settlementId !== candidate.settlementId ||
      settlement.settlementFingerprint !== candidate.settlementFingerprint ||
      settlement.accountScopeHash !== request.scope.accountScopeHash)
      return fail("server_wallet_credit_settlement_conflict");
    if (request.canonicalAppliedReceipt !== null && same(
      request.canonicalAppliedReceipt.authorizedOperation,
      settlement.authorizedOperation,
    )) return settlement.authorizedOperation;
    if (settlement.accountGeneration !== request.scope.generation ||
      settlement.walletRevisionBefore !== request.walletState.revision)
      return fail("server_wallet_credit_settlement_stale");
    return settlement.authorizedOperation;
  };
};
