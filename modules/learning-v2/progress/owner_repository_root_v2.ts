import { detachBoundedWalletJson } from "../contracts/wallet";
import { canonicalJsonV1, sha256Utf8, utf8ByteLengthV1 } from "../policies/decision_registry";
import type {
  OwnerRepositoryBlobRefV1,
  OwnerRepositoryRootV1,
} from "./owner_repository";
import {
  parseOwnerRepositoryCourseManifestBlob,
  type OwnerRepositoryCourseManifestBlob,
} from "./owner_repository_course_manifest";
import type { OwnerRepositoryRadixNodeResolver } from "./owner_repository_radix";

export interface OwnerRepositoryRootV2 {
  readonly schemaVersion: "learning-v2-owner-repository-root.v2";
  readonly accountScopeHash: string;
  readonly currentGeneration: number;
  readonly repositoryRevision: number;
  readonly journalSequence: number;
  readonly previousRootFingerprint: string | null;
  readonly journalHeadRef: OwnerRepositoryBlobRefV1 | null;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly courseStateManifestRef: OwnerRepositoryBlobRefV1 & { readonly kind: "course_state_manifest" };
  readonly operationIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly rootFingerprint: string;
}

export interface OwnerRepositoryRootV2Materialization {
  readonly root: OwnerRepositoryRootV2;
  readonly encoded: string;
}

export interface OwnerRepositoryGenesisRootV2Input {
  readonly accountScopeHash: string;
  readonly currentGeneration: number;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly courseStateManifestRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
}

const ROOT_MAX_BYTES = 64 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const ROOT_KEYS = [
  "schemaVersion", "accountScopeHash", "currentGeneration", "repositoryRevision",
  "journalSequence", "previousRootFingerprint", "journalHeadRef", "walletStateRef",
  "courseStateManifestRef", "operationIndexManifestRef", "subjectIndexManifestRef",
  "receiptIndexManifestRef", "rootFingerprint",
] as const;
const V1_KEYS = [
  "schemaVersion", "accountScopeHash", "currentGeneration", "repositoryRevision",
  "journalSequence", "previousRootFingerprint", "journalHeadRef", "walletStateRef",
  "courseStateRefs", "operationIndexManifestRef", "subjectIndexManifestRef",
  "receiptIndexManifestRef", "rootFingerprint",
] as const;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && ownKeys.every(
    (key) => typeof key === "string" && keys.includes(key),
  );
};
const readRecord = (
  input: unknown,
  requiredKeys: readonly string[],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.length !== requiredKeys.length ||
    keys.some((key) => typeof key !== "string" || !requiredKeys.includes(key)) ||
    requiredKeys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })) return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of requiredKeys) result[key] = descriptors[key].value;
  return result;
};
const safe = (value: unknown) => Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const invalid = (): never => { throw new Error("owner_repository_root_v2_invalid"); };
const blobKey = (accountScopeHash: string, fingerprint: string) =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const parseRef = (
  input: unknown,
  accountScopeHash: string,
  expectedKind: OwnerRepositoryBlobRefV1["kind"],
): OwnerRepositoryBlobRefV1 => {
  if (!isRecord(input) || !exactKeys(input, REF_KEYS) ||
    input.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" || input.kind !== expectedKind ||
    typeof input.blobFingerprint !== "string" || !HASH.test(input.blobFingerprint) ||
    input.blobKey !== blobKey(accountScopeHash, input.blobFingerprint)) return invalid();
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
    kind: expectedKind,
    blobKey: input.blobKey as string,
    blobFingerprint: input.blobFingerprint,
  });
};

const materialize = (
  body: Omit<OwnerRepositoryRootV2, "rootFingerprint">,
): OwnerRepositoryRootV2Materialization => {
  const root = deepFreeze({ ...body, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) });
  const encoded = canonicalJsonV1(root);
  if (utf8ByteLengthV1(encoded) > ROOT_MAX_BYTES) throw new Error("owner_repository_root_v2_overflow");
  return deepFreeze({ root, encoded });
};

export const parseOwnerRepositoryRootV2 = (
  input: unknown,
  expectedAccountScopeHash: string,
): OwnerRepositoryRootV2Materialization => {
  if (typeof expectedAccountScopeHash !== "string" || !ACCOUNT.test(expectedAccountScopeHash)) return invalid();
  let detached: unknown;
  try { detached = detachBoundedWalletJson(input, "owner_repository_root_v2_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || !exactKeys(detached, ROOT_KEYS) ||
    detached.schemaVersion !== "learning-v2-owner-repository-root.v2" ||
    detached.accountScopeHash !== expectedAccountScopeHash || !safe(detached.currentGeneration) ||
    !safe(detached.repositoryRevision) || !safe(detached.journalSequence) ||
    Number(detached.journalSequence) > Number(detached.repositoryRevision) ||
    (detached.previousRootFingerprint !== null &&
      (typeof detached.previousRootFingerprint !== "string" || !HASH.test(detached.previousRootFingerprint))) ||
    typeof detached.rootFingerprint !== "string" || !HASH.test(detached.rootFingerprint)) return invalid();
  if ((Number(detached.repositoryRevision) === 0) !== (detached.previousRootFingerprint === null)) {
    return invalid();
  }
  const accountScopeHash = detached.accountScopeHash;
  const journalSequence = Number(detached.journalSequence);
  const journalHeadRef = detached.journalHeadRef === null ? null
    : parseRef(detached.journalHeadRef, accountScopeHash, "journal_record");
  if ((journalSequence === 0) !== (journalHeadRef === null)) return invalid();
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v2" as const,
    accountScopeHash,
    currentGeneration: Number(detached.currentGeneration),
    repositoryRevision: Number(detached.repositoryRevision),
    journalSequence,
    previousRootFingerprint: detached.previousRootFingerprint as string | null,
    journalHeadRef,
    walletStateRef: parseRef(detached.walletStateRef, accountScopeHash, "wallet_state"),
    courseStateManifestRef: parseRef(
      detached.courseStateManifestRef,
      accountScopeHash,
      "course_state_manifest",
    ) as OwnerRepositoryRootV2["courseStateManifestRef"],
    operationIndexManifestRef: parseRef(detached.operationIndexManifestRef, accountScopeHash, "operation_index_manifest"),
    subjectIndexManifestRef: parseRef(detached.subjectIndexManifestRef, accountScopeHash, "subject_index_manifest"),
    receiptIndexManifestRef: parseRef(detached.receiptIndexManifestRef, accountScopeHash, "receipt_index_manifest"),
  };
  const refs = [body.walletStateRef, body.courseStateManifestRef, body.operationIndexManifestRef,
    body.subjectIndexManifestRef, body.receiptIndexManifestRef, ...(journalHeadRef ? [journalHeadRef] : [])];
  if (new Set(refs.map((ref) => ref.blobFingerprint)).size !== refs.length) return invalid();
  const rebuilt = materialize(body);
  if (canonicalJsonV1(rebuilt.root) !== canonicalJsonV1(detached)) return invalid();
  return rebuilt;
};

export const parseOwnerRepositoryRootV2Raw = (
  raw: unknown,
  expectedAccountScopeHash: string,
): OwnerRepositoryRootV2Materialization => {
  let parsed: unknown;
  try {
    if (typeof raw !== "string" || utf8ByteLengthV1(raw) > ROOT_MAX_BYTES) return invalid();
    parsed = JSON.parse(raw) as unknown;
    if (canonicalJsonV1(parsed) !== raw) return invalid();
  } catch { return invalid(); }
  const result = parseOwnerRepositoryRootV2(parsed, expectedAccountScopeHash);
  if (result.encoded !== raw) return invalid();
  return result;
};

export const createGenesisOwnerRepositoryRootV2 = (
  input: OwnerRepositoryGenesisRootV2Input,
): OwnerRepositoryRootV2Materialization => {
  let detached: unknown;
  try { detached = detachBoundedWalletJson(input, "owner_repository_root_v2_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || !exactKeys(detached, [
    "accountScopeHash", "currentGeneration", "walletStateRef", "courseStateManifestRef",
    "operationIndexManifestRef", "subjectIndexManifestRef", "receiptIndexManifestRef",
  ]) || typeof detached.accountScopeHash !== "string" || !ACCOUNT.test(detached.accountScopeHash) ||
    !safe(detached.currentGeneration)) return invalid();
  const accountScopeHash = detached.accountScopeHash;
  const created = materialize({
    schemaVersion: "learning-v2-owner-repository-root.v2",
    accountScopeHash,
    currentGeneration: detached.currentGeneration as number,
    repositoryRevision: 0,
    journalSequence: 0,
    previousRootFingerprint: null,
    journalHeadRef: null,
    walletStateRef: parseRef(detached.walletStateRef, accountScopeHash, "wallet_state"),
    courseStateManifestRef: parseRef(
      detached.courseStateManifestRef,
      accountScopeHash,
      "course_state_manifest",
    ) as OwnerRepositoryRootV2["courseStateManifestRef"],
    operationIndexManifestRef: parseRef(
      detached.operationIndexManifestRef,
      accountScopeHash,
      "operation_index_manifest",
    ),
    subjectIndexManifestRef: parseRef(
      detached.subjectIndexManifestRef,
      accountScopeHash,
      "subject_index_manifest",
    ),
    receiptIndexManifestRef: parseRef(
      detached.receiptIndexManifestRef,
      accountScopeHash,
      "receipt_index_manifest",
    ),
  });
  return parseOwnerRepositoryRootV2(created.root, accountScopeHash);
};

export const advanceOwnerRepositoryRootV2Generation = (input: {
  readonly root: OwnerRepositoryRootV2;
  readonly targetGeneration: number;
}): OwnerRepositoryRootV2Materialization => {
  let request: Readonly<Record<string, unknown>>;
  let detachedRoot: unknown;
  try { request = readRecord(input, ["root", "targetGeneration"]); }
  catch { return invalid(); }
  try { detachedRoot = detachBoundedWalletJson(request.root, "owner_repository_root_v2_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string" ||
    !safe(request.targetGeneration)) return invalid();
  const parsed = parseOwnerRepositoryRootV2(detachedRoot, detachedRoot.accountScopeHash).root;
  if (Number(request.targetGeneration) <= parsed.currentGeneration ||
    parsed.repositoryRevision === Number.MAX_SAFE_INTEGER) return invalid();
  const { rootFingerprint, ...body } = parsed;
  const advanced = materialize({
    ...body,
    currentGeneration: request.targetGeneration as number,
    repositoryRevision: parsed.repositoryRevision + 1,
    previousRootFingerprint: rootFingerprint,
  });
  return parseOwnerRepositoryRootV2(advanced.root, parsed.accountScopeHash);
};

export const migrateVerifiedGenesisOwnerRepositoryRootV1 = async (input: {
  readonly rootV1: OwnerRepositoryRootV1;
  readonly targetGeneration: number;
  readonly emptyCourseStateManifestBlob: OwnerRepositoryCourseManifestBlob;
  readonly resolveCourseNode: OwnerRepositoryRadixNodeResolver;
}): Promise<OwnerRepositoryRootV2Materialization> => {
  let request: Readonly<Record<string, unknown>>;
  let rootV1: Record<string, unknown>;
  let manifestBlob: Readonly<Record<string, unknown>>;
  try {
    request = readRecord(input, [
      "rootV1", "targetGeneration", "emptyCourseStateManifestBlob", "resolveCourseNode",
    ]);
    rootV1 = detachBoundedWalletJson(
      request.rootV1,
      "owner_repository_root_v2_invalid",
    ) as Record<string, unknown>;
    manifestBlob = readRecord(request.emptyCourseStateManifestBlob, ["ref", "encoded"]);
  } catch { return invalid(); }
  if (!isRecord(rootV1) || !exactKeys(rootV1, V1_KEYS) ||
    rootV1.schemaVersion !== "learning-v2-owner-repository-root.v1" ||
    typeof rootV1.accountScopeHash !== "string" || !ACCOUNT.test(rootV1.accountScopeHash) ||
    !safe(rootV1.currentGeneration) || rootV1.repositoryRevision !== 0 ||
    rootV1.previousRootFingerprint !== null || rootV1.journalSequence !== 0 ||
    rootV1.journalHeadRef !== null || !Array.isArray(rootV1.courseStateRefs) ||
    rootV1.courseStateRefs.length !== 0 ||
    typeof rootV1.rootFingerprint !== "string" || !HASH.test(rootV1.rootFingerprint) ||
    !safe(request.targetGeneration) ||
    Number(request.targetGeneration) < Number(rootV1.currentGeneration) ||
    typeof request.resolveCourseNode !== "function" || typeof manifestBlob.encoded !== "string") {
    return invalid();
  }
  const accountScopeHash = rootV1.accountScopeHash;
  const rootV1Body = { ...rootV1 } as Record<string, unknown>;
  delete rootV1Body.rootFingerprint;
  if (sha256Utf8(canonicalJsonV1(rootV1Body)) !== rootV1.rootFingerprint) return invalid();
  let parsedCourseManifest;
  try {
    parsedCourseManifest = await parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash,
      ref: manifestBlob.ref as OwnerRepositoryBlobRefV1,
      raw: manifestBlob.encoded,
      resolveNode: request.resolveCourseNode as OwnerRepositoryRadixNodeResolver,
    });
  } catch { return invalid(); }
  if (parsedCourseManifest.manifest.entryCount !== 0 ||
    parsedCourseManifest.manifest.rootNodeRef !== null) return invalid();
  const migrated = materialize({
    schemaVersion: "learning-v2-owner-repository-root.v2",
    accountScopeHash,
    currentGeneration: request.targetGeneration as number,
    repositoryRevision: 1,
    journalSequence: 0,
    previousRootFingerprint: rootV1.rootFingerprint as string,
    journalHeadRef: null,
    walletStateRef: parseRef(rootV1.walletStateRef, accountScopeHash, "wallet_state"),
    courseStateManifestRef: parseRef(
      parsedCourseManifest.manifestBlob.ref,
      accountScopeHash,
      "course_state_manifest",
    ) as OwnerRepositoryRootV2["courseStateManifestRef"],
    operationIndexManifestRef: parseRef(rootV1.operationIndexManifestRef, accountScopeHash, "operation_index_manifest"),
    subjectIndexManifestRef: parseRef(rootV1.subjectIndexManifestRef, accountScopeHash, "subject_index_manifest"),
    receiptIndexManifestRef: parseRef(rootV1.receiptIndexManifestRef, accountScopeHash, "receipt_index_manifest"),
  });
  return parseOwnerRepositoryRootV2(migrated.root, accountScopeHash);
};
