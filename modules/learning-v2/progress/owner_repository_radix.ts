import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { isWalletIdentifier } from "../contracts/wallet";

export const OWNER_REPOSITORY_RADIX_FANOUT_BITS = 8 as const;
export const OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES = 32 as const;
export const OWNER_REPOSITORY_RADIX_LEAF_CAPACITY = 32 as const;
export const OWNER_REPOSITORY_RADIX_MAX_BATCH_MUTATIONS = 256 as const;
export const OWNER_REPOSITORY_RADIX_MAX_BATCH_VALUE_BYTES = 4 * 1024 * 1024;
export const OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES = 64 * 1024;

export interface OwnerRepositoryRadixReadBudget {
  readonly maxExternalReads: number;
  readonly maxExternalBytes: number;
}

export type OwnerRepositoryIndexKind =
  | "operation"
  | "subject"
  | "receipt"
  | "course_state";
export type OwnerRepositoryIndexKeyKind =
  | "operation_id"
  | "operation_fingerprint"
  | "semantic_subject"
  | "applied_receipt"
  | "course_identity";

export interface OwnerRepositoryRadixNodeRefV1 {
  readonly schemaVersion: "learning-v2-owner-repository-blob-ref.v1";
  readonly kind: "index_radix_node";
  readonly blobKey: string;
  readonly blobFingerprint: string;
}

export interface OwnerRepositoryLegacyEmptyIndexManifestV1 {
  readonly schemaVersion: "learning-v2-owner-repository-index-manifest.v1";
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly shardBits: 8;
  readonly shards: readonly [];
}

export interface OwnerRepositoryRadixManifestV2 {
  readonly schemaVersion: "learning-v2-owner-repository-index-manifest.v2";
  readonly accountScopeHash: string;
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly keyDerivation: "owner-index-key.v1";
  readonly fanoutBits: 8;
  readonly leafCapacity: 32;
  readonly entryCount: number;
  readonly rootNodeRef: OwnerRepositoryRadixNodeRefV1 | null;
}

export type OwnerRepositoryRadixManifest =
  | OwnerRepositoryLegacyEmptyIndexManifestV1
  | OwnerRepositoryRadixManifestV2;

export interface OwnerRepositoryRadixMutation {
  readonly keyKind: OwnerRepositoryIndexKeyKind;
  readonly logicalKey: string;
  readonly value: unknown;
  /** Omitted keeps insert-only semantics; null requires absence; a hash requires an exact old value. */
  readonly expectedValueFingerprint?: string | null;
}

export interface OwnerRepositoryRadixEntryV1 {
  readonly schemaVersion: "learning-v2-owner-repository-index-entry.v1";
  readonly keyKind: OwnerRepositoryIndexKeyKind;
  readonly logicalKey: string;
  readonly keyDigest: string;
  readonly valueFingerprint: string;
  readonly value: unknown;
}

export interface OwnerRepositoryCourseStateIndexValueV1 {
  readonly schemaVersion: "learning-v2-owner-repository-course-entry.v1";
  readonly courseIdentityFingerprint: string;
  readonly stateRef: Readonly<{
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1";
    kind: "course_unlock_state";
    blobKey: string;
    blobFingerprint: string;
  }>;
}

export interface OwnerRepositoryRadixBlob {
  readonly ref: OwnerRepositoryRadixNodeRefV1;
  readonly encoded: string;
}

export type OwnerRepositoryRadixNodeResolver = (
  ref: OwnerRepositoryRadixNodeRefV1,
) => unknown | Promise<unknown>;

export interface OwnerRepositoryRadixDigestBody {
  readonly schemaVersion: "learning-v2-owner-index-key.v1";
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly keyKind: OwnerRepositoryIndexKeyKind;
  readonly logicalKey: string;
}

export type OwnerRepositoryRadixDigest = (
  body: OwnerRepositoryRadixDigestBody,
) => string;

export interface OwnerRepositoryRadixPlan {
  readonly manifest: OwnerRepositoryRadixManifestV2;
  readonly immutableBlobs: readonly OwnerRepositoryRadixBlob[];
  readonly changed: boolean;
}

export interface OwnerRepositoryRadixAuditCursorV1 {
  readonly schemaVersion: "learning-v2-owner-repository-radix-audit-cursor.v1";
  readonly accountScopeHash: string;
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly manifestFingerprint: string;
  readonly expectedEntryCount: number;
  readonly visitedNodeCount: number;
  readonly visitedEntryCount: number;
  readonly accumulatorFingerprint: string;
  readonly authority: "in_process_audit_cursor";
}

export interface OwnerRepositoryRadixAuditPageV1 {
  readonly done: boolean;
  readonly cursor: OwnerRepositoryRadixAuditCursorV1 | null;
  readonly entries: readonly OwnerRepositoryRadixEntryV1[];
  readonly visitedNodesThisPage: number;
  readonly visitedEntriesThisPage: number;
  readonly visitedNodeCount: number;
  readonly visitedEntryCount: number;
  readonly externalReads: number;
  readonly externalBytes: number;
  readonly accumulatorFingerprint: string;
}

type BranchChild = Readonly<{
  edge: string;
  entryCount: number;
  nodeRef: OwnerRepositoryRadixNodeRefV1;
}>;

type RadixLeaf = Readonly<{
  schemaVersion: "learning-v2-owner-repository-radix-leaf.v1";
  accountScopeHash: string;
  indexKind: OwnerRepositoryIndexKind;
  depthBytes: number;
  pathPrefix: string;
  entryCount: number;
  entries: readonly OwnerRepositoryRadixEntryV1[];
}>;

type RadixBranch = Readonly<{
  schemaVersion: "learning-v2-owner-repository-radix-branch.v1";
  accountScopeHash: string;
  indexKind: OwnerRepositoryIndexKind;
  depthBytes: number;
  pathPrefix: string;
  entryCount: number;
  children: readonly BranchChild[];
}>;

type RadixNode = RadixLeaf | RadixBranch;

type AuditFrame = Readonly<{
  ref: OwnerRepositoryRadixNodeRefV1;
  depth: number;
  prefix: string;
  entryCount: number;
}>;

type InternalAuditCursor = OwnerRepositoryRadixAuditCursorV1 &
  Readonly<{ readonly stack: readonly AuditFrame[] }>;

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const BYTE = /^[a-f0-9]{2}$/;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_BLOB_BYTES = 512 * 1024;
const MAX_INPUT_NODES = 4_096;
const MAX_INPUT_DEPTH = 32;
const MAX_INPUT_STRING_UNITS = 128 * 1024;
const MAX_NODE_INPUT_NODES = 32_768;
const MAX_NODE_INPUT_DEPTH = 64;
const MAX_NODE_INPUT_STRING_UNITS = 2 * MAX_BLOB_BYTES;
const DEFAULT_LOOKUP_READ_BUDGET = Object.freeze({
  maxExternalReads: 33,
  maxExternalBytes: 20 * 1024 * 1024,
});
const DEFAULT_PLAN_READ_BUDGET = Object.freeze({
  maxExternalReads: 8_448,
  maxExternalBytes: 64 * 1024 * 1024,
});
const DEFAULT_AUDIT_READ_BUDGET = Object.freeze({
  maxExternalReads: 256,
  maxExternalBytes: 64 * 1024 * 1024,
});
const MAX_AUDIT_PAGE_NODES = 256;
const AUDIT_CURSORS = new WeakSet<object>();
const MANIFEST_V1_KEYS = [
  "schemaVersion",
  "indexKind",
  "shardBits",
  "shards",
] as const;
const MANIFEST_V2_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "indexKind",
  "keyDerivation",
  "fanoutBits",
  "leafCapacity",
  "entryCount",
  "rootNodeRef",
] as const;
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
const LEAF_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "indexKind",
  "depthBytes",
  "pathPrefix",
  "entryCount",
  "entries",
] as const;
const BRANCH_KEYS = [
  "schemaVersion",
  "accountScopeHash",
  "indexKind",
  "depthBytes",
  "pathPrefix",
  "entryCount",
  "children",
] as const;
const CHILD_KEYS = ["edge", "entryCount", "nodeRef"] as const;
const ENTRY_KEYS = [
  "schemaVersion",
  "keyKind",
  "logicalKey",
  "keyDigest",
  "valueFingerprint",
  "value",
] as const;
const COURSE_VALUE_KEYS = [
  "schemaVersion",
  "courseIdentityFingerprint",
  "stateRef",
] as const;
const COURSE_STATE_REF_KEYS = [
  "schemaVersion",
  "kind",
  "blobKey",
  "blobFingerprint",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const safe = (
  value: unknown,
  maximum = Number.MAX_SAFE_INTEGER,
): value is number =>
  Number.isSafeInteger(value) &&
  !Object.is(value, -0) &&
  Number(value) >= 0 &&
  Number(value) <= maximum;
const checkedAdd = (left: number, right: number): number => {
  const result = left + right;
  if (!Number.isSafeInteger(result) || result < 0)
    throw new Error("owner_index_indeterminate");
  return result;
};
const deepFreeze = <T>(value: T): T => {
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== "object" || current === null || seen.has(current))
      continue;
    seen.add(current);
    for (const child of Object.values(current as Record<string, unknown>))
      stack.push(child);
    Object.freeze(current);
  }
  return value;
};

const readDataRecord = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  code: string,
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
        RESERVED_KEYS.has(key as string) ||
        (!requiredKeys.includes(key as string) &&
          !optionalKeys.includes(key as string)),
    )
  ) {
    throw new Error(code);
  }
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!("value" in descriptor) || !descriptor.enumerable)
      throw new Error(code);
    result[key] = descriptor.value;
  }
  return result;
};

const readDenseArray = (
  input: unknown,
  maximum: number,
  code: string,
): readonly unknown[] => {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    input.length > maximum
  ) {
    throw new Error(code);
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== "string") ||
    keys.length !== input.length + 1 ||
    !Object.prototype.hasOwnProperty.call(descriptors, "length")
  )
    throw new Error(code);
  const result: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      throw new Error(code);
    result.push(descriptor.value);
  }
  return result;
};

const assertPlainJsonIterative = (
  input: unknown,
  code: string,
  limits: {
    readonly nodes: number;
    readonly depth: number;
    readonly stringUnits: number;
  } = {
    nodes: MAX_INPUT_NODES,
    depth: MAX_INPUT_DEPTH,
    stringUnits: MAX_INPUT_STRING_UNITS,
  },
): void => {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [
    { value: input, depth: 0 },
  ];
  let nodes = 0;
  let stringUnits = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > limits.nodes || current.depth > limits.depth)
      throw new Error(code);
    if (typeof current.value === "string") {
      stringUnits += current.value.length;
      if (stringUnits > limits.stringUnits) throw new Error(code);
      continue;
    }
    if (current.value === null || typeof current.value === "boolean") continue;
    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value) || Object.is(current.value, -0))
        throw new Error(code);
      continue;
    }
    if (typeof current.value !== "object") throw new Error(code);
    if (Array.isArray(current.value)) {
      const values = readDenseArray(current.value, 2_048, code);
      for (const value of values)
        stack.push({ value, depth: current.depth + 1 });
      continue;
    }
    const record = readDataRecord(
      current.value,
      [],
      Object.keys(Object.getOwnPropertyDescriptors(current.value)),
      code,
    );
    for (const [key, value] of Object.entries(record)) {
      stringUnits += key.length;
      if (stringUnits > limits.stringUnits) throw new Error(code);
      stack.push({ value, depth: current.depth + 1 });
    }
  }
};

const parseReadBudget = (
  input: unknown,
  fallback: OwnerRepositoryRadixReadBudget,
): OwnerRepositoryRadixReadBudget => {
  if (input === undefined) return fallback;
  const value = readDataRecord(
    input,
    ["maxExternalReads", "maxExternalBytes"],
    [],
    "owner_index_read_budget_invalid",
  );
  if (
    !safe(value.maxExternalReads, 100_000) ||
    !safe(value.maxExternalBytes, 1024 * 1024 * 1024)
  ) {
    throw new Error("owner_index_read_budget_invalid");
  }
  return deepFreeze({
    maxExternalReads: Number(value.maxExternalReads),
    maxExternalBytes: Number(value.maxExternalBytes),
  });
};

interface BudgetedNodeReader {
  read(ref: OwnerRepositoryRadixNodeRefV1): Promise<unknown>;
  readonly externalReads: number;
  readonly externalBytes: number;
}

const createBudgetedNodeReader = (
  resolver: OwnerRepositoryRadixNodeResolver,
  budget: OwnerRepositoryRadixReadBudget,
): BudgetedNodeReader => {
  const cache = new Map<string, unknown>();
  let externalReads = 0;
  let externalBytes = 0;
  return {
    async read(ref) {
      if (cache.has(ref.blobKey)) return cache.get(ref.blobKey);
      if (externalReads >= budget.maxExternalReads)
        throw new Error("owner_index_read_budget_exceeded");
      let raw: unknown;
      try {
        raw = await resolver(ref);
      } catch {
        throw new Error("owner_index_indeterminate");
      }
      externalReads += 1;
      if (typeof raw === "string") {
        let bytes: number;
        try {
          bytes = utf8ByteLengthV1(raw);
        } catch {
          throw new Error("owner_index_indeterminate");
        }
        externalBytes = checkedAdd(externalBytes, bytes);
        if (externalBytes > budget.maxExternalBytes)
          throw new Error("owner_index_read_budget_exceeded");
      }
      cache.set(ref.blobKey, raw);
      return raw;
    },
    get externalReads() {
      return externalReads;
    },
    get externalBytes() {
      return externalBytes;
    },
  };
};

const indexKindValid = (value: unknown): value is OwnerRepositoryIndexKind =>
  value === "operation" ||
  value === "subject" ||
  value === "receipt" ||
  value === "course_state";
const keyKindValid = (value: unknown): value is OwnerRepositoryIndexKeyKind =>
  value === "operation_id" ||
  value === "operation_fingerprint" ||
  value === "semantic_subject" ||
  value === "applied_receipt" ||
  value === "course_identity";
const keyKindAllowed = (
  indexKind: OwnerRepositoryIndexKind,
  keyKind: OwnerRepositoryIndexKeyKind,
): boolean =>
  indexKind === "operation"
    ? keyKind === "operation_id" || keyKind === "operation_fingerprint"
    : indexKind === "subject"
      ? keyKind === "semantic_subject"
      : indexKind === "receipt"
        ? keyKind === "applied_receipt"
        : keyKind === "course_identity";
const logicalKeyValid = (
  keyKind: OwnerRepositoryIndexKeyKind,
  value: unknown,
): value is string =>
  keyKind === "operation_id"
    ? isWalletIdentifier(value)
    : typeof value === "string" && HASH.test(value);

const blobKey = (accountScopeHash: string, fingerprint: string): string =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${fingerprint}`;

const parseRef = (
  input: unknown,
  accountScopeHash: string,
): OwnerRepositoryRadixNodeRefV1 => {
  let value: Readonly<Record<string, unknown>>;
  try {
    value = readDataRecord(input, REF_KEYS, [], "owner_index_indeterminate");
  } catch {
    throw new Error("owner_index_indeterminate");
  }
  if (
    value.schemaVersion !== "learning-v2-owner-repository-blob-ref.v1" ||
    value.kind !== "index_radix_node" ||
    typeof value.blobFingerprint !== "string" ||
    !HASH.test(value.blobFingerprint) ||
    value.blobKey !== blobKey(accountScopeHash, value.blobFingerprint)
  ) {
    throw new Error("owner_index_indeterminate");
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
    kind: "index_radix_node" as const,
    blobKey: value.blobKey as string,
    blobFingerprint: value.blobFingerprint,
  });
};

const detachValue = (
  input: unknown,
): {
  readonly value: unknown;
  readonly fingerprint: string;
  readonly bytes: number;
} => {
  let encoded: string;
  try {
    assertPlainJsonIterative(input, "owner_index_value_invalid");
    encoded = canonicalJsonV1(input);
  } catch {
    throw new Error("owner_index_value_invalid");
  }
  const bytes = utf8ByteLengthV1(encoded);
  if (bytes > OWNER_REPOSITORY_RADIX_MAX_VALUE_BYTES)
    throw new Error("owner_index_value_invalid");
  return deepFreeze({
    value: JSON.parse(encoded) as unknown,
    fingerprint: sha256Utf8(encoded),
    bytes,
  });
};

const defaultDigest: OwnerRepositoryRadixDigest = (body) =>
  hashCanonicalBody(body);

export const deriveOwnerRepositoryRadixKeyDigest = (input: {
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly keyKind: OwnerRepositoryIndexKeyKind;
  readonly logicalKey: string;
  readonly digest?: OwnerRepositoryRadixDigest;
}): string => {
  const value = readDataRecord(
    input,
    ["indexKind", "keyKind", "logicalKey"],
    ["digest"],
    "owner_index_key_invalid",
  );
  if (
    !indexKindValid(value.indexKind) ||
    !keyKindValid(value.keyKind) ||
    !keyKindAllowed(value.indexKind, value.keyKind) ||
    !logicalKeyValid(value.keyKind, value.logicalKey) ||
    (value.digest !== undefined && typeof value.digest !== "function")
  ) {
    throw new Error("owner_index_key_invalid");
  }
  const body = deepFreeze({
    schemaVersion: "learning-v2-owner-index-key.v1" as const,
    indexKind: value.indexKind,
    keyKind: value.keyKind,
    logicalKey: value.logicalKey,
  });
  let result: string;
  try {
    result = (
      (value.digest as OwnerRepositoryRadixDigest | undefined) ?? defaultDigest
    )(body);
  } catch {
    throw new Error("owner_index_digest_invalid");
  }
  if (!HASH.test(result)) throw new Error("owner_index_digest_invalid");
  return result;
};

const entryOrder = (
  left: OwnerRepositoryRadixEntryV1,
  right: OwnerRepositoryRadixEntryV1,
): number =>
  left.keyDigest.localeCompare(right.keyDigest) ||
  left.keyKind.localeCompare(right.keyKind) ||
  left.logicalKey.localeCompare(right.logicalKey);
const sameLogicalKey = (
  left: OwnerRepositoryRadixEntryV1,
  right: OwnerRepositoryRadixEntryV1,
): boolean =>
  left.keyKind === right.keyKind && left.logicalKey === right.logicalKey;

const normalizeEntry = (
  accountScopeHash: string,
  indexKind: OwnerRepositoryIndexKind,
  mutation: unknown,
  digest?: OwnerRepositoryRadixDigest,
): {
  readonly entry: OwnerRepositoryRadixEntryV1;
  readonly valueBytes: number;
  readonly expectedValueFingerprint: string | null | undefined;
} => {
  const value = readDataRecord(
    mutation,
    ["keyKind", "logicalKey", "value"],
    ["expectedValueFingerprint"],
    "owner_index_key_invalid",
  );
  if (
    !keyKindValid(value.keyKind) ||
    !keyKindAllowed(indexKind, value.keyKind) ||
    !logicalKeyValid(value.keyKind, value.logicalKey) ||
    (indexKind !== "course_state" &&
      Object.prototype.hasOwnProperty.call(
        value,
        "expectedValueFingerprint",
      )) ||
    (value.expectedValueFingerprint !== undefined &&
      value.expectedValueFingerprint !== null &&
      (typeof value.expectedValueFingerprint !== "string" ||
        !HASH.test(value.expectedValueFingerprint)))
  ) {
    throw new Error("owner_index_key_invalid");
  }
  let detached = detachValue(value.value);
  if (indexKind === "course_state") {
    detached = detachValue(
      parseCourseStateValue(
        detached.value,
        accountScopeHash,
        value.logicalKey as string,
        "owner_index_key_invalid",
      ),
    );
  }
  return deepFreeze({
    valueBytes: detached.bytes,
    expectedValueFingerprint: value.expectedValueFingerprint as
      | string
      | null
      | undefined,
    entry: {
      schemaVersion: "learning-v2-owner-repository-index-entry.v1" as const,
      keyKind: value.keyKind,
      logicalKey: value.logicalKey,
      keyDigest: deriveOwnerRepositoryRadixKeyDigest({
        indexKind,
        keyKind: value.keyKind,
        logicalKey: value.logicalKey,
        digest,
      }),
      valueFingerprint: detached.fingerprint,
      value: detached.value,
    },
  });
};

const parseEntry = (
  input: unknown,
  accountScopeHash: string,
  indexKind: OwnerRepositoryIndexKind,
  digest?: OwnerRepositoryRadixDigest,
): OwnerRepositoryRadixEntryV1 => {
  if (
    !isRecord(input) ||
    !exactKeys(input, ENTRY_KEYS) ||
    input.schemaVersion !== "learning-v2-owner-repository-index-entry.v1" ||
    !keyKindValid(input.keyKind) ||
    !keyKindAllowed(indexKind, input.keyKind) ||
    !logicalKeyValid(input.keyKind, input.logicalKey) ||
    typeof input.keyDigest !== "string" ||
    typeof input.valueFingerprint !== "string" ||
    !HASH.test(input.valueFingerprint)
  ) {
    throw new Error("owner_index_indeterminate");
  }
  let detached: ReturnType<typeof detachValue>;
  let expectedDigest: string;
  try {
    detached = detachValue(input.value);
    if (indexKind === "course_state") {
      detached = detachValue(
        parseCourseStateValue(
          detached.value,
          accountScopeHash,
          input.logicalKey as string,
          "owner_index_indeterminate",
        ),
      );
    }
    expectedDigest = deriveOwnerRepositoryRadixKeyDigest({
      indexKind,
      keyKind: input.keyKind,
      logicalKey: input.logicalKey,
      digest,
    });
  } catch {
    throw new Error("owner_index_indeterminate");
  }
  if (
    input.keyDigest !== expectedDigest ||
    input.valueFingerprint !== detached.fingerprint
  ) {
    throw new Error("owner_index_indeterminate");
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-index-entry.v1" as const,
    keyKind: input.keyKind,
    logicalKey: input.logicalKey,
    keyDigest: expectedDigest,
    valueFingerprint: detached.fingerprint,
    value: detached.value,
  });
};

const parseCourseStateValue = (
  input: unknown,
  accountScopeHash: string,
  logicalKey: string,
  code: string,
): OwnerRepositoryCourseStateIndexValueV1 => {
  if (
    !isRecord(input) ||
    !exactKeys(input, COURSE_VALUE_KEYS) ||
    input.schemaVersion !== "learning-v2-owner-repository-course-entry.v1" ||
    input.courseIdentityFingerprint !== logicalKey ||
    !HASH.test(logicalKey) ||
    !isRecord(input.stateRef) ||
    !exactKeys(input.stateRef, COURSE_STATE_REF_KEYS) ||
    input.stateRef.schemaVersion !==
      "learning-v2-owner-repository-blob-ref.v1" ||
    input.stateRef.kind !== "course_unlock_state" ||
    typeof input.stateRef.blobFingerprint !== "string" ||
    !HASH.test(input.stateRef.blobFingerprint) ||
    input.stateRef.blobKey !==
      `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${input.stateRef.blobFingerprint}`
  ) {
    throw new Error(code);
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-course-entry.v1" as const,
    courseIdentityFingerprint: logicalKey,
    stateRef: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "course_unlock_state" as const,
      blobKey: input.stateRef.blobKey as string,
      blobFingerprint: input.stateRef.blobFingerprint,
    },
  });
};

const makeManifest = (
  accountScopeHash: string,
  indexKind: OwnerRepositoryIndexKind,
  entryCount: number,
  rootNodeRef: OwnerRepositoryRadixNodeRefV1 | null,
): OwnerRepositoryRadixManifestV2 =>
  deepFreeze({
    schemaVersion: "learning-v2-owner-repository-index-manifest.v2" as const,
    accountScopeHash,
    indexKind,
    keyDerivation: "owner-index-key.v1" as const,
    fanoutBits: OWNER_REPOSITORY_RADIX_FANOUT_BITS,
    leafCapacity: OWNER_REPOSITORY_RADIX_LEAF_CAPACITY,
    entryCount,
    rootNodeRef,
  });

const parseManifest = (
  input: unknown,
  accountScopeHash: string,
  indexKind: OwnerRepositoryIndexKind,
): {
  readonly manifest: OwnerRepositoryRadixManifestV2;
  readonly legacy: boolean;
} => {
  if (!ACCOUNT.test(accountScopeHash) || !indexKindValid(indexKind)) {
    throw new Error("owner_index_manifest_invalid");
  }
  let schemaVersion: unknown;
  try {
    if (!isRecord(input)) throw new Error("owner_index_manifest_invalid");
    const schema = Object.getOwnPropertyDescriptor(input, "schemaVersion");
    if (!schema || !("value" in schema) || !schema.enumerable)
      throw new Error("owner_index_manifest_invalid");
    schemaVersion = schema.value;
  } catch {
    throw new Error("owner_index_manifest_invalid");
  }
  if (schemaVersion === "learning-v2-owner-repository-index-manifest.v1") {
    let value: Readonly<Record<string, unknown>>;
    try {
      value = readDataRecord(
        input,
        MANIFEST_V1_KEYS,
        [],
        "owner_index_manifest_invalid",
      );
    } catch {
      throw new Error("owner_index_manifest_invalid");
    }
    let shards: readonly unknown[];
    try {
      shards = readDenseArray(value.shards, 0, "owner_index_manifest_invalid");
    } catch {
      throw new Error("owner_index_manifest_invalid");
    }
    if (
      value.indexKind !== indexKind ||
      value.shardBits !== 8 ||
      shards.length !== 0
    ) {
      throw new Error("owner_index_manifest_invalid");
    }
    return {
      manifest: makeManifest(accountScopeHash, indexKind, 0, null),
      legacy: true,
    };
  }
  let value: Readonly<Record<string, unknown>>;
  try {
    value = readDataRecord(
      input,
      MANIFEST_V2_KEYS,
      [],
      "owner_index_manifest_invalid",
    );
  } catch {
    throw new Error("owner_index_manifest_invalid");
  }
  if (
    value.schemaVersion !== "learning-v2-owner-repository-index-manifest.v2" ||
    value.accountScopeHash !== accountScopeHash ||
    value.indexKind !== indexKind ||
    value.keyDerivation !== "owner-index-key.v1" ||
    value.fanoutBits !== 8 ||
    value.leafCapacity !== 32 ||
    !safe(value.entryCount) ||
    (Number(value.entryCount) === 0) !== (value.rootNodeRef === null)
  ) {
    throw new Error("owner_index_manifest_invalid");
  }
  let rootNodeRef: OwnerRepositoryRadixNodeRefV1 | null;
  try {
    rootNodeRef =
      value.rootNodeRef === null
        ? null
        : parseRef(value.rootNodeRef, accountScopeHash);
  } catch {
    throw new Error("owner_index_manifest_invalid");
  }
  return {
    manifest: makeManifest(
      accountScopeHash,
      indexKind,
      Number(value.entryCount),
      rootNodeRef,
    ),
    legacy: false,
  };
};

const createNodeBlob = (
  accountScopeHash: string,
  node: RadixNode,
): OwnerRepositoryRadixBlob => {
  const envelope = {
    schemaVersion: "learning-v2-owner-repository-blob.v1",
    accountScopeHash,
    kind: "index_radix_node",
    payload: node,
  };
  try {
    assertPlainJsonIterative(envelope, "owner_index_node_overflow", {
      nodes: MAX_NODE_INPUT_NODES,
      depth: MAX_NODE_INPUT_DEPTH,
      stringUnits: MAX_NODE_INPUT_STRING_UNITS,
    });
  } catch {
    throw new Error("owner_index_node_overflow");
  }
  const encoded = canonicalJsonV1(envelope);
  if (utf8ByteLengthV1(encoded) > MAX_BLOB_BYTES)
    throw new Error("owner_index_node_overflow");
  const blobFingerprint = sha256Utf8(encoded);
  return deepFreeze({
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: "index_radix_node" as const,
      blobKey: blobKey(accountScopeHash, blobFingerprint),
      blobFingerprint,
    },
  });
};

const parseNode = (
  raw: unknown,
  ref: OwnerRepositoryRadixNodeRefV1,
  accountScopeHash: string,
  indexKind: OwnerRepositoryIndexKind,
  expectedDepth: number,
  expectedPrefix: string,
  expectedCount: number,
  digest?: OwnerRepositoryRadixDigest,
): RadixNode => {
  let envelope: unknown;
  try {
    if (
      typeof raw !== "string" ||
      utf8ByteLengthV1(raw) > MAX_BLOB_BYTES ||
      sha256Utf8(raw) !== ref.blobFingerprint
    )
      throw new Error("owner_index_indeterminate");
    envelope = JSON.parse(raw) as unknown;
    assertPlainJsonIterative(envelope, "owner_index_indeterminate", {
      nodes: MAX_NODE_INPUT_NODES,
      depth: MAX_NODE_INPUT_DEPTH,
      stringUnits: MAX_NODE_INPUT_STRING_UNITS,
    });
    if (canonicalJsonV1(envelope) !== raw)
      throw new Error("owner_index_indeterminate");
  } catch {
    throw new Error("owner_index_indeterminate");
  }
  if (
    !isRecord(envelope) ||
    !exactKeys(envelope, ENVELOPE_KEYS) ||
    envelope.schemaVersion !== "learning-v2-owner-repository-blob.v1" ||
    envelope.accountScopeHash !== accountScopeHash ||
    envelope.kind !== "index_radix_node" ||
    !isRecord(envelope.payload)
  ) {
    throw new Error("owner_index_indeterminate");
  }
  const payload = envelope.payload;
  if (payload.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
    if (
      !exactKeys(payload, LEAF_KEYS) ||
      payload.accountScopeHash !== accountScopeHash ||
      payload.indexKind !== indexKind ||
      payload.depthBytes !== expectedDepth ||
      payload.pathPrefix !== expectedPrefix ||
      !safe(payload.entryCount, OWNER_REPOSITORY_RADIX_LEAF_CAPACITY) ||
      payload.entryCount !== expectedCount ||
      !Array.isArray(payload.entries) ||
      payload.entries.length !== payload.entryCount
    ) {
      throw new Error("owner_index_indeterminate");
    }
    let entries: OwnerRepositoryRadixEntryV1[];
    try {
      entries = payload.entries.map((entry) =>
        parseEntry(entry, accountScopeHash, indexKind, digest),
      );
    } catch {
      throw new Error("owner_index_indeterminate");
    }
    if (
      entries.some((entry) => !entry.keyDigest.startsWith(expectedPrefix)) ||
      entries.some(
        (entry, index) =>
          index > 0 && entryOrder(entries[index - 1], entry) >= 0,
      ) ||
      entries.some(
        (entry, index) =>
          index > 0 &&
          entry.keyDigest === entries[index - 1].keyDigest &&
          !sameLogicalKey(entries[index - 1], entry),
      )
    ) {
      throw new Error("owner_index_indeterminate");
    }
    return deepFreeze({
      schemaVersion: "learning-v2-owner-repository-radix-leaf.v1" as const,
      accountScopeHash,
      indexKind,
      depthBytes: expectedDepth,
      pathPrefix: expectedPrefix,
      entryCount: entries.length,
      entries,
    });
  }
  if (
    payload.schemaVersion !== "learning-v2-owner-repository-radix-branch.v1" ||
    !exactKeys(payload, BRANCH_KEYS) ||
    payload.accountScopeHash !== accountScopeHash ||
    payload.indexKind !== indexKind ||
    payload.depthBytes !== expectedDepth ||
    payload.pathPrefix !== expectedPrefix ||
    !safe(payload.entryCount) ||
    payload.entryCount !== expectedCount ||
    expectedDepth >= OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES ||
    !Array.isArray(payload.children) ||
    payload.children.length < 1 ||
    payload.children.length > 256
  ) {
    throw new Error("owner_index_indeterminate");
  }
  const children = payload.children.map((child) => {
    if (
      !isRecord(child) ||
      !exactKeys(child, CHILD_KEYS) ||
      typeof child.edge !== "string" ||
      !BYTE.test(child.edge) ||
      !safe(child.entryCount) ||
      Number(child.entryCount) < 1
    ) {
      throw new Error("owner_index_indeterminate");
    }
    return deepFreeze({
      edge: child.edge,
      entryCount: Number(child.entryCount),
      nodeRef: parseRef(child.nodeRef, accountScopeHash),
    });
  });
  let childEntryCount = 0;
  for (const child of children)
    childEntryCount = checkedAdd(childEntryCount, child.entryCount);
  if (
    children.some(
      (child, index) => index > 0 && children[index - 1].edge >= child.edge,
    ) ||
    new Set(children.map((child) => child.nodeRef.blobFingerprint)).size !==
      children.length ||
    childEntryCount !== expectedCount
  ) {
    throw new Error("owner_index_indeterminate");
  }
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-radix-branch.v1" as const,
    accountScopeHash,
    indexKind,
    depthBytes: expectedDepth,
    pathPrefix: expectedPrefix,
    entryCount: expectedCount,
    children,
  });
};

const canonicalEntry = (entry: OwnerRepositoryRadixEntryV1): string =>
  canonicalJsonV1(entry);

export const lookupOwnerRepositoryRadix = async (input: {
  readonly accountScopeHash: string;
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly manifest: OwnerRepositoryRadixManifest;
  readonly keyKind: OwnerRepositoryIndexKeyKind;
  readonly logicalKey: string;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly digest?: OwnerRepositoryRadixDigest;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryRadixEntryV1 | undefined> => {
  const request = readDataRecord(
    input,
    [
      "accountScopeHash",
      "indexKind",
      "manifest",
      "keyKind",
      "logicalKey",
      "resolveNode",
    ],
    ["digest", "readBudget"],
    "owner_index_lookup_invalid",
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    !indexKindValid(request.indexKind) ||
    !keyKindValid(request.keyKind) ||
    typeof request.logicalKey !== "string" ||
    typeof request.resolveNode !== "function" ||
    (request.digest !== undefined && typeof request.digest !== "function")
  ) {
    throw new Error("owner_index_lookup_invalid");
  }
  const accountScopeHash = request.accountScopeHash;
  const indexKind = request.indexKind;
  const keyKind = request.keyKind;
  const logicalKey = request.logicalKey;
  const digest = request.digest as OwnerRepositoryRadixDigest | undefined;
  const readBudget = parseReadBudget(
    request.readBudget,
    DEFAULT_LOOKUP_READ_BUDGET,
  );
  const parsed = parseManifest(
    request.manifest,
    accountScopeHash,
    indexKind,
  ).manifest;
  const keyDigest = deriveOwnerRepositoryRadixKeyDigest({
    indexKind,
    keyKind,
    logicalKey,
    digest,
  });
  if (parsed.rootNodeRef === null) return undefined;
  const reader = createBudgetedNodeReader(
    request.resolveNode as OwnerRepositoryRadixNodeResolver,
    readBudget,
  );
  let ref = parsed.rootNodeRef;
  let depth = 0;
  let prefix = "";
  let count = parsed.entryCount;
  for (;;) {
    const raw = await reader.read(ref);
    if (raw === null) throw new Error("owner_index_indeterminate");
    const node = parseNode(
      raw,
      ref,
      accountScopeHash,
      indexKind,
      depth,
      prefix,
      count,
      digest,
    );
    if (node.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
      return node.entries.find(
        (entry) => entry.keyKind === keyKind && entry.logicalKey === logicalKey,
      );
    }
    const edge = keyDigest.slice(depth * 2, depth * 2 + 2);
    const child = node.children.find((candidate) => candidate.edge === edge);
    if (!child) return undefined;
    ref = child.nodeRef;
    count = child.entryCount;
    prefix += edge;
    depth += 1;
  }
};

export const planOwnerRepositoryRadixBatch = async (input: {
  readonly accountScopeHash: string;
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly manifest: OwnerRepositoryRadixManifest;
  readonly mutations: readonly OwnerRepositoryRadixMutation[];
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly digest?: OwnerRepositoryRadixDigest;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryRadixPlan> => {
  const request = readDataRecord(
    input,
    ["accountScopeHash", "indexKind", "manifest", "mutations", "resolveNode"],
    ["digest", "readBudget"],
    "owner_index_batch_invalid",
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    !indexKindValid(request.indexKind) ||
    typeof request.resolveNode !== "function" ||
    (request.digest !== undefined && typeof request.digest !== "function")
  ) {
    throw new Error("owner_index_batch_invalid");
  }
  const accountScopeHash = request.accountScopeHash;
  const indexKind = request.indexKind;
  const digest = request.digest as OwnerRepositoryRadixDigest | undefined;
  const mutationInputs = readDenseArray(
    request.mutations,
    OWNER_REPOSITORY_RADIX_MAX_BATCH_MUTATIONS,
    "owner_index_batch_invalid",
  );
  const parsedManifest = parseManifest(
    request.manifest,
    accountScopeHash,
    indexKind,
  );
  let batchValueBytes = 0;
  const normalized = mutationInputs.map((mutation) => {
    const result = normalizeEntry(
      accountScopeHash,
      indexKind,
      mutation,
      digest,
    );
    batchValueBytes = checkedAdd(batchValueBytes, result.valueBytes);
    if (batchValueBytes > OWNER_REPOSITORY_RADIX_MAX_BATCH_VALUE_BYTES) {
      throw new Error("owner_index_batch_value_overflow");
    }
    return result;
  });
  normalized.sort((left, right) => entryOrder(left.entry, right.entry));
  const unique: Array<{
    readonly entry: OwnerRepositoryRadixEntryV1;
    readonly expectedValueFingerprint: string | null | undefined;
  }> = [];
  for (const mutation of normalized) {
    const entry = mutation.entry;
    const previous = unique[unique.length - 1];
    if (
      previous &&
      previous.entry.keyDigest === entry.keyDigest &&
      !sameLogicalKey(previous.entry, entry)
    ) {
      throw new Error("owner_index_digest_collision");
    }
    if (previous && sameLogicalKey(previous.entry, entry)) {
      if (
        canonicalEntry(previous.entry) !== canonicalEntry(entry) ||
        previous.expectedValueFingerprint !== mutation.expectedValueFingerprint
      ) {
        throw new Error("owner_index_key_conflict");
      }
      continue;
    }
    unique.push({
      entry,
      expectedValueFingerprint: mutation.expectedValueFingerprint,
    });
  }

  const pending = new Map<string, OwnerRepositoryRadixBlob>();
  const reader = createBudgetedNodeReader(
    request.resolveNode as OwnerRepositoryRadixNodeResolver,
    parseReadBudget(request.readBudget, DEFAULT_PLAN_READ_BUDGET),
  );
  const storeNode = (node: RadixNode): OwnerRepositoryRadixNodeRefV1 => {
    const blob = createNodeBlob(accountScopeHash, node);
    pending.set(blob.ref.blobKey, blob);
    return blob.ref;
  };
  const tryMakeLeaf = (
    entries: readonly OwnerRepositoryRadixEntryV1[],
    depthBytes: number,
    pathPrefix: string,
  ):
    | { readonly ref: OwnerRepositoryRadixNodeRefV1; readonly count: number }
    | undefined => {
    const ordered = [...entries].sort(entryOrder);
    const node = deepFreeze({
      schemaVersion: "learning-v2-owner-repository-radix-leaf.v1" as const,
      accountScopeHash,
      indexKind,
      depthBytes,
      pathPrefix,
      entryCount: ordered.length,
      entries: ordered,
    });
    try {
      return { ref: storeNode(node), count: ordered.length };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "owner_index_node_overflow"
      )
        return undefined;
      throw error;
    }
  };
  const makeLeaf = (
    entries: readonly OwnerRepositoryRadixEntryV1[],
    depthBytes: number,
    pathPrefix: string,
  ): {
    readonly ref: OwnerRepositoryRadixNodeRefV1;
    readonly count: number;
  } => {
    const leaf = tryMakeLeaf(entries, depthBytes, pathPrefix);
    if (!leaf) throw new Error("owner_index_entry_overflow");
    return leaf;
  };
  const buildSubtree = (
    entries: readonly OwnerRepositoryRadixEntryV1[],
    depthBytes: number,
    pathPrefix: string,
  ): {
    readonly ref: OwnerRepositoryRadixNodeRefV1;
    readonly count: number;
  } => {
    const ordered = [...entries].sort(entryOrder);
    for (let index = 1; index < ordered.length; index += 1) {
      if (
        ordered[index - 1].keyDigest === ordered[index].keyDigest &&
        !sameLogicalKey(ordered[index - 1], ordered[index])
      ) {
        throw new Error("owner_index_digest_collision");
      }
    }
    if (ordered.length <= OWNER_REPOSITORY_RADIX_LEAF_CAPACITY) {
      const leaf = tryMakeLeaf(ordered, depthBytes, pathPrefix);
      if (leaf) return leaf;
      if (ordered.length === 1) throw new Error("owner_index_entry_overflow");
    }
    if (depthBytes >= OWNER_REPOSITORY_RADIX_MAX_DEPTH_BYTES) {
      throw new Error("owner_index_digest_collision");
    }
    const groups = new Map<string, OwnerRepositoryRadixEntryV1[]>();
    for (const entry of ordered) {
      const edge = entry.keyDigest.slice(depthBytes * 2, depthBytes * 2 + 2);
      const group = groups.get(edge) ?? [];
      group.push(entry);
      groups.set(edge, group);
    }
    const children = [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([edge, group]) => {
        const child = buildSubtree(group, depthBytes + 1, pathPrefix + edge);
        return deepFreeze({
          edge,
          entryCount: child.count,
          nodeRef: child.ref,
        });
      });
    const ref = storeNode(
      deepFreeze({
        schemaVersion: "learning-v2-owner-repository-radix-branch.v1" as const,
        accountScopeHash,
        indexKind,
        depthBytes,
        pathPrefix,
        entryCount: ordered.length,
        children,
      }),
    );
    return { ref, count: ordered.length };
  };
  const resolve = async (
    ref: OwnerRepositoryRadixNodeRefV1,
  ): Promise<unknown> => {
    const local = pending.get(ref.blobKey);
    if (local) return local.encoded;
    return reader.read(ref);
  };
  const insert = async (
    ref: OwnerRepositoryRadixNodeRefV1,
    count: number,
    depthBytes: number,
    pathPrefix: string,
    entry: OwnerRepositoryRadixEntryV1,
    expectedValueFingerprint: string | null | undefined,
  ): Promise<{
    readonly ref: OwnerRepositoryRadixNodeRefV1;
    readonly count: number;
    readonly changed: boolean;
  }> => {
    const raw = await resolve(ref);
    if (raw === null) throw new Error("owner_index_indeterminate");
    const node = parseNode(
      raw,
      ref,
      accountScopeHash,
      indexKind,
      depthBytes,
      pathPrefix,
      count,
      digest,
    );
    if (node.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
      const same = node.entries.find((candidate) =>
        sameLogicalKey(candidate, entry),
      );
      if (same) {
        if (
          expectedValueFingerprint === null ||
          (expectedValueFingerprint !== undefined &&
            same.valueFingerprint !== expectedValueFingerprint)
        ) {
          throw new Error("owner_index_expected_conflict");
        }
        if (canonicalEntry(same) === canonicalEntry(entry)) {
          return { ref, count, changed: false };
        }
        if (expectedValueFingerprint === undefined)
          throw new Error("owner_index_key_conflict");
        const rebuilt = buildSubtree(
          node.entries.map((candidate) =>
            sameLogicalKey(candidate, entry) ? entry : candidate,
          ),
          depthBytes,
          pathPrefix,
        );
        return { ...rebuilt, changed: true };
      }
      if (
        expectedValueFingerprint !== undefined &&
        expectedValueFingerprint !== null
      ) {
        throw new Error("owner_index_expected_conflict");
      }
      if (
        node.entries.some(
          (candidate) => candidate.keyDigest === entry.keyDigest,
        )
      ) {
        throw new Error("owner_index_digest_collision");
      }
      const rebuilt = buildSubtree(
        [...node.entries, entry],
        depthBytes,
        pathPrefix,
      );
      return { ...rebuilt, changed: true };
    }
    const edge = entry.keyDigest.slice(depthBytes * 2, depthBytes * 2 + 2);
    const childIndex = node.children.findIndex(
      (candidate) => candidate.edge === edge,
    );
    const children = [...node.children];
    let delta = 0;
    if (childIndex < 0) {
      if (
        expectedValueFingerprint !== undefined &&
        expectedValueFingerprint !== null
      ) {
        throw new Error("owner_index_expected_conflict");
      }
      const child = makeLeaf([entry], depthBytes + 1, pathPrefix + edge);
      children.push(
        deepFreeze({ edge, entryCount: child.count, nodeRef: child.ref }),
      );
      children.sort((left, right) => left.edge.localeCompare(right.edge));
      delta = 1;
    } else {
      const current = children[childIndex];
      const child = await insert(
        current.nodeRef,
        current.entryCount,
        depthBytes + 1,
        pathPrefix + edge,
        entry,
        expectedValueFingerprint,
      );
      if (!child.changed) return { ref, count, changed: false };
      delta = child.count - current.entryCount;
      children[childIndex] = deepFreeze({
        edge,
        entryCount: child.count,
        nodeRef: child.ref,
      });
    }
    const nextCount = checkedAdd(count, delta);
    const nextRef = storeNode(
      deepFreeze({
        schemaVersion: "learning-v2-owner-repository-radix-branch.v1" as const,
        accountScopeHash,
        indexKind,
        depthBytes,
        pathPrefix,
        entryCount: nextCount,
        children,
      }),
    );
    return { ref: nextRef, count: nextCount, changed: true };
  };

  let rootRef = parsedManifest.manifest.rootNodeRef;
  let entryCount = parsedManifest.manifest.entryCount;
  let logicalChange = false;
  for (const mutation of unique) {
    const { entry, expectedValueFingerprint } = mutation;
    if (rootRef === null) {
      if (
        expectedValueFingerprint !== undefined &&
        expectedValueFingerprint !== null
      ) {
        throw new Error("owner_index_expected_conflict");
      }
      const root = makeLeaf([entry], 0, "");
      rootRef = root.ref;
      entryCount = root.count;
      logicalChange = true;
      continue;
    }
    const result = await insert(
      rootRef,
      entryCount,
      0,
      "",
      entry,
      expectedValueFingerprint,
    );
    rootRef = result.ref;
    entryCount = result.count;
    logicalChange = logicalChange || result.changed;
  }
  if (rootRef !== null && unique.length === 0) {
    const raw = await resolve(rootRef);
    if (raw === null) throw new Error("owner_index_indeterminate");
    parseNode(
      raw,
      rootRef,
      accountScopeHash,
      indexKind,
      0,
      "",
      entryCount,
      digest,
    );
  }

  const reachable = new Set<string>();
  const stack: OwnerRepositoryRadixNodeRefV1[] =
    rootRef === null ? [] : [rootRef];
  while (stack.length > 0) {
    const ref = stack.pop()!;
    if (reachable.has(ref.blobKey)) continue;
    const blob = pending.get(ref.blobKey);
    if (!blob) continue;
    reachable.add(ref.blobKey);
    const envelope = JSON.parse(blob.encoded) as { payload: RadixNode };
    if (
      envelope.payload.schemaVersion ===
      "learning-v2-owner-repository-radix-branch.v1"
    ) {
      for (const child of envelope.payload.children) stack.push(child.nodeRef);
    }
  }
  const immutableBlobs = [...reachable]
    .map((key) => pending.get(key)!)
    .sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
  const manifest = makeManifest(
    accountScopeHash,
    indexKind,
    entryCount,
    rootRef,
  );
  return deepFreeze({
    manifest,
    immutableBlobs,
    changed: parsedManifest.legacy || logicalChange,
  });
};

/**
 * Bounded full-tree traversal. Cursors are in-process capabilities: their hashes are
 * deterministic audit evidence, not durable authority and not a resumable client token.
 */
export const auditOwnerRepositoryRadixPage = async (input: {
  readonly accountScopeHash: string;
  readonly indexKind: OwnerRepositoryIndexKind;
  readonly manifest: OwnerRepositoryRadixManifest;
  readonly cursor: OwnerRepositoryRadixAuditCursorV1 | null;
  readonly maxNodes: number;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly readBudget?: OwnerRepositoryRadixReadBudget;
}): Promise<OwnerRepositoryRadixAuditPageV1> => {
  const request = readDataRecord(
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
    "owner_index_audit_invalid",
  );
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    !indexKindValid(request.indexKind) ||
    !safe(request.maxNodes, MAX_AUDIT_PAGE_NODES) ||
    Number(request.maxNodes) < 1 ||
    typeof request.resolveNode !== "function"
  ) {
    throw new Error("owner_index_audit_invalid");
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  if (hasReadBudget && request.readBudget === undefined) {
    throw new Error("owner_index_read_budget_invalid");
  }
  const readBudget = parseReadBudget(
    hasReadBudget ? request.readBudget : undefined,
    DEFAULT_AUDIT_READ_BUDGET,
  );
  const accountScopeHash = request.accountScopeHash;
  const indexKind = request.indexKind;
  const parsedManifest = parseManifest(
    request.manifest,
    accountScopeHash,
    indexKind,
  ).manifest;
  const manifestFingerprint = sha256Utf8(canonicalJsonV1(parsedManifest));
  let stack: AuditFrame[];
  let visitedNodeCount: number;
  let visitedEntryCount: number;
  let accumulatorFingerprint: string;
  if (request.cursor === null) {
    stack =
      parsedManifest.rootNodeRef === null
        ? []
        : [
            {
              ref: parsedManifest.rootNodeRef,
              depth: 0,
              prefix: "",
              entryCount: parsedManifest.entryCount,
            },
          ];
    visitedNodeCount = 0;
    visitedEntryCount = 0;
    accumulatorFingerprint = hashCanonicalBody({
      schemaVersion: "learning-v2-owner-repository-radix-audit-seed.v1",
      accountScopeHash,
      indexKind,
      manifestFingerprint,
      expectedEntryCount: parsedManifest.entryCount,
    });
  } else {
    if (!isRecord(request.cursor) || !AUDIT_CURSORS.has(request.cursor)) {
      throw new Error("owner_index_audit_invalid");
    }
    const cursor = request.cursor as unknown as InternalAuditCursor;
    if (
      cursor.accountScopeHash !== accountScopeHash ||
      cursor.indexKind !== indexKind ||
      cursor.manifestFingerprint !== manifestFingerprint ||
      cursor.expectedEntryCount !== parsedManifest.entryCount ||
      !safe(cursor.visitedNodeCount) ||
      !safe(cursor.visitedEntryCount) ||
      typeof cursor.accumulatorFingerprint !== "string" ||
      !HASH.test(cursor.accumulatorFingerprint) ||
      !Array.isArray(cursor.stack)
    ) {
      throw new Error("owner_index_audit_invalid");
    }
    stack = [...cursor.stack];
    visitedNodeCount = cursor.visitedNodeCount;
    visitedEntryCount = cursor.visitedEntryCount;
    accumulatorFingerprint = cursor.accumulatorFingerprint;
  }
  const reader = createBudgetedNodeReader(
    request.resolveNode as OwnerRepositoryRadixNodeResolver,
    readBudget,
  );
  const entries: OwnerRepositoryRadixEntryV1[] = [];
  let visitedNodesThisPage = 0;
  let visitedEntriesThisPage = 0;
  while (stack.length > 0 && visitedNodesThisPage < Number(request.maxNodes)) {
    const frame = stack.pop()!;
    const raw = await reader.read(frame.ref);
    if (raw === null) throw new Error("owner_index_indeterminate");
    const node = parseNode(
      raw,
      frame.ref,
      accountScopeHash,
      indexKind,
      frame.depth,
      frame.prefix,
      frame.entryCount,
    );
    visitedNodeCount = checkedAdd(visitedNodeCount, 1);
    visitedNodesThisPage += 1;
    if (node.schemaVersion === "learning-v2-owner-repository-radix-leaf.v1") {
      visitedEntryCount = checkedAdd(visitedEntryCount, node.entryCount);
      visitedEntriesThisPage = checkedAdd(
        visitedEntriesThisPage,
        node.entryCount,
      );
      entries.push(...node.entries);
    } else {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        const child = node.children[index];
        stack.push({
          ref: child.nodeRef,
          depth: frame.depth + 1,
          prefix: `${frame.prefix}${child.edge}`,
          entryCount: child.entryCount,
        });
      }
    }
    accumulatorFingerprint = hashCanonicalBody({
      schemaVersion: "learning-v2-owner-repository-radix-audit-step.v1",
      previousAccumulatorFingerprint: accumulatorFingerprint,
      nodeFingerprint: frame.ref.blobFingerprint,
      depthBytes: frame.depth,
      pathPrefix: frame.prefix,
      entryCount: frame.entryCount,
      visitedNodeCount,
      visitedEntryCount,
    });
  }
  const done = stack.length === 0;
  if (done && visitedEntryCount !== parsedManifest.entryCount) {
    throw new Error("owner_index_indeterminate");
  }
  let cursor: InternalAuditCursor | null = null;
  if (!done) {
    cursor = deepFreeze({
      schemaVersion:
        "learning-v2-owner-repository-radix-audit-cursor.v1" as const,
      accountScopeHash,
      indexKind,
      manifestFingerprint,
      expectedEntryCount: parsedManifest.entryCount,
      visitedNodeCount,
      visitedEntryCount,
      accumulatorFingerprint,
      authority: "in_process_audit_cursor" as const,
      stack,
    });
    AUDIT_CURSORS.add(cursor);
  }
  return deepFreeze({
    done,
    cursor,
    entries,
    visitedNodesThisPage,
    visitedEntriesThisPage,
    visitedNodeCount,
    visitedEntryCount,
    externalReads: reader.externalReads,
    externalBytes: reader.externalBytes,
    accumulatorFingerprint,
  });
};

export const isOwnerRepositoryRadixAuditCursor = (
  value: unknown,
): value is OwnerRepositoryRadixAuditCursorV1 =>
  isRecord(value) && AUDIT_CURSORS.has(value);
