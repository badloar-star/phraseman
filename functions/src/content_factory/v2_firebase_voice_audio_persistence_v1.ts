import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  getV2OpenAiVoiceTtsExecutionSummaryV1,
  resolveV2OpenAiVoiceTtsExecutionMaterialV1,
  type V2OpenAiVoiceTtsExecutionHandleV1,
} from "./v2_openai_voice_tts_provider_v1";
import { validateV2VoiceMp3CodecV1 } from "./v2_voice_mp3_codec_v1";

export const V2_FIREBASE_VOICE_AUDIO_BATCH_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-audio-batch-summary.v1" as const;
export const V2_FIREBASE_VOICE_AUDIO_STORAGE_NAMESPACE_V1 = Object.freeze({
  schemaVersion: "v2-firebase-voice-audio-storage-namespace.v1" as const,
  parentRepositoryNamespace: "learning-v2" as const,
  audioPrefix: "learning-v2/voice-audio" as const,
  pathIdentity:
    "plan_stage_generation_target_raw_hash_content_addressed" as const,
  contentType: "audio/mpeg" as const,
  namespaceAuthority: "code_owned_exact_namespace" as const,
});
export const V2_FIREBASE_VOICE_AUDIO_STORAGE_NAMESPACE_FINGERPRINT_V1 =
  hashCanonicalBody(V2_FIREBASE_VOICE_AUDIO_STORAGE_NAMESPACE_V1);

export interface V2FirebaseVoiceAudioBatchSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_AUDIO_BATCH_SUMMARY_SCHEMA_V1;
  readonly namespaceFingerprint: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly workOrderFingerprint: string;
  readonly providerResultFingerprint: string;
  readonly totalWorkItemCount: number;
  readonly batchStartIndex: number;
  readonly batchItemCount: number;
  readonly audioObjectCount: number;
  readonly audioByteSize: number;
  readonly orderedPinAggregateFingerprint: string;
  readonly providerExecutionAuthority: "provider_response_observed_in_process";
  readonly audioByteAuthority: "firebase_admin_generation_pinned_exact_readback";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceAudioBatchHandleV1 {
  readonly __opaqueV2FirebaseVoiceAudioBatchHandleV1: unique symbol;
}

export interface V2FirebaseVoiceAudioBatchMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly summary: V2FirebaseVoiceAudioBatchSummaryV1;
  readonly pins: readonly V2RepositoryImmutableObjectPinV1[];
  readonly objects: readonly V2FirebaseVoiceAudioObjectV1[];
}

export interface V2FirebaseVoiceAudioObjectV1 {
  readonly generationTargetFingerprint: string;
  readonly itemFingerprint: string;
  readonly voiceId: "ash" | "onyx" | "nova" | "coral";
  readonly inputKind: "full_utterance" | "word";
  readonly wordOrdinal: number | null;
  readonly codecRulesFingerprint: string;
  readonly codecResultFingerprint: string;
  readonly pin: V2RepositoryImmutableObjectPinV1;
  readonly objectFingerprint: string;
}

export interface V2FirebaseVoiceAudioPersistenceV1 {
  persistGeneratedBatch(input: {
    readonly executionHandle: V2OpenAiVoiceTtsExecutionHandleV1;
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
  }): Promise<V2FirebaseVoiceAudioBatchHandleV1>;
}

const HASH_RE = /^[a-f0-9]{64}$/;
const ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const handles = new WeakSet<object>();
const metadata = new WeakMap<object, V2FirebaseVoiceAudioBatchMaterialV1>();

function fail(code: string): never {
  throw new Error(code);
}

export function v2FirebaseVoiceAudioObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly generationTargetFingerprint: string;
  readonly rawSha256: string;
}): string {
  if (
    !HASH_RE.test(input.planFingerprint) ||
    !ID_RE.test(input.stageId) ||
    !HASH_RE.test(input.generationTargetFingerprint) ||
    !HASH_RE.test(input.rawSha256)
  )
    fail("v2_firebase_voice_audio_path_invalid");
  return `${V2_FIREBASE_VOICE_AUDIO_STORAGE_NAMESPACE_V1.audioPrefix}/${input.planFingerprint}/${hashCanonicalBody({ stageId: input.stageId })}/${input.generationTargetFingerprint}/${input.rawSha256}.mp3`;
}

export function createFirebaseAdminV2VoiceAudioPersistenceV1(): V2FirebaseVoiceAudioPersistenceV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    persistGeneratedBatch: async (input: {
      readonly executionHandle: V2OpenAiVoiceTtsExecutionHandleV1;
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly stageId: string;
    }) => {
      const providerSummary = getV2OpenAiVoiceTtsExecutionSummaryV1(
        input.executionHandle,
      );
      const providerMaterial = resolveV2OpenAiVoiceTtsExecutionMaterialV1({
        handle: input.executionHandle,
        plan: input.plan,
        stageId: input.stageId,
      });
      if (
        providerSummary.generatedItemCount !==
          providerMaterial.generated.length ||
        providerSummary.batchItemCount !== providerMaterial.generated.length ||
        providerMaterial.generated.length < 1
      )
        fail("v2_firebase_voice_audio_provider_result_invalid");
      const pins: V2RepositoryImmutableObjectPinV1[] = [];
      const objects: V2FirebaseVoiceAudioObjectV1[] = [];
      for (const generated of providerMaterial.generated) {
        const codec = validateV2VoiceMp3CodecV1(generated.bytes);
        if (
          generated.codecRulesFingerprint !== codec.rulesFingerprint ||
          generated.codecResultFingerprint !== codec.resultFingerprint
        )
          fail("v2_firebase_voice_audio_codec_evidence_mismatch");
        const persisted = await persistV2ImmutableRepositoryObjectV1({
          storage: io.storage,
          objectPath: v2FirebaseVoiceAudioObjectPathV1({
            planFingerprint: input.plan.planFingerprint,
            stageId: input.stageId,
            generationTargetFingerprint: generated.generationTargetFingerprint,
            rawSha256: generated.rawSha256,
          }),
          bytes: generated.bytes,
          maximumBytes: generated.byteSize,
          contentType: V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1,
          contentHash: generated.rawSha256,
        });
        if (
          persisted.pin.contentHash !== generated.rawSha256 ||
          persisted.pin.byteSize !== generated.byteSize ||
          persisted.pin.contentType !==
            V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1
        )
          fail("v2_firebase_voice_audio_readback_mismatch");
        pins.push(persisted.pin);
        const objectBody = {
          generationTargetFingerprint: generated.generationTargetFingerprint,
          itemFingerprint: generated.itemFingerprint,
          voiceId: generated.voiceId,
          inputKind: generated.inputKind,
          wordOrdinal: generated.wordOrdinal,
          codecRulesFingerprint: codec.rulesFingerprint,
          codecResultFingerprint: codec.resultFingerprint,
          pin: persisted.pin,
        };
        objects.push(
          Object.freeze({
            ...objectBody,
            objectFingerprint: hashCanonicalBody(objectBody),
          }),
        );
      }
      const audioByteSize = pins.reduce((sum, pin) => sum + pin.byteSize, 0);
      const orderedPinAggregateFingerprint = hashCanonicalBody(
        pins.map((pin) => pin),
      );
      const body = {
        schemaVersion: V2_FIREBASE_VOICE_AUDIO_BATCH_SUMMARY_SCHEMA_V1,
        namespaceFingerprint:
          V2_FIREBASE_VOICE_AUDIO_STORAGE_NAMESPACE_FINGERPRINT_V1,
        planFingerprint: input.plan.planFingerprint,
        stageId: input.stageId,
        workOrderFingerprint: providerSummary.workOrderFingerprint,
        providerResultFingerprint: providerSummary.resultFingerprint,
        totalWorkItemCount: providerSummary.totalWorkItemCount,
        batchStartIndex: providerSummary.batchStartIndex,
        batchItemCount: providerSummary.batchItemCount,
        audioObjectCount: pins.length,
        audioByteSize,
        orderedPinAggregateFingerprint,
        providerExecutionAuthority:
          "provider_response_observed_in_process" as const,
        audioByteAuthority:
          "firebase_admin_generation_pinned_exact_readback" as const,
        artifactStorageAuthority:
          "firebase_admin_generation_pinned_readback" as const,
        listeningEvidenceAuthority: "none" as const,
        deviceEvidenceAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeConsumer: false as const,
        releaseEligible: false as const,
        releaseAuthority: false as const,
      };
      const summary = Object.freeze({
        ...body,
        summaryFingerprint: hashCanonicalBody(body),
      });
      const handle = Object.freeze({}) as V2FirebaseVoiceAudioBatchHandleV1;
      handles.add(handle);
      metadata.set(
        handle,
        Object.freeze({
          plan: input.plan,
          stageId: input.stageId,
          summary,
          pins: Object.freeze(pins),
          objects: Object.freeze(objects),
        }),
      );
      return handle;
    },
  });
}

export function isV2FirebaseVoiceAudioBatchHandleV1(
  value: unknown,
): value is V2FirebaseVoiceAudioBatchHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceAudioBatchSummaryV1(
  handle: V2FirebaseVoiceAudioBatchHandleV1,
): V2FirebaseVoiceAudioBatchSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_firebase_voice_audio_batch_handle_invalid");
  return value.summary;
}

export function resolveV2FirebaseVoiceAudioBatchMaterialV1(input: {
  readonly handle: V2FirebaseVoiceAudioBatchHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseVoiceAudioBatchMaterialV1 {
  const value = metadata.get(input.handle);
  if (!value || value.plan !== input.plan || value.stageId !== input.stageId)
    fail("v2_firebase_voice_audio_batch_handle_invalid");
  return value;
}
