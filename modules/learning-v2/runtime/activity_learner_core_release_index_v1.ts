import {
  resolveV2ReleaseManifest,
  validatePublishedV2SeasonManifest,
  type V2ObjectRef,
  type V2PublishedSeasonManifestView,
  type V2ReleaseEnvironment,
} from "../content/release_manifest";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from "../content/course_topology_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";

export const LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V1 =
  "learning-v2-activity-learner-core-release-index.v1" as const;
export const LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1 =
  128 * 1024;
export const LEARNING_V2_ACTIVITY_LEARNER_CORE_RENDER_MAX_BYTES_V1 = 256 * 1024;
export const LEARNING_V2_ACTIVITY_LEARNER_CORE_CAPSULE_MAX_BYTES_V1 = 64 * 1024;

export interface LearningV2ActivityLearnerCoreObjectPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}

export interface LearningV2ActivityLearnerCoreSessionPinV1 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly capsuleEnvelopeFingerprint: string;
  readonly render: LearningV2ActivityLearnerCoreObjectPinV1;
  readonly capsule: LearningV2ActivityLearnerCoreObjectPinV1;
}

export interface LearningV2ActivityLearnerCoreReleaseIndexV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly episodeId: string;
  readonly lessonId: number;
  readonly lessonUnitObject: V2ObjectRef;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly validatorSummaryFingerprint: string;
  readonly permitAggregateFingerprint: string;
  readonly childReadbackAggregateFingerprint: string;
  readonly storageReadbackFingerprint: string;
  readonly sessions: readonly LearningV2ActivityLearnerCoreSessionPinV1[];
  readonly sessionCount: number;
  readonly objectCount: number;
  readonly releaseIdentityEvidence: "validated_published_view_structure_only";
  readonly validatorEvidence: "opaque_validator_material_projected_structurally";
  readonly repositoryOriginAuthority: "none_server_readback_required";
  readonly storageAuthority: "none_server_readback_required";
  readonly runtimeAuthority: "none_active_pointer_and_readback_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export interface LearningV2ActivityLearnerCoreSessionMaterialInputV1 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly renderRaw: string;
  readonly capsuleEnvelopeRaw: string;
  readonly renderPin: LearningV2ActivityLearnerCoreObjectPinV1;
  readonly capsulePin: LearningV2ActivityLearnerCoreObjectPinV1;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet<object>();
const INDEX_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "releaseId",
  "activeManifestHash",
  "seasonId",
  "studyTarget",
  "learnerSourceLocale",
  "episodeId",
  "lessonId",
  "lessonUnitObject",
  "stageId",
  "activityPackageFingerprint",
  "validatorSummaryFingerprint",
  "permitAggregateFingerprint",
  "childReadbackAggregateFingerprint",
  "storageReadbackFingerprint",
  "sessions",
  "sessionCount",
  "objectCount",
  "releaseIdentityEvidence",
  "validatorEvidence",
  "repositoryOriginAuthority",
  "storageAuthority",
  "runtimeAuthority",
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
  "renderFingerprint",
  "capsuleEnvelopeFingerprint",
  "render",
  "capsule",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const OBJECT_REF_KEYS = Object.freeze([
  "path",
  "generation",
  "contentHash",
  "byteSize",
] as const);
const RENDER_KEYS = Object.freeze([
  "schemaVersion",
  "sourceFingerprint",
  "episodeId",
  "targetLanguage",
  "session",
  "executionAuthority",
  "rewardAuthority",
  "runtimeConsumer",
  "releaseAuthority",
] as const);
const RENDER_SESSION_KEYS = Object.freeze([
  "sessionId",
  "ordinal",
  "zone",
  "targetSeconds",
  "tasks",
] as const);
const CAPSULE_KEYS = Object.freeze([
  "schemaVersion",
  "sourceFingerprint",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "normalizationLocale",
  "normalizationProfileHash",
  "capsules",
  "commitmentAggregate",
  "consumer",
  "verdictAuthority",
] as const);

function fail(): never {
  throw new Error("learning_v2_activity_learner_core_release_index_invalid");
}

/**
 * Урок может быть неполным, но не пустым и не длиннее плана.
 *
 * зачем: число сессий было зашито литералом 12, из-за чего урок нельзя было
 * открыть, пока не написана последняя сессия — владелец видел «Сессия
 * недоступна» и не мог ничего проверить. Решение владельца (2026-08-16):
 * разрешить неполный урок. Непрерывность нумерации проверяется отдельно.
 */
function isAllowedSessionCount(count: unknown): boolean {
  return (
    Number.isSafeInteger(count) &&
    Number(count) >= 1 &&
    Number(count) <= LEARNING_V2_LESSON_SESSION_COUNT_V1
  );
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
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
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

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 1 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 4096 || current.depth > 24) fail();
    if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail();
    } else if (typeof current.value === "string") {
      if (
        current.value.length > 8192 ||
        current.value !== current.value.normalize("NFC") ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(
          current.value,
        )
      )
        fail();
    } else if (Array.isArray(current.value)) {
      if (current.value.length > 64) fail();
      for (const child of current.value)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value === "object") {
      if (!record(current.value)) fail();
      const entries = Object.entries(current.value);
      if (entries.length > 64) fail();
      for (const [key, child] of entries) {
        if (RESERVED.has(key)) fail();
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
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
  preflight(value);
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  return value;
}

function expectedChildPath(
  stageId: string,
  sessionOrdinal: number,
  kind: "render" | "capsule",
  contentHash: string,
): string {
  return `learning-v2/canonical/activity-instances/${sha256Utf8(stageId)}/sessions/${String(sessionOrdinal).padStart(2, "0")}/${kind}/${contentHash}.json`;
}

function parsePin(
  value: unknown,
  stageId: string,
  sessionOrdinal: number,
  kind: "render" | "capsule",
  raw?: string,
): LearningV2ActivityLearnerCoreObjectPinV1 {
  if (!record(value)) fail();
  exactKeys(value, PIN_KEYS);
  const contentHash = hash(value.contentHash);
  const maximumBytes =
    kind === "render"
      ? LEARNING_V2_ACTIVITY_LEARNER_CORE_RENDER_MAX_BYTES_V1
      : LEARNING_V2_ACTIVITY_LEARNER_CORE_CAPSULE_MAX_BYTES_V1;
  if (
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > maximumBytes ||
    value.contentType !== "application/json; charset=utf-8" ||
    value.objectPath !==
      expectedChildPath(stageId, sessionOrdinal, kind, contentHash) ||
    (raw !== undefined &&
      (sha256Utf8(raw) !== contentHash ||
        utf8ByteLengthV1(raw) !== Number(value.byteSize)))
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

function parseObjectRef(value: unknown): V2ObjectRef {
  if (!record(value)) fail();
  exactKeys(value, OBJECT_REF_KEYS);
  if (
    typeof value.path !== "string" ||
    value.path.length < 1 ||
    value.path.length > 1024 ||
    value.path.startsWith("/") ||
    value.path.includes("..") ||
    typeof value.generation !== "string" ||
    !GENERATION_RE.test(value.generation) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1
  )
    fail();
  return Object.freeze({
    path: value.path,
    generation: value.generation,
    contentHash: hash(value.contentHash),
    byteSize: Number(value.byteSize),
  });
}

function sessionFromMaterial(
  value: LearningV2ActivityLearnerCoreSessionMaterialInputV1,
  stageId: string,
  episodeId: string,
  studyTarget: string,
  expectedOrdinal: number,
): LearningV2ActivityLearnerCoreSessionPinV1 {
  if (!record(value)) fail();
  exactKeys(value, [
    "sessionId",
    "sessionOrdinal",
    "renderRaw",
    "capsuleEnvelopeRaw",
    "renderPin",
    "capsulePin",
  ]);
  if (value.sessionOrdinal !== expectedOrdinal) fail();
  const sessionId = id(value.sessionId);
  const render = canonical(
    value.renderRaw,
    LEARNING_V2_ACTIVITY_LEARNER_CORE_RENDER_MAX_BYTES_V1,
  );
  exactKeys(render, RENDER_KEYS);
  if (!record(render.session)) fail();
  exactKeys(render.session, RENDER_SESSION_KEYS);
  if (
    render.schemaVersion !== "v2-activity-session-render-seed.v2" ||
    render.episodeId !== episodeId ||
    render.targetLanguage !== studyTarget ||
    render.session.sessionId !== sessionId ||
    render.session.ordinal !== expectedOrdinal ||
    !Array.isArray(render.session.tasks) ||
    render.session.tasks.length !== 12 ||
    render.executionAuthority !== "none" ||
    render.rewardAuthority !== "none" ||
    render.runtimeConsumer !== false ||
    render.releaseAuthority !== false
  )
    fail();
  const sourceFingerprint = hash(render.sourceFingerprint);
  const capsule = canonical(
    value.capsuleEnvelopeRaw,
    LEARNING_V2_ACTIVITY_LEARNER_CORE_CAPSULE_MAX_BYTES_V1,
  );
  exactKeys(capsule, CAPSULE_KEYS);
  if (
    capsule.schemaVersion !== "v2-activity-session-capsule-envelope.v1" ||
    capsule.sourceFingerprint !== sourceFingerprint ||
    capsule.episodeId !== episodeId ||
    capsule.sessionId !== sessionId ||
    capsule.sessionOrdinal !== expectedOrdinal ||
    !Array.isArray(capsule.capsules) ||
    capsule.capsules.length !== 12 ||
    capsule.consumer !== "app_internal_local_evaluator_only" ||
    capsule.verdictAuthority !== "local_provisional_only"
  )
    fail();
  return Object.freeze({
    sessionId,
    sessionOrdinal: expectedOrdinal,
    sourceFingerprint,
    renderFingerprint: hashCanonicalBody(render),
    capsuleEnvelopeFingerprint: hashCanonicalBody(capsule),
    render: parsePin(
      value.renderPin,
      stageId,
      expectedOrdinal,
      "render",
      value.renderRaw,
    ),
    capsule: parsePin(
      value.capsulePin,
      stageId,
      expectedOrdinal,
      "capsule",
      value.capsuleEnvelopeRaw,
    ),
  });
}

function parseSession(
  value: unknown,
  stageId: string,
  expectedOrdinal: number,
): LearningV2ActivityLearnerCoreSessionPinV1 {
  if (!record(value)) fail();
  exactKeys(value, SESSION_KEYS);
  if (value.sessionOrdinal !== expectedOrdinal) fail();
  return Object.freeze({
    sessionId: id(value.sessionId),
    sessionOrdinal: expectedOrdinal,
    sourceFingerprint: hash(value.sourceFingerprint),
    renderFingerprint: hash(value.renderFingerprint),
    capsuleEnvelopeFingerprint: hash(value.capsuleEnvelopeFingerprint),
    render: parsePin(value.render, stageId, expectedOrdinal, "render"),
    capsule: parsePin(value.capsule, stageId, expectedOrdinal, "capsule"),
  });
}

function parseValue(
  value: unknown,
): LearningV2ActivityLearnerCoreReleaseIndexV1 {
  if (!record(value)) fail();
  exactKeys(value, INDEX_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    typeof value.studyTarget !== "string" ||
    !CODE_RE.test(value.studyTarget) ||
    typeof value.learnerSourceLocale !== "string" ||
    !CODE_RE.test(value.learnerSourceLocale) ||
    !Number.isSafeInteger(value.lessonId) ||
    Number(value.lessonId) < 1 ||
    !Array.isArray(value.sessions) ||
    !isAllowedSessionCount(value.sessions.length) ||
    value.sessionCount !== value.sessions.length ||
    // Два объекта на сессию: render и capsule.
    value.objectCount !== value.sessions.length * 2
  )
    fail();
  const stageId = id(value.stageId);
  const sessions = Object.freeze(
    value.sessions.map((session, index) =>
      parseSession(session, stageId, index + 1),
    ),
  );
  if (new Set(sessions.map((session) => session.sessionId)).size !== sessions.length)
    fail();
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V1,
    environment: value.environment as V2ReleaseEnvironment,
    releaseId: id(value.releaseId),
    activeManifestHash: hash(value.activeManifestHash),
    seasonId: id(value.seasonId),
    studyTarget: value.studyTarget,
    learnerSourceLocale: value.learnerSourceLocale,
    episodeId: id(value.episodeId),
    lessonId: Number(value.lessonId),
    lessonUnitObject: parseObjectRef(value.lessonUnitObject),
    stageId,
    activityPackageFingerprint: hash(value.activityPackageFingerprint),
    validatorSummaryFingerprint: hash(value.validatorSummaryFingerprint),
    permitAggregateFingerprint: hash(value.permitAggregateFingerprint),
    childReadbackAggregateFingerprint: hash(
      value.childReadbackAggregateFingerprint,
    ),
    storageReadbackFingerprint: hash(value.storageReadbackFingerprint),
    sessions,
    sessionCount: sessions.length,
    objectCount: sessions.length * 2,
    releaseIdentityEvidence: "validated_published_view_structure_only" as const,
    validatorEvidence:
      "opaque_validator_material_projected_structurally" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    runtimeAuthority: "none_active_pointer_and_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const indexFingerprint = hash(value.indexFingerprint);
  if (
    value.releaseIdentityEvidence !== body.releaseIdentityEvidence ||
    value.validatorEvidence !== body.validatorEvidence ||
    value.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
    value.storageAuthority !== body.storageAuthority ||
    value.runtimeAuthority !== body.runtimeAuthority ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.completionAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false ||
    hashCanonicalBody(body) !== indexFingerprint
  )
    fail();
  const result = Object.freeze({ ...body, indexFingerprint });
  handles.add(result);
  return result;
}

export function materializeLearningV2ActivityLearnerCoreReleaseIndexV1(
  input: Readonly<{
    publishedView: V2PublishedSeasonManifestView;
    expectedEnvironment: V2ReleaseEnvironment;
    episodeId: string;
    stageId: string;
    activityPackageFingerprint: string;
    validatorSummaryFingerprint: string;
    permitAggregateFingerprint: string;
    childReadbackAggregateFingerprint: string;
    storageReadbackFingerprint: string;
    sessions: readonly LearningV2ActivityLearnerCoreSessionMaterialInputV1[];
  }>,
): LearningV2ActivityLearnerCoreReleaseIndexV1 {
  const validation = validatePublishedV2SeasonManifest(
    input.publishedView,
    input.expectedEnvironment,
  );
  if (!validation.ok) fail();
  const release = resolveV2ReleaseManifest(
    input.publishedView.activePointer,
    input.publishedView.manifestRecord,
    input.publishedView.manifestBody,
    input.expectedEnvironment,
  );
  const episodeId = id(input.episodeId);
  const stageId = id(input.stageId);
  const lessonUnits = release.body.lessonUnits.filter(
    (unit) => unit.episodeId === episodeId,
  );
  if (lessonUnits.length !== 1 || !isAllowedSessionCount(input.sessions.length))
    fail();
  const sessions = Object.freeze(
    input.sessions.map((session, index) =>
      sessionFromMaterial(
        session,
        stageId,
        episodeId,
        release.pointer.studyTarget,
        index + 1,
      ),
    ),
  );
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_SCHEMA_V1,
    environment: release.pointer.environment,
    releaseId: release.pointer.activeReleaseId,
    activeManifestHash: release.pointer.activeManifestHash,
    seasonId: release.pointer.seasonId,
    studyTarget: release.pointer.studyTarget,
    learnerSourceLocale: release.pointer.learnerSourceLocale,
    episodeId,
    lessonId: lessonUnits[0].lessonId,
    lessonUnitObject: lessonUnits[0].object,
    stageId,
    activityPackageFingerprint: hash(input.activityPackageFingerprint),
    validatorSummaryFingerprint: hash(input.validatorSummaryFingerprint),
    permitAggregateFingerprint: hash(input.permitAggregateFingerprint),
    childReadbackAggregateFingerprint: hash(
      input.childReadbackAggregateFingerprint,
    ),
    storageReadbackFingerprint: hash(input.storageReadbackFingerprint),
    sessions,
    sessionCount: sessions.length,
    objectCount: sessions.length * 2,
    releaseIdentityEvidence: "validated_published_view_structure_only" as const,
    validatorEvidence:
      "opaque_validator_material_projected_structurally" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    runtimeAuthority: "none_active_pointer_and_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityLearnerCoreReleaseIndexV1(
    canonicalJsonV1({ ...body, indexFingerprint: hashCanonicalBody(body) }),
  );
}

export function parseLearningV2ActivityLearnerCoreReleaseIndexV1(
  raw: string,
): LearningV2ActivityLearnerCoreReleaseIndexV1 {
  const value = canonical(
    raw,
    LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
  );
  return parseValue(value);
}

export function encodeLearningV2ActivityLearnerCoreReleaseIndexV1(
  index: LearningV2ActivityLearnerCoreReleaseIndexV1,
): string {
  if (!isLearningV2ActivityLearnerCoreReleaseIndexV1(index)) fail();
  return canonicalJsonV1(index);
}

export function isLearningV2ActivityLearnerCoreReleaseIndexV1(
  value: unknown,
): value is LearningV2ActivityLearnerCoreReleaseIndexV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
