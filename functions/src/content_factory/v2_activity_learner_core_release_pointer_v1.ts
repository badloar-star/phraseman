import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
  parseLearningV2ActivityLearnerCoreReleaseIndexV1,
  type LearningV2ActivityLearnerCoreReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1 =
  "v2-activity-learner-core-release-pointer.v1" as const;
export const V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1 = 32 * 1024;
export const V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V1 =
  "content_v2_activity_learner_core_release_pointers" as const;

export interface V2ActivityLearnerCoreReleasePointerV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1;
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly indexFingerprint: string;
  readonly indexObject: V2RepositoryImmutableObjectPinV1;
  readonly repositoryAuthority: "none_structural_pointer_only";
  readonly runtimeAuthority: "none_admin_readback_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly pointerFingerprint: string;
}

export interface V2ActivityLearnerCoreReleaseIndexPermitV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly indexFingerprint: string;
  readonly indexObject: V2RepositoryImmutableObjectPinV1;
  readonly permitAuthority: "none_untrusted_read_permit_only";
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const POINTER_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "releaseId",
  "activeManifestHash",
  "seasonId",
  "episodeId",
  "stageId",
  "activityPackageFingerprint",
  "indexFingerprint",
  "indexObject",
  "repositoryAuthority",
  "runtimeAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "pointerFingerprint",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_activity_learner_core_release_pointer_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
  )
    fail();
}

function id(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

export function v2ActivityLearnerCoreReleasePointerDocumentPathV1(input: {
  readonly activeManifestHash: string;
  readonly episodeId: string;
}): string {
  return `${V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V1}/${hash(input.activeManifestHash)}__${sha256Utf8(id(input.episodeId))}`;
}

export function v2ActivityLearnerCoreReleaseIndexObjectPathV1(input: {
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}): string {
  return `learning-v2/activity-learner-core-release-index/${hash(input.activeManifestHash)}/${sha256Utf8(id(input.episodeId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}

function indexPin(
  value: unknown,
  expected: {
    readonly activeManifestHash: string;
    readonly episodeId: string;
    readonly indexFingerprint: string;
  },
): V2RepositoryImmutableObjectPinV1 {
  if (!record(value)) fail();
  exactKeys(value, PIN_KEYS);
  if (
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) >
      LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail();
  const contentHash = hash(value.contentHash);
  const objectPath = v2ActivityLearnerCoreReleaseIndexObjectPathV1({
    ...expected,
    rawHash: contentHash,
  });
  if (value.objectPath !== objectPath) fail();
  return Object.freeze({
    objectPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function body(
  value: Record<string, unknown>,
  expected?: LearningV2ActivityLearnerCoreReleaseIndexV1,
) {
  exactKeys(value, POINTER_KEYS);
  if (
    value.schemaVersion !==
      V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    value.repositoryAuthority !== "none_structural_pointer_only" ||
    value.runtimeAuthority !== "none_admin_readback_required" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const parsed = {
    schemaVersion: V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1,
    environment: value.environment as "lab" | "staging" | "production",
    releaseId: id(value.releaseId),
    activeManifestHash: hash(value.activeManifestHash),
    seasonId: id(value.seasonId),
    episodeId: id(value.episodeId),
    stageId: id(value.stageId),
    activityPackageFingerprint: hash(value.activityPackageFingerprint),
    indexFingerprint: hash(value.indexFingerprint),
    repositoryAuthority: "none_structural_pointer_only" as const,
    runtimeAuthority: "none_admin_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  if (
    expected &&
    (parsed.environment !== expected.environment ||
      parsed.releaseId !== expected.releaseId ||
      parsed.activeManifestHash !== expected.activeManifestHash ||
      parsed.seasonId !== expected.seasonId ||
      parsed.episodeId !== expected.episodeId ||
      parsed.stageId !== expected.stageId ||
      parsed.activityPackageFingerprint !==
        expected.activityPackageFingerprint ||
      parsed.indexFingerprint !== expected.indexFingerprint)
  )
    fail();
  return Object.freeze({
    ...parsed,
    indexObject: indexPin(value.indexObject, parsed),
  });
}

export function materializeV2ActivityLearnerCoreReleasePointerV1(input: {
  readonly indexRaw: string;
  readonly indexObjectGeneration: string;
}): V2ActivityLearnerCoreReleasePointerV1 {
  const index = parseLearningV2ActivityLearnerCoreReleaseIndexV1(
    input.indexRaw,
  );
  if (!GENERATION_RE.test(input.indexObjectGeneration)) fail();
  const rawHash = sha256Utf8(input.indexRaw);
  const value = {
    schemaVersion: V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V1,
    environment: index.environment,
    releaseId: index.releaseId,
    activeManifestHash: index.activeManifestHash,
    seasonId: index.seasonId,
    episodeId: index.episodeId,
    stageId: index.stageId,
    activityPackageFingerprint: index.activityPackageFingerprint,
    indexFingerprint: index.indexFingerprint,
    indexObject: {
      objectPath: v2ActivityLearnerCoreReleaseIndexObjectPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId: index.episodeId,
        indexFingerprint: index.indexFingerprint,
        rawHash,
      }),
      contentHash: rawHash,
      objectGeneration: input.indexObjectGeneration,
      byteSize: utf8ByteLengthV1(input.indexRaw),
      contentType: "application/json; charset=utf-8" as const,
    },
    repositoryAuthority: "none_structural_pointer_only" as const,
    runtimeAuthority: "none_admin_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseV2ActivityLearnerCoreReleasePointerV1(
    canonicalJsonV1({ ...value, pointerFingerprint: hashCanonicalBody(value) }),
    index,
  );
}

export function inspectV2ActivityLearnerCoreReleaseIndexPermitV1(
  raw: string,
  expected: {
    readonly environment: "lab" | "staging" | "production";
    readonly releaseId: string;
    readonly activeManifestHash: string;
    readonly seasonId: string;
    readonly episodeId: string;
  },
): V2ActivityLearnerCoreReleaseIndexPermitV1 {
  const value = parseRaw(raw);
  const parsed = body(value);
  if (
    parsed.environment !== expected.environment ||
    parsed.releaseId !== expected.releaseId ||
    parsed.activeManifestHash !== expected.activeManifestHash ||
    parsed.seasonId !== expected.seasonId ||
    parsed.episodeId !== expected.episodeId ||
    hashCanonicalBody(parsed) !== hash(value.pointerFingerprint)
  )
    fail();
  return Object.freeze({
    environment: parsed.environment,
    releaseId: parsed.releaseId,
    activeManifestHash: parsed.activeManifestHash,
    seasonId: parsed.seasonId,
    episodeId: parsed.episodeId,
    stageId: parsed.stageId,
    activityPackageFingerprint: parsed.activityPackageFingerprint,
    indexFingerprint: parsed.indexFingerprint,
    indexObject: parsed.indexObject,
    permitAuthority: "none_untrusted_read_permit_only" as const,
  });
}

function parseRaw(raw: string): Record<string, unknown> {
  if (
    typeof raw !== "string" ||
    raw.length > V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  return value;
}

export function parseV2ActivityLearnerCoreReleasePointerV1(
  raw: string,
  index: LearningV2ActivityLearnerCoreReleaseIndexV1,
): V2ActivityLearnerCoreReleasePointerV1 {
  const value = parseRaw(raw);
  const parsedBody = body(value, index);
  const pointerFingerprint = hash(value.pointerFingerprint);
  if (hashCanonicalBody(parsedBody) !== pointerFingerprint) fail();
  const result = Object.freeze({ ...parsedBody, pointerFingerprint });
  handles.add(result);
  return result;
}

export function encodeV2ActivityLearnerCoreReleasePointerV1(
  pointer: V2ActivityLearnerCoreReleasePointerV1,
): string {
  if (!isV2ActivityLearnerCoreReleasePointerV1(pointer)) fail();
  return canonicalJsonV1(pointer);
}

export function isV2ActivityLearnerCoreReleasePointerV1(
  value: unknown,
): value is V2ActivityLearnerCoreReleasePointerV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
