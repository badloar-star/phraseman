import { detachBoundedWalletJson, isWalletIdentifier } from "../contracts/wallet";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import {
  parseOwnerRepositoryCourseUnlockEffectRecordBlobV2,
  type OwnerRepositoryCourseUnlockEffectRecordBlobV2,
} from "./owner_repository_course_unlock_effect_v2";
import {
  createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt,
  parseCourseUnlockAppliedReceipt,
  parseCourseUnlockOperationLedgerEntry,
  parseCourseUnlockSubjectLedgerEntry,
  type CourseUnlockAppliedReceiptV1,
  type CourseUnlockOperationLedgerEntryV1,
  type CourseUnlockSubjectLedgerEntryV1,
} from "./course_unlock_reducer";

export interface OwnerRepositoryCourseUnlockEffectBindingV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-course-unlock-effect-binding.v2";
  readonly effectKind: "course_unlock";
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

export interface OwnerRepositoryCourseUnlockOperationIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-course-unlock-operation-index-value.v2";
  readonly valueKind: "canonical_operation" | "operation_alias";
  readonly ledgerEntry: CourseUnlockOperationLedgerEntryV1;
  readonly effectBinding: OwnerRepositoryCourseUnlockEffectBindingV2;
  readonly valueFingerprint: string;
}

export interface OwnerRepositoryCourseUnlockSubjectIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-course-unlock-subject-index-value.v2";
  readonly valueKind: "canonical_subject";
  readonly ledgerEntry: CourseUnlockSubjectLedgerEntryV1;
  readonly effectBinding: OwnerRepositoryCourseUnlockEffectBindingV2;
  readonly valueFingerprint: string;
}

export interface OwnerRepositoryCourseUnlockReceiptIndexValueV2 {
  readonly schemaVersion:
    "learning-v2-owner-repository-course-unlock-receipt-index-value.v2";
  readonly valueKind: "canonical_receipt";
  readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
  readonly effectBinding: OwnerRepositoryCourseUnlockEffectBindingV2;
  readonly valueFingerprint: string;
}

export type OwnerRepositoryCourseUnlockEconomicIndexValueV2 =
  | OwnerRepositoryCourseUnlockOperationIndexValueV2
  | OwnerRepositoryCourseUnlockSubjectIndexValueV2
  | OwnerRepositoryCourseUnlockReceiptIndexValueV2;

export interface OwnerRepositoryCourseUnlockCanonicalIndexValuesV2 {
  readonly effectBinding: OwnerRepositoryCourseUnlockEffectBindingV2;
  readonly operationValue: OwnerRepositoryCourseUnlockOperationIndexValueV2;
  readonly subjectValue: OwnerRepositoryCourseUnlockSubjectIndexValueV2;
  readonly receiptValue: OwnerRepositoryCourseUnlockReceiptIndexValueV2;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"] as const;
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
const LEDGER_VALUE_KEYS = [
  "schemaVersion",
  "valueKind",
  "ledgerEntry",
  "effectBinding",
  "valueFingerprint",
] as const;
const RECEIPT_VALUE_KEYS = [
  "schemaVersion",
  "valueKind",
  "appliedReceipt",
  "effectBinding",
  "valueFingerprint",
] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => {
  throw new Error("owner_repository_course_unlock_economic_value_invalid");
};
const indeterminate = (): never => {
  throw new Error("owner_repository_course_unlock_economic_value_indeterminate");
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
    if (typeof current !== "object" || current === null || seen.has(current)) {
      continue;
    }
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
  stored = false,
): Readonly<Record<string, unknown>> => {
  const fail = stored ? indeterminate : invalid;
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    return fail();
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
    return fail();
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
        ? "owner_repository_course_unlock_economic_value_indeterminate"
        : "owner_repository_course_unlock_economic_value_invalid",
    );
  } catch {
    return stored ? indeterminate() : invalid();
  }
  return readRecord(detached, keys, stored);
};
const parseRef = (
  input: unknown,
  accountScopeHash: string,
): OwnerRepositoryBlobRefV1 => {
  const value = readRecord(input, REF_KEYS, true);
  if (
    value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    value.kind !== "journal_record" ||
    typeof value.blobFingerprint !== "string" ||
    !HASH.test(value.blobFingerprint) ||
    value.blobKey !==
      `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${value.blobFingerprint}`
  ) {
    return indeterminate();
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
    kind: "journal_record" as const,
    blobKey: value.blobKey as string,
    blobFingerprint: value.blobFingerprint,
  });
};
const withFingerprint = <T extends Record<string, unknown>>(
  body: T,
): Readonly<T & { readonly valueFingerprint: string }> =>
  deepFreeze({ ...body, valueFingerprint: hashCanonicalBody(body) });

const createBinding = (
  blob: OwnerRepositoryCourseUnlockEffectRecordBlobV2,
): OwnerRepositoryCourseUnlockEffectBindingV2 => {
  const record = blob.record;
  const body = {
    schemaVersion:
      "learning-v2-owner-repository-course-unlock-effect-binding.v2" as const,
    effectKind: "course_unlock" as const,
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

export const createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2 = (
  input: unknown,
): OwnerRepositoryCourseUnlockCanonicalIndexValuesV2 => {
  const request = readRecord(input, ["journalRecordBlob"]);
  const wrapper = readRecord(
    request.journalRecordBlob,
    ["ref", "encoded", "record"],
  );
  let blob: OwnerRepositoryCourseUnlockEffectRecordBlobV2;
  try {
    const record = detachBoundedWalletJson(
      wrapper.record,
      "owner_repository_course_unlock_economic_value_invalid",
    ) as Record<string, unknown>;
    if (
      !isRecord(record) ||
      typeof record.accountScopeHash !== "string" ||
      !ACCOUNT.test(record.accountScopeHash)
    ) {
      return invalid();
    }
    blob = parseOwnerRepositoryCourseUnlockEffectRecordBlobV2({
      accountScopeHash: record.accountScopeHash,
      ref: wrapper.ref,
      raw: wrapper.encoded,
    });
  } catch {
    return invalid();
  }
  if (!same(blob.record, wrapper.record)) return invalid();
  const entries = createCourseUnlockCanonicalLedgerEntriesFromAppliedReceipt(
    blob.record.appliedReceipt,
  );
  const binding = createBinding(blob);
  const operationValue = withFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-course-unlock-operation-index-value.v2" as const,
    valueKind: "canonical_operation" as const,
    ledgerEntry: entries.operationLedgerEntry,
    effectBinding: binding,
  }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
  const subjectValue = withFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-course-unlock-subject-index-value.v2" as const,
    valueKind: "canonical_subject" as const,
    ledgerEntry: entries.subjectLedgerEntry,
    effectBinding: binding,
  }) as OwnerRepositoryCourseUnlockSubjectIndexValueV2;
  const receiptValue = withFingerprint({
    schemaVersion:
      "learning-v2-owner-repository-course-unlock-receipt-index-value.v2" as const,
    valueKind: "canonical_receipt" as const,
    appliedReceipt: blob.record.appliedReceipt,
    effectBinding: binding,
  }) as OwnerRepositoryCourseUnlockReceiptIndexValueV2;
  return deepFreeze({
    effectBinding: binding,
    operationValue,
    subjectValue,
    receiptValue,
  });
};

const parseBinding = (
  input: unknown,
  receipt: CourseUnlockAppliedReceiptV1,
): OwnerRepositoryCourseUnlockEffectBindingV2 => {
  const value = detachRecord(input, BINDING_KEYS, true);
  if (
    value.schemaVersion !==
      "learning-v2-owner-repository-course-unlock-effect-binding.v2" ||
    value.effectKind !== "course_unlock" ||
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
  ) {
    return indeterminate();
  }
  const ref = parseRef(
    value.canonicalEffectJournalRecordRef,
    value.accountScopeHash,
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
  const request = receipt.authorizedRequest;
  if (
    value.bindingFingerprint !== hashCanonicalBody(body) ||
    value.accountScopeHash !== request.accountScopeHash ||
    value.acceptedAccountGeneration !== request.accountGeneration ||
    value.canonicalOperationId !== request.operationId ||
    value.operationFingerprint !== request.operationFingerprint ||
    value.semanticSubjectFingerprint !== request.semanticSubjectFingerprint ||
    value.semanticFingerprint !== request.semanticFingerprint ||
    value.appliedReceiptFingerprint !== receipt.appliedReceiptFingerprint
  ) {
    return indeterminate();
  }
  return deepFreeze({
    ...body,
    bindingFingerprint: value.bindingFingerprint,
  }) as OwnerRepositoryCourseUnlockEffectBindingV2;
};

export const parseOwnerRepositoryCourseUnlockEconomicIndexValueV2 = (
  input: unknown,
): OwnerRepositoryCourseUnlockEconomicIndexValueV2 => {
  const request = readRecord(
    input,
    ["accountScopeHash", "indexKind", "keyKind", "logicalKey", "value"],
    true,
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.logicalKey !== "string"
  ) {
    return indeterminate();
  }
  if (request.indexKind === "receipt") {
    if (request.keyKind !== "applied_receipt") return indeterminate();
    const value = detachRecord(request.value, RECEIPT_VALUE_KEYS, true);
    if (
      value.schemaVersion !==
        "learning-v2-owner-repository-course-unlock-receipt-index-value.v2" ||
      value.valueKind !== "canonical_receipt" ||
      typeof value.valueFingerprint !== "string" ||
      !HASH.test(value.valueFingerprint)
    ) {
      return indeterminate();
    }
    let receipt: CourseUnlockAppliedReceiptV1;
    try {
      receipt = parseCourseUnlockAppliedReceipt(value.appliedReceipt);
    } catch {
      return indeterminate();
    }
    const binding = parseBinding(value.effectBinding, receipt);
    const body = {
      schemaVersion: value.schemaVersion,
      valueKind: value.valueKind,
      appliedReceipt: receipt,
      effectBinding: binding,
    };
    if (
      request.logicalKey !== receipt.appliedReceiptFingerprint ||
      value.valueFingerprint !== hashCanonicalBody(body)
    ) {
      return indeterminate();
    }
    return deepFreeze({
      ...body,
      valueFingerprint: value.valueFingerprint,
    }) as OwnerRepositoryCourseUnlockReceiptIndexValueV2;
  }
  const value = detachRecord(request.value, LEDGER_VALUE_KEYS, true);
  if (
    typeof value.valueFingerprint !== "string" ||
    !HASH.test(value.valueFingerprint)
  ) {
    return indeterminate();
  }
  if (request.indexKind === "operation") {
    if (
      request.keyKind !== "operation_id" &&
      request.keyKind !== "operation_fingerprint"
    ) {
      return indeterminate();
    }
    if (
      value.schemaVersion !==
        "learning-v2-owner-repository-course-unlock-operation-index-value.v2" ||
      (value.valueKind !== "canonical_operation" &&
        value.valueKind !== "operation_alias")
    ) {
      return indeterminate();
    }
    let ledger: CourseUnlockOperationLedgerEntryV1;
    try {
      ledger = parseCourseUnlockOperationLedgerEntry(value.ledgerEntry);
    } catch {
      return indeterminate();
    }
    const receipt = ledger.appliedReceipt;
    const binding = parseBinding(value.effectBinding, receipt);
    const expectedKind =
      ledger.operationId === ledger.canonicalOperationId
        ? "canonical_operation"
        : "operation_alias";
    const body = {
      schemaVersion: value.schemaVersion,
      valueKind: value.valueKind,
      ledgerEntry: ledger,
      effectBinding: binding,
    };
    if (
      value.valueKind !== expectedKind ||
      binding.canonicalOperationId !== ledger.canonicalOperationId ||
      (request.keyKind === "operation_id"
        ? request.logicalKey !== ledger.operationId
        : request.logicalKey !== ledger.operationFingerprint) ||
      value.valueFingerprint !== hashCanonicalBody(body)
    ) {
      return indeterminate();
    }
    return deepFreeze({
      ...body,
      valueFingerprint: value.valueFingerprint,
    }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
  }
  if (
    request.indexKind !== "subject" ||
    request.keyKind !== "semantic_subject" ||
    value.schemaVersion !==
      "learning-v2-owner-repository-course-unlock-subject-index-value.v2" ||
    value.valueKind !== "canonical_subject"
  ) {
    return indeterminate();
  }
  let ledger: CourseUnlockSubjectLedgerEntryV1;
  try {
    ledger = parseCourseUnlockSubjectLedgerEntry(value.ledgerEntry);
  } catch {
    return indeterminate();
  }
  const binding = parseBinding(value.effectBinding, ledger.appliedReceipt);
  const body = {
    schemaVersion: value.schemaVersion,
    valueKind: value.valueKind,
    ledgerEntry: ledger,
    effectBinding: binding,
  };
  if (
    request.logicalKey !== ledger.semanticSubjectFingerprint ||
    binding.canonicalOperationId !== ledger.canonicalOperationId ||
    value.valueFingerprint !== hashCanonicalBody(body)
  ) {
    return indeterminate();
  }
  return deepFreeze({
    ...body,
    valueFingerprint: value.valueFingerprint,
  }) as OwnerRepositoryCourseUnlockSubjectIndexValueV2;
};
