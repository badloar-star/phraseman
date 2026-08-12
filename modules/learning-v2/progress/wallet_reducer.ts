import {
  WALLET_EARNING_CATEGORIES,
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
  isWalletIdentifier,
  type WalletAuthorizedOperationV1,
  type WalletEarningCategory,
} from "../contracts/wallet";
import { canonicalJsonV1, hashCanonicalBody } from "../policies/decision_registry";

export const MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD = 128 as const;

export type WalletEarningTotals = Readonly<Record<WalletEarningCategory, number>>;

export interface WalletStateV1 {
  readonly schemaVersion: "learning-v2-wallet-state.v1";
  readonly accountScopeHash: string;
  readonly walletIdentityFingerprint: string;
  readonly currency: "access_star";
  readonly unitScale: 10000;
  readonly balanceSubunits: number;
  readonly earnedByCategorySubunits: WalletEarningTotals;
  readonly externalCreditSubunits: number;
  readonly importedOpeningSubunits: number;
  readonly spentSubunits: number;
  readonly revision: number;
  readonly stateFingerprint: string;
}

export interface WalletAppliedReceiptV1 {
  readonly schemaVersion: "learning-v2-wallet-applied-receipt.v1";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly kind: WalletAuthorizedOperationV1["kind"];
  readonly amountSubunits: number;
  readonly authorizedOperation: WalletAuthorizedOperationV1;
  readonly stateBeforeFingerprint: string;
  readonly stateAfterFingerprint: string;
  readonly revisionBefore: number;
  readonly revisionAfter: number;
  readonly balanceBeforeSubunits: number;
  readonly balanceAfterSubunits: number;
  readonly appliedReceiptFingerprint: string;
}

export interface WalletOperationLedgerEntryV1 {
  readonly schemaVersion: "learning-v2-wallet-operation-ledger-entry.v1";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly canonicalOperationId: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly appliedReceipt: WalletAppliedReceiptV1;
}
export interface WalletOperationAliasLedgerEntryV2 {
  readonly schemaVersion: "learning-v2-wallet-operation-alias-ledger-entry.v2";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly canonicalOperationId: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly authorizedAliasOperation: WalletAuthorizedOperationV1;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly aliasEntryFingerprint: string;
}
export type WalletAnyOperationLedgerEntry =
  | WalletOperationLedgerEntryV1
  | WalletOperationAliasLedgerEntryV2;
export interface WalletSubjectLedgerEntryV1 {
  readonly schemaVersion: "learning-v2-wallet-subject-ledger-entry.v1";
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly canonicalOperationId: string;
  readonly appliedReceipt: WalletAppliedReceiptV1;
}
export interface WalletLedgerLookup {
  readonly currentAccountGeneration: number;
  readonly operationLedgerEntry?: WalletAnyOperationLedgerEntry;
  readonly subjectLedgerEntry?: WalletSubjectLedgerEntryV1;
}
export interface WalletReductionResult {
  readonly state: WalletStateV1;
  readonly changed: boolean;
  readonly expectedRevision: number;
  readonly nextRevision: number;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly operationLedgerEntry: WalletOperationLedgerEntryV1;
  readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
  readonly ledgerWriteRequired: boolean;
}

const STATE_KEYS = [
  "schemaVersion", "accountScopeHash", "walletIdentityFingerprint", "currency",
  "unitScale", "balanceSubunits", "earnedByCategorySubunits",
  "externalCreditSubunits", "importedOpeningSubunits", "spentSubunits",
  "revision", "stateFingerprint",
] as const;
const APPLIED_KEYS = [
  "schemaVersion", "operationId", "operationFingerprint", "semanticSubjectFingerprint",
  "semanticFingerprint", "accountScopeHash", "accountGeneration", "kind", "amountSubunits",
  "authorizedOperation", "stateBeforeFingerprint", "stateAfterFingerprint", "revisionBefore",
  "revisionAfter", "balanceBeforeSubunits", "balanceAfterSubunits", "appliedReceiptFingerprint",
] as const;
const OP_LEDGER_KEYS = ["schemaVersion", "operationId", "operationFingerprint", "canonicalOperationId", "semanticSubjectFingerprint", "semanticFingerprint", "appliedReceipt"] as const;
const ALIAS_LEDGER_KEYS = [
  "schemaVersion", "operationId", "operationFingerprint", "canonicalOperationId",
  "semanticSubjectFingerprint", "semanticFingerprint", "authorizedAliasOperation",
  "appliedReceipt", "aliasEntryFingerprint",
] as const;
const SUBJECT_LEDGER_KEYS = ["schemaVersion", "semanticSubjectFingerprint", "semanticFingerprint", "canonicalOperationId", "appliedReceipt"] as const;
const HASH = /^[a-f0-9]{64}$/;
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
const detached = (input: unknown, code: string): unknown => {
  return detachBoundedWalletJson(input, code);
};
const safe = (value: unknown): value is number => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const checkedAdd = (left: number, right: number): number => {
  const value = left + right;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("wallet_arithmetic_overflow");
  return value;
};
const sumEarnings = (earnings: WalletEarningTotals) =>
  WALLET_EARNING_CATEGORIES.reduce((total, category) => checkedAdd(total, earnings[category]), 0);

const stateBody = (value: Omit<WalletStateV1, "stateFingerprint">) => value;
const finalizeState = (body: Omit<WalletStateV1, "stateFingerprint">): WalletStateV1 => {
  const cleanBody = { ...body } as Record<string, unknown>;
  delete cleanBody.stateFingerprint;
  return deepFreeze({
    ...(cleanBody as unknown as Omit<WalletStateV1, "stateFingerprint">),
    stateFingerprint: hashCanonicalBody(cleanBody),
  });
};

export const createWalletState = (input: unknown): WalletStateV1 => {
  const value = detached(input, "wallet_state_invalid");
  if (!isRecord(value) || !exactKeys(value, ["accountScopeHash"]) ||
    typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash)) {
    throw new Error("wallet_state_invalid");
  }
  const accountScopeHash = value.accountScopeHash;
  const earnedByCategorySubunits = Object.fromEntries(
    WALLET_EARNING_CATEGORIES.map((category) => [category, 0]),
  ) as unknown as WalletEarningTotals;
  return finalizeState({
    schemaVersion: "learning-v2-wallet-state.v1",
    accountScopeHash,
    walletIdentityFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-wallet-identity.v1",
      accountScopeHash,
      currency: "access_star",
    }),
    currency: "access_star",
    unitScale: WALLET_SUBUNITS_PER_STAR,
    balanceSubunits: 0,
    earnedByCategorySubunits,
    externalCreditSubunits: 0,
    importedOpeningSubunits: 0,
    spentSubunits: 0,
    revision: 0,
  });
};

export const parseWalletState = (input: unknown): WalletStateV1 => {
  const value = detached(input, "wallet_state_invalid");
  if (!isRecord(value) || !exactKeys(value, STATE_KEYS) ||
    value.schemaVersion !== "learning-v2-wallet-state.v1" ||
    typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    typeof value.walletIdentityFingerprint !== "string" || !HASH.test(value.walletIdentityFingerprint) ||
    value.currency !== "access_star" || value.unitScale !== WALLET_SUBUNITS_PER_STAR ||
    !safe(value.balanceSubunits) || !safe(value.externalCreditSubunits) ||
    !safe(value.importedOpeningSubunits) || !safe(value.spentSubunits) || !safe(value.revision) ||
    typeof value.stateFingerprint !== "string" || !HASH.test(value.stateFingerprint) ||
    !isRecord(value.earnedByCategorySubunits)) {
    throw new Error("wallet_state_invalid");
  }
  const earningsValue = value.earnedByCategorySubunits;
  if (!exactKeys(earningsValue, WALLET_EARNING_CATEGORIES) ||
    !WALLET_EARNING_CATEGORIES.every((category) => safe(earningsValue[category]))) {
    throw new Error("wallet_state_invalid");
  }
  const earnedByCategorySubunits = Object.fromEntries(
    WALLET_EARNING_CATEGORIES.map((category) => [category, Number(earningsValue[category])]),
  ) as unknown as WalletEarningTotals;
  const positive = checkedAdd(
    checkedAdd(sumEarnings(earnedByCategorySubunits), Number(value.externalCreditSubunits)),
    Number(value.importedOpeningSubunits),
  );
  if (positive < Number(value.spentSubunits) || positive - Number(value.spentSubunits) !== Number(value.balanceSubunits)) {
    throw new Error("wallet_state_invalid");
  }
  const body = {
    schemaVersion: "learning-v2-wallet-state.v1" as const,
    accountScopeHash: value.accountScopeHash,
    walletIdentityFingerprint: value.walletIdentityFingerprint,
    currency: "access_star" as const,
    unitScale: WALLET_SUBUNITS_PER_STAR,
    balanceSubunits: Number(value.balanceSubunits),
    earnedByCategorySubunits,
    externalCreditSubunits: Number(value.externalCreditSubunits),
    importedOpeningSubunits: Number(value.importedOpeningSubunits),
    spentSubunits: Number(value.spentSubunits),
    revision: Number(value.revision),
  };
  const expectedIdentity = hashCanonicalBody({
    schemaVersion: "learning-v2-wallet-identity.v1",
    accountScopeHash: body.accountScopeHash,
    currency: body.currency,
  });
  if (body.walletIdentityFingerprint !== expectedIdentity || value.stateFingerprint !== hashCanonicalBody(body)) {
    throw new Error("wallet_state_invalid");
  }
  return deepFreeze({ ...body, stateFingerprint: value.stateFingerprint });
};

const createAppliedReceipt = (
  operation: WalletAuthorizedOperationV1,
  before: WalletStateV1,
  after: WalletStateV1,
): WalletAppliedReceiptV1 => {
  const body = {
    schemaVersion: "learning-v2-wallet-applied-receipt.v1" as const,
    operationId: operation.operationId,
    operationFingerprint: operation.operationFingerprint,
    semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
    semanticFingerprint: operation.semanticFingerprint,
    accountScopeHash: operation.accountScopeHash,
    accountGeneration: operation.accountGeneration,
    kind: operation.kind,
    amountSubunits: operation.amountSubunits,
    authorizedOperation: operation,
    stateBeforeFingerprint: before.stateFingerprint,
    stateAfterFingerprint: after.stateFingerprint,
    revisionBefore: before.revision,
    revisionAfter: after.revision,
    balanceBeforeSubunits: before.balanceSubunits,
    balanceAfterSubunits: after.balanceSubunits,
  };
  return deepFreeze({ ...body, appliedReceiptFingerprint: hashCanonicalBody(body) });
};
const makeOperationEntry = (
  operation: WalletAuthorizedOperationV1,
  canonicalOperationId: string,
  appliedReceipt: WalletAppliedReceiptV1,
): WalletOperationLedgerEntryV1 => deepFreeze({
  schemaVersion: "learning-v2-wallet-operation-ledger-entry.v1",
  operationId: operation.operationId,
  operationFingerprint: operation.operationFingerprint,
  canonicalOperationId,
  semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
  semanticFingerprint: operation.semanticFingerprint,
  appliedReceipt,
});
const makeSubjectEntry = (
  operation: WalletAuthorizedOperationV1,
  canonicalOperationId: string,
  appliedReceipt: WalletAppliedReceiptV1,
): WalletSubjectLedgerEntryV1 => deepFreeze({
  schemaVersion: "learning-v2-wallet-subject-ledger-entry.v1",
  semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
  semanticFingerprint: operation.semanticFingerprint,
  canonicalOperationId,
  appliedReceipt,
});

/**
 * Reconstructs the only canonical lifetime-index values authorized by a strict
 * wallet receipt. Repair/journal callers must use this derivation instead of
 * accepting an index value or value fingerprint from transport input.
 */
export const createWalletCanonicalLedgerEntriesFromAppliedReceipt = (
  input: unknown,
): Readonly<{
  readonly operationLedgerEntry: WalletOperationLedgerEntryV1;
  readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
  readonly appliedReceipt: WalletAppliedReceiptV1;
}> => {
  const appliedReceipt = parseWalletAppliedReceipt(input);
  const operation = appliedReceipt.authorizedOperation;
  return deepFreeze({
    operationLedgerEntry: makeOperationEntry(
      operation,
      appliedReceipt.operationId,
      appliedReceipt,
    ),
    subjectLedgerEntry: makeSubjectEntry(
      operation,
      appliedReceipt.operationId,
      appliedReceipt,
    ),
    appliedReceipt,
  });
};

export const parseWalletAppliedReceipt = (input: unknown): WalletAppliedReceiptV1 => {
  const value = detached(input, "wallet_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, APPLIED_KEYS) ||
    value.schemaVersion !== "learning-v2-wallet-applied-receipt.v1" ||
    !isRecord(value.authorizedOperation) ||
    !Object.prototype.hasOwnProperty.call(value.authorizedOperation, "semanticFingerprint") ||
    !Object.prototype.hasOwnProperty.call(value.authorizedOperation, "operationFingerprint") ||
    typeof value.appliedReceiptFingerprint !== "string" || !HASH.test(value.appliedReceiptFingerprint)) {
    throw new Error("wallet_ledger_invalid");
  }
  const authorizedOperation = createWalletAuthorizedOperation(value.authorizedOperation);
  const { appliedReceiptFingerprint, ...body } = value;
  if (hashCanonicalBody(body) !== appliedReceiptFingerprint ||
    value.operationId !== authorizedOperation.operationId ||
    value.operationFingerprint !== authorizedOperation.operationFingerprint ||
    value.semanticSubjectFingerprint !== authorizedOperation.semanticSubjectFingerprint ||
    value.semanticFingerprint !== authorizedOperation.semanticFingerprint ||
    value.accountScopeHash !== authorizedOperation.accountScopeHash ||
    value.accountGeneration !== authorizedOperation.accountGeneration ||
    value.kind !== authorizedOperation.kind || value.amountSubunits !== authorizedOperation.amountSubunits ||
    !safe(value.revisionBefore) || !safe(value.revisionAfter) ||
    Number(value.revisionAfter) !== Number(value.revisionBefore) + 1 ||
    !safe(value.balanceBeforeSubunits) || !safe(value.balanceAfterSubunits) ||
    Number(value.balanceAfterSubunits) !== Number(value.balanceBeforeSubunits) + authorizedOperation.amountSubunits ||
    value.revisionBefore !== authorizedOperation.walletRevisionBefore ||
    typeof value.stateBeforeFingerprint !== "string" || !HASH.test(value.stateBeforeFingerprint) ||
    typeof value.stateAfterFingerprint !== "string" || !HASH.test(value.stateAfterFingerprint)) {
    throw new Error("wallet_ledger_invalid");
  }
  return deepFreeze({ ...(body as unknown as Omit<WalletAppliedReceiptV1, "appliedReceiptFingerprint">), authorizedOperation, appliedReceiptFingerprint });
};
export const parseWalletOperationLedgerEntry = (input: unknown): WalletOperationLedgerEntryV1 => {
  const value = detached(input, "wallet_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, OP_LEDGER_KEYS) || value.schemaVersion !== "learning-v2-wallet-operation-ledger-entry.v1") throw new Error("wallet_ledger_invalid");
  const appliedReceipt = parseWalletAppliedReceipt(value.appliedReceipt);
  if (!isWalletIdentifier(value.operationId) || !isWalletIdentifier(value.canonicalOperationId) ||
    typeof value.operationFingerprint !== "string" || !HASH.test(value.operationFingerprint) ||
    value.canonicalOperationId !== appliedReceipt.operationId || value.semanticSubjectFingerprint !== appliedReceipt.semanticSubjectFingerprint ||
    value.semanticFingerprint !== appliedReceipt.semanticFingerprint ||
    (value.operationId === value.canonicalOperationId && value.operationFingerprint !== appliedReceipt.operationFingerprint)) throw new Error("wallet_ledger_invalid");
  return deepFreeze({ ...value, appliedReceipt } as unknown as WalletOperationLedgerEntryV1);
};
export const createWalletOperationAliasLedgerEntry = (input: unknown): WalletOperationAliasLedgerEntryV2 => {
  const value = detached(input, "wallet_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, ["authorizedAliasOperation", "appliedReceipt"])) {
    throw new Error("wallet_ledger_invalid");
  }
  const authorizedAliasOperation = createWalletAuthorizedOperation(value.authorizedAliasOperation);
  const appliedReceipt = parseWalletAppliedReceipt(value.appliedReceipt);
  if (
    authorizedAliasOperation.accountScopeHash !== appliedReceipt.accountScopeHash ||
    authorizedAliasOperation.operationId === appliedReceipt.operationId ||
    authorizedAliasOperation.operationFingerprint === appliedReceipt.operationFingerprint ||
    authorizedAliasOperation.semanticSubjectFingerprint !== appliedReceipt.semanticSubjectFingerprint ||
    authorizedAliasOperation.semanticFingerprint !== appliedReceipt.semanticFingerprint
  ) throw new Error("wallet_ledger_invalid");
  const body = {
    schemaVersion: "learning-v2-wallet-operation-alias-ledger-entry.v2" as const,
    operationId: authorizedAliasOperation.operationId,
    operationFingerprint: authorizedAliasOperation.operationFingerprint,
    canonicalOperationId: appliedReceipt.operationId,
    semanticSubjectFingerprint: appliedReceipt.semanticSubjectFingerprint,
    semanticFingerprint: appliedReceipt.semanticFingerprint,
    authorizedAliasOperation,
    appliedReceipt,
  };
  return deepFreeze({ ...body, aliasEntryFingerprint: hashCanonicalBody(body) });
};
export const parseWalletOperationAliasLedgerEntry = (input: unknown): WalletOperationAliasLedgerEntryV2 => {
  const value = detached(input, "wallet_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, ALIAS_LEDGER_KEYS) ||
    value.schemaVersion !== "learning-v2-wallet-operation-alias-ledger-entry.v2" ||
    typeof value.aliasEntryFingerprint !== "string" || !HASH.test(value.aliasEntryFingerprint)) {
    throw new Error("wallet_ledger_invalid");
  }
  const rebuilt = createWalletOperationAliasLedgerEntry({
    authorizedAliasOperation: value.authorizedAliasOperation,
    appliedReceipt: value.appliedReceipt,
  });
  if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(value)) throw new Error("wallet_ledger_invalid");
  return rebuilt;
};
const parseWalletAnyOperationLedgerEntry = (input: unknown): WalletAnyOperationLedgerEntry => {
  const value = detached(input, "wallet_ledger_invalid");
  if (!isRecord(value)) throw new Error("wallet_ledger_invalid");
  return value.schemaVersion === "learning-v2-wallet-operation-alias-ledger-entry.v2"
    ? parseWalletOperationAliasLedgerEntry(value)
    : parseWalletOperationLedgerEntry(value);
};
export const parseWalletSubjectLedgerEntry = (input: unknown): WalletSubjectLedgerEntryV1 => {
  const value = detached(input, "wallet_ledger_invalid");
  if (!isRecord(value) || !exactKeys(value, SUBJECT_LEDGER_KEYS) || value.schemaVersion !== "learning-v2-wallet-subject-ledger-entry.v1") throw new Error("wallet_ledger_invalid");
  const appliedReceipt = parseWalletAppliedReceipt(value.appliedReceipt);
  if (!isWalletIdentifier(value.canonicalOperationId) ||
    value.canonicalOperationId !== appliedReceipt.operationId || value.semanticSubjectFingerprint !== appliedReceipt.semanticSubjectFingerprint ||
    value.semanticFingerprint !== appliedReceipt.semanticFingerprint) throw new Error("wallet_ledger_invalid");
  return deepFreeze({ ...value, appliedReceipt } as unknown as WalletSubjectLedgerEntryV1);
};

export const reduceAuthorizedWalletOperation = (
  inputState: unknown,
  inputOperation: unknown,
  lookup: WalletLedgerLookup,
): WalletReductionResult => {
  const state = parseWalletState(inputState);
  const lookupValue = detached(lookup, "wallet_ledger_invalid");
  if (!isRecord(lookupValue) ||
    !Object.keys(lookupValue).every((key) => ["currentAccountGeneration", "operationLedgerEntry", "subjectLedgerEntry"].includes(key)) ||
    !Object.prototype.hasOwnProperty.call(lookupValue, "currentAccountGeneration")) {
    throw new Error("wallet_ledger_invalid");
  }
  if (!isRecord(inputOperation) ||
    !Object.prototype.hasOwnProperty.call(inputOperation, "semanticFingerprint") ||
    !Object.prototype.hasOwnProperty.call(inputOperation, "operationFingerprint")) {
    throw new Error("wallet_operation_invalid");
  }
  const operation = createWalletAuthorizedOperation(inputOperation);
  if (!safe(lookupValue.currentAccountGeneration) || operation.accountGeneration !== lookupValue.currentAccountGeneration) {
    throw new Error("wallet_generation_stale");
  }
  if (operation.accountScopeHash !== state.accountScopeHash) throw new Error("wallet_scope_mismatch");
  const byOperation = Object.prototype.hasOwnProperty.call(lookupValue, "operationLedgerEntry")
    ? parseWalletAnyOperationLedgerEntry(lookupValue.operationLedgerEntry)
    : undefined;
  const parsedSubject = Object.prototype.hasOwnProperty.call(lookupValue, "subjectLedgerEntry")
    ? parseWalletSubjectLedgerEntry(lookupValue.subjectLedgerEntry)
    : undefined;
  if (byOperation && parsedSubject && (
    byOperation.canonicalOperationId !== parsedSubject.canonicalOperationId ||
    byOperation.semanticFingerprint !== parsedSubject.semanticFingerprint ||
    byOperation.appliedReceipt.appliedReceiptFingerprint !== parsedSubject.appliedReceipt.appliedReceiptFingerprint
  )) throw new Error("wallet_ledger_invalid");
  if (byOperation) {
    if (byOperation.operationId !== operation.operationId ||
      byOperation.operationFingerprint !== operation.operationFingerprint ||
      byOperation.semanticSubjectFingerprint !== operation.semanticSubjectFingerprint ||
      byOperation.semanticFingerprint !== operation.semanticFingerprint) throw new Error("wallet_operation_conflict");
    const canonicalReceipt = byOperation.appliedReceipt;
    const resultOperationEntry =
      byOperation.schemaVersion ===
      "learning-v2-wallet-operation-alias-ledger-entry.v2"
        ? makeOperationEntry(
            operation,
            byOperation.canonicalOperationId,
            canonicalReceipt,
          )
        : byOperation;
    if (state.revision === canonicalReceipt.revisionBefore) {
      if (state.stateFingerprint !== canonicalReceipt.stateBeforeFingerprint) throw new Error("wallet_projection_indeterminate");
      const repaired = reduceAuthorizedWalletOperation(state, canonicalReceipt.authorizedOperation, {
        currentAccountGeneration: canonicalReceipt.accountGeneration,
      });
      if (repaired.state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint ||
        repaired.appliedReceipt.appliedReceiptFingerprint !== canonicalReceipt.appliedReceiptFingerprint) {
        throw new Error("wallet_ledger_invalid");
      }
      return deepFreeze({ ...repaired, appliedReceipt: canonicalReceipt, operationLedgerEntry: resultOperationEntry, ledgerWriteRequired: !parsedSubject,
      subjectLedgerEntry: parsedSubject ?? makeSubjectEntry(operation, byOperation.canonicalOperationId, canonicalReceipt) });
    }
    if (state.revision === canonicalReceipt.revisionAfter && state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint) throw new Error("wallet_projection_indeterminate");
    if (state.revision < canonicalReceipt.revisionAfter) throw new Error("wallet_projection_indeterminate");
    return deepFreeze({
      state, changed: false, expectedRevision: state.revision, nextRevision: state.revision,
      appliedReceipt: byOperation.appliedReceipt,
      operationLedgerEntry: resultOperationEntry,
      subjectLedgerEntry: parsedSubject ?? makeSubjectEntry(operation, byOperation.canonicalOperationId, byOperation.appliedReceipt),
      ledgerWriteRequired: !parsedSubject,
    });
  }
  const bySubject = parsedSubject;
  if (bySubject) {
    if (bySubject.semanticSubjectFingerprint !== operation.semanticSubjectFingerprint ||
      bySubject.semanticFingerprint !== operation.semanticFingerprint) throw new Error("wallet_operation_conflict");
    const canonicalReceipt = bySubject.appliedReceipt;
    if (operation.operationId === bySubject.canonicalOperationId &&
      operation.operationFingerprint !== canonicalReceipt.operationFingerprint) {
      throw new Error("wallet_operation_conflict");
    }
    if (state.revision === canonicalReceipt.revisionBefore) {
      if (state.stateFingerprint !== canonicalReceipt.stateBeforeFingerprint) throw new Error("wallet_projection_indeterminate");
      const repaired = reduceAuthorizedWalletOperation(state, canonicalReceipt.authorizedOperation, {
        currentAccountGeneration: canonicalReceipt.accountGeneration,
      });
      if (repaired.state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint ||
        repaired.appliedReceipt.appliedReceiptFingerprint !== canonicalReceipt.appliedReceiptFingerprint) {
        throw new Error("wallet_ledger_invalid");
      }
      return deepFreeze({ ...repaired, appliedReceipt: canonicalReceipt, ledgerWriteRequired: true,
        operationLedgerEntry: makeOperationEntry(operation, bySubject.canonicalOperationId, canonicalReceipt),
        subjectLedgerEntry: bySubject });
    }
    if (state.revision === canonicalReceipt.revisionAfter && state.stateFingerprint !== canonicalReceipt.stateAfterFingerprint) throw new Error("wallet_projection_indeterminate");
    if (state.revision < canonicalReceipt.revisionAfter) throw new Error("wallet_projection_indeterminate");
    return deepFreeze({
      state, changed: false, expectedRevision: state.revision, nextRevision: state.revision,
      appliedReceipt: bySubject.appliedReceipt,
      operationLedgerEntry: makeOperationEntry(operation, bySubject.canonicalOperationId, bySubject.appliedReceipt),
      subjectLedgerEntry: bySubject,
      ledgerWriteRequired: true,
    });
  }
  if (operation.walletRevisionBefore !== state.revision) throw new Error("wallet_operation_out_of_order");
  const earnedByCategorySubunits = { ...state.earnedByCategorySubunits };
  let externalCreditSubunits = state.externalCreditSubunits;
  let importedOpeningSubunits = state.importedOpeningSubunits;
  if (operation.kind === "earning_credit") {
    const category = operation.earningCategory!;
    earnedByCategorySubunits[category] = checkedAdd(earnedByCategorySubunits[category], operation.amountSubunits);
  } else if (operation.kind === "external_credit") {
    externalCreditSubunits = checkedAdd(externalCreditSubunits, operation.amountSubunits);
  } else {
    importedOpeningSubunits = checkedAdd(importedOpeningSubunits, operation.amountSubunits);
  }
  const nextState = finalizeState({
    ...state,
    earnedByCategorySubunits,
    externalCreditSubunits,
    importedOpeningSubunits,
    balanceSubunits: checkedAdd(state.balanceSubunits, operation.amountSubunits),
    revision: checkedAdd(state.revision, 1),
  });
  const appliedReceipt = createAppliedReceipt(operation, state, nextState);
  const operationLedgerEntry = makeOperationEntry(operation, operation.operationId, appliedReceipt);
  const subjectLedgerEntry = makeSubjectEntry(operation, operation.operationId, appliedReceipt);
  return deepFreeze({
    state: nextState, changed: true, expectedRevision: state.revision, nextRevision: nextState.revision,
    appliedReceipt, operationLedgerEntry, subjectLedgerEntry, ledgerWriteRequired: true,
  });
};

export const selectWalletPublicProjection = (input: unknown) => {
  const state = parseWalletState(input);
  return deepFreeze({
    schemaVersion: "learning-v2-wallet-public-projection.v1" as const,
    currency: state.currency,
    unitScale: state.unitScale,
    balanceSubunits: state.balanceSubunits,
    earnedByCategorySubunits: state.earnedByCategorySubunits,
  });
};

/**
 * Rebuilds exactly one confirmed credit/import transition from its self-contained
 * audit receipt. The caller folds a paged journal in revision order; gaps,
 * duplicates and alternate branches fail closed instead of being silently skipped.
 */
const rebuildWalletStateFromAppliedReceiptUnchecked = (
  inputState: unknown,
  inputReceipt: unknown,
): WalletStateV1 => {
  const state = parseWalletState(inputState);
  const receipt = parseWalletAppliedReceipt(inputReceipt);
  if (receipt.accountScopeHash !== state.accountScopeHash) throw new Error("wallet_receipt_scope_mismatch");
  if (state.revision !== receipt.revisionBefore ||
    state.stateFingerprint !== receipt.stateBeforeFingerprint ||
    state.balanceSubunits !== receipt.balanceBeforeSubunits) {
    throw new Error("wallet_receipt_rebuild_out_of_order");
  }
  const rebuilt = reduceAuthorizedWalletOperation(state, receipt.authorizedOperation, {
    currentAccountGeneration: receipt.accountGeneration,
  });
  if (!rebuilt.changed ||
    rebuilt.state.revision !== receipt.revisionAfter ||
    rebuilt.state.balanceSubunits !== receipt.balanceAfterSubunits ||
    rebuilt.state.stateFingerprint !== receipt.stateAfterFingerprint ||
    rebuilt.appliedReceipt.appliedReceiptFingerprint !== receipt.appliedReceiptFingerprint) {
    throw new Error("wallet_ledger_invalid");
  }
  return rebuilt.state;
};

/**
 * Audits and rebuilds one bounded canonical credit/import journal page. Each
 * receipt is parsed independently, so legitimate pages are not constrained by the
 * generic 64-element JSON-array guard. The P2.2 repository owns cross-page indexes;
 * this pure helper intentionally cannot resume production writes by itself.
 */
export const rebuildWalletStateFromAppliedReceipts = (input: unknown): WalletStateV1 => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new Error("wallet_receipt_history_invalid");
  }
  if (Reflect.ownKeys(input).length !== 2 ||
    Reflect.ownKeys(input).some((key) => typeof key !== "string" ||
      !["startingState", "canonicalAppliedReceipts"].includes(key))) {
    throw new Error("wallet_receipt_history_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (!exactKeys(descriptors as unknown as Record<string, unknown>, ["startingState", "canonicalAppliedReceipts"]) ||
    !Object.values(descriptors).every((descriptor) => "value" in descriptor && descriptor.enumerable)) {
    throw new Error("wallet_receipt_history_invalid");
  }
  const startingState = parseWalletState(descriptors.startingState.value);
  const rawReceipts = descriptors.canonicalAppliedReceipts.value;
  if (!Array.isArray(rawReceipts) || rawReceipts.length > MAX_WALLET_RECEIPTS_PER_AUDIT_REBUILD ||
    Reflect.ownKeys(rawReceipts).some((key) => typeof key !== "string" ||
      (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key)))) {
    throw new Error("wallet_receipt_history_invalid");
  }
  const parsedReceipts: WalletAppliedReceiptV1[] = [];
  for (let index = 0; index < rawReceipts.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(rawReceipts, String(index));
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new Error("wallet_receipt_history_invalid");
    }
    parsedReceipts.push(parseWalletAppliedReceipt(descriptor.value));
  }
  const state0 = startingState;
  const ordered = [...parsedReceipts].sort((left, right) => left.revisionBefore - right.revisionBefore);
  const operationIds = new Set<string>();
  const operationFingerprints = new Set<string>();
  const semanticSubjects = new Set<string>();
  const receiptFingerprints = new Set<string>();
  let state = state0;
  for (const receipt of ordered) {
    if (receipt.accountScopeHash !== state0.accountScopeHash ||
      operationIds.has(receipt.operationId) || operationFingerprints.has(receipt.operationFingerprint) ||
      semanticSubjects.has(receipt.semanticSubjectFingerprint) ||
      receiptFingerprints.has(receipt.appliedReceiptFingerprint)) {
      throw new Error("wallet_receipt_history_invalid");
    }
    operationIds.add(receipt.operationId);
    operationFingerprints.add(receipt.operationFingerprint);
    semanticSubjects.add(receipt.semanticSubjectFingerprint);
    receiptFingerprints.add(receipt.appliedReceiptFingerprint);
    const before = state;
    state = rebuildWalletStateFromAppliedReceiptUnchecked(state, receipt);
    const regenerated = createAppliedReceipt(receipt.authorizedOperation, before, state);
    if (canonicalJsonV1(regenerated) !== canonicalJsonV1(receipt)) {
      throw new Error("wallet_ledger_invalid");
    }
  }
  return state;
};
