import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1,
  observeLearningV2NativeDecoderPlaybackV1,
} from "../modules/learning-v2/runtime/voice_native_decoder_observer_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const identity = Object.freeze({
  itemIndex: 0,
  generationTargetFingerprint: h("generation"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("audio")}.mp3`,
  contentHash: h("audio"),
  objectGeneration: "7",
  byteSize: 10_000,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
});
const statuses = Object.freeze([
  Object.freeze({
    sequenceOrdinal: 1,
    elapsedMs: 1,
    isLoaded: false,
    playing: false,
    playbackState: "unknown" as const,
    currentTimeMs: 0,
    durationMs: 0,
    didJustFinish: false,
  }),
  Object.freeze({
    sequenceOrdinal: 2,
    elapsedMs: 20,
    isLoaded: true,
    playing: false,
    playbackState: "readyToPlay" as const,
    currentTimeMs: 0,
    durationMs: 900,
    didJustFinish: false,
  }),
  Object.freeze({
    sequenceOrdinal: 3,
    elapsedMs: 30,
    isLoaded: true,
    playing: true,
    playbackState: "readyToPlay" as const,
    currentTimeMs: 0,
    durationMs: 900,
    didJustFinish: false,
  }),
  Object.freeze({
    sequenceOrdinal: 4,
    elapsedMs: 150,
    isLoaded: true,
    playing: true,
    playbackState: "readyToPlay" as const,
    currentTimeMs: 120,
    durationMs: 900,
    didJustFinish: false,
  }),
  Object.freeze({
    sequenceOrdinal: 5,
    elapsedMs: 940,
    isLoaded: true,
    playing: false,
    playbackState: "readyToPlay" as const,
    currentTimeMs: 900,
    durationMs: 900,
    didJustFinish: true,
  }),
]);

describe("Learning V2 code-owned native decoder observer", () => {
  it("derives the exact decoder observation from an ordered Expo Audio status trace", () => {
    const result = observeLearningV2NativeDecoderPlaybackV1({
      identity,
      statuses,
    });
    expect(result).toMatchObject({
      nativeDecoderFamily: "avplayer",
      loadedDurationMs: 900,
      firstPlayingPositionMs: 0,
      maximumObservedPositionMs: 900,
      finalPositionMs: 900,
      statusCount: 5,
      didJustFinishObserved: true,
      interruptionCount: 0,
      errorCode: null,
    });
    expect(result.statusSequenceFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(
      LEARNING_V2_NATIVE_DECODER_OBSERVER_POLICY_V1.ref.contentHash,
    ).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    [statuses.slice(0, 4)],
    [statuses.map((status) => ({ ...status, playing: false }))],
    [
      statuses.map((status, index) =>
        index === 3 ? { ...status, currentTimeMs: 0 } : status,
      ),
    ],
    [
      statuses.map((status, index) =>
        index === 4 ? { ...status, didJustFinish: false } : status,
      ),
    ],
    [
      statuses.map((status, index) =>
        index === 4 ? { ...status, playbackState: "failed" as const } : status,
      ),
    ],
    [
      statuses.map((status, index) =>
        index === 3 ? { ...status, durationMs: 901 } : status,
      ),
    ],
    [
      statuses.map((status, index) =>
        index === 3 ? { ...status, sequenceOrdinal: 99 } : status,
      ),
    ],
    [
      statuses.map((status, index) =>
        index === 3 ? { ...status, elapsedMs: 20 } : status,
      ),
    ],
  ])(
    "rejects incomplete, non-progressing, error, drifted or reordered traces",
    (trace) => {
      expect(() =>
        observeLearningV2NativeDecoderPlaybackV1({
          identity,
          statuses: trace as never,
        }),
      ).toThrow("learning_v2_native_decoder_observation_invalid");
    },
  );

  it("binds platform, device class, build and exact object identity into the trace fingerprint", () => {
    const ios = observeLearningV2NativeDecoderPlaybackV1({
      identity,
      statuses,
    });
    const android = observeLearningV2NativeDecoderPlaybackV1({
      identity: {
        itemIndex: identity.itemIndex,
        generationTargetFingerprint: identity.generationTargetFingerprint,
        entryFingerprint: identity.entryFingerprint,
        objectPath: identity.objectPath,
        contentHash: identity.contentHash,
        objectGeneration: identity.objectGeneration,
        byteSize: identity.byteSize,
        platform: "android",
        deviceClass: identity.deviceClass,
        osVersion: "15",
        appBuildFingerprint: identity.appBuildFingerprint,
        expoAudioVersion: identity.expoAudioVersion,
      },
      statuses: statuses.map((status, index) => ({
        ...status,
        playbackState:
          index === 0
            ? ("buffering" as const)
            : index === statuses.length - 1
              ? ("ended" as const)
              : ("ready" as const),
      })),
    });
    expect(android.nativeDecoderFamily).toBe("exoplayer");
    expect(android.statusSequenceFingerprint).not.toBe(
      ios.statusSequenceFingerprint,
    );
  });

  it("rejects unknown identity and status fields", () => {
    expect(() =>
      observeLearningV2NativeDecoderPlaybackV1({
        identity: { ...identity, hidden: true } as never,
        statuses,
      }),
    ).toThrow("learning_v2_native_decoder_observation_invalid");
    expect(() =>
      observeLearningV2NativeDecoderPlaybackV1({
        identity,
        statuses: statuses.map((status, index) =>
          index === 2 ? ({ ...status, hidden: true } as never) : status,
        ),
      }),
    ).toThrow("learning_v2_native_decoder_observation_invalid");
  });
});
