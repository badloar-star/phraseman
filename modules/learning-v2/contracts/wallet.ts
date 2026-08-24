import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";

export const WALLET_SUBUNITS_PER_STAR = 10_000 as const;
export const WALLET_EARNING_CATEGORIES = [
  "lesson",
  "repeat",
  "plan",
  "dictionary",
  "irregular_verbs",
  "tournament",
] as const;
export type WalletEarningCategory = (typeof WALLET_EARNING_CATEGORIES)[number];
export type WalletOperationKind =
  | "earning_credit"
  | "external_credit"
  | "legacy_opening_import";
export type WalletOperationReason =
  | "initial_required_session"
  | "repeat_session"
  | "mistake_correction"
  | "plan_completion"
  | "dictionary_activity"
  | "irregular_verbs_activity"
  | "tournament_reward"
  | "coin_exchange"
  | "legacy_opening_balance";

export type WalletOperationOrigin =
  | {
      readonly kind: "course";
      readonly courseId: string;
      readonly studyTarget: string;
      readonly requiredSessionOrdinal: number;
    }
  | {
      readonly kind: "mistake_correction";
      readonly studyTarget: "en" | "fr";
      readonly mistakeId: string;
      readonly cycleId: string;
      readonly correctionEventId: string;
    }
  | { readonly kind: "tournament"; readonly tournamentId: string }
  | { readonly kind: "coin_exchange"; readonly tradeId: string }
  | {
      readonly kind: "legacy_opening";
      readonly importVersion: 1;
      readonly sourceSnapshotFingerprint: string;
    };
export interface WalletSourceReceiptRef {
  readonly receiptType:
    | "required_session_credit_settlement"
    | "repeat_reward_settlement"
    | "mistake_correction_composite"
    | "plan_reward_settlement"
    | "dictionary_reward_settlement"
    | "irregular_verbs_reward_settlement"
    | "tournament_reward"
    | "coin_exchange_trade"
    | "legacy_wallet_snapshot";
  readonly receiptId: string;
  readonly receiptFingerprint: string;
}

export interface WalletAuthorizedOperationV1 {
  readonly schemaVersion: "learning-v2-wallet-authorized-operation.v1";
  /** Transport precondition only. A hash or this label is not authentication. */
  readonly authority: "trusted_server_boundary" | "client_authoritative_composite";
  readonly operationId: string;
  readonly semanticSubjectFingerprint: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly currency: "access_star";
  readonly walletRevisionBefore: number;
  readonly kind: WalletOperationKind;
  readonly amountSubunits: number;
  readonly earningCategory: WalletEarningCategory | null;
  readonly operationReason: WalletOperationReason;
  readonly sourceReceiptRef: WalletSourceReceiptRef;
  readonly origin: WalletOperationOrigin;
  readonly semanticFingerprint: string;
  readonly operationFingerprint: string;
}

const BODY_KEYS = [
  "schemaVersion", "authority", "operationId", "semanticSubjectFingerprint",
  "accountScopeHash", "accountGeneration", "currency", "walletRevisionBefore",
  "kind", "amountSubunits", "earningCategory", "operationReason",
  "sourceReceiptRef", "origin",
] as const;
const OPERATION_KEYS = [...BODY_KEYS, "semanticFingerprint", "operationFingerprint"] as const;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const MAX_AMOUNT_SUBUNITS = 1_000_000_000_000;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
export const detachBoundedWalletJson = (input: unknown, code: string): unknown => {
  let nodes = 0;
  let stringUnits = 0;
  const ancestors = new Set<object>();
  const visit = (value: unknown, depth: number): void => {
    nodes += 1;
    if (nodes > 512 || depth > 12) throw new Error(code);
    if (typeof value === "string") {
      stringUnits += value.length;
      if (stringUnits > 65_536) throw new Error(code);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    if (ancestors.has(value)) throw new Error(code);
    ancestors.add(value);
    if (Array.isArray(value)) {
      if (value.length > 64 || Reflect.ownKeys(value).some((key) =>
        typeof key !== "string" || (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key)))) throw new Error(code);
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new Error(code);
        visit(descriptor.value, depth + 1);
      }
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error(code);
      if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) throw new Error(code);
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Object.keys(descriptors);
      if (keys.length > 64) throw new Error(code);
      for (const key of keys) {
        stringUnits += key.length;
        if (stringUnits > 65_536) throw new Error(code);
        const descriptor = descriptors[key];
        if (!("value" in descriptor) || !descriptor.enumerable) throw new Error(code);
        visit(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(value);
  };
  visit(input, 0);
  try { return JSON.parse(canonicalJsonV1(input)) as unknown; } catch { throw new Error(code); }
};
const detached = detachBoundedWalletJson;
export const isWalletIdentifier = (value: unknown): value is string =>
  typeof value === "string" && ID.test(value) && !RESERVED.has(value);
const validId = isWalletIdentifier;
const validHash = (value: unknown): value is string => typeof value === "string" && HASH.test(value);
const validSafe = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum && Number(value) <= maximum;

const parseOrigin = (input: unknown): WalletOperationOrigin => {
  if (!isRecord(input) || typeof input.kind !== "string") throw new Error("wallet_operation_invalid");
  if (input.kind === "course") {
    if (!exactKeys(input, ["kind", "courseId", "studyTarget", "requiredSessionOrdinal"]) ||
      !validId(input.courseId) || !validId(input.studyTarget) ||
      !validSafe(input.requiredSessionOrdinal, 1, 384)) throw new Error("wallet_operation_invalid");
  } else if (input.kind === "tournament") {
    if (!exactKeys(input, ["kind", "tournamentId"]) || !validId(input.tournamentId)) throw new Error("wallet_operation_invalid");
  } else if (input.kind === "coin_exchange") {
    if (!exactKeys(input, ["kind", "tradeId"]) || !validId(input.tradeId)) throw new Error("wallet_operation_invalid");
  } else if (input.kind === "legacy_opening") {
    if (!exactKeys(input, ["kind", "importVersion", "sourceSnapshotFingerprint"]) ||
      input.importVersion !== 1 || !validHash(input.sourceSnapshotFingerprint)) throw new Error("wallet_operation_invalid");
  } else if (input.kind === "mistake_correction") {
    if (!exactKeys(input, ["kind", "studyTarget", "mistakeId", "cycleId", "correctionEventId"]) ||
      (input.studyTarget !== "en" && input.studyTarget !== "fr") ||
      !validId(input.mistakeId) || !validId(input.cycleId) || !validId(input.correctionEventId)) {
      throw new Error("wallet_operation_invalid");
    }
  } else throw new Error("wallet_operation_invalid");
  return input as unknown as WalletOperationOrigin;
};
const parseSourceReceiptRef = (input: unknown): WalletSourceReceiptRef => {
  if (!isRecord(input) || !exactKeys(input, ["receiptType", "receiptId", "receiptFingerprint"]) ||
    !["required_session_credit_settlement", "repeat_reward_settlement", "mistake_correction_composite", "plan_reward_settlement", "dictionary_reward_settlement", "irregular_verbs_reward_settlement", "tournament_reward", "coin_exchange_trade", "legacy_wallet_snapshot"].includes(String(input.receiptType)) ||
    !validId(input.receiptId) || !validHash(input.receiptFingerprint)) throw new Error("wallet_operation_invalid");
  return input as unknown as WalletSourceReceiptRef;
};

const validateCombination = (value: Record<string, unknown>, origin: WalletOperationOrigin): void => {
  if (value.authority === "client_authoritative_composite") {
    const source = value.sourceReceiptRef as WalletSourceReceiptRef;
    if (value.kind !== "earning_credit" || value.earningCategory !== "repeat" ||
      value.operationReason !== "mistake_correction" ||
      Number(value.amountSubunits) !== WALLET_SUBUNITS_PER_STAR ||
      source.receiptType !== "mistake_correction_composite" ||
      origin.kind !== "mistake_correction") throw new Error("wallet_operation_invalid");
    return;
  }
  if (value.operationReason === "mistake_correction" || origin.kind === "mistake_correction") {
    throw new Error("wallet_operation_invalid");
  }
  const category = value.earningCategory;
  if (value.kind === "earning_credit") {
    const categoryByReason: Readonly<Record<string, WalletEarningCategory>> = {
      initial_required_session: "lesson",
      repeat_session: "repeat",
      plan_completion: "plan",
      dictionary_activity: "dictionary",
      irregular_verbs_activity: "irregular_verbs",
      tournament_reward: "tournament",
    };
    const expectedCategory = categoryByReason[String(value.operationReason)];
    if (!expectedCategory || category !== expectedCategory ||
      Number(value.amountSubunits) <= 0) throw new Error("wallet_operation_invalid");
    const tournament = value.operationReason === "tournament_reward";
    if ((tournament && origin.kind !== "tournament") || (!tournament && origin.kind !== "course")) throw new Error("wallet_operation_invalid");
  } else if (value.kind === "external_credit") {
    if (category !== null || value.operationReason !== "coin_exchange" || origin.kind !== "coin_exchange" || Number(value.amountSubunits) <= 0) throw new Error("wallet_operation_invalid");
  } else if (value.kind === "legacy_opening_import") {
    if (category !== null || value.operationReason !== "legacy_opening_balance" || origin.kind !== "legacy_opening") throw new Error("wallet_operation_invalid");
  } else throw new Error("wallet_operation_invalid");
  const source = value.sourceReceiptRef as WalletSourceReceiptRef;
  const sourceTypeByReason: Readonly<Record<string, WalletSourceReceiptRef["receiptType"]>> = {
    initial_required_session: "required_session_credit_settlement",
    repeat_session: "repeat_reward_settlement",
    plan_completion: "plan_reward_settlement",
    dictionary_activity: "dictionary_reward_settlement",
    irregular_verbs_activity: "irregular_verbs_reward_settlement",
    tournament_reward: "tournament_reward",
    coin_exchange: "coin_exchange_trade",
    legacy_opening_balance: "legacy_wallet_snapshot",
  };
  if (source.receiptType !== sourceTypeByReason[String(value.operationReason)]) throw new Error("wallet_operation_invalid");
};

const semanticBody = (value: {
  readonly semanticSubjectFingerprint: string;
  readonly accountScopeHash: string;
  readonly currency: "access_star";
  readonly kind: WalletOperationKind;
  readonly amountSubunits: number;
  readonly earningCategory: WalletEarningCategory | null;
  readonly operationReason: WalletOperationReason;
  readonly sourceReceiptRef: WalletSourceReceiptRef;
  readonly origin: WalletOperationOrigin;
}) => value;

export const deriveWalletSemanticSubjectFingerprint = (input: {
  readonly accountScopeHash: string;
  readonly operationReason: WalletOperationReason;
  readonly sourceReceiptRef: WalletSourceReceiptRef;
}): string => hashCanonicalBody({
  schemaVersion: "learning-v2-wallet-semantic-subject.v1",
  accountScopeHash: input.accountScopeHash,
  currency: "access_star",
  operationReason: input.operationReason,
  sourceReceiptType: input.sourceReceiptRef.receiptType,
  sourceReceiptId: input.sourceReceiptRef.receiptId,
});

export const createWalletAuthorizedOperation = (input: unknown): WalletAuthorizedOperationV1 => {
  const value = detached(input, "wallet_operation_invalid");
  if (!isRecord(value)) throw new Error("wallet_operation_invalid");
  const materialized = Object.prototype.hasOwnProperty.call(value, "operationFingerprint");
  if (!(materialized ? exactKeys(value, OPERATION_KEYS) : exactKeys(value, BODY_KEYS)) ||
    value.schemaVersion !== "learning-v2-wallet-authorized-operation.v1" ||
    (value.authority !== "trusted_server_boundary" && value.authority !== "client_authoritative_composite") ||
    !validId(value.operationId) ||
    !validHash(value.semanticSubjectFingerprint) ||
    typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !validSafe(value.accountGeneration) || value.currency !== "access_star" ||
    !validSafe(value.walletRevisionBefore) ||
    !validSafe(value.amountSubunits, 0, MAX_AMOUNT_SUBUNITS)) throw new Error("wallet_operation_invalid");
  const sourceReceiptRef = parseSourceReceiptRef(value.sourceReceiptRef);
  const origin = parseOrigin(value.origin);
  value.sourceReceiptRef = sourceReceiptRef;
  validateCombination(value, origin);
  const derivedSubject = deriveWalletSemanticSubjectFingerprint({
    accountScopeHash: value.accountScopeHash,
    operationReason: value.operationReason as WalletOperationReason,
    sourceReceiptRef,
  });
  if (value.semanticSubjectFingerprint !== derivedSubject) throw new Error("wallet_operation_invalid");
  const base = {
    schemaVersion: "learning-v2-wallet-authorized-operation.v1" as const,
    authority: value.authority as WalletAuthorizedOperationV1["authority"],
    operationId: value.operationId,
    semanticSubjectFingerprint: value.semanticSubjectFingerprint,
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    currency: "access_star" as const,
    walletRevisionBefore: Number(value.walletRevisionBefore),
    kind: value.kind as WalletOperationKind,
    amountSubunits: Number(value.amountSubunits),
    earningCategory: value.earningCategory as WalletEarningCategory | null,
    operationReason: value.operationReason as WalletOperationReason,
    sourceReceiptRef,
    origin,
  };
  const semantics = semanticBody({
    semanticSubjectFingerprint: base.semanticSubjectFingerprint,
    accountScopeHash: base.accountScopeHash,
    currency: base.currency,
    kind: base.kind,
    amountSubunits: base.amountSubunits,
    earningCategory: base.earningCategory,
    operationReason: base.operationReason,
    sourceReceiptRef: base.sourceReceiptRef,
    origin: base.origin,
  });
  const result = deepFreeze({
    ...base,
    semanticFingerprint: hashCanonicalBody(semantics),
    operationFingerprint: hashCanonicalBody(base),
  });
  if (materialized && (value.semanticFingerprint !== result.semanticFingerprint || value.operationFingerprint !== result.operationFingerprint)) {
    throw new Error("wallet_operation_invalid");
  }
  return result;
};

export const legacyWholeStarsToSubunits = (wholeStars: unknown): number => {
  if (!validSafe(wholeStars) || Number(wholeStars) > MAX_AMOUNT_SUBUNITS / WALLET_SUBUNITS_PER_STAR) {
    throw new Error("legacy_wallet_balance_invalid");
  }
  return Number(wholeStars) * WALLET_SUBUNITS_PER_STAR;
};

export const projectRepeatRewardSubunits = (input: unknown) => {
  const value = detached(input, "repeat_reward_projection_invalid");
  if (!isRecord(value) || !exactKeys(value, ["referenceNextPriceStars", "rateBasisPoints", "policyFingerprint"]) ||
    ![45, 50, 55, 60, 65].includes(Number(value.referenceNextPriceStars)) ||
    !validSafe(value.referenceNextPriceStars, 1) || !validHash(value.policyFingerprint)) {
    throw new Error("repeat_reward_price_invalid");
  }
  if (![0, 500, 1_200, 2_000].includes(Number(value.rateBasisPoints))) throw new Error("repeat_reward_rate_unapproved");
  const rewardSubunits = Number(value.referenceNextPriceStars) * Number(value.rateBasisPoints);
  if (!Number.isSafeInteger(rewardSubunits)) throw new Error("repeat_reward_overflow");
  return deepFreeze({
    schemaVersion: "learning-v2-repeat-reward-subunits.v1" as const,
    referenceNextPriceStars: Number(value.referenceNextPriceStars),
    rateBasisPoints: Number(value.rateBasisPoints),
    policyFingerprint: value.policyFingerprint,
    rewardSubunits,
  });
};
