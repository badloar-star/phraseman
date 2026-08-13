const mockDecode = jest.fn();
const mockCreateAudioPlayer = jest.fn();
const mockResolveCache = jest.fn();

jest.mock("expo-audio", () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
}));

jest.mock("../modules/learning-v2-pcm-decoder", () => ({
  LEARNING_V2_NATIVE_PCM_FILE_MAX_BYTES_V1: 64 * 1024,
  decodeLearningV2NativePcmSignalV1: (...args: unknown[]) =>
    mockDecode(...args),
}));

jest.mock(
  "../modules/learning-v2/runtime/voice_audio_offline_cache_v1",
  () => ({
    resolveLearningV2VoiceAudioOfflineCacheMaterialV1: (...args: unknown[]) =>
      mockResolveCache(...args),
  }),
);

/* eslint-disable import/first -- runtime ports must be mocked before import */
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_PHYSICAL_AUDIO_RUN_UPDATE_INTERVAL_MS_V1,
  runLearningV2CachedAudioDeviceCheckV1,
  runLearningV2ExactLocalAudioDeviceCheckV1,
} from "../modules/learning-v2/runtime/voice_physical_device_runner_v1";
/* eslint-enable import/first */

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

const pcmObservation = Object.freeze({
  schemaVersion: "learning-v2-pcm-signal-observer.v1" as const,
  observationFingerprint: h("pcm-observation"),
});

type PlaybackCallback = (status: Record<string, unknown>) => void;

function installSuccessfulPlayer(): {
  readonly pause: jest.Mock;
  readonly remove: jest.Mock;
} {
  let callback: PlaybackCallback | null = null;
  const pause = jest.fn();
  const remove = jest.fn();
  const emit = (status: Record<string, unknown>) => callback?.(status);
  const base = {
    id: 1,
    mute: false,
    loop: false,
    isBuffering: false,
    playbackRate: 1,
    shouldCorrectPitch: true,
    timeControlStatus: "paused",
    reasonForWaitingToPlay: "",
  };
  const player = {
    currentStatus: {
      ...base,
      currentTime: 0,
      duration: 0,
      playing: false,
      playbackState: "unknown",
      didJustFinish: false,
      isLoaded: false,
    },
    addListener: jest.fn((_event: string, listener: PlaybackCallback) => {
      callback = listener;
      queueMicrotask(() =>
        emit({
          ...base,
          currentTime: 0,
          duration: 0.9,
          playing: false,
          playbackState: "readyToPlay",
          didJustFinish: false,
          isLoaded: true,
        }),
      );
      return { remove: jest.fn(() => (callback = null)) };
    }),
    seekTo: jest.fn(async () => undefined),
    play: jest.fn(() => {
      queueMicrotask(() =>
        emit({
          ...base,
          timeControlStatus: "playing",
          currentTime: 0,
          duration: 0.9,
          playing: true,
          playbackState: "readyToPlay",
          didJustFinish: false,
          isLoaded: true,
        }),
      );
      queueMicrotask(() =>
        emit({
          ...base,
          timeControlStatus: "playing",
          currentTime: 0.12,
          duration: 0.9,
          playing: true,
          playbackState: "readyToPlay",
          didJustFinish: false,
          isLoaded: true,
        }),
      );
      queueMicrotask(() =>
        emit({
          ...base,
          currentTime: 0.9,
          duration: 0.9,
          playing: false,
          playbackState: "readyToPlay",
          didJustFinish: true,
          isLoaded: true,
        }),
      );
    }),
    pause,
    remove,
  };
  mockCreateAudioPlayer.mockReturnValue(player);
  return { pause, remove };
}

describe("Learning V2 exact local audio device runner", () => {
  beforeEach(() => {
    mockCreateAudioPlayer.mockReset();
    mockDecode.mockReset();
    mockResolveCache.mockReset();
  });

  it("plays and PCM-decodes the same exact local object without minting release evidence", async () => {
    const cleanup = installSuccessfulPlayer();
    mockDecode.mockImplementation(async ({ identity: pcmIdentity }) => ({
      ...pcmObservation,
      itemIndex: pcmIdentity.itemIndex,
      contentHash: pcmIdentity.contentHash,
      decoderStatusSequenceFingerprint:
        pcmIdentity.decoderStatusSequenceFingerprint,
    }));

    const result = await runLearningV2ExactLocalAudioDeviceCheckV1({
      fileUri: "file:///private/var/mobile/voice.mp3",
      identity,
    });

    expect(mockCreateAudioPlayer).toHaveBeenCalledWith(
      { uri: "file:///private/var/mobile/voice.mp3" },
      {
        updateInterval: LEARNING_V2_PHYSICAL_AUDIO_RUN_UPDATE_INTERVAL_MS_V1,
        downloadFirst: false,
        keepAudioSessionActive: true,
      },
    );
    expect(mockDecode).toHaveBeenCalledWith({
      fileUri: "file:///private/var/mobile/voice.mp3",
      identity: expect.objectContaining({
        ...identity,
        decoderStatusSequenceFingerprint:
          result.playbackObservation.statusSequenceFingerprint,
      }),
    });
    expect(result).toMatchObject({
      runClass: "physical_device_machine_run",
      exactObjectBinding: "same_local_file_identity_for_playback_and_pcm",
      playbackExecutionAuthority: "unverified_local_system_playback",
      pcmDecodeAuthority: "unverified_local_system_decode",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(result.runFingerprint).toMatch(/^[a-f0-9]{64}$/u);
    expect(cleanup.pause).toHaveBeenCalledTimes(1);
    expect(cleanup.remove).toHaveBeenCalledTimes(1);
  });

  it.each([
    { fileUri: "https://example.test/voice.mp3", identity },
    { fileUri: "file:///tmp/../voice.mp3", identity },
    {
      fileUri: "file:///tmp/voice.mp3",
      identity: { ...identity, byteSize: 64 * 1024 + 1 },
    },
    {
      fileUri: "file:///tmp/voice.mp3",
      identity: { ...identity, hidden: true },
    },
  ])("rejects an invalid request before creating a player", async (input) => {
    await expect(
      runLearningV2ExactLocalAudioDeviceCheckV1(input as never),
    ).rejects.toThrow("learning_v2_physical_audio_run_invalid");
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
    expect(mockDecode).not.toHaveBeenCalled();
  });

  it("cleans up playback and refuses a drifted PCM observation", async () => {
    const cleanup = installSuccessfulPlayer();
    mockDecode.mockRejectedValue(new Error("pcm drift"));

    await expect(
      runLearningV2ExactLocalAudioDeviceCheckV1({
        fileUri: "file:///tmp/voice.mp3",
        identity,
      }),
    ).rejects.toThrow("learning_v2_physical_audio_run_invalid");
    expect(cleanup.pause).toHaveBeenCalledTimes(1);
    expect(cleanup.remove).toHaveBeenCalledTimes(1);
  });

  it("runs only an opaque cache material bound to the same exact identity", async () => {
    installSuccessfulPlayer();
    const cacheSummary = Object.freeze({
      schemaVersion: "learning-v2-voice-audio-offline-cache.v1" as const,
      summaryFingerprint: h("cache-summary"),
    });
    mockResolveCache.mockReturnValue({
      fileUri: "file:///cache/exact.mp3",
      identity,
      summary: cacheSummary,
    });
    mockDecode.mockResolvedValue(pcmObservation);
    const cacheHandle = Object.freeze({});

    const result = await runLearningV2CachedAudioDeviceCheckV1({
      cacheHandle: cacheHandle as never,
      identity,
    });

    expect(mockResolveCache).toHaveBeenCalledWith({
      handle: cacheHandle,
      identity,
    });
    expect(result).toMatchObject({
      cacheSummary,
      cacheToRunBinding: "opaque_exact_cache_handle_same_identity",
      repositoryOriginAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(result.cachedRunFingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects a forged cache handle before creating the native player", async () => {
    mockResolveCache.mockImplementation(() => {
      throw new Error("forged");
    });
    await expect(
      runLearningV2CachedAudioDeviceCheckV1({
        cacheHandle: {} as never,
        identity,
      }),
    ).rejects.toThrow("learning_v2_physical_audio_run_invalid");
    expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
  });
});
