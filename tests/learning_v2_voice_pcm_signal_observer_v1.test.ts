import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_PCM_SIGNAL_POLICY_V1,
  observeLearningV2DecodedPcmSignalV1,
  observeLearningV2NativePcmSignalMetricsV1,
} from "../modules/learning-v2/runtime/voice_pcm_signal_observer_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const identity = Object.freeze({
  itemIndex: 3,
  generationTargetFingerprint: h("generation"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("audio")}.mp3`,
  contentHash: h("audio"),
  objectGeneration: "9",
  byteSize: 10_000,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
  decoderStatusSequenceFingerprint: h("decoder-statuses"),
});

const observe = (chunks: readonly Int16Array[], channelCount: 1 | 2 = 1) =>
  observeLearningV2DecodedPcmSignalV1({
    identity,
    sampleRateHz: 16_000,
    channelCount,
    chunks,
  });

describe("Learning V2 deterministic decoded PCM signal observer", () => {
  it("classifies a bounded active PCM16 signal without granting listening authority", () => {
    const samples = new Int16Array(3_200);
    samples.fill(6_000);
    const result = observe([samples]);
    expect(result).toMatchObject({
      sampleRateHz: 16_000,
      channelCount: 1,
      sampleCount: 3_200,
      frameCount: 3_200,
      durationMs: 200,
      peakAbsoluteSample: 6_000,
      rmsAbsoluteSample: 6_000,
      activeSampleBasisPoints: 10_000,
      clippedSampleBasisPoints: 0,
      zeroSampleBasisPoints: 0,
      signalClass: "clean_signal_candidate",
      pcmSourceBindingAuthority: "unverified_caller_supplied_decoded_pcm",
      signalMetricAuthority: "deterministic_pcm16_metrics_only",
      noiseEvidenceAuthority: "none",
      speechCorrectnessAuthority: "none",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      humanApprovalAuthority: "none",
      publicationAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(result.observationFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(LEARNING_V2_PCM_SIGNAL_POLICY_V1.ref.contentHash).toMatch(
      /^[a-f0-9]{64}$/u,
    );
  });

  it.each([
    [new Int16Array(3_200), "digital_silence"],
    [new Int16Array(3_200).fill(100), "near_silence"],
    [new Int16Array(3_200).fill(32_767), "clipping_detected"],
  ])(
    "classifies silence and clipping without calling them human QA",
    (samples, expected) => {
      expect(observe([samples]).signalClass).toBe(expected);
    },
  );

  it("is independent of PCM chunk boundaries and tracks leading/trailing silence", () => {
    const all = new Int16Array(3_200);
    all.fill(6_000, 800, 2_400);
    const oneChunk = observe([all]);
    const manyChunks = observe([
      all.slice(0, 731),
      all.slice(731, 1_999),
      all.slice(1_999),
    ]);
    expect(manyChunks).toEqual(oneChunk);
    expect(oneChunk.leadingSilenceMs).toBe(50);
    expect(oneChunk.trailingSilenceMs).toBe(50);
  });

  it("handles stereo frames without treating channels as extra duration", () => {
    const stereo = new Int16Array(6_400);
    stereo.fill(5_000);
    const result = observe([stereo], 2);
    expect(result.frameCount).toBe(3_200);
    expect(result.durationMs).toBe(200);
    expect(result.sampleCount).toBe(6_400);
  });

  it("accepts exact native system decode metrics without upgrading device authority", () => {
    const result = observeLearningV2NativePcmSignalMetricsV1({
      identity,
      metrics: {
        schemaVersion: "learning-v2-native-pcm-decode-metrics.v1",
        decoderBackend: "av_audio_file",
        sourceByteSize: identity.byteSize,
        sourceSha256: identity.contentHash,
        sampleRateHz: 16_000,
        channelCount: 1,
        sampleCount: 3_200,
        frameCount: 3_200,
        durationMs: 200,
        peakAbsoluteSample: 6_000,
        rmsAbsoluteSample: 6_000,
        activeSampleBasisPoints: 10_000,
        clippedSampleBasisPoints: 0,
        zeroSampleBasisPoints: 0,
        leadingSilenceMs: 0,
        trailingSilenceMs: 0,
      },
    });
    expect(result.signalClass).toBe("clean_signal_candidate");
    expect(result.pcmSourceBindingAuthority).toBe(
      "unverified_serialized_native_system_decode_report",
    );
    expect(result.deviceEvidenceAuthority).toBe("none");
    expect(result.releaseEligible).toBe(false);
  });

  it.each([
    { sourceSha256: h("other-audio") },
    { sourceByteSize: identity.byteSize + 1 },
    { decoderBackend: "android_media_codec" },
    { sampleCount: 3_199 },
    { durationMs: 199 },
    { hidden: true },
  ])("rejects forged or incoherent native decode metrics", (drift) => {
    expect(() =>
      observeLearningV2NativePcmSignalMetricsV1({
        identity,
        metrics: {
          schemaVersion: "learning-v2-native-pcm-decode-metrics.v1",
          decoderBackend: "av_audio_file",
          sourceByteSize: identity.byteSize,
          sourceSha256: identity.contentHash,
          sampleRateHz: 16_000,
          channelCount: 1,
          sampleCount: 3_200,
          frameCount: 3_200,
          durationMs: 200,
          peakAbsoluteSample: 6_000,
          rmsAbsoluteSample: 6_000,
          activeSampleBasisPoints: 10_000,
          clippedSampleBasisPoints: 0,
          zeroSampleBasisPoints: 0,
          leadingSilenceMs: 0,
          trailingSilenceMs: 0,
          ...drift,
        } as never,
      }),
    ).toThrow("learning_v2_pcm_signal_observation_invalid");
  });

  it.each([
    {
      identity,
      sampleRateHz: 16_000,
      channelCount: 1 as const,
      chunks: [new Int16Array(1_599)],
    },
    {
      identity,
      sampleRateHz: 16_000,
      channelCount: 2 as const,
      chunks: [new Int16Array(3_201)],
    },
    {
      identity,
      sampleRateHz: 12_345,
      channelCount: 1 as const,
      chunks: [new Int16Array(3_200)],
    },
    {
      identity: { ...identity, hidden: true },
      sampleRateHz: 16_000,
      channelCount: 1 as const,
      chunks: [new Int16Array(3_200)],
    },
    {
      identity,
      sampleRateHz: 16_000,
      channelCount: 1 as const,
      chunks: [new Int16Array(3_200)],
      hidden: true,
    },
  ])(
    "rejects unbounded, unaligned, unsupported or forged observations",
    (input) => {
      expect(() => observeLearningV2DecodedPcmSignalV1(input as never)).toThrow(
        "learning_v2_pcm_signal_observation_invalid",
      );
    },
  );
});
