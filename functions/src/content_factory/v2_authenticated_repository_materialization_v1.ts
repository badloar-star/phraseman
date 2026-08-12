import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1,
  V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1,
  encodeV2AuthenticatedRepositoryReadBundleV1,
  v2LanguageProfileLifecycleDocumentPathV1,
  v2LanguageProfileObjectPathV1,
  v2LanguageProfileVersionDocumentPathV1,
  v2ModeTemplateLifecycleDocumentPathV1,
  v2ModeTemplateObjectPathV1,
  v2ModeTemplateVersionDocumentPathV1,
  type V2AuthenticatedRepositoryBundleEntryInputV1,
  type V2AuthenticatedRepositoryBundleManifestV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import {
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
} from "./v2_firebase_repository_trust_root_v1";
import type {
  V2FirebaseAdminRepositoryHeadSnapshotV1,
  V2FirebaseAdminRepositoryObjectReadV1,
} from "./v2_firebase_admin_repository_io_v1";
import {
  isV2RepositoryCapabilityObservationReceiptV1,
  observeV2ActivityRepositoryCapabilityV1,
  V2_REPOSITORY_CAPABILITY_RECEIPT_MAX_BYTES_V1,
  type V2RepositoryCapabilityObservationReaderV1,
  type V2RepositoryCapabilityObservationReceiptV1,
  type V2RepositoryCapabilityRequirementV1,
  type V2RepositoryObjectReadPermitV1,
} from "./v2_repository_capability_observation_v1";
import type { V2RepositorySingleflightIdentityV1 } from "./v2_repository_singleflight_state_v1";

export const V2_AUTHENTICATED_REPOSITORY_MATERIALIZATION_IDENTITY_SCHEMA_V1 =
  "v2-authenticated-repository-materialization-identity.v1" as const;
export const V2_AUTHENTICATED_REPOSITORY_SNAPSHOT_MATERIALIZATION_SCHEMA_V1 =
  "v2-authenticated-repository-snapshot-materialization.v1" as const;
export const V2_AUTHENTICATED_REPOSITORY_COLD_REPLAY_VERIFICATION_SCHEMA_V1 =
  "v2-authenticated-repository-cold-replay-verification.v1" as const;

const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/;
const RESERVED_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);

type JsonRecord = Record<string, unknown>;

export interface V2AuthenticatedRepositoryMaterializationIdentityV1 extends V2RepositorySingleflightIdentityV1 {
  readonly schemaVersion: typeof V2_AUTHENTICATED_REPOSITORY_MATERIALIZATION_IDENTITY_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly requirementAggregateFingerprint: string;
  readonly identityFingerprint: string;
}

export type V2AuthenticatedRepositoryCoherentSnapshotRowV1 =
  V2AuthenticatedRepositoryBundleEntryInputV1;

export interface V2AuthenticatedRepositoryObjectReadRequestV1 {
  readonly requirement: V2AuthenticatedRepositoryRequirementV1;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly declaredByteSize: number;
  readonly maximumBytes: number;
}

export interface V2AuthenticatedRepositoryColdReplayVerificationV1 {
  readonly schemaVersion: typeof V2_AUTHENTICATED_REPOSITORY_COLD_REPLAY_VERIFICATION_SCHEMA_V1;
  readonly rows: readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[];
  readonly observation: V2RepositoryCapabilityObservationReceiptV1;
  readonly currentReadTime: Readonly<{ seconds: string; nanoseconds: number }>;
  readonly verificationFingerprint: string;
}

export interface V2AuthenticatedRepositorySnapshotMaterializationV1 {
  readonly schemaVersion: typeof V2_AUTHENTICATED_REPOSITORY_SNAPSHOT_MATERIALIZATION_SCHEMA_V1;
  readonly identity: V2AuthenticatedRepositoryMaterializationIdentityV1;
  readonly observation: V2RepositoryCapabilityObservationReceiptV1;
  readonly observationLogicalFingerprint: string;
  readonly observationBodyRaw: string;
  readonly observationBodyRawHash: string;
  readonly observationFullRaw: string;
  readonly observationFullRawHash: string;
  readonly bundleManifest: V2AuthenticatedRepositoryBundleManifestV1;
  readonly bundleManifestLogicalFingerprint: string;
  readonly bundleManifestBodyRaw: string;
  readonly bundleManifestBodyRawHash: string;
  readonly bundleManifestFullRaw: string;
  readonly bundleManifestFullRawHash: string;
  readonly bundleBlob: Uint8Array;
  readonly bundleBlobHash: string;
  readonly bundleBlobByteSize: number;
  readonly bundleManifestMaximumBytes: number;
  readonly bundleBlobMaximumBytes: number;
}

const identityHandles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function byteEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function parseTimestamp(
  value: unknown,
  code: string,
): Readonly<{ seconds: string; nanoseconds: number }> {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["seconds", "nanoseconds"]) ||
    typeof value.seconds !== "string" ||
    !/^(0|[1-9][0-9]{0,11})$/.test(value.seconds) ||
    !Number.isSafeInteger(value.nanoseconds) ||
    Number(value.nanoseconds) < 0 ||
    Number(value.nanoseconds) > 999_999_999
  ) {
    fail(code);
  }
  return Object.freeze({
    seconds: value.seconds,
    nanoseconds: Number(value.nanoseconds),
  });
}

function compareTimestamp(
  left: Readonly<{ seconds: string; nanoseconds: number }>,
  right: Readonly<{ seconds: string; nanoseconds: number }>,
): number {
  const seconds = Number(left.seconds) - Number(right.seconds);
  return seconds === 0 ? left.nanoseconds - right.nanoseconds : seconds;
}

function timestampEqual(
  left: Readonly<{ seconds: string; nanoseconds: number }>,
  right: Readonly<{ seconds: string; nanoseconds: number }>,
): boolean {
  return (
    left.seconds === right.seconds && left.nanoseconds === right.nanoseconds
  );
}

function parseCanonicalBytes(
  bytes: unknown,
  maximumBytes: number,
  code: string,
): Readonly<{ bytes: Uint8Array; raw: string; value: JsonRecord }> {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength < 1 ||
    bytes.byteLength > maximumBytes
  ) {
    fail(code);
  }
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(code);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw) as unknown;
  } catch {
    fail(code);
  }
  const work: { value: unknown; depth: number }[] = [
    { value: decoded, depth: 0 },
  ];
  let nodes = 0;
  let arrayEntries = 0;
  while (work.length > 0) {
    const current = work.pop()!;
    nodes += 1;
    if (nodes > 50_000 || current.depth > 24) fail(code);
    const child = current.value;
    if (typeof child === "string") {
      if (child.length > 128 * 1024 || child.normalize("NFC") !== child)
        fail(code);
      continue;
    }
    if (child === null || typeof child === "boolean") continue;
    if (typeof child === "number") {
      if (
        !Number.isFinite(child) ||
        Object.is(child, -0) ||
        (Number.isInteger(child) && !Number.isSafeInteger(child))
      )
        fail(code);
      continue;
    }
    if (Array.isArray(child)) {
      arrayEntries += child.length;
      if (arrayEntries > 20_000) fail(code);
      for (const entry of child)
        work.push({ value: entry, depth: current.depth + 1 });
      continue;
    }
    if (!isRecord(child)) fail(code);
    const keys = Object.keys(child);
    if (
      keys.length > 128 ||
      keys.some(
        (key) => RESERVED_JSON_KEYS.has(key) || key.normalize("NFC") !== key,
      )
    )
      fail(code);
    for (const key of keys)
      work.push({ value: child[key], depth: current.depth + 1 });
  }
  if (!isRecord(decoded) || canonicalJsonV1(decoded) !== raw) fail(code);
  return Object.freeze({ bytes: new Uint8Array(bytes), raw, value: decoded });
}

function requirementKey(
  requirement:
    | V2AuthenticatedRepositoryRequirementV1
    | V2RepositoryCapabilityRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? `language_profile:${requirement.profileId}:v${requirement.version}:${requirement.contentHash}`
    : `published_template:${requirement.templateId}:v${requirement.version}:${requirement.contentHash}`;
}

function planRepositoryRequirements(
  plan: V2CanonicalSeasonPlanV2,
): readonly V2AuthenticatedRepositoryRequirementV1[] {
  const requirements: V2AuthenticatedRepositoryRequirementV1[] = [];
  for (const entry of plan.externalRequirementCatalog) {
    const requirement = entry.requirement;
    if (requirement.dependencyType === "language_profile") {
      requirements.push(
        Object.freeze({
          dependencyType: "language_profile" as const,
          profileId: requirement.profileId,
          version: requirement.version,
          contentHash: requirement.contentHash,
        }),
      );
    }
    if (requirement.dependencyType === "published_template") {
      requirements.push(
        Object.freeze({
          dependencyType: "published_template" as const,
          templateId: requirement.templateId,
          version: requirement.version,
          contentHash: requirement.contentHash,
        }),
      );
    }
  }
  return Object.freeze(
    requirements.sort((left, right) =>
      compareCodePoint(requirementKey(left), requirementKey(right)),
    ),
  );
}

function requirementPaths(requirement: V2AuthenticatedRepositoryRequirementV1) {
  return requirement.dependencyType === "language_profile"
    ? Object.freeze({
        versionDocumentPath: v2LanguageProfileVersionDocumentPathV1(
          requirement.profileId,
          requirement.version,
        ),
        lifecycleDocumentPath: v2LanguageProfileLifecycleDocumentPathV1(
          requirement.profileId,
          requirement.version,
        ),
        objectPath: v2LanguageProfileObjectPathV1(
          requirement.profileId,
          requirement.version,
          requirement.contentHash,
        ),
      })
    : Object.freeze({
        versionDocumentPath: v2ModeTemplateVersionDocumentPathV1(
          requirement.templateId,
          requirement.version,
        ),
        lifecycleDocumentPath: v2ModeTemplateLifecycleDocumentPathV1(
          requirement.templateId,
          requirement.version,
        ),
        objectPath: v2ModeTemplateObjectPathV1(
          requirement.templateId,
          requirement.version,
          requirement.contentHash,
        ),
      });
}

interface NormalizedHeadEntry {
  readonly requirement: V2AuthenticatedRepositoryRequirementV1;
  readonly versionDocumentPath: string;
  readonly lifecycleDocumentPath: string;
  readonly recordBytes: Uint8Array;
  readonly lifecycleBytes: Uint8Array;
  readonly recordValue: JsonRecord;
  readonly lifecycleValue: JsonRecord;
  readonly recordUpdateTime: Readonly<{ seconds: string; nanoseconds: number }>;
  readonly lifecycleUpdateTime: Readonly<{
    seconds: string;
    nanoseconds: number;
  }>;
}

function normalizeHeadSnapshot(
  plan: V2CanonicalSeasonPlanV2,
  snapshot: V2FirebaseAdminRepositoryHeadSnapshotV1,
): Readonly<{
  readTime: Readonly<{ seconds: string; nanoseconds: number }>;
  entries: readonly NormalizedHeadEntry[];
}> {
  if (
    !isRecord(snapshot) ||
    !exactKeys(snapshot, ["readTime", "entries"]) ||
    !Array.isArray(snapshot.entries)
  ) {
    fail("v2_authenticated_repository_head_snapshot_invalid");
  }
  const requirements = planRepositoryRequirements(plan);
  if (snapshot.entries.length !== requirements.length)
    fail("v2_authenticated_repository_head_snapshot_count_invalid");
  const readTime = parseTimestamp(
    snapshot.readTime,
    "v2_authenticated_repository_head_snapshot_timestamp_invalid",
  );
  const entries = snapshot.entries.map((entry, index) => {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, [
        "requirement",
        "versionDocumentPath",
        "lifecycleDocumentPath",
        "recordBytes",
        "lifecycleBytes",
        "recordUpdateTime",
        "lifecycleUpdateTime",
      ])
    ) {
      fail("v2_authenticated_repository_head_snapshot_entry_invalid");
    }
    const requirement = requirements[index]!;
    if (
      requirementKey(entry.requirement as never) !== requirementKey(requirement)
    )
      fail("v2_authenticated_repository_head_snapshot_order_invalid");
    const paths = requirementPaths(requirement);
    if (
      entry.versionDocumentPath !== paths.versionDocumentPath ||
      entry.lifecycleDocumentPath !== paths.lifecycleDocumentPath
    ) {
      fail("v2_authenticated_repository_head_snapshot_path_invalid");
    }
    const record = parseCanonicalBytes(
      entry.recordBytes,
      V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1,
      "v2_authenticated_repository_head_record_invalid",
    );
    const lifecycle = parseCanonicalBytes(
      entry.lifecycleBytes,
      V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1,
      "v2_authenticated_repository_head_lifecycle_invalid",
    );
    const recordUpdateTime = parseTimestamp(
      entry.recordUpdateTime,
      "v2_authenticated_repository_head_snapshot_timestamp_invalid",
    );
    const lifecycleUpdateTime = parseTimestamp(
      entry.lifecycleUpdateTime,
      "v2_authenticated_repository_head_snapshot_timestamp_invalid",
    );
    if (
      compareTimestamp(recordUpdateTime, readTime) > 0 ||
      compareTimestamp(lifecycleUpdateTime, readTime) > 0
    ) {
      fail("v2_authenticated_repository_head_snapshot_time_incoherent");
    }
    return Object.freeze({
      requirement,
      versionDocumentPath: paths.versionDocumentPath,
      lifecycleDocumentPath: paths.lifecycleDocumentPath,
      recordBytes: record.bytes,
      lifecycleBytes: lifecycle.bytes,
      recordValue: record.value,
      lifecycleValue: lifecycle.value,
      recordUpdateTime,
      lifecycleUpdateTime,
    });
  });
  return Object.freeze({ readTime, entries: Object.freeze(entries) });
}

function recordPermit(
  entry: NormalizedHeadEntry,
): V2AuthenticatedRepositoryObjectReadRequestV1 {
  const requirement = entry.requirement;
  const idKey =
    requirement.dependencyType === "language_profile"
      ? "profileId"
      : "templateId";
  const id =
    requirement.dependencyType === "language_profile"
      ? requirement.profileId
      : requirement.templateId;
  const schemaVersion =
    requirement.dependencyType === "language_profile"
      ? "v2-language-profile-record.v1"
      : "v2-mode-template-record.v1";
  const record = entry.recordValue;
  if (
    !exactKeys(record, [
      "schemaVersion",
      idKey,
      "version",
      "contentHash",
      "object",
      "provenance",
      "createdAt",
    ]) ||
    record.schemaVersion !== schemaVersion ||
    record[idKey] !== id ||
    record.version !== requirement.version ||
    record.contentHash !== requirement.contentHash ||
    !isRecord(record.object) ||
    !exactKeys(record.object, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
    ])
  ) {
    fail("v2_authenticated_repository_record_permit_invalid");
  }
  const paths = requirementPaths(requirement);
  const maximumBytes =
    requirement.dependencyType === "language_profile"
      ? V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1
      : V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1;
  if (
    record.object.objectPath !== paths.objectPath ||
    record.object.contentHash !== requirement.contentHash ||
    typeof record.object.objectGeneration !== "string" ||
    !GENERATION_RE.test(record.object.objectGeneration) ||
    !Number.isSafeInteger(record.object.byteSize) ||
    Number(record.object.byteSize) < 1 ||
    Number(record.object.byteSize) > maximumBytes
  ) {
    fail("v2_authenticated_repository_record_permit_invalid");
  }
  return Object.freeze({
    requirement,
    objectPath: paths.objectPath,
    contentHash: requirement.contentHash,
    objectGeneration: record.object.objectGeneration,
    declaredByteSize: Number(record.object.byteSize),
    maximumBytes,
  });
}

export function deriveV2AuthenticatedRepositoryObjectReadRequestsV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly beforeSnapshot: V2FirebaseAdminRepositoryHeadSnapshotV1;
}): readonly V2AuthenticatedRepositoryObjectReadRequestV1[] {
  if (
    !isRecord(input) ||
    !exactKeys(input, ["plan", "beforeSnapshot"]) ||
    !isV2CanonicalSeasonPlanV2(input.plan)
  ) {
    fail("v2_authenticated_repository_object_read_request_input_invalid");
  }
  const snapshot = normalizeHeadSnapshot(input.plan, input.beforeSnapshot);
  return Object.freeze(snapshot.entries.map(recordPermit));
}

export function assembleV2AuthenticatedRepositorySnapshotRowsV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly beforeSnapshot: V2FirebaseAdminRepositoryHeadSnapshotV1;
  readonly objects: readonly V2FirebaseAdminRepositoryObjectReadV1[];
  readonly afterSnapshot: V2FirebaseAdminRepositoryHeadSnapshotV1;
}): readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[] {
  if (
    !isRecord(input) ||
    !exactKeys(input, ["plan", "beforeSnapshot", "objects", "afterSnapshot"]) ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    !Array.isArray(input.objects)
  ) {
    fail("v2_authenticated_repository_snapshot_assembly_input_invalid");
  }
  const before = normalizeHeadSnapshot(input.plan, input.beforeSnapshot);
  const after = normalizeHeadSnapshot(input.plan, input.afterSnapshot);
  if (compareTimestamp(before.readTime, after.readTime) > 0)
    fail("v2_authenticated_repository_snapshot_read_time_invalid");
  if (input.objects.length !== before.entries.length)
    fail("v2_authenticated_repository_snapshot_object_count_invalid");
  const rows = before.entries.map((beforeEntry, index) => {
    const afterEntry = after.entries[index]!;
    const object = input.objects[index];
    if (
      !isRecord(object) ||
      !exactKeys(object, [
        "requirement",
        "objectPath",
        "objectGeneration",
        "byteSize",
        "contentHash",
        "bytes",
      ])
    ) {
      fail("v2_authenticated_repository_snapshot_object_invalid");
    }
    const permit = recordPermit(beforeEntry);
    if (
      requirementKey(afterEntry.requirement) !==
        requirementKey(beforeEntry.requirement) ||
      !byteEqual(beforeEntry.recordBytes, afterEntry.recordBytes) ||
      !byteEqual(beforeEntry.lifecycleBytes, afterEntry.lifecycleBytes) ||
      !timestampEqual(
        beforeEntry.recordUpdateTime,
        afterEntry.recordUpdateTime,
      ) ||
      !timestampEqual(
        beforeEntry.lifecycleUpdateTime,
        afterEntry.lifecycleUpdateTime,
      )
    ) {
      fail("v2_authenticated_repository_snapshot_head_drift");
    }
    if (
      requirementKey(object.requirement as never) !==
        requirementKey(beforeEntry.requirement) ||
      object.objectPath !== permit.objectPath ||
      object.objectGeneration !== permit.objectGeneration ||
      object.contentHash !== permit.contentHash ||
      object.byteSize !== permit.declaredByteSize ||
      !(object.bytes instanceof Uint8Array) ||
      object.bytes.byteLength !== permit.declaredByteSize ||
      object.bytes.byteLength > permit.maximumBytes ||
      sha256Bytes(object.bytes) !== permit.contentHash
    ) {
      fail("v2_authenticated_repository_snapshot_object_mismatch");
    }
    return Object.freeze({
      requirement: beforeEntry.requirement,
      evidence: Object.freeze({
        requirementKey:
          beforeEntry.requirement.dependencyType === "language_profile"
            ? `language_profile:${beforeEntry.requirement.profileId}:v${beforeEntry.requirement.version}`
            : `published_template:${beforeEntry.requirement.templateId}:v${beforeEntry.requirement.version}`,
        versionDocumentPath: beforeEntry.versionDocumentPath,
        lifecycleDocumentPath: beforeEntry.lifecycleDocumentPath,
        firestoreDocumentEncoding:
          "firestore_document_data_canonical_json_utf8.v1" as const,
        recordBeforeUpdateTime: beforeEntry.recordUpdateTime,
        recordAfterUpdateTime: afterEntry.recordUpdateTime,
        lifecycleBeforeUpdateTime: beforeEntry.lifecycleUpdateTime,
        lifecycleAfterUpdateTime: afterEntry.lifecycleUpdateTime,
        beforeReadTime: before.readTime,
        afterReadTime: after.readTime,
        storageBucket: V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.bucketName,
        objectPath: permit.objectPath,
        objectGeneration: permit.objectGeneration,
        objectEncoding:
          "firebase_storage_object_raw_canonical_json_utf8.v1" as const,
      }),
      recordBefore: new Uint8Array(beforeEntry.recordBytes),
      lifecycleBefore: new Uint8Array(beforeEntry.lifecycleBytes),
      object: new Uint8Array(object.bytes),
      recordAfter: new Uint8Array(afterEntry.recordBytes),
      lifecycleAfter: new Uint8Array(afterEntry.lifecycleBytes),
    });
  });
  // Reuse the bounded canonical codec as the final independent row defense.
  encodeV2AuthenticatedRepositoryReadBundleV1(rows);
  return Object.freeze(rows);
}

export function deriveV2AuthenticatedRepositoryMaterializationIdentityV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly resolverContractFingerprint: string;
}): V2AuthenticatedRepositoryMaterializationIdentityV1 {
  if (
    !isRecord(input) ||
    !exactKeys(input, ["plan", "resolverContractFingerprint"]) ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    typeof input.resolverContractFingerprint !== "string" ||
    !HASH_RE.test(input.resolverContractFingerprint)
  ) {
    fail("v2_authenticated_repository_materialization_identity_invalid");
  }
  const requirements = planRepositoryRequirements(input.plan);
  const requirementAggregateFingerprint = hashCanonicalBody(requirements);
  const repositoryScopeFingerprint = hashCanonicalBody({
    schemaVersion: "v2-repository-plan-global-scope.v1",
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    namespaceFingerprint: V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
    requirementAggregateFingerprint,
  });
  const requestFingerprint = hashCanonicalBody({
    schemaVersion: "v2-repository-materialization-request.v1",
    planFingerprint: input.plan.planFingerprint,
    repositoryScopeFingerprint,
    resolverContractFingerprint: input.resolverContractFingerprint,
  });
  const body = Object.freeze({
    schemaVersion:
      V2_AUTHENTICATED_REPOSITORY_MATERIALIZATION_IDENTITY_SCHEMA_V1,
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    repositoryScopeFingerprint,
    resolverContractFingerprint: input.resolverContractFingerprint,
    requestFingerprint,
    namespaceFingerprint: V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
    requirementAggregateFingerprint,
  });
  const identity = Object.freeze({
    ...body,
    identityFingerprint: hashCanonicalBody(body),
  });
  identityHandles.add(identity);
  return identity;
}

export function isV2AuthenticatedRepositoryMaterializationIdentityV1(
  value: unknown,
): value is V2AuthenticatedRepositoryMaterializationIdentityV1 {
  return isRecord(value) && identityHandles.has(value);
}

function exactSnapshotRows(
  plan: V2CanonicalSeasonPlanV2,
  rows: readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[],
): readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[] {
  if (!Array.isArray(rows))
    fail("v2_authenticated_repository_snapshot_invalid");
  const expected = planRepositoryRequirements(plan);
  if (rows.length !== expected.length)
    fail("v2_authenticated_repository_snapshot_requirement_mismatch");
  const sorted = [...rows].sort((left, right) =>
    compareCodePoint(
      requirementKey(left.requirement),
      requirementKey(right.requirement),
    ),
  );
  const actualKeys = sorted.map((row) => requirementKey(row.requirement));
  const expectedKeys = expected.map(requirementKey);
  if (
    new Set(actualKeys).size !== actualKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    fail("v2_authenticated_repository_snapshot_requirement_mismatch");
  }
  return Object.freeze(sorted);
}

function replayReader(
  rows: readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[],
): V2RepositoryCapabilityObservationReaderV1 {
  const byRequirement = new Map(
    rows.map((row) => [requirementKey(row.requirement), row] as const),
  );
  const rowFor = (
    requirement: V2RepositoryCapabilityRequirementV1,
  ): V2AuthenticatedRepositoryCoherentSnapshotRowV1 => {
    const row = byRequirement.get(requirementKey(requirement));
    if (!row) fail("v2_authenticated_repository_snapshot_requirement_missing");
    return row;
  };
  const boundedClone = (
    bytes: Uint8Array,
    maximumBytes: number,
  ): Uint8Array => {
    if (
      !(bytes instanceof Uint8Array) ||
      bytes.byteLength < 1 ||
      bytes.byteLength > maximumBytes
    ) {
      fail("v2_authenticated_repository_snapshot_byte_size_invalid");
    }
    return new Uint8Array(bytes);
  };
  const reader: V2RepositoryCapabilityObservationReaderV1 = {
    readRecord: async (requirement, phase, maximumBytes) => {
      const row = rowFor(requirement);
      return boundedClone(
        phase === "before" ? row.recordBefore : row.recordAfter,
        maximumBytes,
      );
    },
    readLifecycle: async (requirement, phase, maximumBytes) => {
      const row = rowFor(requirement);
      return boundedClone(
        phase === "before" ? row.lifecycleBefore : row.lifecycleAfter,
        maximumBytes,
      );
    },
    readObject: async (permit: V2RepositoryObjectReadPermitV1) => {
      const row = rowFor(permit.requirement);
      if (
        permit.objectPath !== row.evidence.objectPath ||
        permit.contentHash !== row.requirement.contentHash ||
        permit.objectGeneration !== row.evidence.objectGeneration ||
        permit.declaredByteSize !== row.object.byteLength
      ) {
        fail("v2_authenticated_repository_snapshot_object_pin_mismatch");
      }
      return Object.freeze({
        bytes: boundedClone(row.object, permit.maxBytes),
        contentHash: row.requirement.contentHash,
        objectGeneration: row.evidence.objectGeneration,
      });
    },
  };
  return Object.freeze(reader);
}

export async function materializeV2AuthenticatedRepositorySnapshotV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly identity: V2AuthenticatedRepositoryMaterializationIdentityV1;
  readonly rows: readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[];
}): Promise<V2AuthenticatedRepositorySnapshotMaterializationV1> {
  if (
    !isRecord(input) ||
    !exactKeys(input, ["plan", "identity", "rows"]) ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    !isV2AuthenticatedRepositoryMaterializationIdentityV1(input.identity) ||
    input.identity.planFingerprint !== input.plan.planFingerprint ||
    input.identity.courseContractFingerprint !==
      input.plan.courseContract.courseContractFingerprint
  ) {
    fail("v2_authenticated_repository_snapshot_materialization_invalid");
  }
  const expectedIdentity =
    deriveV2AuthenticatedRepositoryMaterializationIdentityV1({
      plan: input.plan,
      resolverContractFingerprint: input.identity.resolverContractFingerprint,
    });
  if (
    expectedIdentity.identityFingerprint !== input.identity.identityFingerprint
  )
    fail("v2_authenticated_repository_materialization_identity_mismatch");
  const rows = exactSnapshotRows(input.plan, input.rows);
  const observation = await observeV2ActivityRepositoryCapabilityV1({
    plan: input.plan,
    reader: replayReader(rows),
  });
  if (!isV2RepositoryCapabilityObservationReceiptV1(observation))
    fail("v2_authenticated_repository_observation_materialization_invalid");
  const bundle = encodeV2AuthenticatedRepositoryReadBundleV1(rows);
  const {
    receiptFingerprint: observationLogicalFingerprint,
    ...observationBody
  } = observation;
  const observationBodyRaw = canonicalJsonV1(observationBody);
  const observationFullRaw = canonicalJsonV1(observation);
  const {
    manifestFingerprint: bundleManifestLogicalFingerprint,
    ...manifestBody
  } = bundle.manifest;
  const bundleManifestBodyRaw = canonicalJsonV1(manifestBody);
  if (
    sha256Utf8(observationBodyRaw) !== observationLogicalFingerprint ||
    sha256Utf8(bundleManifestBodyRaw) !== bundleManifestLogicalFingerprint
  ) {
    fail("v2_authenticated_repository_logical_fingerprint_invalid");
  }
  return Object.freeze({
    schemaVersion:
      V2_AUTHENTICATED_REPOSITORY_SNAPSHOT_MATERIALIZATION_SCHEMA_V1,
    identity: input.identity,
    observation,
    observationLogicalFingerprint,
    observationBodyRaw,
    observationBodyRawHash: sha256Utf8(observationBodyRaw),
    observationFullRaw,
    observationFullRawHash: sha256Utf8(observationFullRaw),
    bundleManifest: bundle.manifest,
    bundleManifestLogicalFingerprint,
    bundleManifestBodyRaw,
    bundleManifestBodyRawHash: sha256Utf8(bundleManifestBodyRaw),
    bundleManifestFullRaw: bundle.manifestRaw,
    bundleManifestFullRawHash: sha256Utf8(bundle.manifestRaw),
    bundleBlob: new Uint8Array(bundle.blob),
    bundleBlobHash: bundle.manifest.blobHash,
    bundleBlobByteSize: bundle.blob.byteLength,
    bundleManifestMaximumBytes:
      V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1,
    bundleBlobMaximumBytes: V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1,
  });
}

export async function verifyV2AuthenticatedRepositoryColdReplayHeadsV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly parsedRows: readonly V2AuthenticatedRepositoryCoherentSnapshotRowV1[];
  readonly currentSnapshot: V2FirebaseAdminRepositoryHeadSnapshotV1;
  readonly expectedObservationRaw: string;
}): Promise<V2AuthenticatedRepositoryColdReplayVerificationV1> {
  if (
    !isRecord(input) ||
    !exactKeys(input, [
      "plan",
      "parsedRows",
      "currentSnapshot",
      "expectedObservationRaw",
    ]) ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    typeof input.expectedObservationRaw !== "string" ||
    new TextEncoder().encode(input.expectedObservationRaw).byteLength >
      V2_REPOSITORY_CAPABILITY_RECEIPT_MAX_BYTES_V1
  ) {
    fail("v2_authenticated_repository_cold_replay_input_invalid");
  }
  const rows = exactSnapshotRows(input.plan, input.parsedRows);
  const bundle = encodeV2AuthenticatedRepositoryReadBundleV1(rows);
  const current = normalizeHeadSnapshot(input.plan, input.currentSnapshot);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    const head = current.entries[index]!;
    const recordAfterUpdateTime = parseTimestamp(
      row.evidence.recordAfterUpdateTime,
      "v2_authenticated_repository_cold_replay_evidence_invalid",
    );
    const lifecycleAfterUpdateTime = parseTimestamp(
      row.evidence.lifecycleAfterUpdateTime,
      "v2_authenticated_repository_cold_replay_evidence_invalid",
    );
    const afterReadTime = parseTimestamp(
      row.evidence.afterReadTime,
      "v2_authenticated_repository_cold_replay_evidence_invalid",
    );
    if (
      requirementKey(row.requirement) !== requirementKey(head.requirement) ||
      row.evidence.versionDocumentPath !== head.versionDocumentPath ||
      row.evidence.lifecycleDocumentPath !== head.lifecycleDocumentPath ||
      !byteEqual(row.recordAfter, head.recordBytes) ||
      !byteEqual(row.lifecycleAfter, head.lifecycleBytes) ||
      !timestampEqual(recordAfterUpdateTime, head.recordUpdateTime) ||
      !timestampEqual(lifecycleAfterUpdateTime, head.lifecycleUpdateTime) ||
      compareTimestamp(afterReadTime, current.readTime) > 0
    ) {
      fail("v2_authenticated_repository_cold_replay_head_mismatch");
    }
  }
  const observation = await observeV2ActivityRepositoryCapabilityV1({
    plan: input.plan,
    reader: replayReader(rows),
  });
  if (canonicalJsonV1(observation) !== input.expectedObservationRaw)
    fail("v2_authenticated_repository_cold_replay_observation_mismatch");
  const body = Object.freeze({
    schemaVersion:
      V2_AUTHENTICATED_REPOSITORY_COLD_REPLAY_VERIFICATION_SCHEMA_V1,
    planFingerprint: input.plan.planFingerprint,
    bundleManifestFingerprint: bundle.manifest.manifestFingerprint,
    observationFingerprint: observation.receiptFingerprint,
    currentReadTime: current.readTime,
    currentHeadAggregateFingerprint: hashCanonicalBody(
      current.entries.map((entry) => ({
        requirement: entry.requirement,
        versionDocumentPath: entry.versionDocumentPath,
        lifecycleDocumentPath: entry.lifecycleDocumentPath,
        recordHash: sha256Bytes(entry.recordBytes),
        lifecycleHash: sha256Bytes(entry.lifecycleBytes),
        recordUpdateTime: entry.recordUpdateTime,
        lifecycleUpdateTime: entry.lifecycleUpdateTime,
      })),
    ),
  });
  return Object.freeze({
    schemaVersion:
      V2_AUTHENTICATED_REPOSITORY_COLD_REPLAY_VERIFICATION_SCHEMA_V1,
    rows,
    observation,
    currentReadTime: current.readTime,
    verificationFingerprint: hashCanonicalBody(body),
  });
}
