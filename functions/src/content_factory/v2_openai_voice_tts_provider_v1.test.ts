import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const mp3 = (() => {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x00]);
  const value = new Uint8Array(frame.byteLength * 2);
  value.set(frame);
  value.set(frame, frame.byteLength);
  return value;
})();
const plan = Object.freeze({ planFingerprint: h("plan") });
const workOrderHandle = Object.freeze({ private: "work-order" });
let disposition:
  | "eligible_for_guarded_tts_execution"
  | "blocked_unverified_spoken_source" = "eligible_for_guarded_tts_execution";
const work = Object.freeze({
  plan,
  summary: Object.freeze({
    executionDisposition: "eligible_for_guarded_tts_execution",
    blockingIssueCodes: Object.freeze([]),
    workOrderFingerprint: h("work-order"),
  }),
  items: Object.freeze([
    Object.freeze({
      inputText: "Hello",
      model: "gpt-4o-mini-tts" as const,
      format: "mp3" as const,
      contentType: "audio/mpeg" as const,
      voiceId: "ash" as const,
      speed: 1 as const,
      instructions: "Clear natural learning pronunciation.",
      maximumOutputBytes: 64 * 1024,
      generationTargetFingerprint: h("generation-target"),
      itemFingerprint: h("item"),
      inputKind: "word" as const,
      wordOrdinal: 1,
    }),
  ]),
});

jest.mock("./v2_voice_tts_work_order_v1", () => ({
  resolveV2VoiceTtsWorkOrderMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
  }) => {
    if (
      input.handle !== workOrderHandle ||
      input.plan !== plan ||
      input.stageId !== "voice-stage-1"
    )
      throw new Error("test_work_order_invalid");
    return Object.freeze({
      ...work,
      summary: Object.freeze({
        ...work.summary,
        executionDisposition: disposition,
        blockingIssueCodes:
          disposition === "eligible_for_guarded_tts_execution"
            ? Object.freeze([])
            : Object.freeze(["v2_voice_tts_unverified_spoken_source"]),
      }),
    });
  },
}));

// Jest hoists the private work-order mock before this import.
// eslint-disable-next-line import/first
import {
  V2_OPENAI_VOICE_TTS_ENDPOINT_V1,
  createV2OpenAiVoiceTtsProviderV1,
  getV2OpenAiVoiceTtsExecutionSummaryV1,
  isV2OpenAiVoiceTtsExecutionHandleV1,
  resolveV2OpenAiVoiceTtsExecutionMaterialV1,
} from "./v2_openai_voice_tts_provider_v1";

describe("Learning V2 OpenAI audio/speech provider seam", () => {
  beforeEach(() => {
    disposition = "eligible_for_guarded_tts_execution";
  });

  it("uses only the exact audio/speech endpoint and returns private bounded bytes", async () => {
    const request = jest.fn(async () =>
      Object.freeze({
        ok: true,
        status: 200,
        contentType: "audio/mpeg",
        bytes: mp3,
      }),
    );
    const provider = createV2OpenAiVoiceTtsProviderV1({
      apiKey: "test_key_placeholder_123456",
      transport: Object.freeze({ request }),
      maximumConcurrency: 1,
    });
    const handle = await provider.execute({
      workOrderHandle: workOrderHandle as never,
      plan: plan as never,
      stageId: "voice-stage-1",
      batchStartIndex: 0,
      batchItemCount: 1,
    });
    const summary = getV2OpenAiVoiceTtsExecutionSummaryV1(handle);
    const material = resolveV2OpenAiVoiceTtsExecutionMaterialV1({
      handle,
      plan: plan as never,
      stageId: "voice-stage-1",
    });
    expect(isV2OpenAiVoiceTtsExecutionHandleV1(handle)).toBe(true);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: V2_OPENAI_VOICE_TTS_ENDPOINT_V1,
        maximumResponseBytes: 64 * 1024,
        body: expect.objectContaining({
          model: "gpt-4o-mini-tts",
          voice: "ash",
          input: "Hello",
          response_format: "mp3",
        }),
      }),
    );
    expect(summary.providerExecutionAuthority).toBe(
      "provider_response_observed_in_process",
    );
    expect(summary.audioByteAuthority).toBe(
      "unpersisted_provider_response_bytes",
    );
    expect(summary.storageAuthority).toBe("none");
    expect(summary.generated[0]).not.toHaveProperty("bytes");
    expect(material.generated[0]?.bytes).toEqual(mp3);
    expect(isV2OpenAiVoiceTtsExecutionHandleV1({ ...summary })).toBe(false);
  });

  it("rejects blocked sources before any provider request", async () => {
    disposition = "blocked_unverified_spoken_source";
    const request = jest.fn();
    const provider = createV2OpenAiVoiceTtsProviderV1({
      apiKey: "test_key_placeholder_123456",
      transport: Object.freeze({ request }),
    });
    await expect(
      provider.execute({
        workOrderHandle: workOrderHandle as never,
        plan: plan as never,
        stageId: "voice-stage-1",
        batchStartIndex: 0,
        batchItemCount: 1,
      }),
    ).rejects.toThrow("v2_openai_voice_tts_work_order_blocked");
    expect(request).not.toHaveBeenCalled();
  });

  it("fails closed on MIME, status and size violations", async () => {
    const responses = [
      Object.freeze({
        ok: false,
        status: 429,
        contentType: "application/json",
        bytes: new Uint8Array([1]),
      }),
      Object.freeze({
        ok: true,
        status: 200,
        contentType: "text/plain",
        bytes: new Uint8Array([1]),
      }),
      Object.freeze({
        ok: true,
        status: 200,
        contentType: "audio/mpeg",
        bytes: new Uint8Array(64 * 1024 + 1),
      }),
    ];
    for (const response of responses) {
      const provider = createV2OpenAiVoiceTtsProviderV1({
        apiKey: "test_key_placeholder_123456",
        transport: Object.freeze({ request: async () => response }),
      });
      await expect(
        provider.execute({
          workOrderHandle: workOrderHandle as never,
          plan: plan as never,
          stageId: "voice-stage-1",
          batchStartIndex: 0,
          batchItemCount: 1,
        }),
      ).rejects.toThrow("v2_openai_voice_tts_provider_response_invalid");
    }
  });

  it("rejects a MIME-correct response whose bytes are not a complete MP3", async () => {
    const provider = createV2OpenAiVoiceTtsProviderV1({
      apiKey: "test_key_placeholder_123456",
      transport: Object.freeze({
        request: async () =>
          Object.freeze({
            ok: true,
            status: 200,
            contentType: "audio/mpeg",
            bytes: new Uint8Array([0x49, 0x44, 0x33, 1, 2, 3]),
          }),
      }),
    });
    await expect(
      provider.execute({
        workOrderHandle: workOrderHandle as never,
        plan: plan as never,
        stageId: "voice-stage-1",
        batchStartIndex: 0,
        batchItemCount: 1,
      }),
    ).rejects.toThrow("v2_voice_mp3_codec_invalid");
  });
});
