import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2ActivityAudioRuntimeProjectionV1,
  type LearningV2ActivityAudioRuntimeProjectionV1,
} from "../../../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import {
  isV2ActivityAudioTargetCatalogV1,
  type V2ActivityAudioTargetCatalogV1,
} from "./v2_activity_audio_target_catalog_v1";
import {
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";
import {
  isV2VoiceTargetsPackageV2,
  type V2VoiceTargetsPackageV2,
} from "./v2_voice_targets_package_v2";

export const V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_PROJECTOR_SCHEMA_V1 =
  "v2-activity-audio-runtime-projection-projector.v1" as const;

function fail(): never {
  throw new Error("v2_activity_audio_runtime_projection_projector_invalid");
}

export function projectV2ActivityAudioRuntimeSessionV1(
  input: Readonly<{
    manifest: V2VoiceAudioManifestV1;
    catalog: V2ActivityAudioTargetCatalogV1;
    voiceTargetsPackage: V2VoiceTargetsPackageV2;
    sessionOrdinal: number;
  }>,
): LearningV2ActivityAudioRuntimeProjectionV1 {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype ||
    Object.keys(input).sort().join("|") !==
      "catalog|manifest|sessionOrdinal|voiceTargetsPackage" ||
    !isV2VoiceAudioManifestV1(input.manifest) ||
    !isV2ActivityAudioTargetCatalogV1(input.catalog) ||
    !isV2VoiceTargetsPackageV2(input.voiceTargetsPackage) ||
    !Number.isSafeInteger(input.sessionOrdinal) ||
    input.sessionOrdinal < 1 ||
    input.sessionOrdinal > 12
  )
    fail();
  const session = input.manifest.sessionManifests[input.sessionOrdinal - 1];
  const catalogSession = input.catalog.sessions[input.sessionOrdinal - 1];
  const voiceSession =
    input.voiceTargetsPackage.sessionShards[input.sessionOrdinal - 1];
  if (
    !session ||
    !catalogSession ||
    !voiceSession ||
    session.sessionOrdinal !== input.sessionOrdinal ||
    catalogSession.sessionOrdinal !== input.sessionOrdinal ||
    voiceSession.sessionOrdinal !== input.sessionOrdinal ||
    session.sessionId !== catalogSession.sessionId ||
    session.sessionId !== voiceSession.sessionId ||
    session.entries.length !== session.itemCount ||
    input.manifest.packageFingerprint !==
      input.voiceTargetsPackage.root.artifactFingerprint ||
    input.voiceTargetsPackage.root.activityAudioCatalogFingerprint !==
      input.catalog.catalogFingerprint
  )
    fail();
  const voiceTargetById = new Map(
    voiceSession.targets.map((target) => [target.audioTargetId, target]),
  );
  const selectableBindings = catalogSession.targets.flatMap((target) => {
    const voiceTarget = voiceTargetById.get(target.audioTargetId);
    if (
      !voiceTarget ||
      voiceTarget.taskId !== target.taskId ||
      voiceTarget.taskVoiceGroupFingerprint !==
        target.taskVoiceGroupFingerprint ||
      voiceTarget.wordCount !== target.wordCount
    )
      fail();
    if (target.sourceRef.kind !== "phrase_builder_response_option") return [];
    const selectableId = target.sourceRef.responseId;
    return target.words.map((word) => {
      if (
        voiceTarget.variants.length !== 4 ||
        voiceTarget.variants.some((variant) => {
          const voiceWord = variant.words[word.wordOrdinal - 1];
          return (
            !voiceWord ||
            voiceWord.wordId !== word.wordId ||
            voiceWord.wordOrdinal !== word.wordOrdinal
          );
        })
      )
        fail();
      const body = {
        taskId: target.taskId,
        taskVoiceGroupFingerprint: target.taskVoiceGroupFingerprint,
        selectableId,
        audioTargetId: target.audioTargetId,
        wordId: word.wordId,
        wordOrdinal: word.wordOrdinal,
      };
      return Object.freeze({
        ...body,
        bindingFingerprint: hashCanonicalBody(body),
      });
    });
  });
  return materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: input.manifest.episodeId,
    sessionId: session.sessionId,
    sessionOrdinal: session.sessionOrdinal,
    voiceAudioManifestFingerprint: input.manifest.manifestFingerprint,
    sourceSessionManifestFingerprint: session.sessionManifestFingerprint,
    activityAudioCatalogFingerprint: input.catalog.catalogFingerprint,
    voiceTargetsPackageFingerprint:
      input.voiceTargetsPackage.root.artifactFingerprint,
    entries: session.entries,
    selectableBindings,
  });
}
