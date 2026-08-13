import {
  encodeLearningV2ActivityAuxiliaryReleaseIndexV1,
  materializeLearningV2ActivityAuxiliaryReleaseIndexV1,
  type LearningV2ActivityAuxiliaryReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1";
import { loadLearningV2ActivityAuxiliaryIntegrityV1 } from "../../../modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1";
import { parseLearningV2ActivityAuxiliaryReleaseManifestV1 } from "../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1";
import type {
  V2PublishedSeasonManifestView,
  V2ReleaseEnvironment,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  encodeV2ActivityAuxiliaryReleasePointerV1,
  materializeV2ActivityAuxiliaryReleasePointerV1,
  v2ActivityAuxiliaryReleaseIndexObjectPathV1,
  v2ActivityAuxiliaryReleasePointerDocumentPathV1,
} from "./v2_activity_auxiliary_release_pointer_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  getV2FirebaseActivityAuxiliaryReleaseSummaryV1,
  createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1,
  type V2FirebaseActivityAuxiliaryReleaseHandleV1,
} from "./v2_firebase_activity_auxiliary_release_adapter_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  v2SeasonReleaseManifestDocumentId,
  v2SeasonReleasePointerDocumentId,
  v2SeasonReleasePointerId,
} from "./v2_required_session_activation";

export interface V2FirebaseActivityAuxiliaryReleasePublisherV1 {
  publish(
    input: Readonly<{
      publishedView: V2PublishedSeasonManifestView;
      expectedEnvironment: V2ReleaseEnvironment;
      episodeId: string;
      stageId: string;
      activityPackageFingerprint: string;
      sessionManifestRaws: readonly string[];
    }>,
  ): Promise<V2FirebaseActivityAuxiliaryReleaseHandleV1>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(): never {
  throw new Error("v2_firebase_activity_auxiliary_release_publish_invalid");
}

export function createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1(): V2FirebaseActivityAuxiliaryReleasePublisherV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const reader = createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1();
  return Object.freeze({
    publish: async (
      input: Parameters<
        V2FirebaseActivityAuxiliaryReleasePublisherV1["publish"]
      >[0],
    ) => {
      if (
        typeof input !== "object" ||
        input === null ||
        Array.isArray(input) ||
        Object.keys(input).sort().join("|") !==
          "activityPackageFingerprint|episodeId|expectedEnvironment|publishedView|sessionManifestRaws|stageId" ||
        !Array.isArray(input.sessionManifestRaws) ||
        input.sessionManifestRaws.length !== 12
      )
        fail();
      const releasePointer = input.publishedView.activePointer;
      const pointerPath = `content_v2_season_release_pointers/${v2SeasonReleasePointerDocumentId(
        v2SeasonReleasePointerId(
          input.expectedEnvironment,
          releasePointer.studyTarget,
          releasePointer.learnerSourceLocale,
          releasePointer.seasonId,
        ),
      )}`;
      const currentPointer = await io.readCanonicalDocumentExact({
        documentPath: pointerPath,
        maximumBytes: 32 * 1024,
      });
      const manifestRecordPath = `content_v2_season_release_manifests/${v2SeasonReleaseManifestDocumentId(
        releasePointer.activeReleaseId,
      )}`;
      const currentRecord = await io.readCanonicalDocumentExact({
        documentPath: manifestRecordPath,
        maximumBytes: 64 * 1024,
      });
      if (
        currentPointer.canonicalRaw !== canonicalJsonV1(releasePointer) ||
        currentRecord.canonicalRaw !==
          canonicalJsonV1(input.publishedView.manifestRecord)
      )
        fail();
      const manifestPins = [] as {
        raw: string;
        objectGeneration: string;
      }[];
      let provisionalIndex: LearningV2ActivityAuxiliaryReleaseIndexV1;
      try {
        provisionalIndex = materializeLearningV2ActivityAuxiliaryReleaseIndexV1(
          {
            publishedView: input.publishedView,
            expectedEnvironment: input.expectedEnvironment,
            episodeId: input.episodeId,
            stageId: input.stageId,
            activityPackageFingerprint: input.activityPackageFingerprint,
            manifests: input.sessionManifestRaws.map((raw) => ({
              raw,
              objectGeneration: "1",
            })),
          },
        );
      } catch {
        fail();
      }
      for (const raw of input.sessionManifestRaws) {
        const manifest = parseLearningV2ActivityAuxiliaryReleaseManifestV1(raw);
        try {
          await loadLearningV2ActivityAuxiliaryIntegrityV1({
            manifest,
            expected: {
              stageId: manifest.stageId,
              episodeId: manifest.episodeId,
              sessionId: manifest.sessionId,
              sessionOrdinal: manifest.sessionOrdinal,
              activityPackageFingerprint: manifest.activityPackageFingerprint,
              sourceFingerprint: manifest.sourceFingerprint,
              renderFingerprint: manifest.renderFingerprint,
            },
            reader: {
              readExact: async (pin) => {
                const metadata = await io.storage.readMetadataExact(
                  pin.objectPath,
                );
                if (
                  metadata === null ||
                  metadata.generation !== pin.objectGeneration ||
                  metadata.byteSize !== pin.byteSize ||
                  metadata.contentHash !== pin.contentHash ||
                  String(metadata.contentType) !== pin.contentType
                )
                  fail();
                const downloaded = await io.storage.downloadGenerationExact({
                  objectPath: pin.objectPath,
                  ifGenerationMatch: pin.objectGeneration,
                  maximumBytes: pin.byteSize,
                });
                if (
                  downloaded.kind !== "downloaded" ||
                  downloaded.bytes.byteLength !== pin.byteSize
                )
                  fail();
                let childRaw: string;
                try {
                  childRaw = decoder.decode(downloaded.bytes);
                } catch {
                  fail();
                }
                return Object.freeze({
                  raw: childRaw,
                  objectGeneration: metadata.generation,
                  byteSize: metadata.byteSize,
                  contentHash: metadata.contentHash,
                  contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
                });
              },
            },
          });
        } catch {
          fail();
        }
      }
      for (let index = 0; index < 12; index += 1) {
        const raw = input.sessionManifestRaws[index]!;
        const path = provisionalIndex.sessions[index]!.objectPath;
        const persisted = await persistV2ImmutableRepositoryObjectV1({
          storage: io.storage,
          objectPath: path,
          bytes: encoder.encode(raw),
          maximumBytes: 64 * 1024,
          contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
          contentHash: sha256Utf8(raw),
        });
        manifestPins.push({
          raw,
          objectGeneration: persisted.pin.objectGeneration,
        });
      }
      const releaseIndex = materializeLearningV2ActivityAuxiliaryReleaseIndexV1(
        {
          publishedView: input.publishedView,
          expectedEnvironment: input.expectedEnvironment,
          episodeId: input.episodeId,
          stageId: input.stageId,
          activityPackageFingerprint: input.activityPackageFingerprint,
          manifests: manifestPins,
        },
      );
      const indexRaw =
        encodeLearningV2ActivityAuxiliaryReleaseIndexV1(releaseIndex);
      const indexRawHash = sha256Utf8(indexRaw);
      const indexPath = v2ActivityAuxiliaryReleaseIndexObjectPathV1({
        activeManifestHash: releaseIndex.activeManifestHash,
        episodeId: releaseIndex.episodeId,
        indexFingerprint: releaseIndex.indexFingerprint,
        rawHash: indexRawHash,
      });
      const indexPersisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: indexPath,
        bytes: encoder.encode(indexRaw),
        maximumBytes: 256 * 1024,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: indexRawHash,
      });
      const pointer = materializeV2ActivityAuxiliaryReleasePointerV1({
        indexRaw,
        indexObjectGeneration: indexPersisted.pin.objectGeneration,
      });
      const pointerRaw = encodeV2ActivityAuxiliaryReleasePointerV1(pointer);
      const auxiliaryPointerPath =
        v2ActivityAuxiliaryReleasePointerDocumentPathV1({
          activeManifestHash: releaseIndex.activeManifestHash,
          episodeId: releaseIndex.episodeId,
        });
      await io.firestore.runTransaction(async (transaction) => {
        const current = await transaction.readExact(auxiliaryPointerPath);
        if (current.exists) {
          if (current.raw !== pointerRaw) fail();
          return;
        }
        await transaction.createExact(auxiliaryPointerPath, pointerRaw);
      });
      const handle = await reader.load({
        environment: input.expectedEnvironment,
        studyTarget: input.publishedView.activePointer.studyTarget,
        learnerSourceLocale:
          input.publishedView.activePointer.learnerSourceLocale,
        seasonId: input.publishedView.activePointer.seasonId,
        episodeId: input.episodeId,
      });
      const summary = getV2FirebaseActivityAuxiliaryReleaseSummaryV1(handle);
      if (
        summary.indexFingerprint !== releaseIndex.indexFingerprint ||
        summary.activityPackageFingerprint !==
          input.activityPackageFingerprint ||
        summary.activeManifestHash !== releaseIndex.activeManifestHash
      )
        fail();
      return handle;
    },
  });
}
