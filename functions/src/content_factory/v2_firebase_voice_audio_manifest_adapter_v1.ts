import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryImmutableObjectPinV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  resolveV2FirebaseVoiceAudioBatchMaterialV1,
  type V2FirebaseVoiceAudioBatchHandleV1,
} from "./v2_firebase_voice_audio_persistence_v1";
import {
  V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1,
  isV2VoiceAudioManifestV1,
  type V2VoiceAudioManifestV1,
} from "./v2_voice_audio_manifest_v1";

export const V2_FIREBASE_VOICE_AUDIO_MANIFEST_SUMMARY_SCHEMA_V1 =
  "v2-firebase-voice-audio-manifest-summary.v1" as const;
export const V2_FIREBASE_VOICE_AUDIO_MANIFEST_PREFIX_V1 =
  "learning-v2/voice-audio-manifests" as const;

export interface V2FirebaseVoiceAudioManifestSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_VOICE_AUDIO_MANIFEST_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly candidateFingerprint: string;
  readonly packageFingerprint: string;
  readonly workOrderFingerprint: string;
  readonly manifestFingerprint: string;
  readonly manifestPin: V2RepositoryImmutableObjectPinV1;
  readonly sessionCount: 12;
  readonly audioObjectCount: number;
  readonly totalAudioBytes: number;
  readonly orderedAudioReadbackAggregateFingerprint: string;
  readonly repositoryOriginAuthority: "none";
  readonly profileLifecycleAuthority: "none";
  readonly providerExecutionAuthority: "none";
  readonly audioByteAuthority: "firebase_admin_generation_pinned_batch_readbacks_bound_to_manifest_same_process";
  readonly artifactStorageAuthority: "firebase_admin_generation_pinned_readback";
  readonly listeningEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseVoiceAudioManifestHandleV1 {
  readonly __opaqueV2FirebaseVoiceAudioManifestHandleV1: unique symbol;
}

export interface V2FirebaseVoiceAudioManifestMaterialV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly manifest: V2VoiceAudioManifestV1;
  readonly summary: V2FirebaseVoiceAudioManifestSummaryV1;
}

export interface V2FirebaseVoiceAudioManifestAdapterV1 {
  commitAndColdReadManifest(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly batchHandles: readonly V2FirebaseVoiceAudioBatchHandleV1[];
  }): Promise<V2FirebaseVoiceAudioManifestHandleV1>;
}

const handles = new WeakSet<object>();
const metadata = new WeakMap<object, V2FirebaseVoiceAudioManifestMaterialV1>();
const encoder = new TextEncoder();

function fail(code: string): never {
  throw new Error(code);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function v2FirebaseVoiceAudioManifestObjectPathV1(input: {
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly manifestFingerprint: string;
  readonly rawHash: string;
}): string {
  if (
    !/^[a-f0-9]{64}$/u.test(input.planFingerprint) ||
    !/^[A-Za-z0-9._:-]{1,160}$/u.test(input.stageId) ||
    !/^[a-f0-9]{64}$/u.test(input.manifestFingerprint) ||
    !/^[a-f0-9]{64}$/u.test(input.rawHash)
  )
    fail("v2_firebase_voice_audio_manifest_path_invalid");
  return `${V2_FIREBASE_VOICE_AUDIO_MANIFEST_PREFIX_V1}/${input.planFingerprint}/${hashCanonicalBody({ stageId: input.stageId })}/${input.manifestFingerprint}/${input.rawHash}.json`;
}

export function createFirebaseAdminV2VoiceAudioManifestAdapterV1(): V2FirebaseVoiceAudioManifestAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    commitAndColdReadManifest: async (input: {
      readonly plan: V2CanonicalSeasonPlanV2;
      readonly stageId: string;
      readonly manifest: V2VoiceAudioManifestV1;
      readonly batchHandles: readonly V2FirebaseVoiceAudioBatchHandleV1[];
    }) => {
      if (
        !isV2CanonicalSeasonPlanV2(input.plan) ||
        !isV2VoiceAudioManifestV1(input.manifest) ||
        input.manifest.planFingerprint !== input.plan.planFingerprint ||
        input.manifest.stageId !== input.stageId ||
        !Array.isArray(input.batchHandles) ||
        input.batchHandles.length < 1 ||
        input.batchHandles.length >
          Math.ceil(input.manifest.audioObjectCount / 32)
      )
        fail("v2_firebase_voice_audio_manifest_input_invalid");
      const raw = canonicalJsonV1(input.manifest);
      const rawHash = sha256Utf8(raw);
      const persisted = await persistV2ImmutableRepositoryObjectV1({
        storage: io.storage,
        objectPath: v2FirebaseVoiceAudioManifestObjectPathV1({
          planFingerprint: input.plan.planFingerprint,
          stageId: input.stageId,
          manifestFingerprint: input.manifest.manifestFingerprint,
          rawHash,
        }),
        bytes: encoder.encode(raw),
        maximumBytes: V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: rawHash,
      });
      const manifestMetadata = await io.storage.readMetadataExact(
        persisted.pin.objectPath,
      );
      const manifestDownload = await io.storage.downloadGenerationExact({
        objectPath: persisted.pin.objectPath,
        ifGenerationMatch: persisted.pin.objectGeneration,
        maximumBytes: V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1,
      });
      if (
        manifestMetadata === null ||
        manifestMetadata.generation !== persisted.pin.objectGeneration ||
        manifestMetadata.contentHash !== rawHash ||
        manifestMetadata.byteSize !== encoder.encode(raw).byteLength ||
        manifestMetadata.contentType !==
          V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1 ||
        manifestDownload.kind !== "downloaded" ||
        sha256Bytes(manifestDownload.bytes) !== rawHash ||
        new TextDecoder("utf-8", { fatal: true }).decode(
          manifestDownload.bytes,
        ) !== raw
      )
        fail("v2_firebase_voice_audio_manifest_cold_readback_invalid");
      const batchObjects = new Map<
        string,
        ReturnType<
          typeof resolveV2FirebaseVoiceAudioBatchMaterialV1
        >["objects"][number]
      >();
      for (const handle of input.batchHandles) {
        const batch = resolveV2FirebaseVoiceAudioBatchMaterialV1({
          handle,
          plan: input.plan,
          stageId: input.stageId,
        });
        if (
          batch.summary.workOrderFingerprint !==
            input.manifest.workOrderFingerprint ||
          batch.objects.length !== batch.summary.audioObjectCount
        )
          fail("v2_firebase_voice_audio_batch_binding_invalid");
        for (const object of batch.objects) {
          if (batchObjects.has(object.generationTargetFingerprint))
            fail("v2_firebase_voice_audio_batch_duplicate");
          batchObjects.set(object.generationTargetFingerprint, object);
        }
      }
      const readbackRows = [];
      for (const session of input.manifest.sessionManifests) {
        for (const entry of session.entries) {
          const object = batchObjects.get(entry.generationTargetFingerprint);
          if (
            !object ||
            object.itemFingerprint !== entry.itemFingerprint ||
            object.voiceId !== entry.voiceId ||
            object.inputKind !== entry.inputKind ||
            object.wordOrdinal !== entry.wordOrdinal ||
            object.codecRulesFingerprint !== entry.codecRulesFingerprint ||
            object.codecResultFingerprint !== entry.codecResultFingerprint ||
            object.pin.objectPath !== entry.objectPath ||
            object.pin.objectGeneration !== entry.objectGeneration ||
            object.pin.contentHash !== entry.contentHash ||
            object.pin.byteSize !== entry.byteSize ||
            object.pin.contentType !== "audio/mpeg"
          )
            fail("v2_firebase_voice_audio_batch_manifest_mismatch");
          readbackRows.push(
            Object.freeze({
              generationTargetFingerprint: entry.generationTargetFingerprint,
              contentHash: entry.contentHash,
              objectGeneration: entry.objectGeneration,
              byteSize: entry.byteSize,
              codecRulesFingerprint: entry.codecRulesFingerprint,
              codecResultFingerprint: entry.codecResultFingerprint,
            }),
          );
        }
      }
      if (
        readbackRows.length !== input.manifest.audioObjectCount ||
        batchObjects.size !== input.manifest.audioObjectCount
      )
        fail("v2_firebase_voice_audio_object_count_invalid");
      const summaryBody = {
        schemaVersion: V2_FIREBASE_VOICE_AUDIO_MANIFEST_SUMMARY_SCHEMA_V1,
        planFingerprint: input.manifest.planFingerprint,
        stageId: input.manifest.stageId,
        episodeId: input.manifest.episodeId,
        candidateFingerprint: input.manifest.candidateFingerprint,
        packageFingerprint: input.manifest.packageFingerprint,
        workOrderFingerprint: input.manifest.workOrderFingerprint,
        manifestFingerprint: input.manifest.manifestFingerprint,
        manifestPin: persisted.pin,
        sessionCount: 12 as const,
        audioObjectCount: input.manifest.audioObjectCount,
        totalAudioBytes: input.manifest.totalAudioBytes,
        orderedAudioReadbackAggregateFingerprint:
          hashCanonicalBody(readbackRows),
        repositoryOriginAuthority: "none" as const,
        profileLifecycleAuthority: "none" as const,
        providerExecutionAuthority: "none" as const,
        audioByteAuthority:
          "firebase_admin_generation_pinned_batch_readbacks_bound_to_manifest_same_process" as const,
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
        ...summaryBody,
        summaryFingerprint: hashCanonicalBody(summaryBody),
      });
      const handle = Object.freeze({}) as V2FirebaseVoiceAudioManifestHandleV1;
      handles.add(handle);
      metadata.set(
        handle,
        Object.freeze({ plan: input.plan, manifest: input.manifest, summary }),
      );
      return handle;
    },
  });
}

export function isV2FirebaseVoiceAudioManifestHandleV1(
  value: unknown,
): value is V2FirebaseVoiceAudioManifestHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseVoiceAudioManifestSummaryV1(
  handle: V2FirebaseVoiceAudioManifestHandleV1,
): V2FirebaseVoiceAudioManifestSummaryV1 {
  const value = metadata.get(handle);
  if (!value) fail("v2_firebase_voice_audio_manifest_handle_invalid");
  return value.summary;
}

export function resolveV2FirebaseVoiceAudioManifestMaterialV1(input: {
  readonly handle: V2FirebaseVoiceAudioManifestHandleV1;
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
}): V2FirebaseVoiceAudioManifestMaterialV1 {
  const value = metadata.get(input.handle);
  if (
    !value ||
    value.plan !== input.plan ||
    value.summary.stageId !== input.stageId
  )
    fail("v2_firebase_voice_audio_manifest_handle_invalid");
  return value;
}
