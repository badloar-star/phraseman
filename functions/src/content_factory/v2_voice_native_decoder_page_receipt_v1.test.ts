import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const entry = Object.freeze({
  generationTargetFingerprint: h("generation"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("audio")}.mp3`,
  contentHash: h("audio"),
  objectGeneration: "7",
  byteSize: 10_000,
});
const manifest = Object.freeze({
  planFingerprint: h("plan"),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 1,
  sessionManifests: Object.freeze([
    Object.freeze({ entries: Object.freeze([entry]) }),
  ]),
});
const audioEpisodeReceipt = Object.freeze({
  manifestFingerprint: manifest.manifestFingerprint,
  audioObjectCount: manifest.audioObjectCount,
  receiptFingerprint: h("audio-episode-receipt"),
});

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_voice_audio_episode_receipt_v1", () => ({
  isV2VoiceAudioEpisodeReceiptV1: (value: unknown) =>
    value === audioEpisodeReceipt,
}));

// Jest hoists the exact private predicates before this import.
// eslint-disable-next-line import/first
import {
  V2_VOICE_NATIVE_DECODER_POLICY_V1,
  isV2VoiceNativeDecoderPageReceiptV1,
  materializeV2VoiceNativeDecoderPageReceiptV1,
  parseV2VoiceNativeDecoderPageReceiptV1,
  type V2VoiceNativeDecoderObservationV1,
} from "./v2_voice_native_decoder_page_receipt_v1";

function observation(
  platform: "ios" | "android",
  deviceClass: "physical_device" | "simulator_or_emulator",
): V2VoiceNativeDecoderObservationV1 {
  return Object.freeze({
    itemIndex: 0,
    generationTargetFingerprint: entry.generationTargetFingerprint,
    entryFingerprint: entry.entryFingerprint,
    objectPath: entry.objectPath,
    contentHash: entry.contentHash,
    objectGeneration: entry.objectGeneration,
    byteSize: entry.byteSize,
    platform,
    deviceClass,
    osVersion: platform === "ios" ? "18.6" : "15",
    appBuildFingerprint: h(["build", platform]),
    expoAudioVersion: "1.1.1",
    nativeDecoderFamily: platform === "ios" ? "avplayer" : "exoplayer",
    loadedDurationMs: 900,
    firstPlayingPositionMs: 0,
    maximumObservedPositionMs: 850,
    finalPositionMs: 900,
    statusCount: 7,
    statusSequenceFingerprint: h(["loaded", "playing", "progress", "finish"]),
    didJustFinishObserved: true,
    interruptionCount: 0,
    errorCode: null,
  });
}

describe("Learning V2 native decoder observation page receipt", () => {
  it.each([
    ["ios", "physical_device"],
    ["android", "physical_device"],
    ["ios", "simulator_or_emulator"],
  ] as const)(
    "binds an exact %s %s observed playback without minting device or release authority",
    (platform, deviceClass) => {
      const result = materializeV2VoiceNativeDecoderPageReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        platform,
        deviceClass,
        pageStartIndex: 0,
        observations: [observation(platform, deviceClass)],
      });
      expect(result.decoderPolicyRef).toEqual(
        V2_VOICE_NATIVE_DECODER_POLICY_V1.ref,
      );
      expect(result.rows[0].observationClass).toBe(
        deviceClass === "physical_device"
          ? "physical_device_machine_decoder_observation"
          : "simulator_machine_decoder_observation_non_release",
      );
      expect(result.decoderEvidenceAuthority).toBe(
        "unverified_serialized_device_observation",
      );
      expect(result.listeningEvidenceAuthority).toBe("none");
      expect(result.deviceEvidenceAuthority).toBe("none");
      expect(result.releaseEligible).toBe(false);
      expect(isV2VoiceNativeDecoderPageReceiptV1(result)).toBe(true);
      const parsed = parseV2VoiceNativeDecoderPageReceiptV1({
        raw: canonicalJsonV1(result),
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
      });
      expect(parsed.receiptFingerprint).toBe(result.receiptFingerprint);
      expect(isV2VoiceNativeDecoderPageReceiptV1({ ...result })).toBe(false);
    },
  );

  it.each([
    { loadedDurationMs: 0 },
    { maximumObservedPositionMs: 0 },
    { finalPositionMs: 0 },
    { didJustFinishObserved: false },
    { interruptionCount: 1 },
    { errorCode: "decode_failed" },
    { expoAudioVersion: "1.2.0" },
    { nativeDecoderFamily: "exoplayer" },
    { contentHash: h("other-audio") },
  ])(
    "rejects incomplete, interrupted, foreign or pin-drift observations",
    (drift) => {
      expect(() =>
        materializeV2VoiceNativeDecoderPageReceiptV1({
          manifest: manifest as never,
          audioEpisodeReceipt: audioEpisodeReceipt as never,
          platform: "ios",
          deviceClass: "physical_device",
          pageStartIndex: 0,
          observations: [
            { ...observation("ios", "physical_device"), ...drift } as never,
          ],
        }),
      ).toThrow("v2_voice_native_decoder_page_receipt_invalid");
    },
  );

  it("rejects hostile depth before canonical reconstruction", () => {
    const raw = `${"[".repeat(1_000)}0${"]".repeat(1_000)}`;
    expect(() =>
      parseV2VoiceNativeDecoderPageReceiptV1({
        raw,
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
      }),
    ).toThrow("v2_voice_native_decoder_page_receipt_invalid");
  });

  it("rejects unknown observation fields", () => {
    expect(() =>
      materializeV2VoiceNativeDecoderPageReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        platform: "ios",
        deviceClass: "physical_device",
        pageStartIndex: 0,
        observations: [
          { ...observation("ios", "physical_device"), hidden: true } as never,
        ],
      }),
    ).toThrow("v2_voice_native_decoder_page_receipt_invalid");
  });
});
