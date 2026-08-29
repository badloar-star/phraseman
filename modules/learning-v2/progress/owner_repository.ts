import {
  createWalletState,
  parseWalletState,
  rebuildWalletStateFromAppliedReceipts,
  type WalletAppliedReceiptV1,
  type WalletStateV1,
} from "./wallet_reducer";
import {
  createAuthorizedCourseUnlockRequest,
} from "../contracts/course_unlock";
import {
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
} from "../contracts/wallet";
import {
  createCourseUnlockState,
  parseCourseUnlockState,
  type CourseUnlockAppliedReceiptV1,
  type CourseUnlockStateV1,
} from "./course_unlock_reducer";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  createEmptyOwnerRepositoryCourseManifest,
  lookupOwnerRepositoryCourseState,
  parseOwnerRepositoryCourseManifestBlob,
  type OwnerRepositoryCourseStateManifestV1,
} from "./owner_repository_course_manifest";
import {
  advanceOwnerRepositoryRootV2Generation,
  createGenesisOwnerRepositoryRootV2,
  migrateVerifiedGenesisOwnerRepositoryRootV1,
  parseOwnerRepositoryRootV2Raw,
  type OwnerRepositoryRootV2,
} from "./owner_repository_root_v2";
import {
  assertOwnerRepositoryEconomicClosureForReceipt,
  lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2,
  parseOwnerRepositoryEconomicManifestBlob,
  planOwnerRepositoryOperationAliasV2,
  type OwnerRepositoryEconomicClosureAuditCursorV1,
  type OwnerRepositoryEconomicManifestV2,
  type ParsedOwnerRepositoryEconomicManifest,
} from "./owner_repository_economic_manifest";
import type { OwnerRepositoryRadixNodeResolver } from "./owner_repository_radix";
import { parseOwnerRepositoryJournalRecordBlob } from "./owner_repository_root_fold";
import {
  createOwnerRepositoryOperationAliasRecordV2,
  materializeOwnerRepositoryOperationAliasRecordBlobV2,
  parseOwnerRepositoryOperationAliasRecordBlobV2,
  parseOwnerRepositoryWalletCreditEffectRecordBlobV2,
} from "./owner_repository_economic_effect_v2";
import { parseOwnerRepositoryWalletStateBlob } from "./owner_repository_wallet_blob";
import { parseOwnerRepositoryCourseUnlockStateBlob } from
  "./owner_repository_course_blob";
import {
  lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2,
  planOwnerRepositoryCourseUnlock,
} from "./owner_repository_course_unlock_plan";
import { parseServerCourseUnlockRequest } from
  "./server_course_unlock_receipt";
import {
  planOwnerRepositoryWalletCredit,
  planOwnerRepositoryWalletCreditV2,
  type OwnerRepositoryWalletCreditPlanResult,
  type OwnerRepositoryWalletCreditPlanV2Result,
} from "./owner_repository_wallet_credit_plan";
import type { OwnerRepositoryWalletWindowVerifiedCandidate } from "./owner_repository_wallet_window";
import type { OwnerRepositoryRootV3 } from "./owner_repository_root_v3";
import type { OwnerRepositoryWalletCheckpointV2Materialization } from "./owner_repository_wallet_checkpoint_v2";

export interface OwnerRepositoryScope {
  readonly accountScopeHash: string;
  readonly generation: number;
}

export type OwnerRepositoryGenerationGuard = (
  scope: OwnerRepositoryScope,
) => boolean;

export interface OwnerRepositoryActiveOwnerFence {
  readonly accountScopeHash: string;
  readonly generation: number;
}

export interface OwnerRepositoryCasStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getCurrentOwnerFence(): Promise<OwnerRepositoryActiveOwnerFence | null>;
  /** Root compare and the single active-owner fence MUST be one atomic operation. */
  compareAndSet(
    key: string,
    expected: string | null,
    next: string,
    fence: OwnerRepositoryActiveOwnerFence,
  ): Promise<"committed" | "conflict" | "stale_generation">;
}

export type OwnerRepositoryBlobKind =
  | "wallet_state"
  | "course_unlock_state"
  | "operation_index_manifest"
  | "subject_index_manifest"
  | "receipt_index_manifest"
  | "index_radix_node"
  | "course_state_manifest"
  | "journal_record";

export interface OwnerRepositoryBlobRefV1 {
  readonly schemaVersion: "learning-v2-owner-repository-blob-ref.v1";
  readonly kind: OwnerRepositoryBlobKind;
  readonly blobKey: string;
  readonly blobFingerprint: string;
}

export interface OwnerRepositoryRootV1 {
  readonly schemaVersion: "learning-v2-owner-repository-root.v1";
  readonly accountScopeHash: string;
  readonly currentGeneration: number;
  readonly repositoryRevision: number;
  readonly journalSequence: number;
  readonly previousRootFingerprint: string | null;
  readonly journalHeadRef: OwnerRepositoryBlobRefV1 | null;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly courseStateRefs: readonly OwnerRepositoryCourseStateRefV1[];
  readonly operationIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly rootFingerprint: string;
}

export interface OwnerRepositoryCourseStateRefV1 {
  readonly schemaVersion: "learning-v2-owner-repository-course-ref.v1";
  readonly courseIdentityFingerprint: string;
  readonly stateRef: OwnerRepositoryBlobRefV1;
}

export interface OwnerRepositorySnapshot {
  readonly root: OwnerRepositoryRootV1;
  readonly walletState: WalletStateV1;
  readonly courseUnlockStates: readonly CourseUnlockStateV1[];
}

export interface OwnerRepositorySnapshotV2 {
  readonly root: OwnerRepositoryRootV2;
  readonly walletState: WalletStateV1;
  readonly courseStateManifest: OwnerRepositoryCourseStateManifestV1;
}

export interface OwnerRepositorySnapshotV3 {
  readonly root: OwnerRepositoryRootV3;
  readonly walletState: WalletStateV1;
  readonly courseStateManifest: OwnerRepositoryCourseStateManifestV1;
}

export interface OwnerRepositoryWalletCreditAuthorityInput {
  readonly scope: OwnerRepositoryScope;
  readonly walletState: WalletStateV1;
  /** Repository-verified canonical effect for restart-safe exact replay in this bounded packet. */
  readonly canonicalAppliedReceipt: WalletAppliedReceiptV1 | null;
  readonly candidate: unknown;
}

export interface OwnerRepositoryCourseUnlockAuthorityInput {
  readonly scope: OwnerRepositoryScope;
  readonly walletState: WalletStateV1;
  readonly courseUnlockState: CourseUnlockStateV1;
  /** Exact repository-verified compound receipt for replay, never client JSON. */
  readonly canonicalAppliedReceipt: CourseUnlockAppliedReceiptV1 | null;
  readonly candidate: unknown;
}

export interface OwnerRepositoryOptions {
  /**
   * Server-only verifier/materializer. Client JSON must never provide its output directly.
   * On replay it must compare the complete candidate to canonicalAppliedReceipt and return
   * that receipt's exact authorizedOperation only when they describe the same settlement.
   */
  readonly materializeWalletCredit?: (
    input: OwnerRepositoryWalletCreditAuthorityInput,
  ) => Promise<unknown> | unknown;
  /** Protected-server materializer for an atomic stars debit + course unlock. */
  readonly materializeCourseUnlock?: (
    input: OwnerRepositoryCourseUnlockAuthorityInput,
  ) => Promise<unknown> | unknown;
}

export interface OwnerRepositoryWalletCreditCommitResult {
  readonly status: OwnerRepositoryWalletCreditPlanResult["status"] | "aliased";
  readonly appliedReceipt: WalletAppliedReceiptV1;
  readonly snapshot: OwnerRepositorySnapshotV2 | OwnerRepositorySnapshotV3;
}

export type OwnerRepositoryCourseUnlockCommitResult =
  | Readonly<{
      readonly status: "insufficient_balance";
      readonly requiredSubunits: number;
      readonly currentBalanceSubunits: number;
      readonly courseUnlockState: CourseUnlockStateV1;
      readonly snapshot: OwnerRepositorySnapshotV2 | OwnerRepositorySnapshotV3;
    }>
  | Readonly<{
      readonly status: "applied" | "replayed";
      readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
      readonly courseUnlockState: CourseUnlockStateV1;
      readonly snapshot: OwnerRepositorySnapshotV2 | OwnerRepositorySnapshotV3;
    }>;

export interface OwnerRepositoryAdmittedWalletWindow {
  readonly scope: OwnerRepositoryScope;
  readonly currentRootRaw: string;
  readonly window: OwnerRepositoryWalletWindowVerifiedCandidate;
  readonly authority: "repository_admitted";
}

export interface OwnerRepositoryWalletHistoryAuditCursorV1 {
  readonly schemaVersion: "learning-v2-owner-wallet-history-audit-cursor.v1";
  readonly accountScopeHash: string;
  readonly currentRootFingerprint: string;
  readonly checkpointRootFingerprint: string;
  readonly checkpointFingerprint: string;
  readonly completedCheckpoints: number;
  readonly authority: "repository_fenced_in_process_cursor";
}

export interface OwnerRepositoryWalletHistoryAuditPageV1 {
  readonly done: boolean;
  readonly cursor: OwnerRepositoryWalletHistoryAuditCursorV1 | null;
  readonly checkpointRootFingerprint: string;
  readonly checkpointFingerprint: string;
  readonly completedCheckpoints: number;
  readonly auditedIndexKind: "operation" | "subject" | "receipt";
  readonly auditedNodes: number;
  readonly auditedEntries: number;
}

interface OwnerRepositoryWalletHistoryAuditState {
  readonly scope: OwnerRepositoryScope;
  readonly currentRootRaw: string;
  readonly currentRootFingerprint: string;
  readonly window: OwnerRepositoryWalletWindowVerifiedCandidate;
  readonly completedCheckpoints: number;
  readonly economicCursor: OwnerRepositoryEconomicClosureAuditCursorV1 | null;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
}

export type OwnerRepositoryAnySnapshot =
  | OwnerRepositorySnapshot
  | OwnerRepositorySnapshotV2
  | OwnerRepositorySnapshotV3;

interface OwnerRepositoryBlobEnvelopeV1 {
  readonly schemaVersion: "learning-v2-owner-repository-blob.v1";
  readonly accountScopeHash: string;
  readonly kind: OwnerRepositoryBlobKind;
  readonly payload: unknown;
}

const ROOT_MAX_BYTES = 64 * 1024;
const BLOB_MAX_BYTES = 512 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const ROOT_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "currentGeneration",
  "repositoryRevision",
  "journalSequence",
  "previousRootFingerprint",
  "journalHeadRef",
  "walletStateRef",
  "courseStateRefs",
  "operationIndexManifestRef",
  "subjectIndexManifestRef",
  "receiptIndexManifestRef",
  "rootFingerprint",
] as const;
const REF_KEYS = [
  "schemaVersion",
  "kind",
  "blobKey",
  "blobFingerprint",
] as const;
const COURSE_REF_KEYS = [
  "schemaVersion",
  "courseIdentityFingerprint",
  "stateRef",
] as const;
const BLOB_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "kind",
  "payload",
] as const;
const INDEX_KEYS = [
  "schemaVersion",
  "indexKind",
  "shardBits",
  "shards",
] as const;
const BLOB_KINDS = new Set<OwnerRepositoryBlobKind>([
  "wallet_state",
  "course_unlock_state",
  "operation_index_manifest",
  "subject_index_manifest",
  "receipt_index_manifest",
  "index_radix_node",
  "journal_record",
  "course_state_manifest",
]);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return value;
};
const sameCanonical = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const assertBoundedPlainJson = (input: unknown): void => {
  let nodes = 0;
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [
    { value: input, depth: 0 },
  ];
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 4_096 || current.depth > 32)
      throw new Error("owner_repository_indeterminate");
    if (typeof current.value !== "object" || current.value === null) continue;
    if (Array.isArray(current.value)) {
      if (current.value.length > 2_048)
        throw new Error("owner_repository_indeterminate");
      if (Object.getPrototypeOf(current.value) !== Array.prototype) {
        throw new Error("owner_repository_indeterminate");
      }
      const descriptors = Object.getOwnPropertyDescriptors(current.value);
      const keys = Reflect.ownKeys(descriptors);
      if (
        keys.some((key) => typeof key !== "string") ||
        keys.length !== current.value.length + 1 ||
        !Object.prototype.hasOwnProperty.call(descriptors, "length")
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      for (let index = 0; index < current.value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor))
          throw new Error("owner_repository_indeterminate");
        stack.push({ value: descriptor.value, depth: current.depth + 1 });
      }
      continue;
    }
    if (Object.getPrototypeOf(current.value) !== Object.prototype)
      throw new Error("owner_repository_indeterminate");
    const descriptors = Object.getOwnPropertyDescriptors(current.value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string") || keys.length > 2_048) {
      throw new Error("owner_repository_indeterminate");
    }
    for (const key of keys as string[]) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor))
        throw new Error("owner_repository_indeterminate");
      stack.push({ value: descriptor.value, depth: current.depth + 1 });
    }
  }
};
const checkedIncrement = (value: number): number => {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value === Number.MAX_SAFE_INTEGER
  ) {
    throw new Error("owner_repository_indeterminate");
  }
  return value + 1;
};

const parseScope = (input: unknown): OwnerRepositoryScope => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new Error("owner_repository_scope_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.length !== 2 ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        !["accountScopeHash", "generation"].includes(key),
    ) ||
    !("value" in descriptors.accountScopeHash) ||
    !("value" in descriptors.generation) ||
    typeof descriptors.accountScopeHash.value !== "string" ||
    !ACCOUNT.test(descriptors.accountScopeHash.value) ||
    !safe(descriptors.generation.value)
  ) {
    throw new Error("owner_repository_scope_invalid");
  }
  return deepFreeze({
    accountScopeHash: descriptors.accountScopeHash.value,
    generation: descriptors.generation.value,
  });
};

const parseActiveOwnerFence = (
  input: unknown,
): OwnerRepositoryActiveOwnerFence => {
  try {
    const parsed = parseScope(input);
    return deepFreeze({
      accountScopeHash: parsed.accountScopeHash,
      generation: parsed.generation,
    });
  } catch {
    throw new Error("owner_repository_indeterminate");
  }
};

export const ownerRepositoryRootKey = (accountScopeHash: string): string => {
  if (!ACCOUNT.test(accountScopeHash))
    throw new Error("owner_repository_scope_invalid");
  return `learning_v2_owner_repository:v1:${accountScopeHash}:root`;
};

export const ownerRepositoryRootHistoryKey = (
  accountScopeHash: string,
  rootFingerprint: string,
): string => {
  if (!ACCOUNT.test(accountScopeHash) || !HASH.test(rootFingerprint)) {
    throw new Error("owner_repository_scope_invalid");
  }
  return `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${rootFingerprint}`;
};

const blobKey = (accountScopeHash: string, fingerprint: string): string =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;

const parseBlobRef = (
  input: unknown,
  accountScopeHash: string,
): OwnerRepositoryBlobRefV1 => {
  if (
    !isRecord(input) ||
    !exactKeys(input, REF_KEYS) ||
    input.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    !BLOB_KINDS.has(input.kind as OwnerRepositoryBlobKind) ||
    typeof input.blobFingerprint !== "string" ||
    !HASH.test(input.blobFingerprint) ||
    input.blobKey !== blobKey(accountScopeHash, input.blobFingerprint)
  ) {
    throw new Error("owner_repository_indeterminate");
  }
  return deepFreeze(input as unknown as OwnerRepositoryBlobRefV1);
};

const finalizeRoot = (
  body: Omit<OwnerRepositoryRootV1, "rootFingerprint">,
): {
  readonly root: OwnerRepositoryRootV1;
  readonly encoded: string;
} => {
  const cleanBody = { ...body } as Record<string, unknown>;
  delete cleanBody.rootFingerprint;
  const root = deepFreeze({
    ...(cleanBody as unknown as Omit<OwnerRepositoryRootV1, "rootFingerprint">),
    rootFingerprint: sha256Utf8(canonicalJsonV1(cleanBody)),
  });
  const encoded = canonicalJsonV1(root);
  if (utf8ByteLengthV1(encoded) > ROOT_MAX_BYTES)
    throw new Error("owner_repository_root_overflow");
  return { root, encoded };
};

const parseRoot = (
  raw: unknown,
  expectedAccountScopeHash: string,
): OwnerRepositoryRootV1 => {
  let parsed: unknown;
  try {
    if (typeof raw !== "string" || utf8ByteLengthV1(raw) > ROOT_MAX_BYTES) {
      throw new Error("owner_repository_indeterminate");
    }
    parsed = JSON.parse(raw) as unknown;
    assertBoundedPlainJson(parsed);
    if (canonicalJsonV1(parsed) !== raw)
      throw new Error("owner_repository_indeterminate");
  } catch {
    throw new Error("owner_repository_indeterminate");
  }
  if (
    !isRecord(parsed) ||
    !exactKeys(parsed, ROOT_KEYS) ||
    parsed.schemaVersion !== "learning-v2-owner-repository-root.v1" ||
    parsed.accountScopeHash !== expectedAccountScopeHash ||
    !safe(parsed.currentGeneration) ||
    !safe(parsed.repositoryRevision) ||
    !safe(parsed.journalSequence) ||
    (parsed.previousRootFingerprint !== null &&
      (typeof parsed.previousRootFingerprint !== "string" ||
        !HASH.test(parsed.previousRootFingerprint))) ||
    typeof parsed.rootFingerprint !== "string" ||
    !HASH.test(parsed.rootFingerprint) ||
    !Array.isArray(parsed.courseStateRefs)
  ) {
    throw new Error("owner_repository_indeterminate");
  }
  if (
    (parsed.journalSequence === 0) !== (parsed.journalHeadRef === null) ||
    Number(parsed.journalSequence) > Number(parsed.repositoryRevision) ||
    (parsed.repositoryRevision === 0) !==
      (parsed.previousRootFingerprint === null)
  ) {
    throw new Error("owner_repository_indeterminate");
  }
  const walletStateRef = parseBlobRef(
    parsed.walletStateRef,
    expectedAccountScopeHash,
  );
  const operationIndexManifestRef = parseBlobRef(
    parsed.operationIndexManifestRef,
    expectedAccountScopeHash,
  );
  const subjectIndexManifestRef = parseBlobRef(
    parsed.subjectIndexManifestRef,
    expectedAccountScopeHash,
  );
  const receiptIndexManifestRef = parseBlobRef(
    parsed.receiptIndexManifestRef,
    expectedAccountScopeHash,
  );
  const journalHeadRef =
    parsed.journalHeadRef === null
      ? null
      : parseBlobRef(parsed.journalHeadRef, expectedAccountScopeHash);
  const courseStateRefs = parsed.courseStateRefs.map((entry) => {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, COURSE_REF_KEYS) ||
      entry.schemaVersion !== "learning-v2-owner-repository-course-ref.v1" ||
      typeof entry.courseIdentityFingerprint !== "string" ||
      !HASH.test(entry.courseIdentityFingerprint)
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const stateRef = parseBlobRef(entry.stateRef, expectedAccountScopeHash);
    if (stateRef.kind !== "course_unlock_state")
      throw new Error("owner_repository_indeterminate");
    return deepFreeze({
      schemaVersion: "learning-v2-owner-repository-course-ref.v1" as const,
      courseIdentityFingerprint: entry.courseIdentityFingerprint,
      stateRef,
    });
  });
  if (
    walletStateRef.kind !== "wallet_state" ||
    operationIndexManifestRef.kind !== "operation_index_manifest" ||
    subjectIndexManifestRef.kind !== "subject_index_manifest" ||
    receiptIndexManifestRef.kind !== "receipt_index_manifest" ||
    (journalHeadRef !== null && journalHeadRef.kind !== "journal_record") ||
    new Set(courseStateRefs.map((entry) => entry.courseIdentityFingerprint))
      .size !== courseStateRefs.length ||
    courseStateRefs.some(
      (entry, index) =>
        index > 0 &&
        courseStateRefs[index - 1].courseIdentityFingerprint >=
          entry.courseIdentityFingerprint,
    ) ||
    (parsed.journalSequence === 0 && courseStateRefs.length !== 0)
  ) {
    throw new Error("owner_repository_indeterminate");
  }
  const { rootFingerprint, ...body } = parsed;
  if (rootFingerprint !== sha256Utf8(canonicalJsonV1(body)))
    throw new Error("owner_repository_indeterminate");
  return deepFreeze({
    ...(body as unknown as Omit<OwnerRepositoryRootV1, "rootFingerprint">),
    walletStateRef,
    courseStateRefs,
    journalHeadRef,
    operationIndexManifestRef,
    subjectIndexManifestRef,
    receiptIndexManifestRef,
    rootFingerprint,
  });
};

const createIndexPayload = (kind: "operation" | "subject" | "receipt") =>
  deepFreeze({
    schemaVersion: "learning-v2-owner-repository-index-manifest.v1" as const,
    indexKind: kind,
    shardBits: 8,
    shards: [] as readonly unknown[],
  });

const createBlob = (
  accountScopeHash: string,
  kind: OwnerRepositoryBlobKind,
  payload: unknown,
): { readonly ref: OwnerRepositoryBlobRefV1; readonly encoded: string } => {
  try {
    assertBoundedPlainJson(payload);
  } catch {
    throw new Error("owner_repository_indeterminate");
  }
  const envelope: OwnerRepositoryBlobEnvelopeV1 = {
    schemaVersion: "learning-v2-owner-repository-blob.v1",
    accountScopeHash,
    kind,
    payload,
  };
  let encoded: string;
  try {
    encoded = canonicalJsonV1(envelope);
  } catch {
    throw new Error("owner_repository_indeterminate");
  }
  if (utf8ByteLengthV1(encoded) > BLOB_MAX_BYTES)
    throw new Error("owner_repository_blob_overflow");
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
      kind,
      blobKey: blobKey(accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
  });
};

const parseBlob = (
  raw: unknown,
  ref: OwnerRepositoryBlobRefV1,
  accountScopeHash: string,
): OwnerRepositoryBlobEnvelopeV1 => {
  let parsed: unknown;
  try {
    if (
      typeof raw !== "string" ||
      utf8ByteLengthV1(raw) > BLOB_MAX_BYTES ||
      sha256Utf8(raw) !== ref.blobFingerprint
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    parsed = JSON.parse(raw) as unknown;
    assertBoundedPlainJson(parsed);
    if (canonicalJsonV1(parsed) !== raw)
      throw new Error("owner_repository_indeterminate");
  } catch {
    throw new Error("owner_repository_indeterminate");
  }
  if (
    !isRecord(parsed) ||
    !exactKeys(parsed, BLOB_KEYS) ||
    parsed.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    parsed.accountScopeHash !== accountScopeHash ||
    parsed.kind !== ref.kind
  ) {
    throw new Error("owner_repository_indeterminate");
  }
  return deepFreeze(parsed as unknown as OwnerRepositoryBlobEnvelopeV1);
};

const validateEmptyIndexManifest = (
  payload: unknown,
  expectedKind: "operation" | "subject" | "receipt",
): void => {
  if (
    !isRecord(payload) ||
    !exactKeys(payload, INDEX_KEYS) ||
    payload.schemaVersion !==
      "learning-v2-owner-repository-index-manifest.v1" ||
    payload.indexKind !== expectedKind ||
    payload.shardBits !== 8 ||
    !Array.isArray(payload.shards) ||
    payload.shards.length !== 0
  ) {
    throw new Error("owner_repository_indeterminate");
  }
};

export const createOwnerRepository = (
  storage: OwnerRepositoryCasStorage,
  isCurrentGeneration: OwnerRepositoryGenerationGuard,
  options: OwnerRepositoryOptions = {},
): {
  initialize(scope: OwnerRepositoryScope): Promise<OwnerRepositoryAnySnapshot>;
  load(
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositoryAnySnapshot | undefined>;
  ensureV2(scope: OwnerRepositoryScope): Promise<OwnerRepositorySnapshotV2>;
  loadV2(
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV2 | undefined>;
  commitWalletCredit(
    scope: OwnerRepositoryScope,
    candidate: unknown,
  ): Promise<OwnerRepositoryWalletCreditCommitResult>;
  commitWalletCreditV3(
    scope: OwnerRepositoryScope,
    candidate: unknown,
  ): Promise<OwnerRepositoryWalletCreditCommitResult>;
  commitCourseUnlock(
    scope: OwnerRepositoryScope,
    candidate: unknown,
  ): Promise<OwnerRepositoryCourseUnlockCommitResult>;
  loadV3(
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV3 | undefined>;
  advanceV3Generation(
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV3>;
  admitWalletWindow(
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositoryAdmittedWalletWindow>;
  isWalletWindowAdmitted(
    value: unknown,
  ): value is OwnerRepositoryAdmittedWalletWindow;
  auditWalletHistoryPage(
    scope: OwnerRepositoryScope,
    cursor: OwnerRepositoryWalletHistoryAuditCursorV1 | null,
  ): Promise<OwnerRepositoryWalletHistoryAuditPageV1>;
  isWalletHistoryAuditCursor(
    value: unknown,
  ): value is OwnerRepositoryWalletHistoryAuditCursorV1;
} => {
  if (
    !isRecord(options) ||
    Object.getPrototypeOf(options) !== Object.prototype
  ) {
    throw new Error("owner_repository_options_invalid");
  }
  const optionDescriptors = Object.getOwnPropertyDescriptors(options);
  const optionKeys = Reflect.ownKeys(optionDescriptors);
  if (
    optionKeys.some((key) =>
      key !== "materializeWalletCredit" && key !== "materializeCourseUnlock") ||
    ["materializeWalletCredit", "materializeCourseUnlock"].some((key) =>
      Object.prototype.hasOwnProperty.call(optionDescriptors, key) &&
      (!Object.prototype.hasOwnProperty.call(optionDescriptors[key], "value") ||
        !optionDescriptors[key].enumerable))
  ) {
    throw new Error("owner_repository_options_invalid");
  }
  const hasWalletCreditMaterializer = Object.prototype.hasOwnProperty.call(
    optionDescriptors,
    "materializeWalletCredit",
  );
  const materializeWalletCredit = hasWalletCreditMaterializer
    ? optionDescriptors.materializeWalletCredit.value
    : undefined;
  if (
    hasWalletCreditMaterializer &&
    typeof materializeWalletCredit !== "function"
  ) {
    throw new Error("owner_repository_options_invalid");
  }
  const hasCourseUnlockMaterializer = Object.prototype.hasOwnProperty.call(
    optionDescriptors,
    "materializeCourseUnlock",
  );
  const materializeCourseUnlock = hasCourseUnlockMaterializer
    ? optionDescriptors.materializeCourseUnlock.value
    : undefined;
  if (
    hasCourseUnlockMaterializer &&
    typeof materializeCourseUnlock !== "function"
  ) {
    throw new Error("owner_repository_options_invalid");
  }
  const admittedWalletWindows = new WeakSet<object>();
  const walletHistoryAuditCursors = new WeakSet<object>();
  const walletHistoryAuditStates = new WeakMap<
    object,
    OwnerRepositoryWalletHistoryAuditState
  >();
  const assertCurrentLocal = (scope: OwnerRepositoryScope): void => {
    if (!isCurrentGeneration(scope))
      throw new Error("owner_repository_generation_stale");
  };
  const assertCurrentFence = async (
    scope: OwnerRepositoryScope,
  ): Promise<void> => {
    assertCurrentLocal(scope);
    let durableFence: OwnerRepositoryActiveOwnerFence | null;
    try {
      durableFence = await storage.getCurrentOwnerFence();
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    assertCurrentLocal(scope);
    if (durableFence === null)
      throw new Error("owner_repository_generation_stale");
    const stableFence = parseActiveOwnerFence(durableFence);
    if (
      stableFence.accountScopeHash !== scope.accountScopeHash ||
      stableFence.generation !== scope.generation
    ) {
      throw new Error("owner_repository_generation_stale");
    }
  };
  const get = async (
    key: string,
    scope: OwnerRepositoryScope,
  ): Promise<string | null> => {
    await assertCurrentFence(scope);
    let value: string | null;
    try {
      value = await storage.getItem(key);
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    await assertCurrentFence(scope);
    return value;
  };
  const putImmutable = async (
    scope: OwnerRepositoryScope,
    blob: { readonly ref: OwnerRepositoryBlobRefV1; readonly encoded: string },
  ): Promise<void> => {
    const existing = await get(blob.ref.blobKey, scope);
    if (existing !== blob.encoded) {
      // The key is content-addressed, so only these exact canonical bytes are valid at it.
      // Rewriting a truncated pre-commit orphan is safe and makes interrupted writes retryable.
      try {
        await storage.setItem(blob.ref.blobKey, blob.encoded);
      } catch {
        throw new Error("owner_repository_write_failed");
      }
      await assertCurrentFence(scope);
    }
    const verified = await get(blob.ref.blobKey, scope);
    if (verified !== blob.encoded)
      throw new Error("owner_repository_write_failed");
  };
  const putImmutableRootHistory = async (
    scope: OwnerRepositoryScope,
    rootFingerprint: string,
    encoded: string,
  ): Promise<void> => {
    let parsedFingerprint: string;
    try {
      const decoded = JSON.parse(encoded) as {
        readonly schemaVersion?: unknown;
      };
      if (decoded.schemaVersion === "learning-v2-owner-repository-root.v3") {
        const { parseOwnerRepositoryRootV3Raw } =
          await import("./owner_repository_root_v3");
        parsedFingerprint = parseOwnerRepositoryRootV3Raw(
          encoded,
          scope.accountScopeHash,
        ).root.rootFingerprint;
      } else if (
        decoded.schemaVersion === "learning-v2-owner-repository-root.v2"
      ) {
        parsedFingerprint = parseOwnerRepositoryRootV2Raw(
          encoded,
          scope.accountScopeHash,
        ).root.rootFingerprint;
      } else {
        parsedFingerprint = parseRoot(
          encoded,
          scope.accountScopeHash,
        ).rootFingerprint;
      }
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    if (parsedFingerprint !== rootFingerprint)
      throw new Error("owner_repository_indeterminate");
    const key = ownerRepositoryRootHistoryKey(
      scope.accountScopeHash,
      rootFingerprint,
    );
    const existing = await get(key, scope);
    if (existing !== encoded) {
      try {
        await storage.setItem(key, encoded);
      } catch {
        throw new Error("owner_repository_write_failed");
      }
      await assertCurrentFence(scope);
    }
    if ((await get(key, scope)) !== encoded)
      throw new Error("owner_repository_write_failed");
  };
  const putImmutableSideRecord = async (
    scope: OwnerRepositoryScope,
    key: string,
    encoded: string,
  ): Promise<void> => {
    const existing = await get(key, scope);
    if (existing !== null && existing !== encoded) {
      throw new Error("owner_repository_indeterminate");
    }
    if (existing === null) {
      try {
        await storage.setItem(key, encoded);
      } catch {
        throw new Error("owner_repository_write_failed");
      }
      await assertCurrentFence(scope);
    }
    if ((await get(key, scope)) !== encoded) {
      throw new Error("owner_repository_write_failed");
    }
  };
  const loadFromRaw = async (
    scope: OwnerRepositoryScope,
    raw: string,
    requireCurrentRootGeneration: boolean,
  ): Promise<OwnerRepositorySnapshot> => {
    const root = parseRoot(raw, scope.accountScopeHash);
    if (
      requireCurrentRootGeneration &&
      root.currentGeneration !== scope.generation
    ) {
      throw new Error("owner_repository_generation_stale");
    }
    // P2.2a is intentionally genesis-only. P2.2b adds the exact journal/index trie schemas.
    if (root.journalSequence !== 0)
      throw new Error("owner_repository_indeterminate");
    const walletRaw = await get(root.walletStateRef.blobKey, scope);
    const operationRaw = await get(
      root.operationIndexManifestRef.blobKey,
      scope,
    );
    const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, scope);
    const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, scope);
    if (
      walletRaw === null ||
      operationRaw === null ||
      subjectRaw === null ||
      receiptRaw === null
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const walletBlob = parseBlob(
      walletRaw,
      root.walletStateRef,
      scope.accountScopeHash,
    );
    const operationBlob = parseBlob(
      operationRaw,
      root.operationIndexManifestRef,
      scope.accountScopeHash,
    );
    const subjectBlob = parseBlob(
      subjectRaw,
      root.subjectIndexManifestRef,
      scope.accountScopeHash,
    );
    const receiptBlob = parseBlob(
      receiptRaw,
      root.receiptIndexManifestRef,
      scope.accountScopeHash,
    );
    let walletState: WalletStateV1;
    try {
      walletState = parseWalletState(walletBlob.payload);
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    if (walletState.accountScopeHash !== scope.accountScopeHash)
      throw new Error("owner_repository_indeterminate");
    validateEmptyIndexManifest(operationBlob.payload, "operation");
    validateEmptyIndexManifest(subjectBlob.payload, "subject");
    validateEmptyIndexManifest(receiptBlob.payload, "receipt");
    const courseUnlockStates: CourseUnlockStateV1[] = [];
    for (const courseRef of root.courseStateRefs) {
      const courseRaw = await get(courseRef.stateRef.blobKey, scope);
      if (courseRaw === null) throw new Error("owner_repository_indeterminate");
      const courseBlob = parseBlob(
        courseRaw,
        courseRef.stateRef,
        scope.accountScopeHash,
      );
      let courseState: CourseUnlockStateV1;
      try {
        courseState = parseCourseUnlockState(courseBlob.payload);
      } catch {
        throw new Error("owner_repository_indeterminate");
      }
      if (
        courseState.accountScopeHash !== scope.accountScopeHash ||
        courseState.courseIdentityFingerprint !==
          courseRef.courseIdentityFingerprint
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      courseUnlockStates.push(courseState);
    }
    if (root.journalHeadRef !== null) {
      const journalRaw = await get(root.journalHeadRef.blobKey, scope);
      if (journalRaw === null)
        throw new Error("owner_repository_indeterminate");
      parseBlob(journalRaw, root.journalHeadRef, scope.accountScopeHash);
    }
    if (root.journalSequence === 0) {
      const genesisWallet = createWalletState({
        accountScopeHash: scope.accountScopeHash,
      });
      if (
        canonicalJsonV1(walletState) !== canonicalJsonV1(genesisWallet) ||
        courseUnlockStates.length !== 0
      ) {
        throw new Error("owner_repository_indeterminate");
      }
    }
    await assertCurrentFence(scope);
    return deepFreeze({ root, walletState, courseUnlockStates });
  };
  const loadV2FromRaw = async (
    scope: OwnerRepositoryScope,
    raw: string,
    requireCurrentRootGeneration: boolean,
  ): Promise<OwnerRepositorySnapshotV2> => {
    let root: OwnerRepositoryRootV2;
    try {
      root = parseOwnerRepositoryRootV2Raw(raw, scope.accountScopeHash).root;
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    if (
      requireCurrentRootGeneration &&
      root.currentGeneration !== scope.generation
    ) {
      throw new Error("owner_repository_generation_stale");
    }
    // This bounded packet supports genesis plus exactly one canonical wallet-credit effect.
    if (root.journalSequence > 1) {
      throw new Error("owner_repository_history_upgrade_required");
    }
    const walletRaw = await get(root.walletStateRef.blobKey, scope);
    const operationRaw = await get(
      root.operationIndexManifestRef.blobKey,
      scope,
    );
    const subjectRaw = await get(root.subjectIndexManifestRef.blobKey, scope);
    const receiptRaw = await get(root.receiptIndexManifestRef.blobKey, scope);
    const courseManifestRaw = await get(
      root.courseStateManifestRef.blobKey,
      scope,
    );
    if (
      walletRaw === null ||
      operationRaw === null ||
      subjectRaw === null ||
      receiptRaw === null ||
      courseManifestRaw === null
    )
      throw new Error("owner_repository_indeterminate");
    const resolveNode = async (ref: OwnerRepositoryBlobRefV1) =>
      get(ref.blobKey, scope);
    let walletState: WalletStateV1;
    let operationManifest: ParsedOwnerRepositoryEconomicManifest<"operation">;
    let subjectManifest: ParsedOwnerRepositoryEconomicManifest<"subject">;
    let receiptManifest: ParsedOwnerRepositoryEconomicManifest<"receipt">;
    let courseStateManifest: OwnerRepositoryCourseStateManifestV1;
    try {
      walletState = parseOwnerRepositoryWalletStateBlob({
        accountScopeHash: scope.accountScopeHash,
        ref: root.walletStateRef,
        raw: walletRaw,
      }).state;
      operationManifest = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash: scope.accountScopeHash,
        indexKind: "operation",
        ref: root.operationIndexManifestRef,
        raw: operationRaw,
        resolveNode,
      });
      subjectManifest = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash: scope.accountScopeHash,
        indexKind: "subject",
        ref: root.subjectIndexManifestRef,
        raw: subjectRaw,
        resolveNode,
      });
      receiptManifest = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash: scope.accountScopeHash,
        indexKind: "receipt",
        ref: root.receiptIndexManifestRef,
        raw: receiptRaw,
        resolveNode,
      });
      courseStateManifest = (
        await parseOwnerRepositoryCourseManifestBlob({
          accountScopeHash: scope.accountScopeHash,
          ref: root.courseStateManifestRef,
          raw: courseManifestRaw,
          resolveNode,
        })
      ).manifest;
    } catch {
      await assertCurrentFence(scope);
      throw new Error("owner_repository_indeterminate");
    }
    if (
      courseStateManifest.entryCount !== 0 ||
      courseStateManifest.rootNodeRef !== null
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const genesisWallet = createWalletState({
      accountScopeHash: scope.accountScopeHash,
    });
    if (root.journalSequence === 0) {
      if (
        root.journalHeadRef !== null ||
        !sameCanonical(walletState, genesisWallet) ||
        operationManifest.manifest.entryCount !== 0 ||
        operationManifest.manifest.rootNodeRef !== null ||
        subjectManifest.manifest.entryCount !== 0 ||
        subjectManifest.manifest.rootNodeRef !== null ||
        receiptManifest.manifest.entryCount !== 0 ||
        receiptManifest.manifest.rootNodeRef !== null
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      await assertCurrentFence(scope);
      return deepFreeze({ root, walletState, courseStateManifest });
    }

    if (
      root.journalHeadRef === null ||
      operationManifest.manifest.entryCount !== 2 ||
      subjectManifest.manifest.entryCount !== 1 ||
      receiptManifest.manifest.entryCount !== 1
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const journalRaw = await get(root.journalHeadRef.blobKey, scope);
    if (journalRaw === null) throw new Error("owner_repository_indeterminate");
    let journal: ReturnType<typeof parseOwnerRepositoryJournalRecordBlob>;
    try {
      journal = parseOwnerRepositoryJournalRecordBlob({
        accountScopeHash: scope.accountScopeHash,
        ref: root.journalHeadRef,
        raw: journalRaw,
      });
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    if (journal.record.recordKind !== "wallet_credit") {
      throw new Error("owner_repository_indeterminate");
    }
    const record = journal.record;
    if (
      record.accountScopeHash !== scope.accountScopeHash ||
      record.acceptedAccountGeneration !== root.currentGeneration ||
      record.journalSequence !== 1 ||
      record.previousJournalRecordRef !== null ||
      root.repositoryRevision !== record.repositoryRevisionBefore + 1 ||
      root.previousRootFingerprint !== record.rootBeforeFingerprint ||
      !sameCanonical(record.walletStateAfterRef, root.walletStateRef) ||
      !sameCanonical(
        record.operationIndexManifestAfterRef,
        root.operationIndexManifestRef,
      ) ||
      !sameCanonical(
        record.subjectIndexManifestAfterRef,
        root.subjectIndexManifestRef,
      ) ||
      !sameCanonical(
        record.receiptIndexManifestAfterRef,
        root.receiptIndexManifestRef,
      )
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const parentRootRaw = await get(
      ownerRepositoryRootHistoryKey(
        scope.accountScopeHash,
        record.rootBeforeFingerprint,
      ),
      scope,
    );
    if (parentRootRaw === null)
      throw new Error("owner_repository_indeterminate");
    let parentRoot: OwnerRepositoryRootV2;
    try {
      parentRoot = parseOwnerRepositoryRootV2Raw(
        parentRootRaw,
        scope.accountScopeHash,
      ).root;
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    if (
      parentRoot.rootFingerprint !== record.rootBeforeFingerprint ||
      parentRoot.currentGeneration !== record.acceptedAccountGeneration ||
      parentRoot.repositoryRevision !== record.repositoryRevisionBefore ||
      parentRoot.journalSequence !== 0 ||
      parentRoot.journalHeadRef !== null ||
      !sameCanonical(parentRoot.walletStateRef, record.walletStateBeforeRef) ||
      !sameCanonical(
        parentRoot.courseStateManifestRef,
        root.courseStateManifestRef,
      ) ||
      !sameCanonical(
        parentRoot.operationIndexManifestRef,
        record.operationIndexManifestBeforeRef,
      ) ||
      !sameCanonical(
        parentRoot.subjectIndexManifestRef,
        record.subjectIndexManifestBeforeRef,
      ) ||
      !sameCanonical(
        parentRoot.receiptIndexManifestRef,
        record.receiptIndexManifestBeforeRef,
      )
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const walletBeforeRaw = await get(
      record.walletStateBeforeRef.blobKey,
      scope,
    );
    const operationBeforeRaw = await get(
      record.operationIndexManifestBeforeRef.blobKey,
      scope,
    );
    const subjectBeforeRaw = await get(
      record.subjectIndexManifestBeforeRef.blobKey,
      scope,
    );
    const receiptBeforeRaw = await get(
      record.receiptIndexManifestBeforeRef.blobKey,
      scope,
    );
    if (
      walletBeforeRaw === null ||
      operationBeforeRaw === null ||
      subjectBeforeRaw === null ||
      receiptBeforeRaw === null
    )
      throw new Error("owner_repository_indeterminate");
    try {
      const walletBefore = parseOwnerRepositoryWalletStateBlob({
        accountScopeHash: scope.accountScopeHash,
        ref: record.walletStateBeforeRef,
        raw: walletBeforeRaw,
      }).state;
      const operationBefore = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash: scope.accountScopeHash,
        indexKind: "operation",
        ref: record.operationIndexManifestBeforeRef,
        raw: operationBeforeRaw,
        resolveNode,
      });
      const subjectBefore = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash: scope.accountScopeHash,
        indexKind: "subject",
        ref: record.subjectIndexManifestBeforeRef,
        raw: subjectBeforeRaw,
        resolveNode,
      });
      const receiptBefore = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash: scope.accountScopeHash,
        indexKind: "receipt",
        ref: record.receiptIndexManifestBeforeRef,
        raw: receiptBeforeRaw,
        resolveNode,
      });
      if (
        !sameCanonical(walletBefore, genesisWallet) ||
        operationBefore.manifest.entryCount !== 0 ||
        operationBefore.manifest.rootNodeRef !== null ||
        subjectBefore.manifest.entryCount !== 0 ||
        subjectBefore.manifest.rootNodeRef !== null ||
        receiptBefore.manifest.entryCount !== 0 ||
        receiptBefore.manifest.rootNodeRef !== null
      )
        throw new Error("before_projection_invalid");
      const rebuilt = rebuildWalletStateFromAppliedReceipts({
        startingState: walletBefore,
        canonicalAppliedReceipts: [record.appliedReceipt],
      });
      if (!sameCanonical(rebuilt, walletState))
        throw new Error("wallet_projection_invalid");
      await assertOwnerRepositoryEconomicClosureForReceipt({
        accountScopeHash: scope.accountScopeHash,
        operationManifest: operationManifest.manifest,
        subjectManifest: subjectManifest.manifest,
        receiptManifest: receiptManifest.manifest,
        appliedReceipt: record.appliedReceipt,
        resolveNode,
      });
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    await assertCurrentFence(scope);
    return deepFreeze({ root, walletState, courseStateManifest });
  };
  const commitRoot = async (
    scope: OwnerRepositoryScope,
    expectedRaw: string | null,
    nextRaw: string,
  ): Promise<boolean> => {
    await assertCurrentFence(scope);
    let result: "committed" | "conflict" | "stale_generation";
    try {
      result = await storage.compareAndSet(
        ownerRepositoryRootKey(scope.accountScopeHash),
        expectedRaw,
        nextRaw,
        {
          accountScopeHash: scope.accountScopeHash,
          generation: scope.generation,
        },
      );
    } catch {
      let observed: string | null;
      try {
        observed = await storage.getItem(
          ownerRepositoryRootKey(scope.accountScopeHash),
        );
      } catch {
        throw new Error("owner_repository_commit_indeterminate");
      }
      if (observed === nextRaw) return true;
      throw new Error("owner_repository_commit_indeterminate");
    }
    if (
      result !== "committed" &&
      result !== "conflict" &&
      result !== "stale_generation"
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    if (result === "stale_generation")
      throw new Error("owner_repository_generation_stale");
    if (result === "conflict") return false;
    let durableRoot: string | null;
    try {
      durableRoot = await storage.getItem(
        ownerRepositoryRootKey(scope.accountScopeHash),
      );
    } catch {
      throw new Error("owner_repository_commit_indeterminate");
    }
    if (durableRoot !== nextRaw)
      throw new Error("owner_repository_commit_indeterminate");
    return true;
  };
  const load = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositoryAnySnapshot | undefined> => {
    const stableScope = parseScope(scope);
    await assertCurrentFence(stableScope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    const raw = await get(rootKey, stableScope);
    if (raw === null) return undefined;
    try {
      const { parseOwnerRepositoryRootV3Raw } =
        await import("./owner_repository_root_v3");
      parseOwnerRepositoryRootV3Raw(raw, stableScope.accountScopeHash);
      return loadV3(stableScope);
    } catch (e) {
      // Continue with the byte-compatible V2/V1 dispatch.
      console.warn('[silent-catch] owner_repository:raw', e instanceof Error ? e.message : String(e));
    }
    let isV2 = false;
    try {
      parseOwnerRepositoryRootV2Raw(raw, stableScope.accountScopeHash);
      isV2 = true;
    } catch {
      isV2 = false;
    }
    if (isV2) {
      const snapshot = await loadV2FromRaw(stableScope, raw, true);
      if ((await get(rootKey, stableScope)) !== raw)
        throw new Error("owner_repository_cas_conflict");
      return snapshot;
    }
    return loadFromRaw(stableScope, raw, true);
  };
  const loadV2 = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV2 | undefined> => {
    const stableScope = parseScope(scope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const raw = await get(rootKey, stableScope);
      if (raw === null) return undefined;
      let snapshot: OwnerRepositorySnapshotV2;
      try {
        snapshot = await loadV2FromRaw(stableScope, raw, true);
      } catch (error) {
        try {
          parseRoot(raw, stableScope.accountScopeHash);
          throw new Error("owner_repository_v2_migration_required");
        } catch (v1Error) {
          if (
            v1Error instanceof Error &&
            v1Error.message === "owner_repository_v2_migration_required"
          ) {
            throw v1Error;
          }
          throw error;
        }
      }
      if ((await get(rootKey, stableScope)) === raw) return snapshot;
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const ensureV2 = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV2> => {
    const stableScope = parseScope(scope);
    await assertCurrentFence(stableScope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        const wallet = createBlob(
          stableScope.accountScopeHash,
          "wallet_state",
          createWalletState({
            accountScopeHash: stableScope.accountScopeHash,
          }),
        );
        const operation = createBlob(
          stableScope.accountScopeHash,
          "operation_index_manifest",
          createIndexPayload("operation"),
        );
        const subject = createBlob(
          stableScope.accountScopeHash,
          "subject_index_manifest",
          createIndexPayload("subject"),
        );
        const receipt = createBlob(
          stableScope.accountScopeHash,
          "receipt_index_manifest",
          createIndexPayload("receipt"),
        );
        const course = await createEmptyOwnerRepositoryCourseManifest(
          stableScope.accountScopeHash,
        );
        await putImmutable(stableScope, wallet);
        await putImmutable(stableScope, operation);
        await putImmutable(stableScope, subject);
        await putImmutable(stableScope, receipt);
        for (const nodeBlob of course.immutableNodeBlobs)
          await putImmutable(stableScope, nodeBlob);
        await putImmutable(stableScope, course.manifestBlob);
        const next = createGenesisOwnerRepositoryRootV2({
          accountScopeHash: stableScope.accountScopeHash,
          currentGeneration: stableScope.generation,
          walletStateRef: wallet.ref,
          courseStateManifestRef: course.manifestBlob.ref,
          operationIndexManifestRef: operation.ref,
          subjectIndexManifestRef: subject.ref,
          receiptIndexManifestRef: receipt.ref,
        });
        await commitRoot(stableScope, null, next.encoded);
        continue;
      }

      let parsedV2: OwnerRepositoryRootV2 | undefined;
      try {
        parsedV2 = parseOwnerRepositoryRootV2Raw(
          currentRaw,
          stableScope.accountScopeHash,
        ).root;
      } catch {
        parsedV2 = undefined;
      }
      if (parsedV2) {
        if (stableScope.generation < parsedV2.currentGeneration) {
          throw new Error("owner_repository_generation_stale");
        }
        if (
          parsedV2.currentGeneration !== stableScope.generation &&
          parsedV2.journalSequence !== 0
        ) {
          throw new Error("owner_repository_history_upgrade_required");
        }
        const snapshot = await loadV2FromRaw(stableScope, currentRaw, false);
        if (parsedV2.currentGeneration === stableScope.generation) {
          if ((await get(rootKey, stableScope)) === currentRaw) return snapshot;
          continue;
        }
        const next = advanceOwnerRepositoryRootV2Generation({
          root: parsedV2,
          targetGeneration: stableScope.generation,
        });
        await putImmutableRootHistory(
          stableScope,
          parsedV2.rootFingerprint,
          currentRaw,
        );
        await commitRoot(stableScope, currentRaw, next.encoded);
        continue;
      }

      let currentV1: OwnerRepositoryRootV1;
      try {
        currentV1 = parseRoot(currentRaw, stableScope.accountScopeHash);
      } catch {
        throw new Error("owner_repository_indeterminate");
      }
      if (stableScope.generation < currentV1.currentGeneration) {
        throw new Error("owner_repository_generation_stale");
      }
      await loadFromRaw(stableScope, currentRaw, false);
      const isExactGenesis =
        currentV1.repositoryRevision === 0 &&
        currentV1.previousRootFingerprint === null &&
        currentV1.journalSequence === 0 &&
        currentV1.journalHeadRef === null &&
        currentV1.courseStateRefs.length === 0;
      if (!isExactGenesis)
        throw new Error("owner_repository_v2_migration_required");
      const course = await createEmptyOwnerRepositoryCourseManifest(
        stableScope.accountScopeHash,
      );
      for (const nodeBlob of course.immutableNodeBlobs)
        await putImmutable(stableScope, nodeBlob);
      await putImmutable(stableScope, course.manifestBlob);
      const next = await migrateVerifiedGenesisOwnerRepositoryRootV1({
        rootV1: currentV1,
        targetGeneration: stableScope.generation,
        emptyCourseStateManifestBlob: course.manifestBlob,
        resolveCourseNode: async (ref) => get(ref.blobKey, stableScope),
      });
      await putImmutableRootHistory(
        stableScope,
        currentV1.rootFingerprint,
        currentRaw,
      );
      await commitRoot(stableScope, currentRaw, next.encoded);
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const commitWalletCredit = async (
    scope: OwnerRepositoryScope,
    candidate: unknown,
  ): Promise<OwnerRepositoryWalletCreditCommitResult> => {
    if (typeof materializeWalletCredit !== "function") {
      throw new Error("owner_repository_wallet_credit_authorizer_required");
    }
    const stableScope = parseScope(scope);
    let detachedCandidate: unknown;
    try {
      detachedCandidate = detachBoundedWalletJson(
        candidate,
        "owner_repository_wallet_credit_candidate_invalid",
      );
    } catch {
      throw new Error("owner_repository_wallet_credit_candidate_invalid");
    }
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    let authorizedOperation: unknown;
    let authorized = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        await ensureV2(stableScope);
        continue;
      }
      const snapshot = await loadV2FromRaw(stableScope, currentRaw, true);
      if ((await get(rootKey, stableScope)) !== currentRaw) continue;
      if (!authorized) {
        let canonicalAppliedReceipt: WalletAppliedReceiptV1 | null = null;
        if (
          snapshot.root.journalSequence === 1 &&
          snapshot.root.journalHeadRef !== null
        ) {
          const journalRaw = await get(
            snapshot.root.journalHeadRef.blobKey,
            stableScope,
          );
          if (journalRaw === null)
            throw new Error("owner_repository_indeterminate");
          try {
            const parsed = parseOwnerRepositoryJournalRecordBlob({
              accountScopeHash: stableScope.accountScopeHash,
              ref: snapshot.root.journalHeadRef,
              raw: journalRaw,
            });
            if (parsed.record.recordKind !== "wallet_credit") {
              throw new Error("record_kind_invalid");
            }
            canonicalAppliedReceipt = parsed.record.appliedReceipt;
          } catch {
            throw new Error("owner_repository_indeterminate");
          }
        }
        try {
          const materialized = await materializeWalletCredit({
            scope: stableScope,
            walletState: snapshot.walletState,
            canonicalAppliedReceipt,
            candidate: detachedCandidate,
          });
          // Close the authority TOCTOU window before any subsequent await.
          authorizedOperation = createWalletAuthorizedOperation(materialized);
        } catch {
          throw new Error(
            "owner_repository_wallet_credit_authorization_failed",
          );
        }
        await assertCurrentFence(stableScope);
        authorized = true;
      }
      const walletRaw = await get(
        snapshot.root.walletStateRef.blobKey,
        stableScope,
      );
      const operationRaw = await get(
        snapshot.root.operationIndexManifestRef.blobKey,
        stableScope,
      );
      const subjectRaw = await get(
        snapshot.root.subjectIndexManifestRef.blobKey,
        stableScope,
      );
      const receiptRaw = await get(
        snapshot.root.receiptIndexManifestRef.blobKey,
        stableScope,
      );
      if (
        walletRaw === null ||
        operationRaw === null ||
        subjectRaw === null ||
        receiptRaw === null
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      const plan = await planOwnerRepositoryWalletCredit({
        rootBefore: snapshot.root,
        walletStateBeforeBlob: {
          ref: snapshot.root.walletStateRef,
          encoded: walletRaw,
        },
        operationManifestBlob: {
          ref: snapshot.root.operationIndexManifestRef,
          encoded: operationRaw,
        },
        subjectManifestBlob: {
          ref: snapshot.root.subjectIndexManifestRef,
          encoded: subjectRaw,
        },
        receiptManifestBlob: {
          ref: snapshot.root.receiptIndexManifestRef,
          encoded: receiptRaw,
        },
        authorizedOperation,
        resolveNode: (async (ref) =>
          get(ref.blobKey, stableScope)) as OwnerRepositoryRadixNodeResolver,
      });
      if (plan.status !== "applied") {
        if ((await get(rootKey, stableScope)) !== currentRaw) continue;
        return deepFreeze({
          status: plan.status,
          appliedReceipt: plan.appliedReceipt,
          snapshot,
        });
      }
      if (snapshot.root.journalSequence !== 0) {
        throw new Error("owner_repository_history_upgrade_required");
      }
      await putImmutableRootHistory(
        stableScope,
        snapshot.root.rootFingerprint,
        currentRaw,
      );
      for (const blob of plan.immutableBlobs)
        await putImmutable(stableScope, blob);
      const committed = await commitRoot(
        stableScope,
        currentRaw,
        plan.successorRoot.encoded,
      );
      if (!committed) continue;
      const committedSnapshot = await loadV2FromRaw(
        stableScope,
        plan.successorRoot.encoded,
        true,
      );
      if ((await get(rootKey, stableScope)) !== plan.successorRoot.encoded)
        continue;
      return deepFreeze({
        status: "applied" as const,
        appliedReceipt: plan.appliedReceipt,
        snapshot: committedSnapshot,
      });
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const admitWalletWindowAtFence = async (
    scope: OwnerRepositoryScope,
    requireExactRootGeneration: boolean,
  ): Promise<OwnerRepositoryAdmittedWalletWindow> => {
    const stableScope = parseScope(scope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    const currentRaw = await get(rootKey, stableScope);
    if (currentRaw === null) throw new Error("owner_repository_indeterminate");
    let window: OwnerRepositoryWalletWindowVerifiedCandidate;
    try {
      // Keep the legacy repository module lightweight and free of a static
      // RootV3/checkpoint initialization chain. Admission is an explicit,
      // asynchronous operation, so its verifier is loaded only on demand.
      const { verifyOwnerRepositoryWalletWindow } =
        await import("./owner_repository_wallet_window");
      window = await verifyOwnerRepositoryWalletWindow({
        accountScopeHash: stableScope.accountScopeHash,
        currentRootRaw: currentRaw,
        resolveRaw: (key: string) => get(key, stableScope),
        resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
          get(ref.blobKey, stableScope),
      });
    } catch (error) {
      // Restore the operational taxonomy if a nested parser normalized an owner switch.
      await assertCurrentFence(stableScope);
      if (
        error instanceof Error &&
        error.message === "owner_repository_generation_stale"
      ) {
        throw error;
      }
      if (error instanceof Error && error.message.includes("budget")) {
        throw new Error("owner_repository_window_budget_exceeded");
      }
      throw new Error("owner_repository_indeterminate");
    }
    const { isOwnerRepositoryWalletWindowVerifiedCandidate } =
      await import("./owner_repository_wallet_window");
    if (
      !isOwnerRepositoryWalletWindowVerifiedCandidate(window) ||
      window.currentRoot.root.currentGeneration > stableScope.generation ||
      (requireExactRootGeneration &&
        window.currentRoot.root.currentGeneration !== stableScope.generation)
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    if ((await get(rootKey, stableScope)) !== currentRaw) {
      throw new Error("owner_repository_cas_conflict");
    }
    await assertCurrentFence(stableScope);
    const admitted = deepFreeze({
      scope: stableScope,
      currentRootRaw: currentRaw,
      window,
      authority: "repository_admitted" as const,
    });
    admittedWalletWindows.add(admitted);
    return admitted;
  };
  const admitWalletWindow = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositoryAdmittedWalletWindow> =>
    admitWalletWindowAtFence(scope, true);
  const isWalletWindowAdmitted = (
    value: unknown,
  ): value is OwnerRepositoryAdmittedWalletWindow =>
    isRecord(value) && admittedWalletWindows.has(value);
  const checkpointIdentity = (
    window: OwnerRepositoryWalletWindowVerifiedCandidate,
  ): Readonly<{
    rootFingerprint: string;
    checkpointFingerprint: string;
    schemaVersion:
      | "learning-v2-owner-repository-wallet-checkpoint.v1"
      | "learning-v2-owner-repository-wallet-checkpoint.v2"
      | "learning-v2-owner-repository-economic-checkpoint.v3";
    previousCheckpointRootFingerprint: string | null;
  }> => {
    const checkpoint = window.anchorCheckpoint.checkpoint;
    return {
      rootFingerprint: checkpoint.checkpointRootFingerprint,
      checkpointFingerprint: checkpoint.checkpointFingerprint,
      schemaVersion: checkpoint.schemaVersion,
      previousCheckpointRootFingerprint:
        checkpoint.schemaVersion ===
        "learning-v2-owner-repository-wallet-checkpoint.v1"
          ? checkpoint.previousCheckpointRootFingerprint
          : checkpoint.previousCheckpointAnchor.checkpointRootFingerprint,
    };
  };
  const loadWalletHistoryAuditState = async (
    scope: OwnerRepositoryScope,
    currentRootRaw: string,
    currentRootFingerprint: string,
    window: OwnerRepositoryWalletWindowVerifiedCandidate,
    completedCheckpoints: number,
    economicCursor: OwnerRepositoryEconomicClosureAuditCursorV1 | null,
  ): Promise<OwnerRepositoryWalletHistoryAuditState> => {
    const root = window.anchorRoot.root;
    const [operationRaw, subjectRaw, receiptRaw] = await Promise.all([
      get(root.operationIndexManifestRef.blobKey, scope),
      get(root.subjectIndexManifestRef.blobKey, scope),
      get(root.receiptIndexManifestRef.blobKey, scope),
    ]);
    if (
      operationRaw === null ||
      subjectRaw === null ||
      receiptRaw === null
    ) {
      throw new Error("owner_repository_indeterminate");
    }
    const resolveNode = (ref: OwnerRepositoryBlobRefV1) =>
      get(ref.blobKey, scope);
    try {
      const [operation, subject, receipt] = await Promise.all([
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash: scope.accountScopeHash,
          indexKind: "operation",
          ref: root.operationIndexManifestRef,
          raw: operationRaw,
          resolveNode,
        }),
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash: scope.accountScopeHash,
          indexKind: "subject",
          ref: root.subjectIndexManifestRef,
          raw: subjectRaw,
          resolveNode,
        }),
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash: scope.accountScopeHash,
          indexKind: "receipt",
          ref: root.receiptIndexManifestRef,
          raw: receiptRaw,
          resolveNode,
        }),
      ]);
      return {
        scope,
        currentRootRaw,
        currentRootFingerprint,
        window,
        completedCheckpoints,
        economicCursor,
        operationManifest: operation.manifest,
        subjectManifest: subject.manifest,
        receiptManifest: receipt.manifest,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("budget")) {
        throw new Error("owner_repository_history_audit_budget_exceeded");
      }
      throw new Error("owner_repository_indeterminate");
    }
  };
  const isWalletHistoryAuditCursor = (
    value: unknown,
  ): value is OwnerRepositoryWalletHistoryAuditCursorV1 =>
    isRecord(value) && walletHistoryAuditCursors.has(value);
  const auditWalletHistoryPage = async (
    scope: OwnerRepositoryScope,
    cursor: OwnerRepositoryWalletHistoryAuditCursorV1 | null,
  ): Promise<OwnerRepositoryWalletHistoryAuditPageV1> => {
    const stableScope = parseScope(scope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    let state: OwnerRepositoryWalletHistoryAuditState;
    if (cursor === null) {
      const admitted = await admitWalletWindow(stableScope);
      state = await loadWalletHistoryAuditState(
        stableScope,
        admitted.currentRootRaw,
        admitted.window.currentRoot.root.rootFingerprint,
        admitted.window,
        0,
        null,
      );
    } else {
      if (!isWalletHistoryAuditCursor(cursor)) {
        throw new Error("owner_repository_history_audit_cursor_invalid");
      }
      const existing = walletHistoryAuditStates.get(cursor);
      walletHistoryAuditCursors.delete(cursor);
      walletHistoryAuditStates.delete(cursor);
      if (
        !existing ||
        existing.scope.accountScopeHash !== stableScope.accountScopeHash ||
        existing.scope.generation !== stableScope.generation
      ) {
        throw new Error("owner_repository_history_audit_cursor_invalid");
      }
      state = existing;
    }
    if ((await get(rootKey, stableScope)) !== state.currentRootRaw) {
      throw new Error("owner_repository_cas_conflict");
    }
    const identity = checkpointIdentity(state.window);
    let audited: Awaited<
      ReturnType<
        typeof import("./owner_repository_economic_manifest").auditOwnerRepositoryEconomicClosurePage
      >
    >;
    try {
      const { auditOwnerRepositoryEconomicClosurePage } =
        await import("./owner_repository_economic_manifest");
      audited = await auditOwnerRepositoryEconomicClosurePage({
        accountScopeHash: stableScope.accountScopeHash,
        operationManifest: state.operationManifest,
        subjectManifest: state.subjectManifest,
        receiptManifest: state.receiptManifest,
        cursor: state.economicCursor,
        maxNodes: 128,
        resolveNode: (ref) => get(ref.blobKey, stableScope),
        readBudget: {
          maxExternalReads: 256,
          maxExternalBytes: 64 * 1024 * 1024,
        },
      });
    } catch (error) {
      await assertCurrentFence(stableScope);
      if (error instanceof Error && error.message.includes("budget")) {
        throw new Error("owner_repository_history_audit_budget_exceeded");
      }
      throw new Error("owner_repository_indeterminate");
    }
    let nextState: OwnerRepositoryWalletHistoryAuditState | null = {
      ...state,
      economicCursor: audited.cursor,
    };
    let completedCheckpoints = state.completedCheckpoints;
    if (audited.done) {
      completedCheckpoints += 1;
      if (
        identity.schemaVersion ===
        "learning-v2-owner-repository-wallet-checkpoint.v1"
      ) {
        if (identity.previousCheckpointRootFingerprint !== null) {
          throw new Error("owner_repository_indeterminate");
        }
        nextState = null;
      } else {
        const { verifyOwnerRepositoryWalletWindow } =
          await import("./owner_repository_wallet_window");
        let previousWindow: OwnerRepositoryWalletWindowVerifiedCandidate;
        try {
          previousWindow = await verifyOwnerRepositoryWalletWindow({
            accountScopeHash: stableScope.accountScopeHash,
            currentRootRaw: state.window.anchorRoot.encoded,
            resolveRaw: (key: string) => get(key, stableScope),
            resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
              get(ref.blobKey, stableScope),
          });
        } catch (error) {
          await assertCurrentFence(stableScope);
          if (error instanceof Error && error.message.includes("budget")) {
            throw new Error("owner_repository_history_audit_budget_exceeded");
          }
          throw new Error("owner_repository_indeterminate");
        }
        const previousIdentity = checkpointIdentity(previousWindow);
        const checkpoint = state.window.anchorCheckpoint;
        if (checkpoint.checkpoint.schemaVersion ===
          "learning-v2-owner-repository-wallet-checkpoint.v1") {
          throw new Error("owner_repository_indeterminate");
        }
        if (
          previousIdentity.rootFingerprint !==
            identity.previousCheckpointRootFingerprint ||
          previousIdentity.checkpointFingerprint !==
            checkpoint.checkpoint.previousCheckpointAnchor
              .checkpointFingerprint
        ) {
          throw new Error("owner_repository_indeterminate");
        }
        nextState = await loadWalletHistoryAuditState(
          stableScope,
          state.currentRootRaw,
          state.currentRootFingerprint,
          previousWindow,
          completedCheckpoints,
          null,
        );
      }
    }
    if ((await get(rootKey, stableScope)) !== state.currentRootRaw) {
      throw new Error("owner_repository_cas_conflict");
    }
    let nextCursor: OwnerRepositoryWalletHistoryAuditCursorV1 | null = null;
    if (nextState !== null) {
      const nextIdentity = checkpointIdentity(nextState.window);
      nextCursor = Object.freeze({
        schemaVersion:
          "learning-v2-owner-wallet-history-audit-cursor.v1" as const,
        accountScopeHash: stableScope.accountScopeHash,
        currentRootFingerprint: state.currentRootFingerprint,
        checkpointRootFingerprint: nextIdentity.rootFingerprint,
        checkpointFingerprint: nextIdentity.checkpointFingerprint,
        completedCheckpoints,
        authority: "repository_fenced_in_process_cursor" as const,
      });
      walletHistoryAuditCursors.add(nextCursor);
      walletHistoryAuditStates.set(nextCursor, nextState);
    }
    return deepFreeze({
      done: nextState === null,
      cursor: nextCursor,
      checkpointRootFingerprint: identity.rootFingerprint,
      checkpointFingerprint: identity.checkpointFingerprint,
      completedCheckpoints,
      auditedIndexKind: audited.auditedPhase,
      auditedNodes: audited.radix.visitedNodesThisPage,
      auditedEntries: audited.radix.visitedEntriesThisPage,
    });
  };
  const loadV3FromAdmitted = async (
    admitted: OwnerRepositoryAdmittedWalletWindow,
  ): Promise<OwnerRepositorySnapshotV3> => {
    if (!isWalletWindowAdmitted(admitted)) {
      throw new Error("owner_repository_indeterminate");
    }
    const scope = admitted.scope;
    const root = admitted.window.currentRoot.root;
    const walletRaw = await get(root.walletStateRef.blobKey, scope);
    const courseRaw = await get(root.courseStateManifestRef.blobKey, scope);
    if (walletRaw === null || courseRaw === null) {
      throw new Error("owner_repository_indeterminate");
    }
    let walletState: WalletStateV1;
    let courseStateManifest: OwnerRepositoryCourseStateManifestV1;
    try {
      walletState = parseOwnerRepositoryWalletStateBlob({
        accountScopeHash: scope.accountScopeHash,
        ref: root.walletStateRef,
        raw: walletRaw,
      }).state;
      courseStateManifest = (
        await parseOwnerRepositoryCourseManifestBlob({
          accountScopeHash: scope.accountScopeHash,
          ref: root.courseStateManifestRef,
          raw: courseRaw,
          resolveNode: (ref) => get(ref.blobKey, scope),
        })
      ).manifest;
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    return deepFreeze({ root, walletState, courseStateManifest });
  };
  const materializeRootV3PromotionCheckpoint = async (
    admitted: OwnerRepositoryAdmittedWalletWindow,
    blobs: Readonly<{
      wallet: Readonly<{ ref: OwnerRepositoryBlobRefV1; encoded: string }>;
      course: Readonly<{ ref: OwnerRepositoryBlobRefV1; encoded: string }>;
      operation: Readonly<{ ref: OwnerRepositoryBlobRefV1; encoded: string }>;
      subject: Readonly<{ ref: OwnerRepositoryBlobRefV1; encoded: string }>;
      receipt: Readonly<{ ref: OwnerRepositoryBlobRefV1; encoded: string }>;
    }>,
    resolveNode: OwnerRepositoryRadixNodeResolver,
  ): Promise<
    Readonly<{
      promotedCheckpointAnchor: unknown;
      checkpointToStage: Readonly<{ key: string; encoded: string }>;
    }>
  > => {
    const root = admitted.window.currentRoot.root;
    let walletRevision: number;
    try {
      walletRevision = parseOwnerRepositoryWalletStateBlob({
        accountScopeHash: root.accountScopeHash,
        ref: root.walletStateRef,
        raw: blobs.wallet.encoded,
      }).state.revision;
    } catch {
      throw new Error("owner_repository_indeterminate");
    }
    if (walletRevision === root.journalSequence) {
      const checkpointCodec =
        await import("./owner_repository_wallet_checkpoint_v2");
      const checkpoint =
        await checkpointCodec.materializeOwnerRepositoryWalletCheckpointV2({
          checkpointRoot: admitted.window.currentRoot,
          walletStateBlob: blobs.wallet,
          courseManifestBlob: blobs.course,
          operationManifestBlob: blobs.operation,
          subjectManifestBlob: blobs.subject,
          receiptManifestBlob: blobs.receipt,
          resolveNode,
        });
      return deepFreeze({
        promotedCheckpointAnchor:
          checkpointCodec.createOwnerRepositoryWalletCheckpointV2AnchorCandidate(
            { checkpoint },
          ),
        checkpointToStage: checkpoint,
      });
    }
    const checkpointCodec =
      await import("./owner_repository_economic_checkpoint_v3");
    const previousCheckpoint =
      admitted.window.anchorCheckpoint.checkpoint.schemaVersion ===
      "learning-v2-owner-repository-economic-checkpoint.v3"
        ? admitted.window.anchorCheckpoint
        : null;
    const checkpoint =
      await checkpointCodec.materializeOwnerRepositoryEconomicCheckpointV3({
        checkpointRoot: admitted.window.currentRoot,
        previousCheckpoint,
        walletStateBlob: blobs.wallet,
        courseManifestBlob: blobs.course,
        operationManifestBlob: blobs.operation,
        subjectManifestBlob: blobs.subject,
        receiptManifestBlob: blobs.receipt,
        resolveNode,
      });
    return deepFreeze({
      promotedCheckpointAnchor:
        checkpointCodec.createOwnerRepositoryEconomicCheckpointV3AnchorCandidate(
          { checkpoint },
        ),
      checkpointToStage: checkpoint,
    });
  };
  const loadV3 = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV3 | undefined> => {
    const stableScope = parseScope(scope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    const raw = await get(rootKey, stableScope);
    if (raw === null) return undefined;
    try {
      const { parseOwnerRepositoryRootV3Raw } =
        await import("./owner_repository_root_v3");
      parseOwnerRepositoryRootV3Raw(raw, stableScope.accountScopeHash);
    } catch {
      throw new Error("owner_repository_v3_adoption_required");
    }
    const admitted = await admitWalletWindow(stableScope);
    if (admitted.currentRootRaw !== raw) {
      throw new Error("owner_repository_cas_conflict");
    }
    return loadV3FromAdmitted(admitted);
  };
  const advanceV3Generation = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositorySnapshotV3> => {
    const stableScope = parseScope(scope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        throw new Error("owner_repository_v3_adoption_required");
      }
      let root: OwnerRepositoryRootV3;
      try {
        const { parseOwnerRepositoryRootV3Raw } =
          await import("./owner_repository_root_v3");
        root = parseOwnerRepositoryRootV3Raw(
          currentRaw,
          stableScope.accountScopeHash,
        ).root;
      } catch {
        throw new Error("owner_repository_v3_adoption_required");
      }
      if (root.currentGeneration > stableScope.generation) {
        throw new Error("owner_repository_generation_stale");
      }
      if (root.currentGeneration === stableScope.generation) {
        const admitted = await admitWalletWindow(stableScope);
        if (admitted.currentRootRaw !== currentRaw) continue;
        return loadV3FromAdmitted(admitted);
      }
      const admitted = await admitWalletWindowAtFence(stableScope, false);
      if (admitted.currentRootRaw !== currentRaw) continue;
      await loadV3FromAdmitted(admitted);
      let promotedCheckpointAnchor: unknown = null;
      let checkpointToStage:
        | Readonly<{ readonly key: string; readonly encoded: string }>
        | undefined;
      if (root.walletCheckpointPromotionRequired) {
        const walletRaw = await get(root.walletStateRef.blobKey, stableScope);
        const courseRaw = await get(
          root.courseStateManifestRef.blobKey,
          stableScope,
        );
        const operationRaw = await get(
          root.operationIndexManifestRef.blobKey,
          stableScope,
        );
        const subjectRaw = await get(
          root.subjectIndexManifestRef.blobKey,
          stableScope,
        );
        const receiptRaw = await get(
          root.receiptIndexManifestRef.blobKey,
          stableScope,
        );
        if (
          walletRaw === null ||
          courseRaw === null ||
          operationRaw === null ||
          subjectRaw === null ||
          receiptRaw === null
        ) {
          throw new Error("owner_repository_indeterminate");
        }
        try {
          const promotion = await materializeRootV3PromotionCheckpoint(
            admitted,
            {
              wallet: { ref: root.walletStateRef, encoded: walletRaw },
              course: { ref: root.courseStateManifestRef, encoded: courseRaw },
              operation: {
                ref: root.operationIndexManifestRef,
                encoded: operationRaw,
              },
              subject: {
                ref: root.subjectIndexManifestRef,
                encoded: subjectRaw,
              },
              receipt: {
                ref: root.receiptIndexManifestRef,
                encoded: receiptRaw,
              },
            },
            (ref) => get(ref.blobKey, stableScope),
          );
          promotedCheckpointAnchor = promotion.promotedCheckpointAnchor;
          checkpointToStage = promotion.checkpointToStage;
        } catch {
          await assertCurrentFence(stableScope);
          throw new Error("owner_repository_indeterminate");
        }
      }
      let successor: Awaited<
        ReturnType<
          typeof import("./owner_repository_root_v3").advanceOwnerRepositoryRootV3Generation
        >
      >;
      try {
        const rootV3Codec = await import("./owner_repository_root_v3");
        successor = rootV3Codec.advanceOwnerRepositoryRootV3Generation({
          rootBefore: root,
          targetGeneration: stableScope.generation,
          promotedCheckpointAnchor,
        });
      } catch {
        throw new Error("owner_repository_indeterminate");
      }
      await putImmutableRootHistory(
        stableScope,
        root.rootFingerprint,
        currentRaw,
      );
      if (checkpointToStage) {
        await putImmutableSideRecord(
          stableScope,
          checkpointToStage.key,
          checkpointToStage.encoded,
        );
      }
      if (!(await commitRoot(stableScope, currentRaw, successor.encoded)))
        continue;
      const committed = await admitWalletWindow(stableScope);
      if (committed.currentRootRaw !== successor.encoded) continue;
      return loadV3FromAdmitted(committed);
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const commitWalletCreditV3FromV2 = async (
    stableScope: OwnerRepositoryScope,
    detachedCandidate: unknown,
  ): Promise<OwnerRepositoryWalletCreditCommitResult> => {
    if (typeof materializeWalletCredit !== "function") {
      throw new Error("owner_repository_wallet_credit_authorizer_required");
    }
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    let authorizedOperation: unknown;
    let authorized = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        throw new Error("owner_repository_v3_adoption_required");
      }
      let currentRoot: ReturnType<typeof parseOwnerRepositoryRootV2Raw>;
      try {
        currentRoot = parseOwnerRepositoryRootV2Raw(
          currentRaw,
          stableScope.accountScopeHash,
        );
      } catch {
        throw new Error("owner_repository_cas_conflict");
      }
      if (currentRoot.root.journalSequence > 1) {
        throw new Error("owner_repository_history_upgrade_required");
      }
      const snapshot = await loadV2FromRaw(stableScope, currentRaw, true);
      if ((await get(rootKey, stableScope)) !== currentRaw) continue;
      const checkpointCodec =
        await import("./owner_repository_wallet_checkpoint");
      const rootV3Codec = await import("./owner_repository_root_v3");
      let checkpointRoot = currentRoot;
      let checkpointWalletRaw = await get(
        currentRoot.root.walletStateRef.blobKey,
        stableScope,
      );
      let parentJournalRecordBlob:
        | Readonly<{
            readonly ref: OwnerRepositoryBlobRefV1;
            readonly encoded: string;
          }>
        | undefined;
      if (currentRoot.root.journalSequence === 1) {
        const parentFingerprint = currentRoot.root.previousRootFingerprint;
        if (
          parentFingerprint === null ||
          currentRoot.root.journalHeadRef === null
        ) {
          throw new Error("owner_repository_indeterminate");
        }
        const parentRaw = await get(
          ownerRepositoryRootHistoryKey(
            stableScope.accountScopeHash,
            parentFingerprint,
          ),
          stableScope,
        );
        const journalRaw = await get(
          currentRoot.root.journalHeadRef.blobKey,
          stableScope,
        );
        if (parentRaw === null || journalRaw === null) {
          throw new Error("owner_repository_indeterminate");
        }
        try {
          checkpointRoot = parseOwnerRepositoryRootV2Raw(
            parentRaw,
            stableScope.accountScopeHash,
          );
        } catch {
          await assertCurrentFence(stableScope);
          throw new Error("owner_repository_indeterminate");
        }
        checkpointWalletRaw = await get(
          checkpointRoot.root.walletStateRef.blobKey,
          stableScope,
        );
        parentJournalRecordBlob = {
          ref: currentRoot.root.journalHeadRef,
          encoded: journalRaw,
        };
      }
      const freshCheckpointRoot =
        checkpointRoot.root.repositoryRevision === 0 &&
        checkpointRoot.root.journalSequence === 0 &&
        checkpointRoot.root.previousRootFingerprint === null &&
        checkpointRoot.root.journalHeadRef === null;
      const migratedCheckpointRoot =
        checkpointRoot.root.repositoryRevision === 1 &&
        checkpointRoot.root.journalSequence === 0 &&
        checkpointRoot.root.previousRootFingerprint !== null &&
        checkpointRoot.root.journalHeadRef === null;
      let migrationRootV1: OwnerRepositoryRootV1 | undefined;
      let migrationCourseManifestBlob:
        | Readonly<{
            readonly ref: OwnerRepositoryBlobRefV1;
            readonly encoded: string;
          }>
        | undefined;
      if (migratedCheckpointRoot) {
        const rootV1Raw = await get(
          ownerRepositoryRootHistoryKey(
            stableScope.accountScopeHash,
            checkpointRoot.root.previousRootFingerprint as string,
          ),
          stableScope,
        );
        const courseRaw = await get(
          checkpointRoot.root.courseStateManifestRef.blobKey,
          stableScope,
        );
        if (rootV1Raw === null || courseRaw === null) {
          throw new Error("owner_repository_v3_migration_adoption_required");
        }
        try {
          migrationRootV1 = parseRoot(rootV1Raw, stableScope.accountScopeHash);
        } catch {
          throw new Error("owner_repository_indeterminate");
        }
        migrationCourseManifestBlob = {
          ref: checkpointRoot.root.courseStateManifestRef,
          encoded: courseRaw,
        };
      }
      if (
        checkpointWalletRaw === null ||
        (!freshCheckpointRoot && !migratedCheckpointRoot)
      ) {
        throw new Error("owner_repository_v3_migration_adoption_required");
      }
      const checkpointWalletBlob = {
        ref: checkpointRoot.root.walletStateRef,
        encoded: checkpointWalletRaw,
      };
      let checkpoint: ReturnType<
        typeof checkpointCodec.materializeOwnerRepositoryWalletCheckpoint
      >;
      let adoptionBase: ReturnType<
        typeof rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2
      >;
      try {
        const accumulator = migratedCheckpointRoot
          ? await checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration(
              {
                rootV1: migrationRootV1,
                targetGeneration: checkpointRoot.root.currentGeneration,
                emptyCourseStateManifestBlob: migrationCourseManifestBlob,
                resolveCourseNode: (ref: OwnerRepositoryBlobRefV1) =>
                  get(ref.blobKey, stableScope),
                migratedRoot: checkpointRoot,
              },
            )
          : checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulator({
              startingRoot: checkpointRoot,
              previousCheckpoint: null,
            });
        checkpoint = checkpointCodec.materializeOwnerRepositoryWalletCheckpoint(
          {
            accumulator,
            endingWalletStateBlob: checkpointWalletBlob,
          },
        );
        const anchorCandidate =
          rootV3Codec.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
            checkpoint,
            checkpointRoot: checkpointRoot.root,
            walletStateBlob: checkpointWalletBlob,
          });
        adoptionBase =
          currentRoot.root.journalSequence === 0
            ? migratedCheckpointRoot
              ? await rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration(
                  {
                    rootV1: migrationRootV1,
                    targetGeneration: checkpointRoot.root.currentGeneration,
                    emptyCourseStateManifestBlob: migrationCourseManifestBlob,
                    resolveCourseNode: (ref: OwnerRepositoryBlobRefV1) =>
                      get(ref.blobKey, stableScope),
                    migratedRoot: currentRoot,
                    checkpointAnchorCandidate: anchorCandidate,
                  },
                )
              : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
                  rootBefore: currentRoot,
                  checkpointAnchorCandidate: anchorCandidate,
                })
            : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
                rootBefore: currentRoot,
                parentRoot: checkpointRoot,
                parentJournalRecordBlob,
                checkpointAnchorCandidate: anchorCandidate,
              });
      } catch {
        await assertCurrentFence(stableScope);
        throw new Error("owner_repository_indeterminate");
      }
      let canonicalAppliedReceipt: WalletAppliedReceiptV1 | null = null;
      if (currentRoot.root.journalHeadRef !== null) {
        const journalRaw = await get(
          currentRoot.root.journalHeadRef.blobKey,
          stableScope,
        );
        if (journalRaw === null)
          throw new Error("owner_repository_indeterminate");
        try {
          const parsed = parseOwnerRepositoryJournalRecordBlob({
            accountScopeHash: stableScope.accountScopeHash,
            ref: currentRoot.root.journalHeadRef,
            raw: journalRaw,
          });
          if (parsed.record.recordKind !== "wallet_credit") {
            throw new Error("record_kind_invalid");
          }
          canonicalAppliedReceipt = parsed.record.appliedReceipt;
        } catch {
          await assertCurrentFence(stableScope);
          throw new Error("owner_repository_indeterminate");
        }
      }
      if (!authorized) {
        try {
          authorizedOperation = createWalletAuthorizedOperation(
            await materializeWalletCredit({
              scope: stableScope,
              walletState: snapshot.walletState,
              canonicalAppliedReceipt,
              candidate: detachedCandidate,
            }),
          );
        } catch {
          throw new Error(
            "owner_repository_wallet_credit_authorization_failed",
          );
        }
        await assertCurrentFence(stableScope);
        authorized = true;
      }
      const walletRaw = await get(
        currentRoot.root.walletStateRef.blobKey,
        stableScope,
      );
      const operationRaw = await get(
        currentRoot.root.operationIndexManifestRef.blobKey,
        stableScope,
      );
      const subjectRaw = await get(
        currentRoot.root.subjectIndexManifestRef.blobKey,
        stableScope,
      );
      const receiptRaw = await get(
        currentRoot.root.receiptIndexManifestRef.blobKey,
        stableScope,
      );
      if (
        walletRaw === null ||
        operationRaw === null ||
        subjectRaw === null ||
        receiptRaw === null
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      let plan: OwnerRepositoryWalletCreditPlanResult;
      try {
        plan = await planOwnerRepositoryWalletCredit({
          rootBefore: currentRoot.root,
          walletStateBeforeBlob: {
            ref: currentRoot.root.walletStateRef,
            encoded: walletRaw,
          },
          operationManifestBlob: {
            ref: currentRoot.root.operationIndexManifestRef,
            encoded: operationRaw,
          },
          subjectManifestBlob: {
            ref: currentRoot.root.subjectIndexManifestRef,
            encoded: subjectRaw,
          },
          receiptManifestBlob: {
            ref: currentRoot.root.receiptIndexManifestRef,
            encoded: receiptRaw,
          },
          authorizedOperation,
          resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
            get(ref.blobKey, stableScope),
        });
      } catch {
        await assertCurrentFence(stableScope);
        throw new Error("owner_repository_wallet_credit_authorization_failed");
      }
      if (plan.status !== "applied") {
        if ((await get(rootKey, stableScope)) !== currentRaw) continue;
        return deepFreeze({
          status: plan.status,
          appliedReceipt: plan.appliedReceipt,
          snapshot,
        });
      }
      let successor: Awaited<
        ReturnType<
          typeof rootV3Codec.bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2
        >
      >;
      try {
        successor =
          rootV3Codec.bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2({
            adoptionBase,
            journalRecordBlob: plan.journalRecordBlob,
          });
      } catch {
        throw new Error("owner_repository_indeterminate");
      }
      await putImmutableRootHistory(
        stableScope,
        currentRoot.root.rootFingerprint,
        currentRaw,
      );
      await putImmutableSideRecord(
        stableScope,
        checkpoint.key,
        checkpoint.encoded,
      );
      for (const blob of plan.immutableBlobs) {
        await putImmutable(stableScope, blob);
      }
      if (!(await commitRoot(stableScope, currentRaw, successor.encoded)))
        continue;
      const admitted = await admitWalletWindow(stableScope);
      if (admitted.currentRootRaw !== successor.encoded) continue;
      return deepFreeze({
        status: "applied" as const,
        appliedReceipt: plan.appliedReceipt,
        snapshot: await loadV3FromAdmitted(admitted),
      });
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const commitWalletCreditV3 = async (
    scope: OwnerRepositoryScope,
    candidate: unknown,
  ): Promise<OwnerRepositoryWalletCreditCommitResult> => {
    if (typeof materializeWalletCredit !== "function") {
      throw new Error("owner_repository_wallet_credit_authorizer_required");
    }
    const stableScope = parseScope(scope);
    let detachedCandidate: unknown;
    try {
      detachedCandidate = detachBoundedWalletJson(
        candidate,
        "owner_repository_wallet_credit_candidate_invalid",
      );
    } catch {
      throw new Error("owner_repository_wallet_credit_candidate_invalid");
    }
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    let authorizedOperation: unknown;
    let authorized = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        throw new Error("owner_repository_v3_adoption_required");
      }
      try {
        parseOwnerRepositoryRootV2Raw(currentRaw, stableScope.accountScopeHash);
        return commitWalletCreditV3FromV2(stableScope, detachedCandidate);
      } catch (e) {
      // Continue with the already-adopted RootV3 path.
      console.warn('[silent-catch] owner_repository:currentRaw', e instanceof Error ? e.message : String(e));
    }
      const admitted = await admitWalletWindow(stableScope);
      if (admitted.currentRootRaw !== currentRaw) continue;
      const snapshot = await loadV3FromAdmitted(admitted);
      const root = snapshot.root;
      let canonicalAppliedReceipt: WalletAppliedReceiptV1 | null = null;
      if (root.journalHeadRef !== null) {
        const journalRaw = await get(root.journalHeadRef.blobKey, stableScope);
        if (journalRaw === null)
          throw new Error("owner_repository_indeterminate");
        try {
          try {
            const parsed = parseOwnerRepositoryJournalRecordBlob({
              accountScopeHash: stableScope.accountScopeHash,
              ref: root.journalHeadRef,
              raw: journalRaw,
            });
            if (parsed.record.recordKind === "wallet_credit") {
              canonicalAppliedReceipt = parsed.record.appliedReceipt;
            } else if (
              parsed.record.recordKind === "operation_alias" ||
              parsed.record.recordKind === "missing_index_entry"
            ) {
              canonicalAppliedReceipt =
                parsed.record.canonicalEffectRecord.appliedReceipt;
            } else {
              throw new Error("record_kind_invalid");
            }
          } catch {
            try {
              canonicalAppliedReceipt =
                parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
                  accountScopeHash: stableScope.accountScopeHash,
                  ref: root.journalHeadRef,
                  raw: journalRaw,
                }).record.appliedReceipt;
            } catch {
              canonicalAppliedReceipt =
                parseOwnerRepositoryOperationAliasRecordBlobV2({
                  accountScopeHash: stableScope.accountScopeHash,
                  ref: root.journalHeadRef,
                  raw: journalRaw,
                }).record.aliasValue.ledgerEntry.appliedReceipt;
            }
          }
        } catch {
          await assertCurrentFence(stableScope);
          throw new Error("owner_repository_indeterminate");
        }
      }
      if (!authorized) {
        try {
          const materialized = await materializeWalletCredit({
            scope: stableScope,
            walletState: snapshot.walletState,
            canonicalAppliedReceipt,
            candidate: detachedCandidate,
          });
          authorizedOperation = createWalletAuthorizedOperation(materialized);
        } catch {
          throw new Error(
            "owner_repository_wallet_credit_authorization_failed",
          );
        }
        await assertCurrentFence(stableScope);
        authorized = true;
      }
      const walletRaw = await get(root.walletStateRef.blobKey, stableScope);
      const courseRaw = await get(
        root.courseStateManifestRef.blobKey,
        stableScope,
      );
      const operationRaw = await get(
        root.operationIndexManifestRef.blobKey,
        stableScope,
      );
      const subjectRaw = await get(
        root.subjectIndexManifestRef.blobKey,
        stableScope,
      );
      const receiptRaw = await get(
        root.receiptIndexManifestRef.blobKey,
        stableScope,
      );
      if (
        walletRaw === null ||
        courseRaw === null ||
        operationRaw === null ||
        subjectRaw === null ||
        receiptRaw === null
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      // The verified head only proves the latest settlement. Resolve an older
      // retry by operation id through the account-lifetime typed indexes, then
      // ask the protected authority to validate the candidate against that
      // exact receipt before planning. This prevents a later wallet revision
      // from changing the operation fingerprint of an old retry.
      try {
        const requestedOperation = createWalletAuthorizedOperation(
          authorizedOperation,
        );
        const resolveNode = (ref: OwnerRepositoryBlobRefV1) =>
          get(ref.blobKey, stableScope);
        const [operationManifest, subjectManifest, receiptManifest] =
          await Promise.all([
            parseOwnerRepositoryEconomicManifestBlob({
              accountScopeHash: stableScope.accountScopeHash,
              indexKind: "operation",
              ref: root.operationIndexManifestRef,
              raw: operationRaw,
              resolveNode,
            }),
            parseOwnerRepositoryEconomicManifestBlob({
              accountScopeHash: stableScope.accountScopeHash,
              indexKind: "subject",
              ref: root.subjectIndexManifestRef,
              raw: subjectRaw,
              resolveNode,
            }),
            parseOwnerRepositoryEconomicManifestBlob({
              accountScopeHash: stableScope.accountScopeHash,
              indexKind: "receipt",
              ref: root.receiptIndexManifestRef,
              raw: receiptRaw,
              resolveNode,
            }),
          ]);
        const lifetimeReceipt =
          await lookupOwnerRepositoryCanonicalAppliedReceiptByOperationIdV2({
            accountScopeHash: stableScope.accountScopeHash,
            operationManifest: operationManifest.manifest,
            subjectManifest: subjectManifest.manifest,
            receiptManifest: receiptManifest.manifest,
            operationId: requestedOperation.operationId,
            resolveNode,
          });
        if (lifetimeReceipt !== undefined) {
          authorizedOperation = createWalletAuthorizedOperation(
            await materializeWalletCredit({
              scope: stableScope,
              walletState: snapshot.walletState,
              canonicalAppliedReceipt: lifetimeReceipt,
              candidate: detachedCandidate,
            }),
          );
        }
      } catch (error) {
        await assertCurrentFence(stableScope);
        throw error;
      }
      let promotedCheckpointAnchor: unknown = null;
      let checkpointToStage:
        | Readonly<{ readonly key: string; readonly encoded: string }>
        | undefined;
      if (root.walletCheckpointPromotionRequired) {
        try {
          const promotion = await materializeRootV3PromotionCheckpoint(
            admitted,
            {
              wallet: { ref: root.walletStateRef, encoded: walletRaw },
              course: { ref: root.courseStateManifestRef, encoded: courseRaw },
              operation: {
                ref: root.operationIndexManifestRef,
                encoded: operationRaw,
              },
              subject: {
                ref: root.subjectIndexManifestRef,
                encoded: subjectRaw,
              },
              receipt: {
                ref: root.receiptIndexManifestRef,
                encoded: receiptRaw,
              },
            },
            (ref) => get(ref.blobKey, stableScope),
          );
          promotedCheckpointAnchor = promotion.promotedCheckpointAnchor;
          checkpointToStage = promotion.checkpointToStage;
        } catch {
          await assertCurrentFence(stableScope);
          throw new Error("owner_repository_indeterminate");
        }
      }
      let plan: OwnerRepositoryWalletCreditPlanV2Result;
      try {
        plan = await planOwnerRepositoryWalletCreditV2({
          rootBefore: root,
          walletStateBeforeBlob: {
            ref: root.walletStateRef,
            encoded: walletRaw,
          },
          operationManifestBlob: {
            ref: root.operationIndexManifestRef,
            encoded: operationRaw,
          },
          subjectManifestBlob: {
            ref: root.subjectIndexManifestRef,
            encoded: subjectRaw,
          },
          receiptManifestBlob: {
            ref: root.receiptIndexManifestRef,
            encoded: receiptRaw,
          },
          authorizedOperation,
          promotedCheckpointAnchor,
          resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
            get(ref.blobKey, stableScope),
        });
      } catch (error) {
        await assertCurrentFence(stableScope);
        throw error;
      }
      if (plan.status === "alias_repair_required") {
        if (root.journalHeadRef === null) {
          throw new Error("owner_repository_indeterminate");
        }
        const headRaw = await get(root.journalHeadRef.blobKey, stableScope);
        if (headRaw === null) throw new Error("owner_repository_indeterminate");
        let canonicalEffect: ReturnType<
          typeof parseOwnerRepositoryWalletCreditEffectRecordBlobV2
        >;
        try {
          canonicalEffect =
            parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
              accountScopeHash: stableScope.accountScopeHash,
              ref: root.journalHeadRef,
              raw: headRaw,
            });
        } catch {
          if ((await get(rootKey, stableScope)) !== currentRaw) continue;
          return deepFreeze({
            status: plan.status,
            appliedReceipt: plan.appliedReceipt,
            snapshot,
          });
        }
        if (canonicalEffect.record.appliedReceiptFingerprint !==
          plan.appliedReceipt.appliedReceiptFingerprint) {
          throw new Error("owner_repository_indeterminate");
        }
        const resolveNode = (ref: OwnerRepositoryBlobRefV1) =>
          get(ref.blobKey, stableScope);
        let operationManifest: ParsedOwnerRepositoryEconomicManifest<"operation">;
        let subjectManifest: ParsedOwnerRepositoryEconomicManifest<"subject">;
        let receiptManifest: ParsedOwnerRepositoryEconomicManifest<"receipt">;
        try {
          operationManifest = await parseOwnerRepositoryEconomicManifestBlob({
            accountScopeHash: stableScope.accountScopeHash,
            indexKind: "operation",
            ref: root.operationIndexManifestRef,
            raw: operationRaw,
            resolveNode,
          });
          subjectManifest = await parseOwnerRepositoryEconomicManifestBlob({
            accountScopeHash: stableScope.accountScopeHash,
            indexKind: "subject",
            ref: root.subjectIndexManifestRef,
            raw: subjectRaw,
            resolveNode,
          });
          receiptManifest = await parseOwnerRepositoryEconomicManifestBlob({
            accountScopeHash: stableScope.accountScopeHash,
            indexKind: "receipt",
            ref: root.receiptIndexManifestRef,
            raw: receiptRaw,
            resolveNode,
          });
        } catch {
          throw new Error("owner_repository_indeterminate");
        }
        let aliasPlan: Awaited<
          ReturnType<typeof planOwnerRepositoryOperationAliasV2>
        >;
        try {
          aliasPlan = await planOwnerRepositoryOperationAliasV2({
            accountScopeHash: stableScope.accountScopeHash,
            operationManifest: operationManifest.manifest,
            subjectManifest: subjectManifest.manifest,
            receiptManifest: receiptManifest.manifest,
            authorizedAliasOperation: plan.authorizedOperation,
            resolveNode,
          });
        } catch {
          throw new Error("owner_repository_indeterminate");
        }
        if (!aliasPlan.changed || !sameCanonical(
          aliasPlan.aliasValue.effectBinding.canonicalEffectJournalRecordRef,
          canonicalEffect.ref,
        )) throw new Error("owner_repository_indeterminate");
        const aliasRecord = createOwnerRepositoryOperationAliasRecordV2({
          accountScopeHash: stableScope.accountScopeHash,
          journalSequence: root.journalSequence + 1,
          repositoryRevisionBefore: root.repositoryRevision,
          rootBeforeFingerprint: root.rootFingerprint,
          previousJournalRecordRef: root.journalHeadRef,
          walletStateRef: root.walletStateRef,
          operationIndexManifestBeforeRef: root.operationIndexManifestRef,
          operationIndexManifestAfterRef: aliasPlan.operationManifestBlob.ref,
          subjectIndexManifestRef: root.subjectIndexManifestRef,
          receiptIndexManifestRef: root.receiptIndexManifestRef,
          aliasValue: aliasPlan.aliasValue,
        });
        const aliasJournal =
          materializeOwnerRepositoryOperationAliasRecordBlobV2(aliasRecord);
        const rootV3Codec = await import("./owner_repository_root_v3");
        const successor =
          rootV3Codec.bindOwnerRepositoryOperationAliasV2SuccessorRootV3({
            rootBefore: root,
            journalRecordBlob: aliasJournal,
            promotedCheckpointAnchor,
          });
        await putImmutableRootHistory(
          stableScope,
          root.rootFingerprint,
          currentRaw,
        );
        if (checkpointToStage) {
          await putImmutableSideRecord(
            stableScope,
            checkpointToStage.key,
            checkpointToStage.encoded,
          );
        }
        for (const blob of aliasPlan.immutableNodeBlobs) {
          await putImmutable(stableScope, blob);
        }
        await putImmutable(stableScope, aliasPlan.operationManifestBlob);
        await putImmutable(stableScope, aliasJournal);
        if (!(await commitRoot(stableScope, currentRaw, successor.encoded))) {
          continue;
        }
        const committedAdmission = await admitWalletWindow(stableScope);
        if (committedAdmission.currentRootRaw !== successor.encoded) continue;
        return deepFreeze({
          status: "aliased" as const,
          appliedReceipt: plan.appliedReceipt,
          snapshot: await loadV3FromAdmitted(committedAdmission),
        });
      }
      if (plan.status !== "applied") {
        if ((await get(rootKey, stableScope)) !== currentRaw) continue;
        return deepFreeze({
          status: plan.status,
          appliedReceipt: plan.appliedReceipt,
          snapshot,
        });
      }
      if (
        plan.successorRoot.root.schemaVersion !==
        "learning-v2-owner-repository-root.v3"
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      await putImmutableRootHistory(
        stableScope,
        root.rootFingerprint,
        currentRaw,
      );
      if (checkpointToStage) {
        await putImmutableSideRecord(
          stableScope,
          checkpointToStage.key,
          checkpointToStage.encoded,
        );
      }
      for (const blob of plan.immutableBlobs) {
        await putImmutable(stableScope, blob);
      }
      const committed = await commitRoot(
        stableScope,
        currentRaw,
        plan.successorRoot.encoded,
      );
      if (!committed) continue;
      const committedAdmission = await admitWalletWindow(stableScope);
      if (committedAdmission.currentRootRaw !== plan.successorRoot.encoded) {
        continue;
      }
      return deepFreeze({
        status: "applied" as const,
        appliedReceipt: plan.appliedReceipt,
        snapshot: await loadV3FromAdmitted(committedAdmission),
      });
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const prepareRootV3AdoptionFromV2 = async (
    stableScope: OwnerRepositoryScope,
    currentRaw: string,
    currentRoot: ReturnType<typeof parseOwnerRepositoryRootV2Raw>,
  ) => {
    if (currentRoot.root.journalSequence > 1) {
      throw new Error("owner_repository_history_upgrade_required");
    }
    const snapshot = await loadV2FromRaw(stableScope, currentRaw, true);
    if ((await get(
      ownerRepositoryRootKey(stableScope.accountScopeHash),
      stableScope,
    )) !== currentRaw) return null;
    const checkpointCodec = await import("./owner_repository_wallet_checkpoint");
    const rootV3Codec = await import("./owner_repository_root_v3");
    let checkpointRoot = currentRoot;
    let checkpointWalletRaw = await get(
      currentRoot.root.walletStateRef.blobKey,
      stableScope,
    );
    let parentJournalRecordBlob:
      | Readonly<{
          readonly ref: OwnerRepositoryBlobRefV1;
          readonly encoded: string;
        }>
      | undefined;
    if (currentRoot.root.journalSequence === 1) {
      const parentFingerprint = currentRoot.root.previousRootFingerprint;
      if (parentFingerprint === null || currentRoot.root.journalHeadRef === null) {
        throw new Error("owner_repository_indeterminate");
      }
      const parentRaw = await get(
        ownerRepositoryRootHistoryKey(
          stableScope.accountScopeHash,
          parentFingerprint,
        ),
        stableScope,
      );
      const journalRaw = await get(
        currentRoot.root.journalHeadRef.blobKey,
        stableScope,
      );
      if (parentRaw === null || journalRaw === null) {
        throw new Error("owner_repository_indeterminate");
      }
      try {
        checkpointRoot = parseOwnerRepositoryRootV2Raw(
          parentRaw,
          stableScope.accountScopeHash,
        );
      } catch {
        throw new Error("owner_repository_indeterminate");
      }
      checkpointWalletRaw = await get(
        checkpointRoot.root.walletStateRef.blobKey,
        stableScope,
      );
      parentJournalRecordBlob = {
        ref: currentRoot.root.journalHeadRef,
        encoded: journalRaw,
      };
    }
    const freshCheckpointRoot =
      checkpointRoot.root.repositoryRevision === 0 &&
      checkpointRoot.root.journalSequence === 0 &&
      checkpointRoot.root.previousRootFingerprint === null &&
      checkpointRoot.root.journalHeadRef === null;
    const migratedCheckpointRoot =
      checkpointRoot.root.repositoryRevision === 1 &&
      checkpointRoot.root.journalSequence === 0 &&
      checkpointRoot.root.previousRootFingerprint !== null &&
      checkpointRoot.root.journalHeadRef === null;
    let migrationRootV1: OwnerRepositoryRootV1 | undefined;
    let migrationCourseManifestBlob:
      | Readonly<{
          readonly ref: OwnerRepositoryBlobRefV1;
          readonly encoded: string;
        }>
      | undefined;
    if (migratedCheckpointRoot) {
      const rootV1Raw = await get(
        ownerRepositoryRootHistoryKey(
          stableScope.accountScopeHash,
          checkpointRoot.root.previousRootFingerprint as string,
        ),
        stableScope,
      );
      const courseRaw = await get(
        checkpointRoot.root.courseStateManifestRef.blobKey,
        stableScope,
      );
      if (rootV1Raw === null || courseRaw === null) {
        throw new Error("owner_repository_v3_migration_adoption_required");
      }
      try {
        migrationRootV1 = parseRoot(rootV1Raw, stableScope.accountScopeHash);
      } catch {
        throw new Error("owner_repository_indeterminate");
      }
      migrationCourseManifestBlob = {
        ref: checkpointRoot.root.courseStateManifestRef,
        encoded: courseRaw,
      };
    }
    if (checkpointWalletRaw === null ||
      (!freshCheckpointRoot && !migratedCheckpointRoot)) {
      throw new Error("owner_repository_v3_migration_adoption_required");
    }
    const checkpointWalletBlob = {
      ref: checkpointRoot.root.walletStateRef,
      encoded: checkpointWalletRaw,
    };
    try {
      const accumulator = migratedCheckpointRoot
        ? await checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration({
            rootV1: migrationRootV1,
            targetGeneration: checkpointRoot.root.currentGeneration,
            emptyCourseStateManifestBlob: migrationCourseManifestBlob,
            resolveCourseNode: (ref: OwnerRepositoryBlobRefV1) =>
              get(ref.blobKey, stableScope),
            migratedRoot: checkpointRoot,
          })
        : checkpointCodec.createOwnerRepositoryWalletCheckpointAccumulator({
            startingRoot: checkpointRoot,
            previousCheckpoint: null,
          });
      const checkpoint =
        checkpointCodec.materializeOwnerRepositoryWalletCheckpoint({
          accumulator,
          endingWalletStateBlob: checkpointWalletBlob,
        });
      const anchorCandidate =
        rootV3Codec.parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
          checkpoint,
          checkpointRoot: checkpointRoot.root,
          walletStateBlob: checkpointWalletBlob,
        });
      const adoptionBase = currentRoot.root.journalSequence === 0
        ? migratedCheckpointRoot
          ? await rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration({
              rootV1: migrationRootV1,
              targetGeneration: checkpointRoot.root.currentGeneration,
              emptyCourseStateManifestBlob: migrationCourseManifestBlob,
              resolveCourseNode: (ref: OwnerRepositoryBlobRefV1) =>
                get(ref.blobKey, stableScope),
              migratedRoot: currentRoot,
              checkpointAnchorCandidate: anchorCandidate,
            })
          : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
              rootBefore: currentRoot,
              checkpointAnchorCandidate: anchorCandidate,
            })
        : rootV3Codec.createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
            rootBefore: currentRoot,
            parentRoot: checkpointRoot,
            parentJournalRecordBlob,
            checkpointAnchorCandidate: anchorCandidate,
          });
      return deepFreeze({ snapshot, checkpoint, adoptionBase });
    } catch {
      await assertCurrentFence(stableScope);
      throw new Error("owner_repository_indeterminate");
    }
  };
  const commitCourseUnlock = async (
    scope: OwnerRepositoryScope,
    candidate: unknown,
  ): Promise<OwnerRepositoryCourseUnlockCommitResult> => {
    if (typeof materializeCourseUnlock !== "function") {
      throw new Error("owner_repository_course_unlock_authorizer_required");
    }
    const stableScope = parseScope(scope);
    let detachedCandidate: unknown;
    let candidateReference: ReturnType<typeof parseServerCourseUnlockRequest>;
    try {
      detachedCandidate = detachBoundedWalletJson(
        candidate,
        "owner_repository_course_unlock_candidate_invalid",
      );
      candidateReference = parseServerCourseUnlockRequest(detachedCandidate);
    } catch {
      throw new Error("owner_repository_course_unlock_candidate_invalid");
    }
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        throw new Error("owner_repository_v3_adoption_required");
      }
      let admitted: OwnerRepositoryAdmittedWalletWindow | undefined;
      let snapshot: OwnerRepositorySnapshotV2 | OwnerRepositorySnapshotV3;
      let root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
      let adoptionBase: unknown;
      let checkpointToStage:
        | Readonly<{ readonly key: string; readonly encoded: string }>
        | undefined;
      let parsedV2: ReturnType<typeof parseOwnerRepositoryRootV2Raw> | undefined;
      try {
        parsedV2 = parseOwnerRepositoryRootV2Raw(
          currentRaw,
          stableScope.accountScopeHash,
        );
      } catch {
        parsedV2 = undefined;
      }
      if (parsedV2) {
        const adoption = await prepareRootV3AdoptionFromV2(
          stableScope,
          currentRaw,
          parsedV2,
        );
        if (adoption === null) continue;
        snapshot = adoption.snapshot;
        root = parsedV2.root;
        adoptionBase = adoption.adoptionBase;
        checkpointToStage = adoption.checkpoint;
      } else {
        admitted = await admitWalletWindow(stableScope);
        if (admitted.currentRootRaw !== currentRaw) continue;
        snapshot = await loadV3FromAdmitted(admitted);
        root = snapshot.root;
      }
      const walletRaw = await get(root.walletStateRef.blobKey, stableScope);
      const courseManifestRaw = await get(
        root.courseStateManifestRef.blobKey,
        stableScope,
      );
      const operationRaw = await get(
        root.operationIndexManifestRef.blobKey,
        stableScope,
      );
      const subjectRaw = await get(
        root.subjectIndexManifestRef.blobKey,
        stableScope,
      );
      const receiptRaw = await get(
        root.receiptIndexManifestRef.blobKey,
        stableScope,
      );
      if (
        walletRaw === null ||
        courseManifestRaw === null ||
        operationRaw === null ||
        subjectRaw === null ||
        receiptRaw === null
      ) {
        throw new Error("owner_repository_indeterminate");
      }
      const resolveNode = (ref: OwnerRepositoryBlobRefV1) =>
        get(ref.blobKey, stableScope);
      let courseUnlockState: CourseUnlockStateV1;
      let operationManifest: ParsedOwnerRepositoryEconomicManifest<"operation">;
      let subjectManifest: ParsedOwnerRepositoryEconomicManifest<"subject">;
      let receiptManifest: ParsedOwnerRepositoryEconomicManifest<"receipt">;
      try {
        const emptyCourse = createCourseUnlockState({
          accountScopeHash: stableScope.accountScopeHash,
          courseId: candidateReference.courseId,
          studyTarget: candidateReference.studyTarget,
        });
        const courseEntry = await lookupOwnerRepositoryCourseState({
          accountScopeHash: stableScope.accountScopeHash,
          manifest: snapshot.courseStateManifest,
          courseIdentityFingerprint: emptyCourse.courseIdentityFingerprint,
          resolveNode,
        });
        if (courseEntry === undefined) {
          courseUnlockState = emptyCourse;
        } else {
          const courseRaw = await get(courseEntry.stateRef.blobKey, stableScope);
          if (courseRaw === null) throw new Error("course_state_missing");
          courseUnlockState = parseOwnerRepositoryCourseUnlockStateBlob({
            accountScopeHash: stableScope.accountScopeHash,
            ref: courseEntry.stateRef,
            raw: courseRaw,
          }).state;
        }
        [operationManifest, subjectManifest, receiptManifest] =
          await Promise.all([
            parseOwnerRepositoryEconomicManifestBlob({
              accountScopeHash: stableScope.accountScopeHash,
              indexKind: "operation",
              ref: root.operationIndexManifestRef,
              raw: operationRaw,
              resolveNode,
            }),
            parseOwnerRepositoryEconomicManifestBlob({
              accountScopeHash: stableScope.accountScopeHash,
              indexKind: "subject",
              ref: root.subjectIndexManifestRef,
              raw: subjectRaw,
              resolveNode,
            }),
            parseOwnerRepositoryEconomicManifestBlob({
              accountScopeHash: stableScope.accountScopeHash,
              indexKind: "receipt",
              ref: root.receiptIndexManifestRef,
              raw: receiptRaw,
              resolveNode,
            }),
          ]);
        if (root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
          (operationManifest.legacy || subjectManifest.legacy ||
            receiptManifest.legacy)) throw new Error("legacy_manifest");
      } catch {
        await assertCurrentFence(stableScope);
        throw new Error("owner_repository_indeterminate");
      }
      let canonicalAppliedReceipt: CourseUnlockAppliedReceiptV1 | null = null;
      try {
        canonicalAppliedReceipt =
          (await lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2({
            accountScopeHash: stableScope.accountScopeHash,
            operationManifest: operationManifest.manifest,
            subjectManifest: subjectManifest.manifest,
            receiptManifest: receiptManifest.manifest,
            operationId: candidateReference.operationId,
            resolveNode,
            resolveBlob: resolveNode,
          })) ?? null;
      } catch {
        await assertCurrentFence(stableScope);
        throw new Error("owner_repository_indeterminate");
      }
      let authorizedRequest;
      try {
        authorizedRequest = createAuthorizedCourseUnlockRequest(
          await materializeCourseUnlock({
            scope: stableScope,
            walletState: snapshot.walletState,
            courseUnlockState,
            canonicalAppliedReceipt,
            candidate: detachedCandidate,
          }),
        );
      } catch {
        throw new Error("owner_repository_course_unlock_authorization_failed");
      }
      await assertCurrentFence(stableScope);
      let promotedCheckpointAnchor: unknown;
      if (root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
        root.walletCheckpointPromotionRequired) {
        if (!admitted) throw new Error("owner_repository_indeterminate");
        try {
          const promotion = await materializeRootV3PromotionCheckpoint(
            admitted,
            {
              wallet: { ref: root.walletStateRef, encoded: walletRaw },
              course: {
                ref: root.courseStateManifestRef,
                encoded: courseManifestRaw,
              },
              operation: {
                ref: root.operationIndexManifestRef,
                encoded: operationRaw,
              },
              subject: {
                ref: root.subjectIndexManifestRef,
                encoded: subjectRaw,
              },
              receipt: {
                ref: root.receiptIndexManifestRef,
                encoded: receiptRaw,
              },
            },
            resolveNode,
          );
          promotedCheckpointAnchor = promotion.promotedCheckpointAnchor;
          checkpointToStage = promotion.checkpointToStage;
        } catch {
          await assertCurrentFence(stableScope);
          throw new Error("owner_repository_indeterminate");
        }
      }
      let plan;
      try {
        plan = await planOwnerRepositoryCourseUnlock({
          accountScopeHash: stableScope.accountScopeHash,
          rootBefore: root,
          walletStateBlob: { ref: root.walletStateRef, encoded: walletRaw },
          courseManifestBlob: {
            ref: root.courseStateManifestRef,
            encoded: courseManifestRaw,
          },
          operationManifestBlob: {
            ref: root.operationIndexManifestRef,
            encoded: operationRaw,
          },
          subjectManifestBlob: {
            ref: root.subjectIndexManifestRef,
            encoded: subjectRaw,
          },
          receiptManifestBlob: {
            ref: root.receiptIndexManifestRef,
            encoded: receiptRaw,
          },
          authorizedRequest,
          resolveNode,
          resolveBlob: resolveNode,
          ...(root.schemaVersion === "learning-v2-owner-repository-root.v2"
            ? { adoptionBase }
            : root.walletCheckpointPromotionRequired
              ? { promotedCheckpointAnchor }
              : {}),
        });
      } catch (error) {
        await assertCurrentFence(stableScope);
        throw error;
      }
      if (plan.status === "insufficient_balance") {
        if ((await get(rootKey, stableScope)) !== currentRaw) continue;
        return deepFreeze({
          status: plan.status,
          requiredSubunits: plan.requiredSubunits,
          currentBalanceSubunits: plan.currentBalanceSubunits,
          courseUnlockState: plan.courseUnlockState,
          snapshot,
        });
      }
      if (plan.status === "replayed") {
        if ((await get(rootKey, stableScope)) !== currentRaw) continue;
        return deepFreeze({
          status: plan.status,
          appliedReceipt: plan.appliedReceipt,
          courseUnlockState: plan.courseUnlockState,
          snapshot,
        });
      }
      await putImmutableRootHistory(
        stableScope,
        root.rootFingerprint,
        currentRaw,
      );
      if (checkpointToStage) {
        await putImmutableSideRecord(
          stableScope,
          checkpointToStage.key,
          checkpointToStage.encoded,
        );
      }
      for (const blob of plan.immutableBlobs) {
        await putImmutable(stableScope, blob);
      }
      if (!(await commitRoot(
        stableScope,
        currentRaw,
        plan.successorRoot.encoded,
      ))) continue;
      const committedAdmission = await admitWalletWindow(stableScope);
      if (committedAdmission.currentRootRaw !== plan.successorRoot.encoded) {
        continue;
      }
      return deepFreeze({
        status: "applied" as const,
        appliedReceipt: plan.appliedReceipt,
        courseUnlockState: parseOwnerRepositoryCourseUnlockStateBlob({
          accountScopeHash: stableScope.accountScopeHash,
          ref: plan.courseStateAfterBlob.ref,
          raw: plan.courseStateAfterBlob.encoded,
        }).state,
        snapshot: await loadV3FromAdmitted(committedAdmission),
      });
    }
    throw new Error("owner_repository_cas_conflict");
  };
  const initialize = async (
    scope: OwnerRepositoryScope,
  ): Promise<OwnerRepositoryAnySnapshot> => {
    const stableScope = parseScope(scope);
    await assertCurrentFence(stableScope);
    const rootKey = ownerRepositoryRootKey(stableScope.accountScopeHash);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentRaw = await get(rootKey, stableScope);
      if (currentRaw === null) {
        const wallet = createBlob(
          stableScope.accountScopeHash,
          "wallet_state",
          createWalletState({ accountScopeHash: stableScope.accountScopeHash }),
        );
        const operation = createBlob(
          stableScope.accountScopeHash,
          "operation_index_manifest",
          createIndexPayload("operation"),
        );
        const subject = createBlob(
          stableScope.accountScopeHash,
          "subject_index_manifest",
          createIndexPayload("subject"),
        );
        const receipt = createBlob(
          stableScope.accountScopeHash,
          "receipt_index_manifest",
          createIndexPayload("receipt"),
        );
        await putImmutable(stableScope, wallet);
        await putImmutable(stableScope, operation);
        await putImmutable(stableScope, subject);
        await putImmutable(stableScope, receipt);
        const next = finalizeRoot({
          schemaVersion: "learning-v2-owner-repository-root.v1",
          accountScopeHash: stableScope.accountScopeHash,
          currentGeneration: stableScope.generation,
          repositoryRevision: 0,
          journalSequence: 0,
          previousRootFingerprint: null,
          journalHeadRef: null,
          walletStateRef: wallet.ref,
          courseStateRefs: [],
          operationIndexManifestRef: operation.ref,
          subjectIndexManifestRef: subject.ref,
          receiptIndexManifestRef: receipt.ref,
        });
        if (await commitRoot(stableScope, null, next.encoded))
          return loadFromRaw(stableScope, next.encoded, true);
        continue;
      }
      let parsedV3: OwnerRepositoryRootV3 | undefined;
      try {
        const { parseOwnerRepositoryRootV3Raw } =
          await import("./owner_repository_root_v3");
        parsedV3 = parseOwnerRepositoryRootV3Raw(
          currentRaw,
          stableScope.accountScopeHash,
        ).root;
      } catch {
        parsedV3 = undefined;
      }
      if (parsedV3) {
        if (stableScope.generation < parsedV3.currentGeneration) {
          throw new Error("owner_repository_generation_stale");
        }
        if (stableScope.generation !== parsedV3.currentGeneration) {
          return advanceV3Generation(stableScope);
        }
        const snapshot = await loadV3(stableScope);
        if (snapshot) return snapshot;
        continue;
      }
      let currentIsV2 = false;
      try {
        parseOwnerRepositoryRootV2Raw(currentRaw, stableScope.accountScopeHash);
        currentIsV2 = true;
      } catch {
        currentIsV2 = false;
      }
      if (currentIsV2) return ensureV2(stableScope);
      const current = parseRoot(currentRaw, stableScope.accountScopeHash);
      if (stableScope.generation < current.currentGeneration) {
        throw new Error("owner_repository_generation_stale");
      }
      if (current.currentGeneration === stableScope.generation)
        return loadFromRaw(stableScope, currentRaw, true);
      await loadFromRaw(stableScope, currentRaw, false);
      const next = finalizeRoot({
        ...current,
        currentGeneration: stableScope.generation,
        repositoryRevision: checkedIncrement(current.repositoryRevision),
        previousRootFingerprint: current.rootFingerprint,
      });
      if (await commitRoot(stableScope, currentRaw, next.encoded))
        return loadFromRaw(stableScope, next.encoded, true);
    }
    throw new Error("owner_repository_cas_conflict");
  };
  return {
    initialize,
    load,
    ensureV2,
    loadV2,
    loadV3,
    advanceV3Generation,
    commitWalletCredit,
    commitWalletCreditV3,
    commitCourseUnlock,
    admitWalletWindow,
    isWalletWindowAdmitted,
    auditWalletHistoryPage,
    isWalletHistoryAuditCursor,
  };
};
