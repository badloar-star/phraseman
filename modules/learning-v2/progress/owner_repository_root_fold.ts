import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { detachBoundedWalletJson } from "../contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import {
  parseOwnerRepositoryJournalRecord,
  type OwnerRepositoryJournalRecordV1,
  type OwnerRepositoryWalletCreditJournalRecordV1,
} from "./owner_repository_journal";
import {
  parseOwnerRepositoryRootV2,
  type OwnerRepositoryRootV2,
  type OwnerRepositoryRootV2Materialization,
} from "./owner_repository_root_v2";

export interface OwnerRepositoryJournalRecordBlobV1 {
  readonly ref: OwnerRepositoryBlobRefV1 & { readonly kind: "journal_record" };
  readonly encoded: string;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 512 * 1024;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => { throw new Error("owner_repository_root_fold_invalid"); };
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const readRecord = (input: unknown, keys: readonly string[]) => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" ||
    !keys.includes(key)) || keys.some((key) => {
    const descriptor = descriptors[key];
    return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
  })) return invalid();
  return Object.fromEntries(keys.map((key) => [key, descriptors[key].value])) as Record<string, unknown>;
};
const blobKey = (accountScopeHash: string, fingerprint: string) =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const equal = (left: unknown, right: unknown) => canonicalJsonV1(left) === canonicalJsonV1(right);

export const materializeOwnerRepositoryJournalRecordBlob = (
  input: unknown,
): OwnerRepositoryJournalRecordBlobV1 => {
  let record: OwnerRepositoryJournalRecordV1;
  try { record = parseOwnerRepositoryJournalRecord(input); }
  catch { return invalid(); }
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1" as const,
    accountScopeHash: record.accountScopeHash,
    kind: "journal_record" as const,
    payload: record,
  };
  let encoded: string;
  try { encoded = canonicalJsonV1(envelope); }
  catch { return invalid(); }
  if (utf8ByteLengthV1(encoded) > MAX_BYTES) return invalid();
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "journal_record" as const,
      blobKey: blobKey(record.accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
  });
};

export const parseOwnerRepositoryJournalRecordBlob = (input: unknown): Readonly<{
  record: OwnerRepositoryJournalRecordV1;
  blob: OwnerRepositoryJournalRecordBlobV1;
}> => {
  let request: Record<string, unknown>;
  let ref: Record<string, unknown>;
  try {
    request = readRecord(input, ["accountScopeHash", "ref", "raw"]);
    ref = readRecord(request.ref, REF_KEYS);
  } catch { return invalid(); }
  if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.raw !== "string" ||
    ref.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    ref.kind !== "journal_record" || typeof ref.blobFingerprint !== "string" ||
    !HASH.test(ref.blobFingerprint) ||
    ref.blobKey !== blobKey(request.accountScopeHash, ref.blobFingerprint)) return invalid();
  let envelope: unknown;
  try {
    if (utf8ByteLengthV1(request.raw) > MAX_BYTES || sha256Utf8(request.raw) !== ref.blobFingerprint) {
      return invalid();
    }
    envelope = JSON.parse(request.raw);
    if (canonicalJsonV1(envelope) !== request.raw) return invalid();
  } catch { return invalid(); }
  let body: Record<string, unknown>;
  try { body = readRecord(envelope, ["schemaVersion", "accountScopeHash", "kind", "payload"]); }
  catch { return invalid(); }
  if (body.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    body.accountScopeHash !== request.accountScopeHash || body.kind !== "journal_record") return invalid();
  let record: OwnerRepositoryJournalRecordV1;
  try { record = parseOwnerRepositoryJournalRecord(body.payload); }
  catch { return invalid(); }
  const rebuilt = materializeOwnerRepositoryJournalRecordBlob(record);
  if (rebuilt.encoded !== request.raw || !equal(rebuilt.ref, ref)) return invalid();
  return deepFreeze({ record, blob: rebuilt });
};

/**
 * Structural ancestry binding only. This function does not authorize a credit,
 * resolve wallet/index blobs, prove receipt economics, or commit storage.
 * Repository integration must complete those checks before using the result.
 */
export const bindOwnerRepositoryWalletCreditSuccessorRootV2 = (input: unknown):
OwnerRepositoryRootV2Materialization => {
  let request: Record<string, unknown>;
  let detachedRoot: unknown;
  try { request = readRecord(input, ["rootBefore", "journalRecordBlob"]); }
  catch { return invalid(); }
  try { detachedRoot = detachBoundedWalletJson(request.rootBefore, "owner_repository_root_fold_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string") return invalid();
  let root: OwnerRepositoryRootV2;
  let parsedBlob: ReturnType<typeof parseOwnerRepositoryJournalRecordBlob>;
  try {
    root = parseOwnerRepositoryRootV2(
      detachedRoot,
      detachedRoot.accountScopeHash,
    ).root;
    const supplied = readRecord(request.journalRecordBlob, ["ref", "encoded"]);
    parsedBlob = parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash: root.accountScopeHash,
      ref: supplied.ref,
      raw: supplied.encoded,
    });
  } catch { return invalid(); }
  if (parsedBlob.record.recordKind !== "wallet_credit") return invalid();
  const record = parsedBlob.record as OwnerRepositoryWalletCreditJournalRecordV1;
  if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER ||
    record.accountScopeHash !== root.accountScopeHash ||
    record.acceptedAccountGeneration !== root.currentGeneration ||
    record.repositoryRevisionBefore !== root.repositoryRevision ||
    record.rootBeforeFingerprint !== root.rootFingerprint ||
    record.journalSequence !== root.journalSequence + 1 ||
    !equal(record.previousJournalRecordRef, root.journalHeadRef) ||
    !equal(record.walletStateBeforeRef, root.walletStateRef) ||
    !equal(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef) ||
    !equal(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
    !equal(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)) return invalid();
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v2" as const,
    accountScopeHash: root.accountScopeHash,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: record.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: parsedBlob.blob.ref,
    walletStateRef: record.walletStateAfterRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef: record.operationIndexManifestAfterRef,
    subjectIndexManifestRef: record.subjectIndexManifestAfterRef,
    receiptIndexManifestRef: record.receiptIndexManifestAfterRef,
  };
  const candidate = { ...body, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) };
  try { return parseOwnerRepositoryRootV2(candidate, root.accountScopeHash); }
  catch { return invalid(); }
};
