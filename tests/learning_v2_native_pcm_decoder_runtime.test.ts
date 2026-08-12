const mockDecodeFile = jest.fn();

jest.mock("expo-modules-core", () => ({
  requireOptionalNativeModule: () => ({
    decodeFile: (...args: unknown[]) => mockDecodeFile(...args),
  }),
}));

/* eslint-disable import/first -- the native module must be mocked before import */

import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  decodeLearningV2NativePcmSignalV1,
  LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1,
} from "../modules/learning-v2-pcm-decoder";
/* eslint-enable import/first */

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

const metrics = Object.freeze({
  schemaVersion: "learning-v2-native-pcm-decode-metrics.v1" as const,
  decoderBackend: "av_audio_file" as const,
  sourceByteSize: identity.byteSize,
  sourceSha256: identity.contentHash,
  sampleRateHz: 16_000,
  channelCount: 1 as const,
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
});

describe("Learning V2 native PCM decoder JS boundary", () => {
  beforeEach(() => mockDecodeFile.mockReset());

  it("passes an exact local-file identity and returns authority-free metrics", async () => {
    mockDecodeFile.mockResolvedValue(metrics);
    const result = await decodeLearningV2NativePcmSignalV1({
      fileUri: "file:///private/var/mobile/voice.mp3",
      identity,
    });
    expect(mockDecodeFile).toHaveBeenCalledWith(
      "file:///private/var/mobile/voice.mp3",
      identity.contentHash,
      identity.byteSize,
      LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1,
    );
    expect(result).toMatchObject({
      pcmSourceBindingAuthority:
        "unverified_serialized_native_system_decode_report",
      deviceEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
    });
  });

  it.each([
    { fileUri: "https://example.test/voice.mp3", identity },
    { fileUri: "file:///tmp/../voice.mp3", identity },
    {
      fileUri: "file:///tmp/voice.mp3",
      identity: {
        ...identity,
        byteSize: LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1 + 1,
      },
    },
    {
      fileUri: "file:///tmp/voice.mp3",
      identity: { ...identity, contentHash: "forged" },
    },
  ])("rejects an untrusted request before native decoding", async (input) => {
    await expect(
      decodeLearningV2NativePcmSignalV1(input as never),
    ).rejects.toThrow("learning_v2_native_pcm_decoder_invalid");
    expect(mockDecodeFile).not.toHaveBeenCalled();
  });

  it("rejects a native report that drifts from the exact file identity", async () => {
    mockDecodeFile.mockResolvedValue({ ...metrics, sourceSha256: h("other") });
    await expect(
      decodeLearningV2NativePcmSignalV1({
        fileUri: "file:///tmp/voice.mp3",
        identity,
      }),
    ).rejects.toThrow("learning_v2_native_pcm_decoder_invalid");
  });
});
