import { createHash } from "node:crypto";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const executionHandle = Object.freeze({ private: "provider-execution" });
const storage = Object.freeze({ kind: "storage-port" });
const generated = Object.freeze(
  ["ash", "onyx"].map((voiceId, index) => {
    const frame = new Uint8Array(417);
    frame.set([0xff, 0xfb, 0x90, index << 6]);
    const bytes = new Uint8Array(frame.byteLength * 2);
    bytes.set(frame);
    bytes.set(frame, frame.byteLength);
    return Object.freeze({
      generationTargetFingerprint: h(["target", voiceId]),
      itemFingerprint: h(["item", voiceId]),
      voiceId,
      inputKind: "word" as const,
      wordOrdinal: 1,
      contentType: "audio/mpeg" as const,
      byteSize: bytes.byteLength,
      rawSha256: createHash("sha256").update(bytes).digest("hex"),
      codecRulesFingerprint: h("codec-rules-placeholder"),
      codecResultFingerprint: h("codec-result-placeholder"),
      bytes,
    });
  }),
);
const providerSummary = Object.freeze({
  workOrderFingerprint: h("work-order"),
  resultFingerprint: h("provider-result"),
  totalWorkItemCount: 16,
  batchStartIndex: 0,
  batchItemCount: 2,
  generatedItemCount: 2,
});

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({ storage }),
}));
const persist = jest.fn(
  async (input: {
    objectPath: string;
    bytes: Uint8Array;
    contentHash: string;
    contentType: string;
  }) =>
    Object.freeze({
      kind: "created" as const,
      pin: Object.freeze({
        objectPath: input.objectPath,
        contentHash: input.contentHash,
        objectGeneration: "7",
        byteSize: input.bytes.byteLength,
        contentType: input.contentType,
      }),
    }),
);
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1: "audio/mpeg",
  persistV2ImmutableRepositoryObjectV1: (input: unknown) =>
    persist(input as never),
}));
jest.mock("./v2_openai_voice_tts_provider_v1", () => ({
  getV2OpenAiVoiceTtsExecutionSummaryV1: (value: unknown) => {
    if (value !== executionHandle) throw new Error("test_execution_invalid");
    return providerSummary;
  },
  resolveV2OpenAiVoiceTtsExecutionMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== executionHandle ||
      input.plan !== plan ||
      input.stageId !== "voice-stage-1"
    )
      throw new Error("test_execution_invalid");
    return Object.freeze({
      plan,
      stageId: "voice-stage-1",
      summary: providerSummary,
      generated,
    });
  },
}));
jest.mock("./v2_voice_mp3_codec_v1", () => ({
  validateV2VoiceMp3CodecV1: (bytes: Uint8Array) => {
    if (bytes.every((value) => value === 0))
      throw new Error("v2_voice_mp3_codec_invalid");
    return Object.freeze({
      rulesFingerprint: h("codec-rules-placeholder"),
      resultFingerprint: h("codec-result-placeholder"),
    });
  },
}));

// Jest hoists the private provider and persistence mocks before this import.
// eslint-disable-next-line import/first
import {
  createFirebaseAdminV2VoiceAudioPersistenceV1,
  getV2FirebaseVoiceAudioBatchSummaryV1,
  isV2FirebaseVoiceAudioBatchHandleV1,
  resolveV2FirebaseVoiceAudioBatchMaterialV1,
  v2FirebaseVoiceAudioObjectPathV1,
} from "./v2_firebase_voice_audio_persistence_v1";

describe("Learning V2 generation-pinned voice audio persistence", () => {
  beforeEach(() => persist.mockClear());

  it("persists a bounded batch to content-addressed paths and returns a private readback handle", async () => {
    const adapter = createFirebaseAdminV2VoiceAudioPersistenceV1();
    const handle = await adapter.persistGeneratedBatch({
      executionHandle: executionHandle as never,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    const summary = getV2FirebaseVoiceAudioBatchSummaryV1(handle);
    const material = resolveV2FirebaseVoiceAudioBatchMaterialV1({
      handle,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    expect(isV2FirebaseVoiceAudioBatchHandleV1(handle)).toBe(true);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        storage,
        objectPath: v2FirebaseVoiceAudioObjectPathV1({
          planFingerprint: plan.planFingerprint,
          stageId: "voice-stage-1",
          generationTargetFingerprint:
            generated[0]!.generationTargetFingerprint,
          rawSha256: generated[0]!.rawSha256,
        }),
        contentType: "audio/mpeg",
        contentHash: generated[0]!.rawSha256,
      }),
    );
    expect(summary.audioObjectCount).toBe(2);
    expect(summary.audioByteAuthority).toBe(
      "firebase_admin_generation_pinned_exact_readback",
    );
    expect(summary.listeningEvidenceAuthority).toBe("none");
    expect(summary.releaseAuthority).toBe(false);
    expect(material.pins).toHaveLength(2);
    expect(
      material.objects.map((value) => value.generationTargetFingerprint),
    ).toEqual(generated.map((value) => value.generationTargetFingerprint));
    expect(material.objects[0]).toMatchObject({
      codecRulesFingerprint: h("codec-rules-placeholder"),
      codecResultFingerprint: h("codec-result-placeholder"),
    });
    expect(isV2FirebaseVoiceAudioBatchHandleV1({ ...summary })).toBe(false);
  });

  it("rejects path traversal and cross-stage material replay", async () => {
    expect(() =>
      v2FirebaseVoiceAudioObjectPathV1({
        planFingerprint: plan.planFingerprint,
        stageId: "../stage",
        generationTargetFingerprint: h("target"),
        rawSha256: h("audio"),
      }),
    ).toThrow("v2_firebase_voice_audio_path_invalid");
    const handle =
      await createFirebaseAdminV2VoiceAudioPersistenceV1().persistGeneratedBatch(
        {
          executionHandle: executionHandle as never,
          plan: plan as never,
          stageId: "voice-stage-1",
        },
      );
    expect(() =>
      resolveV2FirebaseVoiceAudioBatchMaterialV1({
        handle,
        plan: plan as never,
        stageId: "voice-stage-2",
      }),
    ).toThrow("v2_firebase_voice_audio_batch_handle_invalid");
  });

  it("rejects non-MP3 provider bytes before immutable Storage I/O", async () => {
    const original = new Uint8Array(generated[0]!.bytes);
    generated[0]!.bytes.fill(0);
    await expect(
      createFirebaseAdminV2VoiceAudioPersistenceV1().persistGeneratedBatch({
        executionHandle: executionHandle as never,
        plan: plan as never,
        stageId: "voice-stage-1",
      }),
    ).rejects.toThrow("v2_voice_mp3_codec_invalid");
    expect(persist).not.toHaveBeenCalled();
    generated[0]!.bytes.set(original);
  });
});
