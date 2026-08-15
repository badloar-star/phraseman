import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const frame = new Uint8Array(417);
frame.set([0xff, 0xfb, 0x90, 0x00]);
const audioBytes = new Uint8Array(834);
audioBytes.set(frame);
audioBytes.set(frame, 417);
const audioHash = createHash("sha256").update(audioBytes).digest("hex");
const codec = Object.freeze({
  rulesFingerprint: h("codec-rules"),
  resultFingerprint: h("codec-result"),
});
const entryBody = Object.freeze({
  generationTargetFingerprint: h("generation"),
  itemFingerprint: h("item"),
  taskId: "task-1",
  taskVoiceGroupFingerprint: h("voice-group"),
  audioTargetId: "audio-target-1",
  inputKind: "word",
  wordId: "word-1",
  wordOrdinal: 1,
  voiceId: "ash",
  objectPath: `learning-v2/voice-audio/${audioHash}.mp3`,
  contentHash: audioHash,
  objectGeneration: "7",
  byteSize: audioBytes.byteLength,
  contentType: "audio/mpeg",
  codecRulesFingerprint: codec.rulesFingerprint,
  codecResultFingerprint: codec.resultFingerprint,
});
const entry = Object.freeze({
  ...entryBody,
  entryFingerprint: h(entryBody),
});
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
  sessionManifests: Object.freeze([
    Object.freeze({ entries: Object.freeze([entry]) }),
  ]),
});
let receiptRaw: string | null = null;
let receiptPin: Readonly<{
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
  contentType: "application/json; charset=utf-8";
}> | null = null;
let tamperAudio = false;
const storage = Object.freeze({
  readMetadataExact: jest.fn(async (path: string) => {
    if (path === entry.objectPath)
      return Object.freeze({
        generation: "7",
        byteSize: audioBytes.byteLength,
        contentType: "audio/mpeg",
        contentHash: audioHash,
      });
    if (receiptPin && path === receiptPin.objectPath)
      return Object.freeze({
        generation: receiptPin.objectGeneration,
        byteSize: receiptPin.byteSize,
        contentType: receiptPin.contentType,
        contentHash: receiptPin.contentHash,
      });
    return null;
  }),
  downloadGenerationExact: jest.fn(async (input: { objectPath: string }) => {
    if (input.objectPath === entry.objectPath)
      return Object.freeze({
        kind: "downloaded" as const,
        bytes: tamperAudio ? new Uint8Array(audioBytes.byteLength) : audioBytes,
      });
    if (receiptPin && input.objectPath === receiptPin.objectPath)
      return Object.freeze({
        kind: "downloaded" as const,
        bytes: new TextEncoder().encode(receiptRaw!),
      });
    return Object.freeze({ kind: "not_found" as const });
  }),
});
jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === plan,
}));
jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_voice_mp3_codec_v1", () => ({
  validateV2VoiceMp3CodecV1: (bytes: Uint8Array) => {
    if (bytes.every((value) => value === 0))
      throw new Error("v2_voice_mp3_codec_invalid");
    return codec;
  },
}));
jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({ storage }),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: async (input: {
    objectPath: string;
    bytes: Uint8Array;
    contentHash: string;
  }) => {
    receiptRaw = new TextDecoder().decode(input.bytes);
    expect(sha256Utf8(receiptRaw)).toBe(input.contentHash);
    receiptPin = Object.freeze({
      objectPath: input.objectPath,
      contentHash: input.contentHash,
      objectGeneration: "8",
      byteSize: input.bytes.byteLength,
      contentType: "application/json; charset=utf-8" as const,
    });
    return Object.freeze({ kind: "created" as const, pin: receiptPin });
  },
}));

// Jest hoists private trust, codec and persistence ports before this import.
// eslint-disable-next-line import/first
import {
  createFirebaseAdminV2VoiceAudioPageReceiptAdapterV1,
  getV2FirebaseVoiceAudioPageReceiptSummaryV1,
  isV2FirebaseVoiceAudioPageReceiptHandleV1,
  resolveV2FirebaseVoiceAudioPageReceiptMaterialV1,
} from "./v2_firebase_voice_audio_page_receipt_adapter_v1";

describe("Learning V2 Firebase durable voice-audio page readback", () => {
  beforeEach(() => {
    receiptRaw = null;
    receiptPin = null;
    tamperAudio = false;
    jest.clearAllMocks();
  });

  it("generation-pinned reads one page, persists its authority-none receipt, and cold reads it", async () => {
    const handle =
      await createFirebaseAdminV2VoiceAudioPageReceiptAdapterV1().readbackAndPersistPage(
        {
          plan: plan as never,
          stageId: "voice-stage-1",
          manifest: manifest as never,
          pageStartIndex: 0,
        },
      );
    const summary = getV2FirebaseVoiceAudioPageReceiptSummaryV1(handle);
    expect(summary).toMatchObject({
      pageItemCount: 1,
      nextPageStartIndex: null,
      audioByteAuthority: "firebase_admin_generation_pinned_page_readback",
      codecEvidenceAuthority: "structural_mpeg_layer_iii_frames_revalidated",
      decoderEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(isV2FirebaseVoiceAudioPageReceiptHandleV1(handle)).toBe(true);
    expect(isV2FirebaseVoiceAudioPageReceiptHandleV1({ ...summary })).toBe(
      false,
    );
    const material = resolveV2FirebaseVoiceAudioPageReceiptMaterialV1({
      handle,
      plan: plan as never,
      stageId: "voice-stage-1",
      manifest: manifest as never,
    });
    expect(material.receipt.audioByteAuthority).toBe("none");
    expect(canonicalJsonV1(material.receipt)).toBe(receiptRaw);
    expect(storage.readMetadataExact).toHaveBeenCalledTimes(2);
    expect(storage.downloadGenerationExact).toHaveBeenCalledTimes(2);
  });

  it("fails before receipt persistence on same-size audio tamper", async () => {
    tamperAudio = true;
    await expect(
      createFirebaseAdminV2VoiceAudioPageReceiptAdapterV1().readbackAndPersistPage(
        {
          plan: plan as never,
          stageId: "voice-stage-1",
          manifest: manifest as never,
          pageStartIndex: 0,
        },
      ),
    ).rejects.toThrow("v2_firebase_voice_audio_page_readback_mismatch");
    expect(receiptPin).toBeNull();
  });
});
