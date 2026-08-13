import {
  resolveV2ReleaseManifest,
  validatePublishedV2SeasonManifest,
  type V2PublishedSeasonManifestView,
  type V2ReleaseEnvironment,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
} from "./v2_activity_session_projection";
import { v2ActivitySessionProjectionObjectPath } from "./v2_activity_instances_package_v2";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1 =
  "v2-activity-server-evaluator-release-index.v1" as const;
export const V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1 =
  "v2-activity-server-evaluator-release-pointer.v1" as const;
export const V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1 =
  128 * 1024;
export const V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1 =
  32 * 1024;
export const V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_COLLECTION_V1 =
  "content_v2_activity_server_evaluator_release_pointers" as const;

export interface V2ActivityServerEvaluatorReleaseSessionV1 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sourceFingerprint: string;
  readonly sidecarFingerprint: string;
  readonly commitmentAggregate: string;
  readonly sidecar: V2RepositoryImmutableObjectPinV1;
}

export interface V2ActivityServerEvaluatorReleaseIndexV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly validatorSummaryFingerprint: string;
  readonly sessions: readonly V2ActivityServerEvaluatorReleaseSessionV1[];
  readonly sessionCount: 12;
  readonly objectCount: 12;
  readonly serverOnly: true;
  readonly clientDelivery: "forbidden";
  readonly evaluatorKeyAuthority: "candidate_data_only";
  readonly evaluationAuthority: "none_server_policy_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export interface V2ActivityServerEvaluatorReleasePointerV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly indexFingerprint: string;
  readonly indexObject: V2RepositoryImmutableObjectPinV1;
  readonly serverOnly: true;
  readonly clientDelivery: "forbidden";
  readonly repositoryAuthority: "none_admin_readback_required";
  readonly evaluationAuthority: "none_server_policy_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly pointerFingerprint: string;
}

export interface V2ActivityServerEvaluatorReleaseSessionMaterialInputV1 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sidecarRaw: string;
  readonly sidecarPin: V2RepositoryImmutableObjectPinV1;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const indexHandles = new WeakSet<object>();
const pointerHandles = new WeakSet<object>();
const INDEX_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "releaseId",
  "activeManifestHash",
  "seasonId",
  "studyTarget",
  "learnerSourceLocale",
  "episodeId",
  "stageId",
  "activityPackageFingerprint",
  "validatorSummaryFingerprint",
  "sessions",
  "sessionCount",
  "objectCount",
  "serverOnly",
  "clientDelivery",
  "evaluatorKeyAuthority",
  "evaluationAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "indexFingerprint",
] as const);
const SESSION_KEYS = Object.freeze([
  "sessionId",
  "sessionOrdinal",
  "sourceFingerprint",
  "sidecarFingerprint",
  "commitmentAggregate",
  "sidecar",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const SIDECAR_KEYS = Object.freeze([
  "schemaVersion",
  "sourceFingerprint",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "tasks",
  "commitmentAggregate",
  "serverOnly",
  "evaluationAuthority",
  "rewardAuthority",
  "releaseAuthority",
] as const);
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
  "serverOnly",
  "clientDelivery",
  "repositoryAuthority",
  "evaluationAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "pointerFingerprint",
] as const);

function fail(): never {
  throw new Error("v2_activity_server_evaluator_release_invalid");
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
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => typeof key !== "string" || !expected.includes(key))
  )
    fail();
}

function id(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
    fail();
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function canonical(
  raw: unknown,
  maximumBytes: number,
): Record<string, unknown> {
  if (
    typeof raw !== "string" ||
    raw.length > maximumBytes ||
    utf8ByteLengthV1(raw) > maximumBytes
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

function parsePin(
  value: unknown,
  stageId: string,
  sessionOrdinal: number,
  expectedRaw?: string,
): V2RepositoryImmutableObjectPinV1 {
  if (!record(value)) fail();
  exactKeys(value, PIN_KEYS);
  const contentHash = hash(value.contentHash);
  if (
    value.objectPath !==
      v2ActivitySessionProjectionObjectPath(
        stageId,
        sessionOrdinal,
        "sidecar",
        contentHash,
      ) ||
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES ||
    value.contentType !== "application/json; charset=utf-8" ||
    (expectedRaw !== undefined &&
      (sha256Utf8(expectedRaw) !== contentHash ||
        utf8ByteLengthV1(expectedRaw) !== value.byteSize))
  )
    fail();
  return Object.freeze({
    objectPath: value.objectPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function parseSidecar(
  raw: string,
  episodeId: string,
  expectedSessionId: string,
  expectedOrdinal: number,
) {
  const value = canonical(raw, V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES);
  exactKeys(value, SIDECAR_KEYS);
  if (
    value.schemaVersion !== V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 ||
    value.episodeId !== episodeId ||
    value.sessionId !== expectedSessionId ||
    value.sessionOrdinal !== expectedOrdinal ||
    !Array.isArray(value.tasks) ||
    value.tasks.length !== 12 ||
    value.serverOnly !== true ||
    value.evaluationAuthority !== "none" ||
    value.rewardAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  return Object.freeze({
    sourceFingerprint: hash(value.sourceFingerprint),
    commitmentAggregate: hash(value.commitmentAggregate),
    sidecarFingerprint: hashCanonicalBody(value),
  });
}

function parseSession(
  value: unknown,
  stageId: string,
  episodeId: string,
  expectedOrdinal: number,
): V2ActivityServerEvaluatorReleaseSessionV1 {
  if (!record(value)) fail();
  exactKeys(value, SESSION_KEYS);
  if (value.sessionOrdinal !== expectedOrdinal) fail();
  const sessionId = id(value.sessionId);
  return Object.freeze({
    sessionId,
    sessionOrdinal: expectedOrdinal,
    sourceFingerprint: hash(value.sourceFingerprint),
    sidecarFingerprint: hash(value.sidecarFingerprint),
    commitmentAggregate: hash(value.commitmentAggregate),
    sidecar: parsePin(value.sidecar, stageId, expectedOrdinal),
  });
}

export function parseV2ActivityServerEvaluatorReleaseIndexV1(
  raw: string,
): V2ActivityServerEvaluatorReleaseIndexV1 {
  const value = canonical(
    raw,
    V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1,
  );
  exactKeys(value, INDEX_KEYS);
  if (
    value.schemaVersion !==
      V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    !Array.isArray(value.sessions) ||
    value.sessions.length !== 12 ||
    value.sessionCount !== 12 ||
    value.objectCount !== 12 ||
    value.serverOnly !== true ||
    value.clientDelivery !== "forbidden" ||
    value.evaluatorKeyAuthority !== "candidate_data_only" ||
    value.evaluationAuthority !== "none_server_policy_required" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.completionAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const stageId = id(value.stageId);
  const episodeId = id(value.episodeId);
  const sessions = Object.freeze(
    value.sessions.map((session, index) =>
      parseSession(session, stageId, episodeId, index + 1),
    ),
  );
  if (new Set(sessions.map((session) => session.sessionId)).size !== 12) fail();
  const body = Object.freeze({
    schemaVersion: V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1,
    environment: value.environment as V2ReleaseEnvironment,
    releaseId: id(value.releaseId),
    activeManifestHash: hash(value.activeManifestHash),
    seasonId: id(value.seasonId),
    studyTarget: id(value.studyTarget),
    learnerSourceLocale: id(value.learnerSourceLocale),
    episodeId,
    stageId,
    activityPackageFingerprint: hash(value.activityPackageFingerprint),
    validatorSummaryFingerprint: hash(value.validatorSummaryFingerprint),
    sessions,
    sessionCount: 12 as const,
    objectCount: 12 as const,
    serverOnly: true as const,
    clientDelivery: "forbidden" as const,
    evaluatorKeyAuthority: "candidate_data_only" as const,
    evaluationAuthority: "none_server_policy_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const indexFingerprint = hash(value.indexFingerprint);
  if (hashCanonicalBody(body) !== indexFingerprint) fail();
  const result = Object.freeze({ ...body, indexFingerprint });
  indexHandles.add(result);
  return result;
}

export function materializeV2ActivityServerEvaluatorReleaseIndexV1(input: {
  readonly publishedView: V2PublishedSeasonManifestView;
  readonly expectedEnvironment: V2ReleaseEnvironment;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly validatorSummaryFingerprint: string;
  readonly sessions: readonly V2ActivityServerEvaluatorReleaseSessionMaterialInputV1[];
}): V2ActivityServerEvaluatorReleaseIndexV1 {
  const validation = validatePublishedV2SeasonManifest(
    input.publishedView,
    input.expectedEnvironment,
  );
  if (!validation.ok || input.sessions.length !== 12) fail();
  const release = resolveV2ReleaseManifest(
    input.publishedView.activePointer,
    input.publishedView.manifestRecord,
    input.publishedView.manifestBody,
    input.expectedEnvironment,
  );
  const episodeId = id(input.episodeId);
  const stageId = id(input.stageId);
  if (
    release.body.lessonUnits.filter((unit) => unit.episodeId === episodeId)
      .length !== 1
  )
    fail();
  const sessions = Object.freeze(
    input.sessions.map((session, index) => {
      if (!record(session) || session.sessionOrdinal !== index + 1) fail();
      const sessionId = id(session.sessionId);
      const sidecar = parseSidecar(
        session.sidecarRaw,
        episodeId,
        sessionId,
        index + 1,
      );
      return Object.freeze({
        sessionId,
        sessionOrdinal: index + 1,
        sourceFingerprint: sidecar.sourceFingerprint,
        sidecarFingerprint: sidecar.sidecarFingerprint,
        commitmentAggregate: sidecar.commitmentAggregate,
        sidecar: parsePin(
          session.sidecarPin,
          stageId,
          index + 1,
          session.sidecarRaw,
        ),
      });
    }),
  );
  const body = Object.freeze({
    schemaVersion: V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_SCHEMA_V1,
    environment: release.pointer.environment,
    releaseId: release.pointer.activeReleaseId,
    activeManifestHash: release.pointer.activeManifestHash,
    seasonId: release.pointer.seasonId,
    studyTarget: release.pointer.studyTarget,
    learnerSourceLocale: release.pointer.learnerSourceLocale,
    episodeId,
    stageId,
    activityPackageFingerprint: hash(input.activityPackageFingerprint),
    validatorSummaryFingerprint: hash(input.validatorSummaryFingerprint),
    sessions,
    sessionCount: 12 as const,
    objectCount: 12 as const,
    serverOnly: true as const,
    clientDelivery: "forbidden" as const,
    evaluatorKeyAuthority: "candidate_data_only" as const,
    evaluationAuthority: "none_server_policy_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return parseV2ActivityServerEvaluatorReleaseIndexV1(
    canonicalJsonV1({ ...body, indexFingerprint: hashCanonicalBody(body) }),
  );
}

export function encodeV2ActivityServerEvaluatorReleaseIndexV1(
  index: V2ActivityServerEvaluatorReleaseIndexV1,
): string {
  if (!indexHandles.has(index)) fail();
  return canonicalJsonV1(index);
}

export function v2ActivityServerEvaluatorReleaseIndexObjectPathV1(input: {
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}): string {
  return `learning-v2/activity-server-evaluator-release-index/${hash(input.activeManifestHash)}/${sha256Utf8(id(input.episodeId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}

export function v2ActivityServerEvaluatorReleasePointerDocumentPathV1(input: {
  readonly activeManifestHash: string;
  readonly episodeId: string;
}): string {
  return `${V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_COLLECTION_V1}/${hash(input.activeManifestHash)}__${sha256Utf8(id(input.episodeId))}`;
}

export function materializeV2ActivityServerEvaluatorReleasePointerV1(input: {
  readonly indexRaw: string;
  readonly indexObjectGeneration: string;
}): V2ActivityServerEvaluatorReleasePointerV1 {
  const index = parseV2ActivityServerEvaluatorReleaseIndexV1(input.indexRaw);
  if (!GENERATION_RE.test(input.indexObjectGeneration)) fail();
  const rawHash = sha256Utf8(input.indexRaw);
  const body = Object.freeze({
    schemaVersion: V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1,
    environment: index.environment,
    releaseId: index.releaseId,
    activeManifestHash: index.activeManifestHash,
    seasonId: index.seasonId,
    episodeId: index.episodeId,
    stageId: index.stageId,
    activityPackageFingerprint: index.activityPackageFingerprint,
    indexFingerprint: index.indexFingerprint,
    indexObject: Object.freeze({
      objectPath: v2ActivityServerEvaluatorReleaseIndexObjectPathV1({
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
    serverOnly: true as const,
    clientDelivery: "forbidden" as const,
    repositoryAuthority: "none_admin_readback_required" as const,
    evaluationAuthority: "none_server_policy_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return parseV2ActivityServerEvaluatorReleasePointerV1(
    canonicalJsonV1({ ...body, pointerFingerprint: hashCanonicalBody(body) }),
    index,
  );
}

export function parseV2ActivityServerEvaluatorReleasePointerV1(
  raw: string,
  expectedIndex?: V2ActivityServerEvaluatorReleaseIndexV1,
): V2ActivityServerEvaluatorReleasePointerV1 {
  const value = canonical(
    raw,
    V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1,
  );
  exactKeys(value, POINTER_KEYS);
  if (
    value.schemaVersion !==
      V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    value.serverOnly !== true ||
    value.clientDelivery !== "forbidden" ||
    value.repositoryAuthority !== "none_admin_readback_required" ||
    value.evaluationAuthority !== "none_server_policy_required" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const identity = Object.freeze({
    environment: value.environment as V2ReleaseEnvironment,
    releaseId: id(value.releaseId),
    activeManifestHash: hash(value.activeManifestHash),
    seasonId: id(value.seasonId),
    episodeId: id(value.episodeId),
    stageId: id(value.stageId),
    activityPackageFingerprint: hash(value.activityPackageFingerprint),
    indexFingerprint: hash(value.indexFingerprint),
  });
  if (
    expectedIndex &&
    (identity.environment !== expectedIndex.environment ||
      identity.releaseId !== expectedIndex.releaseId ||
      identity.activeManifestHash !== expectedIndex.activeManifestHash ||
      identity.seasonId !== expectedIndex.seasonId ||
      identity.episodeId !== expectedIndex.episodeId ||
      identity.stageId !== expectedIndex.stageId ||
      identity.activityPackageFingerprint !==
        expectedIndex.activityPackageFingerprint ||
      identity.indexFingerprint !== expectedIndex.indexFingerprint)
  )
    fail();
  if (!record(value.indexObject)) fail();
  exactKeys(value.indexObject, PIN_KEYS);
  const rawHash = hash(value.indexObject.contentHash);
  if (
    value.indexObject.objectPath !==
      v2ActivityServerEvaluatorReleaseIndexObjectPathV1({
        activeManifestHash: identity.activeManifestHash,
        episodeId: identity.episodeId,
        indexFingerprint: identity.indexFingerprint,
        rawHash,
      }) ||
    typeof value.indexObject.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.indexObject.objectGeneration) ||
    !Number.isSafeInteger(value.indexObject.byteSize) ||
    Number(value.indexObject.byteSize) < 1 ||
    Number(value.indexObject.byteSize) >
      V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1 ||
    value.indexObject.contentType !== "application/json; charset=utf-8"
  )
    fail();
  const body = Object.freeze({
    schemaVersion: V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_SCHEMA_V1,
    ...identity,
    indexObject: Object.freeze({
      objectPath: value.indexObject.objectPath,
      contentHash: rawHash,
      objectGeneration: value.indexObject.objectGeneration,
      byteSize: Number(value.indexObject.byteSize),
      contentType: "application/json; charset=utf-8" as const,
    }),
    serverOnly: true as const,
    clientDelivery: "forbidden" as const,
    repositoryAuthority: "none_admin_readback_required" as const,
    evaluationAuthority: "none_server_policy_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const pointerFingerprint = hash(value.pointerFingerprint);
  if (hashCanonicalBody(body) !== pointerFingerprint) fail();
  const result = Object.freeze({ ...body, pointerFingerprint });
  pointerHandles.add(result);
  return result;
}

export function encodeV2ActivityServerEvaluatorReleasePointerV1(
  pointer: V2ActivityServerEvaluatorReleasePointerV1,
): string {
  if (!pointerHandles.has(pointer)) fail();
  return canonicalJsonV1(pointer);
}
