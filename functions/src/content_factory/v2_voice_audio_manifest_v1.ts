import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  resolveV2FirebaseVoiceAudioBatchMaterialV1,
  type V2FirebaseVoiceAudioBatchHandleV1,
  type V2FirebaseVoiceAudioObjectV1,
} from "./v2_firebase_voice_audio_persistence_v1";
import {
  resolveV2VoiceTtsWorkOrderMaterialV1,
  type V2VoiceTtsWorkOrderHandleV1,
} from "./v2_voice_tts_work_order_v1";

export const V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1 =
  "v2-voice-audio-manifest.v1" as const;
export const V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1 =
  "v2-voice-audio-session-manifest.v1" as const;
export const V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1 = 4 * 1024 * 1024;
export const V2_VOICE_AUDIO_SESSION_MANIFEST_MAX_BYTES_V1 = 2 * 1024 * 1024;

export interface V2VoiceAudioManifestEntryV1 {
  readonly generationTargetFingerprint: string;
  readonly itemFingerprint: string;
  readonly taskId: string;
  readonly taskVoiceGroupFingerprint: string;
  readonly audioTargetId: string;
  readonly inputKind: "full_utterance" | "word";
  readonly wordId: string | null;
  readonly wordOrdinal: number | null;
  readonly voiceId: "ash" | "onyx" | "nova" | "coral";
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "audio/mpeg";
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
  readonly entryFingerprint: string;
}

export interface V2VoiceAudioSessionManifestV1 {
  readonly schemaVersion: typeof V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1;
  readonly sessionOrdinal: number;
  readonly sessionId: string;
  readonly itemCount: number;
  readonly totalBytes: number;
  readonly entries: readonly V2VoiceAudioManifestEntryV1[];
  readonly storageEvidence: "unverified_serialized_pins";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly sessionManifestFingerprint: string;
}

export interface V2VoiceAudioManifestV1 {
  readonly schemaVersion: typeof V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly packageFingerprint: string;
  readonly workOrderFingerprint: string;
  readonly profileObservationAggregateFingerprint: string;
  readonly sessionCount: 12;
  readonly generationTargetCount: number;
  readonly audioObjectCount: number;
  readonly totalAudioBytes: number;
  readonly sessionManifests: readonly V2VoiceAudioSessionManifestV1[];
  readonly orderedSessionAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "none";
  readonly artifactStorageAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly manifestFingerprint: string;
}

const manifestHandles = new WeakSet<object>();

function fail(code: string): never {
  throw new Error(code);
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function materializeV2VoiceAudioManifestV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly workOrderHandle: V2VoiceTtsWorkOrderHandleV1;
  readonly batchHandles: readonly V2FirebaseVoiceAudioBatchHandleV1[];
}): V2VoiceAudioManifestV1 {
  const work = resolveV2VoiceTtsWorkOrderMaterialV1({
    handle: input.workOrderHandle,
    plan: input.plan,
    stageId: input.stageId,
  });
  if (
    !Array.isArray(input.batchHandles) ||
    input.batchHandles.length < 1 ||
    input.batchHandles.length > Math.ceil(work.items.length / 32)
  )
    fail("v2_voice_audio_manifest_batch_count_invalid");
  const objectByTarget = new Map<string, V2FirebaseVoiceAudioObjectV1>();
  const coveredIndexes = new Set<number>();
  for (const handle of input.batchHandles) {
    const batch = resolveV2FirebaseVoiceAudioBatchMaterialV1({
      handle,
      plan: input.plan,
      stageId: input.stageId,
    });
    if (
      batch.summary.workOrderFingerprint !==
        work.summary.workOrderFingerprint ||
      batch.summary.totalWorkItemCount !== work.items.length ||
      batch.objects.length !== batch.summary.batchItemCount
    )
      fail("v2_voice_audio_manifest_batch_binding_invalid");
    for (let offset = 0; offset < batch.summary.batchItemCount; offset += 1) {
      const index = batch.summary.batchStartIndex + offset;
      const expected = work.items[index];
      const observed = batch.objects[offset];
      if (
        !expected ||
        !observed ||
        coveredIndexes.has(index) ||
        observed.generationTargetFingerprint !==
          expected.generationTargetFingerprint ||
        observed.itemFingerprint !== expected.itemFingerprint ||
        observed.voiceId !== expected.voiceId ||
        observed.inputKind !== expected.inputKind ||
        observed.wordOrdinal !== expected.wordOrdinal ||
        !/^[a-f0-9]{64}$/u.test(observed.codecRulesFingerprint) ||
        !/^[a-f0-9]{64}$/u.test(observed.codecResultFingerprint) ||
        observed.pin.contentType !== "audio/mpeg"
      )
        fail("v2_voice_audio_manifest_batch_coverage_invalid");
      coveredIndexes.add(index);
      if (objectByTarget.has(observed.generationTargetFingerprint))
        fail("v2_voice_audio_manifest_target_duplicate");
      objectByTarget.set(observed.generationTargetFingerprint, observed);
    }
  }
  if (
    coveredIndexes.size !== work.items.length ||
    objectByTarget.size !== work.items.length
  )
    fail("v2_voice_audio_manifest_incomplete");
  const sessionBodies = work.packageValue.sessionShards.map((session) => {
    const entries = work.items
      .filter((item) => item.sessionOrdinal === session.sessionOrdinal)
      .map((item) => {
        const object = objectByTarget.get(item.generationTargetFingerprint);
        if (!object) fail("v2_voice_audio_manifest_incomplete");
        const entryBody = {
          generationTargetFingerprint: item.generationTargetFingerprint,
          itemFingerprint: item.itemFingerprint,
          taskId: item.taskId,
          taskVoiceGroupFingerprint: item.taskVoiceGroupFingerprint,
          audioTargetId: item.audioTargetId,
          inputKind: item.inputKind,
          wordId: item.wordId,
          wordOrdinal: item.wordOrdinal,
          voiceId: item.voiceId,
          objectPath: object.pin.objectPath,
          contentHash: object.pin.contentHash,
          objectGeneration: object.pin.objectGeneration,
          byteSize: object.pin.byteSize,
          contentType: "audio/mpeg" as const,
          codecRulesFingerprint: object.codecRulesFingerprint,
          codecResultFingerprint: object.codecResultFingerprint,
        };
        return Object.freeze({
          ...entryBody,
          entryFingerprint: hashCanonicalBody(entryBody),
        });
      })
      .sort((left, right) =>
        codePointCompare(
          left.generationTargetFingerprint,
          right.generationTargetFingerprint,
        ),
      );
    const body = {
      schemaVersion: V2_VOICE_AUDIO_SESSION_MANIFEST_SCHEMA_V1,
      sessionOrdinal: session.sessionOrdinal,
      sessionId: session.sessionId,
      itemCount: entries.length,
      totalBytes: entries.reduce((sum, entry) => sum + entry.byteSize, 0),
      entries: Object.freeze(entries),
      storageEvidence: "unverified_serialized_pins" as const,
      listeningEvidenceAuthority: "none" as const,
      deviceEvidenceAuthority: "none" as const,
    };
    const value = Object.freeze({
      ...body,
      sessionManifestFingerprint: hashCanonicalBody(body),
    });
    if (
      value.itemCount < 1 ||
      utf8ByteLengthV1(canonicalJsonV1(value)) >
        V2_VOICE_AUDIO_SESSION_MANIFEST_MAX_BYTES_V1
    )
      fail("v2_voice_audio_session_manifest_invalid");
    return value;
  });
  if (sessionBodies.length !== 12)
    fail("v2_voice_audio_manifest_session_count_invalid");
  const body = {
    schemaVersion: V2_VOICE_AUDIO_MANIFEST_SCHEMA_V1,
    planFingerprint: work.summary.planFingerprint,
    stageId: work.summary.stageId,
    episodeId: work.summary.episodeId,
    candidateFingerprint: work.summary.candidateFingerprint,
    packageFingerprint: work.summary.packageFingerprint,
    workOrderFingerprint: work.summary.workOrderFingerprint,
    profileObservationAggregateFingerprint:
      work.summary.profileObservationAggregateFingerprint,
    sessionCount: 12 as const,
    generationTargetCount: work.items.length,
    audioObjectCount: objectByTarget.size,
    totalAudioBytes: sessionBodies.reduce(
      (sum, session) => sum + session.totalBytes,
      0,
    ),
    sessionManifests: Object.freeze(sessionBodies),
    orderedSessionAggregateFingerprint: hashCanonicalBody(
      sessionBodies.map((session) => session.sessionManifestFingerprint),
    ),
    repositoryOriginAuthority: "none" as const,
    profileLifecycleAuthority: "none" as const,
    providerExecutionAuthority: "none" as const,
    audioByteAuthority: "none" as const,
    artifactStorageAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const manifest = Object.freeze({
    ...body,
    manifestFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(manifest)) >
    V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1
  )
    fail("v2_voice_audio_manifest_too_large");
  manifestHandles.add(manifest);
  return manifest;
}

export function isV2VoiceAudioManifestV1(
  value: unknown,
): value is V2VoiceAudioManifestV1 {
  return (
    typeof value === "object" && value !== null && manifestHandles.has(value)
  );
}
