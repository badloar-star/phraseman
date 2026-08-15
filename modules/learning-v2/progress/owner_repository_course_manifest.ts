import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { detachBoundedWalletJson } from "../contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import {
  lookupOwnerRepositoryRadix,
  planOwnerRepositoryRadixBatch,
  type OwnerRepositoryCourseStateIndexValueV1,
  type OwnerRepositoryLegacyEmptyIndexManifestV1,
  type OwnerRepositoryRadixBlob,
  type OwnerRepositoryRadixEntryV1,
  type OwnerRepositoryRadixManifestV2,
  type OwnerRepositoryRadixNodeResolver,
  type OwnerRepositoryRadixReadBudget,
} from "./owner_repository_radix";

export type OwnerRepositoryCourseStateManifestV1 = OwnerRepositoryRadixManifestV2 & {
  readonly indexKind: "course_state";
};

export interface OwnerRepositoryCourseManifestBlob {
  readonly ref: OwnerRepositoryBlobRefV1 & { readonly kind: "course_state_manifest" };
  readonly encoded: string;
}

export interface OwnerRepositoryCourseStateMutationPlan {
  readonly manifest: OwnerRepositoryCourseStateManifestV1;
  readonly manifestBlob: OwnerRepositoryCourseManifestBlob;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MANIFEST_MAX_BYTES = 64 * 1024;
const ENTRY_KEYS = ["schemaVersion", "courseIdentityFingerprint", "stateRef"] as const;
const REF_KEYS = ["schemaVersion", "kind", "blobKey", "blobFingerprint"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && ownKeys.every(
    (key) => typeof key === "string" && keys.includes(key),
  );
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const blobKey = (accountScopeHash: string, fingerprint: string) =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const invalid = (): never => { throw new Error("owner_course_manifest_invalid"); };
const readRecord = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string") ||
    requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
    keys.some((key) => typeof key !== "string" ||
      (!requiredKeys.includes(key) && !optionalKeys.includes(key)))) return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || !descriptor.enumerable) return invalid();
    result[key] = descriptor.value;
  }
  return result;
};

export const parseOwnerRepositoryCourseStateEntry = (
  input: unknown,
  accountScopeHash: string,
): OwnerRepositoryCourseStateIndexValueV1 => {
  if (typeof accountScopeHash !== "string") return invalid();
  let detached: unknown;
  try { detached = detachBoundedWalletJson(input, "owner_course_manifest_invalid"); }
  catch { return invalid(); }
  if (!ACCOUNT.test(accountScopeHash) || !isRecord(detached) || !exactKeys(detached, ENTRY_KEYS) ||
    detached.schemaVersion !== "learning-v2-owner-repository-course-entry.v1" ||
    typeof detached.courseIdentityFingerprint !== "string" || !HASH.test(detached.courseIdentityFingerprint) ||
    !isRecord(detached.stateRef) || !exactKeys(detached.stateRef, REF_KEYS) ||
    detached.stateRef.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    detached.stateRef.kind !== "course_unlock_state" ||
    typeof detached.stateRef.blobFingerprint !== "string" || !HASH.test(detached.stateRef.blobFingerprint) ||
    detached.stateRef.blobKey !== blobKey(accountScopeHash, detached.stateRef.blobFingerprint)) return invalid();
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-course-entry.v1" as const,
    courseIdentityFingerprint: detached.courseIdentityFingerprint,
    stateRef: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "course_unlock_state" as const,
      blobKey: detached.stateRef.blobKey as string,
      blobFingerprint: detached.stateRef.blobFingerprint,
    },
  });
};

const legacyEmptyManifest = (): OwnerRepositoryLegacyEmptyIndexManifestV1 => ({
  schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
  indexKind: "course_state",
  shardBits: 8,
  shards: [],
});

const materializeManifestBlob = (
  accountScopeHash: string,
  manifest: OwnerRepositoryCourseStateManifestV1,
): OwnerRepositoryCourseManifestBlob => {
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1" as const,
    accountScopeHash,
    kind: "course_state_manifest" as const,
    payload: manifest,
  };
  const encoded = canonicalJsonV1(envelope);
  if (utf8ByteLengthV1(encoded) > MANIFEST_MAX_BYTES) throw new Error("owner_course_manifest_overflow");
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "course_state_manifest" as const,
      blobKey: blobKey(accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
  });
};

const normalizeManifest = async (input: {
  readonly accountScopeHash: string;
  readonly manifest: OwnerRepositoryLegacyEmptyIndexManifestV1 | OwnerRepositoryCourseStateManifestV1;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}) => {
  const hasReadBudget = Object.prototype.hasOwnProperty.call(input, "readBudget");
  return planOwnerRepositoryRadixBatch({
    accountScopeHash: input.accountScopeHash,
    indexKind: "course_state",
    manifest: input.manifest,
    mutations: [],
    resolveNode: input.resolveNode,
    ...(hasReadBudget ? { readBudget: input.readBudget as OwnerRepositoryRadixReadBudget } : {}),
  });
};

export const createEmptyOwnerRepositoryCourseManifest = async (
  accountScopeHash: string,
): Promise<OwnerRepositoryCourseStateMutationPlan> => {
  if (typeof accountScopeHash !== "string" || !ACCOUNT.test(accountScopeHash)) return invalid();
  const plan = await normalizeManifest({
    accountScopeHash,
    manifest: legacyEmptyManifest(),
    resolveNode: () => null,
  });
  const manifest = plan.manifest as OwnerRepositoryCourseStateManifestV1;
  return deepFreeze({
    manifest,
    manifestBlob: materializeManifestBlob(accountScopeHash, manifest),
    immutableNodeBlobs: plan.immutableBlobs,
    changed: true,
  });
};

export const parseOwnerRepositoryCourseManifestBlob = async (input: {
  readonly accountScopeHash: string;
  readonly ref: OwnerRepositoryBlobRefV1;
  readonly raw: unknown;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<Readonly<{
  manifest: OwnerRepositoryCourseStateManifestV1;
  manifestBlob: OwnerRepositoryCourseManifestBlob;
}>> => {
  const request = readRecord(
    input,
    ["accountScopeHash", "ref", "raw", "resolveNode"],
    ["readBudget"],
  );
  let parsedRef: OwnerRepositoryCourseManifestBlob["ref"];
  try {
    const ref = readRecord(request.ref, REF_KEYS);
    if (ref.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
      ref.kind !== "course_state_manifest" ||
      typeof ref.blobFingerprint !== "string" || !HASH.test(ref.blobFingerprint) ||
      typeof request.accountScopeHash !== "string" ||
      ref.blobKey !== blobKey(request.accountScopeHash, ref.blobFingerprint)) {
      throw new Error("invalid_ref");
    }
    parsedRef = deepFreeze({
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "course_state_manifest" as const,
      blobKey: ref.blobKey as string,
      blobFingerprint: ref.blobFingerprint,
    });
  } catch {
    throw new Error("owner_course_manifest_indeterminate");
  }
  if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.raw !== "string" || typeof request.resolveNode !== "function") {
    throw new Error("owner_course_manifest_indeterminate");
  }
  try {
    if (utf8ByteLengthV1(request.raw) > MANIFEST_MAX_BYTES ||
      sha256Utf8(request.raw) !== parsedRef.blobFingerprint) {
      throw new Error("invalid_raw");
    }
  } catch { throw new Error("owner_course_manifest_indeterminate"); }
  let envelope: unknown;
  try {
    envelope = JSON.parse(request.raw) as unknown;
    if (canonicalJsonV1(envelope) !== request.raw) throw new Error("noncanonical");
  } catch { throw new Error("owner_course_manifest_indeterminate"); }
  if (!isRecord(envelope) || !exactKeys(envelope, ["schemaVersion", "accountScopeHash", "kind", "payload"]) ||
    envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    envelope.accountScopeHash !== request.accountScopeHash || envelope.kind !== "course_state_manifest") {
    throw new Error("owner_course_manifest_indeterminate");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
  let normalized;
  try {
    normalized = await normalizeManifest({
      accountScopeHash: request.accountScopeHash,
      manifest: envelope.payload as OwnerRepositoryCourseStateManifestV1,
      resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
      ...(hasReadBudget ? { readBudget: request.readBudget as OwnerRepositoryRadixReadBudget } : {}),
    });
  } catch { throw new Error("owner_course_manifest_indeterminate"); }
  if (normalized.changed || canonicalJsonV1(normalized.manifest) !== canonicalJsonV1(envelope.payload)) {
    throw new Error("owner_course_manifest_indeterminate");
  }
  const manifest = normalized.manifest as OwnerRepositoryCourseStateManifestV1;
  return deepFreeze({
    manifest,
    manifestBlob: { ref: parsedRef, encoded: request.raw },
  });
};

export const lookupOwnerRepositoryCourseState = async (input: {
  readonly accountScopeHash: string;
  readonly manifest: OwnerRepositoryCourseStateManifestV1;
  readonly courseIdentityFingerprint: string;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryCourseStateIndexValueV1 | undefined> => {
  const request = readRecord(
    input,
    ["accountScopeHash", "manifest", "courseIdentityFingerprint", "resolveNode"],
    ["readBudget"],
  );
  if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.courseIdentityFingerprint !== "string" || !HASH.test(request.courseIdentityFingerprint) ||
    typeof request.resolveNode !== "function") return invalid();
  const accountScopeHash = request.accountScopeHash;
  const courseIdentityFingerprint = request.courseIdentityFingerprint;
  const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
  let found: OwnerRepositoryRadixEntryV1 | undefined;
  try {
    found = await lookupOwnerRepositoryRadix({
      accountScopeHash,
      indexKind: "course_state",
      manifest: request.manifest as OwnerRepositoryCourseStateManifestV1,
      keyKind: "course_identity",
      logicalKey: courseIdentityFingerprint,
      resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
      ...(hasReadBudget ? { readBudget: request.readBudget as OwnerRepositoryRadixReadBudget } : {}),
    });
  } catch { throw new Error("owner_course_manifest_indeterminate"); }
  if (!found) return undefined;
  try { return parseOwnerRepositoryCourseStateEntry(found.value, accountScopeHash); }
  catch { throw new Error("owner_course_manifest_indeterminate"); }
};

export const planOwnerRepositoryCourseStateMutation = async (input: {
  readonly accountScopeHash: string;
  readonly manifest: OwnerRepositoryCourseStateManifestV1;
  readonly expectedEntry: OwnerRepositoryCourseStateIndexValueV1 | null;
  readonly nextEntry: OwnerRepositoryCourseStateIndexValueV1;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryCourseStateMutationPlan> => {
  const request = readRecord(
    input,
    ["accountScopeHash", "manifest", "expectedEntry", "nextEntry", "resolveNode"],
    ["readBudget"],
  );
  if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function") return invalid();
  const accountScopeHash = request.accountScopeHash;
  const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
  const nextEntry = parseOwnerRepositoryCourseStateEntry(request.nextEntry, accountScopeHash);
  const expectedEntry = request.expectedEntry === null ? null
    : parseOwnerRepositoryCourseStateEntry(request.expectedEntry, accountScopeHash);
  if (expectedEntry && expectedEntry.courseIdentityFingerprint !== nextEntry.courseIdentityFingerprint) return invalid();
  const expectedValueFingerprint = expectedEntry === null
    ? null
    : sha256Utf8(canonicalJsonV1(expectedEntry));
  let plan;
  try {
    plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "course_state",
      manifest: request.manifest as OwnerRepositoryCourseStateManifestV1,
      mutations: [{
        keyKind: "course_identity",
        logicalKey: nextEntry.courseIdentityFingerprint,
        value: nextEntry,
        expectedValueFingerprint,
      }],
      resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
      ...(hasReadBudget ? { readBudget: request.readBudget as OwnerRepositoryRadixReadBudget } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "owner_index_expected_conflict") {
      throw new Error("owner_course_manifest_expected_conflict");
    }
    throw new Error("owner_course_manifest_indeterminate");
  }
  const manifest = plan.manifest as OwnerRepositoryCourseStateManifestV1;
  return deepFreeze({
    manifest,
    manifestBlob: materializeManifestBlob(accountScopeHash, manifest),
    immutableNodeBlobs: plan.immutableBlobs,
    changed: plan.changed,
  });
};
