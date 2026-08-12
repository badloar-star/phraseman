import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  createWalletAuthorizedOperation,
  isWalletIdentifier,
  type WalletAuthorizedOperationV1,
} from "../contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import {
  auditOwnerRepositoryRadixPage,
  lookupOwnerRepositoryRadix,
  planOwnerRepositoryRadixBatch,
  type OwnerRepositoryLegacyEmptyIndexManifestV1,
  type OwnerRepositoryRadixBlob,
  type OwnerRepositoryRadixAuditCursorV1,
  type OwnerRepositoryRadixAuditPageV1,
  type OwnerRepositoryRadixEntryV1,
  type OwnerRepositoryRadixManifest,
  type OwnerRepositoryRadixManifestV2,
  type OwnerRepositoryRadixNodeResolver,
  type OwnerRepositoryRadixReadBudget,
} from "./owner_repository_radix";
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
  type WalletAnyOperationLedgerEntry,
  type WalletSubjectLedgerEntryV1,
} from "./wallet_reducer";
import {
  createOwnerRepositoryCanonicalEconomicIndexValuesV2,
  createOwnerRepositoryOperationAliasIndexValueV2,
  parseOwnerRepositoryCanonicalEconomicIndexValueV2,
  type OwnerRepositoryCanonicalEconomicIndexValueV2,
  type OwnerRepositoryCanonicalEconomicIndexValuesV2,
  type OwnerRepositoryCanonicalEffectBindingV2,
  type OwnerRepositoryCanonicalOperationIndexValueV2,
  type OwnerRepositoryCanonicalReceiptIndexValueV2,
  type OwnerRepositoryCanonicalSubjectIndexValueV2,
  type OwnerRepositoryOperationAliasIndexValueV2,
} from "./owner_repository_economic_effect_v2";
import {
  createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2,
  parseOwnerRepositoryCourseUnlockEconomicIndexValueV2,
  type OwnerRepositoryCourseUnlockCanonicalIndexValuesV2,
  type OwnerRepositoryCourseUnlockOperationIndexValueV2,
  type OwnerRepositoryCourseUnlockReceiptIndexValueV2,
  type OwnerRepositoryCourseUnlockSubjectIndexValueV2,
} from "./owner_repository_course_unlock_economic_values_v2";

export type OwnerRepositoryEconomicIndexKind =
  | "operation"
  | "subject"
  | "receipt";
export type OwnerRepositoryEconomicManifestV2<
  K extends OwnerRepositoryEconomicIndexKind = OwnerRepositoryEconomicIndexKind,
> = OwnerRepositoryRadixManifestV2 & { readonly indexKind: K };

type EconomicBlobKind<K extends OwnerRepositoryEconomicIndexKind> =
  K extends "operation"
    ? "operation_index_manifest"
    : K extends "subject"
      ? "subject_index_manifest"
      : "receipt_index_manifest";

export interface OwnerRepositoryEconomicManifestBlob<
  K extends OwnerRepositoryEconomicIndexKind = OwnerRepositoryEconomicIndexKind,
> {
  readonly ref: OwnerRepositoryBlobRefV1 & {
    readonly kind: EconomicBlobKind<K>;
  };
  readonly encoded: string;
}

export interface ParsedOwnerRepositoryEconomicManifest<
  K extends OwnerRepositoryEconomicIndexKind = OwnerRepositoryEconomicIndexKind,
> {
  readonly sourceManifest: OwnerRepositoryRadixManifest;
  readonly manifest: OwnerRepositoryEconomicManifestV2<K>;
  readonly legacy: boolean;
  /** Exact persisted blob that was parsed; for legacy input this still contains manifest.v1. */
  readonly sourceManifestBlob: OwnerRepositoryEconomicManifestBlob<K>;
  /** Canonical V2 blob for the normalized manifest; publish only through a later root CAS. */
  readonly normalizedManifestBlob: OwnerRepositoryEconomicManifestBlob<K>;
}

export type OwnerRepositoryEconomicClosureLookup =
  | Readonly<{ readonly status: "absent" }>
  | Readonly<{
      readonly status: "subject_only";
      readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
      readonly appliedReceipt: WalletAppliedReceiptV1;
    }>
  | Readonly<{
      readonly status: "canonical";
      readonly operationLedgerEntry: WalletOperationLedgerEntryV1;
      readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
      readonly appliedReceipt: WalletAppliedReceiptV1;
    }>
  | Readonly<{
      readonly status: "alias";
      readonly operationLedgerEntry: WalletOperationAliasLedgerEntryV2;
      readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
      readonly appliedReceipt: WalletAppliedReceiptV1;
    }>;

export interface OwnerRepositoryEconomicClosurePlan {
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly operationManifestBlob: OwnerRepositoryEconomicManifestBlob<"operation">;
  readonly subjectManifestBlob: OwnerRepositoryEconomicManifestBlob<"subject">;
  readonly receiptManifestBlob: OwnerRepositoryEconomicManifestBlob<"receipt">;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export interface OwnerRepositoryOperationAliasPlan {
  readonly aliasEntry: WalletOperationAliasLedgerEntryV2;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly operationManifestBlob: OwnerRepositoryEconomicManifestBlob<"operation">;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export type OwnerRepositoryCanonicalIndexRepairKeyKind =
  | "operation_id"
  | "operation_fingerprint"
  | "semantic_subject"
  | "applied_receipt";

export interface OwnerRepositoryCanonicalIndexRepairPlan {
  readonly indexKind: OwnerRepositoryEconomicIndexKind;
  readonly keyKind: OwnerRepositoryCanonicalIndexRepairKeyKind;
  readonly logicalKey: string;
  readonly valueFingerprint: string;
  readonly manifest: OwnerRepositoryEconomicManifestV2;
  readonly manifestBlob: OwnerRepositoryEconomicManifestBlob;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export type OwnerRepositoryCanonicalEconomicClosureLookupV2 =
  | Readonly<{ readonly status: "absent" }>
  | Readonly<{
      readonly status: "subject_only";
      readonly subjectValue: OwnerRepositoryCanonicalSubjectIndexValueV2;
      readonly receiptValue: OwnerRepositoryCanonicalReceiptIndexValueV2;
      readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
    }>
  | Readonly<{
      readonly status: "canonical";
      readonly operationValue: OwnerRepositoryCanonicalOperationIndexValueV2;
      readonly subjectValue: OwnerRepositoryCanonicalSubjectIndexValueV2;
      readonly receiptValue: OwnerRepositoryCanonicalReceiptIndexValueV2;
      readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
    }>
  | Readonly<{
      readonly status: "alias";
      readonly operationValue: OwnerRepositoryOperationAliasIndexValueV2;
      readonly subjectValue: OwnerRepositoryCanonicalSubjectIndexValueV2;
      readonly receiptValue: OwnerRepositoryCanonicalReceiptIndexValueV2;
      readonly effectBinding: OwnerRepositoryCanonicalEffectBindingV2;
    }>;

export interface OwnerRepositoryCanonicalEconomicClosurePlanV2 {
  readonly values: OwnerRepositoryCanonicalEconomicIndexValuesV2;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly operationManifestBlob: OwnerRepositoryEconomicManifestBlob<"operation">;
  readonly subjectManifestBlob: OwnerRepositoryEconomicManifestBlob<"subject">;
  readonly receiptManifestBlob: OwnerRepositoryEconomicManifestBlob<"receipt">;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export interface OwnerRepositoryCourseUnlockEconomicClosurePlanV2 {
  readonly values: OwnerRepositoryCourseUnlockCanonicalIndexValuesV2;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly operationManifestBlob: OwnerRepositoryEconomicManifestBlob<"operation">;
  readonly subjectManifestBlob: OwnerRepositoryEconomicManifestBlob<"subject">;
  readonly receiptManifestBlob: OwnerRepositoryEconomicManifestBlob<"receipt">;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export interface OwnerRepositoryOperationAliasPlanV2 {
  readonly aliasValue: OwnerRepositoryOperationAliasIndexValueV2;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly operationManifestBlob: OwnerRepositoryEconomicManifestBlob<"operation">;
  readonly immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export interface OwnerRepositoryEconomicAuditPageV1 {
  readonly radix: OwnerRepositoryRadixAuditPageV1;
  readonly typedValues: readonly (
    | WalletOperationLedgerEntryV1
    | WalletOperationAliasLedgerEntryV2
    | WalletSubjectLedgerEntryV1
    | WalletAppliedReceiptV1
  )[];
}

export interface OwnerRepositoryEconomicClosureAuditCursorV1 {
  readonly schemaVersion: "learning-v2-owner-economic-closure-audit-cursor.v1";
  readonly accountScopeHash: string;
  readonly manifestsFingerprint: string;
  readonly phase: OwnerRepositoryEconomicIndexKind;
  readonly authority: "in_process_economic_audit_cursor";
}

export interface OwnerRepositoryEconomicClosureAuditPageV1 {
  readonly done: boolean;
  readonly cursor: OwnerRepositoryEconomicClosureAuditCursorV1 | null;
  readonly auditedPhase: OwnerRepositoryEconomicIndexKind;
  readonly radix: OwnerRepositoryRadixAuditPageV1;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MANIFEST_MAX_BYTES = 64 * 1024;
const REF_KEYS = [
  "schemaVersion",
  "kind",
  "blobKey",
  "blobFingerprint",
] as const;
const ENVELOPE_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "kind",
  "payload",
] as const;
const DEFAULT_READ_BUDGET = Object.freeze({
  maxExternalReads: 132,
  maxExternalBytes: 64 * 1024 * 1024,
});
const ECONOMIC_AUDIT_CURSORS = new WeakSet<object>();
const HASH_MODULUS = 1n << 256n;
type EconomicAuditPhase = OwnerRepositoryEconomicIndexKind;
type EconomicAuditSums = Readonly<{
  operationIdCount: number;
  operationFingerprintCount: number;
  aliasOperationIdCount: number;
  aliasOperationFingerprintCount: number;
  subjectCount: number;
  receiptCount: number;
  operationIdSum: string;
  operationFingerprintSum: string;
  aliasOperationIdSum: string;
  aliasOperationFingerprintSum: string;
  subjectSum: string;
  receiptSum: string;
}>;
type InternalEconomicAuditCursor = OwnerRepositoryEconomicClosureAuditCursorV1 &
  Readonly<{
    readonly radixCursor: OwnerRepositoryRadixAuditCursorV1 | null;
    readonly sums: EconomicAuditSums;
  }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean => {
  const ownKeys = Reflect.ownKeys(value);
  return (
    ownKeys.length === keys.length &&
    ownKeys.every((key) => typeof key === "string" && keys.includes(key))
  );
};
const deepFreeze = <T>(value: T): T => {
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== "object" || current === null || seen.has(current))
      continue;
    seen.add(current);
    Object.freeze(current);
    for (const child of Object.values(current as Record<string, unknown>))
      stack.push(child);
  }
  return value;
};
const readRecord = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
  code = "owner_economic_manifest_invalid",
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    throw new Error(code);
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== "string") ||
    requiredKeys.some(
      (key) => !Object.prototype.hasOwnProperty.call(descriptors, key),
    ) ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (!requiredKeys.includes(key) && !optionalKeys.includes(key)),
    )
  )
    throw new Error(code);
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      throw new Error(code);
    result[key] = descriptor.value;
  }
  return result;
};
const safe = (value: unknown, maximum: number): value is number =>
  Number.isSafeInteger(value) &&
  !Object.is(value, -0) &&
  Number(value) >= 0 &&
  Number(value) <= maximum;
const blobKey = (accountScopeHash: string, fingerprint: string) =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;
const economicKind = (
  value: unknown,
): value is OwnerRepositoryEconomicIndexKind =>
  value === "operation" || value === "subject" || value === "receipt";
const manifestBlobKind = <K extends OwnerRepositoryEconomicIndexKind>(
  indexKind: K,
): EconomicBlobKind<K> =>
  (indexKind === "operation"
    ? "operation_index_manifest"
    : indexKind === "subject"
      ? "subject_index_manifest"
      : "receipt_index_manifest") as EconomicBlobKind<K>;
const legacyEmptyManifest = <K extends OwnerRepositoryEconomicIndexKind>(
  indexKind: K,
): OwnerRepositoryLegacyEmptyIndexManifestV1 => ({
  schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
  indexKind,
  shardBits: 8,
  shards: [],
});

const parseReadBudget = (input: unknown): OwnerRepositoryRadixReadBudget => {
  if (input === undefined) return DEFAULT_READ_BUDGET;
  const value = readRecord(
    input,
    ["maxExternalReads", "maxExternalBytes"],
    [],
    "owner_economic_manifest_invalid",
  );
  if (
    !safe(value.maxExternalReads, 100_000) ||
    !safe(value.maxExternalBytes, 1024 * 1024 * 1024)
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  return deepFreeze({
    maxExternalReads: Number(value.maxExternalReads),
    maxExternalBytes: Number(value.maxExternalBytes),
  });
};

interface SharedResolverSession {
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget: OwnerRepositoryRadixReadBudget;
  readonly budgetExceeded: boolean;
}
const createSharedResolverSession = (
  resolver: unknown,
  budgetInput: unknown,
  budgetPresent = false,
): SharedResolverSession => {
  if (typeof resolver !== "function")
    throw new Error("owner_economic_manifest_invalid");
  if (budgetPresent && budgetInput === undefined)
    throw new Error("owner_economic_manifest_invalid");
  const readBudget = parseReadBudget(budgetInput);
  const cache = new Map<string, unknown>();
  let externalReads = 0;
  let externalBytes = 0;
  let budgetExceeded = false;
  const resolveNode: OwnerRepositoryRadixNodeResolver = async (ref) => {
    if (cache.has(ref.blobKey)) return cache.get(ref.blobKey);
    if (externalReads >= readBudget.maxExternalReads) {
      budgetExceeded = true;
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    let raw: unknown;
    try {
      raw = await (resolver as OwnerRepositoryRadixNodeResolver)(ref);
    } catch {
      throw new Error("owner_economic_manifest_indeterminate");
    }
    externalReads += 1;
    if (typeof raw === "string") {
      let bytes: number;
      try {
        bytes = utf8ByteLengthV1(raw);
      } catch {
        throw new Error("owner_economic_manifest_indeterminate");
      }
      externalBytes += bytes;
      if (
        !Number.isSafeInteger(externalBytes) ||
        externalBytes > readBudget.maxExternalBytes
      ) {
        budgetExceeded = true;
        throw new Error("owner_economic_manifest_read_budget_exceeded");
      }
    }
    cache.set(ref.blobKey, raw);
    return raw;
  };
  return deepFreeze({
    resolveNode,
    readBudget,
    get budgetExceeded() {
      return budgetExceeded;
    },
  });
};

const parseManifestRef = <K extends OwnerRepositoryEconomicIndexKind>(
  input: unknown,
  accountScopeHash: string,
  indexKind: K,
): OwnerRepositoryEconomicManifestBlob<K>["ref"] => {
  const value = readRecord(
    input,
    REF_KEYS,
    [],
    "owner_economic_manifest_indeterminate",
  );
  const kind = manifestBlobKind(indexKind);
  if (
    value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    value.kind !== kind ||
    typeof value.blobFingerprint !== "string" ||
    !HASH.test(value.blobFingerprint) ||
    value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
    kind,
    blobKey: value.blobKey as string,
    blobFingerprint: value.blobFingerprint,
  }) as OwnerRepositoryEconomicManifestBlob<K>["ref"];
};

const materializeManifestBlob = <K extends OwnerRepositoryEconomicIndexKind>(
  accountScopeHash: string,
  indexKind: K,
  manifest: OwnerRepositoryEconomicManifestV2<K>,
): OwnerRepositoryEconomicManifestBlob<K> => {
  const kind = manifestBlobKind(indexKind);
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1" as const,
    accountScopeHash,
    kind,
    payload: manifest,
  };
  let encoded: string;
  try {
    encoded = canonicalJsonV1(envelope);
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  if (utf8ByteLengthV1(encoded) > MANIFEST_MAX_BYTES) {
    throw new Error("owner_economic_manifest_overflow");
  }
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind,
      blobKey: blobKey(accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
  }) as OwnerRepositoryEconomicManifestBlob<K>;
};

const normalizeManifest = async <
  K extends OwnerRepositoryEconomicIndexKind,
>(input: {
  readonly accountScopeHash: string;
  readonly indexKind: K;
  readonly manifest: OwnerRepositoryRadixManifest;
  readonly session: SharedResolverSession;
}) =>
  planOwnerRepositoryRadixBatch({
    accountScopeHash: input.accountScopeHash,
    indexKind: input.indexKind,
    manifest: input.manifest,
    mutations: [],
    resolveNode: input.session.resolveNode,
    readBudget: input.session.readBudget,
  });

export const createEmptyOwnerRepositoryEconomicManifest = async <
  K extends OwnerRepositoryEconomicIndexKind,
>(
  accountScopeHash: string,
  indexKind: K,
): Promise<
  Readonly<{
    manifest: OwnerRepositoryEconomicManifestV2<K>;
    manifestBlob: OwnerRepositoryEconomicManifestBlob<K>;
    immutableNodeBlobs: readonly OwnerRepositoryRadixBlob[];
  }>
> => {
  if (
    typeof accountScopeHash !== "string" ||
    !ACCOUNT.test(accountScopeHash) ||
    !economicKind(indexKind)
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  const session = createSharedResolverSession(() => null, undefined);
  const plan = await normalizeManifest({
    accountScopeHash,
    indexKind,
    manifest: legacyEmptyManifest(indexKind),
    session,
  });
  const manifest = plan.manifest as OwnerRepositoryEconomicManifestV2<K>;
  return deepFreeze({
    manifest,
    manifestBlob: materializeManifestBlob(
      accountScopeHash,
      indexKind,
      manifest,
    ),
    immutableNodeBlobs: plan.immutableBlobs,
  });
};

/**
 * Verifies the persisted manifest envelope and the canonical root path only.
 * It is not a full-tree economic audit: callers must use the typed closure lookup below,
 * or the future paged checkpoint audit, before treating values as authoritative.
 */
export const parseOwnerRepositoryEconomicManifestBlob = async <
  K extends OwnerRepositoryEconomicIndexKind,
>(input: {
  readonly accountScopeHash: string;
  readonly indexKind: K;
  readonly ref: OwnerRepositoryBlobRefV1;
  readonly raw: unknown;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<ParsedOwnerRepositoryEconomicManifest<K>> => {
  let request: Readonly<Record<string, unknown>>;
  try {
    request = readRecord(
      input,
      ["accountScopeHash", "indexKind", "ref", "raw", "resolveNode"],
      ["readBudget"],
      "owner_economic_manifest_indeterminate",
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "owner_economic_manifest_read_budget_exceeded"
    ) {
      throw error;
    }
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    !economicKind(request.indexKind) ||
    typeof request.raw !== "string" ||
    typeof request.resolveNode !== "function"
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const accountScopeHash = request.accountScopeHash;
  const indexKind = request.indexKind as K;
  let ref: OwnerRepositoryEconomicManifestBlob<K>["ref"];
  try {
    ref = parseManifestRef(request.ref, accountScopeHash, indexKind);
  } catch {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  try {
    if (
      utf8ByteLengthV1(request.raw) > MANIFEST_MAX_BYTES ||
      sha256Utf8(request.raw) !== ref.blobFingerprint
    )
      throw new Error("raw_mismatch");
  } catch {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(request.raw) as unknown;
    if (canonicalJsonV1(envelope) !== request.raw)
      throw new Error("noncanonical");
  } catch {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const kind = manifestBlobKind(indexKind);
  if (
    !isRecord(envelope) ||
    !exactKeys(envelope, ENVELOPE_KEYS) ||
    envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    envelope.accountScopeHash !== accountScopeHash ||
    envelope.kind !== kind
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const legacy =
    isRecord(envelope.payload) &&
    envelope.payload.schemaVersion ===
      "learning-v2-owner-repository-index-manifest.v1";
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  let session: SharedResolverSession;
  try {
    session = createSharedResolverSession(
      request.resolveNode,
      hasReadBudget ? request.readBudget : undefined,
      hasReadBudget,
    );
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  let normalized;
  try {
    normalized = await normalizeManifest({
      accountScopeHash,
      indexKind,
      manifest: envelope.payload as OwnerRepositoryRadixManifest,
      session,
    });
  } catch (error) {
    if (
      session.budgetExceeded ||
      (error instanceof Error &&
        error.message === "owner_index_read_budget_exceeded")
    ) {
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (
    (!legacy && normalized.changed) ||
    (!legacy &&
      canonicalJsonV1(normalized.manifest) !==
        canonicalJsonV1(envelope.payload)) ||
    (legacy && normalized.manifest.entryCount !== 0)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const sourceManifest = JSON.parse(
    canonicalJsonV1(envelope.payload),
  ) as OwnerRepositoryRadixManifest;
  const manifest = normalized.manifest as OwnerRepositoryEconomicManifestV2<K>;
  return deepFreeze({
    sourceManifest,
    manifest,
    legacy,
    sourceManifestBlob: { ref, encoded: request.raw },
    normalizedManifestBlob: materializeManifestBlob(
      accountScopeHash,
      indexKind,
      manifest,
    ),
  });
};

type ParsedEconomicValue =
  | WalletOperationLedgerEntryV1
  | WalletOperationAliasLedgerEntryV2
  | WalletSubjectLedgerEntryV1
  | WalletAppliedReceiptV1;
const parseTypedEconomicValue = (
  accountScopeHash: string,
  indexKind: OwnerRepositoryEconomicIndexKind,
  entry: OwnerRepositoryRadixEntryV1,
): ParsedEconomicValue => {
  if (
    isRecord(entry.value) &&
    [
      "learning-v2-owner-repository-canonical-operation-index-value.v2",
      "learning-v2-owner-repository-operation-alias-index-value.v2",
      "learning-v2-owner-repository-canonical-subject-index-value.v2",
      "learning-v2-owner-repository-canonical-receipt-index-value.v2",
    ].includes(String(entry.value.schemaVersion))
  ) {
    let bound: OwnerRepositoryCanonicalEconomicIndexValueV2;
    try {
      bound = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
        accountScopeHash,
        indexKind,
        keyKind: entry.keyKind,
        logicalKey: entry.logicalKey,
        value: entry.value,
      });
    } catch {
      throw new Error("owner_economic_manifest_indeterminate");
    }
    return bound.valueKind === "canonical_receipt"
      ? bound.appliedReceipt
      : bound.ledgerEntry;
  }
  let parsed: ParsedEconomicValue;
  try {
    if (indexKind === "operation") {
      parsed =
        isRecord(entry.value) &&
        entry.value.schemaVersion ===
          "learning-v2-wallet-operation-alias-ledger-entry.v2"
          ? parseWalletOperationAliasLedgerEntry(entry.value)
          : parseWalletOperationLedgerEntry(entry.value);
      if (
        (entry.keyKind === "operation_id" &&
          parsed.operationId !== entry.logicalKey) ||
        (entry.keyKind === "operation_fingerprint" &&
          parsed.operationFingerprint !== entry.logicalKey) ||
        (entry.keyKind !== "operation_id" &&
          entry.keyKind !== "operation_fingerprint") ||
        (parsed.schemaVersion ===
          "learning-v2-wallet-operation-ledger-entry.v1" &&
          (parsed.operationId !== parsed.canonicalOperationId ||
            parsed.operationFingerprint !==
              parsed.appliedReceipt.operationFingerprint))
      ) {
        throw new Error("binding_mismatch");
      }
    } else if (indexKind === "subject") {
      parsed = parseWalletSubjectLedgerEntry(entry.value);
      if (
        entry.keyKind !== "semantic_subject" ||
        parsed.semanticSubjectFingerprint !== entry.logicalKey
      )
        throw new Error("binding_mismatch");
    } else {
      parsed = parseWalletAppliedReceipt(entry.value);
      if (
        entry.keyKind !== "applied_receipt" ||
        parsed.appliedReceiptFingerprint !== entry.logicalKey
      )
        throw new Error("binding_mismatch");
    }
    const receipt =
      indexKind === "receipt"
        ? (parsed as WalletAppliedReceiptV1)
        : (parsed as WalletAnyOperationLedgerEntry | WalletSubjectLedgerEntryV1)
            .appliedReceipt;
    if (
      receipt.accountScopeHash !== accountScopeHash ||
      canonicalJsonV1(parsed) !== canonicalJsonV1(entry.value)
    )
      throw new Error("binding_mismatch");
  } catch {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  return parsed;
};

const sameCanonical = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const assertLedgerCrosslinks = (
  operationEntry: WalletAnyOperationLedgerEntry | undefined,
  subjectEntry: WalletSubjectLedgerEntryV1,
  receipt: WalletAppliedReceiptV1,
): void => {
  if (
    subjectEntry.canonicalOperationId !== receipt.operationId ||
    subjectEntry.semanticSubjectFingerprint !==
      receipt.semanticSubjectFingerprint ||
    subjectEntry.semanticFingerprint !== receipt.semanticFingerprint ||
    !sameCanonical(subjectEntry.appliedReceipt, receipt) ||
    (operationEntry !== undefined &&
      (operationEntry.canonicalOperationId !== receipt.operationId ||
        operationEntry.semanticSubjectFingerprint !==
          receipt.semanticSubjectFingerprint ||
        operationEntry.semanticFingerprint !== receipt.semanticFingerprint ||
        !sameCanonical(operationEntry.appliedReceipt, receipt) ||
        (operationEntry.schemaVersion ===
          "learning-v2-wallet-operation-ledger-entry.v1" &&
          (operationEntry.operationId !== receipt.operationId ||
            operationEntry.operationFingerprint !==
              receipt.operationFingerprint))))
  )
    throw new Error("owner_economic_manifest_indeterminate");
};

const lookupTypedEntry = async (
  accountScopeHash: string,
  indexKind: OwnerRepositoryEconomicIndexKind,
  manifest: OwnerRepositoryRadixManifest,
  keyKind:
    | "operation_id"
    | "operation_fingerprint"
    | "semantic_subject"
    | "applied_receipt",
  logicalKey: string,
  session: SharedResolverSession,
): Promise<ParsedEconomicValue | undefined> => {
  let found: OwnerRepositoryRadixEntryV1 | undefined;
  try {
    found = await lookupOwnerRepositoryRadix({
      accountScopeHash,
      indexKind,
      manifest,
      keyKind,
      logicalKey,
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (
      session.budgetExceeded ||
      (error instanceof Error &&
        error.message === "owner_index_read_budget_exceeded")
    ) {
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    throw new Error("owner_economic_manifest_indeterminate");
  }
  return found === undefined
    ? undefined
    : parseTypedEconomicValue(accountScopeHash, indexKind, found);
};

const lookupCanonicalV2Entry = async (
  accountScopeHash: string,
  indexKind: OwnerRepositoryEconomicIndexKind,
  manifest: OwnerRepositoryRadixManifest,
  keyKind:
    | "operation_id"
    | "operation_fingerprint"
    | "semantic_subject"
    | "applied_receipt",
  logicalKey: string,
  session: SharedResolverSession,
): Promise<OwnerRepositoryCanonicalEconomicIndexValueV2 | undefined> => {
  let found: OwnerRepositoryRadixEntryV1 | undefined;
  try {
    found = await lookupOwnerRepositoryRadix({
      accountScopeHash,
      indexKind,
      manifest,
      keyKind,
      logicalKey,
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (
      session.budgetExceeded ||
      (error instanceof Error &&
        error.message === "owner_index_read_budget_exceeded")
    ) {
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (found === undefined) return undefined;
  try {
    return parseOwnerRepositoryCanonicalEconomicIndexValueV2({
      accountScopeHash,
      indexKind,
      keyKind,
      logicalKey,
      value: found.value,
    });
  } catch {
    throw new Error("owner_economic_manifest_indeterminate");
  }
};

const lookupCanonicalV2ClosureWithSession = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryRadixManifest;
  readonly subjectManifest: OwnerRepositoryRadixManifest;
  readonly receiptManifest: OwnerRepositoryRadixManifest;
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly session: SharedResolverSession;
}): Promise<OwnerRepositoryCanonicalEconomicClosureLookupV2> => {
  const operationById = await lookupCanonicalV2Entry(
    input.accountScopeHash,
    "operation",
    input.operationManifest,
    "operation_id",
    input.operationId,
    input.session,
  );
  const operationByFingerprint = await lookupCanonicalV2Entry(
    input.accountScopeHash,
    "operation",
    input.operationManifest,
    "operation_fingerprint",
    input.operationFingerprint,
    input.session,
  );
  const subject = await lookupCanonicalV2Entry(
    input.accountScopeHash,
    "subject",
    input.subjectManifest,
    "semantic_subject",
    input.semanticSubjectFingerprint,
    input.session,
  );
  if (
    (operationById === undefined) !==
      (operationByFingerprint === undefined) ||
    (operationById !== undefined &&
      !sameCanonical(operationById, operationByFingerprint)) ||
    (operationById !== undefined && subject === undefined)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (operationById === undefined && subject === undefined) {
    return deepFreeze({ status: "absent" as const });
  }
  if (
    subject?.valueKind !== "canonical_subject" ||
    (operationById !== undefined &&
      operationById.valueKind !== "canonical_operation" &&
      operationById.valueKind !== "operation_alias")
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const receiptFingerprint = subject.ledgerEntry.appliedReceipt
    .appliedReceiptFingerprint;
  const receipt = await lookupCanonicalV2Entry(
    input.accountScopeHash,
    "receipt",
    input.receiptManifest,
    "applied_receipt",
    receiptFingerprint,
    input.session,
  );
  if (
    receipt?.valueKind !== "canonical_receipt" ||
    !sameCanonical(subject.effectBinding, receipt.effectBinding)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (operationById === undefined && operationByFingerprint === undefined) {
    return deepFreeze({
      status: "subject_only" as const,
      subjectValue: subject,
      receiptValue: receipt,
      effectBinding: receipt.effectBinding,
    });
  }
  if (
    (operationById?.valueKind !== "canonical_operation" &&
      operationById?.valueKind !== "operation_alias") ||
    operationByFingerprint?.valueKind !== operationById.valueKind ||
    !sameCanonical(operationById.effectBinding, receipt.effectBinding)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (operationById.valueKind === "operation_alias") {
    return deepFreeze({
      status: "alias" as const,
      operationValue: operationById,
      subjectValue: subject,
      receiptValue: receipt,
      effectBinding: receipt.effectBinding,
    });
  }
  return deepFreeze({
    status: "canonical" as const,
    operationValue: operationById,
    subjectValue: subject,
    receiptValue: receipt,
    effectBinding: receipt.effectBinding,
  });
};

/**
 * Looks up only cycle-free V2 canonical values. Historical V1 values remain
 * readable through the legacy lookup but cannot authorize lifetime aliases.
 */
export const lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2 = async (
  input: unknown,
): Promise<OwnerRepositoryCanonicalEconomicClosureLookupV2> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "operationId",
      "operationFingerprint",
      "semanticSubjectFingerprint",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    !isWalletIdentifier(request.operationId) ||
    ![
      request.operationFingerprint,
      request.semanticSubjectFingerprint,
    ].every((value) => typeof value === "string" && HASH.test(value)) ||
    typeof request.resolveNode !== "function"
  )
    throw new Error("owner_economic_manifest_invalid");
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  return lookupCanonicalV2ClosureWithSession({
    accountScopeHash: request.accountScopeHash,
    operationManifest:
      request.operationManifest as OwnerRepositoryRadixManifest,
    subjectManifest: request.subjectManifest as OwnerRepositoryRadixManifest,
    receiptManifest: request.receiptManifest as OwnerRepositoryRadixManifest,
    operationId: request.operationId,
    operationFingerprint: request.operationFingerprint as string,
    semanticSubjectFingerprint: request.semanticSubjectFingerprint as string,
    session,
  });
};

/**
 * Resolves a lifetime canonical receipt by operation id and proves its full
 * operation/subject/receipt closure before returning it. This is the safe
 * restart seam for protected server settlements older than the journal head.
 */
export const lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2 =
  async (input: {
    readonly accountScopeHash: string;
    readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
    readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
    readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
    readonly operationId: string;
    readonly resolveNode: OwnerRepositoryRadixNodeResolver;
    readonly readBudget?: OwnerRepositoryRadixReadBudget;
  }): Promise<WalletAppliedReceiptV1 | undefined> => {
    const request = readRecord(
      input,
      [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationId",
        "resolveNode",
      ],
      ["readBudget"],
    );
    if (
      typeof request.accountScopeHash !== "string" ||
      !ACCOUNT.test(request.accountScopeHash) ||
      !isWalletIdentifier(request.operationId) ||
      typeof request.resolveNode !== "function"
    ) {
      throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(
      request,
      "readBudget",
    );
    const session = createSharedResolverSession(
      request.resolveNode,
      hasReadBudget ? request.readBudget : undefined,
      hasReadBudget,
    );
    const operation = (await lookupTypedEntry(
      request.accountScopeHash,
      "operation",
      request.operationManifest as OwnerRepositoryRadixManifest,
      "operation_id",
      request.operationId,
      session,
    )) as WalletAnyOperationLedgerEntry | undefined;
    if (operation === undefined) return undefined;
    const closure = await lookupClosureWithSession({
      accountScopeHash: request.accountScopeHash,
      operationManifest:
        request.operationManifest as OwnerRepositoryRadixManifest,
      subjectManifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      receiptManifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      operationId: operation.operationId,
      operationFingerprint: operation.operationFingerprint,
      semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
      session,
    });
    if (closure.status !== "canonical" && closure.status !== "alias") {
      throw new Error("owner_economic_manifest_indeterminate");
    }
    return closure.appliedReceipt;
  };

const lookupClosureWithSession = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryRadixManifest;
  readonly subjectManifest: OwnerRepositoryRadixManifest;
  readonly receiptManifest: OwnerRepositoryRadixManifest;
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly session: SharedResolverSession;
}): Promise<OwnerRepositoryEconomicClosureLookup> => {
  const operationById = (await lookupTypedEntry(
    input.accountScopeHash,
    "operation",
    input.operationManifest,
    "operation_id",
    input.operationId,
    input.session,
  )) as WalletAnyOperationLedgerEntry | undefined;
  const operationByFingerprint = (await lookupTypedEntry(
    input.accountScopeHash,
    "operation",
    input.operationManifest,
    "operation_fingerprint",
    input.operationFingerprint,
    input.session,
  )) as WalletAnyOperationLedgerEntry | undefined;
  if (
    (operationById === undefined) !== (operationByFingerprint === undefined) ||
    (operationById !== undefined &&
      !sameCanonical(operationById, operationByFingerprint))
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const subject = (await lookupTypedEntry(
    input.accountScopeHash,
    "subject",
    input.subjectManifest,
    "semantic_subject",
    input.semanticSubjectFingerprint,
    input.session,
  )) as WalletSubjectLedgerEntryV1 | undefined;
  if (operationById !== undefined && subject === undefined) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (operationById === undefined && subject === undefined)
    return deepFreeze({ status: "absent" as const });
  const receiptFingerprint = (subject ?? operationById)!.appliedReceipt
    .appliedReceiptFingerprint;
  const receipt = (await lookupTypedEntry(
    input.accountScopeHash,
    "receipt",
    input.receiptManifest,
    "applied_receipt",
    receiptFingerprint,
    input.session,
  )) as WalletAppliedReceiptV1 | undefined;
  if (receipt === undefined || subject === undefined) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  assertLedgerCrosslinks(operationById, subject, receipt);
  if (operationById === undefined) {
    return deepFreeze({
      status: "subject_only" as const,
      subjectLedgerEntry: subject,
      appliedReceipt: receipt,
    });
  }
  if (
    operationById.schemaVersion ===
    "learning-v2-wallet-operation-alias-ledger-entry.v2"
  ) {
    return deepFreeze({
      status: "alias" as const,
      operationLedgerEntry: operationById,
      subjectLedgerEntry: subject,
      appliedReceipt: receipt,
    });
  }
  return deepFreeze({
    status: "canonical" as const,
    operationLedgerEntry: operationById,
    subjectLedgerEntry: subject,
    appliedReceipt: receipt,
  });
};

const preflightCanonicalClosurePlan = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryRadixManifest;
  readonly subjectManifest: OwnerRepositoryRadixManifest;
  readonly receiptManifest: OwnerRepositoryRadixManifest;
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly semanticSubjectFingerprint: string;
  readonly appliedReceiptFingerprint: string;
  readonly session: SharedResolverSession;
}): Promise<
  | Readonly<{ readonly status: "absent" }>
  | Readonly<{
      readonly status: "canonical";
      readonly operationLedgerEntry: WalletOperationLedgerEntryV1;
      readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
      readonly appliedReceipt: WalletAppliedReceiptV1;
    }>
> => {
  const operationById = (await lookupTypedEntry(
    input.accountScopeHash,
    "operation",
    input.operationManifest,
    "operation_id",
    input.operationId,
    input.session,
  )) as WalletAnyOperationLedgerEntry | undefined;
  const operationByFingerprint = (await lookupTypedEntry(
    input.accountScopeHash,
    "operation",
    input.operationManifest,
    "operation_fingerprint",
    input.operationFingerprint,
    input.session,
  )) as WalletAnyOperationLedgerEntry | undefined;
  const subject = (await lookupTypedEntry(
    input.accountScopeHash,
    "subject",
    input.subjectManifest,
    "semantic_subject",
    input.semanticSubjectFingerprint,
    input.session,
  )) as WalletSubjectLedgerEntryV1 | undefined;
  const receipt = (await lookupTypedEntry(
    input.accountScopeHash,
    "receipt",
    input.receiptManifest,
    "applied_receipt",
    input.appliedReceiptFingerprint,
    input.session,
  )) as WalletAppliedReceiptV1 | undefined;
  const present = [
    operationById,
    operationByFingerprint,
    subject,
    receipt,
  ].filter((value) => value !== undefined).length;
  if (present === 0) return deepFreeze({ status: "absent" as const });
  if (
    present !== 4 ||
    operationById?.schemaVersion !==
      "learning-v2-wallet-operation-ledger-entry.v1" ||
    operationByFingerprint?.schemaVersion !==
      "learning-v2-wallet-operation-ledger-entry.v1" ||
    !sameCanonical(operationById, operationByFingerprint)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  assertLedgerCrosslinks(operationById, subject!, receipt!);
  return deepFreeze({
    status: "canonical" as const,
    operationLedgerEntry: operationById!,
    subjectLedgerEntry: subject!,
    appliedReceipt: receipt!,
  });
};

/** Typed lookup for canonical, subject-only and fully verifiable V2 alias rows. */
export const lookupOwnerRepositoryCanonicalEconomicLedgerClosure =
  async (input: {
    readonly accountScopeHash: string;
    readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
    readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
    readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
    readonly operationId: string;
    readonly operationFingerprint: string;
    readonly semanticSubjectFingerprint: string;
    readonly resolveNode: OwnerRepositoryRadixNodeResolver;
    readonly readBudget?: OwnerRepositoryRadixReadBudget;
  }): Promise<OwnerRepositoryEconomicClosureLookup> => {
    const request = readRecord(
      input,
      [
        "accountScopeHash",
        "operationManifest",
        "subjectManifest",
        "receiptManifest",
        "operationId",
        "operationFingerprint",
        "semanticSubjectFingerprint",
        "resolveNode",
      ],
      ["readBudget"],
    );
    if (
      typeof request.accountScopeHash !== "string" ||
      !ACCOUNT.test(request.accountScopeHash) ||
      !isWalletIdentifier(request.operationId) ||
      typeof request.operationFingerprint !== "string" ||
      !HASH.test(request.operationFingerprint) ||
      typeof request.semanticSubjectFingerprint !== "string" ||
      !HASH.test(request.semanticSubjectFingerprint) ||
      typeof request.resolveNode !== "function"
    ) {
      throw new Error("owner_economic_manifest_invalid");
    }
    const hasReadBudget = Object.prototype.hasOwnProperty.call(
      request,
      "readBudget",
    );
    const session = createSharedResolverSession(
      request.resolveNode,
      hasReadBudget ? request.readBudget : undefined,
      hasReadBudget,
    );
    return lookupClosureWithSession({
      accountScopeHash: request.accountScopeHash,
      operationManifest:
        request.operationManifest as OwnerRepositoryRadixManifest,
      subjectManifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      receiptManifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      operationId: request.operationId,
      operationFingerprint: request.operationFingerprint,
      semanticSubjectFingerprint: request.semanticSubjectFingerprint,
      session,
    });
  };

const mapPlanError = (error: unknown): never => {
  const message = error instanceof Error ? error.message : "";
  if (
    message === "owner_index_read_budget_exceeded" ||
    message === "owner_economic_manifest_read_budget_exceeded"
  ) {
    throw new Error("owner_economic_manifest_read_budget_exceeded");
  }
  if (
    message === "owner_index_key_conflict" ||
    message === "owner_index_digest_collision"
  ) {
    throw new Error("owner_economic_manifest_conflict");
  }
  if (
    message === "owner_index_key_invalid" ||
    message === "owner_index_value_invalid" ||
    message === "owner_index_batch_invalid" ||
    message === "owner_index_manifest_invalid" ||
    message === "owner_index_read_budget_invalid"
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  throw new Error("owner_economic_manifest_indeterminate");
};

export const planOwnerRepositoryCanonicalEconomicClosure = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly operationLedgerEntry: WalletOperationLedgerEntryV1;
  readonly subjectLedgerEntry: WalletSubjectLedgerEntryV1;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryEconomicClosurePlan> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "operationLedgerEntry",
      "subjectLedgerEntry",
      "appliedReceipt",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function"
  )
    throw new Error("owner_economic_manifest_invalid");
  let operationEntry: WalletOperationLedgerEntryV1;
  let subjectEntry: WalletSubjectLedgerEntryV1;
  let receipt: WalletAppliedReceiptV1;
  try {
    operationEntry = parseWalletOperationLedgerEntry(
      request.operationLedgerEntry,
    );
    subjectEntry = parseWalletSubjectLedgerEntry(request.subjectLedgerEntry);
    receipt = parseWalletAppliedReceipt(request.appliedReceipt);
    if (
      operationEntry.operationId !== operationEntry.canonicalOperationId ||
      operationEntry.operationFingerprint !==
        operationEntry.appliedReceipt.operationFingerprint ||
      receipt.accountScopeHash !== request.accountScopeHash ||
      !sameCanonical(operationEntry.appliedReceipt, receipt)
    ) {
      throw new Error("canonical_binding_invalid");
    }
    assertLedgerCrosslinks(operationEntry, subjectEntry, receipt);
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  let existing: Awaited<ReturnType<typeof preflightCanonicalClosurePlan>>;
  try {
    existing = await preflightCanonicalClosurePlan({
      accountScopeHash: request.accountScopeHash,
      operationManifest:
        request.operationManifest as OwnerRepositoryRadixManifest,
      subjectManifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      receiptManifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      operationId: operationEntry.operationId,
      operationFingerprint: operationEntry.operationFingerprint,
      semanticSubjectFingerprint: subjectEntry.semanticSubjectFingerprint,
      appliedReceiptFingerprint: receipt.appliedReceiptFingerprint,
      session,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "owner_economic_manifest_read_budget_exceeded"
    ) {
      throw error;
    }
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (
    existing.status === "canonical" &&
    (!sameCanonical(existing.operationLedgerEntry, operationEntry) ||
      !sameCanonical(existing.subjectLedgerEntry, subjectEntry) ||
      !sameCanonical(existing.appliedReceipt, receipt))
  ) {
    throw new Error("owner_economic_manifest_conflict");
  }
  let operationPlan;
  let subjectPlan;
  let receiptPlan;
  try {
    operationPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "operation",
      manifest: request.operationManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: operationEntry.operationId,
          value: operationEntry,
        },
        {
          keyKind: "operation_fingerprint",
          logicalKey: operationEntry.operationFingerprint,
          value: operationEntry,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
    subjectPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "subject",
      manifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "semantic_subject",
          logicalKey: subjectEntry.semanticSubjectFingerprint,
          value: subjectEntry,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
    receiptPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "receipt",
      manifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "applied_receipt",
          logicalKey: receipt.appliedReceiptFingerprint,
          value: receipt,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (session.budgetExceeded)
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    return mapPlanError(error);
  }
  const changed = [
    operationPlan.changed,
    subjectPlan.changed,
    receiptPlan.changed,
  ];
  if (!changed.every(Boolean) && changed.some(Boolean)) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const operationManifest =
    operationPlan.manifest as OwnerRepositoryEconomicManifestV2<"operation">;
  const subjectManifest =
    subjectPlan.manifest as OwnerRepositoryEconomicManifestV2<"subject">;
  const receiptManifest =
    receiptPlan.manifest as OwnerRepositoryEconomicManifestV2<"receipt">;
  return deepFreeze({
    operationManifest,
    subjectManifest,
    receiptManifest,
    operationManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "operation",
      operationManifest,
    ),
    subjectManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "subject",
      subjectManifest,
    ),
    receiptManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "receipt",
      receiptManifest,
    ),
    immutableNodeBlobs: [
      ...operationPlan.immutableBlobs,
      ...subjectPlan.immutableBlobs,
      ...receiptPlan.immutableBlobs,
    ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
    changed: changed[0],
  });
};

/**
 * Inserts the four cycle-free V2 canonical values. Every value commits the
 * exact pre-COW journal blob, so a future alias can resolve the canonical
 * effect without trusting a client-supplied journal reference.
 */
export const planOwnerRepositoryCanonicalEconomicClosureV2 = async (
  input: unknown,
): Promise<OwnerRepositoryCanonicalEconomicClosurePlanV2> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "journalRecordBlob",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function"
  )
    throw new Error("owner_economic_manifest_invalid");
  let derivedValues: OwnerRepositoryCanonicalEconomicIndexValuesV2;
  try {
    derivedValues = createOwnerRepositoryCanonicalEconomicIndexValuesV2({
      journalRecordBlob: request.journalRecordBlob,
    });
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const valueBundle = readRecord(derivedValues, [
    "effectBinding",
    "operationValue",
    "subjectValue",
    "receiptValue",
  ]);
  const operationCandidate = readRecord(valueBundle.operationValue, [
    "schemaVersion",
    "valueKind",
    "ledgerEntry",
    "effectBinding",
    "valueFingerprint",
  ]);
  const subjectCandidate = readRecord(valueBundle.subjectValue, [
    "schemaVersion",
    "valueKind",
    "ledgerEntry",
    "effectBinding",
    "valueFingerprint",
  ]);
  const receiptCandidate = readRecord(valueBundle.receiptValue, [
    "schemaVersion",
    "valueKind",
    "appliedReceipt",
    "effectBinding",
    "valueFingerprint",
  ]);
  let operationLedger: WalletOperationLedgerEntryV1;
  let subjectLedger: WalletSubjectLedgerEntryV1;
  let appliedReceipt: WalletAppliedReceiptV1;
  try {
    operationLedger = parseWalletOperationLedgerEntry(
      operationCandidate.ledgerEntry,
    );
    subjectLedger = parseWalletSubjectLedgerEntry(
      subjectCandidate.ledgerEntry,
    );
    appliedReceipt = parseWalletAppliedReceipt(
      receiptCandidate.appliedReceipt,
    );
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const operationValue = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
    accountScopeHash: request.accountScopeHash,
    indexKind: "operation",
    keyKind: "operation_id",
    logicalKey: operationLedger.operationId,
    value: valueBundle.operationValue,
  }) as OwnerRepositoryCanonicalOperationIndexValueV2;
  const subjectValue = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
    accountScopeHash: request.accountScopeHash,
    indexKind: "subject",
    keyKind: "semantic_subject",
    logicalKey: subjectLedger.semanticSubjectFingerprint,
    value: valueBundle.subjectValue,
  }) as OwnerRepositoryCanonicalSubjectIndexValueV2;
  const receiptValue = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
    accountScopeHash: request.accountScopeHash,
    indexKind: "receipt",
    keyKind: "applied_receipt",
    logicalKey: appliedReceipt.appliedReceiptFingerprint,
    value: valueBundle.receiptValue,
  }) as OwnerRepositoryCanonicalReceiptIndexValueV2;
  if (
    !sameCanonical(valueBundle.effectBinding, operationValue.effectBinding) ||
    !sameCanonical(operationValue.effectBinding, subjectValue.effectBinding) ||
    !sameCanonical(operationValue.effectBinding, receiptValue.effectBinding)
  )
    throw new Error("owner_economic_manifest_invalid");
  const values = deepFreeze({
    effectBinding: operationValue.effectBinding,
    operationValue,
    subjectValue,
    receiptValue,
  });
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  let existing: OwnerRepositoryCanonicalEconomicClosureLookupV2;
  try {
    existing = await lookupCanonicalV2ClosureWithSession({
      accountScopeHash: request.accountScopeHash,
      operationManifest:
        request.operationManifest as OwnerRepositoryRadixManifest,
      subjectManifest:
        request.subjectManifest as OwnerRepositoryRadixManifest,
      receiptManifest:
        request.receiptManifest as OwnerRepositoryRadixManifest,
      operationId: operationValue.ledgerEntry.operationId,
      operationFingerprint: operationValue.ledgerEntry.operationFingerprint,
      semanticSubjectFingerprint:
        subjectValue.ledgerEntry.semanticSubjectFingerprint,
      session,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "owner_economic_manifest_read_budget_exceeded"
    )
      throw error;
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (existing.status === "subject_only") {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (
    existing.status === "canonical" &&
    (!sameCanonical(existing.operationValue, operationValue) ||
      !sameCanonical(existing.subjectValue, subjectValue) ||
      !sameCanonical(existing.receiptValue, receiptValue))
  )
    throw new Error("owner_economic_manifest_conflict");
  let operationPlan;
  let subjectPlan;
  let receiptPlan;
  try {
    operationPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "operation",
      manifest: request.operationManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: operationValue.ledgerEntry.operationId,
          value: operationValue,
        },
        {
          keyKind: "operation_fingerprint",
          logicalKey: operationValue.ledgerEntry.operationFingerprint,
          value: operationValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
    subjectPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "subject",
      manifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "semantic_subject",
          logicalKey: subjectValue.ledgerEntry.semanticSubjectFingerprint,
          value: subjectValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
    receiptPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "receipt",
      manifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "applied_receipt",
          logicalKey: receiptValue.appliedReceipt.appliedReceiptFingerprint,
          value: receiptValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (session.budgetExceeded)
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    return mapPlanError(error);
  }
  const changed = [
    operationPlan.changed,
    subjectPlan.changed,
    receiptPlan.changed,
  ];
  if (!changed.every(Boolean) && changed.some(Boolean)) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const operationManifest =
    operationPlan.manifest as OwnerRepositoryEconomicManifestV2<"operation">;
  const subjectManifest =
    subjectPlan.manifest as OwnerRepositoryEconomicManifestV2<"subject">;
  const receiptManifest =
    receiptPlan.manifest as OwnerRepositoryEconomicManifestV2<"receipt">;
  return deepFreeze({
    values,
    operationManifest,
    subjectManifest,
    receiptManifest,
    operationManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "operation",
      operationManifest,
    ),
    subjectManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "subject",
      subjectManifest,
    ),
    receiptManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "receipt",
      receiptManifest,
    ),
    immutableNodeBlobs: [
      ...operationPlan.immutableBlobs,
      ...subjectPlan.immutableBlobs,
      ...receiptPlan.immutableBlobs,
    ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
    changed: changed[0],
  });
};

/**
 * Inserts the exact four canonical compound-unlock coordinates into the same
 * lifetime radix manifests used by wallet credits. The value schema remains
 * effect-specific, while the radix key space stays account-global.
 */
export const planOwnerRepositoryCourseUnlockEconomicClosureV2 = async (
  input: unknown,
): Promise<OwnerRepositoryCourseUnlockEconomicClosurePlanV2> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "journalRecordBlob",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function"
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  let derivedValues: OwnerRepositoryCourseUnlockCanonicalIndexValuesV2;
  try {
    derivedValues = createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2({
      journalRecordBlob: request.journalRecordBlob,
    });
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const valueBundle = readRecord(derivedValues, [
    "effectBinding",
    "operationValue",
    "subjectValue",
    "receiptValue",
  ]);
  const operationCandidate = readRecord(valueBundle.operationValue, [
    "schemaVersion",
    "valueKind",
    "ledgerEntry",
    "effectBinding",
    "valueFingerprint",
  ]);
  const subjectCandidate = readRecord(valueBundle.subjectValue, [
    "schemaVersion",
    "valueKind",
    "ledgerEntry",
    "effectBinding",
    "valueFingerprint",
  ]);
  const receiptCandidate = readRecord(valueBundle.receiptValue, [
    "schemaVersion",
    "valueKind",
    "appliedReceipt",
    "effectBinding",
    "valueFingerprint",
  ]);
  const operationLedger = operationCandidate.ledgerEntry as Readonly<{
    operationId: string;
    operationFingerprint: string;
  }>;
  const subjectLedger = subjectCandidate.ledgerEntry as Readonly<{
    semanticSubjectFingerprint: string;
  }>;
  const appliedReceipt = receiptCandidate.appliedReceipt as Readonly<{
    appliedReceiptFingerprint: string;
  }>;
  let operationValue: OwnerRepositoryCourseUnlockOperationIndexValueV2;
  let subjectValue: OwnerRepositoryCourseUnlockSubjectIndexValueV2;
  let receiptValue: OwnerRepositoryCourseUnlockReceiptIndexValueV2;
  try {
    operationValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
      accountScopeHash: request.accountScopeHash,
      indexKind: "operation",
      keyKind: "operation_id",
      logicalKey: operationLedger.operationId,
      value: valueBundle.operationValue,
    }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
    subjectValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
      accountScopeHash: request.accountScopeHash,
      indexKind: "subject",
      keyKind: "semantic_subject",
      logicalKey: subjectLedger.semanticSubjectFingerprint,
      value: valueBundle.subjectValue,
    }) as OwnerRepositoryCourseUnlockSubjectIndexValueV2;
    receiptValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
      accountScopeHash: request.accountScopeHash,
      indexKind: "receipt",
      keyKind: "applied_receipt",
      logicalKey: appliedReceipt.appliedReceiptFingerprint,
      value: valueBundle.receiptValue,
    }) as OwnerRepositoryCourseUnlockReceiptIndexValueV2;
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  if (
    !sameCanonical(valueBundle.effectBinding, operationValue.effectBinding) ||
    !sameCanonical(operationValue.effectBinding, subjectValue.effectBinding) ||
    !sameCanonical(operationValue.effectBinding, receiptValue.effectBinding)
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  const values = deepFreeze({
    effectBinding: operationValue.effectBinding,
    operationValue,
    subjectValue,
    receiptValue,
  });
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  let operationPlan;
  let subjectPlan;
  let receiptPlan;
  try {
    operationPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "operation",
      manifest: request.operationManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: operationValue.ledgerEntry.operationId,
          value: operationValue,
        },
        {
          keyKind: "operation_fingerprint",
          logicalKey: operationValue.ledgerEntry.operationFingerprint,
          value: operationValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
    subjectPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "subject",
      manifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "semantic_subject",
          logicalKey: subjectValue.ledgerEntry.semanticSubjectFingerprint,
          value: subjectValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
    receiptPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "receipt",
      manifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "applied_receipt",
          logicalKey: receiptValue.appliedReceipt.appliedReceiptFingerprint,
          value: receiptValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (session.budgetExceeded) {
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    return mapPlanError(error);
  }
  const changed = [
    operationPlan.changed,
    subjectPlan.changed,
    receiptPlan.changed,
  ];
  if (!changed.every(Boolean) && changed.some(Boolean)) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const operationManifest =
    operationPlan.manifest as OwnerRepositoryEconomicManifestV2<"operation">;
  const subjectManifest =
    subjectPlan.manifest as OwnerRepositoryEconomicManifestV2<"subject">;
  const receiptManifest =
    receiptPlan.manifest as OwnerRepositoryEconomicManifestV2<"receipt">;
  return deepFreeze({
    values,
    operationManifest,
    subjectManifest,
    receiptManifest,
    operationManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "operation",
      operationManifest,
    ),
    subjectManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "subject",
      subjectManifest,
    ),
    receiptManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "receipt",
      receiptManifest,
    ),
    immutableNodeBlobs: [
      ...operationPlan.immutableBlobs,
      ...subjectPlan.immutableBlobs,
      ...receiptPlan.immutableBlobs,
    ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey)),
    changed: changed[0],
  });
};

/** Inserts the two alias keys while retaining the canonical effect binding. */
export const planOwnerRepositoryOperationAliasV2 = async (
  input: unknown,
): Promise<OwnerRepositoryOperationAliasPlanV2> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "authorizedAliasOperation",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function"
  )
    throw new Error("owner_economic_manifest_invalid");
  let operation: WalletAuthorizedOperationV1;
  try {
    operation = createWalletAuthorizedOperation(
      request.authorizedAliasOperation,
    );
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  if (operation.accountScopeHash !== request.accountScopeHash) {
    throw new Error("owner_economic_manifest_invalid");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  let closure: OwnerRepositoryCanonicalEconomicClosureLookupV2;
  try {
    closure = await lookupCanonicalV2ClosureWithSession({
      accountScopeHash: request.accountScopeHash,
      operationManifest:
        request.operationManifest as OwnerRepositoryRadixManifest,
      subjectManifest:
        request.subjectManifest as OwnerRepositoryRadixManifest,
      receiptManifest:
        request.receiptManifest as OwnerRepositoryRadixManifest,
      operationId: operation.operationId,
      operationFingerprint: operation.operationFingerprint,
      semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
      session,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "owner_economic_manifest_read_budget_exceeded"
    )
      throw error;
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (closure.status === "absent") {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (closure.status === "canonical") {
    throw new Error("owner_economic_manifest_conflict");
  }
  const receiptValue = closure.receiptValue;
  let aliasValue: OwnerRepositoryOperationAliasIndexValueV2;
  try {
    aliasValue = createOwnerRepositoryOperationAliasIndexValueV2({
      accountScopeHash: request.accountScopeHash,
      authorizedAliasOperation: operation,
      receiptValue,
    });
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  if (closure.status === "alias") {
    if (!sameCanonical(closure.operationValue, aliasValue)) {
      throw new Error("owner_economic_manifest_conflict");
    }
    return deepFreeze({
      aliasValue,
      operationManifest:
        request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
      operationManifestBlob: materializeManifestBlob(
        request.accountScopeHash,
        "operation",
        request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
      ),
      immutableNodeBlobs: [] as const,
      changed: false,
    });
  }
  let operationPlan;
  try {
    operationPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "operation",
      manifest: request.operationManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: aliasValue.ledgerEntry.operationId,
          value: aliasValue,
        },
        {
          keyKind: "operation_fingerprint",
          logicalKey: aliasValue.ledgerEntry.operationFingerprint,
          value: aliasValue,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (session.budgetExceeded)
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    return mapPlanError(error);
  }
  if (!operationPlan.changed) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const operationManifest =
    operationPlan.manifest as OwnerRepositoryEconomicManifestV2<"operation">;
  return deepFreeze({
    aliasValue,
    operationManifest,
    operationManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "operation",
      operationManifest,
    ),
    immutableNodeBlobs: operationPlan.immutableBlobs,
    changed: true,
  });
};

/**
 * Adds only the two verifiable transport-alias operation keys. The canonical
 * subject and receipt must already exist and remain byte-identical.
 */
export const planOwnerRepositoryOperationAlias = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly authorizedAliasOperation: WalletAuthorizedOperationV1;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryOperationAliasPlan> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "authorizedAliasOperation",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function"
  )
    throw new Error("owner_economic_manifest_invalid");
  let operation: WalletAuthorizedOperationV1;
  try {
    operation = createWalletAuthorizedOperation(
      request.authorizedAliasOperation,
    );
    if (operation.accountScopeHash !== request.accountScopeHash)
      throw new Error("scope_mismatch");
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  let closure: OwnerRepositoryEconomicClosureLookup;
  try {
    closure = await lookupClosureWithSession({
      accountScopeHash: request.accountScopeHash,
      operationManifest:
        request.operationManifest as OwnerRepositoryRadixManifest,
      subjectManifest: request.subjectManifest as OwnerRepositoryRadixManifest,
      receiptManifest: request.receiptManifest as OwnerRepositoryRadixManifest,
      operationId: operation.operationId,
      operationFingerprint: operation.operationFingerprint,
      semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
      session,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "owner_economic_manifest_read_budget_exceeded"
    )
      throw error;
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (closure.status === "absent" || closure.status === "canonical") {
    throw new Error("owner_economic_manifest_conflict");
  }
  let aliasEntry: WalletOperationAliasLedgerEntryV2;
  try {
    aliasEntry = createWalletOperationAliasLedgerEntry({
      authorizedAliasOperation: operation,
      appliedReceipt: closure.appliedReceipt,
    });
  } catch {
    throw new Error("owner_economic_manifest_conflict");
  }
  if (closure.status === "alias") {
    if (!sameCanonical(closure.operationLedgerEntry, aliasEntry))
      throw new Error("owner_economic_manifest_conflict");
    return deepFreeze({
      aliasEntry,
      operationManifest:
        request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
      operationManifestBlob: materializeManifestBlob(
        request.accountScopeHash,
        "operation",
        request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
      ),
      immutableNodeBlobs: [] as const,
      changed: false,
    });
  }
  let operationPlan;
  try {
    operationPlan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: "operation",
      manifest: request.operationManifest as OwnerRepositoryRadixManifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: aliasEntry.operationId,
          value: aliasEntry,
        },
        {
          keyKind: "operation_fingerprint",
          logicalKey: aliasEntry.operationFingerprint,
          value: aliasEntry,
        },
      ],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (session.budgetExceeded)
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    return mapPlanError(error);
  }
  if (!operationPlan.changed)
    throw new Error("owner_economic_manifest_indeterminate");
  const operationManifest =
    operationPlan.manifest as OwnerRepositoryEconomicManifestV2<"operation">;
  return deepFreeze({
    aliasEntry,
    operationManifest,
    operationManifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      "operation",
      operationManifest,
    ),
    immutableNodeBlobs: [...operationPlan.immutableBlobs].sort((left, right) =>
      left.ref.blobKey.localeCompare(right.ref.blobKey),
    ),
    changed: true,
  });
};

/**
 * Plans exactly one canonical missing-key insertion. This is a recovery
 * primitive, not corruption authority: repository history validation must prove
 * the referenced effect and the missing-key condition before publication.
 */
export const planOwnerRepositoryCanonicalIndexRepair = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly repairKeyKind: OwnerRepositoryCanonicalIndexRepairKeyKind;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryCanonicalIndexRepairPlan> => {
  const request = readRecord(input, [
    "accountScopeHash", "operationManifest", "subjectManifest",
    "receiptManifest", "appliedReceipt", "repairKeyKind", "resolveNode",
  ], ["readBudget"]);
  if (typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function" ||
    !["operation_id", "operation_fingerprint", "semantic_subject", "applied_receipt"]
      .includes(request.repairKeyKind as string)) {
    throw new Error("owner_economic_manifest_invalid");
  }
  let entries: ReturnType<typeof createWalletCanonicalLedgerEntriesFromAppliedReceipt>;
  try {
    entries = createWalletCanonicalLedgerEntriesFromAppliedReceipt(
      request.appliedReceipt,
    );
    if (entries.appliedReceipt.accountScopeHash !== request.accountScopeHash) {
      throw new Error("scope_mismatch");
    }
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const keyKind = request.repairKeyKind as OwnerRepositoryCanonicalIndexRepairKeyKind;
  const target = keyKind === "operation_id"
    ? {
        indexKind: "operation" as const,
        logicalKey: entries.operationLedgerEntry.operationId,
        value: entries.operationLedgerEntry,
        manifest: request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
      }
    : keyKind === "operation_fingerprint"
      ? {
          indexKind: "operation" as const,
          logicalKey: entries.operationLedgerEntry.operationFingerprint,
          value: entries.operationLedgerEntry,
          manifest: request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
        }
      : keyKind === "semantic_subject"
        ? {
            indexKind: "subject" as const,
            logicalKey: entries.subjectLedgerEntry.semanticSubjectFingerprint,
            value: entries.subjectLedgerEntry,
            manifest: request.subjectManifest as OwnerRepositoryEconomicManifestV2<"subject">,
          }
        : {
            indexKind: "receipt" as const,
            logicalKey: entries.appliedReceipt.appliedReceiptFingerprint,
            value: entries.appliedReceipt,
            manifest: request.receiptManifest as OwnerRepositoryEconomicManifestV2<"receipt">,
          };
  const hasReadBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
  const session = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  let existing: ParsedEconomicValue | undefined;
  try {
    existing = await lookupTypedEntry(
      request.accountScopeHash,
      target.indexKind,
      target.manifest,
      keyKind,
      target.logicalKey,
      session,
    );
  } catch (error) {
    if (error instanceof Error &&
      error.message === "owner_economic_manifest_read_budget_exceeded") throw error;
    throw new Error("owner_economic_manifest_indeterminate");
  }
  if (existing !== undefined) {
    if (!sameCanonical(existing, target.value)) {
      throw new Error("owner_economic_manifest_conflict");
    }
    return deepFreeze({
      indexKind: target.indexKind,
      keyKind,
      logicalKey: target.logicalKey,
      valueFingerprint: sha256Utf8(canonicalJsonV1(target.value)),
      manifest: target.manifest,
      manifestBlob: materializeManifestBlob(
        request.accountScopeHash,
        target.indexKind,
        target.manifest,
      ),
      immutableNodeBlobs: [] as const,
      changed: false,
    });
  }
  let plan;
  try {
    plan = await planOwnerRepositoryRadixBatch({
      accountScopeHash: request.accountScopeHash,
      indexKind: target.indexKind,
      manifest: target.manifest,
      mutations: [{ keyKind, logicalKey: target.logicalKey, value: target.value }],
      resolveNode: session.resolveNode,
      readBudget: session.readBudget,
    });
  } catch (error) {
    if (session.budgetExceeded) {
      throw new Error("owner_economic_manifest_read_budget_exceeded");
    }
    return mapPlanError(error);
  }
  if (!plan.changed) throw new Error("owner_economic_manifest_indeterminate");
  const manifest = plan.manifest as OwnerRepositoryEconomicManifestV2;
  return deepFreeze({
    indexKind: target.indexKind,
    keyKind,
    logicalKey: target.logicalKey,
    valueFingerprint: sha256Utf8(canonicalJsonV1(target.value)),
    manifest,
    manifestBlob: materializeManifestBlob(
      request.accountScopeHash,
      target.indexKind,
      manifest,
    ),
    immutableNodeBlobs: [...plan.immutableBlobs].sort((left, right) =>
      left.ref.blobKey.localeCompare(right.ref.blobKey)),
    changed: true,
  });
};

export const assertOwnerRepositoryEconomicClosureForReceipt = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<
  Readonly<{
    operationLedgerEntry: WalletOperationLedgerEntryV1;
    subjectLedgerEntry: WalletSubjectLedgerEntryV1;
    appliedReceipt: WalletAppliedReceiptV1;
  }>
> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "appliedReceipt",
      "resolveNode",
    ],
    ["readBudget"],
  );
  let receipt: WalletAppliedReceiptV1;
  try {
    receipt = parseWalletAppliedReceipt(request.appliedReceipt);
  } catch {
    throw new Error("owner_economic_manifest_invalid");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const closure = await lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
    accountScopeHash: request.accountScopeHash as string,
    operationManifest:
      request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">,
    subjectManifest:
      request.subjectManifest as OwnerRepositoryEconomicManifestV2<"subject">,
    receiptManifest:
      request.receiptManifest as OwnerRepositoryEconomicManifestV2<"receipt">,
    operationId: receipt.operationId,
    operationFingerprint: receipt.operationFingerprint,
    semanticSubjectFingerprint: receipt.semanticSubjectFingerprint,
    resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
    ...(hasReadBudget
      ? { readBudget: request.readBudget as OwnerRepositoryRadixReadBudget }
      : {}),
  });
  if (
    closure.status !== "canonical" ||
    !sameCanonical(closure.appliedReceipt, receipt)
  ) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  return deepFreeze({
    operationLedgerEntry: closure.operationLedgerEntry,
    subjectLedgerEntry: closure.subjectLedgerEntry,
    appliedReceipt: closure.appliedReceipt,
  });
};

/** Typed bounded page over the complete economic radix graph. */
export const auditOwnerRepositoryEconomicManifestPage = async (input: {
  readonly accountScopeHash: string;
  readonly indexKind: OwnerRepositoryEconomicIndexKind;
  readonly manifest: OwnerRepositoryRadixManifest;
  readonly cursor: OwnerRepositoryRadixAuditCursorV1 | null;
  readonly maxNodes: number;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryEconomicAuditPageV1> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "indexKind",
      "manifest",
      "cursor",
      "maxNodes",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    !economicKind(request.indexKind) ||
    typeof request.resolveNode !== "function"
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  let radix: OwnerRepositoryRadixAuditPageV1;
  try {
    radix = await auditOwnerRepositoryRadixPage({
      accountScopeHash: request.accountScopeHash,
      indexKind: request.indexKind,
      manifest: request.manifest as OwnerRepositoryRadixManifest,
      cursor: request.cursor as OwnerRepositoryRadixAuditCursorV1 | null,
      maxNodes: request.maxNodes as number,
      resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
      ...(hasReadBudget
        ? { readBudget: request.readBudget as OwnerRepositoryRadixReadBudget }
        : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("budget")) throw error;
    if (
      error instanceof Error &&
      error.message === "owner_index_audit_invalid"
    ) {
      throw new Error("owner_economic_manifest_invalid");
    }
    throw new Error("owner_economic_manifest_indeterminate");
  }
  const typedValues = radix.entries.map((entry) =>
    parseTypedEconomicValue(
      request.accountScopeHash as string,
      request.indexKind as OwnerRepositoryEconomicIndexKind,
      entry,
    ),
  );
  return deepFreeze({ radix, typedValues });
};

const zeroEconomicAuditSums = (): EconomicAuditSums =>
  deepFreeze({
    operationIdCount: 0,
    operationFingerprintCount: 0,
    aliasOperationIdCount: 0,
    aliasOperationFingerprintCount: 0,
    subjectCount: 0,
    receiptCount: 0,
    operationIdSum: "0".repeat(64),
    operationFingerprintSum: "0".repeat(64),
    aliasOperationIdSum: "0".repeat(64),
    aliasOperationFingerprintSum: "0".repeat(64),
    subjectSum: "0".repeat(64),
    receiptSum: "0".repeat(64),
  });
const addAuditHash = (left: string, right: string): string =>
  ((BigInt(`0x${left}`) + BigInt(`0x${right}`)) % HASH_MODULUS)
    .toString(16)
    .padStart(64, "0");
const checkedAuditCount = (value: number): number => {
  if (!Number.isSafeInteger(value) || value > Number.MAX_SAFE_INTEGER) {
    throw new Error("owner_economic_manifest_indeterminate");
  }
  return value;
};
const receiptForAuditValue = (
  value:
    | WalletOperationLedgerEntryV1
    | WalletOperationAliasLedgerEntryV2
    | WalletSubjectLedgerEntryV1
    | WalletAppliedReceiptV1,
): WalletAppliedReceiptV1 =>
  value.schemaVersion === "learning-v2-wallet-applied-receipt.v1"
    ? value
    : value.appliedReceipt;
const manifestsAuditFingerprint = (
  operationManifest: OwnerRepositoryRadixManifest,
  subjectManifest: OwnerRepositoryRadixManifest,
  receiptManifest: OwnerRepositoryRadixManifest,
): string =>
  sha256Utf8(
    canonicalJsonV1({ operationManifest, subjectManifest, receiptManifest }),
  );

/**
 * O(1)-memory cross-index audit. Commutative receipt-binding sums prove that the
 * operation-id, operation-fingerprint, subject and receipt families describe the
 * same lifetime set while the underlying radix pages prove every stored value.
 */
export const auditOwnerRepositoryEconomicClosurePage = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryRadixManifest;
  readonly subjectManifest: OwnerRepositoryRadixManifest;
  readonly receiptManifest: OwnerRepositoryRadixManifest;
  readonly cursor: OwnerRepositoryEconomicClosureAuditCursorV1 | null;
  readonly maxNodes: number;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryEconomicClosureAuditPageV1> => {
  const request = readRecord(
    input,
    [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "cursor",
      "maxNodes",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function"
  ) {
    throw new Error("owner_economic_manifest_invalid");
  }
  const operationManifest =
    request.operationManifest as OwnerRepositoryRadixManifest;
  const subjectManifest =
    request.subjectManifest as OwnerRepositoryRadixManifest;
  const receiptManifest =
    request.receiptManifest as OwnerRepositoryRadixManifest;
  const manifestsFingerprint = manifestsAuditFingerprint(
    operationManifest,
    subjectManifest,
    receiptManifest,
  );
  let phase: EconomicAuditPhase = "operation";
  let radixCursor: OwnerRepositoryRadixAuditCursorV1 | null = null;
  let sums = zeroEconomicAuditSums();
  if (request.cursor !== null) {
    if (
      !isRecord(request.cursor) ||
      !ECONOMIC_AUDIT_CURSORS.has(request.cursor)
    ) {
      throw new Error("owner_economic_manifest_invalid");
    }
    const cursor = request.cursor as unknown as InternalEconomicAuditCursor;
    if (
      cursor.accountScopeHash !== request.accountScopeHash ||
      cursor.manifestsFingerprint !== manifestsFingerprint ||
      !economicKind(cursor.phase)
    ) {
      throw new Error("owner_economic_manifest_invalid");
    }
    phase = cursor.phase;
    radixCursor = cursor.radixCursor;
    sums = cursor.sums;
  }
  const manifest =
    phase === "operation"
      ? operationManifest
      : phase === "subject"
        ? subjectManifest
        : receiptManifest;
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const audited = await auditOwnerRepositoryEconomicManifestPage({
    accountScopeHash: request.accountScopeHash,
    indexKind: phase,
    manifest,
    cursor: radixCursor,
    maxNodes: request.maxNodes as number,
    resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
    ...(hasReadBudget
      ? { readBudget: request.readBudget as OwnerRepositoryRadixReadBudget }
      : {}),
  });
  const mutable = { ...sums };
  const aliasLookupSession = createSharedResolverSession(
    request.resolveNode,
    hasReadBudget ? request.readBudget : undefined,
    hasReadBudget,
  );
  for (let index = 0; index < audited.typedValues.length; index += 1) {
    const entry = audited.radix.entries[index];
    const typedValue = audited.typedValues[index];
    const receipt = receiptForAuditValue(typedValue);
    const bindingHash = sha256Utf8(canonicalJsonV1(receipt));
    if (
      phase === "operation" &&
      typedValue.schemaVersion ===
        "learning-v2-wallet-operation-alias-ledger-entry.v2"
    ) {
      let storedSubject: ParsedEconomicValue | undefined;
      let storedReceipt: ParsedEconomicValue | undefined;
      try {
        storedSubject = await lookupTypedEntry(
          request.accountScopeHash,
          "subject",
          subjectManifest,
          "semantic_subject",
          typedValue.semanticSubjectFingerprint,
          aliasLookupSession,
        );
        storedReceipt = await lookupTypedEntry(
          request.accountScopeHash,
          "receipt",
          receiptManifest,
          "applied_receipt",
          receipt.appliedReceiptFingerprint,
          aliasLookupSession,
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("budget"))
          throw error;
        throw new Error("owner_economic_manifest_indeterminate");
      }
      if (
        storedSubject === undefined ||
        storedReceipt === undefined ||
        !sameCanonical(
          (storedSubject as WalletSubjectLedgerEntryV1).appliedReceipt,
          receipt,
        ) ||
        !sameCanonical(storedReceipt, receipt)
      )
        throw new Error("owner_economic_manifest_indeterminate");
      if (entry.keyKind === "operation_id") {
        mutable.aliasOperationIdCount = checkedAuditCount(
          mutable.aliasOperationIdCount + 1,
        );
        mutable.aliasOperationIdSum = addAuditHash(
          mutable.aliasOperationIdSum,
          typedValue.aliasEntryFingerprint,
        );
      } else if (entry.keyKind === "operation_fingerprint") {
        mutable.aliasOperationFingerprintCount = checkedAuditCount(
          mutable.aliasOperationFingerprintCount + 1,
        );
        mutable.aliasOperationFingerprintSum = addAuditHash(
          mutable.aliasOperationFingerprintSum,
          typedValue.aliasEntryFingerprint,
        );
      } else {
        throw new Error("owner_economic_manifest_indeterminate");
      }
    } else if (phase === "operation" && entry.keyKind === "operation_id") {
      mutable.operationIdCount = checkedAuditCount(
        mutable.operationIdCount + 1,
      );
      mutable.operationIdSum = addAuditHash(
        mutable.operationIdSum,
        bindingHash,
      );
    } else if (
      phase === "operation" &&
      entry.keyKind === "operation_fingerprint"
    ) {
      mutable.operationFingerprintCount = checkedAuditCount(
        mutable.operationFingerprintCount + 1,
      );
      mutable.operationFingerprintSum = addAuditHash(
        mutable.operationFingerprintSum,
        bindingHash,
      );
    } else if (phase === "subject") {
      mutable.subjectCount = checkedAuditCount(mutable.subjectCount + 1);
      mutable.subjectSum = addAuditHash(mutable.subjectSum, bindingHash);
    } else if (phase === "receipt") {
      mutable.receiptCount = checkedAuditCount(mutable.receiptCount + 1);
      mutable.receiptSum = addAuditHash(mutable.receiptSum, bindingHash);
    } else {
      throw new Error("owner_economic_manifest_indeterminate");
    }
  }
  sums = deepFreeze(mutable);
  let done = false;
  let nextPhase = phase;
  let nextRadixCursor = audited.radix.cursor;
  if (audited.radix.done) {
    if (phase === "operation") nextPhase = "subject";
    else if (phase === "subject") nextPhase = "receipt";
    else done = true;
    nextRadixCursor = null;
  }
  if (done) {
    const expected = sums.receiptCount;
    if (
      sums.operationIdCount !== expected ||
      sums.operationFingerprintCount !== expected ||
      sums.subjectCount !== expected ||
      sums.operationIdSum !== sums.receiptSum ||
      sums.operationFingerprintSum !== sums.receiptSum ||
      sums.subjectSum !== sums.receiptSum ||
      sums.aliasOperationIdCount !== sums.aliasOperationFingerprintCount ||
      sums.aliasOperationIdSum !== sums.aliasOperationFingerprintSum
    ) {
      throw new Error("owner_economic_manifest_indeterminate");
    }
    return deepFreeze({
      done: true,
      cursor: null,
      auditedPhase: phase,
      radix: audited.radix,
    });
  }
  const cursor = deepFreeze({
    schemaVersion:
      "learning-v2-owner-economic-closure-audit-cursor.v1" as const,
    accountScopeHash: request.accountScopeHash,
    manifestsFingerprint,
    phase: nextPhase,
    authority: "in_process_economic_audit_cursor" as const,
    radixCursor: nextRadixCursor,
    sums,
  });
  ECONOMIC_AUDIT_CURSORS.add(cursor);
  return deepFreeze({
    done: false,
    cursor,
    auditedPhase: phase,
    radix: audited.radix,
  });
};

export const isOwnerRepositoryEconomicClosureAuditCursor = (
  value: unknown,
): value is OwnerRepositoryEconomicClosureAuditCursorV1 =>
  isRecord(value) && ECONOMIC_AUDIT_CURSORS.has(value);
