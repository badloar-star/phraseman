import {
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
  isWalletIdentifier,
  type WalletAuthorizedOperationV1,
} from "../contracts/wallet";
import { canonicalJsonV1, hashCanonicalBody } from "../policies/decision_registry";
import {
  parseCourseUnlockAppliedReceipt,
  type CourseUnlockAppliedReceiptV1,
} from "./course_unlock_reducer";
import {
  createWalletCanonicalLedgerEntriesFromAppliedReceipt,
  createWalletOperationAliasLedgerEntry,
  parseWalletAppliedReceipt,
  parseWalletOperationAliasLedgerEntry,
  type WalletAppliedReceiptV1,
  type WalletOperationAliasLedgerEntryV2,
} from "./wallet_reducer";
import type {
  OwnerRepositoryBlobRefV1,
  OwnerRepositoryCourseStateRefV1,
} from "./owner_repository";

export interface OwnerRepositoryWalletCreditJournalRecordV1 {
  readonly schemaVersion: "learning-v2-owner-repository-journal-record.v1";
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
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly journalRecordFingerprint: string;
}

export interface CreateOwnerRepositoryWalletCreditJournalRecordInput {
  readonly accountScopeHash: string;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly walletStateBeforeRef: OwnerRepositoryBlobRefV1;
  readonly walletStateAfterRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly appliedReceipt: WalletAppliedReceiptV1;
}

export interface OwnerRepositoryCourseUnlockJournalRecordV1 {
  readonly schemaVersion: "learning-v2-owner-repository-journal-record.v1";
  readonly recordKind: "course_unlock";
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
  readonly courseIdentityFingerprint: string;
  readonly walletStateBeforeFingerprint: string;
  readonly walletStateAfterFingerprint: string;
  readonly courseStateBeforeFingerprint: string;
  readonly courseStateAfterFingerprint: string;
  readonly walletStateBeforeRef: OwnerRepositoryBlobRefV1;
  readonly walletStateAfterRef: OwnerRepositoryBlobRefV1;
  readonly courseStateBeforeRef: OwnerRepositoryCourseStateRefV1 | null;
  readonly courseStateAfterRef: OwnerRepositoryCourseStateRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
  readonly journalRecordFingerprint: string;
}

export interface CreateOwnerRepositoryCourseUnlockJournalRecordInput {
  readonly accountScopeHash: string;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly walletStateBeforeRef: OwnerRepositoryBlobRefV1;
  readonly walletStateAfterRef: OwnerRepositoryBlobRefV1;
  readonly courseStateBeforeRef: OwnerRepositoryCourseStateRefV1 | null;
  readonly courseStateAfterRef: OwnerRepositoryCourseStateRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
}

export type OwnerRepositoryEconomicEffectJournalRecordV1 =
  | OwnerRepositoryWalletCreditJournalRecordV1
  | OwnerRepositoryCourseUnlockJournalRecordV1;

export interface OwnerRepositoryOperationAliasJournalRecordV1 {
  readonly schemaVersion: "learning-v2-owner-repository-journal-record.v1";
  readonly recordKind: "operation_alias";
  readonly accountScopeHash: string;
  readonly acceptedAccountGeneration: number;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly canonicalEffectJournalRecordRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectJournalRecordFingerprint: string;
  readonly canonicalOperationId: string;
  readonly aliasOperationId: string;
  readonly aliasOperationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly appliedReceiptFingerprint: string;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectRecord: OwnerRepositoryWalletCreditJournalRecordV1;
  readonly aliasEntry: WalletOperationAliasLedgerEntryV2;
  readonly journalRecordFingerprint: string;
}

export interface CreateOwnerRepositoryOperationAliasJournalRecordInput {
  readonly accountScopeHash: string;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly canonicalEffectJournalRecordRef: OwnerRepositoryBlobRefV1;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectRecord: OwnerRepositoryWalletCreditJournalRecordV1;
  readonly authorizedAliasOperation: WalletAuthorizedOperationV1;
}

export type OwnerRepositoryCanonicalIndexRepairKeyKind =
  | "operation_id"
  | "operation_fingerprint"
  | "semantic_subject"
  | "applied_receipt";

export interface OwnerRepositoryMissingIndexEntryJournalRecordV1 {
  readonly schemaVersion: "learning-v2-owner-repository-journal-record.v1";
  readonly recordKind: "missing_index_entry";
  readonly accountScopeHash: string;
  readonly acceptedAccountGeneration: number;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly canonicalEffectJournalRecordRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectJournalRecordFingerprint: string;
  readonly canonicalOperationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly semanticFingerprint: string;
  readonly appliedReceiptFingerprint: string;
  readonly repairIndexKind: "operation" | "subject" | "receipt";
  readonly repairKeyKind: OwnerRepositoryCanonicalIndexRepairKeyKind;
  readonly repairLogicalKey: string;
  readonly repairValueFingerprint: string;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectRecord: OwnerRepositoryWalletCreditJournalRecordV1;
  readonly journalRecordFingerprint: string;
}

export interface CreateOwnerRepositoryMissingIndexEntryJournalRecordInput {
  readonly accountScopeHash: string;
  readonly acceptedAccountGeneration: number;
  readonly journalSequence: number;
  readonly repositoryRevisionBefore: number;
  readonly rootBeforeFingerprint: string;
  readonly previousJournalRecordRef: OwnerRepositoryBlobRefV1 | null;
  readonly canonicalEffectJournalRecordRef: OwnerRepositoryBlobRefV1;
  readonly repairKeyKind: OwnerRepositoryCanonicalIndexRepairKeyKind;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestBeforeRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  readonly canonicalEffectRecord: OwnerRepositoryWalletCreditJournalRecordV1;
}

export type OwnerRepositoryJournalRecordV1 =
  | OwnerRepositoryEconomicEffectJournalRecordV1
  | OwnerRepositoryOperationAliasJournalRecordV1
  | OwnerRepositoryMissingIndexEntryJournalRecordV1;

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"] as const;
const COURSE_REF_KEYS = ["schemaVersion", "courseIdentityFingerprint", "stateRef"] as const;
const CREATE_KEYS = [
  "accountScopeHash", "journalSequence", "repositoryRevisionBefore", "rootBeforeFingerprint",
  "previousJournalRecordRef", "walletStateBeforeRef", "walletStateAfterRef",
  "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestBeforeRef", "subjectIndexManifestAfterRef",
  "receiptIndexManifestBeforeRef", "receiptIndexManifestAfterRef", "appliedReceipt",
] as const;
const RECORD_KEYS = [
  "schemaVersion", "recordKind", "accountScopeHash", "acceptedAccountGeneration",
  "journalSequence", "repositoryRevisionBefore", "rootBeforeFingerprint",
  "previousJournalRecordRef", "canonicalOperationId", "operationFingerprint",
  "semanticSubjectFingerprint", "semanticFingerprint", "appliedReceiptFingerprint",
  "walletStateBeforeFingerprint", "walletStateAfterFingerprint", "walletStateBeforeRef",
  "walletStateAfterRef", "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestBeforeRef", "subjectIndexManifestAfterRef",
  "receiptIndexManifestBeforeRef", "receiptIndexManifestAfterRef", "appliedReceipt",
  "journalRecordFingerprint",
] as const;
const COURSE_CREATE_KEYS = [
  "accountScopeHash", "journalSequence", "repositoryRevisionBefore", "rootBeforeFingerprint",
  "previousJournalRecordRef", "walletStateBeforeRef", "walletStateAfterRef",
  "courseStateBeforeRef", "courseStateAfterRef", "operationIndexManifestBeforeRef",
  "operationIndexManifestAfterRef", "subjectIndexManifestBeforeRef",
  "subjectIndexManifestAfterRef", "receiptIndexManifestBeforeRef",
  "receiptIndexManifestAfterRef", "appliedReceipt",
] as const;
const COURSE_RECORD_KEYS = [
  "schemaVersion", "recordKind", "accountScopeHash", "acceptedAccountGeneration",
  "journalSequence", "repositoryRevisionBefore", "rootBeforeFingerprint",
  "previousJournalRecordRef", "canonicalOperationId", "operationFingerprint",
  "semanticSubjectFingerprint", "semanticFingerprint", "appliedReceiptFingerprint",
  "courseIdentityFingerprint", "walletStateBeforeFingerprint", "walletStateAfterFingerprint",
  "courseStateBeforeFingerprint", "courseStateAfterFingerprint", "walletStateBeforeRef",
  "walletStateAfterRef", "courseStateBeforeRef", "courseStateAfterRef",
  "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestBeforeRef", "subjectIndexManifestAfterRef",
  "receiptIndexManifestBeforeRef", "receiptIndexManifestAfterRef", "appliedReceipt",
  "journalRecordFingerprint",
] as const;
const ALIAS_CREATE_KEYS = [
  "accountScopeHash", "journalSequence", "repositoryRevisionBefore",
  "rootBeforeFingerprint", "previousJournalRecordRef",
  "canonicalEffectJournalRecordRef", "walletStateRef",
  "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestRef", "receiptIndexManifestRef",
  "canonicalEffectRecord", "authorizedAliasOperation",
] as const;
const ALIAS_RECORD_KEYS = [
  "schemaVersion", "recordKind", "accountScopeHash", "acceptedAccountGeneration",
  "journalSequence", "repositoryRevisionBefore", "rootBeforeFingerprint",
  "previousJournalRecordRef", "canonicalEffectJournalRecordRef",
  "canonicalEffectJournalRecordFingerprint", "canonicalOperationId",
  "aliasOperationId", "aliasOperationFingerprint", "semanticSubjectFingerprint",
  "semanticFingerprint", "appliedReceiptFingerprint", "walletStateRef",
  "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestRef", "receiptIndexManifestRef", "canonicalEffectRecord",
  "aliasEntry", "journalRecordFingerprint",
] as const;
const REPAIR_CREATE_KEYS = [
  "accountScopeHash", "acceptedAccountGeneration", "journalSequence",
  "repositoryRevisionBefore", "rootBeforeFingerprint", "previousJournalRecordRef",
  "canonicalEffectJournalRecordRef", "repairKeyKind", "walletStateRef",
  "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestBeforeRef", "subjectIndexManifestAfterRef",
  "receiptIndexManifestBeforeRef", "receiptIndexManifestAfterRef",
  "canonicalEffectRecord",
] as const;
const REPAIR_RECORD_KEYS = [
  "schemaVersion", "recordKind", "accountScopeHash", "acceptedAccountGeneration",
  "journalSequence", "repositoryRevisionBefore", "rootBeforeFingerprint",
  "previousJournalRecordRef", "canonicalEffectJournalRecordRef",
  "canonicalEffectJournalRecordFingerprint", "canonicalOperationId",
  "operationFingerprint", "semanticSubjectFingerprint", "semanticFingerprint",
  "appliedReceiptFingerprint", "repairIndexKind", "repairKeyKind",
  "repairLogicalKey", "repairValueFingerprint", "walletStateRef",
  "operationIndexManifestBeforeRef", "operationIndexManifestAfterRef",
  "subjectIndexManifestBeforeRef", "subjectIndexManifestAfterRef",
  "receiptIndexManifestBeforeRef", "receiptIndexManifestAfterRef",
  "canonicalEffectRecord", "journalRecordFingerprint",
] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && ownKeys.every(
    (key) => typeof key === "string" && keys.includes(key),
  );
};
const safe = (value: unknown, minimum = 0) =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= minimum;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const blobKey = (accountScopeHash: string, fingerprint: string) =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const invalid = (): never => { throw new Error("owner_repository_journal_invalid"); };

const detach = (input: unknown): Record<string, unknown> => {
  let value: unknown;
  try { value = detachBoundedWalletJson(input, "owner_repository_journal_invalid"); }
  catch { return invalid(); }
  return isRecord(value) ? value : invalid();
};

const parseRef = (
  input: unknown,
  accountScopeHash: string,
  expectedKind: OwnerRepositoryBlobRefV1["kind"],
): OwnerRepositoryBlobRefV1 => {
  if (!isRecord(input) || !exactKeys(input, REF_KEYS) ||
    input.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    input.kind !== expectedKind || typeof input.blobFingerprint !== "string" ||
    !HASH.test(input.blobFingerprint) ||
    input.blobKey !== blobKey(accountScopeHash, input.blobFingerprint)) return invalid();
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
    kind: expectedKind,
    blobKey: input.blobKey as string,
    blobFingerprint: input.blobFingerprint,
  });
};

const parseCourseRef = (
  input: unknown,
  accountScopeHash: string,
): OwnerRepositoryCourseStateRefV1 => {
  if (!isRecord(input) || !exactKeys(input, COURSE_REF_KEYS) ||
    input.schemaVersion !== "learning-v2-owner-repository-course-ref.v1" ||
    typeof input.courseIdentityFingerprint !== "string" ||
    !HASH.test(input.courseIdentityFingerprint)) return invalid();
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-course-ref.v1" as const,
    courseIdentityFingerprint: input.courseIdentityFingerprint,
    stateRef: parseRef(input.stateRef, accountScopeHash, "course_unlock_state"),
  });
};

const parseInput = (input: unknown, storedRecord: boolean) => {
  const value = detach(input);
  if (!exactKeys(value, storedRecord ? RECORD_KEYS : CREATE_KEYS) ||
    typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.journalSequence, 1) || !safe(value.repositoryRevisionBefore) ||
    value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
    typeof value.rootBeforeFingerprint !== "string" || !HASH.test(value.rootBeforeFingerprint)) {
    return invalid();
  }
  const accountScopeHash = value.accountScopeHash;
  const journalSequence = Number(value.journalSequence);
  if (journalSequence - 1 > Number(value.repositoryRevisionBefore)) return invalid();
  const previousJournalRecordRef = value.previousJournalRecordRef === null ? null
    : parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record");
  if ((journalSequence === 1) !== (previousJournalRecordRef === null)) return invalid();
  return {
    value,
    accountScopeHash,
    journalSequence,
    repositoryRevisionBefore: Number(value.repositoryRevisionBefore),
    rootBeforeFingerprint: value.rootBeforeFingerprint,
    previousJournalRecordRef,
    walletStateBeforeRef: parseRef(value.walletStateBeforeRef, accountScopeHash, "wallet_state"),
    walletStateAfterRef: parseRef(value.walletStateAfterRef, accountScopeHash, "wallet_state"),
    operationIndexManifestBeforeRef: parseRef(value.operationIndexManifestBeforeRef, accountScopeHash, "operation_index_manifest"),
    operationIndexManifestAfterRef: parseRef(value.operationIndexManifestAfterRef, accountScopeHash, "operation_index_manifest"),
    subjectIndexManifestBeforeRef: parseRef(value.subjectIndexManifestBeforeRef, accountScopeHash, "subject_index_manifest"),
    subjectIndexManifestAfterRef: parseRef(value.subjectIndexManifestAfterRef, accountScopeHash, "subject_index_manifest"),
    receiptIndexManifestBeforeRef: parseRef(value.receiptIndexManifestBeforeRef, accountScopeHash, "receipt_index_manifest"),
    receiptIndexManifestAfterRef: parseRef(value.receiptIndexManifestAfterRef, accountScopeHash, "receipt_index_manifest"),
  };
};

export const createOwnerRepositoryWalletCreditJournalRecord = (
  input: unknown,
): OwnerRepositoryWalletCreditJournalRecordV1 => {
  const parsed = parseInput(input, false);
  let appliedReceipt: WalletAppliedReceiptV1;
  try { appliedReceipt = parseWalletAppliedReceipt(parsed.value.appliedReceipt); }
  catch { return invalid(); }
  const refs = [
    [parsed.walletStateBeforeRef, parsed.walletStateAfterRef],
    [parsed.operationIndexManifestBeforeRef, parsed.operationIndexManifestAfterRef],
    [parsed.subjectIndexManifestBeforeRef, parsed.subjectIndexManifestAfterRef],
    [parsed.receiptIndexManifestBeforeRef, parsed.receiptIndexManifestAfterRef],
  ] as const;
  const refFingerprints = refs.flatMap(([before, after]) => [
    before.blobFingerprint,
    after.blobFingerprint,
  ]);
  if (parsed.previousJournalRecordRef !== null) {
    refFingerprints.push(parsed.previousJournalRecordRef.blobFingerprint);
  }
  if (appliedReceipt.accountScopeHash !== parsed.accountScopeHash ||
    refs.some(([before, after]) => before.blobFingerprint === after.blobFingerprint) ||
    new Set(refFingerprints).size !== refFingerprints.length) return invalid();
  const body = {
    schemaVersion: "learning-v2-owner-repository-journal-record.v1" as const,
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
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    subjectIndexManifestAfterRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    receiptIndexManifestAfterRef: parsed.receiptIndexManifestAfterRef,
    appliedReceipt,
  };
  return deepFreeze({ ...body, journalRecordFingerprint: hashCanonicalBody(body) });
};

/**
 * Structural canonical parser only. It does not establish repository ancestry or
 * prove that referenced wallet/index blobs contain the projections claimed by
 * the receipt. The repository fold must resolve and verify every ref before CAS.
 */
export const parseOwnerRepositoryWalletCreditJournalRecord = (
  input: unknown,
): OwnerRepositoryWalletCreditJournalRecordV1 => {
  const parsed = parseInput(input, true);
  const value = parsed.value;
  if (value.schemaVersion !== "learning-v2-owner-repository-journal-record.v1" ||
    value.recordKind !== "wallet_credit" || !safe(value.acceptedAccountGeneration) ||
    !isWalletIdentifier(value.canonicalOperationId) ||
    ![value.operationFingerprint, value.semanticSubjectFingerprint, value.semanticFingerprint,
      value.appliedReceiptFingerprint, value.walletStateBeforeFingerprint,
      value.walletStateAfterFingerprint, value.journalRecordFingerprint]
      .every((candidate) => typeof candidate === "string" && HASH.test(candidate))) return invalid();
  const rebuilt = createOwnerRepositoryWalletCreditJournalRecord({
    accountScopeHash: parsed.accountScopeHash,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    walletStateBeforeRef: parsed.walletStateBeforeRef,
    walletStateAfterRef: parsed.walletStateAfterRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    subjectIndexManifestAfterRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    receiptIndexManifestAfterRef: parsed.receiptIndexManifestAfterRef,
    appliedReceipt: value.appliedReceipt,
  });
  if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(value)) return invalid();
  return rebuilt;
};

const parseCourseInput = (input: unknown, storedRecord: boolean) => {
  const value = detach(input);
  if (!exactKeys(value, storedRecord ? COURSE_RECORD_KEYS : COURSE_CREATE_KEYS) ||
    typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.journalSequence, 1) || !safe(value.repositoryRevisionBefore) ||
    value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
    typeof value.rootBeforeFingerprint !== "string" || !HASH.test(value.rootBeforeFingerprint)) {
    return invalid();
  }
  const accountScopeHash = value.accountScopeHash;
  const journalSequence = Number(value.journalSequence);
  if (journalSequence - 1 > Number(value.repositoryRevisionBefore)) return invalid();
  const previousJournalRecordRef = value.previousJournalRecordRef === null ? null
    : parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record");
  if ((journalSequence === 1) !== (previousJournalRecordRef === null)) return invalid();
  return {
    value,
    accountScopeHash,
    journalSequence,
    repositoryRevisionBefore: Number(value.repositoryRevisionBefore),
    rootBeforeFingerprint: value.rootBeforeFingerprint,
    previousJournalRecordRef,
    walletStateBeforeRef: parseRef(value.walletStateBeforeRef, accountScopeHash, "wallet_state"),
    walletStateAfterRef: parseRef(value.walletStateAfterRef, accountScopeHash, "wallet_state"),
    courseStateBeforeRef: value.courseStateBeforeRef === null ? null
      : parseCourseRef(value.courseStateBeforeRef, accountScopeHash),
    courseStateAfterRef: parseCourseRef(value.courseStateAfterRef, accountScopeHash),
    operationIndexManifestBeforeRef: parseRef(value.operationIndexManifestBeforeRef, accountScopeHash, "operation_index_manifest"),
    operationIndexManifestAfterRef: parseRef(value.operationIndexManifestAfterRef, accountScopeHash, "operation_index_manifest"),
    subjectIndexManifestBeforeRef: parseRef(value.subjectIndexManifestBeforeRef, accountScopeHash, "subject_index_manifest"),
    subjectIndexManifestAfterRef: parseRef(value.subjectIndexManifestAfterRef, accountScopeHash, "subject_index_manifest"),
    receiptIndexManifestBeforeRef: parseRef(value.receiptIndexManifestBeforeRef, accountScopeHash, "receipt_index_manifest"),
    receiptIndexManifestAfterRef: parseRef(value.receiptIndexManifestAfterRef, accountScopeHash, "receipt_index_manifest"),
  };
};

export const createOwnerRepositoryCourseUnlockJournalRecord = (
  input: unknown,
): OwnerRepositoryCourseUnlockJournalRecordV1 => {
  const parsed = parseCourseInput(input, false);
  let appliedReceipt: CourseUnlockAppliedReceiptV1;
  try { appliedReceipt = parseCourseUnlockAppliedReceipt(parsed.value.appliedReceipt); }
  catch { return invalid(); }
  const request = appliedReceipt.authorizedRequest;
  const free = appliedReceipt.chargedSubunits === 0;
  const refPairs = [
    [parsed.operationIndexManifestBeforeRef, parsed.operationIndexManifestAfterRef],
    [parsed.subjectIndexManifestBeforeRef, parsed.subjectIndexManifestAfterRef],
    [parsed.receiptIndexManifestBeforeRef, parsed.receiptIndexManifestAfterRef],
  ] as const;
  const allRefs = [
    parsed.walletStateBeforeRef, parsed.walletStateAfterRef,
    ...(parsed.courseStateBeforeRef ? [parsed.courseStateBeforeRef.stateRef] : []),
    parsed.courseStateAfterRef.stateRef,
    parsed.operationIndexManifestBeforeRef, parsed.operationIndexManifestAfterRef,
    parsed.subjectIndexManifestBeforeRef, parsed.subjectIndexManifestAfterRef,
    parsed.receiptIndexManifestBeforeRef, parsed.receiptIndexManifestAfterRef,
    ...(parsed.previousJournalRecordRef ? [parsed.previousJournalRecordRef] : []),
  ];
  const uniqueFingerprints = new Set(allRefs.map((candidate) => candidate.blobFingerprint));
  const expectedUnique = allRefs.length - (free ? 1 : 0);
  if (request.accountScopeHash !== parsed.accountScopeHash ||
    (free ? parsed.courseStateBeforeRef !== null : parsed.courseStateBeforeRef === null) ||
    (parsed.courseStateBeforeRef !== null &&
      parsed.courseStateBeforeRef.courseIdentityFingerprint !==
        appliedReceipt.courseUnlockStateBefore.courseIdentityFingerprint) ||
    parsed.courseStateAfterRef.courseIdentityFingerprint !==
      appliedReceipt.courseUnlockStateAfter.courseIdentityFingerprint ||
    (parsed.courseStateBeforeRef !== null &&
      parsed.courseStateBeforeRef.stateRef.blobFingerprint ===
        parsed.courseStateAfterRef.stateRef.blobFingerprint) ||
    (free ? parsed.walletStateBeforeRef.blobFingerprint !== parsed.walletStateAfterRef.blobFingerprint
      : parsed.walletStateBeforeRef.blobFingerprint === parsed.walletStateAfterRef.blobFingerprint) ||
    refPairs.some(([before, after]) => before.blobFingerprint === after.blobFingerprint) ||
    uniqueFingerprints.size !== expectedUnique) return invalid();
  const body = {
    schemaVersion: "learning-v2-owner-repository-journal-record.v1" as const,
    recordKind: "course_unlock" as const,
    accountScopeHash: parsed.accountScopeHash,
    acceptedAccountGeneration: request.accountGeneration,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    canonicalOperationId: request.operationId,
    operationFingerprint: request.operationFingerprint,
    semanticSubjectFingerprint: request.semanticSubjectFingerprint,
    semanticFingerprint: request.semanticFingerprint,
    appliedReceiptFingerprint: appliedReceipt.appliedReceiptFingerprint,
    courseIdentityFingerprint: appliedReceipt.courseUnlockStateBefore.courseIdentityFingerprint,
    walletStateBeforeFingerprint: appliedReceipt.walletStateBefore.stateFingerprint,
    walletStateAfterFingerprint: appliedReceipt.walletStateAfter.stateFingerprint,
    courseStateBeforeFingerprint: appliedReceipt.courseUnlockStateBefore.stateFingerprint,
    courseStateAfterFingerprint: appliedReceipt.courseUnlockStateAfter.stateFingerprint,
    walletStateBeforeRef: parsed.walletStateBeforeRef,
    walletStateAfterRef: parsed.walletStateAfterRef,
    courseStateBeforeRef: parsed.courseStateBeforeRef,
    courseStateAfterRef: parsed.courseStateAfterRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    subjectIndexManifestAfterRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    receiptIndexManifestAfterRef: parsed.receiptIndexManifestAfterRef,
    appliedReceipt,
  };
  return deepFreeze({ ...body, journalRecordFingerprint: hashCanonicalBody(body) });
};

/** Structural canonical parser only; repository graph validation is separate. */
export const parseOwnerRepositoryCourseUnlockJournalRecord = (
  input: unknown,
): OwnerRepositoryCourseUnlockJournalRecordV1 => {
  const parsed = parseCourseInput(input, true);
  const value = parsed.value;
  if (value.schemaVersion !== "learning-v2-owner-repository-journal-record.v1" ||
    value.recordKind !== "course_unlock" || !safe(value.acceptedAccountGeneration) ||
    !isWalletIdentifier(value.canonicalOperationId) ||
    ![value.operationFingerprint, value.semanticSubjectFingerprint, value.semanticFingerprint,
      value.appliedReceiptFingerprint, value.courseIdentityFingerprint,
      value.walletStateBeforeFingerprint, value.walletStateAfterFingerprint,
      value.courseStateBeforeFingerprint, value.courseStateAfterFingerprint,
      value.journalRecordFingerprint]
      .every((candidate) => typeof candidate === "string" && HASH.test(candidate))) return invalid();
  const rebuilt = createOwnerRepositoryCourseUnlockJournalRecord({
    accountScopeHash: parsed.accountScopeHash,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    walletStateBeforeRef: parsed.walletStateBeforeRef,
    walletStateAfterRef: parsed.walletStateAfterRef,
    courseStateBeforeRef: parsed.courseStateBeforeRef,
    courseStateAfterRef: parsed.courseStateAfterRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    subjectIndexManifestAfterRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    receiptIndexManifestAfterRef: parsed.receiptIndexManifestAfterRef,
    appliedReceipt: value.appliedReceipt,
  });
  if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(value)) return invalid();
  return rebuilt;
};

const parseAliasCoordinates = (input: unknown, storedRecord: boolean) => {
  const value = detach(input);
  if (!exactKeys(value, storedRecord ? ALIAS_RECORD_KEYS : ALIAS_CREATE_KEYS) ||
    typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.journalSequence, 1) || !safe(value.repositoryRevisionBefore) ||
    value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
    typeof value.rootBeforeFingerprint !== "string" || !HASH.test(value.rootBeforeFingerprint)) {
    return invalid();
  }
  const accountScopeHash = value.accountScopeHash;
  const journalSequence = Number(value.journalSequence);
  const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
  if (journalSequence - 1 > repositoryRevisionBefore) return invalid();
  const previousJournalRecordRef = value.previousJournalRecordRef === null ? null
    : parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record");
  if ((journalSequence === 1) !== (previousJournalRecordRef === null)) return invalid();
  return {
    value,
    accountScopeHash,
    journalSequence,
    repositoryRevisionBefore,
    rootBeforeFingerprint: value.rootBeforeFingerprint,
    previousJournalRecordRef,
    canonicalEffectJournalRecordRef: parseRef(
      value.canonicalEffectJournalRecordRef,
      accountScopeHash,
      "journal_record",
    ),
    walletStateRef: parseRef(value.walletStateRef, accountScopeHash, "wallet_state"),
    operationIndexManifestBeforeRef: parseRef(
      value.operationIndexManifestBeforeRef,
      accountScopeHash,
      "operation_index_manifest",
    ),
    operationIndexManifestAfterRef: parseRef(
      value.operationIndexManifestAfterRef,
      accountScopeHash,
      "operation_index_manifest",
    ),
    subjectIndexManifestRef: parseRef(
      value.subjectIndexManifestRef,
      accountScopeHash,
      "subject_index_manifest",
    ),
    receiptIndexManifestRef: parseRef(
      value.receiptIndexManifestRef,
      accountScopeHash,
      "receipt_index_manifest",
    ),
  };
};

/**
 * Creates the canonical structural record for an operation alias. The embedded
 * effect record proves the alias value's semantics, but this function does not
 * prove that canonicalEffectJournalRecordRef is reachable or contains that
 * effect. Repository graph validation must resolve and compare the outer blob.
 */
export const createOwnerRepositoryOperationAliasJournalRecord = (
  input: unknown,
): OwnerRepositoryOperationAliasJournalRecordV1 => {
  const parsed = parseAliasCoordinates(input, false);
  let canonicalEffectRecord: OwnerRepositoryWalletCreditJournalRecordV1;
  let authorizedAliasOperation: WalletAuthorizedOperationV1;
  let aliasEntry: WalletOperationAliasLedgerEntryV2;
  try {
    canonicalEffectRecord = parseOwnerRepositoryWalletCreditJournalRecord(
      parsed.value.canonicalEffectRecord,
    );
    authorizedAliasOperation = createWalletAuthorizedOperation(
      parsed.value.authorizedAliasOperation,
    );
    aliasEntry = createWalletOperationAliasLedgerEntry({
      authorizedAliasOperation,
      appliedReceipt: canonicalEffectRecord.appliedReceipt,
    });
  } catch { return invalid(); }
  const projectionRefs = [
    parsed.walletStateRef,
    parsed.operationIndexManifestBeforeRef,
    parsed.operationIndexManifestAfterRef,
    parsed.subjectIndexManifestRef,
    parsed.receiptIndexManifestRef,
  ];
  const projectionFingerprints = projectionRefs.map((ref) => ref.blobFingerprint);
  const journalRefs = [
    parsed.canonicalEffectJournalRecordRef,
    ...(parsed.previousJournalRecordRef ? [parsed.previousJournalRecordRef] : []),
  ];
  if (canonicalEffectRecord.accountScopeHash !== parsed.accountScopeHash ||
    authorizedAliasOperation.accountScopeHash !== parsed.accountScopeHash ||
    authorizedAliasOperation.accountGeneration <
      canonicalEffectRecord.acceptedAccountGeneration ||
    parsed.operationIndexManifestBeforeRef.blobFingerprint ===
      parsed.operationIndexManifestAfterRef.blobFingerprint ||
    new Set(projectionFingerprints).size !== projectionFingerprints.length ||
    journalRefs.some((journalRef) => projectionFingerprints.includes(journalRef.blobFingerprint))) {
    return invalid();
  }
  const body = {
    schemaVersion: "learning-v2-owner-repository-journal-record.v1" as const,
    recordKind: "operation_alias" as const,
    accountScopeHash: parsed.accountScopeHash,
    acceptedAccountGeneration: authorizedAliasOperation.accountGeneration,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    canonicalEffectJournalRecordRef: parsed.canonicalEffectJournalRecordRef,
    canonicalEffectJournalRecordFingerprint: canonicalEffectRecord.journalRecordFingerprint,
    canonicalOperationId: canonicalEffectRecord.canonicalOperationId,
    aliasOperationId: aliasEntry.operationId,
    aliasOperationFingerprint: aliasEntry.operationFingerprint,
    semanticSubjectFingerprint: aliasEntry.semanticSubjectFingerprint,
    semanticFingerprint: aliasEntry.semanticFingerprint,
    appliedReceiptFingerprint: canonicalEffectRecord.appliedReceiptFingerprint,
    walletStateRef: parsed.walletStateRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestRef: parsed.subjectIndexManifestRef,
    receiptIndexManifestRef: parsed.receiptIndexManifestRef,
    canonicalEffectRecord,
    aliasEntry,
  };
  return deepFreeze({ ...body, journalRecordFingerprint: hashCanonicalBody(body) });
};

/**
 * Strict structural parser. Reachability of the referenced canonical effect and
 * exact operation-index COW are deliberately repository-layer obligations.
 */
export const parseOwnerRepositoryOperationAliasJournalRecord = (
  input: unknown,
): OwnerRepositoryOperationAliasJournalRecordV1 => {
  const parsed = parseAliasCoordinates(input, true);
  let aliasEntry: WalletOperationAliasLedgerEntryV2;
  try { aliasEntry = parseWalletOperationAliasLedgerEntry(parsed.value.aliasEntry); }
  catch { return invalid(); }
  const rebuilt = createOwnerRepositoryOperationAliasJournalRecord({
    accountScopeHash: parsed.accountScopeHash,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    canonicalEffectJournalRecordRef: parsed.canonicalEffectJournalRecordRef,
    walletStateRef: parsed.walletStateRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestRef: parsed.subjectIndexManifestRef,
    receiptIndexManifestRef: parsed.receiptIndexManifestRef,
    canonicalEffectRecord: parsed.value.canonicalEffectRecord,
    authorizedAliasOperation: aliasEntry.authorizedAliasOperation,
  });
  try {
    if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(parsed.value)) return invalid();
  } catch { return invalid(); }
  return rebuilt;
};

const REPAIR_KEY_KINDS = [
  "operation_id",
  "operation_fingerprint",
  "semantic_subject",
  "applied_receipt",
] as const;

const parseRepairCoordinates = (input: unknown, storedRecord: boolean) => {
  const value = detach(input);
  if (!exactKeys(value, storedRecord ? REPAIR_RECORD_KEYS : REPAIR_CREATE_KEYS) ||
    typeof value.accountScopeHash !== "string" || !ACCOUNT.test(value.accountScopeHash) ||
    !safe(value.acceptedAccountGeneration) || !safe(value.journalSequence, 1) ||
    !safe(value.repositoryRevisionBefore) ||
    value.repositoryRevisionBefore === Number.MAX_SAFE_INTEGER ||
    typeof value.rootBeforeFingerprint !== "string" || !HASH.test(value.rootBeforeFingerprint) ||
    !REPAIR_KEY_KINDS.includes(value.repairKeyKind as never)) return invalid();
  const accountScopeHash = value.accountScopeHash;
  const journalSequence = Number(value.journalSequence);
  const repositoryRevisionBefore = Number(value.repositoryRevisionBefore);
  if (journalSequence - 1 > repositoryRevisionBefore) return invalid();
  const previousJournalRecordRef = value.previousJournalRecordRef === null ? null
    : parseRef(value.previousJournalRecordRef, accountScopeHash, "journal_record");
  if ((journalSequence === 1) !== (previousJournalRecordRef === null)) return invalid();
  return {
    value,
    accountScopeHash,
    acceptedAccountGeneration: Number(value.acceptedAccountGeneration),
    journalSequence,
    repositoryRevisionBefore,
    rootBeforeFingerprint: value.rootBeforeFingerprint,
    previousJournalRecordRef,
    canonicalEffectJournalRecordRef: parseRef(
      value.canonicalEffectJournalRecordRef,
      accountScopeHash,
      "journal_record",
    ),
    repairKeyKind: value.repairKeyKind as OwnerRepositoryCanonicalIndexRepairKeyKind,
    walletStateRef: parseRef(value.walletStateRef, accountScopeHash, "wallet_state"),
    operationIndexManifestBeforeRef: parseRef(
      value.operationIndexManifestBeforeRef,
      accountScopeHash,
      "operation_index_manifest",
    ),
    operationIndexManifestAfterRef: parseRef(
      value.operationIndexManifestAfterRef,
      accountScopeHash,
      "operation_index_manifest",
    ),
    subjectIndexManifestBeforeRef: parseRef(
      value.subjectIndexManifestBeforeRef,
      accountScopeHash,
      "subject_index_manifest",
    ),
    subjectIndexManifestAfterRef: parseRef(
      value.subjectIndexManifestAfterRef,
      accountScopeHash,
      "subject_index_manifest",
    ),
    receiptIndexManifestBeforeRef: parseRef(
      value.receiptIndexManifestBeforeRef,
      accountScopeHash,
      "receipt_index_manifest",
    ),
    receiptIndexManifestAfterRef: parseRef(
      value.receiptIndexManifestAfterRef,
      accountScopeHash,
      "receipt_index_manifest",
    ),
  };
};

const deriveRepairTarget = (
  record: OwnerRepositoryWalletCreditJournalRecordV1,
  keyKind: OwnerRepositoryCanonicalIndexRepairKeyKind,
) => {
  const entries = createWalletCanonicalLedgerEntriesFromAppliedReceipt(
    record.appliedReceipt,
  );
  if (keyKind === "operation_id") return {
    indexKind: "operation" as const,
    logicalKey: entries.operationLedgerEntry.operationId,
    value: entries.operationLedgerEntry,
  };
  if (keyKind === "operation_fingerprint") return {
    indexKind: "operation" as const,
    logicalKey: entries.operationLedgerEntry.operationFingerprint,
    value: entries.operationLedgerEntry,
  };
  if (keyKind === "semantic_subject") return {
    indexKind: "subject" as const,
    logicalKey: entries.subjectLedgerEntry.semanticSubjectFingerprint,
    value: entries.subjectLedgerEntry,
  };
  return {
    indexKind: "receipt" as const,
    logicalKey: entries.appliedReceipt.appliedReceiptFingerprint,
    value: entries.appliedReceipt,
  };
};

/**
 * Canonical structural repair for exactly one missing wallet-credit lifetime
 * index key. The repaired key/value/fingerprint are derived from the embedded
 * effect receipt; no transport-supplied index value is accepted.
 */
export const createOwnerRepositoryMissingIndexEntryJournalRecord = (
  input: unknown,
): OwnerRepositoryMissingIndexEntryJournalRecordV1 => {
  const parsed = parseRepairCoordinates(input, false);
  let canonicalEffectRecord: OwnerRepositoryWalletCreditJournalRecordV1;
  try {
    canonicalEffectRecord = parseOwnerRepositoryWalletCreditJournalRecord(
      parsed.value.canonicalEffectRecord,
    );
  } catch { return invalid(); }
  if (canonicalEffectRecord.accountScopeHash !== parsed.accountScopeHash ||
    parsed.acceptedAccountGeneration < canonicalEffectRecord.acceptedAccountGeneration) {
    return invalid();
  }
  const target = deriveRepairTarget(canonicalEffectRecord, parsed.repairKeyKind);
  const pairs = {
    operation: [
      parsed.operationIndexManifestBeforeRef,
      parsed.operationIndexManifestAfterRef,
    ],
    subject: [
      parsed.subjectIndexManifestBeforeRef,
      parsed.subjectIndexManifestAfterRef,
    ],
    receipt: [
      parsed.receiptIndexManifestBeforeRef,
      parsed.receiptIndexManifestAfterRef,
    ],
  } as const;
  if (Object.entries(pairs).some(([indexKind, [before, after]]) =>
    indexKind === target.indexKind
      ? before.blobFingerprint === after.blobFingerprint
      : before.blobFingerprint !== after.blobFingerprint)) return invalid();
  const beforeRefs = [
    parsed.walletStateRef,
    parsed.operationIndexManifestBeforeRef,
    parsed.subjectIndexManifestBeforeRef,
    parsed.receiptIndexManifestBeforeRef,
  ];
  const afterRefs = [
    parsed.walletStateRef,
    parsed.operationIndexManifestAfterRef,
    parsed.subjectIndexManifestAfterRef,
    parsed.receiptIndexManifestAfterRef,
  ];
  if (new Set(beforeRefs.map((ref) => ref.blobFingerprint)).size !== beforeRefs.length ||
    new Set(afterRefs.map((ref) => ref.blobFingerprint)).size !== afterRefs.length ||
    [parsed.canonicalEffectJournalRecordRef, ...(parsed.previousJournalRecordRef
      ? [parsed.previousJournalRecordRef]
      : [])].some((journalRef) => [...beforeRefs, ...afterRefs]
      .some((projectionRef) => projectionRef.blobFingerprint === journalRef.blobFingerprint))) {
    return invalid();
  }
  const body = {
    schemaVersion: "learning-v2-owner-repository-journal-record.v1" as const,
    recordKind: "missing_index_entry" as const,
    accountScopeHash: parsed.accountScopeHash,
    acceptedAccountGeneration: parsed.acceptedAccountGeneration,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    canonicalEffectJournalRecordRef: parsed.canonicalEffectJournalRecordRef,
    canonicalEffectJournalRecordFingerprint: canonicalEffectRecord.journalRecordFingerprint,
    canonicalOperationId: canonicalEffectRecord.canonicalOperationId,
    operationFingerprint: canonicalEffectRecord.operationFingerprint,
    semanticSubjectFingerprint: canonicalEffectRecord.semanticSubjectFingerprint,
    semanticFingerprint: canonicalEffectRecord.semanticFingerprint,
    appliedReceiptFingerprint: canonicalEffectRecord.appliedReceiptFingerprint,
    repairIndexKind: target.indexKind,
    repairKeyKind: parsed.repairKeyKind,
    repairLogicalKey: target.logicalKey,
    repairValueFingerprint: hashCanonicalBody(target.value),
    walletStateRef: parsed.walletStateRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    subjectIndexManifestAfterRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    receiptIndexManifestAfterRef: parsed.receiptIndexManifestAfterRef,
    canonicalEffectRecord,
  };
  return deepFreeze({ ...body, journalRecordFingerprint: hashCanonicalBody(body) });
};

/** Structural parser only; repository reachability and exact COW remain separate. */
export const parseOwnerRepositoryMissingIndexEntryJournalRecord = (
  input: unknown,
): OwnerRepositoryMissingIndexEntryJournalRecordV1 => {
  const parsed = parseRepairCoordinates(input, true);
  const rebuilt = createOwnerRepositoryMissingIndexEntryJournalRecord({
    accountScopeHash: parsed.accountScopeHash,
    acceptedAccountGeneration: parsed.acceptedAccountGeneration,
    journalSequence: parsed.journalSequence,
    repositoryRevisionBefore: parsed.repositoryRevisionBefore,
    rootBeforeFingerprint: parsed.rootBeforeFingerprint,
    previousJournalRecordRef: parsed.previousJournalRecordRef,
    canonicalEffectJournalRecordRef: parsed.canonicalEffectJournalRecordRef,
    repairKeyKind: parsed.repairKeyKind,
    walletStateRef: parsed.walletStateRef,
    operationIndexManifestBeforeRef: parsed.operationIndexManifestBeforeRef,
    operationIndexManifestAfterRef: parsed.operationIndexManifestAfterRef,
    subjectIndexManifestBeforeRef: parsed.subjectIndexManifestBeforeRef,
    subjectIndexManifestAfterRef: parsed.subjectIndexManifestAfterRef,
    receiptIndexManifestBeforeRef: parsed.receiptIndexManifestBeforeRef,
    receiptIndexManifestAfterRef: parsed.receiptIndexManifestAfterRef,
    canonicalEffectRecord: parsed.value.canonicalEffectRecord,
  });
  try {
    if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(parsed.value)) return invalid();
  } catch { return invalid(); }
  return rebuilt;
};

/**
 * Strict dispatcher for value-changing economic records only. Index closure
 * repairs and transport aliases are repository-derived record kinds and are not
 * accepted through this effect boundary.
 */
export const parseOwnerRepositoryEconomicEffectJournalRecord = (
  input: unknown,
): OwnerRepositoryEconomicEffectJournalRecordV1 => {
  const value = detach(input);
  if (value.recordKind === "wallet_credit") {
    return parseOwnerRepositoryWalletCreditJournalRecord(value);
  }
  if (value.recordKind === "course_unlock") {
    return parseOwnerRepositoryCourseUnlockJournalRecord(value);
  }
  return invalid();
};

/** Strict dispatcher for every currently supported journal record kind. */
export const parseOwnerRepositoryJournalRecord = (
  input: unknown,
): OwnerRepositoryJournalRecordV1 => {
  const value = detach(input);
  if (value.recordKind === "operation_alias") {
    return parseOwnerRepositoryOperationAliasJournalRecord(value);
  }
  if (value.recordKind === "missing_index_entry") {
    return parseOwnerRepositoryMissingIndexEntryJournalRecord(value);
  }
  return parseOwnerRepositoryEconomicEffectJournalRecord(value);
};
