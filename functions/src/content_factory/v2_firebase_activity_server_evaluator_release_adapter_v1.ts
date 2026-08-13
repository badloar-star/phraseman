import { createHash } from "node:crypto";
import {
  assertV2SeasonReleasePointer,
  resolveV2ReleaseManifest,
  type V2ReleaseEnvironment,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleaseManifestRecord,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1,
  V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1,
  parseV2ActivityServerEvaluatorReleaseIndexV1,
  parseV2ActivityServerEvaluatorReleasePointerV1,
  v2ActivityServerEvaluatorReleasePointerDocumentPathV1,
  type V2ActivityServerEvaluatorReleaseIndexV1,
  type V2ActivityServerEvaluatorReleasePointerV1,
} from "./v2_activity_server_evaluator_release_v1";
import {
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
} from "./v2_activity_session_projection";
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

export const V2_FIREBASE_ACTIVITY_SERVER_EVALUATOR_RELEASE_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-server-evaluator-release-summary.v1" as const;

export interface V2FirebaseActivityServerEvaluatorReleaseHandleV1 {
  readonly kind: "v2_firebase_activity_server_evaluator_release_handle";
}

export interface V2FirebaseActivityServerEvaluatorReleaseSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_SERVER_EVALUATOR_RELEASE_SUMMARY_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly courseReleaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
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
  readonly objectCount: 12;
  readonly serverOnly: true;
  readonly clientDelivery: "forbidden";
  readonly repositoryOriginAuthority: "firebase_admin_active_release_snapshot";
  readonly evaluatorIndexAuthority: "generation_pinned_immutable_readback";
  readonly evaluationAuthority: "candidate_only_server_policy_required";
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

export interface V2FirebaseActivityServerEvaluatorSessionReadbackV1 {
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly sourceFingerprint: string;
  readonly sidecarFingerprint: string;
  readonly commitmentAggregate: string;
  readonly sidecarRaw: string;
  readonly serverOnly: true;
  readonly clientDelivery: "forbidden";
  readonly storageIntegrity: "exact_generation_hash_size_content_type_readback";
  readonly repositoryOriginAuthority: "firebase_admin_active_release_snapshot";
  readonly evaluationAuthority: "candidate_only_server_policy_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

export interface V2FirebaseActivityServerEvaluatorReleaseAdapterV1 {
  load(input: {
    readonly environment: V2ReleaseEnvironment;
    readonly studyTarget: string;
    readonly learnerSourceLocale: string;
    readonly seasonId: string;
    readonly episodeId: string;
  }): Promise<V2FirebaseActivityServerEvaluatorReleaseHandleV1>;
  loadPinned(
    handle: V2UnifiedCourseReleaseActiveHandleV1,
    episodeId: string,
  ): Promise<V2FirebaseActivityServerEvaluatorReleaseHandleV1>;
  resolveSession(
    handle: V2FirebaseActivityServerEvaluatorReleaseHandleV1,
    sessionOrdinal: number,
  ): Promise<V2FirebaseActivityServerEvaluatorSessionReadbackV1>;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<
  object,
  Readonly<{
    summary: V2FirebaseActivityServerEvaluatorReleaseSummaryV1;
    index: V2ActivityServerEvaluatorReleaseIndexV1;
    pointer?: V2ActivityServerEvaluatorReleasePointerV1;
  }>
>();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

function fail(): never {
  throw new Error("v2_firebase_activity_server_evaluator_release_invalid");
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

function manifestPin(value: unknown) {
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
  contentTypes: readonly string[],
): Promise<string> {
  if (pin.byteSize < 1 || pin.byteSize > maximumBytes) fail();
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    metadata === null ||
    metadata.generation !== pin.objectGeneration ||
    metadata.contentHash !== pin.contentHash ||
    metadata.byteSize !== pin.byteSize ||
    !contentTypes.includes(metadata.contentType)
  )
    fail();
  const downloaded = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes,
  });
  if (
    downloaded.kind !== "downloaded" ||
    downloaded.bytes.byteLength !== pin.byteSize ||
    createHash("sha256").update(downloaded.bytes).digest("hex") !==
      pin.contentHash
  )
    fail();
  try {
    return decoder.decode(downloaded.bytes);
  } catch {
    fail();
  }
}

export function isV2FirebaseActivityServerEvaluatorReleaseHandleV1(
  value: unknown,
): value is V2FirebaseActivityServerEvaluatorReleaseHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseActivityServerEvaluatorReleaseSummaryV1(
  handle: V2FirebaseActivityServerEvaluatorReleaseHandleV1,
): V2FirebaseActivityServerEvaluatorReleaseSummaryV1 {
  const found = materials.get(handle);
  if (!found) fail();
  return found.summary;
}

export function createFirebaseAdminV2ActivityServerEvaluatorReleaseAdapterV1(): V2FirebaseActivityServerEvaluatorReleaseAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    resolveSession: async (
      handle: V2FirebaseActivityServerEvaluatorReleaseHandleV1,
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
      const sidecarRaw = await readJson(
        io.storage,
        session.sidecar,
        V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const sidecar = parseJson(sidecarRaw);
      if (
        !record(sidecar) ||
        sidecar.schemaVersion !== V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 ||
        sidecar.sourceFingerprint !== session.sourceFingerprint ||
        sidecar.episodeId !== found.index.episodeId ||
        sidecar.sessionId !== session.sessionId ||
        sidecar.sessionOrdinal !== sessionOrdinal ||
        sidecar.commitmentAggregate !== session.commitmentAggregate ||
        sidecar.serverOnly !== true ||
        sidecar.evaluationAuthority !== "none" ||
        sidecar.rewardAuthority !== "none" ||
        sidecar.releaseAuthority !== false ||
        hashCanonicalBody(sidecar) !== session.sidecarFingerprint
      )
        fail();
      return Object.freeze({
        episodeId: found.index.episodeId,
        sessionId: session.sessionId,
        sessionOrdinal,
        activityPackageFingerprint: found.index.activityPackageFingerprint,
        sourceFingerprint: session.sourceFingerprint,
        sidecarFingerprint: session.sidecarFingerprint,
        commitmentAggregate: session.commitmentAggregate,
        sidecarRaw,
        serverOnly: true as const,
        clientDelivery: "forbidden" as const,
        storageIntegrity:
          "exact_generation_hash_size_content_type_readback" as const,
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        evaluationAuthority: "candidate_only_server_policy_required" as const,
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
        episodeId,
        episodeOrdinal: episode.episodeOrdinal,
        stageId: episode.stageId,
        activityPackageFingerprint: episode.activityPackageFingerprint,
        indexFingerprint: episode.serverEvaluatorIndexFingerprint,
        indexObject: episode.serverEvaluatorIndexObject,
        unifiedRootFingerprint: active.root.rootFingerprint,
      };
      const indexRaw = await readJson(
        io.storage,
        input.indexObject,
        V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const index = parseV2ActivityServerEvaluatorReleaseIndexV1(indexRaw);
      if (
        sha256Utf8(indexRaw) !== input.indexObject.contentHash ||
        index.indexFingerprint !== input.indexFingerprint ||
        index.environment !== input.environment ||
        index.releaseId !== input.releaseId ||
        index.activeManifestHash !== input.activeManifestHash ||
        index.seasonId !== input.seasonId ||
        index.episodeId !== input.episodeId ||
        index.stageId !== input.stageId ||
        index.activityPackageFingerprint !== input.activityPackageFingerprint
      )
        fail();
      const summaryBody = {
        schemaVersion:
          V2_FIREBASE_ACTIVITY_SERVER_EVALUATOR_RELEASE_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        releaseId: input.releaseId,
        courseReleaseId: input.releaseId,
        activeManifestHash: input.activeManifestHash,
        seasonId: input.seasonId,
        episodeId: input.episodeId,
        episodeOrdinal: input.episodeOrdinal,
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
        objectCount: 12 as const,
        serverOnly: true as const,
        clientDelivery: "forbidden" as const,
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        evaluatorIndexAuthority:
          "generation_pinned_immutable_readback" as const,
        evaluationAuthority: "candidate_only_server_policy_required" as const,
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
        kind: "v2_firebase_activity_server_evaluator_release_handle" as const,
      });
      handles.add(handle);
      materials.set(handle, Object.freeze({ summary, index }));
      return handle;
    },
    load: async (
      input: Parameters<
        V2FirebaseActivityServerEvaluatorReleaseAdapterV1["load"]
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
        manifestPin(recordValue),
        2 * 1024 * 1024,
        ["application/json", V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const release = resolveV2ReleaseManifest(
        seasonPointer,
        recordValue as V2SeasonReleaseManifestRecord,
        parseJson(manifestRaw) as V2SeasonReleaseManifestBody,
        input.environment,
      );
      const lessonUnits = release.body.lessonUnits.filter(
        (unit) => unit.episodeId === input.episodeId,
      );
      const lessonUnit = lessonUnits[0];
      if (
        lessonUnits.length !== 1 ||
        !lessonUnit ||
        !Number.isSafeInteger(lessonUnit.lessonId) ||
        lessonUnit.lessonId < 1 ||
        lessonUnit.lessonId > 32
      )
        fail();
      const pointerDocumentPath =
        v2ActivityServerEvaluatorReleasePointerDocumentPathV1({
          activeManifestHash: release.pointer.activeManifestHash,
          episodeId: input.episodeId,
        });
      const pointerRead = await io.readCanonicalDocumentExact({
        documentPath: pointerDocumentPath,
        maximumBytes: V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_POINTER_MAX_BYTES_V1,
      });
      const pointerRaw = unwrap(pointerRead.canonicalRaw);
      const structuralPointer =
        parseV2ActivityServerEvaluatorReleasePointerV1(pointerRaw);
      if (
        structuralPointer.environment !== input.environment ||
        structuralPointer.releaseId !== release.pointer.activeReleaseId ||
        structuralPointer.activeManifestHash !==
          release.pointer.activeManifestHash ||
        structuralPointer.seasonId !== release.pointer.seasonId ||
        structuralPointer.episodeId !== input.episodeId
      )
        fail();
      const indexRaw = await readJson(
        io.storage,
        structuralPointer.indexObject,
        V2_ACTIVITY_SERVER_EVALUATOR_RELEASE_INDEX_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const index = parseV2ActivityServerEvaluatorReleaseIndexV1(indexRaw);
      const pointer = parseV2ActivityServerEvaluatorReleasePointerV1(
        pointerRaw,
        index,
      );
      if (
        sha256Utf8(indexRaw) !== pointer.indexObject.contentHash ||
        index.indexFingerprint !== pointer.indexFingerprint ||
        index.activeManifestHash !== release.pointer.activeManifestHash ||
        index.episodeId !== input.episodeId ||
        index.stageId !== pointer.stageId ||
        index.activityPackageFingerprint !== pointer.activityPackageFingerprint
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
      const summaryBody = Object.freeze({
        schemaVersion:
          V2_FIREBASE_ACTIVITY_SERVER_EVALUATOR_RELEASE_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        releaseId: release.pointer.activeReleaseId,
        courseReleaseId: release.body.courseReleaseId,
        activeManifestHash: release.pointer.activeManifestHash,
        seasonId: release.pointer.seasonId,
        episodeId: input.episodeId,
        episodeOrdinal: lessonUnit.lessonId,
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
        indexObjectFingerprint: hashCanonicalBody(pointer.indexObject),
        sessionCount: 12 as const,
        objectCount: 12 as const,
        serverOnly: true as const,
        clientDelivery: "forbidden" as const,
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        evaluatorIndexAuthority:
          "generation_pinned_immutable_readback" as const,
        evaluationAuthority: "candidate_only_server_policy_required" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      });
      const summary = Object.freeze({
        ...summaryBody,
        summaryFingerprint: hashCanonicalBody(summaryBody),
      });
      const handle = Object.freeze({
        kind: "v2_firebase_activity_server_evaluator_release_handle" as const,
      });
      handles.add(handle);
      materials.set(handle, Object.freeze({ summary, index, pointer }));
      return handle;
    },
  });
}
