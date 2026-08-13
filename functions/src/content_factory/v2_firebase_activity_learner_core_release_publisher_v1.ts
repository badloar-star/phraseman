import type {
  V2PublishedSeasonManifestView,
  V2ReleaseEnvironment,
} from "../../../modules/learning-v2/content/release_manifest";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
  encodeLearningV2ActivityLearnerCoreReleaseIndexV1,
  materializeLearningV2ActivityLearnerCoreReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/activity_learner_core_release_index_v1";
import {
  encodeV2ActivityLearnerCoreReleasePointerV1,
  materializeV2ActivityLearnerCoreReleasePointerV1,
  v2ActivityLearnerCoreReleaseIndexObjectPathV1,
  v2ActivityLearnerCoreReleasePointerDocumentPathV1,
} from "./v2_activity_learner_core_release_pointer_v1";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1,
  getV2FirebaseActivityLearnerCoreReleaseSummaryV1,
  type V2FirebaseActivityLearnerCoreReleaseHandleV1,
} from "./v2_firebase_activity_learner_core_release_adapter_v1";
import {
  getV2FirebaseActivityInstancesValidatorSummaryV1,
  resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1,
  type V2FirebaseActivityInstancesValidatorResultHandleV1,
} from "./v2_firebase_activity_instances_validator_adapter_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  v2SeasonReleaseManifestDocumentId,
  v2SeasonReleasePointerDocumentId,
  v2SeasonReleasePointerId,
} from "./v2_required_session_activation";

export interface V2FirebaseActivityLearnerCoreReleasePublisherV1 {
  publish(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly validatorHandle: V2FirebaseActivityInstancesValidatorResultHandleV1;
    readonly publishedView: V2PublishedSeasonManifestView;
    readonly expectedEnvironment: V2ReleaseEnvironment;
    readonly episodeId: string;
  }): Promise<V2FirebaseActivityLearnerCoreReleaseHandleV1>;
}

function fail(): never {
  throw new Error("v2_firebase_activity_learner_core_release_publish_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function createFirebaseAdminV2ActivityLearnerCoreReleasePublisherV1(): V2FirebaseActivityLearnerCoreReleasePublisherV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const reader = createFirebaseAdminV2ActivityLearnerCoreReleaseAdapterV1();
  return Object.freeze({
    publish: async (
      input: Parameters<
        V2FirebaseActivityLearnerCoreReleasePublisherV1["publish"]
      >[0],
    ) => {
      if (
        !record(input) ||
        Object.keys(input).sort().join("|") !==
          "episodeId|expectedEnvironment|plan|publishedView|validatorHandle"
      )
        fail();
      const validator = getV2FirebaseActivityInstancesValidatorSummaryV1(
        input.validatorHandle,
      );
      if (
        validator.outcome !== "eligible_for_human_review_only" ||
        validator.episodeId !== input.episodeId ||
        validator.packageFingerprint === null ||
        validator.permitAggregateFingerprint === null ||
        validator.childReadbackAggregateFingerprint === null ||
        validator.storageReadbackFingerprint === null ||
        validator.validatedSessionCount !== 12 ||
        validator.validatedTaskCount !== 144 ||
        validator.artifactStorageAuthority !==
          "firebase_admin_generation_pinned_readback"
      )
        fail();
      const sessions = Array.from({ length: 12 }, (_, index) =>
        resolveV2FirebaseActivityInstancesPublicationSessionMaterialV1({
          handle: input.validatorHandle,
          plan: input.plan,
          sessionOrdinal: index + 1,
        }),
      );
      if (
        sessions.some(
          (session) =>
            session.stageId !== validator.stageId ||
            session.episodeId !== validator.episodeId ||
            session.packageFingerprint !== validator.packageFingerprint ||
            session.validatorSummaryFingerprint !==
              validator.summaryFingerprint ||
            session.permitAggregateFingerprint !==
              validator.permitAggregateFingerprint ||
            session.childReadbackAggregateFingerprint !==
              validator.childReadbackAggregateFingerprint ||
            session.storageReadbackFingerprint !==
              validator.storageReadbackFingerprint,
        )
      )
        fail();
      const releasePointer = input.publishedView.activePointer;
      const currentPointer = await io.readCanonicalDocumentExact({
        documentPath: `content_v2_season_release_pointers/${v2SeasonReleasePointerDocumentId(
          v2SeasonReleasePointerId(
            input.expectedEnvironment,
            releasePointer.studyTarget,
            releasePointer.learnerSourceLocale,
            releasePointer.seasonId,
          ),
        )}`,
        maximumBytes: 32 * 1024,
      });
      const currentManifestRecord = await io.readCanonicalDocumentExact({
        documentPath: `content_v2_season_release_manifests/${v2SeasonReleaseManifestDocumentId(
          releasePointer.activeReleaseId,
        )}`,
        maximumBytes: 64 * 1024,
      });
      if (
        currentPointer.canonicalRaw !== canonicalJsonV1(releasePointer) ||
        currentManifestRecord.canonicalRaw !==
          canonicalJsonV1(input.publishedView.manifestRecord)
      )
        fail();
      const index = materializeLearningV2ActivityLearnerCoreReleaseIndexV1({
        publishedView: input.publishedView,
        expectedEnvironment: input.expectedEnvironment,
        episodeId: input.episodeId,
        stageId: validator.stageId,
        activityPackageFingerprint: validator.packageFingerprint,
        validatorSummaryFingerprint: validator.summaryFingerprint,
        permitAggregateFingerprint: validator.permitAggregateFingerprint,
        childReadbackAggregateFingerprint:
          validator.childReadbackAggregateFingerprint,
        storageReadbackFingerprint: validator.storageReadbackFingerprint,
        sessions: sessions.map((session) =>
          Object.freeze({
            sessionId: session.sessionId,
            sessionOrdinal: session.sessionOrdinal,
            renderRaw: session.renderRaw,
            capsuleEnvelopeRaw: session.capsuleEnvelopeRaw,
            renderPin: session.renderPin,
            capsulePin: session.capsulePin,
          }),
        ),
      });
      const indexRaw = encodeLearningV2ActivityLearnerCoreReleaseIndexV1(index);
      const rawHash = sha256Utf8(indexRaw);
      const indexPath = v2ActivityLearnerCoreReleaseIndexObjectPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId: index.episodeId,
        indexFingerprint: index.indexFingerprint,
        rawHash,
      });
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: indexPath,
        bytes: new TextEncoder().encode(indexRaw),
        maximumBytes:
          LEARNING_V2_ACTIVITY_LEARNER_CORE_RELEASE_INDEX_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const pointer = materializeV2ActivityLearnerCoreReleasePointerV1({
        indexRaw,
        indexObjectGeneration: persisted.pin.objectGeneration,
      });
      const pointerRaw = encodeV2ActivityLearnerCoreReleasePointerV1(pointer);
      const pointerPath = v2ActivityLearnerCoreReleasePointerDocumentPathV1({
        activeManifestHash: index.activeManifestHash,
        episodeId: index.episodeId,
      });
      await io.firestore.runTransaction(async (transaction) => {
        const current = await transaction.readExact(pointerPath);
        if (current.exists) {
          if (current.raw !== pointerRaw) fail();
          return;
        }
        await transaction.createExact(pointerPath, pointerRaw);
      });
      const handle = await reader.load({
        environment: input.expectedEnvironment,
        studyTarget: releasePointer.studyTarget,
        learnerSourceLocale: releasePointer.learnerSourceLocale,
        seasonId: releasePointer.seasonId,
        episodeId: input.episodeId,
      });
      const summary = getV2FirebaseActivityLearnerCoreReleaseSummaryV1(handle);
      if (
        summary.indexFingerprint !== index.indexFingerprint ||
        summary.pointerFingerprint !== pointer.pointerFingerprint ||
        summary.activityPackageFingerprint !== validator.packageFingerprint ||
        summary.validatorSummaryFingerprint !== validator.summaryFingerprint ||
        summary.activeManifestHash !== index.activeManifestHash
      )
        fail();
      return handle;
    },
  });
}
