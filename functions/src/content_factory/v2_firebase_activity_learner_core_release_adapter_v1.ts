import { createHash } from "node:crypto";
import {
  assertV2SeasonReleasePointer,
  resolveV2ReleaseManifest,
  type V2ReleaseEnvironment,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleaseManifestRecord,
  type V2SeasonReleasePointer,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_LEARNER_CORE_CAPSULE_MAX_BYTES_V1,
  LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
  LEARNING_V2_ACTIVITY_LEARNER_CORE_RENDER_MAX_BYTES_V1,
  parseLearningV2ActivityLearnerCoreReleaseIndexV1,
  type LearningV2ActivityLearnerCoreObjectPinV1,
  type LearningV2ActivityLearnerCoreReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1";
import {
  V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1,
  inspectV2ActivityLearnerCoreReleaseIndexPermitV1,
  parseV2ActivityLearnerCoreReleasePointerV1,
  v2ActivityLearnerCoreReleasePointerDocumentPathV1,
  type V2ActivityLearnerCoreReleasePointerV1,
} from "./v2_activity_learner_core_release_pointer_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  v2SeasonReleaseManifestDocumentId,
  v2SeasonReleasePointerDocumentId,
  v2SeasonReleasePointerId,
} from "./v2_required_session_activation";
import {
  resolveV2UnifiedCourseReleaseActiveMaterialV1,
  type V2UnifiedCourseReleaseActiveHandleV1,
} from "./v2_unified_course_release_repository_v1";

export const V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-learner-core-release-summary.v1" as const;

export interface V2FirebaseActivityLearnerCoreReleaseHandleV1 {
  readonly kind: "v2_firebase_activity_learner_core_release_handle";
}

export interface V2FirebaseActivityLearnerCoreReleaseSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly validatorSummaryFingerprint: string;
  readonly indexFingerprint: string;
  readonly pointerFingerprint: string;
  readonly pointerDocumentPath: string;
  readonly pointerDocumentUpdateTimeFingerprint: string;
  readonly seasonManifestRecordUpdateTimeFingerprint: string;
  readonly indexObjectFingerprint: string;
  readonly sessionCount: 12;
  readonly objectCount: 24;
  readonly repositoryOriginAuthority: "firebase_admin_active_release_snapshot";
  readonly seasonManifestAuthority: "generation_pinned_immutable_readback";
  readonly learnerCoreIndexAuthority: "generation_pinned_immutable_readback";
  readonly runtimeAuthority: "authenticated_release_learner_core_identity_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseActivityLearnerCoreSessionReadbackV1 {
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly capsuleEnvelopeFingerprint: string;
  readonly renderRaw: string;
  readonly capsuleEnvelopeRaw: string;
  readonly storageIntegrity: "exact_generation_hash_size_content_type_readback";
  readonly repositoryOriginAuthority: "firebase_admin_active_release_snapshot";
  readonly runtimeAuthority: "authenticated_release_session_bytes_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

export interface V2FirebaseActivityLearnerCoreReleaseAdapterV1 {
  load(input: {
    readonly environment: V2ReleaseEnvironment;
    readonly studyTarget: string;
    readonly learnerSourceLocale: string;
    readonly seasonId: string;
    readonly episodeId: string;
  }): Promise<V2FirebaseActivityLearnerCoreReleaseHandleV1>;
  loadPinned(
    handle: V2UnifiedCourseReleaseActiveHandleV1,
    episodeId: string,
  ): Promise<V2FirebaseActivityLearnerCoreReleaseHandleV1>;
  resolveSession(
    handle: V2FirebaseActivityLearnerCoreReleaseHandleV1,
    sessionOrdinal: number,
  ): Promise<V2FirebaseActivityLearnerCoreSessionReadbackV1>;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<
  object,
  Readonly<{
    summary: V2FirebaseActivityLearnerCoreReleaseSummaryV1;
    index: LearningV2ActivityLearnerCoreReleaseIndexV1;
    pointer?: V2ActivityLearnerCoreReleasePointerV1;
    seasonPointer?: V2SeasonReleasePointer;
  }>
>();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

function fail(): never {
  throw new Error("v2_firebase_activity_learner_core_release_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(raw: string): unknown {
  try {
    const value: unknown = JSON.parse(raw);
    if (canonicalJsonV1(value) !== raw) fail();
    return value;
  } catch {
    fail();
  }
}

function unwrap(raw: string): string {
  const value = parseJson(raw);
  if (
    record(value) &&
    Object.keys(value).length === 1 &&
    typeof value.canonicalRaw === "string"
  ) {
    parseJson(value.canonicalRaw);
    return value.canonicalRaw;
  }
  return raw;
}

function exactInput(input: unknown): asserts input is {
  readonly environment: V2ReleaseEnvironment;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly episodeId: string;
} {
  if (
    !record(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "environment|episodeId|learnerSourceLocale|seasonId|studyTarget" ||
    !["lab", "staging", "production"].includes(String(input.environment)) ||
    !ID_RE.test(String(input.studyTarget)) ||
    !ID_RE.test(String(input.learnerSourceLocale)) ||
    !ID_RE.test(String(input.seasonId)) ||
    !ID_RE.test(String(input.episodeId))
  )
    fail();
}

function seasonManifestPin(value: unknown) {
  if (
    !record(value) ||
    !record(value.object) ||
    typeof value.object.path !== "string" ||
    typeof value.object.generation !== "string" ||
    typeof value.object.contentHash !== "string" ||
    !Number.isSafeInteger(value.object.byteSize) ||
    Number(value.object.byteSize) < 1
  )
    fail();
  return Object.freeze({
    objectPath: value.object.path,
    objectGeneration: value.object.generation,
    contentHash: value.object.contentHash,
    byteSize: Number(value.object.byteSize),
  });
}

async function readJson(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: {
    readonly objectPath: string;
    readonly objectGeneration: string;
    readonly contentHash: string;
    readonly byteSize: number;
  },
  maximumBytes: number,
  acceptedContentTypes: readonly string[],
): Promise<string> {
  if (pin.byteSize < 1 || pin.byteSize > maximumBytes) fail();
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.contentHash !== pin.contentHash ||
    metadata.byteSize !== pin.byteSize ||
    !acceptedContentTypes.includes(metadata.contentType)
  )
    fail();
  const download = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes,
  });
  if (
    download.kind !== "downloaded" ||
    download.bytes.byteLength !== pin.byteSize ||
    createHash("sha256").update(download.bytes).digest("hex") !==
      pin.contentHash
  )
    fail();
  try {
    return decoder.decode(download.bytes);
  } catch {
    fail();
  }
}

async function readChild(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: LearningV2ActivityLearnerCoreObjectPinV1,
  maximumBytes: number,
): Promise<string> {
  return readJson(storage, pin, maximumBytes, [
    V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  ]);
}

export function isV2FirebaseActivityLearnerCoreReleaseHandleV1(
  value: unknown,
): value is V2FirebaseActivityLearnerCoreReleaseHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseActivityLearnerCoreReleaseSummaryV1(
  handle: V2FirebaseActivityLearnerCoreReleaseHandleV1,
): V2FirebaseActivityLearnerCoreReleaseSummaryV1 {
  const found = materials.get(handle);
  if (!found) fail();
  return found.summary;
}

export function createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1(): V2FirebaseActivityLearnerCoreReleaseAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    resolveSession: async (
      handle: V2FirebaseActivityLearnerCoreReleaseHandleV1,
      sessionOrdinal: number,
    ) => {
      const found = materials.get(handle);
      if (
        !found ||
        !Number.isSafeInteger(sessionOrdinal) ||
        sessionOrdinal < 1 ||
        sessionOrdinal > 12
      )
        fail();
      const session = found.index.sessions[sessionOrdinal - 1];
      if (!session || session.sessionOrdinal !== sessionOrdinal) fail();
      const [renderRaw, capsuleEnvelopeRaw] = await Promise.all([
        readChild(
          io.storage,
          session.render,
          LEARNING_V2_ACTIVITY_LEARNER_CORE_RENDER_MAX_BYTES_V1,
        ),
        readChild(
          io.storage,
          session.capsule,
          LEARNING_V2_ACTIVITY_LEARNER_CORE_CAPSULE_MAX_BYTES_V1,
        ),
      ]);
      const render = parseJson(renderRaw);
      const capsule = parseJson(capsuleEnvelopeRaw);
      if (
        hashCanonicalBody(render) !== session.renderFingerprint ||
        hashCanonicalBody(capsule) !== session.capsuleEnvelopeFingerprint ||
        !record(render) ||
        !record(render.session) ||
        render.sourceFingerprint !== session.sourceFingerprint ||
        render.episodeId !== found.index.episodeId ||
        render.session.sessionId !== session.sessionId ||
        render.session.ordinal !== sessionOrdinal ||
        !record(capsule) ||
        capsule.sourceFingerprint !== session.sourceFingerprint ||
        capsule.episodeId !== found.index.episodeId ||
        capsule.sessionId !== session.sessionId ||
        capsule.sessionOrdinal !== sessionOrdinal
      )
        fail();
      return Object.freeze({
        episodeId: found.index.episodeId,
        sessionId: session.sessionId,
        sessionOrdinal,
        activityPackageFingerprint: found.index.activityPackageFingerprint,
        sourceFingerprint: session.sourceFingerprint,
        renderFingerprint: session.renderFingerprint,
        capsuleEnvelopeFingerprint: session.capsuleEnvelopeFingerprint,
        renderRaw,
        capsuleEnvelopeRaw,
        storageIntegrity:
          "exact_generation_hash_size_content_type_readback" as const,
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        runtimeAuthority: "authenticated_release_session_bytes_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        releaseAuthority: false as const,
      });
    },
    loadPinned: async (
      activeHandle: V2UnifiedCourseReleaseActiveHandleV1,
      episodeId: string,
    ) => {
      const active =
        resolveV2UnifiedCourseReleaseActiveMaterialV1(activeHandle);
      const episode = active.root.episodes.find(
        (row) => row.episodeId === episodeId,
      );
      if (!episode) fail();
      const input = {
        environment: active.root.environment,
        releaseId: active.root.releaseId,
        activeManifestHash: active.root.activeManifestHash,
        seasonId: active.root.seasonId,
        studyTarget: active.root.studyTarget,
        learnerSourceLocale: active.root.learnerSourceLocale,
        episodeId,
        stageId: episode.stageId,
        activityPackageFingerprint: episode.activityPackageFingerprint,
        indexFingerprint: episode.learnerCoreIndexFingerprint,
        indexObject: episode.learnerCoreIndexObject,
        unifiedRootFingerprint: active.root.rootFingerprint,
      };
      const indexRaw = await readJson(
        io.storage,
        input.indexObject,
        LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const index = parseLearningV2ActivityLearnerCoreReleaseIndexV1(indexRaw);
      if (
        sha256Utf8(indexRaw) !== input.indexObject.contentHash ||
        index.indexFingerprint !== input.indexFingerprint ||
        index.environment !== input.environment ||
        index.releaseId !== input.releaseId ||
        index.activeManifestHash !== input.activeManifestHash ||
        index.seasonId !== input.seasonId ||
        index.studyTarget !== input.studyTarget ||
        index.learnerSourceLocale !== input.learnerSourceLocale ||
        index.episodeId !== input.episodeId ||
        index.stageId !== input.stageId ||
        index.activityPackageFingerprint !== input.activityPackageFingerprint
      )
        fail();
      const summaryBody = {
        schemaVersion:
          V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        releaseId: input.releaseId,
        activeManifestHash: input.activeManifestHash,
        seasonId: input.seasonId,
        episodeId: input.episodeId,
        stageId: input.stageId,
        activityPackageFingerprint: input.activityPackageFingerprint,
        validatorSummaryFingerprint: index.validatorSummaryFingerprint,
        indexFingerprint: index.indexFingerprint,
        pointerFingerprint: input.unifiedRootFingerprint,
        pointerDocumentPath: "content_v2_unified_course_release_heads",
        pointerDocumentUpdateTimeFingerprint: input.unifiedRootFingerprint,
        seasonManifestRecordUpdateTimeFingerprint: input.unifiedRootFingerprint,
        indexObjectFingerprint: hashCanonicalBody(input.indexObject),
        sessionCount: 12 as const,
        objectCount: 24 as const,
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        seasonManifestAuthority:
          "generation_pinned_immutable_readback" as const,
        learnerCoreIndexAuthority:
          "generation_pinned_immutable_readback" as const,
        runtimeAuthority:
          "authenticated_release_learner_core_identity_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      };
      const summary = Object.freeze({
        ...summaryBody,
        summaryFingerprint: hashCanonicalBody(summaryBody),
      });
      const handle = Object.freeze({
        kind: "v2_firebase_activity_learner_core_release_handle" as const,
      });
      handles.add(handle);
      materials.set(handle, { summary, index });
      return handle;
    },
    load: async (
      input: Parameters<
        V2FirebaseActivityLearnerCoreReleaseAdapterV1["load"]
      >[0],
    ) => {
      exactInput(input);
      const seasonPointerPath = `content_v2_season_release_pointers/${v2SeasonReleasePointerDocumentId(
        v2SeasonReleasePointerId(
          input.environment,
          input.studyTarget,
          input.learnerSourceLocale,
          input.seasonId,
        ),
      )}`;
      const firstPointer = await io.readCanonicalDocumentExact({
        documentPath: seasonPointerPath,
        maximumBytes: 32 * 1024,
      });
      const seasonPointer = assertV2SeasonReleasePointer(
        parseJson(firstPointer.canonicalRaw),
        input.environment,
      );
      if (
        seasonPointer.studyTarget !== input.studyTarget ||
        seasonPointer.learnerSourceLocale !== input.learnerSourceLocale ||
        seasonPointer.seasonId !== input.seasonId
      )
        fail();
      const manifestRecordPath = `content_v2_season_release_manifests/${v2SeasonReleaseManifestDocumentId(
        seasonPointer.activeReleaseId,
      )}`;
      const recordRead = await io.readCanonicalDocumentExact({
        documentPath: manifestRecordPath,
        maximumBytes: 64 * 1024,
      });
      const recordValue = parseJson(recordRead.canonicalRaw);
      const manifestRaw = await readJson(
        io.storage,
        seasonManifestPin(recordValue),
        2 * 1024 * 1024,
        ["application/json", V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const release = resolveV2ReleaseManifest(
        seasonPointer,
        recordValue as V2SeasonReleaseManifestRecord,
        parseJson(manifestRaw) as V2SeasonReleaseManifestBody,
        input.environment,
      );
      if (
        release.body.lessonUnits.filter(
          (unit) => unit.episodeId === input.episodeId,
        ).length !== 1
      )
        fail();
      const pointerDocumentPath =
        v2ActivityLearnerCoreReleasePointerDocumentPathV1({
          activeManifestHash: release.pointer.activeManifestHash,
          episodeId: input.episodeId,
        });
      const pointerRead = await io.readCanonicalDocumentExact({
        documentPath: pointerDocumentPath,
        maximumBytes: V2_ACTIVITY_LEARNER_CORE_RELEASE_POINTER_MAX_BYTES_V1,
      });
      const pointerRaw = unwrap(pointerRead.canonicalRaw);
      const permit = inspectV2ActivityLearnerCoreReleaseIndexPermitV1(
        pointerRaw,
        {
          environment: input.environment,
          releaseId: release.pointer.activeReleaseId,
          activeManifestHash: release.pointer.activeManifestHash,
          seasonId: release.pointer.seasonId,
          episodeId: input.episodeId,
        },
      );
      const indexRaw = await readJson(
        io.storage,
        permit.indexObject,
        LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const index = parseLearningV2ActivityLearnerCoreReleaseIndexV1(indexRaw);
      const pointer = parseV2ActivityLearnerCoreReleasePointerV1(
        pointerRaw,
        index,
      );
      if (
        sha256Utf8(indexRaw) !== permit.indexObject.contentHash ||
        index.indexFingerprint !== permit.indexFingerprint ||
        index.activeManifestHash !== release.pointer.activeManifestHash ||
        index.episodeId !== input.episodeId ||
        index.stageId !== permit.stageId ||
        index.activityPackageFingerprint !== permit.activityPackageFingerprint
      )
        fail();
      const finalPointer = await io.readCanonicalDocumentExact({
        documentPath: seasonPointerPath,
        maximumBytes: 32 * 1024,
      });
      if (
        finalPointer.canonicalRaw !== firstPointer.canonicalRaw ||
        finalPointer.updateTime.seconds !== firstPointer.updateTime.seconds ||
        finalPointer.updateTime.nanoseconds !==
          firstPointer.updateTime.nanoseconds
      )
        fail();
      const summaryBody = {
        schemaVersion:
          V2_FIREBASE_ACTIVITY_LEARNER_CORE_RELEASE_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        releaseId: release.pointer.activeReleaseId,
        activeManifestHash: release.pointer.activeManifestHash,
        seasonId: release.pointer.seasonId,
        episodeId: input.episodeId,
        stageId: index.stageId,
        activityPackageFingerprint: index.activityPackageFingerprint,
        validatorSummaryFingerprint: index.validatorSummaryFingerprint,
        indexFingerprint: index.indexFingerprint,
        pointerFingerprint: pointer.pointerFingerprint,
        pointerDocumentPath,
        pointerDocumentUpdateTimeFingerprint: hashCanonicalBody(
          pointerRead.updateTime,
        ),
        seasonManifestRecordUpdateTimeFingerprint: hashCanonicalBody(
          recordRead.updateTime,
        ),
        indexObjectFingerprint: hashCanonicalBody(permit.indexObject),
        sessionCount: 12 as const,
        objectCount: 24 as const,
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        seasonManifestAuthority:
          "generation_pinned_immutable_readback" as const,
        learnerCoreIndexAuthority:
          "generation_pinned_immutable_readback" as const,
        runtimeAuthority:
          "authenticated_release_learner_core_identity_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      };
      const summary = Object.freeze({
        ...summaryBody,
        summaryFingerprint: hashCanonicalBody(summaryBody),
      });
      const handle = Object.freeze({
        kind: "v2_firebase_activity_learner_core_release_handle" as const,
      });
      handles.add(handle);
      materials.set(handle, {
        summary,
        index,
        pointer,
        seasonPointer: release.pointer,
      });
      return handle;
    },
  });
}
