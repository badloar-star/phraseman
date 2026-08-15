import {
  resolveV2ReleaseManifest,
  validatePublishedV2SeasonManifest,
  type V2ObjectRef,
  type V2PublishedSeasonManifestView,
  type V2ReleaseEnvironment,
} from "../content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  getLearningV2ActivityAuxiliaryIntegritySummaryV1,
  isLearningV2ActivityAuxiliaryIntegrityHandleV1,
  type LearningV2ActivityAuxiliaryIntegrityHandleV1,
} from "./activity_auxiliary_integrity_loader_v1";
import { parseLearningV2ActivityAuxiliaryReleaseManifestV1 } from "./activity_auxiliary_release_manifest_v1";

export const LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-release-index.v1" as const;
export const LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 =
  256 * 1024;
export const LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-release-handle.v1" as const;

export interface LearningV2ActivityAuxiliaryManifestPinV1 {
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly manifestFingerprint: string;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}

export interface LearningV2ActivityAuxiliaryReleaseIndexV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1;
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
  readonly sessions: readonly LearningV2ActivityAuxiliaryManifestPinV1[];
  readonly sessionCount: 12;
  readonly releaseIdentityEvidence: "validated_published_view_structure_only";
  readonly repositoryOriginAuthority: "none_server_readback_required";
  readonly storageAuthority: "none";
  readonly runtimeAuthority: "none_release_index_readback_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly indexFingerprint: string;
}

export interface LearningV2ActivityAuxiliaryReleaseHandleV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1;
}

export interface LearningV2ActivityAuxiliaryReleaseSummaryV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly auxiliaryIndexFingerprint: string;
  readonly auxiliaryManifestFingerprint: string;
  readonly releaseIdentityEvidence: "validated_structural_active_pointer_and_lesson_unit";
  readonly repositoryOriginAuthority: "none_server_readback_required";
  readonly storageIntegrity: "exact_generation_hash_size_readback";
  readonly runtimeAuthority: "identity_and_integrity_only_no_release_authority";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
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
  "sessions",
  "sessionCount",
  "releaseIdentityEvidence",
  "repositoryOriginAuthority",
  "storageAuthority",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "indexFingerprint",
] as const);
const SESSION_KEYS = Object.freeze([
  "sessionId",
  "sessionOrdinal",
  "sourceFingerprint",
  "renderFingerprint",
  "manifestFingerprint",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const OBJECT_KEYS = Object.freeze([
  "path",
  "generation",
  "contentHash",
  "byteSize",
] as const);
const indexHandles = new WeakSet<object>();
const releaseHandles = new WeakSet<object>();
const releaseMaterial = new WeakMap<
  object,
  Readonly<{
    summary: LearningV2ActivityAuxiliaryReleaseSummaryV1;
    integrity: LearningV2ActivityAuxiliaryIntegrityHandleV1;
  }>
>();

function fail(
  code = "learning_v2_activity_auxiliary_release_index_invalid",
): never {
  throw new Error(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
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

function exactId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !ID_RE.test(value) ||
    RESERVED_KEYS.has(value)
  )
    fail();
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function preflight(root: unknown): void {
  const stack: Readonly<{ value: unknown; depth: number }>[] = [
    { value: root, depth: 1 },
  ];
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
        current.value.length > 4096 ||
        current.value !== current.value.normalize("NFC") ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(
          current.value,
        )
      )
        fail();
    } else if (Array.isArray(current.value)) {
      if (current.value.length > 64) fail();
      for (const value of current.value)
        stack.push({ value, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value === "object") {
      if (!isPlainObject(current.value)) fail();
      const entries = Object.entries(current.value);
      if (entries.length > 64) fail();
      for (const [key, value] of entries) {
        if (RESERVED_KEYS.has(key)) fail();
        stack.push({ value, depth: current.depth + 1 });
      }
    }
  }
}

export function learningV2ActivityAuxiliarySessionManifestObjectPathV1(
  input: Readonly<{
    activeManifestHash: string;
    episodeId: string;
    activityPackageFingerprint: string;
    sessionOrdinal: number;
    manifestFingerprint: string;
    contentHash: string;
  }>,
): string {
  if (
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > 12
  )
    fail();
  return `learning-v2/canonical/activity-auxiliary-index/${exactHash(input.activeManifestHash)}/${sha256Utf8(exactId(input.episodeId))}/${exactHash(input.activityPackageFingerprint)}/sessions/${String(input.sessionOrdinal).padStart(2, "0")}/${exactHash(input.manifestFingerprint)}/${exactHash(input.contentHash)}.json`;
}

function parseObjectRef(value: unknown): V2ObjectRef {
  if (!isPlainObject(value)) fail();
  exactKeys(value, OBJECT_KEYS);
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
    contentHash: exactHash(value.contentHash),
    byteSize: Number(value.byteSize),
  });
}

function parseSessionPin(
  value: unknown,
  activeManifestHash: string,
  episodeId: string,
  activityPackageFingerprint: string,
  expectedOrdinal: number,
): LearningV2ActivityAuxiliaryManifestPinV1 {
  if (!isPlainObject(value)) fail();
  exactKeys(value, SESSION_KEYS);
  if (
    value.sessionOrdinal !== expectedOrdinal ||
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > 64 * 1024 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail();
  const sessionId = exactId(value.sessionId);
  const sourceFingerprint = exactHash(value.sourceFingerprint);
  const renderFingerprint = exactHash(value.renderFingerprint);
  const manifestFingerprint = exactHash(value.manifestFingerprint);
  const contentHash = exactHash(value.contentHash);
  if (
    value.objectPath !==
    learningV2ActivityAuxiliarySessionManifestObjectPathV1({
      activeManifestHash,
      episodeId,
      activityPackageFingerprint,
      sessionOrdinal: expectedOrdinal,
      manifestFingerprint,
      contentHash,
    })
  )
    fail();
  return Object.freeze({
    sessionId,
    sessionOrdinal: expectedOrdinal,
    sourceFingerprint,
    renderFingerprint,
    manifestFingerprint,
    objectPath: value.objectPath,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function parseIndex(value: unknown): LearningV2ActivityAuxiliaryReleaseIndexV1 {
  if (!isPlainObject(value)) fail();
  exactKeys(value, INDEX_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    typeof value.studyTarget !== "string" ||
    !CODE_RE.test(value.studyTarget) ||
    typeof value.learnerSourceLocale !== "string" ||
    !CODE_RE.test(value.learnerSourceLocale) ||
    !Number.isSafeInteger(value.lessonId) ||
    Number(value.lessonId) < 1 ||
    !Array.isArray(value.sessions) ||
    value.sessions.length !== 12 ||
    value.sessionCount !== 12
  )
    fail();
  const environment = value.environment as V2ReleaseEnvironment;
  const releaseId = exactId(value.releaseId);
  const activeManifestHash = exactHash(value.activeManifestHash);
  const seasonId = exactId(value.seasonId);
  const episodeId = exactId(value.episodeId);
  const stageId = exactId(value.stageId);
  const activityPackageFingerprint = exactHash(
    value.activityPackageFingerprint,
  );
  const lessonUnitObject = parseObjectRef(value.lessonUnitObject);
  const sessions = Object.freeze(
    value.sessions.map((session, index) =>
      parseSessionPin(
        session,
        activeManifestHash,
        episodeId,
        activityPackageFingerprint,
        index + 1,
      ),
    ),
  );
  if (
    new Set(sessions.map((session) => session.sessionId)).size !== 12 ||
    value.releaseIdentityEvidence !==
      "validated_published_view_structure_only" ||
    value.repositoryOriginAuthority !== "none_server_readback_required" ||
    value.storageAuthority !== "none" ||
    value.runtimeAuthority !== "none_release_index_readback_required" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1,
    environment,
    releaseId,
    activeManifestHash,
    seasonId,
    studyTarget: value.studyTarget,
    learnerSourceLocale: value.learnerSourceLocale,
    episodeId,
    lessonId: Number(value.lessonId),
    lessonUnitObject,
    stageId,
    activityPackageFingerprint,
    sessions,
    sessionCount: 12 as const,
    releaseIdentityEvidence: "validated_published_view_structure_only" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none" as const,
    runtimeAuthority: "none_release_index_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const indexFingerprint = exactHash(value.indexFingerprint);
  if (hashCanonicalBody(body) !== indexFingerprint) fail();
  const index = Object.freeze({ ...body, indexFingerprint });
  indexHandles.add(index);
  return index;
}

export function materializeLearningV2ActivityAuxiliaryReleaseIndexV1(
  input: Readonly<{
    publishedView: V2PublishedSeasonManifestView;
    expectedEnvironment: V2ReleaseEnvironment;
    episodeId: string;
    stageId: string;
    activityPackageFingerprint: string;
    manifests: readonly Readonly<{
      raw: string;
      objectGeneration: string;
    }>[];
  }>,
): LearningV2ActivityAuxiliaryReleaseIndexV1 {
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
  const episodeId = exactId(input.episodeId);
  const stageId = exactId(input.stageId);
  const activityPackageFingerprint = exactHash(
    input.activityPackageFingerprint,
  );
  const lessonUnits = release.body.lessonUnits.filter(
    (unit) => unit.episodeId === episodeId,
  );
  if (lessonUnits.length !== 1 || input.manifests.length !== 12) fail();
  const sessions = input.manifests.map((inputManifest, index) => {
    if (
      !isPlainObject(inputManifest) ||
      Object.keys(inputManifest).sort().join("|") !== "objectGeneration|raw" ||
      typeof inputManifest.raw !== "string" ||
      typeof inputManifest.objectGeneration !== "string" ||
      !GENERATION_RE.test(inputManifest.objectGeneration)
    )
      fail();
    const manifest = parseLearningV2ActivityAuxiliaryReleaseManifestV1(
      inputManifest.raw,
    );
    if (
      manifest.episodeId !== episodeId ||
      manifest.stageId !== stageId ||
      manifest.activityPackageFingerprint !== activityPackageFingerprint ||
      manifest.sessionOrdinal !== index + 1
    )
      fail();
    const contentHash = sha256Utf8(inputManifest.raw);
    return Object.freeze({
      sessionId: manifest.sessionId,
      sessionOrdinal: manifest.sessionOrdinal,
      sourceFingerprint: manifest.sourceFingerprint,
      renderFingerprint: manifest.renderFingerprint,
      manifestFingerprint: manifest.manifestFingerprint,
      objectPath: learningV2ActivityAuxiliarySessionManifestObjectPathV1({
        activeManifestHash: release.pointer.activeManifestHash,
        episodeId,
        activityPackageFingerprint,
        sessionOrdinal: manifest.sessionOrdinal,
        manifestFingerprint: manifest.manifestFingerprint,
        contentHash,
      }),
      contentHash,
      objectGeneration: inputManifest.objectGeneration,
      byteSize: utf8ByteLengthV1(inputManifest.raw),
      contentType: "application/json; charset=utf-8" as const,
    });
  });
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_SCHEMA_V1,
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
    activityPackageFingerprint,
    sessions,
    sessionCount: 12 as const,
    releaseIdentityEvidence: "validated_published_view_structure_only" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none" as const,
    runtimeAuthority: "none_release_index_readback_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityAuxiliaryReleaseIndexV1(
    canonicalJsonV1({ ...body, indexFingerprint: hashCanonicalBody(body) }),
  );
}

export function parseLearningV2ActivityAuxiliaryReleaseIndexV1(
  raw: string,
): LearningV2ActivityAuxiliaryReleaseIndexV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail();
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(candidate);
  if (canonicalJsonV1(candidate) !== raw) fail();
  return parseIndex(candidate);
}

export function encodeLearningV2ActivityAuxiliaryReleaseIndexV1(
  index: LearningV2ActivityAuxiliaryReleaseIndexV1,
): string {
  if (!isLearningV2ActivityAuxiliaryReleaseIndexV1(index)) fail();
  return canonicalJsonV1(index);
}

export function isLearningV2ActivityAuxiliaryReleaseIndexV1(
  value: unknown,
): value is LearningV2ActivityAuxiliaryReleaseIndexV1 {
  return typeof value === "object" && value !== null && indexHandles.has(value);
}

export function bindLearningV2ActivityAuxiliaryIntegrityToReleaseV1(
  input: Readonly<{
    index: LearningV2ActivityAuxiliaryReleaseIndexV1;
    integrity: LearningV2ActivityAuxiliaryIntegrityHandleV1;
  }>,
): LearningV2ActivityAuxiliaryReleaseHandleV1 {
  if (
    !isPlainObject(input) ||
    Object.keys(input).sort().join("|") !== "index|integrity" ||
    !isLearningV2ActivityAuxiliaryReleaseIndexV1(input.index) ||
    !isLearningV2ActivityAuxiliaryIntegrityHandleV1(input.integrity)
  )
    fail();
  const integrity = getLearningV2ActivityAuxiliaryIntegritySummaryV1(
    input.integrity,
  );
  const session = input.index.sessions[integrity.sessionOrdinal - 1];
  if (
    session?.sessionId !== integrity.sessionId ||
    session.sourceFingerprint !== integrity.sourceFingerprint ||
    session.renderFingerprint !== integrity.renderFingerprint ||
    session.manifestFingerprint !== integrity.manifestFingerprint ||
    input.index.episodeId !== integrity.episodeId ||
    input.index.stageId !== integrity.stageId ||
    input.index.activityPackageFingerprint !==
      integrity.activityPackageFingerprint
  )
    fail();
  const summary = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1,
    environment: input.index.environment,
    releaseId: input.index.releaseId,
    activeManifestHash: input.index.activeManifestHash,
    episodeId: input.index.episodeId,
    sessionId: integrity.sessionId,
    sessionOrdinal: integrity.sessionOrdinal,
    activityPackageFingerprint: input.index.activityPackageFingerprint,
    auxiliaryIndexFingerprint: input.index.indexFingerprint,
    auxiliaryManifestFingerprint: integrity.manifestFingerprint,
    releaseIdentityEvidence:
      "validated_structural_active_pointer_and_lesson_unit" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageIntegrity: "exact_generation_hash_size_readback" as const,
    runtimeAuthority:
      "identity_and_integrity_only_no_release_authority" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_HANDLE_SCHEMA_V1,
  });
  releaseHandles.add(handle);
  releaseMaterial.set(handle, { summary, integrity: input.integrity });
  return handle;
}

export function isLearningV2ActivityAuxiliaryReleaseHandleV1(
  value: unknown,
): value is LearningV2ActivityAuxiliaryReleaseHandleV1 {
  return (
    typeof value === "object" && value !== null && releaseHandles.has(value)
  );
}

export function getLearningV2ActivityAuxiliaryReleaseSummaryV1(
  handle: LearningV2ActivityAuxiliaryReleaseHandleV1,
): LearningV2ActivityAuxiliaryReleaseSummaryV1 {
  if (!isLearningV2ActivityAuxiliaryReleaseHandleV1(handle)) fail();
  const found = releaseMaterial.get(handle);
  if (!found) fail();
  return found.summary;
}

export function resolveLearningV2ActivityAuxiliaryIntegrityFromReleaseV1(
  handle: LearningV2ActivityAuxiliaryReleaseHandleV1,
): LearningV2ActivityAuxiliaryIntegrityHandleV1 {
  if (!isLearningV2ActivityAuxiliaryReleaseHandleV1(handle)) fail();
  const found = releaseMaterial.get(handle);
  if (!found) fail();
  return found.integrity;
}
