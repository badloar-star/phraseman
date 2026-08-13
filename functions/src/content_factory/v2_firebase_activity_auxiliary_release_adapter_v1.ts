import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1,
  parseLearningV2ActivityAuxiliaryReleaseIndexV1,
  type LearningV2ActivityAuxiliaryReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1";
import {
  loadLearningV2ActivityAuxiliaryIntegrityV1,
  projectLearningV2ActivityAuxiliaryClientMaterialV1,
  type LearningV2ActivityAuxiliaryIntegrityHandleV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1";
import {
  encodeLearningV2ActivityAuxiliaryClientDescriptorV1,
  materializeLearningV2ActivityAuxiliaryClientDescriptorV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import {
  LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1,
  parseLearningV2ActivityAuxiliaryReleaseManifestV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1";
import {
  assertV2SeasonReleasePointer,
  resolveV2ReleaseManifest,
  type V2ReleaseEnvironment,
  type V2SeasonReleasePointer,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleaseManifestRecord,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1,
  inspectV2ActivityAuxiliaryReleaseIndexPermitV1,
  parseV2ActivityAuxiliaryReleasePointerV1,
  v2ActivityAuxiliaryReleasePointerDocumentPathV1,
  type V2ActivityAuxiliaryReleasePointerV1,
} from "./v2_activity_auxiliary_release_pointer_v1";
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

export const V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1 =
  "v2-firebase-activity-auxiliary-release-summary.v1" as const;

export interface V2FirebaseActivityAuxiliaryReleaseHandleV1 {
  readonly kind: "v2_firebase_activity_auxiliary_release_handle";
}

export interface V2FirebaseActivityAuxiliaryReleaseSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1;
  readonly environment: V2ReleaseEnvironment;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly seasonId: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly indexFingerprint: string;
  readonly pointerDocumentPath: string;
  readonly pointerDocumentUpdateTimeFingerprint: string;
  readonly seasonManifestRecordUpdateTimeFingerprint: string;
  readonly indexObjectFingerprint: string;
  readonly repositoryOriginAuthority: "firebase_admin_active_release_snapshot";
  readonly seasonManifestAuthority: "generation_pinned_immutable_readback";
  readonly auxiliaryIndexAuthority: "generation_pinned_immutable_readback";
  readonly runtimeAuthority: "authenticated_release_resource_identity_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseActivityAuxiliaryReleaseAdapterV1 {
  load(
    input: Readonly<{
      environment: V2ReleaseEnvironment;
      studyTarget: string;
      learnerSourceLocale: string;
      seasonId: string;
      episodeId: string;
    }>,
  ): Promise<V2FirebaseActivityAuxiliaryReleaseHandleV1>;
  loadPinned(
    handle: V2UnifiedCourseReleaseActiveHandleV1,
    episodeId: string,
  ): Promise<V2FirebaseActivityAuxiliaryReleaseHandleV1>;
  resolveSession(
    handle: V2FirebaseActivityAuxiliaryReleaseHandleV1,
    sessionOrdinal: number,
  ): Promise<LearningV2ActivityAuxiliaryIntegrityHandleV1>;
  projectSessionDescriptor(
    handle: V2FirebaseActivityAuxiliaryReleaseHandleV1,
    sessionOrdinal: number,
  ): Promise<string>;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<
  object,
  Readonly<{
    summary: V2FirebaseActivityAuxiliaryReleaseSummaryV1;
    index: LearningV2ActivityAuxiliaryReleaseIndexV1;
    pointer?: V2ActivityAuxiliaryReleasePointerV1;
    seasonPointer?: V2SeasonReleasePointer;
  }>
>();
const decoder = new TextDecoder("utf-8", { fatal: true });
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;

function fail(): never {
  throw new Error("v2_firebase_activity_auxiliary_release_invalid");
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function exactInput(input: unknown): asserts input is Readonly<{
  environment: V2ReleaseEnvironment;
  studyTarget: string;
  learnerSourceLocale: string;
  seasonId: string;
  episodeId: string;
}> {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "environment|episodeId|learnerSourceLocale|seasonId|studyTarget" ||
    !["lab", "staging", "production"].includes(
      String((input as { environment?: unknown }).environment),
    ) ||
    !ID_RE.test(String((input as { studyTarget?: unknown }).studyTarget)) ||
    !ID_RE.test(
      String((input as { learnerSourceLocale?: unknown }).learnerSourceLocale),
    ) ||
    !ID_RE.test(String((input as { seasonId?: unknown }).seasonId)) ||
    !ID_RE.test(String((input as { episodeId?: unknown }).episodeId))
  )
    fail();
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

function unwrapCanonicalRawDocument(raw: string): string {
  const value = parseJson(raw);
  if (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.canonicalRaw === "string"
  ) {
    parseJson(value.canonicalRaw);
    return value.canonicalRaw;
  }
  return raw;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function seasonManifestObjectPin(value: unknown): Readonly<{
  objectPath: string;
  objectGeneration: string;
  contentHash: string;
  byteSize: number;
}> {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join("|") !==
      "createdAt|manifestHash|object|releaseId|schemaVersion|seasonId" ||
    !isRecord(value.object) ||
    Object.keys(value.object).sort().join("|") !==
      "byteSize|contentHash|generation|path" ||
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
  pin: Readonly<{
    objectPath: string;
    objectGeneration: string;
    contentHash: string;
    byteSize: number;
  }>,
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
    sha256Bytes(download.bytes) !== pin.contentHash
  )
    fail();
  try {
    return decoder.decode(download.bytes);
  } catch {
    fail();
  }
}

export function isV2FirebaseActivityAuxiliaryReleaseHandleV1(
  value: unknown,
): value is V2FirebaseActivityAuxiliaryReleaseHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseActivityAuxiliaryReleaseSummaryV1(
  handle: V2FirebaseActivityAuxiliaryReleaseHandleV1,
): V2FirebaseActivityAuxiliaryReleaseSummaryV1 {
  const found = materials.get(handle);
  if (!found) fail();
  return found.summary;
}

export function resolveV2FirebaseActivityAuxiliaryReleaseMaterialV1(
  handle: V2FirebaseActivityAuxiliaryReleaseHandleV1,
): Readonly<{
  index: LearningV2ActivityAuxiliaryReleaseIndexV1;
  pointer: V2ActivityAuxiliaryReleasePointerV1;
  seasonPointer: V2SeasonReleasePointer;
}> {
  const found = materials.get(handle);
  if (!found || !found.pointer || !found.seasonPointer) fail();
  return Object.freeze({
    index: found.index,
    pointer: found.pointer,
    seasonPointer: found.seasonPointer,
  });
}

export function createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1(): V2FirebaseActivityAuxiliaryReleaseAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    resolveSession: async (
      handle: V2FirebaseActivityAuxiliaryReleaseHandleV1,
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
      const sessionPin = found.index.sessions[sessionOrdinal - 1];
      if (!sessionPin || sessionPin.sessionOrdinal !== sessionOrdinal) fail();
      const manifestRaw = await readJson(
        io.storage,
        {
          objectPath: sessionPin.objectPath,
          objectGeneration: sessionPin.objectGeneration,
          contentHash: sessionPin.contentHash,
          byteSize: sessionPin.byteSize,
        },
        LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const manifest =
        parseLearningV2ActivityAuxiliaryReleaseManifestV1(manifestRaw);
      try {
        return await loadLearningV2ActivityAuxiliaryIntegrityV1({
          manifest,
          expected: {
            stageId: found.index.stageId,
            episodeId: found.index.episodeId,
            sessionId: sessionPin.sessionId,
            sessionOrdinal,
            activityPackageFingerprint: found.index.activityPackageFingerprint,
            sourceFingerprint: sessionPin.sourceFingerprint,
            renderFingerprint: sessionPin.renderFingerprint,
          },
          reader: {
            readExact: async (pin) => {
              const raw = await readJson(io.storage, pin, pin.byteSize, [
                V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
              ]);
              return Object.freeze({
                raw,
                objectGeneration: pin.objectGeneration,
                byteSize: pin.byteSize,
                contentHash: pin.contentHash,
                contentType: pin.contentType,
              });
            },
          },
        });
      } catch {
        fail();
      }
    },
    projectSessionDescriptor: async (
      handle: V2FirebaseActivityAuxiliaryReleaseHandleV1,
      sessionOrdinal: number,
    ) => {
      const found = materials.get(handle);
      if (!found) fail();
      const sessionPin = found.index.sessions[sessionOrdinal - 1];
      if (!sessionPin || sessionPin.sessionOrdinal !== sessionOrdinal) fail();
      const manifestRaw = await readJson(
        io.storage,
        {
          objectPath: sessionPin.objectPath,
          objectGeneration: sessionPin.objectGeneration,
          contentHash: sessionPin.contentHash,
          byteSize: sessionPin.byteSize,
        },
        LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_MANIFEST_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const manifest =
        parseLearningV2ActivityAuxiliaryReleaseManifestV1(manifestRaw);
      let integrity: LearningV2ActivityAuxiliaryIntegrityHandleV1;
      try {
        integrity = await loadLearningV2ActivityAuxiliaryIntegrityV1({
          manifest,
          expected: {
            stageId: found.index.stageId,
            episodeId: found.index.episodeId,
            sessionId: sessionPin.sessionId,
            sessionOrdinal,
            activityPackageFingerprint: found.index.activityPackageFingerprint,
            sourceFingerprint: sessionPin.sourceFingerprint,
            renderFingerprint: sessionPin.renderFingerprint,
          },
          reader: {
            readExact: async (pin) => {
              const raw = await readJson(io.storage, pin, pin.byteSize, [
                V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
              ]);
              return Object.freeze({
                raw,
                objectGeneration: pin.objectGeneration,
                byteSize: pin.byteSize,
                contentHash: pin.contentHash,
                contentType: pin.contentType,
              });
            },
          },
        });
      } catch {
        fail();
      }
      const client =
        projectLearningV2ActivityAuxiliaryClientMaterialV1(integrity);
      return encodeLearningV2ActivityAuxiliaryClientDescriptorV1(
        materializeLearningV2ActivityAuxiliaryClientDescriptorV1({
          environment: found.index.environment,
          studyTarget: found.index.studyTarget,
          learnerSourceLocale: found.index.learnerSourceLocale,
          seasonId: found.index.seasonId,
          releaseId: found.index.releaseId,
          activeManifestHash: found.index.activeManifestHash,
          episodeId: found.index.episodeId,
          stageId: found.index.stageId,
          sessionId: sessionPin.sessionId,
          sessionOrdinal,
          activityPackageFingerprint: found.index.activityPackageFingerprint,
          auxiliaryIndexFingerprint: found.index.indexFingerprint,
          auxiliaryManifestFingerprint: sessionPin.manifestFingerprint,
          sourceFingerprint: sessionPin.sourceFingerprint,
          renderFingerprint: sessionPin.renderFingerprint,
          actionResource: client.action,
          postTerminalCards: client.cards,
          audioRuntime: client.audio,
          errorSourceProjectionFingerprint:
            client.errorSourceProjectionFingerprint,
          errorExplanations: client.errorEntries.map((entry) =>
            Object.freeze({
              explanationRef: entry.explanationRef,
              taskId: entry.taskId,
              activityId: entry.activityId,
              textByLocale: entry.textByLocale,
            }),
          ),
        }),
      );
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
        indexFingerprint: episode.auxiliaryIndexFingerprint,
        indexObject: episode.auxiliaryIndexObject,
        unifiedRootFingerprint: active.root.rootFingerprint,
      };
      const indexRaw = await readJson(
        io.storage,
        input.indexObject,
        LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const index = parseLearningV2ActivityAuxiliaryReleaseIndexV1(indexRaw);
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
        schemaVersion: V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        releaseId: input.releaseId,
        activeManifestHash: input.activeManifestHash,
        seasonId: input.seasonId,
        episodeId: input.episodeId,
        stageId: input.stageId,
        activityPackageFingerprint: input.activityPackageFingerprint,
        indexFingerprint: index.indexFingerprint,
        pointerDocumentPath: "content_v2_unified_course_release_heads",
        pointerDocumentUpdateTimeFingerprint: input.unifiedRootFingerprint,
        seasonManifestRecordUpdateTimeFingerprint: input.unifiedRootFingerprint,
        indexObjectFingerprint: hashCanonicalBody(input.indexObject),
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        seasonManifestAuthority:
          "generation_pinned_immutable_readback" as const,
        auxiliaryIndexAuthority:
          "generation_pinned_immutable_readback" as const,
        runtimeAuthority:
          "authenticated_release_resource_identity_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
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
        kind: "v2_firebase_activity_auxiliary_release_handle" as const,
      });
      handles.add(handle);
      materials.set(handle, { summary, index });
      return handle;
    },
    load: async (
      input: Parameters<V2FirebaseActivityAuxiliaryReleaseAdapterV1["load"]>[0],
    ) => {
      exactInput(input);
      const pointerId = v2SeasonReleasePointerId(
        input.environment,
        input.studyTarget,
        input.learnerSourceLocale,
        input.seasonId,
      );
      const seasonPointerPath = `content_v2_season_release_pointers/${v2SeasonReleasePointerDocumentId(pointerId)}`;
      const firstPointer = await io.readCanonicalDocumentExact({
        documentPath: seasonPointerPath,
        maximumBytes: 32 * 1024,
      });
      const pointer = assertV2SeasonReleasePointer(
        parseJson(firstPointer.canonicalRaw),
        input.environment,
      );
      if (
        pointer.environment !== input.environment ||
        pointer.studyTarget !== input.studyTarget ||
        pointer.learnerSourceLocale !== input.learnerSourceLocale ||
        pointer.seasonId !== input.seasonId
      )
        fail();
      const manifestRecordPath = `content_v2_season_release_manifests/${v2SeasonReleaseManifestDocumentId(pointer.activeReleaseId)}`;
      const recordRead = await io.readCanonicalDocumentExact({
        documentPath: manifestRecordPath,
        maximumBytes: 64 * 1024,
      });
      const recordValue = parseJson(recordRead.canonicalRaw);
      const recordPin = seasonManifestObjectPin(recordValue);
      const record = recordValue as V2SeasonReleaseManifestRecord;
      const manifestRaw = await readJson(
        io.storage,
        recordPin,
        2 * 1024 * 1024,
        ["application/json", V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const body = parseJson(manifestRaw) as V2SeasonReleaseManifestBody;
      const release = resolveV2ReleaseManifest(
        pointer,
        record,
        body,
        input.environment,
      );
      const lessonUnits = release.body.lessonUnits.filter(
        (unit) => unit.episodeId === input.episodeId,
      );
      if (lessonUnits.length !== 1) fail();
      const auxiliaryPointerPath =
        v2ActivityAuxiliaryReleasePointerDocumentPathV1({
          activeManifestHash: release.pointer.activeManifestHash,
          episodeId: input.episodeId,
        });
      const auxiliaryPointerRead = await io.readCanonicalDocumentExact({
        documentPath: auxiliaryPointerPath,
        maximumBytes: V2_ACTIVITY_AUXILIARY_RELEASE_POINTER_MAX_BYTES_V1,
      });
      const permit = inspectV2ActivityAuxiliaryReleaseIndexPermitV1(
        unwrapCanonicalRawDocument(auxiliaryPointerRead.canonicalRaw),
        {
          environment: input.environment,
          releaseId: release.pointer.activeReleaseId,
          activeManifestHash: release.pointer.activeManifestHash,
          seasonId: release.pointer.seasonId,
          episodeId: input.episodeId,
          lessonUnitObject: lessonUnits[0].object,
        },
      );
      const indexRaw = await readJson(
        io.storage,
        permit.indexObject,
        LEARNING_V2_ACTIVITY_AUXILIARY_RELEASE_INDEX_MAX_BYTES_V1,
        [V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1],
      );
      const index = parseLearningV2ActivityAuxiliaryReleaseIndexV1(indexRaw);
      const structuralPointer = parseV2ActivityAuxiliaryReleasePointerV1(
        unwrapCanonicalRawDocument(auxiliaryPointerRead.canonicalRaw),
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
        schemaVersion: V2_FIREBASE_ACTIVITY_AUXILIARY_RELEASE_SUMMARY_SCHEMA_V1,
        environment: input.environment,
        releaseId: release.pointer.activeReleaseId,
        activeManifestHash: release.pointer.activeManifestHash,
        seasonId: release.pointer.seasonId,
        episodeId: input.episodeId,
        stageId: index.stageId,
        activityPackageFingerprint: index.activityPackageFingerprint,
        indexFingerprint: index.indexFingerprint,
        pointerDocumentPath: auxiliaryPointerPath,
        pointerDocumentUpdateTimeFingerprint: hashCanonicalBody(
          auxiliaryPointerRead.updateTime,
        ),
        seasonManifestRecordUpdateTimeFingerprint: hashCanonicalBody(
          recordRead.updateTime,
        ),
        indexObjectFingerprint: hashCanonicalBody(permit.indexObject),
        repositoryOriginAuthority:
          "firebase_admin_active_release_snapshot" as const,
        seasonManifestAuthority:
          "generation_pinned_immutable_readback" as const,
        auxiliaryIndexAuthority:
          "generation_pinned_immutable_readback" as const,
        runtimeAuthority:
          "authenticated_release_resource_identity_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
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
        kind: "v2_firebase_activity_auxiliary_release_handle" as const,
      });
      handles.add(handle);
      materials.set(handle, {
        summary,
        index,
        pointer: structuralPointer,
        seasonPointer: release.pointer,
      });
      return handle;
    },
  });
}
