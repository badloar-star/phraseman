import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2,
  parseLearningV2ActivityLearnerCoreReleaseIndexV2,
  type LearningV2ActivityLearnerCoreReleaseIndexV2,
} from "../../../modules/learning-v2/runtime/activity_learner_core_release_index_v2";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V2 =
  "v2-activity-learner-core-release-pointer.v2" as const;
export const V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V2 = 32 * 1024;
export const V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V2 =
  "content_v2_activity_learner_core_release_pointers" as const;

export interface V2ActivityLearnerCoreReleasePointerV2 {
  readonly schemaVersion: typeof V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V2;
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly indexFingerprint: string;
  readonly ownerInputFingerprint: string;
  readonly ownerConfirmationFingerprint: string;
  readonly indexObject: V2RepositoryImmutableObjectPinV1;
  readonly repositoryAuthority: "none_structural_pointer_only";
  readonly runtimeAuthority: "none_admin_readback_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly pointerFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("v2_activity_learner_core_release_pointer_v2_invalid");
}

function id(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

export function v2ActivityLearnerCoreReleasePointerDocumentPathV2(input: {
  readonly activeManifestHash: string;
  readonly episodeId: string;
}) {
  return `${V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_COLLECTION_V2}/${hash(input.activeManifestHash)}__${sha256Utf8(id(input.episodeId))}`;
}

export function v2ActivityLearnerCoreReleaseIndexObjectPathV2(input: {
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}) {
  return `learning-v2/activity-learner-core-release-index-v2/${hash(input.activeManifestHash)}/${sha256Utf8(id(input.episodeId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}

function body(
  index: LearningV2ActivityLearnerCoreReleaseIndexV2,
  generation: string,
) {
  const core = parseLearningV2ActivityLearnerCoreReleaseIndexV2(
    canonicalJsonV1(index),
  );
  if (!GENERATION_RE.test(generation)) fail();
  const raw = canonicalJsonV1(core);
  const rawHash = sha256Utf8(raw);
  return {
    schemaVersion: V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V2,
    environment: parseLearningV2ActivityLearnerCoreReleaseIndexV2(
      raw,
    ).coreIndexV1Raw
      ? (JSON.parse(core.coreIndexV1Raw).environment as
          | "lab"
          | "staging"
          | "production")
      : fail(),
    releaseId: id(JSON.parse(core.coreIndexV1Raw).releaseId),
    activeManifestHash: hash(JSON.parse(core.coreIndexV1Raw).activeManifestHash),
    seasonId: id(JSON.parse(core.coreIndexV1Raw).seasonId),
    episodeId: id(JSON.parse(core.coreIndexV1Raw).episodeId),
    stageId: id(JSON.parse(core.coreIndexV1Raw).stageId),
    activityPackageFingerprint: hash(
      JSON.parse(core.coreIndexV1Raw).activityPackageFingerprint,
    ),
    indexFingerprint: core.indexFingerprint,
    ownerInputFingerprint: core.ownerInputFingerprint,
    ownerConfirmationFingerprint: core.ownerConfirmationFingerprint,
    indexObject: {
      objectPath: v2ActivityLearnerCoreReleaseIndexObjectPathV2({
        activeManifestHash: JSON.parse(core.coreIndexV1Raw).activeManifestHash,
        episodeId: JSON.parse(core.coreIndexV1Raw).episodeId,
        indexFingerprint: core.indexFingerprint,
        rawHash,
      }),
      contentHash: rawHash,
      objectGeneration: generation,
      byteSize: utf8ByteLengthV1(raw),
      contentType: "application/json; charset=utf-8" as const,
    },
    repositoryAuthority: "none_structural_pointer_only" as const,
    runtimeAuthority: "none_admin_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
}

export function materializeV2ActivityLearnerCoreReleasePointerV2(input: {
  readonly indexRaw: string;
  readonly indexObjectGeneration: string;
}): V2ActivityLearnerCoreReleasePointerV2 {
  const index = parseLearningV2ActivityLearnerCoreReleaseIndexV2(input.indexRaw);
  const value = body(index, input.indexObjectGeneration);
  const result = Object.freeze({
    ...value,
    pointerFingerprint: hashCanonicalBody(value),
  });
  handles.add(result);
  return result;
}

export function parseV2ActivityLearnerCoreReleasePointerV2(
  raw: string,
  indexRaw: string,
): V2ActivityLearnerCoreReleasePointerV2 {
  if (
    typeof raw !== "string" ||
    raw.length < 2 ||
    raw.length > V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) > V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V2
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(value) !== raw || typeof value !== "object" || value === null)
    fail();
  const row = value as Record<string, unknown>;
  const index = parseLearningV2ActivityLearnerCoreReleaseIndexV2(indexRaw);
  const generation = (row.indexObject as Record<string, unknown>)?.objectGeneration;
  if (typeof generation !== "string") fail();
  const expected = body(index, generation);
  const expectedResult = {
    ...expected,
    pointerFingerprint: hashCanonicalBody(expected),
  };
  if (canonicalJsonV1(expectedResult) !== raw) fail();
  const result = Object.freeze(expectedResult);
  handles.add(result);
  return result;
}

export function inspectV2ActivityLearnerCoreReleaseIndexPermitV2(raw: string) {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (
    canonicalJsonV1(value) !== raw ||
    typeof value !== "object" ||
    value === null
  )
    fail();
  const row = value as Record<string, unknown>;
  const pin = row.indexObject;
  if (
    row.schemaVersion !== V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_SCHEMA_V2 ||
    !pin ||
    typeof pin !== "object"
  )
    fail();
  const indexObject = pin as Record<string, unknown>;
  if (
    typeof indexObject.objectPath !== "string" ||
    typeof indexObject.contentHash !== "string" ||
    typeof indexObject.objectGeneration !== "string" ||
    typeof indexObject.byteSize !== "number" ||
    indexObject.contentType !== "application/json; charset=utf-8" ||
    Number(indexObject.byteSize) >
      LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V2
  )
    fail();
  return Object.freeze({
    environment: row.environment,
    releaseId: id(row.releaseId),
    activeManifestHash: hash(row.activeManifestHash),
    seasonId: id(row.seasonId),
    episodeId: id(row.episodeId),
    stageId: id(row.stageId),
    activityPackageFingerprint: hash(row.activityPackageFingerprint),
    indexFingerprint: hash(row.indexFingerprint),
    ownerInputFingerprint: hash(row.ownerInputFingerprint),
    ownerConfirmationFingerprint: hash(row.ownerConfirmationFingerprint),
    indexObject: Object.freeze({
      objectPath: indexObject.objectPath,
      contentHash: hash(indexObject.contentHash),
      objectGeneration: indexObject.objectGeneration,
      byteSize: Number(indexObject.byteSize),
      contentType: "application/json; charset=utf-8" as const,
    }),
    permitAuthority: "none_untrusted_read_permit_only" as const,
  });
}

export function encodeV2ActivityLearnerCoreReleasePointerV2(
  pointer: V2ActivityLearnerCoreReleasePointerV2,
) {
  if (!isV2ActivityLearnerCoreReleasePointerV2(pointer)) fail();
  return canonicalJsonV1(pointer);
}

export function isV2ActivityLearnerCoreReleasePointerV2(
  value: unknown,
): value is V2ActivityLearnerCoreReleasePointerV2 {
  return typeof value === "object" && value !== null && handles.has(value);
}
