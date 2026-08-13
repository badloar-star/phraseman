import type {
  V2PublishedSeasonManifestView,
  V2ReleaseEnvironment,
} from "../../../modules/learning-v2/content/release_manifest";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  encodeLearningV2ActivityAuxiliaryReleaseManifestV1,
  materializeLearningV2ActivityAuxiliaryReleaseManifestV1,
  type LearningV2ActivityAuxiliaryReleaseManifestV1,
} from "../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1";
import { createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1 } from "./v2_firebase_activity_auxiliary_release_publisher_v1";
import type { V2FirebaseActivityAuxiliaryReleaseHandleV1 } from "./v2_firebase_activity_auxiliary_release_adapter_v1";
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

export const V2_FIREBASE_ACTIVITY_AUXILIARY_EPISODE_SESSION_COUNT_V1 =
  12 as const;
export const V2_FIREBASE_ACTIVITY_AUXILIARY_EPISODE_OBJECT_COUNT_V1 =
  48 as const;
export const V2_FIREBASE_ACTIVITY_AUXILIARY_CHILD_MAX_BYTES_V1 =
  4 * 1024 * 1024;

export interface V2FirebaseActivityAuxiliaryEpisodeSessionInputV1 {
  readonly learnerActionRaw: string;
  readonly postTerminalCardCapsuleRaw: string;
  readonly audioRuntimeRaw: string;
  readonly errorExplanationRaw: string;
}

export interface V2FirebaseActivityAuxiliaryEpisodePublisherV1 {
  publish(
    input: Readonly<{
      publishedView: V2PublishedSeasonManifestView;
      expectedEnvironment: V2ReleaseEnvironment;
      episodeId: string;
      stageId: string;
      activityPackageFingerprint: string;
      sessions: readonly V2FirebaseActivityAuxiliaryEpisodeSessionInputV1[];
    }>,
  ): Promise<V2FirebaseActivityAuxiliaryReleaseHandleV1>;
}

const encoder = new TextEncoder();
const SESSION_KEYS = Object.freeze([
  "learnerActionRaw",
  "postTerminalCardCapsuleRaw",
  "audioRuntimeRaw",
  "errorExplanationRaw",
] as const);

function fail(): never {
  throw new Error("v2_firebase_activity_auxiliary_episode_publish_invalid");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactSession(
  value: unknown,
): V2FirebaseActivityAuxiliaryEpisodeSessionInputV1 {
  if (!isPlainObject(value)) fail();
  const keys = Object.keys(value);
  if (
    keys.length !== SESSION_KEYS.length ||
    keys.some((key) => !SESSION_KEYS.includes(key as never)) ||
    SESSION_KEYS.some(
      (key) =>
        typeof value[key] !== "string" || (value[key] as string).length < 1,
    )
  )
    fail();
  return Object.freeze({
    learnerActionRaw: value.learnerActionRaw as string,
    postTerminalCardCapsuleRaw: value.postTerminalCardCapsuleRaw as string,
    audioRuntimeRaw: value.audioRuntimeRaw as string,
    errorExplanationRaw: value.errorExplanationRaw as string,
  });
}

function manifestInput(
  input: Readonly<{
    stageId: string;
    activityPackageFingerprint: string;
    session: V2FirebaseActivityAuxiliaryEpisodeSessionInputV1;
    generations: readonly [string, string, string, string];
  }>,
) {
  return Object.freeze({
    stageId: input.stageId,
    activityPackageFingerprint: input.activityPackageFingerprint,
    learnerActionRaw: input.session.learnerActionRaw,
    learnerActionGeneration: input.generations[0],
    postTerminalCardCapsuleRaw: input.session.postTerminalCardCapsuleRaw,
    postTerminalCardCapsuleGeneration: input.generations[1],
    audioRuntimeRaw: input.session.audioRuntimeRaw,
    audioRuntimeGeneration: input.generations[2],
    errorExplanationRaw: input.session.errorExplanationRaw,
    errorExplanationGeneration: input.generations[3],
  });
}

function orderedRaws(
  session: V2FirebaseActivityAuxiliaryEpisodeSessionInputV1,
): readonly [string, string, string, string] {
  return Object.freeze([
    session.learnerActionRaw,
    session.postTerminalCardCapsuleRaw,
    session.audioRuntimeRaw,
    session.errorExplanationRaw,
  ] as const);
}

function exactGenerations(
  value: readonly string[],
): readonly [string, string, string, string] {
  if (value.length !== 4) fail();
  return Object.freeze([value[0]!, value[1]!, value[2]!, value[3]!] as const);
}

export function createFirebaseAdminV2ActivityAuxiliaryEpisodePublisherV1(): V2FirebaseActivityAuxiliaryEpisodePublisherV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  const rootPublisher =
    createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1();
  return Object.freeze({
    publish: async (
      input: Parameters<
        V2FirebaseActivityAuxiliaryEpisodePublisherV1["publish"]
      >[0],
    ) => {
      if (
        !isPlainObject(input) ||
        Object.keys(input).sort().join("|") !==
          "activityPackageFingerprint|episodeId|expectedEnvironment|publishedView|sessions|stageId" ||
        !Array.isArray(input.sessions) ||
        input.sessions.length !==
          V2_FIREBASE_ACTIVITY_AUXILIARY_EPISODE_SESSION_COUNT_V1
      )
        fail();
      const sessions = input.sessions.map(exactSession);
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
      const provisionalManifests = sessions.map((session, sessionIndex) => {
        let provisional: LearningV2ActivityAuxiliaryReleaseManifestV1;
        try {
          provisional = materializeLearningV2ActivityAuxiliaryReleaseManifestV1(
            manifestInput({
              stageId: input.stageId,
              activityPackageFingerprint: input.activityPackageFingerprint,
              session,
              generations: ["1", "1", "1", "1"],
            }),
          );
        } catch {
          fail();
        }
        if (
          provisional.episodeId !== input.episodeId ||
          provisional.sessionOrdinal !== sessionIndex + 1 ||
          provisional.objects.length !== 4
        )
          fail();
        return provisional;
      });
      const manifestRaws: string[] = [];
      for (
        let sessionIndex = 0;
        sessionIndex < sessions.length;
        sessionIndex += 1
      ) {
        const session = sessions[sessionIndex]!;
        const provisional = provisionalManifests[sessionIndex]!;
        const raws = orderedRaws(session);
        const generations: string[] = [];
        for (let objectIndex = 0; objectIndex < 4; objectIndex += 1) {
          const pin = provisional.objects[objectIndex]!;
          const raw = raws[objectIndex]!;
          const persisted = await persistV2ImmutableRepositoryObjectV1({
            storage: io.storage,
            objectPath: pin.objectPath,
            bytes: encoder.encode(raw),
            maximumBytes: V2_FIREBASE_ACTIVITY_AUXILIARY_CHILD_MAX_BYTES_V1,
            contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
            contentHash: pin.contentHash,
          });
          generations.push(persisted.pin.objectGeneration);
        }
        let finalManifest: LearningV2ActivityAuxiliaryReleaseManifestV1;
        try {
          finalManifest =
            materializeLearningV2ActivityAuxiliaryReleaseManifestV1(
              manifestInput({
                stageId: input.stageId,
                activityPackageFingerprint: input.activityPackageFingerprint,
                session,
                generations: exactGenerations(generations),
              }),
            );
        } catch {
          fail();
        }
        manifestRaws.push(
          encodeLearningV2ActivityAuxiliaryReleaseManifestV1(finalManifest),
        );
      }
      return rootPublisher.publish({
        publishedView: input.publishedView,
        expectedEnvironment: input.expectedEnvironment,
        episodeId: input.episodeId,
        stageId: input.stageId,
        activityPackageFingerprint: input.activityPackageFingerprint,
        sessionManifestRaws: Object.freeze(manifestRaws),
      });
    },
  });
}
