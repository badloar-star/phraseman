import * as admin from "firebase-admin";

import {
  LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MAX_TTL_MS_V1,
  LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MIN_TTL_MS_V1,
  materializeLearningV2VoiceAudioDevicePageV1,
  type LearningV2VoiceAudioDevicePageV1,
} from "../../../modules/learning-v2/runtime/voice_audio_device_page_v1";
import { type V2CanonicalSeasonPlanV2 } from "./v2_canonical_generation_plan_v2";
import {
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1,
  type V2FirebaseVoiceAudioEpisodeReceiptHandleV1,
} from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";
import {
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1,
  validateV2FirebaseRepositoryTrustRootV1,
} from "./v2_firebase_repository_trust_root_v1";
import { type V2VoiceAudioManifestV1 } from "./v2_voice_audio_manifest_v1";

export const V2_FIREBASE_VOICE_AUDIO_DEVICE_PAGE_ADAPTER_SCHEMA_V1 =
  "v2-firebase-voice-audio-device-page-adapter.v1" as const;
export const V2_FIREBASE_VOICE_AUDIO_DEVICE_PAGE_SIGNED_URL_TTL_MS_V1 =
  5 * 60_000;

export interface V2FirebaseVoiceAudioDevicePageAdapterV1 {
  projectDevicePage(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
    readonly manifest: V2VoiceAudioManifestV1;
    readonly episodeReceiptHandle: V2FirebaseVoiceAudioEpisodeReceiptHandleV1;
    readonly pageStartIndex: number;
  }): Promise<LearningV2VoiceAudioDevicePageV1>;
}

const AUDIO_PATH_RE =
  /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;

function fail(): never {
  throw new Error("v2_firebase_voice_audio_device_page_invalid");
}

function emulatorEnvironment() {
  return Object.freeze({
    functionsEmulator: process.env.FUNCTIONS_EMULATOR ?? null,
    firestoreEmulatorHost: process.env.FIRESTORE_EMULATOR_HOST ?? null,
    storageEmulatorHost: process.env.STORAGE_EMULATOR_HOST ?? null,
    firebaseStorageEmulatorHost:
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? null,
    firebaseEmulatorHub: process.env.FIREBASE_EMULATOR_HUB ?? null,
  });
}

/**
 * Private server-only transport projection. A signed URL grants bounded read
 * transport only; the device still hashes the exact bytes before playback.
 */
export function createFirebaseAdminV2VoiceAudioDevicePageAdapterV1(): V2FirebaseVoiceAudioDevicePageAdapterV1 {
  const expected = V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1;
  const app = admin.app();
  if (
    app.name !== expected.appName ||
    app.options.projectId !== expected.projectId ||
    app.options.storageBucket !== expected.bucketName
  )
    fail();
  const bucket = admin.storage(app).bucket(expected.bucketName);
  if (bucket.name !== expected.bucketName) fail();
  validateV2FirebaseRepositoryTrustRootV1({
    projectId: app.options.projectId,
    databaseId: expected.databaseId,
    bucketName: bucket.name,
    appName: app.name,
    emulatorEnvironment: emulatorEnvironment(),
  });

  return Object.freeze({
    projectDevicePage: async (
      input: Parameters<
        V2FirebaseVoiceAudioDevicePageAdapterV1["projectDevicePage"]
      >[0],
    ) => {
      const material = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1({
        handle: input.episodeReceiptHandle,
        plan: input.plan,
        stageId: input.stageId,
        manifest: input.manifest,
      });
      if (
        !Number.isSafeInteger(input.pageStartIndex) ||
        input.pageStartIndex < 0
      )
        fail();
      const pageEvidence = material.receipt.pages.find(
        (page) => page.pageStartIndex === input.pageStartIndex,
      );
      if (!pageEvidence) fail();
      const entries = material.manifest.sessionManifests.flatMap(
        (session) => session.entries,
      );
      if (entries.length !== material.manifest.audioObjectCount) fail();
      const pageEntries = entries.slice(
        pageEvidence.pageStartIndex,
        pageEvidence.pageStartIndex + pageEvidence.pageItemCount,
      );
      if (pageEntries.length !== pageEvidence.pageItemCount) fail();
      const observedAtMs = Date.now();
      const signedUrlExpiresAtMs =
        observedAtMs + V2_FIREBASE_VOICE_AUDIO_DEVICE_PAGE_SIGNED_URL_TTL_MS_V1;
      if (
        V2_FIREBASE_VOICE_AUDIO_DEVICE_PAGE_SIGNED_URL_TTL_MS_V1 <
          LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MIN_TTL_MS_V1 ||
        V2_FIREBASE_VOICE_AUDIO_DEVICE_PAGE_SIGNED_URL_TTL_MS_V1 >
          LEARNING_V2_VOICE_AUDIO_SIGNED_URL_MAX_TTL_MS_V1
      )
        fail();
      const rows = await Promise.all(
        pageEntries.map(async (entry, offset) => {
          if (
            !AUDIO_PATH_RE.test(entry.objectPath) ||
            !entry.objectPath.endsWith(`/${entry.contentHash}.mp3`)
          )
            fail();
          const [signedReadUrl] = await bucket
            .file(entry.objectPath, { generation: entry.objectGeneration })
            .getSignedUrl({
              action: "read",
              version: "v4",
              expires: signedUrlExpiresAtMs,
              responseType: "audio/mpeg",
              queryParams: { generation: entry.objectGeneration },
            });
          return Object.freeze({
            itemIndex: pageEvidence.pageStartIndex + offset,
            generationTargetFingerprint: entry.generationTargetFingerprint,
            entryFingerprint: entry.entryFingerprint,
            objectPath: entry.objectPath,
            contentHash: entry.contentHash,
            objectGeneration: entry.objectGeneration,
            byteSize: entry.byteSize,
            signedReadUrl,
          });
        }),
      );
      return materializeLearningV2VoiceAudioDevicePageV1({
        manifestFingerprint: material.manifest.manifestFingerprint,
        episodeReceiptFingerprint: material.receipt.receiptFingerprint,
        pageReceiptFingerprint: pageEvidence.pageReceiptFingerprint,
        pageAudioReadbackAggregateFingerprint:
          pageEvidence.pageAudioReadbackAggregateFingerprint,
        audioObjectCount: material.manifest.audioObjectCount,
        pageStartIndex: pageEvidence.pageStartIndex,
        nextPageStartIndex: pageEvidence.nextPageStartIndex,
        signedUrlExpiresAtMs,
        observedAtMs,
        rows: Object.freeze(rows),
      });
    },
  });
}
