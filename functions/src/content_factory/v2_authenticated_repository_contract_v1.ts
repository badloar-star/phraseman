import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1,
} from "./v2_firebase_repository_trust_root_v1";

export const V2_AUTHENTICATED_REPOSITORY_BUNDLE_CODEC_V1 =
  "v2-authenticated-repository-read-bundle.bin.v1" as const;
export const V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1 =
  "v2-authenticated-repository-read-bundle-manifest.v1" as const;
export const V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1 =
  "v2-authenticated-repository-origin-receipt.v1" as const;

export const V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MIN_V1 = 2;
export const V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MAX_V1 = 29;
export const V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_V1 = 28;
export const V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1 = 64 * 1024;
export const V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1 = 64 * 1024;
export const V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1 = 128 * 1024;
export const V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1 = 512 * 1024;
export const V2_AUTHENTICATED_REPOSITORY_OBJECT_AGGREGATE_MAX_BYTES_V1 =
  V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1 +
  V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1 *
    V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_V1;
export const V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1 = 24 * 1024 * 1024;
export const V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1 = 128 * 1024;
export const V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_MAX_BYTES_V1 =
  64 * 1024;

const HASH_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const PATH_RE = /^[A-Za-z0-9._/@:+-]{1,1000}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const TIMESTAMP_SECONDS_RE = /^(0|[1-9][0-9]{0,11})$/;
const RESERVED_JSON_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const BUNDLE_MAGIC = new TextEncoder().encode("PHRV2RB1");
const BUNDLE_HEADER_BYTES = 12;
const SEGMENT_LENGTH_BYTES = 4;
const SEGMENT_NAMES = [
  "recordBefore",
  "lifecycleBefore",
  "object",
  "recordAfter",
  "lifecycleAfter",
] as const;

export const V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_V1 =
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1;
export const V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1 =
  V2_FIREBASE_REPOSITORY_NAMESPACE_FINGERPRINT_V1;

export type V2AuthenticatedRepositoryRequirementV1 =
  | Readonly<{
      dependencyType: "language_profile";
      profileId: string;
      version: number;
      contentHash: string;
    }>
  | Readonly<{
      dependencyType: "published_template";
      templateId: string;
      version: number;
      contentHash: string;
    }>;

export interface V2AuthenticatedRepositoryObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
}

export type V2AuthenticatedRepositoryBundleSegmentNameV1 =
  (typeof SEGMENT_NAMES)[number];

export interface V2AuthenticatedRepositoryBundleSegmentV1 {
  readonly offset: number;
  readonly byteSize: number;
  readonly contentHash: string;
}

export interface V2AuthenticatedRepositoryBundleManifestEntryV1 {
  readonly requirement: V2AuthenticatedRepositoryRequirementV1;
  readonly evidence: V2AuthenticatedRepositoryReadEvidenceV1;
  readonly evidenceFingerprint: string;
  readonly segments: Readonly<
    Record<
      V2AuthenticatedRepositoryBundleSegmentNameV1,
      V2AuthenticatedRepositoryBundleSegmentV1
    >
  >;
}

export interface V2AuthenticatedRepositoryFirestoreTimestampV1 {
  readonly seconds: string;
  readonly nanoseconds: number;
}

export interface V2AuthenticatedRepositoryReadEvidenceV1 {
  readonly requirementKey: string;
  readonly versionDocumentPath: string;
  readonly lifecycleDocumentPath: string;
  readonly firestoreDocumentEncoding: "firestore_document_data_canonical_json_utf8.v1";
  readonly recordBeforeUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly recordAfterUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly lifecycleBeforeUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly lifecycleAfterUpdateTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly beforeReadTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly afterReadTime: V2AuthenticatedRepositoryFirestoreTimestampV1;
  readonly storageBucket: string;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly objectEncoding: "firebase_storage_object_raw_canonical_json_utf8.v1";
}

export interface V2AuthenticatedRepositoryBundleManifestV1 {
  readonly schemaVersion: typeof V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1;
  readonly codec: typeof V2_AUTHENTICATED_REPOSITORY_BUNDLE_CODEC_V1;
  readonly requirementCount: number;
  readonly templateCount: number;
  readonly requirements: readonly V2AuthenticatedRepositoryBundleManifestEntryV1[];
  readonly objectAggregateBytes: number;
  readonly blobByteSize: number;
  readonly blobHash: string;
  readonly manifestFingerprint: string;
}

export interface V2AuthenticatedRepositoryBundleEntryInputV1 {
  readonly requirement: V2AuthenticatedRepositoryRequirementV1;
  readonly evidence: V2AuthenticatedRepositoryReadEvidenceV1;
  readonly recordBefore: Uint8Array;
  readonly lifecycleBefore: Uint8Array;
  readonly object: Uint8Array;
  readonly recordAfter: Uint8Array;
  readonly lifecycleAfter: Uint8Array;
}

export interface V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1 {
  readonly schemaVersion: typeof V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1;
  readonly adapterProfile: Readonly<{
    adapterId: "learning-v2-firebase-admin-repository-v1";
    adapterVersion: 1;
    namespaceFingerprint: string;
  }>;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly repositoryScopeFingerprint: string;
  readonly resolverContractFingerprint: string;
  readonly requestFingerprint: string;
  readonly workspaceId: string;
  readonly authoringRevision: number;
  readonly targetLanguage: string;
  readonly requirementCount: number;
  readonly templateCount: number;
  readonly requirementAggregateFingerprint: string;
  readonly headAggregateFingerprint: string;
  readonly bundleManifestFingerprint: string;
  readonly bundleManifestRawHash: string;
  readonly bundleBlobHash: string;
  readonly bundleManifestByteSize: number;
  readonly bundleBlobByteSize: number;
  readonly bundleManifestPin: V2AuthenticatedRepositoryObjectPinV1;
  readonly bundleBlobPin: V2AuthenticatedRepositoryObjectPinV1;
  readonly structuralObservationPin: V2AuthenticatedRepositoryObjectPinV1;
  readonly structuralObservationFingerprint: string;
  readonly structuralObservationRawHash: string;
  readonly repositoryOriginAuthenticity: "not_established_by_audit_parser";
  readonly claimedRepositoryOriginAuthenticity: "server_admin_sdk_authenticated_readback";
  readonly claimedRecordOriginEvidence: "firestore_admin_sdk_exact_paths_and_update_times";
  readonly claimedObjectOriginEvidence: "storage_generation_matched_readback";
  readonly claimedStorageExistenceEvidence: "exact_generation_readback";
  readonly recordOriginAuthority: "none";
  readonly objectOriginAuthority: "none";
  readonly storageExistenceAuthority: "none";
  readonly lifecycleAuthority: "none";
  readonly candidateOriginAuthority: "none";
  readonly contentValidationAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly trustBoundary: "audit_only_claim_requires_private_admin_adapter_brand";
  readonly receiptFingerprint: string;
}

export interface V2AuthenticatedRepositoryOriginReceiptStructuralClaimInputV1 {
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly repositoryScopeFingerprint: string;
  readonly resolverContractFingerprint: string;
  readonly requestFingerprint: string;
  readonly workspaceId: string;
  readonly authoringRevision: number;
  readonly targetLanguage: string;
  readonly requirementCount: number;
  readonly templateCount: number;
  readonly requirementAggregateFingerprint: string;
  readonly headAggregateFingerprint: string;
  readonly bundleManifestFingerprint: string;
  readonly bundleManifestRawHash: string;
  readonly bundleBlobHash: string;
  readonly bundleManifestByteSize: number;
  readonly bundleBlobByteSize: number;
  readonly bundleManifestPin: V2AuthenticatedRepositoryObjectPinV1;
  readonly bundleBlobPin: V2AuthenticatedRepositoryObjectPinV1;
  readonly structuralObservationPin: V2AuthenticatedRepositoryObjectPinV1;
  readonly structuralObservationFingerprint: string;
  readonly structuralObservationRawHash: string;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function exactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

const compareCodePoint = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function exactString(value: unknown, pattern: RegExp, code: string): string {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(code);
  return value;
}

function exactVersion(value: unknown, code: string): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > 1_000_000
  )
    throw new Error(code);
  return Number(value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as JsonRecord)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function assertBoundedJsonTree(value: unknown, code: string): void {
  const work: Readonly<{ value: unknown; depth: number }>[] = [
    { value, depth: 0 },
  ];
  let nodeCount = 0;
  let arrayEntryCount = 0;
  while (work.length > 0) {
    const current = work.pop()!;
    nodeCount += 1;
    if (nodeCount > 50_000 || current.depth > 24) throw new Error(code);
    const child = current.value;
    if (typeof child === "string") {
      if (child.length > 128 * 1024 || child.normalize("NFC") !== child)
        throw new Error(code);
      continue;
    }
    if (child === null || typeof child === "boolean") continue;
    if (typeof child === "number") {
      if (
        !Number.isFinite(child) ||
        Object.is(child, -0) ||
        (Number.isInteger(child) && !Number.isSafeInteger(child))
      )
        throw new Error(code);
      continue;
    }
    if (Array.isArray(child)) {
      arrayEntryCount += child.length;
      if (arrayEntryCount > 20_000) throw new Error(code);
      for (const entry of child)
        work.push({ value: entry, depth: current.depth + 1 });
      continue;
    }
    if (!isRecord(child)) throw new Error(code);
    const keys = Object.keys(child);
    if (
      keys.length > 128 ||
      keys.some(
        (key) => RESERVED_JSON_KEYS.has(key) || key.normalize("NFC") !== key,
      )
    )
      throw new Error(code);
    for (const key of keys)
      work.push({ value: child[key], depth: current.depth + 1 });
  }
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function requirementIdentity(
  requirement: V2AuthenticatedRepositoryRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? `language_profile:${requirement.profileId}:v${requirement.version}`
    : `published_template:${requirement.templateId}:v${requirement.version}`;
}

function parseRequirement(
  value: unknown,
): V2AuthenticatedRepositoryRequirementV1 {
  if (!isRecord(value))
    throw new Error("v2_authenticated_repository_requirement_invalid");
  if (value.dependencyType === "language_profile") {
    if (
      !exactKeys(value, [
        "dependencyType",
        "profileId",
        "version",
        "contentHash",
      ])
    )
      throw new Error("v2_authenticated_repository_requirement_invalid");
    return Object.freeze({
      dependencyType: "language_profile" as const,
      profileId: exactString(
        value.profileId,
        TOKEN_RE,
        "v2_authenticated_repository_requirement_invalid",
      ),
      version: exactVersion(
        value.version,
        "v2_authenticated_repository_requirement_invalid",
      ),
      contentHash: exactString(
        value.contentHash,
        HASH_RE,
        "v2_authenticated_repository_requirement_invalid",
      ),
    });
  }
  if (
    value.dependencyType !== "published_template" ||
    !exactKeys(value, [
      "dependencyType",
      "templateId",
      "version",
      "contentHash",
    ])
  )
    throw new Error("v2_authenticated_repository_requirement_invalid");
  return Object.freeze({
    dependencyType: "published_template" as const,
    templateId: exactString(
      value.templateId,
      TOKEN_RE,
      "v2_authenticated_repository_requirement_invalid",
    ),
    version: exactVersion(
      value.version,
      "v2_authenticated_repository_requirement_invalid",
    ),
    contentHash: exactString(
      value.contentHash,
      HASH_RE,
      "v2_authenticated_repository_requirement_invalid",
    ),
  });
}

function assertRequirementSet(
  requirements: readonly V2AuthenticatedRepositoryRequirementV1[],
): void {
  if (
    requirements.length < V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MIN_V1 ||
    requirements.length > V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MAX_V1
  )
    throw new Error("v2_authenticated_repository_requirement_count_invalid");
  const languageCount = requirements.filter(
    (entry) => entry.dependencyType === "language_profile",
  ).length;
  const templateCount = requirements.length - languageCount;
  if (
    languageCount !== 1 ||
    templateCount < 1 ||
    templateCount > V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_V1
  )
    throw new Error("v2_authenticated_repository_requirement_count_invalid");
  const identities = requirements.map(requirementIdentity);
  const hashesByIdentity = new Map<string, string>();
  for (const requirement of requirements) {
    const identity = requirementIdentity(requirement);
    const priorHash = hashesByIdentity.get(identity);
    if (priorHash !== undefined && priorHash !== requirement.contentHash)
      throw new Error("v2_authenticated_repository_requirement_hash_conflict");
    hashesByIdentity.set(identity, requirement.contentHash);
  }
  if (
    new Set(identities).size !== identities.length ||
    identities.some(
      (identity, index) =>
        index > 0 && compareCodePoint(identities[index - 1], identity) >= 0,
    )
  )
    throw new Error("v2_authenticated_repository_requirement_order_invalid");
}

function pathToken(value: string, code: string): string {
  return exactString(value, TOKEN_RE, code);
}

export function v2LanguageProfileVersionDocumentPathV1(
  profileId: string,
  version: number,
): string {
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore.languageProfileVersions}/${sha256Utf8(pathToken(profileId, "v2_authenticated_repository_profile_path_invalid"))}__v${exactVersion(version, "v2_authenticated_repository_profile_path_invalid")}`;
}

export function v2LanguageProfileLifecycleDocumentPathV1(
  profileId: string,
  version: number,
): string {
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore.languageProfileLifecycle}/${sha256Utf8(pathToken(profileId, "v2_authenticated_repository_profile_path_invalid"))}__v${exactVersion(version, "v2_authenticated_repository_profile_path_invalid")}`;
}

export function v2LanguageProfileObjectPathV1(
  profileId: string,
  version: number,
  contentHash: string,
): string {
  const id = pathToken(
    profileId,
    "v2_authenticated_repository_profile_path_invalid",
  );
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage.languageProfilePrefix}/${sha256Utf8(id)}/v${exactVersion(version, "v2_authenticated_repository_profile_path_invalid")}/${exactString(contentHash, HASH_RE, "v2_authenticated_repository_profile_path_invalid")}.json`;
}

export function v2ModeTemplateVersionDocumentPathV1(
  templateId: string,
  version: number,
): string {
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore.modeTemplateVersions}/${pathToken(templateId, "v2_authenticated_repository_template_path_invalid")}__v${exactVersion(version, "v2_authenticated_repository_template_path_invalid")}`;
}

export function v2ModeTemplateLifecycleDocumentPathV1(
  templateId: string,
  version: number,
): string {
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore.modeTemplateLifecycle}/${pathToken(templateId, "v2_authenticated_repository_template_path_invalid")}__v${exactVersion(version, "v2_authenticated_repository_template_path_invalid")}`;
}

export function v2ModeTemplateObjectPathV1(
  templateId: string,
  version: number,
  contentHash: string,
): string {
  const id = pathToken(
    templateId,
    "v2_authenticated_repository_template_path_invalid",
  );
  return `${V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage.modeTemplatePrefix}/${sha256Utf8(id)}/v${exactVersion(version, "v2_authenticated_repository_template_path_invalid")}/${exactString(contentHash, HASH_RE, "v2_authenticated_repository_template_path_invalid")}.json`;
}

function expectedVersionDocumentPath(
  requirement: V2AuthenticatedRepositoryRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? v2LanguageProfileVersionDocumentPathV1(
        requirement.profileId,
        requirement.version,
      )
    : v2ModeTemplateVersionDocumentPathV1(
        requirement.templateId,
        requirement.version,
      );
}

function expectedLifecycleDocumentPath(
  requirement: V2AuthenticatedRepositoryRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? v2LanguageProfileLifecycleDocumentPathV1(
        requirement.profileId,
        requirement.version,
      )
    : v2ModeTemplateLifecycleDocumentPathV1(
        requirement.templateId,
        requirement.version,
      );
}

function expectedRequirementObjectPath(
  requirement: V2AuthenticatedRepositoryRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? v2LanguageProfileObjectPathV1(
        requirement.profileId,
        requirement.version,
        requirement.contentHash,
      )
    : v2ModeTemplateObjectPathV1(
        requirement.templateId,
        requirement.version,
        requirement.contentHash,
      );
}

function parseFirestoreTimestamp(
  value: unknown,
): V2AuthenticatedRepositoryFirestoreTimestampV1 {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["seconds", "nanoseconds"]) ||
    typeof value.seconds !== "string" ||
    !TIMESTAMP_SECONDS_RE.test(value.seconds) ||
    !Number.isSafeInteger(value.nanoseconds) ||
    Number(value.nanoseconds) < 0 ||
    Number(value.nanoseconds) > 999_999_999
  )
    throw new Error("v2_authenticated_repository_timestamp_invalid");
  return Object.freeze({
    seconds: value.seconds,
    nanoseconds: Number(value.nanoseconds),
  });
}

function compareTimestamp(
  left: V2AuthenticatedRepositoryFirestoreTimestampV1,
  right: V2AuthenticatedRepositoryFirestoreTimestampV1,
): number {
  const seconds = Number(left.seconds) - Number(right.seconds);
  return seconds === 0 ? left.nanoseconds - right.nanoseconds : seconds;
}

function parseReadEvidence(
  value: unknown,
  requirement: V2AuthenticatedRepositoryRequirementV1,
): V2AuthenticatedRepositoryReadEvidenceV1 {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "requirementKey",
      "versionDocumentPath",
      "lifecycleDocumentPath",
      "firestoreDocumentEncoding",
      "recordBeforeUpdateTime",
      "recordAfterUpdateTime",
      "lifecycleBeforeUpdateTime",
      "lifecycleAfterUpdateTime",
      "beforeReadTime",
      "afterReadTime",
      "storageBucket",
      "objectPath",
      "objectGeneration",
      "objectEncoding",
    ]) ||
    value.requirementKey !== requirementIdentity(requirement) ||
    value.versionDocumentPath !== expectedVersionDocumentPath(requirement) ||
    value.lifecycleDocumentPath !==
      expectedLifecycleDocumentPath(requirement) ||
    value.firestoreDocumentEncoding !==
      "firestore_document_data_canonical_json_utf8.v1" ||
    value.storageBucket !==
      V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.bucketName ||
    value.objectPath !== expectedRequirementObjectPath(requirement) ||
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    value.objectEncoding !==
      "firebase_storage_object_raw_canonical_json_utf8.v1"
  )
    throw new Error("v2_authenticated_repository_read_evidence_invalid");
  const recordBeforeUpdateTime = parseFirestoreTimestamp(
    value.recordBeforeUpdateTime,
  );
  const recordAfterUpdateTime = parseFirestoreTimestamp(
    value.recordAfterUpdateTime,
  );
  const lifecycleBeforeUpdateTime = parseFirestoreTimestamp(
    value.lifecycleBeforeUpdateTime,
  );
  const lifecycleAfterUpdateTime = parseFirestoreTimestamp(
    value.lifecycleAfterUpdateTime,
  );
  const beforeReadTime = parseFirestoreTimestamp(value.beforeReadTime);
  const afterReadTime = parseFirestoreTimestamp(value.afterReadTime);
  if (
    canonicalJsonV1(recordBeforeUpdateTime) !==
      canonicalJsonV1(recordAfterUpdateTime) ||
    canonicalJsonV1(lifecycleBeforeUpdateTime) !==
      canonicalJsonV1(lifecycleAfterUpdateTime) ||
    compareTimestamp(beforeReadTime, afterReadTime) > 0 ||
    compareTimestamp(recordBeforeUpdateTime, beforeReadTime) > 0 ||
    compareTimestamp(lifecycleBeforeUpdateTime, beforeReadTime) > 0 ||
    compareTimestamp(recordAfterUpdateTime, afterReadTime) > 0 ||
    compareTimestamp(lifecycleAfterUpdateTime, afterReadTime) > 0
  )
    throw new Error("v2_authenticated_repository_read_evidence_incoherent");
  return deepFreeze({
    requirementKey: requirementIdentity(requirement),
    versionDocumentPath: expectedVersionDocumentPath(requirement),
    lifecycleDocumentPath: expectedLifecycleDocumentPath(requirement),
    firestoreDocumentEncoding:
      "firestore_document_data_canonical_json_utf8.v1" as const,
    recordBeforeUpdateTime,
    recordAfterUpdateTime,
    lifecycleBeforeUpdateTime,
    lifecycleAfterUpdateTime,
    beforeReadTime,
    afterReadTime,
    storageBucket: V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.bucketName,
    objectPath: expectedRequirementObjectPath(requirement),
    objectGeneration: value.objectGeneration,
    objectEncoding:
      "firebase_storage_object_raw_canonical_json_utf8.v1" as const,
  });
}

export function parseV2AuthenticatedRepositoryObjectPinV1(
  value: unknown,
  maximumBytes = 512 * 1024 * 1024,
): V2AuthenticatedRepositoryObjectPinV1 {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
    ]) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > maximumBytes
  )
    throw new Error("v2_authenticated_repository_pin_invalid");
  return Object.freeze({
    objectPath: exactString(
      value.objectPath,
      PATH_RE,
      "v2_authenticated_repository_pin_invalid",
    ),
    contentHash: exactString(
      value.contentHash,
      HASH_RE,
      "v2_authenticated_repository_pin_invalid",
    ),
    objectGeneration: exactString(
      value.objectGeneration,
      GENERATION_RE,
      "v2_authenticated_repository_pin_invalid",
    ),
    byteSize: Number(value.byteSize),
  });
}

function assertSegmentBytes(
  value: unknown,
  maximum: number,
  code: string,
): Uint8Array {
  if (
    !(value instanceof Uint8Array) ||
    value.byteLength < 1 ||
    value.byteLength > maximum
  )
    throw new Error(code);
  const copied = new Uint8Array(value);
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(copied);
  } catch {
    throw new Error("v2_authenticated_repository_segment_utf8_invalid");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("v2_authenticated_repository_segment_json_invalid");
  }
  assertBoundedJsonTree(
    decoded,
    "v2_authenticated_repository_segment_complexity_invalid",
  );
  if (canonicalJsonV1(decoded) !== raw)
    throw new Error("v2_authenticated_repository_segment_noncanonical");
  return copied;
}

function segmentCap(
  requirement: V2AuthenticatedRepositoryRequirementV1,
  name: V2AuthenticatedRepositoryBundleSegmentNameV1,
): number {
  if (name === "recordBefore" || name === "recordAfter")
    return V2_AUTHENTICATED_REPOSITORY_RECORD_MAX_BYTES_V1;
  if (name === "lifecycleBefore" || name === "lifecycleAfter")
    return V2_AUTHENTICATED_REPOSITORY_LIFECYCLE_MAX_BYTES_V1;
  return requirement.dependencyType === "language_profile"
    ? V2_AUTHENTICATED_REPOSITORY_LANGUAGE_MAX_BYTES_V1
    : V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_BYTES_V1;
}

function manifestBody(
  value: Omit<V2AuthenticatedRepositoryBundleManifestV1, "manifestFingerprint">,
) {
  return value;
}

export function encodeV2AuthenticatedRepositoryReadBundleV1(
  entriesInput: readonly V2AuthenticatedRepositoryBundleEntryInputV1[],
): Readonly<{
  manifest: V2AuthenticatedRepositoryBundleManifestV1;
  manifestRaw: string;
  blob: Uint8Array;
}> {
  if (
    !Array.isArray(entriesInput) ||
    entriesInput.length < V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MIN_V1 ||
    entriesInput.length > V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MAX_V1
  )
    throw new Error("v2_authenticated_repository_requirement_count_invalid");
  const entries = entriesInput.map((entry) => {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, ["requirement", "evidence", ...SEGMENT_NAMES])
    )
      throw new Error("v2_authenticated_repository_bundle_invalid");
    const requirement = parseRequirement(entry.requirement);
    return {
      requirement,
      evidence: parseReadEvidence(entry.evidence, requirement),
      recordBefore: assertSegmentBytes(
        entry.recordBefore,
        segmentCap(requirement, "recordBefore"),
        "v2_authenticated_repository_segment_size_invalid",
      ),
      lifecycleBefore: assertSegmentBytes(
        entry.lifecycleBefore,
        segmentCap(requirement, "lifecycleBefore"),
        "v2_authenticated_repository_segment_size_invalid",
      ),
      object: assertSegmentBytes(
        entry.object,
        segmentCap(requirement, "object"),
        "v2_authenticated_repository_segment_size_invalid",
      ),
      recordAfter: assertSegmentBytes(
        entry.recordAfter,
        segmentCap(requirement, "recordAfter"),
        "v2_authenticated_repository_segment_size_invalid",
      ),
      lifecycleAfter: assertSegmentBytes(
        entry.lifecycleAfter,
        segmentCap(requirement, "lifecycleAfter"),
        "v2_authenticated_repository_segment_size_invalid",
      ),
    };
  });
  if (
    entries.some(
      (entry) =>
        sha256Bytes(entry.recordBefore) !== sha256Bytes(entry.recordAfter) ||
        sha256Bytes(entry.lifecycleBefore) !==
          sha256Bytes(entry.lifecycleAfter),
    )
  )
    throw new Error("v2_authenticated_repository_read_evidence_incoherent");
  if (
    entries.some(
      (entry) => sha256Bytes(entry.object) !== entry.requirement.contentHash,
    )
  )
    throw new Error("v2_authenticated_repository_object_hash_mismatch");
  assertRequirementSet(entries.map((entry) => entry.requirement));
  const objectAggregateBytes = entries.reduce(
    (total, entry) => total + entry.object.byteLength,
    0,
  );
  if (
    objectAggregateBytes >
    V2_AUTHENTICATED_REPOSITORY_OBJECT_AGGREGATE_MAX_BYTES_V1
  )
    throw new Error("v2_authenticated_repository_object_budget_invalid");
  const blobByteSize =
    BUNDLE_HEADER_BYTES +
    entries.reduce(
      (total, entry) =>
        total +
        SEGMENT_NAMES.reduce(
          (segmentTotal, name) =>
            segmentTotal + SEGMENT_LENGTH_BYTES + entry[name].byteLength,
          0,
        ),
      0,
    );
  if (blobByteSize > V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1)
    throw new Error("v2_authenticated_repository_blob_size_invalid");
  const blob = new Uint8Array(blobByteSize);
  blob.set(BUNDLE_MAGIC, 0);
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  view.setUint16(8, 1, false);
  view.setUint16(10, entries.length, false);
  let cursor = BUNDLE_HEADER_BYTES;
  const requirements = entries.map((entry) => {
    const descriptors = {} as Record<
      V2AuthenticatedRepositoryBundleSegmentNameV1,
      V2AuthenticatedRepositoryBundleSegmentV1
    >;
    for (const name of SEGMENT_NAMES) {
      const bytes = entry[name];
      view.setUint32(cursor, bytes.byteLength, false);
      cursor += SEGMENT_LENGTH_BYTES;
      const offset = cursor;
      blob.set(bytes, cursor);
      cursor += bytes.byteLength;
      descriptors[name] = Object.freeze({
        offset,
        byteSize: bytes.byteLength,
        contentHash: sha256Bytes(bytes),
      });
    }
    return Object.freeze({
      requirement: entry.requirement,
      evidence: entry.evidence,
      evidenceFingerprint: hashCanonicalBody(entry.evidence),
      segments: Object.freeze(descriptors),
    });
  });
  const body = deepFreeze({
    schemaVersion: V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1,
    codec: V2_AUTHENTICATED_REPOSITORY_BUNDLE_CODEC_V1,
    requirementCount: entries.length,
    templateCount: entries.filter(
      (entry) => entry.requirement.dependencyType === "published_template",
    ).length,
    requirements: Object.freeze(requirements),
    objectAggregateBytes,
    blobByteSize: blob.byteLength,
    blobHash: sha256Bytes(blob),
  });
  const manifest = deepFreeze({
    ...body,
    manifestFingerprint: hashCanonicalBody(manifestBody(body)),
  }) as V2AuthenticatedRepositoryBundleManifestV1;
  const manifestRaw = canonicalJsonV1(manifest);
  if (
    utf8ByteLengthV1(manifestRaw) >
    V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1
  )
    throw new Error("v2_authenticated_repository_manifest_size_invalid");
  return Object.freeze({ manifest, manifestRaw, blob });
}

function parseSegmentDescriptor(
  value: unknown,
): V2AuthenticatedRepositoryBundleSegmentV1 {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["offset", "byteSize", "contentHash"]) ||
    !Number.isSafeInteger(value.offset) ||
    Number(value.offset) < BUNDLE_HEADER_BYTES + SEGMENT_LENGTH_BYTES ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1
  )
    throw new Error("v2_authenticated_repository_manifest_segment_invalid");
  return Object.freeze({
    offset: Number(value.offset),
    byteSize: Number(value.byteSize),
    contentHash: exactString(
      value.contentHash,
      HASH_RE,
      "v2_authenticated_repository_manifest_segment_invalid",
    ),
  });
}

export function parseV2AuthenticatedRepositoryReadBundleV1(
  manifestRaw: string,
  blobInput: Uint8Array,
): Readonly<{
  manifest: V2AuthenticatedRepositoryBundleManifestV1;
  entries: readonly V2AuthenticatedRepositoryBundleEntryInputV1[];
}> {
  if (
    typeof manifestRaw !== "string" ||
    utf8ByteLengthV1(manifestRaw) >
      V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1 ||
    !(blobInput instanceof Uint8Array) ||
    blobInput.byteLength > V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1 ||
    blobInput.byteLength < BUNDLE_HEADER_BYTES
  )
    throw new Error("v2_authenticated_repository_bundle_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(manifestRaw);
  } catch {
    throw new Error("v2_authenticated_repository_manifest_invalid");
  }
  assertBoundedJsonTree(
    decoded,
    "v2_authenticated_repository_manifest_complexity_invalid",
  );
  if (
    !isRecord(decoded) ||
    !exactKeys(decoded, [
      "schemaVersion",
      "codec",
      "requirementCount",
      "templateCount",
      "requirements",
      "objectAggregateBytes",
      "blobByteSize",
      "blobHash",
      "manifestFingerprint",
    ]) ||
    decoded.schemaVersion !==
      V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1 ||
    decoded.codec !== V2_AUTHENTICATED_REPOSITORY_BUNDLE_CODEC_V1 ||
    !Array.isArray(decoded.requirements) ||
    decoded.requirements.length <
      V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MIN_V1 ||
    decoded.requirements.length > V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MAX_V1
  )
    throw new Error("v2_authenticated_repository_manifest_invalid");
  if (canonicalJsonV1(decoded) !== manifestRaw)
    throw new Error("v2_authenticated_repository_manifest_invalid");
  const requirements = decoded.requirements.map((entry) => {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, [
        "requirement",
        "evidence",
        "evidenceFingerprint",
        "segments",
      ]) ||
      !isRecord(entry.segments) ||
      !exactKeys(entry.segments, SEGMENT_NAMES)
    )
      throw new Error("v2_authenticated_repository_manifest_invalid");
    const requirement = parseRequirement(entry.requirement);
    const evidence = parseReadEvidence(entry.evidence, requirement);
    const evidenceFingerprint = exactString(
      entry.evidenceFingerprint,
      HASH_RE,
      "v2_authenticated_repository_manifest_invalid",
    );
    if (evidenceFingerprint !== hashCanonicalBody(evidence))
      throw new Error("v2_authenticated_repository_manifest_invalid");
    const descriptors = {} as Record<
      V2AuthenticatedRepositoryBundleSegmentNameV1,
      V2AuthenticatedRepositoryBundleSegmentV1
    >;
    for (const name of SEGMENT_NAMES)
      descriptors[name] = parseSegmentDescriptor(entry.segments[name]);
    if (
      descriptors.recordBefore.contentHash !==
        descriptors.recordAfter.contentHash ||
      descriptors.lifecycleBefore.contentHash !==
        descriptors.lifecycleAfter.contentHash
    )
      throw new Error("v2_authenticated_repository_read_evidence_incoherent");
    return Object.freeze({
      requirement,
      evidence,
      evidenceFingerprint,
      segments: Object.freeze(descriptors),
    });
  });
  assertRequirementSet(requirements.map((entry) => entry.requirement));
  const templateCount = requirements.filter(
    (entry) => entry.requirement.dependencyType === "published_template",
  ).length;
  if (
    decoded.requirementCount !== requirements.length ||
    decoded.templateCount !== templateCount ||
    decoded.blobByteSize !== blobInput.byteLength ||
    decoded.blobHash !== sha256Bytes(blobInput) ||
    !Number.isSafeInteger(decoded.objectAggregateBytes) ||
    Number(decoded.objectAggregateBytes) < 1 ||
    Number(decoded.objectAggregateBytes) >
      V2_AUTHENTICATED_REPOSITORY_OBJECT_AGGREGATE_MAX_BYTES_V1
  )
    throw new Error("v2_authenticated_repository_manifest_invalid");
  const fingerprint = exactString(
    decoded.manifestFingerprint,
    HASH_RE,
    "v2_authenticated_repository_manifest_invalid",
  );
  const base = {
    schemaVersion: V2_AUTHENTICATED_REPOSITORY_BUNDLE_MANIFEST_SCHEMA_V1,
    codec: V2_AUTHENTICATED_REPOSITORY_BUNDLE_CODEC_V1,
    requirementCount: requirements.length,
    templateCount,
    requirements: Object.freeze(requirements),
    objectAggregateBytes: Number(decoded.objectAggregateBytes),
    blobByteSize: blobInput.byteLength,
    blobHash: String(decoded.blobHash),
  };
  if (fingerprint !== hashCanonicalBody(manifestBody(base)))
    throw new Error("v2_authenticated_repository_manifest_invalid");
  const blob = new Uint8Array(blobInput);
  if (BUNDLE_MAGIC.some((byte, index) => blob[index] !== byte))
    throw new Error("v2_authenticated_repository_blob_header_invalid");
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  if (
    view.getUint16(8, false) !== 1 ||
    view.getUint16(10, false) !== requirements.length
  )
    throw new Error("v2_authenticated_repository_blob_header_invalid");
  let cursor = BUNDLE_HEADER_BYTES;
  let objectAggregateBytes = 0;
  const entries = requirements.map((entry) => {
    const result: Record<string, unknown> = {
      requirement: entry.requirement,
      evidence: entry.evidence,
    };
    for (const name of SEGMENT_NAMES) {
      if (cursor + SEGMENT_LENGTH_BYTES > blob.byteLength)
        throw new Error("v2_authenticated_repository_blob_truncated");
      const declaredLength = view.getUint32(cursor, false);
      cursor += SEGMENT_LENGTH_BYTES;
      const descriptor = entry.segments[name];
      if (
        descriptor.offset !== cursor ||
        descriptor.byteSize !== declaredLength ||
        declaredLength < 1 ||
        declaredLength > segmentCap(entry.requirement, name) ||
        cursor + declaredLength > blob.byteLength
      )
        throw new Error("v2_authenticated_repository_blob_layout_invalid");
      const bytes = blob.slice(cursor, cursor + declaredLength);
      cursor += declaredLength;
      if (sha256Bytes(bytes) !== descriptor.contentHash)
        throw new Error("v2_authenticated_repository_blob_hash_invalid");
      assertSegmentBytes(
        bytes,
        segmentCap(entry.requirement, name),
        "v2_authenticated_repository_segment_size_invalid",
      );
      if (
        name === "object" &&
        descriptor.contentHash !== entry.requirement.contentHash
      )
        throw new Error("v2_authenticated_repository_object_hash_mismatch");
      if (name === "object") objectAggregateBytes += bytes.byteLength;
      result[name] = bytes;
    }
    return Object.freeze(
      result as unknown as V2AuthenticatedRepositoryBundleEntryInputV1,
    );
  });
  if (
    cursor !== blob.byteLength ||
    objectAggregateBytes !== Number(decoded.objectAggregateBytes)
  )
    throw new Error("v2_authenticated_repository_blob_layout_invalid");
  const manifest = deepFreeze({
    ...base,
    manifestFingerprint: fingerprint,
  }) as V2AuthenticatedRepositoryBundleManifestV1;
  return Object.freeze({ manifest, entries: Object.freeze(entries) });
}

function evidenceObjectPath(
  planFingerprint: string,
  requestFingerprint: string,
  kind: "manifest" | "blob" | "observation",
  contentHash: string,
): string {
  const prefix =
    kind === "manifest"
      ? V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage
          .repositoryPrivateManifestPrefix
      : kind === "blob"
        ? V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage
            .repositoryPrivateBundlePrefix
        : V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage
            .repositoryPrivateObservationPrefix;
  return `${prefix}/${exactString(planFingerprint, HASH_RE, "v2_authenticated_repository_origin_receipt_invalid")}/${exactString(requestFingerprint, HASH_RE, "v2_authenticated_repository_origin_receipt_invalid")}/${exactString(contentHash, HASH_RE, "v2_authenticated_repository_origin_receipt_invalid")}.${kind === "blob" ? "bin" : "json"}`;
}

export function v2AuthenticatedRepositoryManifestObjectPathV1(
  planFingerprint: string,
  requestFingerprint: string,
  manifestFingerprint: string,
): string {
  return evidenceObjectPath(
    planFingerprint,
    requestFingerprint,
    "manifest",
    manifestFingerprint,
  );
}

export function v2AuthenticatedRepositoryBlobObjectPathV1(
  planFingerprint: string,
  requestFingerprint: string,
  blobHash: string,
): string {
  return evidenceObjectPath(
    planFingerprint,
    requestFingerprint,
    "blob",
    blobHash,
  );
}

export function v2AuthenticatedRepositoryObservationObjectPathV1(
  planFingerprint: string,
  requestFingerprint: string,
  observationFingerprint: string,
): string {
  return evidenceObjectPath(
    planFingerprint,
    requestFingerprint,
    "observation",
    observationFingerprint,
  );
}

type OriginReceiptInput = Omit<
  V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1,
  "receiptFingerprint"
>;

function exactByteSize(value: unknown, maximum: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > maximum
  )
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  return Number(value);
}

function originReceiptBody(value: OriginReceiptInput) {
  const requirementCount = Number(value.requirementCount);
  const templateCount = Number(value.templateCount);
  if (
    !Number.isSafeInteger(requirementCount) ||
    requirementCount < V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MIN_V1 ||
    requirementCount > V2_AUTHENTICATED_REPOSITORY_REQUIREMENT_MAX_V1 ||
    !Number.isSafeInteger(templateCount) ||
    templateCount < 1 ||
    templateCount > V2_AUTHENTICATED_REPOSITORY_TEMPLATE_MAX_V1 ||
    requirementCount !== templateCount + 1
  )
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  return deepFreeze({
    schemaVersion: V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1,
    adapterProfile: Object.freeze({
      adapterId: "learning-v2-firebase-admin-repository-v1" as const,
      adapterVersion: 1 as const,
      namespaceFingerprint:
        V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1,
    }),
    planFingerprint: exactString(
      value.planFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    courseContractFingerprint: exactString(
      value.courseContractFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    repositoryScopeFingerprint: exactString(
      value.repositoryScopeFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    resolverContractFingerprint: exactString(
      value.resolverContractFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    requestFingerprint: exactString(
      value.requestFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    workspaceId: exactString(
      value.workspaceId,
      TOKEN_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    authoringRevision: exactVersion(
      value.authoringRevision,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    targetLanguage: exactString(
      value.targetLanguage,
      TOKEN_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    requirementCount,
    templateCount,
    requirementAggregateFingerprint: exactString(
      value.requirementAggregateFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    headAggregateFingerprint: exactString(
      value.headAggregateFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    bundleManifestFingerprint: exactString(
      value.bundleManifestFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    bundleManifestRawHash: exactString(
      value.bundleManifestRawHash,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    bundleBlobHash: exactString(
      value.bundleBlobHash,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    bundleManifestByteSize: exactByteSize(
      value.bundleManifestByteSize,
      V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1,
    ),
    bundleBlobByteSize: exactByteSize(
      value.bundleBlobByteSize,
      V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1,
    ),
    bundleManifestPin: parseV2AuthenticatedRepositoryObjectPinV1(
      value.bundleManifestPin,
      V2_AUTHENTICATED_REPOSITORY_MANIFEST_MAX_BYTES_V1,
    ),
    bundleBlobPin: parseV2AuthenticatedRepositoryObjectPinV1(
      value.bundleBlobPin,
      V2_AUTHENTICATED_REPOSITORY_BLOB_MAX_BYTES_V1,
    ),
    structuralObservationPin: parseV2AuthenticatedRepositoryObjectPinV1(
      value.structuralObservationPin,
      64 * 1024,
    ),
    structuralObservationFingerprint: exactString(
      value.structuralObservationFingerprint,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    structuralObservationRawHash: exactString(
      value.structuralObservationRawHash,
      HASH_RE,
      "v2_authenticated_repository_origin_receipt_invalid",
    ),
    repositoryOriginAuthenticity: "not_established_by_audit_parser" as const,
    claimedRepositoryOriginAuthenticity:
      "server_admin_sdk_authenticated_readback" as const,
    claimedRecordOriginEvidence:
      "firestore_admin_sdk_exact_paths_and_update_times" as const,
    claimedObjectOriginEvidence: "storage_generation_matched_readback" as const,
    claimedStorageExistenceEvidence: "exact_generation_readback" as const,
    recordOriginAuthority: "none" as const,
    objectOriginAuthority: "none" as const,
    storageExistenceAuthority: "none" as const,
    lifecycleAuthority: "none" as const,
    candidateOriginAuthority: "none" as const,
    contentValidationAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
    trustBoundary:
      "audit_only_claim_requires_private_admin_adapter_brand" as const,
  });
}

const ORIGIN_RECEIPT_STRUCTURAL_INPUT_KEYS = Object.freeze([
  "planFingerprint",
  "courseContractFingerprint",
  "repositoryScopeFingerprint",
  "resolverContractFingerprint",
  "requestFingerprint",
  "workspaceId",
  "authoringRevision",
  "targetLanguage",
  "requirementCount",
  "templateCount",
  "requirementAggregateFingerprint",
  "headAggregateFingerprint",
  "bundleManifestFingerprint",
  "bundleManifestRawHash",
  "bundleBlobHash",
  "bundleManifestByteSize",
  "bundleBlobByteSize",
  "bundleManifestPin",
  "bundleBlobPin",
  "structuralObservationPin",
  "structuralObservationFingerprint",
  "structuralObservationRawHash",
] as const);

/**
 * Encodes only the public audit claim. It intentionally fixes every authority
 * literal to none and cannot mint the private Firebase Admin adapter brand.
 */
export function encodeV2AuthenticatedRepositoryOriginReceiptStructuralClaimV1(
  input: V2AuthenticatedRepositoryOriginReceiptStructuralClaimInputV1,
): Readonly<{
  raw: string;
  claim: V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1;
}> {
  if (
    !isRecord(input) ||
    !exactKeys(input, ORIGIN_RECEIPT_STRUCTURAL_INPUT_KEYS)
  )
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  const body = originReceiptBody({
    ...input,
    schemaVersion: V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1,
    adapterProfile: Object.freeze({
      adapterId: "learning-v2-firebase-admin-repository-v1" as const,
      adapterVersion: 1 as const,
      namespaceFingerprint:
        V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1,
    }),
    repositoryOriginAuthenticity: "not_established_by_audit_parser",
    claimedRepositoryOriginAuthenticity:
      "server_admin_sdk_authenticated_readback",
    claimedRecordOriginEvidence:
      "firestore_admin_sdk_exact_paths_and_update_times",
    claimedObjectOriginEvidence: "storage_generation_matched_readback",
    claimedStorageExistenceEvidence: "exact_generation_readback",
    recordOriginAuthority: "none",
    objectOriginAuthority: "none",
    storageExistenceAuthority: "none",
    lifecycleAuthority: "none",
    candidateOriginAuthority: "none",
    contentValidationAuthority: "none",
    humanReviewAuthority: "none",
    specialistEvidenceAuthority: "none",
    deviceEvidenceAuthority: "none",
    listeningEvidenceAuthority: "none",
    executionAuthority: "none",
    publicationPolicy: "draft_only_no_consumer",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
    trustBoundary: "audit_only_claim_requires_private_admin_adapter_brand",
  });
  const raw = canonicalJsonV1({
    ...body,
    receiptFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(raw) >
    V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_MAX_BYTES_V1
  )
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  return Object.freeze({
    raw,
    claim: parseV2AuthenticatedRepositoryOriginReceiptV1(raw),
  });
}

/** Audit-only structural parser. It never issues the private Admin adapter brand. */
export function parseV2AuthenticatedRepositoryOriginReceiptV1(
  raw: string,
): V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1 {
  if (
    typeof raw !== "string" ||
    utf8ByteLengthV1(raw) >
      V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_MAX_BYTES_V1
  )
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  }
  assertBoundedJsonTree(
    decoded,
    "v2_authenticated_repository_origin_receipt_complexity_invalid",
  );
  const keys = [
    "schemaVersion",
    "adapterProfile",
    "planFingerprint",
    "courseContractFingerprint",
    "repositoryScopeFingerprint",
    "resolverContractFingerprint",
    "requestFingerprint",
    "workspaceId",
    "authoringRevision",
    "targetLanguage",
    "requirementCount",
    "templateCount",
    "requirementAggregateFingerprint",
    "headAggregateFingerprint",
    "bundleManifestFingerprint",
    "bundleManifestRawHash",
    "bundleBlobHash",
    "bundleManifestByteSize",
    "bundleBlobByteSize",
    "bundleManifestPin",
    "bundleBlobPin",
    "structuralObservationPin",
    "structuralObservationFingerprint",
    "structuralObservationRawHash",
    "repositoryOriginAuthenticity",
    "claimedRepositoryOriginAuthenticity",
    "claimedRecordOriginEvidence",
    "claimedObjectOriginEvidence",
    "claimedStorageExistenceEvidence",
    "recordOriginAuthority",
    "objectOriginAuthority",
    "storageExistenceAuthority",
    "lifecycleAuthority",
    "candidateOriginAuthority",
    "contentValidationAuthority",
    "humanReviewAuthority",
    "specialistEvidenceAuthority",
    "deviceEvidenceAuthority",
    "listeningEvidenceAuthority",
    "executionAuthority",
    "publicationPolicy",
    "runtimeConsumer",
    "releaseEligible",
    "releaseAuthority",
    "trustBoundary",
    "receiptFingerprint",
  ] as const;
  if (
    !isRecord(decoded) ||
    !exactKeys(decoded, keys) ||
    canonicalJsonV1(decoded) !== raw ||
    decoded.schemaVersion !==
      V2_AUTHENTICATED_REPOSITORY_ORIGIN_RECEIPT_SCHEMA_V1 ||
    !isRecord(decoded.adapterProfile) ||
    !exactKeys(decoded.adapterProfile, [
      "adapterId",
      "adapterVersion",
      "namespaceFingerprint",
    ]) ||
    decoded.adapterProfile.adapterId !==
      "learning-v2-firebase-admin-repository-v1" ||
    decoded.adapterProfile.adapterVersion !== 1 ||
    decoded.adapterProfile.namespaceFingerprint !==
      V2_AUTHENTICATED_REPOSITORY_PRODUCTION_NAMESPACE_FINGERPRINT_V1 ||
    decoded.repositoryOriginAuthenticity !==
      "not_established_by_audit_parser" ||
    decoded.claimedRepositoryOriginAuthenticity !==
      "server_admin_sdk_authenticated_readback" ||
    decoded.claimedRecordOriginEvidence !==
      "firestore_admin_sdk_exact_paths_and_update_times" ||
    decoded.claimedObjectOriginEvidence !==
      "storage_generation_matched_readback" ||
    decoded.claimedStorageExistenceEvidence !== "exact_generation_readback" ||
    decoded.recordOriginAuthority !== "none" ||
    decoded.objectOriginAuthority !== "none" ||
    decoded.storageExistenceAuthority !== "none" ||
    decoded.lifecycleAuthority !== "none" ||
    decoded.candidateOriginAuthority !== "none" ||
    decoded.contentValidationAuthority !== "none" ||
    decoded.humanReviewAuthority !== "none" ||
    decoded.specialistEvidenceAuthority !== "none" ||
    decoded.deviceEvidenceAuthority !== "none" ||
    decoded.listeningEvidenceAuthority !== "none" ||
    decoded.executionAuthority !== "none" ||
    decoded.publicationPolicy !== "draft_only_no_consumer" ||
    decoded.runtimeConsumer !== false ||
    decoded.releaseEligible !== false ||
    decoded.releaseAuthority !== false ||
    decoded.trustBoundary !==
      "audit_only_claim_requires_private_admin_adapter_brand"
  )
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  const body = originReceiptBody(decoded as unknown as OriginReceiptInput);
  const fingerprint = exactString(
    decoded.receiptFingerprint,
    HASH_RE,
    "v2_authenticated_repository_origin_receipt_invalid",
  );
  if (fingerprint !== hashCanonicalBody(body))
    throw new Error("v2_authenticated_repository_origin_receipt_invalid");
  if (
    body.bundleManifestPin.objectPath !==
      v2AuthenticatedRepositoryManifestObjectPathV1(
        body.planFingerprint,
        body.requestFingerprint,
        body.bundleManifestFingerprint,
      ) ||
    body.bundleManifestPin.contentHash !== body.bundleManifestRawHash ||
    body.bundleManifestPin.byteSize !== body.bundleManifestByteSize ||
    body.bundleBlobPin.objectPath !==
      v2AuthenticatedRepositoryBlobObjectPathV1(
        body.planFingerprint,
        body.requestFingerprint,
        body.bundleBlobHash,
      ) ||
    body.bundleBlobPin.contentHash !== body.bundleBlobHash ||
    body.bundleBlobPin.byteSize !== body.bundleBlobByteSize ||
    body.structuralObservationPin.objectPath !==
      v2AuthenticatedRepositoryObservationObjectPathV1(
        body.planFingerprint,
        body.requestFingerprint,
        body.structuralObservationFingerprint,
      ) ||
    body.structuralObservationPin.contentHash !==
      body.structuralObservationRawHash
  )
    throw new Error("v2_authenticated_repository_origin_receipt_pin_invalid");
  return deepFreeze({
    ...body,
    receiptFingerprint: fingerprint,
  }) as V2AuthenticatedRepositoryOriginReceiptStructuralClaimV1;
}
