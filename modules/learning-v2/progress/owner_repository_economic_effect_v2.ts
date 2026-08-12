import {
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
  isWalletIdentifier,
  type WalletAuthorizedOperationV1,
} from "../contracts/wallet";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type {
  OwnerRepositoryBlobRefV1,
} from "./owner_repository";
import {
  createWalletCanonicalLedgerEntriesFromAppliedReceipt,
  createWalletOperationAliasLedgerEntry,
  parseWalletAppliedReceipt,
  parseWalletOperationAliasLedgerEntry,
  parseWalletOperationLedgerEntry,
  parseWalletSubjectLedgerEntry,
  type WalletAppliedReceiptV1,
  type WalletOperationLedgerEntryV1,
  type WalletOperationAliasLedgerEntryV2,
  type WalletSubjectLedgerEntryV1,
} from "./wallet_reducer";

export interface OwnerRepositoryWalletCreditEffectRecordV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-wallet-credit-effect-record.v2";
  readonly recordKind: "wallet_credit";
  readonly accountScopeHash: string;
  readonly acceptedAccountGeneration: number;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly canonicalOperationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly appliedReceiptFingerprint: string;
  readonly walletStateBeforeFingerprint: string;
  readonly walletStateAfterFingerprint: string;
  readonly walletStateBeforeRef: OwnerRepositoryBlobRefV1;
  readonly walletStateAfterRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly journalRecordFingerprint: string;
}

export interface OwnerRepositoryWalletCreditEffectRecordBlobV2 {
  readonly ref: OwnerRepositoryBlobRefV1 & { readonly kind: "journal_record" };
  readonly encoded: string;
  readonly record: OwnerRepositoryWalletCreditEffectRecordV2;
}

export interface OwnerRepositoryOperationAliasRecordV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-operation-alias-record.v2";
  readonly recordKind: "operation_alias";
  readonly accountScopeHash: string;
  readonly acceptedAccountGeneration: number;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectBinding: OwnerRepositoryCanonicalEffectBindingV2;
  readonly aliasValue: OwnerRepositoryOperationAliasIndexValueV2;
  readonly journalRecordFingerprint: string;
}

export interface OwnerRepositoryOperationAliasRecordBlobV2 {
  readonly ref: OwnerRepositoryBlobRefV1 & { readonly kind: "journal_record" };
  readonly encoded: string;
  readonly record: OwnerRepositoryOperationAliasRecordV2;
}

export interface OwnerRepositoryCanonicalEffectBindingV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-canonical-effect-binding.v2";
  readonly effectKind: "wallet_credit";
  readonly accountScopeHash: string;
  readonly acceptedAccountGeneration: number;
  readonly effectJournalSequence: number;
  readonly canonicalEffectJournalRecordRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectJournalRecordFingerprint: string;
  readonly canonicalOperationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly appliedReceiptFingerprint: string;
  readonly bindingFingerprint: string;
}

export interface OwnerRepositoryCanonicalOperationIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-canonical-operation-index-value.v2";
  readonly valueKind: "canonical_operation";
  readonly ledgerEntry: WalletOperationLedgerEntryV1;
  readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
  readonly valueFingerprint: string;
}

export interface OwnerRepositoryCanonicalSubjectIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-canonical-subject-index-value.v2";
  readonly valueKind: "canonical_subject";
  readonly ledgerEntry: WalletSubjectLedgerEntryV1;
  readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
  readonly valueFingerprint: string;
}

export interface OwnerRepositoryOperationAliasIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-operation-alias-index-value.v2";
  readonly valueKind: "operation_alias";
  readonly ledgerEntry: WalletOperationAliasLedgerEntryV2;
  readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
  readonly valueFingerprint: string;
}

export interface OwnerRepositoryCanonicalReceiptIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-canonical-receipt-index-value.v2";
  readonly valueKind: "canonical_receipt";
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
  readonly valueFingerprint: string;
}

export type OwnerRepositoryCanonicalEconomicIndexValueV2 =
  | OwnerRepositoryCanonicalOperationIndexValueV2
  | OwnerRepositoryOperationAliasIndexValueV2
  | OwnerRepositoryCanonicalSubjectIndexValueV2
  | OwnerRepositoryCanonicalReceiptIndexValueV2;

export interface OwnerRepositoryCanonicalEconomicIndexValuesV2 {
  readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
  readonly operationValue: OwnerRepositoryCanonicalOperationIndexValueV2;
  readonly subjectValue: OwnerRepositoryCanonicalSubjectIndexValueV2;
  readonly receiptValue: OwnerRepositoryCanonicalReceiptIndexValueV2;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BLOB_BYTES = 512 * 1024;
const REF_KEYS = [
  "schemaVersion",
  "kind",
  "blobKey",
  "blobFingerprint",
] as const;
const CREATE_KEYS = [
  "accountScopeHash",
  "journalSequence",
  "repositoryRevisionBefore",
  "rootBeforeFingerprint",
  "previousJournalRecordRef",
  "walletStateBeforeRef",
  "walletStateAfterRef",
  "operationIndexManifestBeforeRef",
  "subjectIndexManifestBeforeRef",
  "receiptIndexManifestBeforeRef",
  "appliedReceipt",
] as const;
const RECORD_KEYS = [
  "schemaVersion",
  "recordKind",
  "accountScopeHash",
  "acceptedAccountGeneration",
  "journalSequence",
  "repositoryRevisionBefore",
  "rootBeforeFingerprint",
  "previousJournalRecordRef",
  "canonicalOperationId",
  "operationFingerprint",
  "semanticSubjectFingerprint",
  "semanticFingerprint",
  "appliedReceiptFingerprint",
  "walletStateBeforeFingerprint",
  "walletStateAfterFingerprint",
  "walletStateBeforeRef",
  "walletStateAfterRef",
  "operationIndexManifestBeforeRef",
  "subjectIndexManifestBeforeRef",
  "receiptIndexManifestBeforeRef",
  "appliedReceipt",
  "journalRecordFingerprint",
] as const;
const ENVELOPE_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "kind",
  "payload",
] as const;
const BINDING_KEYS = [
  "schemaVersion",
  "effectKind",
  "accountScopeHash",
  "acceptedAccountGeneration",
  "effectJournalSequence",
  "canonicalEffectJournalRecordRef",
  "canonicalEffectJournalRecordFingerprint",
  "canonicalOperationId",
  "operationFingerprint",
  "semanticSubjectFingerprint",
  "semanticFingerprint",
  "appliedReceiptFingerprint",
  "bindingFingerprint",
] as const;
const OPERATION_VALUE_KEYS = [
  "schemaVersion",
  "valueKind",
  "ledgerEntry",
  "effectBinding",
  "valueFingerprint",
] as const;
const ALIAS_VALUE_KEYS = OPERATION_VALUE_KEYS;
const SUBJECT_VALUE_KEYS = OPERATION_VALUE_KEYS;
const RECEIPT_VALUE_KEYS = [
  "schemaVersion",
  "valueKind",
  "appliedReceipt",
  "effectBinding",
  "valueFingerprint",
] as const;
const ALIAS_RECORD_CREATE_KEYS = [
  "accountScopeHash",
  "journalSequence",
  "repositoryRevisionBefore",
  "rootBeforeFingerprint",
  "previousJournalRecordRef",
  "walletStateRef",
  "operationIndexManifestBeforeRef",
  "operationIndexManifestAfterRef",
  "subjectIndexManifestRef",
  "receiptIndexManifestRef",
  "aliasValue",
] as const;
const ALIAS_RECORD_KEYS = [
  "schemaVersion",
  "recordKind",
  "accountScopeHash",
  "acceptedAccountGeneration",
  "journalSequence",
  "repositoryRevisionBefore",
  "rootBeforeFingerprint",
  "previousJournalRecordRef",
  "walletStateRef",
  "operationIndexManifestBeforeRef",
  "operationIndexManifestAfterRef",
  "subjectIndexManifestRef",
  "receiptIndexManifestRef",
  "canonicalEffectBinding",
  "aliasValue",
  "journalRecordFingerprint",
] as const;

const invalid = (): never => {
  throw new Error("owner_repository_economic_effect_v2_invalid");
};
const indeterminate = (): never => {
  throw new Error("owner_repository_economic_effect_v2_indeterminate");
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean => {
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    own.every((key) => typeof key === "string" && keys.includes(key))
  );
};
const safe = (value: unknown, minimum = 0): value is number =>
  Number.isSafeInteger(value) &&
  !Object.is(value, -0) &&
  Number(value) >= minimum;
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const deepFreeze = <T>(value: T): T => {
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (
      typeof current !== "object" ||
      current === null ||
      seen.has(current)
    )
      continue;
    seen.add(current);
    Object.freeze(current);
    for (const child of Object.values(current as Record<string, unknown>)) {
      stack.push(child);
    }
  }
  return value;
};
const readRecord = (
  input: unknown,
  keys: readonly string[],
  code: "invalid" | "indeterminate" = "invalid",
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    return code === "invalid" ? invalid() : indeterminate();
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key)) ||
    keys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })
  ) {
    return code === "invalid" ? invalid() : indeterminate();
  }
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};
const detachRecord = (
  input: unknown,
  keys: readonly string[],
  stored = false,
): Readonly<Record<string, unknown>> => {
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      input,
      stored
        ? "owner_repository_economic_effect_v2_indeterminate"
        : "owner_repository_economic_effect_v2_invalid",
    );
  } catch {
    return stored ? indeterminate() : invalid();
  }
  return readRecord(detached, keys, stored ? "indeterminate" : "invalid");
};
const blobKey = (accountScopeHash: string, fingerprint: string): string =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseRef = (
  input: unknown,
  accountScopeHash: string,
  kind: OwnerRepositoryBlobRefV1["kind"],
  stored = false,
): OwnerRepositoryBlobRefV1 => {
  const value = readRecord(
    input,
    REF_KEYS,
    stored ? "indeterminate" : "invalid",
  );
  if (
    value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    value.kind !== kind ||
    typeof value.blobFingerprint !== "string" ||
    !HASH.test(value.blobFingerprint) ||
    value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)
  ) {
    return stored ? indeterminate() : invalid();
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
    kind,
    blobKey: value.blobKey as string,
    blobFingerprint: value.blobFingerprint,
  });
};

const parseCoordinates = (input: unknown, stored: boolean) => {
  const value = detachRecord(input, stored ? RECORD_KEYS : CREATE_KEYS, stored);
  if (
    typeof value.accountScopeHash !== "string" ||
    !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.journalSequence, 1) ||
    !safe(value.repositoryRevisionBefore) ||
    value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
    typeof value.rootBeforeFingerprint !== "string" ||
    !HASH.test(value.rootBeforeFingerprint)
  ) {
    return stored ? indeterminate() : invalid();
  }
  const accountScopeHash = value.accountScopeHash;
  const journalSequence = Number(value.journalSequence);
  const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
  if (journalSequence - 1 > repositoryRevisionBefore) {
    return stored ? indeterminate() : invalid();
  }
  const previousJournalRecordRef =
    value.previousJournalRecordRef === null
      ? null
      : parseRef(
          value.previousJournalRecordRef,
          accountScopeHash,
          "journal_record",
          stored,
        );
  if ((journalSequence === 1) !== (previousJournalRecordRef === null)) {
    return stored ? indeterminate() : invalid();
  }
  return {
    value,
    accountScopeHash,
    journalSequence,
    repositoryRevisionBefore,
    rootBeforeFingerprint: value.rootBeforeFingerprint as string,
    previousJournalRecordRef,
    walletStateBeforeRef: parseRef(
      value.walletStateBeforeRef,
      accountScopeHash,
      "wallet_state",
      stored,
    ),
    walletStateAfterRef: parseRef(
      value.walletStateAfterRef,
      accountScopeHash,
      "wallet_state",
      stored,
    ),
    operationIndexManifestBeforeRef: parseRef(
      value.operationIndexManifestBeforeRef,
      accountScopeHash,
      "operation_index_manifest",
      stored,
    ),
    subjectIndexManifestBeforeRef: parseRef(
      value.subjectIndexManifestBeforeRef,
      accountScopeHash,
      "subject_index_manifest",
      stored,
    ),
    receiptIndexManifestBeforeRef: parseRef(
      value.receiptIndexManifestBeforeRef,
      accountScopeHash,
      "receipt_index_manifest",
      stored,
    ),
  };
};

export const createOwnerRepositoryWalletCreditEffectRecordV2 = (
  input: unknown,
): OwnerRepositoryWalletCreditEffectRecordV2 => {
  const parsed = parseCoordinates(input, false);
  let appliedReceipt: WalletAppliedReceiptV1;
  try {
    appliedReceipt = parseWalletAppliedReceipt(parsed.value.appliedReceipt);
  } catch {
    return invalid();
  }
  const refs = [
    parsed.walletStateBeforeRef,
    parsed.walletStateAfterRef,
    parsed.operationIndexManifestBeforeRef,
    parsed.subjectIndexManifestBeforeRef,
    parsed.receiptIndexManifestBeforeRef,
    ...(parsed.previousJournalRecordRef
      ? [parsed.previousJournalRecordRef]
      : []),
  ];
  if (
    appliedReceipt.accountScopeHash !== parsed.accountScopeHash ||
    parsed.walletStateBeforeRef.blobFingerprint ===
      parsed.walletStateAfterRef.blobFingerprint ||
    new Set(refs.map((ref) => ref.blobFingerprint)).size !== refs.length
  )
    return invalid();
  const body = {
    schemaVersion:
      "learning-v2-owner-repository-wallet-credit-effect-record.v2" as const,
    recordKind: "wallet_credit" as const,
    accountScopeHash: parsed.accountScopeHash,
    acceptedAccountGeneration: appliedReceipt.accountGeneration,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    canonicalOperationId: appliedReceipt.operationId,
    operationFingerprint: appliedReceipt.operationFingerprint,
    semanticSubjectFingerprint: appliedReceipt.semanticSubjectFingerprint,
    semanticFingerprint: appliedReceipt.semanticFingerprint,
    appliedReceiptFingerprint: appliedReceipt.appliedReceiptFingerprint,
    walletStateBeforeFingerprint: appliedReceipt.stateBeforeFingerprint,
    walletStateAfterFingerprint: appliedReceipt.stateAfterFingerprint,
    walletStateBeforeRef: parsed.walletStateBeforeRef,
    walletStateAfterRef: parsed.walletStateAfterRef,
    operationIndexManifestBeforeRef:
      parsed.operationIndexManifestBeforeRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    appliedReceipt,
  };
  return deepFreeze({
    ...body,
    journalRecordFingerprint: hashCanonicalBody(body),
  });
};

export const parseOwnerRepositoryWalletCreditEffectRecordV2 = (
  input: unknown,
): OwnerRepositoryWalletCreditEffectRecordV2 => {
  const parsed = parseCoordinates(input, true);
  const value = parsed.value;
  if (
    value.schemaVersion !==
      "learning-v2-owner-repository-wallet-credit-effect-record.v2" ||
    value.recordKind !== "wallet_credit" ||
    !safe(value.acceptedAccountGeneration) ||
    !isWalletIdentifier(value.canonicalOperationId) ||
    ![
      value.operationFingerprint,
      value.semanticSubjectFingerprint,
      value.semanticFingerprint,
      value.appliedReceiptFingerprint,
      value.walletStateBeforeFingerprint,
      value.walletStateAfterFingerprint,
      value.journalRecordFingerprint,
    ].every((candidate) => typeof candidate === "string" && HASH.test(candidate))
  )
    return indeterminate();
  let rebuilt: OwnerRepositoryWalletCreditEffectRecordV2;
  try {
    rebuilt = createOwnerRepositoryWalletCreditEffectRecordV2({
      accountScopeHash: parsed.accountScopeHash,
      journalSequence: parsed.journalSequence,
      repositoryRevisionBefore: parsed.repositoryRevisionBefore,
      rootBeforeFingerprint: parsed.rootBeforeFingerprint,
      previousJournalRecordRef: parsed.previousJournalRecordRef,
      walletStateBeforeRef: parsed.walletStateBeforeRef,
      walletStateAfterRef: parsed.walletStateAfterRef,
      operationIndexManifestBeforeRef:
        parsed.operationIndexManifestBeforeRef,
      subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
      receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
      appliedReceipt: value.appliedReceipt,
    });
  } catch {
    return indeterminate();
  }
  if (!same(rebuilt, value)) return indeterminate();
  return rebuilt;
};

export const materializeOwnerRepositoryWalletCreditEffectRecordBlobV2 = (
  recordInput: unknown,
): OwnerRepositoryWalletCreditEffectRecordBlobV2 => {
  let record: OwnerRepositoryWalletCreditEffectRecordV2;
  try {
    record = parseOwnerRepositoryWalletCreditEffectRecordV2(recordInput);
  } catch {
    return invalid();
  }
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1" as const,
    accountScopeHash: record.accountScopeHash,
    kind: "journal_record" as const,
    payload: record,
  };
  let encoded: string;
  try {
    encoded = canonicalJsonV1(envelope);
    if (utf8ByteLengthV1(encoded) > MAX_BLOB_BYTES) return invalid();
  } catch {
    return invalid();
  }
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "journal_record" as const,
      blobKey: blobKey(record.accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
    encoded,
    record,
  });
};

export const parseOwnerRepositoryWalletCreditEffectRecordBlobV2 = (
  input: unknown,
): OwnerRepositoryWalletCreditEffectRecordBlobV2 => {
  const request = readRecord(
    input,
    ["accountScopeHash", "ref", "raw"],
    "indeterminate",
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.raw !== "string"
  )
    return indeterminate();
  const ref = parseRef(
    request.ref,
    request.accountScopeHash,
    "journal_record",
    true,
  );
  try {
    if (
      utf8ByteLengthV1(request.raw) > MAX_BLOB_BYTES ||
      sha256Utf8(request.raw) !== ref.blobFingerprint
    )
      return indeterminate();
  } catch {
    return indeterminate();
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(request.raw);
    if (canonicalJsonV1(envelope) !== request.raw) return indeterminate();
  } catch {
    return indeterminate();
  }
  if (
    !isRecord(envelope) ||
    !exactKeys(envelope, ENVELOPE_KEYS) ||
    envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    envelope.accountScopeHash !== request.accountScopeHash ||
    envelope.kind !== "journal_record"
  )
    return indeterminate();
  const record = parseOwnerRepositoryWalletCreditEffectRecordV2(
    envelope.payload,
  );
  const rebuilt = materializeOwnerRepositoryWalletCreditEffectRecordBlobV2(
    record,
  );
  if (rebuilt.encoded !== request.raw || !same(rebuilt.ref, ref)) {
    return indeterminate();
  }
  return rebuilt;
};

const createBinding = (
  blob: OwnerRepositoryWalletCreditEffectRecordBlobV2,
): OwnerRepositoryCanonicalEffectBindingV2 => {
  const record = blob.record;
  const body = {
    schemaVersion:
      "learning-v2-owner-repository-canonical-effect-binding.v2" as const,
    effectKind: "wallet_credit" as const,
    accountScopeHash: record.accountScopeHash,
    acceptedAccountGeneration: record.acceptedAccountGeneration,
    effectJournalSequence: record.journalSequence,
    canonicalEffectJournalRecordRef: blob.ref,
    canonicalEffectJournalRecordFingerprint: record.journalRecordFingerprint,
    canonicalOperationId: record.canonicalOperationId,
    operationFingerprint: record.operationFingerprint,
    semanticSubjectFingerprint: record.semanticSubjectFingerprint,
    semanticFingerprint: record.semanticFingerprint,
    appliedReceiptFingerprint: record.appliedReceiptFingerprint,
  };
  return deepFreeze({
    ...body,
    bindingFingerprint: hashCanonicalBody(body),
  });
};

const valueWithFingerprint = <T extends Record<string, unknown>>(
  body: T,
): Readonly<T & { readonly valueFingerprint: string }> =>
  deepFreeze({ ...body, valueFingerprint: hashCanonicalBody(body) });

export const createOwnerRepositoryCanonicalEconomicIndexValuesV2 = (
  input: unknown,
): OwnerRepositoryCanonicalEconomicIndexValuesV2 => {
  const request = readRecord(input, ["journalRecordBlob"]);
  const wrapper = readRecord(
    request.journalRecordBlob,
    ["ref", "encoded", "record"],
  );
  let blob: OwnerRepositoryWalletCreditEffectRecordBlobV2;
  try {
    const detachedRecord = detachRecord(wrapper.record, RECORD_KEYS);
    if (
      typeof detachedRecord.accountScopeHash !== "string" ||
      !ACCOUNT.test(detachedRecord.accountScopeHash)
    )
      return invalid();
    blob = parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
      accountScopeHash: detachedRecord.accountScopeHash,
      ref: wrapper.ref,
      raw: wrapper.encoded,
    });
  } catch {
    return invalid();
  }
  if (!same(blob.record, wrapper.record)) return invalid();
  const entries = createWalletCanonicalLedgerEntriesFromAppliedReceipt(
    blob.record.appliedReceipt,
  );
  const binding = createBinding(blob);
  const operationValue = valueWithFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-canonical-operation-index-value.v2" as const,
    valueKind: "canonical_operation" as const,
    ledgerEntry: entries.operationLedgerEntry,
    effectBinding: binding,
  }) as OwnerRepositoryCanonicalOperationIndexValueV2;
  const subjectValue = valueWithFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-canonical-subject-index-value.v2" as const,
    valueKind: "canonical_subject" as const,
    ledgerEntry: entries.subjectLedgerEntry,
    effectBinding: binding,
  }) as OwnerRepositoryCanonicalSubjectIndexValueV2;
  const receiptValue = valueWithFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-canonical-receipt-index-value.v2" as const,
    valueKind: "canonical_receipt" as const,
    appliedReceipt: blob.record.appliedReceipt,
    effectBinding: binding,
  }) as OwnerRepositoryCanonicalReceiptIndexValueV2;
  return deepFreeze({
    effectBinding: binding,
    operationValue,
    subjectValue,
    receiptValue,
  });
};

export const createOwnerRepositoryOperationAliasIndexValueV2 = (
  input: unknown,
): OwnerRepositoryOperationAliasIndexValueV2 => {
  const request = readRecord(input, [
    "accountScopeHash",
    "authorizedAliasOperation",
    "receiptValue",
  ]);
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash)
  )
    return invalid();
  const receiptCandidate = readRecord(request.receiptValue, RECEIPT_VALUE_KEYS);
  let receipt: WalletAppliedReceiptV1;
  let authorizedAliasOperation: WalletAuthorizedOperationV1;
  try {
    receipt = parseWalletAppliedReceipt(receiptCandidate.appliedReceipt);
    authorizedAliasOperation = createWalletAuthorizedOperation(
      request.authorizedAliasOperation,
    );
  } catch {
    return invalid();
  }
  let parsedReceipt: OwnerRepositoryCanonicalReceiptIndexValueV2;
  try {
    parsedReceipt = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
      accountScopeHash: request.accountScopeHash,
      indexKind: "receipt",
      keyKind: "applied_receipt",
      logicalKey: receipt.appliedReceiptFingerprint,
      value: request.receiptValue,
    }) as OwnerRepositoryCanonicalReceiptIndexValueV2;
  } catch {
    return invalid();
  }
  let ledgerEntry: WalletOperationAliasLedgerEntryV2;
  try {
    ledgerEntry = createWalletOperationAliasLedgerEntry({
      authorizedAliasOperation,
      appliedReceipt: parsedReceipt.appliedReceipt,
    });
  } catch {
    return invalid();
  }
  return valueWithFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-operation-alias-index-value.v2" as const,
    valueKind: "operation_alias" as const,
    ledgerEntry,
    effectBinding: parsedReceipt.effectBinding,
  }) as OwnerRepositoryOperationAliasIndexValueV2;
};

const parseBinding = (
  input: unknown,
  receipt: WalletAppliedReceiptV1,
): OwnerRepositoryCanonicalEffectBindingV2 => {
  const value = detachRecord(input, BINDING_KEYS, true);
  if (
    value.schemaVersion !==
      "learning-v2-owner-repository-canonical-effect-binding.v2" ||
    value.effectKind !== "wallet_credit" ||
    typeof value.accountScopeHash !== "string" ||
    !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.acceptedAccountGeneration) ||
    !safe(value.effectJournalSequence, 1) ||
    !isWalletIdentifier(value.canonicalOperationId) ||
    ![
      value.canonicalEffectJournalRecordFingerprint,
      value.operationFingerprint,
      value.semanticSubjectFingerprint,
      value.semanticFingerprint,
      value.appliedReceiptFingerprint,
      value.bindingFingerprint,
    ].every((candidate) => typeof candidate === "string" && HASH.test(candidate))
  )
    return indeterminate();
  const ref = parseRef(
    value.canonicalEffectJournalRecordRef,
    value.accountScopeHash,
    "journal_record",
    true,
  );
  const body = {
    schemaVersion: value.schemaVersion,
    effectKind: value.effectKind,
    accountScopeHash: value.accountScopeHash,
    acceptedAccountGeneration: value.acceptedAccountGeneration,
    effectJournalSequence: value.effectJournalSequence,
    canonicalEffectJournalRecordRef: ref,
    canonicalEffectJournalRecordFingerprint:
      value.canonicalEffectJournalRecordFingerprint,
    canonicalOperationId: value.canonicalOperationId,
    operationFingerprint: value.operationFingerprint,
    semanticSubjectFingerprint: value.semanticSubjectFingerprint,
    semanticFingerprint: value.semanticFingerprint,
    appliedReceiptFingerprint: value.appliedReceiptFingerprint,
  };
  if (
    value.bindingFingerprint !== hashCanonicalBody(body) ||
    value.accountScopeHash !== receipt.accountScopeHash ||
    value.acceptedAccountGeneration !== receipt.accountGeneration ||
    value.canonicalOperationId !== receipt.operationId ||
    value.operationFingerprint !== receipt.operationFingerprint ||
    value.semanticSubjectFingerprint !== receipt.semanticSubjectFingerprint ||
    value.semanticFingerprint !== receipt.semanticFingerprint ||
    value.appliedReceiptFingerprint !== receipt.appliedReceiptFingerprint
  )
    return indeterminate();
  return deepFreeze({
    ...body,
    bindingFingerprint: value.bindingFingerprint,
  }) as OwnerRepositoryCanonicalEffectBindingV2;
};

export const parseOwnerRepositoryCanonicalEconomicIndexValueV2 = (
  input: unknown,
): OwnerRepositoryCanonicalEconomicIndexValueV2 => {
  const request = readRecord(
    input,
    ["accountScopeHash", "indexKind", "keyKind", "logicalKey", "value"],
    "indeterminate",
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.logicalKey !== "string"
  )
    return indeterminate();
  let value: Readonly<Record<string, unknown>>;
  let receipt: WalletAppliedReceiptV1;
  let parsedLedger:
    | WalletOperationLedgerEntryV1
    | WalletOperationAliasLedgerEntryV2
    | WalletSubjectLedgerEntryV1;
  let keys: readonly string[];
  if (request.indexKind === "operation") {
    const operationShape = readRecord(
      request.value,
      OPERATION_VALUE_KEYS,
      "indeterminate",
    );
    keys =
      operationShape.schemaVersion ===
      "learning-v2-owner-repository-operation-alias-index-value.v2"
        ? ALIAS_VALUE_KEYS
        : OPERATION_VALUE_KEYS;
  }
  else if (request.indexKind === "subject") keys = SUBJECT_VALUE_KEYS;
  else if (request.indexKind === "receipt") keys = RECEIPT_VALUE_KEYS;
  else return indeterminate();
  value = detachRecord(request.value, keys, true);
  try {
    if (request.indexKind === "operation") {
      if (
        (request.keyKind !== "operation_id" &&
          request.keyKind !== "operation_fingerprint") ||
        (value.schemaVersion !==
          "learning-v2-owner-repository-canonical-operation-index-value.v2" &&
          value.schemaVersion !==
            "learning-v2-owner-repository-operation-alias-index-value.v2")
      )
        return indeterminate();
      if (
        value.schemaVersion ===
        "learning-v2-owner-repository-operation-alias-index-value.v2"
      ) {
        if (value.valueKind !== "operation_alias") return indeterminate();
        parsedLedger = parseWalletOperationAliasLedgerEntry(value.ledgerEntry);
      } else {
        if (value.valueKind !== "canonical_operation") return indeterminate();
        parsedLedger = parseWalletOperationLedgerEntry(value.ledgerEntry);
      }
      receipt = parsedLedger.appliedReceipt;
      if (
        (request.keyKind === "operation_id" &&
          parsedLedger.operationId !== request.logicalKey) ||
        (request.keyKind === "operation_fingerprint" &&
          parsedLedger.operationFingerprint !== request.logicalKey)
      )
        return indeterminate();
    } else if (request.indexKind === "subject") {
      if (
        value.schemaVersion !==
          "learning-v2-owner-repository-canonical-subject-index-value.v2" ||
        value.valueKind !== "canonical_subject" ||
        request.keyKind !== "semantic_subject"
      )
        return indeterminate();
      parsedLedger = parseWalletSubjectLedgerEntry(value.ledgerEntry);
      receipt = parsedLedger.appliedReceipt;
      if (parsedLedger.semanticSubjectFingerprint !== request.logicalKey) {
        return indeterminate();
      }
    } else {
      if (
        value.schemaVersion !==
          "learning-v2-owner-repository-canonical-receipt-index-value.v2" ||
        value.valueKind !== "canonical_receipt" ||
        request.keyKind !== "applied_receipt"
      )
        return indeterminate();
      receipt = parseWalletAppliedReceipt(value.appliedReceipt);
      parsedLedger = createWalletCanonicalLedgerEntriesFromAppliedReceipt(
        receipt,
      ).subjectLedgerEntry;
      if (receipt.appliedReceiptFingerprint !== request.logicalKey) {
        return indeterminate();
      }
    }
  } catch {
    return indeterminate();
  }
  if (receipt.accountScopeHash !== request.accountScopeHash) {
    return indeterminate();
  }
  const binding = parseBinding(value.effectBinding, receipt);
  const body =
    request.indexKind === "receipt"
      ? {
          schemaVersion: value.schemaVersion,
          valueKind: value.valueKind,
          appliedReceipt: receipt,
          effectBinding: binding,
        }
      : {
          schemaVersion: value.schemaVersion,
          valueKind: value.valueKind,
          ledgerEntry: parsedLedger,
          effectBinding: binding,
        };
  if (
    typeof value.valueFingerprint !== "string" ||
    value.valueFingerprint !== hashCanonicalBody(body) ||
    !same(value, { ...body, valueFingerprint: value.valueFingerprint })
  )
    return indeterminate();
  return deepFreeze({
    ...body,
    valueFingerprint: value.valueFingerprint,
  }) as OwnerRepositoryCanonicalEconomicIndexValueV2;
};

/**
 * Resolves the binding against exact journal bytes. This is content proof only;
 * repository ancestry still has to prove that the record is on the current
 * checkpoint/root chain before a no-effect alias can be published.
 */
export const assertOwnerRepositoryCanonicalEffectBindingV2 = (
  input: unknown,
): OwnerRepositoryWalletCreditEffectRecordBlobV2 => {
  const request = readRecord(input, ["effectBinding", "raw"]);
  let binding: OwnerRepositoryCanonicalEffectBindingV2;
  try {
    const detached = detachRecord(request.effectBinding, BINDING_KEYS, true);
    if (
      typeof detached.accountScopeHash !== "string" ||
      !ACCOUNT.test(detached.accountScopeHash)
    )
      return invalid();
    const blob = parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
      accountScopeHash: detached.accountScopeHash,
      ref: detached.canonicalEffectJournalRecordRef,
      raw: request.raw,
    });
    binding = parseBinding(detached, blob.record.appliedReceipt);
    if (
      binding.canonicalEffectJournalRecordFingerprint !==
        blob.record.journalRecordFingerprint ||
      binding.effectJournalSequence !== blob.record.journalSequence ||
      !same(binding.canonicalEffectJournalRecordRef, blob.ref)
    )
      return invalid();
    return blob;
  } catch {
    return invalid();
  }
};

const parseAliasRecordCoordinates = (input: unknown, stored: boolean) => {
  const value = detachRecord(
    input,
    stored ? ALIAS_RECORD_KEYS : ALIAS_RECORD_CREATE_KEYS,
    stored,
  );
  const reject = () => stored ? indeterminate() : invalid();
  if (
    typeof value.accountScopeHash !== "string" ||
    !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.journalSequence, 2) ||
    !safe(value.repositoryRevisionBefore) ||
    value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
    typeof value.rootBeforeFingerprint !== "string" ||
    !HASH.test(value.rootBeforeFingerprint)
  ) return reject();
  const accountScopeHash = value.accountScopeHash;
  const journalSequence = Number(value.journalSequence);
  const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
  if (journalSequence - 1 > repositoryRevisionBefore) return reject();
  return {
    value,
    accountScopeHash,
    journalSequence,
    repositoryRevisionBefore,
    rootBeforeFingerprint: value.rootBeforeFingerprint as string,
    previousJournalRecordRef: parseRef(
      value.previousJournalRecordRef,
      accountScopeHash,
      "journal_record",
      stored,
    ),
    walletStateRef: parseRef(
      value.walletStateRef,
      accountScopeHash,
      "wallet_state",
      stored,
    ),
    operationIndexManifestBeforeRef: parseRef(
      value.operationIndexManifestBeforeRef,
      accountScopeHash,
      "operation_index_manifest",
      stored,
    ),
    operationIndexManifestAfterRef: parseRef(
      value.operationIndexManifestAfterRef,
      accountScopeHash,
      "operation_index_manifest",
      stored,
    ),
    subjectIndexManifestRef: parseRef(
      value.subjectIndexManifestRef,
      accountScopeHash,
      "subject_index_manifest",
      stored,
    ),
    receiptIndexManifestRef: parseRef(
      value.receiptIndexManifestRef,
      accountScopeHash,
      "receipt_index_manifest",
      stored,
    ),
  };
};

export const createOwnerRepositoryOperationAliasRecordV2 = (
  input: unknown,
): OwnerRepositoryOperationAliasRecordV2 => {
  const parsed = parseAliasRecordCoordinates(input, false);
  let ledgerEntry: WalletOperationAliasLedgerEntryV2;
  let aliasValue: OwnerRepositoryOperationAliasIndexValueV2;
  try {
    const candidate = readRecord(parsed.value.aliasValue, ALIAS_VALUE_KEYS);
    ledgerEntry = parseWalletOperationAliasLedgerEntry(candidate.ledgerEntry);
    aliasValue = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
      accountScopeHash: parsed.accountScopeHash,
      indexKind: "operation",
      keyKind: "operation_id",
      logicalKey: ledgerEntry.operationId,
      value: parsed.value.aliasValue,
    }) as OwnerRepositoryOperationAliasIndexValueV2;
    parseOwnerRepositoryCanonicalEconomicIndexValueV2({
      accountScopeHash: parsed.accountScopeHash,
      indexKind: "operation",
      keyKind: "operation_fingerprint",
      logicalKey: ledgerEntry.operationFingerprint,
      value: parsed.value.aliasValue,
    });
  } catch {
    return invalid();
  }
  const binding = aliasValue.effectBinding;
  const projections = [
    parsed.walletStateRef,
    parsed.operationIndexManifestBeforeRef,
    parsed.operationIndexManifestAfterRef,
    parsed.subjectIndexManifestRef,
    parsed.receiptIndexManifestRef,
  ];
  if (
    ledgerEntry.authorizedAliasOperation.accountGeneration <
      binding.acceptedAccountGeneration ||
    parsed.journalSequence <= binding.effectJournalSequence ||
    parsed.operationIndexManifestBeforeRef.blobFingerprint ===
      parsed.operationIndexManifestAfterRef.blobFingerprint ||
    new Set(projections.map((ref) => ref.blobFingerprint)).size !==
      projections.length ||
    projections.some((ref) =>
      ref.blobFingerprint ===
        binding.canonicalEffectJournalRecordRef.blobFingerprint ||
      ref.blobFingerprint ===
        parsed.previousJournalRecordRef.blobFingerprint)
  ) return invalid();
  const body = {
    schemaVersion:
      "learning-v2-owner-repository-operation-alias-record.v2" as const,
    recordKind: "operation_alias" as const,
    accountScopeHash: parsed.accountScopeHash,
    acceptedAccountGeneration:
      ledgerEntry.authorizedAliasOperation.accountGeneration,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    walletStateRef: parsed.walletStateRef,
    operationIndexManifestBeforeRef:
      parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestRef: parsed.subjectIndexManifestRef,
    receiptIndexManifestRef: parsed.receiptIndexManifestRef,
    canonicalEffectBinding: binding,
    aliasValue,
  };
  return deepFreeze({
    ...body,
    journalRecordFingerprint: hashCanonicalBody(body),
  });
};

export const parseOwnerRepositoryOperationAliasRecordV2 = (
  input: unknown,
): OwnerRepositoryOperationAliasRecordV2 => {
  const parsed = parseAliasRecordCoordinates(input, true);
  const value = parsed.value;
  if (
    value.schemaVersion !==
      "learning-v2-owner-repository-operation-alias-record.v2" ||
    value.recordKind !== "operation_alias" ||
    !safe(value.acceptedAccountGeneration) ||
    typeof value.journalRecordFingerprint !== "string" ||
    !HASH.test(value.journalRecordFingerprint)
  ) return indeterminate();
  let rebuilt: OwnerRepositoryOperationAliasRecordV2;
  try {
    rebuilt = createOwnerRepositoryOperationAliasRecordV2({
      accountScopeHash: parsed.accountScopeHash,
      journalSequence: parsed.journalSequence,
      repositoryRevisionBefore: parsed.repositoryRevisionBefore,
      rootBeforeFingerprint: parsed.rootBeforeFingerprint,
      previousJournalRecordRef: parsed.previousJournalRecordRef,
      walletStateRef: parsed.walletStateRef,
      operationIndexManifestBeforeRef:
        parsed.operationIndexManifestBeforeRef,
      operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
      subjectIndexManifestRef: parsed.subjectIndexManifestRef,
      receiptIndexManifestRef: parsed.receiptIndexManifestRef,
      aliasValue: value.aliasValue,
    });
  } catch {
    return indeterminate();
  }
  if (!same(rebuilt, value)) return indeterminate();
  return rebuilt;
};

export const materializeOwnerRepositoryOperationAliasRecordBlobV2 = (
  recordInput: unknown,
): OwnerRepositoryOperationAliasRecordBlobV2 => {
  let record: OwnerRepositoryOperationAliasRecordV2;
  try {
    record = parseOwnerRepositoryOperationAliasRecordV2(recordInput);
  } catch {
    return invalid();
  }
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1" as const,
    accountScopeHash: record.accountScopeHash,
    kind: "journal_record" as const,
    payload: record,
  };
  let encoded: string;
  try {
    encoded = canonicalJsonV1(envelope);
    if (utf8ByteLengthV1(encoded) > MAX_BLOB_BYTES) return invalid();
  } catch {
    return invalid();
  }
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "journal_record" as const,
      blobKey: blobKey(record.accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
    encoded,
    record,
  });
};

export const parseOwnerRepositoryOperationAliasRecordBlobV2 = (
  input: unknown,
): OwnerRepositoryOperationAliasRecordBlobV2 => {
  const request = readRecord(
    input,
    ["accountScopeHash", "ref", "raw"],
    "indeterminate",
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.raw !== "string"
  ) return indeterminate();
  const ref = parseRef(
    request.ref,
    request.accountScopeHash,
    "journal_record",
    true,
  );
  let envelope: unknown;
  try {
    if (
      utf8ByteLengthV1(request.raw) > MAX_BLOB_BYTES ||
      sha256Utf8(request.raw) !== ref.blobFingerprint
    ) return indeterminate();
    envelope = JSON.parse(request.raw);
    if (canonicalJsonV1(envelope) !== request.raw) return indeterminate();
  } catch {
    return indeterminate();
  }
  if (
    !isRecord(envelope) ||
    !exactKeys(envelope, ENVELOPE_KEYS) ||
    envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    envelope.accountScopeHash !== request.accountScopeHash ||
    envelope.kind !== "journal_record"
  ) return indeterminate();
  const record = parseOwnerRepositoryOperationAliasRecordV2(envelope.payload);
  const rebuilt = materializeOwnerRepositoryOperationAliasRecordBlobV2(record);
  if (rebuilt.encoded !== request.raw || !same(rebuilt.ref, ref)) {
    return indeterminate();
  }
  return rebuilt;
};
