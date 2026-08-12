import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  candidateFingerprint: h("candidate"),
  packageFingerprint: h("package"),
  workOrderFingerprint: h("work-order"),
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
  totalAudioBytes: 4,
  sessionManifests: Object.freeze([
    Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          generationTargetFingerprint: h("generation"),
          itemFingerprint: h("item"),
          taskId: "task-1",
          taskVoiceGroupFingerprint: h("voice-group"),
          audioTargetId: "audio-target-1",
          inputKind: "full_utterance",
          wordId: null,
          wordOrdinal: null,
          voiceId: "ash",
          objectPath: `learning-v2/voice-audio/${h("audio")}.mp3`,
          contentHash:
            "27fc7c9af9243eb8c09912d9ef2b052bf9936270a838158283d8ed3ca19f266d",
          objectGeneration: "7",
          byteSize: 4,
          contentType: "audio/mpeg",
          codecRulesFingerprint: h("codec-rules"),
          codecResultFingerprint: h("codec-result"),
        }),
      ]),
    }),
  ]),
});
const manifestRaw = canonicalJsonV1(manifest);
const manifestRawHash = sha256Utf8(manifestRaw);
const manifestPin = Object.freeze({
  objectPath: `learning-v2/voice-audio-manifests/${manifestRawHash}.json`,
  contentHash: manifestRawHash,
  objectGeneration: "8",
  byteSize: new TextEncoder().encode(manifestRaw).byteLength,
  contentType: "application/json; charset=utf-8" as const,
});

const storage = {
  readMetadataExact: jest.fn(async (objectPath: string) =>
    objectPath === manifestPin.objectPath
      ? Object.freeze({
          generation: manifestPin.objectGeneration,
          byteSize: manifestPin.byteSize,
          contentType: manifestPin.contentType,
          contentHash: manifestPin.contentHash,
        })
      : null,
  ),
  downloadGenerationExact: jest.fn(async (input: { objectPath: string }) =>
    input.objectPath === manifestPin.objectPath
      ? Object.freeze({
          kind: "downloaded" as const,
          bytes: new TextEncoder().encode(manifestRaw),
        })
      : Object.freeze({ kind: "missing" as const }),
  ),
};
const batchHandle = Object.freeze({ batch: true });
let tamperBatch = false;
const batchObject = Object.freeze({
  generationTargetFingerprint:
    manifest.sessionManifests[0]!.entries[0]!.generationTargetFingerprint,
  itemFingerprint: h("item"),
  voiceId: "ash",
  inputKind: "full_utterance",
  wordOrdinal: null,
  codecRulesFingerprint: h("codec-rules"),
  codecResultFingerprint: h("codec-result"),
  pin: Object.freeze({
    objectPath: manifest.sessionManifests[0]!.entries[0]!.objectPath,
    contentHash: manifest.sessionManifests[0]!.entries[0]!.contentHash,
    objectGeneration: "7",
    byteSize: 4,
    contentType: "audio/mpeg",
  }),
});
jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === plan,
}));
jest.mock("./v2_voice_audio_manifest_v1", () => ({
  V2_VOICE_AUDIO_MANIFEST_MAX_BYTES_V1: 4 * 1024 * 1024,
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({ storage }),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: async () =>
    Object.freeze({ kind: "created", pin: manifestPin }),
}));
jest.mock("./v2_firebase_voice_audio_persistence_v1", () => ({
  resolveV2FirebaseVoiceAudioBatchMaterialV1: () =>
    Object.freeze({
      summary: Object.freeze({
        workOrderFingerprint: manifest.workOrderFingerprint,
        audioObjectCount: 1,
      }),
      objects: Object.freeze([
        tamperBatch
          ? Object.freeze({
              ...batchObject,
              pin: Object.freeze({ ...batchObject.pin, contentHash: h("bad") }),
            })
          : batchObject,
      ]),
    }),
}));

// Jest hoists the trust and persistence mocks before this import.
// eslint-disable-next-line import/first
import {
  createFirebaseAdminV2VoiceAudioManifestAdapterV1,
  getV2FirebaseVoiceAudioManifestSummaryV1,
  isV2FirebaseVoiceAudioManifestHandleV1,
  resolveV2FirebaseVoiceAudioManifestMaterialV1,
} from "./v2_firebase_voice_audio_manifest_adapter_v1";

describe("Learning V2 Firebase voice audio manifest cold readback", () => {
  beforeEach(() => {
    tamperBatch = false;
    jest.clearAllMocks();
  });

  it("cold reads the manifest and every generation-pinned MP3 before minting authority", async () => {
    const handle =
      await createFirebaseAdminV2VoiceAudioManifestAdapterV1().commitAndColdReadManifest(
        {
          plan: plan as never,
          stageId: "voice-stage-1",
          manifest: manifest as never,
          batchHandles: [batchHandle as never],
        },
      );
    const summary = getV2FirebaseVoiceAudioManifestSummaryV1(handle);
    expect(isV2FirebaseVoiceAudioManifestHandleV1(handle)).toBe(true);
    expect(summary.audioByteAuthority).toBe(
      "firebase_admin_generation_pinned_batch_readbacks_bound_to_manifest_same_process",
    );
    expect(summary.listeningEvidenceAuthority).toBe("none");
    expect(summary.deviceEvidenceAuthority).toBe("none");
    expect(summary.releaseAuthority).toBe(false);
    expect(storage.readMetadataExact).toHaveBeenCalledTimes(1);
    expect(storage.downloadGenerationExact).toHaveBeenCalledTimes(1);
    expect(
      resolveV2FirebaseVoiceAudioManifestMaterialV1({
        handle,
        plan: plan as never,
        stageId: "voice-stage-1",
      }).manifest,
    ).toBe(manifest);
    expect(isV2FirebaseVoiceAudioManifestHandleV1({ ...summary })).toBe(false);
  });

  it("fails closed on same-size audio tamper and cross-stage replay", async () => {
    tamperBatch = true;
    await expect(
      createFirebaseAdminV2VoiceAudioManifestAdapterV1().commitAndColdReadManifest(
        {
          plan: plan as never,
          stageId: "voice-stage-1",
          manifest: manifest as never,
          batchHandles: [batchHandle as never],
        },
      ),
    ).rejects.toThrow("v2_firebase_voice_audio_batch_manifest_mismatch");
  });
});
