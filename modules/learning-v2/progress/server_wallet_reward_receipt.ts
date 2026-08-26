import {
  createWalletAuthorizedOperation,
  deriveWalletInitialRequiredSessionOperationId,
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
import { parseWalletAppliedReceipt } from "./wallet_reducer";

export type ServerWalletRewardReason = Exclude<
  WalletOperationReason,
  "legacy_opening_balance" | "mistake_correction"
>;

export interface ServerWalletRewardReceiptV1 {
  readonly schemaVersion: "learning-v2-server-wallet-reward-receipt.v1";
  readonly recordKind: "server_wallet_reward_receipt";
  readonly rewardId: string;
  readonly operationId: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly amountSubunits: number;
  readonly operationReason: ServerWalletRewardReason;
  readonly origin: WalletOperationOrigin;
  readonly rewardFingerprint: string;
  readonly recordFingerprint: string;
}

export interface ServerWalletRewardReceiptMaterializationV1 {
  readonly receipt: ServerWalletRewardReceiptV1;
  readonly encoded: string;
  /** Canonical bytes are not authority until read from protected server storage. */
  readonly authority: "structural_candidate";
}

export interface ServerWalletRewardRequestV1 {
  readonly schemaVersion: "learning-v2-server-wallet-reward-request.v1";
  readonly rewardId: string;
  readonly rewardFingerprint: string;
}

export interface ServerWalletRewardReceiptResolver {
  resolveRewardReceipt(input: {
    readonly accountScopeHash: string;
    readonly rewardId: string;
    readonly rewardFingerprint: string;
  }): Promise<unknown> | unknown;
}

const CREATE_KEYS = [
  "rewardId",
  "operationId",
  "accountScopeHash",
  "accountGeneration",
  "amountSubunits",
  "operationReason",
  "origin",
] as const;
const RECORD_KEYS = [
  "schemaVersion",
  "recordKind",
  ...CREATE_KEYS,
  "rewardFingerprint",
  "recordFingerprint",
] as const;
const REQUEST_KEYS = ["schemaVersion", "rewardId", "rewardFingerprint"] as const;
const REASONS = [
  "initial_required_session",
  "repeat_session",
  "plan_completion",
  "dictionary_activity",
  "irregular_verbs_activity",
  "tournament_reward",
  "coin_exchange",
] as const;
const MAX_BYTES = 96 * 1024;
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

type RewardCombination = Readonly<{
  kind: "earning_credit" | "external_credit";
  earningCategory: WalletAuthorizedOperationV1["earningCategory"];
  receiptType: WalletSourceReceiptRef["receiptType"];
  originKind: WalletOperationOrigin["kind"];
}>;
const COMBINATIONS = {
  initial_required_session: {
    kind: "earning_credit", earningCategory: "lesson",
    receiptType: "required_session_credit_settlement", originKind: "course",
  },
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
} as const satisfies Readonly<Record<ServerWalletRewardReason, RewardCombination>>;

const rewardBody = (value: Readonly<Record<string, unknown>>) => ({
  schemaVersion: "learning-v2-server-wallet-reward-body.v1" as const,
  rewardId: value.rewardId as string,
  operationId: value.operationId as string,
  accountScopeHash: value.accountScopeHash as string,
  accountGeneration: Number(value.accountGeneration),
  amountSubunits: Number(value.amountSubunits),
  operationReason: value.operationReason as ServerWalletRewardReason,
  origin: value.origin as WalletOperationOrigin,
});

export const materializeServerWalletRewardReceiptCandidate = (
  input: unknown,
): ServerWalletRewardReceiptMaterializationV1 => {
  const value = detachRecord(input, CREATE_KEYS, "server_wallet_reward_receipt_invalid");
  if (!isWalletIdentifier(value.rewardId) ||
    !isWalletIdentifier(value.operationId) ||
    typeof value.accountScopeHash !== "string" ||
    !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.accountGeneration, 1) ||
    !safe(value.amountSubunits, 1, MAX_AMOUNT) ||
    !REASONS.includes(value.operationReason as never) ||
    !isRecord(value.origin)) return fail("server_wallet_reward_receipt_invalid");
  const reason = value.operationReason as ServerWalletRewardReason;
  if (value.origin.kind !== COMBINATIONS[reason].originKind)
    return fail("server_wallet_reward_receipt_invalid");
  const body = rewardBody(value);
  const withoutFingerprint = {
    schemaVersion: "learning-v2-server-wallet-reward-receipt.v1" as const,
    recordKind: "server_wallet_reward_receipt" as const,
    rewardId: body.rewardId,
    operationId: body.operationId,
    accountScopeHash: body.accountScopeHash,
    accountGeneration: body.accountGeneration,
    amountSubunits: body.amountSubunits,
    operationReason: body.operationReason,
    origin: body.origin,
    rewardFingerprint: hashCanonicalBody(body),
  };
  const receipt = deepFreeze({
    ...withoutFingerprint,
    recordFingerprint: hashCanonicalBody(withoutFingerprint),
  });
  const encoded = canonicalJsonV1(receipt);
  if (utf8ByteLengthV1(encoded) > MAX_BYTES)
    return fail("server_wallet_reward_receipt_invalid");
  return deepFreeze({ receipt, encoded, authority: "structural_candidate" as const });
};

export const parseServerWalletRewardReceiptRaw = (
  raw: unknown,
): ServerWalletRewardReceiptMaterializationV1 => {
  if (typeof raw !== "string") return fail("server_wallet_reward_receipt_indeterminate");
  let value: Readonly<Record<string, unknown>>;
  try {
    if (utf8ByteLengthV1(raw) > MAX_BYTES)
      return fail("server_wallet_reward_receipt_indeterminate");
    const parsed = JSON.parse(raw);
    if (canonicalJsonV1(parsed) !== raw)
      return fail("server_wallet_reward_receipt_indeterminate");
    value = detachRecord(parsed, RECORD_KEYS,
      "server_wallet_reward_receipt_indeterminate");
  } catch { return fail("server_wallet_reward_receipt_indeterminate"); }
  if (value.schemaVersion !== "learning-v2-server-wallet-reward-receipt.v1" ||
    value.recordKind !== "server_wallet_reward_receipt" ||
    typeof value.rewardFingerprint !== "string" ||
    !HASH.test(value.rewardFingerprint) ||
    typeof value.recordFingerprint !== "string" ||
    !HASH.test(value.recordFingerprint))
    return fail("server_wallet_reward_receipt_indeterminate");
  let rebuilt: ServerWalletRewardReceiptMaterializationV1;
  try {
    rebuilt = materializeServerWalletRewardReceiptCandidate({
      rewardId: value.rewardId,
      operationId: value.operationId,
      accountScopeHash: value.accountScopeHash,
      accountGeneration: value.accountGeneration,
      amountSubunits: value.amountSubunits,
      operationReason: value.operationReason,
      origin: value.origin,
    });
  } catch { return fail("server_wallet_reward_receipt_indeterminate"); }
  if (!same(rebuilt.receipt, value) || rebuilt.encoded !== raw)
    return fail("server_wallet_reward_receipt_indeterminate");
  return rebuilt;
};

export const materializeServerWalletRewardRequest = (
  input: ServerWalletRewardReceiptMaterializationV1,
): ServerWalletRewardRequestV1 => deepFreeze({
  schemaVersion: "learning-v2-server-wallet-reward-request.v1",
  rewardId: input.receipt.rewardId,
  rewardFingerprint: input.receipt.rewardFingerprint,
});

export const parseServerWalletRewardRequest = (
  input: unknown,
): ServerWalletRewardRequestV1 => {
  const value = detachRecord(input, REQUEST_KEYS,
    "server_wallet_reward_request_invalid");
  if (value.schemaVersion !== "learning-v2-server-wallet-reward-request.v1" ||
    !isWalletIdentifier(value.rewardId) ||
    typeof value.rewardFingerprint !== "string" ||
    !HASH.test(value.rewardFingerprint)) {
    return fail("server_wallet_reward_request_invalid");
  }
  return deepFreeze({
    schemaVersion: value.schemaVersion,
    rewardId: value.rewardId,
    rewardFingerprint: value.rewardFingerprint,
  });
};

const operationForReceipt = (
  receipt: ServerWalletRewardReceiptV1,
  walletRevisionBefore: number,
  acceptedAccountGeneration: number,
): WalletAuthorizedOperationV1 => {
  const combination = COMBINATIONS[receipt.operationReason];
  const sourceReceiptRef = {
    receiptType: combination.receiptType,
    receiptId: receipt.rewardId,
    receiptFingerprint: receipt.rewardFingerprint,
  };
  const operationId = receipt.operationReason === "initial_required_session"
    ? deriveWalletInitialRequiredSessionOperationId({
        accountScopeHash: receipt.accountScopeHash,
        origin: receipt.origin,
      })
    : receipt.operationId;
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: receipt.accountScopeHash,
      operationReason: receipt.operationReason,
      sourceReceiptRef,
      origin: receipt.origin,
    }),
    accountScopeHash: receipt.accountScopeHash,
    accountGeneration: acceptedAccountGeneration,
    currency: "access_star",
    walletRevisionBefore,
    kind: combination.kind,
    amountSubunits: receipt.amountSubunits,
    earningCategory: combination.earningCategory,
    operationReason: receipt.operationReason,
    sourceReceiptRef,
    origin: receipt.origin,
  });
};

/**
 * The resolver must read exact bytes from protected server storage. The source
 * reward is revision-independent; only this authority binds it to the current
 * wallet revision. On retry, the repository-verified canonical receipt wins.
 */
export const createServerWalletRewardReceiptAuthority = (
  input: unknown,
): ((request: OwnerRepositoryWalletCreditAuthorityInput) => Promise<unknown>) => {
  const options = readRecord(input, ["resolveRewardReceipt"],
    "server_wallet_reward_authority_invalid");
  if (typeof options.resolveRewardReceipt !== "function")
    return fail("server_wallet_reward_authority_invalid");
  const resolve = options.resolveRewardReceipt as
    ServerWalletRewardReceiptResolver["resolveRewardReceipt"];
  return async (request) => {
    const candidate = detachRecord(request.candidate, REQUEST_KEYS,
      "server_wallet_reward_request_invalid");
    if (candidate.schemaVersion !== "learning-v2-server-wallet-reward-request.v1" ||
      !isWalletIdentifier(candidate.rewardId) ||
      typeof candidate.rewardFingerprint !== "string" ||
      !HASH.test(candidate.rewardFingerprint))
      return fail("server_wallet_reward_request_invalid");
    let raw: unknown;
    try {
      raw = await resolve({
        accountScopeHash: request.scope.accountScopeHash,
        rewardId: candidate.rewardId,
        rewardFingerprint: candidate.rewardFingerprint,
      });
    } catch { return fail("server_wallet_reward_receipt_unavailable"); }
    const materialized = parseServerWalletRewardReceiptRaw(raw);
    const receipt = materialized.receipt;
    if (receipt.rewardId !== candidate.rewardId ||
      receipt.rewardFingerprint !== candidate.rewardFingerprint ||
      receipt.accountScopeHash !== request.scope.accountScopeHash)
      return fail("server_wallet_reward_receipt_conflict");
    if (request.canonicalAppliedReceipt !== null) {
      let canonical;
      try { canonical = parseWalletAppliedReceipt(request.canonicalAppliedReceipt); }
      catch { return fail("server_wallet_reward_receipt_conflict"); }
      // The repository supplies its verified journal head as a restart aid.
      // It is replay authority only for this exact protected operation; an
      // unrelated head must not block the next independently settled reward.
      const expected = operationForReceipt(
        receipt,
        canonical.revisionBefore,
        canonical.accountGeneration,
      );
      if (canonical.authorizedOperation.operationId === expected.operationId) {
        if (canonical.accountGeneration < receipt.accountGeneration)
          return fail("server_wallet_reward_receipt_conflict");
        if (canonical.authorizedOperation.semanticSubjectFingerprint !==
            expected.semanticSubjectFingerprint ||
          canonical.authorizedOperation.semanticFingerprint !==
            expected.semanticFingerprint ||
          canonical.authorizedOperation.operationFingerprint !==
            expected.operationFingerprint)
          return fail("server_wallet_reward_receipt_conflict");
        return canonical.authorizedOperation;
      }
    }
    if (receipt.accountGeneration > request.scope.generation)
      return fail("server_wallet_reward_receipt_stale");
    return operationForReceipt(
      receipt,
      request.walletState.revision,
      request.scope.generation,
    );
  };
};
