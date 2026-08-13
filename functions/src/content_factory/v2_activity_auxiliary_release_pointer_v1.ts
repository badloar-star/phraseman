import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1,
  parseLearningV2ActivityAuxiliaryReleaseIndexV1,
  type LearningV2ActivityAuxiliaryReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 =
  "v2-activity-auxiliary-release-pointer.v1" as const;
export const V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 = 32 * 1024;
export const V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_COLLECTION_V1 =
  "content_v2_activity_auxiliary_release_pointers" as const;

export interface V2ActivityAuxiliaryReleasePointerV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1;
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly lessonUnitObject: Readonly<{
    path: string;
    generation: string;
    contentHash: string;
    byteSize: number;
  }>;
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

export interface V2ActivityAuxiliaryReleaseIndexPermitV1 {
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly lessonUnitObject: Readonly<{
    path: string;
    generation: string;
    contentHash: string;
    byteSize: number;
  }>;
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
  "lessonUnitObject",
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
const OBJECT_KEYS = Object.freeze([
  "path",
  "generation",
  "contentHash",
  "byteSize",
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
  throw new Error("v2_activity_auxiliary_release_pointer_invalid");
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function exactObject(value: unknown) {
  if (!isRecord(value)) fail();
  exactKeys(value, OBJECT_KEYS);
  if (
    typeof value.path !== "string" ||
    value.path.length < 1 ||
    value.path.length > 1024 ||
    value.path.startsWith("/") ||
    value.path.includes("..") ||
    typeof value.generation !== "string" ||
    value.generation.length < 1 ||
    value.generation.length > 160 ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1
  )
    fail();
  return Object.freeze({
    path: value.path,
    generation: value.generation,
    contentHash: exactHash(value.contentHash),
    byteSize: Number(value.byteSize),
  });
}

function exactIndexPin(
  value: unknown,
  index: LearningV2ActivityAuxiliaryReleaseIndexV1,
) {
  if (!isRecord(value)) fail();
  exactKeys(value, PIN_KEYS);
  if (
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) >
      LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail();
  const contentHash = exactHash(value.contentHash);
  const expectedPath = v2ActivityAuxiliaryReleaseIndexObjectPathV1({
    activeManifestHash: index.activeManifestHash,
    episodeId: index.episodeId,
    indexFingerprint: index.indexFingerprint,
    rawHash: contentHash,
  });
  if (value.objectPath !== expectedPath) fail();
  return Object.freeze({
    objectPath: expectedPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function exactIndexPinFromClaim(
  value: unknown,
  input: Readonly<{
    activeManifestHash: string;
    episodeId: string;
    indexFingerprint: string;
  }>,
) {
  if (!isRecord(value)) fail();
  exactKeys(value, PIN_KEYS);
  if (
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) >
      LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail();
  const contentHash = exactHash(value.contentHash);
  const expectedPath = v2ActivityAuxiliaryReleaseIndexObjectPathV1({
    ...input,
    rawHash: contentHash,
  });
  if (value.objectPath !== expectedPath) fail();
  return Object.freeze({
    objectPath: expectedPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

export function v2ActivityAuxiliaryReleasePointerDocumentPathV1(
  input: Readonly<{
    activeManifestHash: string;
    episodeId: string;
  }>,
): string {
  const activeManifestHash = exactHash(input.activeManifestHash);
  const episodeId = exactId(input.episodeId);
  return `${V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_COLLECTION_V1}/${activeManifestHash}__${sha256Utf8(episodeId)}`;
}

export function v2ActivityAuxiliaryReleaseIndexObjectPathV1(
  input: Readonly<{
    activeManifestHash: string;
    episodeId: string;
    indexFingerprint: string;
    rawHash: string;
  }>,
): string {
  return `learning-v2/activity-auxiliary-release-index/${exactHash(input.activeManifestHash)}/${sha256Utf8(exactId(input.episodeId))}/${exactHash(input.indexFingerprint)}/${exactHash(input.rawHash)}.json`;
}

export function materializeV2ActivityAuxiliaryReleasePointerV1(
  input: Readonly<{
    indexRaw: string;
    indexObjectGeneration: string;
  }>,
): V2ActivityAuxiliaryReleasePointerV1 {
  const index = parseLearningV2ActivityAuxiliaryReleaseIndexV1(input.indexRaw);
  if (
    typeof input.indexObjectGeneration !== "string" ||
    !GENERATION_RE.test(input.indexObjectGeneration)
  )
    fail();
  const rawHash = sha256Utf8(input.indexRaw);
  const body = {
    schemaVersion: V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1,
    environment: index.environment,
    releaseId: index.releaseId,
    activeManifestHash: index.activeManifestHash,
    seasonId: index.seasonId,
    episodeId: index.episodeId,
    lessonUnitObject: index.lessonUnitObject,
    stageId: index.stageId,
    activityPackageFingerprint: index.activityPackageFingerprint,
    indexFingerprint: index.indexFingerprint,
    indexObject: Object.freeze({
      objectPath: v2ActivityAuxiliaryReleaseIndexObjectPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId: index.episodeId,
        indexFingerprint: index.indexFingerprint,
        rawHash,
      }),
      contentHash: rawHash,
      objectGeneration: input.indexObjectGeneration,
      byteSize: utf8ByteLengthV1(input.indexRaw),
      contentType: "application/json; charset=utf-8" as const,
    }),
    repositoryAuthority: "none_structural_pointer_only" as const,
    runtimeAuthority: "none_admin_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseV2ActivityAuxiliaryReleasePointerV1(
    canonicalJsonV1({ ...body, pointerFingerprint: hashCanonicalBody(body) }),
    index,
  );
}

export function inspectV2ActivityAuxiliaryReleaseIndexPermitV1(
  raw: string,
  expected: Readonly<{
    environment: "lab" | "staging" | "production";
    releaseId: string;
    activeManifestHash: string;
    seasonId: string;
    episodeId: string;
    lessonUnitObject: Readonly<{
      path: string;
      generation: string;
      contentHash: string;
      byteSize: number;
    }>;
  }>,
): V2ActivityAuxiliaryReleaseIndexPermitV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!isRecord(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, POINTER_KEYS);
  if (
    value.schemaVersion !== V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 ||
    value.environment !== expected.environment ||
    value.releaseId !== expected.releaseId ||
    value.activeManifestHash !== expected.activeManifestHash ||
    value.seasonId !== expected.seasonId ||
    value.episodeId !== expected.episodeId ||
    value.repositoryAuthority !== "none_structural_pointer_only" ||
    value.runtimeAuthority !== "none_admin_readback_required" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const lessonUnitObject = exactObject(value.lessonUnitObject);
  if (
    canonicalJsonV1(lessonUnitObject) !==
    canonicalJsonV1(expected.lessonUnitObject)
  )
    fail();
  const stageId = exactId(value.stageId);
  const activityPackageFingerprint = exactHash(
    value.activityPackageFingerprint,
  );
  const indexFingerprint = exactHash(value.indexFingerprint);
  const indexObject = exactIndexPinFromClaim(value.indexObject, {
    activeManifestHash: expected.activeManifestHash,
    episodeId: expected.episodeId,
    indexFingerprint,
  });
  const body = {
    schemaVersion: V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1,
    environment: expected.environment,
    releaseId: expected.releaseId,
    activeManifestHash: expected.activeManifestHash,
    seasonId: expected.seasonId,
    episodeId: expected.episodeId,
    lessonUnitObject,
    stageId,
    activityPackageFingerprint,
    indexFingerprint,
    indexObject,
    repositoryAuthority: "none_structural_pointer_only" as const,
    runtimeAuthority: "none_admin_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  if (hashCanonicalBody(body) !== exactHash(value.pointerFingerprint)) fail();
  return Object.freeze({
    environment: expected.environment,
    releaseId: expected.releaseId,
    activeManifestHash: expected.activeManifestHash,
    seasonId: expected.seasonId,
    episodeId: expected.episodeId,
    lessonUnitObject,
    stageId,
    activityPackageFingerprint,
    indexFingerprint,
    indexObject,
    permitAuthority: "none_untrusted_read_permit_only" as const,
  });
}

export function parseV2ActivityAuxiliaryReleasePointerV1(
  raw: string,
  index: LearningV2ActivityAuxiliaryReleaseIndexV1,
): V2ActivityAuxiliaryReleasePointerV1 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!isRecord(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, POINTER_KEYS);
  if (
    value.schemaVersion !== V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1 ||
    value.environment !== index.environment ||
    value.releaseId !== index.releaseId ||
    value.activeManifestHash !== index.activeManifestHash ||
    value.seasonId !== index.seasonId ||
    value.episodeId !== index.episodeId ||
    value.stageId !== index.stageId ||
    value.activityPackageFingerprint !== index.activityPackageFingerprint ||
    value.indexFingerprint !== index.indexFingerprint ||
    value.repositoryAuthority !== "none_structural_pointer_only" ||
    value.runtimeAuthority !== "none_admin_readback_required" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const lessonUnitObject = exactObject(value.lessonUnitObject);
  if (
    canonicalJsonV1(lessonUnitObject) !==
    canonicalJsonV1(index.lessonUnitObject)
  )
    fail();
  const body = {
    schemaVersion: V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_SCHEMA_V1,
    environment: index.environment,
    releaseId: index.releaseId,
    activeManifestHash: index.activeManifestHash,
    seasonId: index.seasonId,
    episodeId: index.episodeId,
    lessonUnitObject,
    stageId: index.stageId,
    activityPackageFingerprint: index.activityPackageFingerprint,
    indexFingerprint: index.indexFingerprint,
    indexObject: exactIndexPin(value.indexObject, index),
    repositoryAuthority: "none_structural_pointer_only" as const,
    runtimeAuthority: "none_admin_readback_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const pointerFingerprint = exactHash(value.pointerFingerprint);
  if (hashCanonicalBody(body) !== pointerFingerprint) fail();
  const pointer = Object.freeze({ ...body, pointerFingerprint });
  handles.add(pointer);
  return pointer;
}

export function encodeV2ActivityAuxiliaryReleasePointerV1(
  pointer: V2ActivityAuxiliaryReleasePointerV1,
): string {
  if (!isV2ActivityAuxiliaryReleasePointerV1(pointer)) fail();
  return canonicalJsonV1(pointer);
}

export function isV2ActivityAuxiliaryReleasePointerV1(
  value: unknown,
): value is V2ActivityAuxiliaryReleasePointerV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
