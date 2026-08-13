const mockPrepare = jest.fn();
const mockSummary = jest.fn();
const mockRun = jest.fn();

jest.mock(
  "../modules/learning-v2/runtime/voice_audio_offline_cache_v1",
  () => ({
    prepareLearningV2VoiceAudioOfflineFileV1: (...args: unknown[]) =>
      mockPrepare(...args),
    getLearningV2VoiceAudioOfflineCacheSummaryV1: (...args: unknown[]) =>
      mockSummary(...args),
  }),
);

jest.mock(
  "../modules/learning-v2/runtime/voice_physical_device_runner_v1",
  () => ({
    runLearningV2CachedAudioDeviceCheckV1: (...args: unknown[]) =>
      mockRun(...args),
  }),
);

/* eslint-disable import/first -- cache and device ports are mocked first */
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_VOICE_AUDIO_PAGE_CACHE_MAX_CONCURRENCY_V1,
  runLearningV2VoiceAudioManifestPageV1,
} from "../modules/learning-v2/runtime/voice_audio_manifest_page_runner_v1";
/* eslint-enable import/first */

const h = (value: unknown) => hashCanonicalBody(value);
const identity = (itemIndex: number) =>
  Object.freeze({
    itemIndex,
    generationTargetFingerprint: h(["generation", itemIndex]),
    entryFingerprint: h(["entry", itemIndex]),
    objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h(["generation", itemIndex])}/${h(["audio", itemIndex])}.mp3`,
    contentHash: h(["audio", itemIndex]),
    objectGeneration: String(itemIndex + 1),
    byteSize: 10_000,
    platform: "ios" as const,
    deviceClass: "physical_device" as const,
    osVersion: "18.6",
    appBuildFingerprint: h("build"),
    expoAudioVersion: "1.1.1" as const,
  });

function installSuccess(identities: readonly ReturnType<typeof identity>[]) {
  const handles = identities.map((value) =>
    Object.freeze({ item: value.itemIndex }),
  );
  mockPrepare.mockImplementation(
    async ({ identity: value }) =>
      handles[value.itemIndex - identities[0]!.itemIndex],
  );
  mockSummary.mockImplementation((handle) => ({
    summaryFingerprint: h(["cache", handle.item]),
  }));
  mockRun.mockImplementation(async ({ cacheHandle, identity: value }) => ({
    cacheSummary: { summaryFingerprint: h(["cache", cacheHandle.item]) },
    deviceRun: {
      playbackObservation: {
        itemIndex: value.itemIndex,
        entryFingerprint: value.entryFingerprint,
        generationTargetFingerprint: value.generationTargetFingerprint,
      },
    },
    cachedRunFingerprint: h(["run", value.itemIndex]),
  }));
  return handles;
}

describe("Learning V2 voice audio manifest page runner", () => {
  beforeEach(() => {
    mockPrepare.mockReset();
    mockSummary.mockReset();
    mockRun.mockReset();
  });

  it("prepares all exact objects before playing them sequentially in manifest order", async () => {
    const identities = [identity(4), identity(5), identity(6)];
    installSuccess(identities);
    const order: string[] = [];
    mockPrepare.mockImplementation(async ({ identity: value }) => {
      order.push(`cache-start-${value.itemIndex}`);
      await Promise.resolve();
      order.push(`cache-end-${value.itemIndex}`);
      return Object.freeze({ item: value.itemIndex });
    });
    mockSummary.mockImplementation((handle) => ({
      summaryFingerprint: h(["cache", handle.item]),
    }));
    mockRun.mockImplementation(async ({ cacheHandle, identity: value }) => {
      order.push(`play-${value.itemIndex}`);
      return {
        cacheSummary: {
          summaryFingerprint: h(["cache", cacheHandle.item]),
        },
        deviceRun: {
          playbackObservation: {
            itemIndex: value.itemIndex,
            entryFingerprint: value.entryFingerprint,
            generationTargetFingerprint: value.generationTargetFingerprint,
          },
        },
        cachedRunFingerprint: h(["run", value.itemIndex]),
      };
    });

    const result = await runLearningV2VoiceAudioManifestPageV1({
      pageStartIndex: 4,
      identities,
      resolveSourceUrl: async (value) =>
        `https://storage.googleapis.com/phraseman-ea0b3.firebasestorage.app/${value.objectPath}`,
    });

    const firstPlay = order.findIndex((value) => value.startsWith("play-"));
    expect(order.slice(0, firstPlay)).toEqual(
      expect.arrayContaining(["cache-end-4", "cache-end-5", "cache-end-6"]),
    );
    expect(order.slice(firstPlay)).toEqual(["play-4", "play-5", "play-6"]);
    expect(result).toMatchObject({
      pageStartIndex: 4,
      pageItemCount: 3,
      cacheExecution: "preflight_all_then_bounded_concurrency_max_4",
      playbackExecution: "strict_manifest_order_after_complete_cache",
      transportUrlEvidenceAuthority: "none_not_retained",
      deviceEvidenceAuthority: "none",
      releaseEligible: false,
    });
    expect(JSON.stringify(result)).not.toContain("https://");
  });

  it("never starts playback when any cache preparation fails", async () => {
    const identities = [identity(0), identity(1), identity(2)];
    mockPrepare.mockImplementation(async ({ identity: value }) => {
      if (value.itemIndex === 1) throw new Error("download failed");
      return Object.freeze({ item: value.itemIndex });
    });
    await expect(
      runLearningV2VoiceAudioManifestPageV1({
        pageStartIndex: 0,
        identities,
        resolveSourceUrl: async (value) =>
          `https://storage.googleapis.com/phraseman-ea0b3.firebasestorage.app/${value.objectPath}`,
      }),
    ).rejects.toThrow("learning_v2_voice_audio_page_run_invalid");
    expect(mockRun).not.toHaveBeenCalled();
  });

  it("uses no more than four concurrent cache operations", async () => {
    const identities = Array.from({ length: 12 }, (_, index) =>
      identity(index),
    );
    let active = 0;
    let maximum = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    mockPrepare.mockImplementation(async ({ identity: value }) => {
      active += 1;
      maximum = Math.max(maximum, active);
      if (
        value.itemIndex < LEARNING_V2_VOICE_AUDIO_PAGE_CACHE_MAX_CONCURRENCY_V1
      )
        await gate;
      active -= 1;
      return Object.freeze({ item: value.itemIndex });
    });
    mockSummary.mockImplementation((handle) => ({
      summaryFingerprint: h(["cache", handle.item]),
    }));
    mockRun.mockImplementation(async ({ cacheHandle, identity: value }) => ({
      cacheSummary: { summaryFingerprint: h(["cache", cacheHandle.item]) },
      deviceRun: {
        playbackObservation: {
          itemIndex: value.itemIndex,
          entryFingerprint: value.entryFingerprint,
          generationTargetFingerprint: value.generationTargetFingerprint,
        },
      },
      cachedRunFingerprint: h(["run", value.itemIndex]),
    }));
    const run = runLearningV2VoiceAudioManifestPageV1({
      pageStartIndex: 0,
      identities,
      resolveSourceUrl: async (value) =>
        `https://storage.googleapis.com/phraseman-ea0b3.firebasestorage.app/${value.objectPath}`,
    });
    await Promise.resolve();
    expect(maximum).toBe(4);
    release();
    await run;
    expect(maximum).toBe(4);
  });

  it.each([
    [0, []],
    [0, Array.from({ length: 33 }, (_, index) => identity(index))],
    [0, [identity(0), identity(2)]],
    [0, [identity(0), { ...identity(1), platform: "android" }]],
    [
      0,
      [
        identity(0),
        { ...identity(1), entryFingerprint: identity(0).entryFingerprint },
      ],
    ],
  ])(
    "rejects invalid page coordinates before cache I/O",
    async (start, identities) => {
      await expect(
        runLearningV2VoiceAudioManifestPageV1({
          pageStartIndex: start,
          identities: identities as never,
          resolveSourceUrl: async () => "https://example.test",
        }),
      ).rejects.toThrow("learning_v2_voice_audio_page_run_invalid");
      expect(mockPrepare).not.toHaveBeenCalled();
    },
  );

  it("rejects cache-to-device identity drift", async () => {
    const identities = [identity(0)];
    installSuccess(identities);
    mockRun.mockResolvedValue({
      cacheSummary: { summaryFingerprint: h(["cache", 0]) },
      deviceRun: {
        playbackObservation: {
          itemIndex: 0,
          entryFingerprint: h("wrong"),
          generationTargetFingerprint:
            identities[0]!.generationTargetFingerprint,
        },
      },
      cachedRunFingerprint: h(["run", 0]),
    });
    await expect(
      runLearningV2VoiceAudioManifestPageV1({
        pageStartIndex: 0,
        identities,
        resolveSourceUrl: async (value) =>
          `https://storage.googleapis.com/phraseman-ea0b3.firebasestorage.app/${value.objectPath}`,
      }),
    ).rejects.toThrow("learning_v2_voice_audio_page_run_invalid");
  });
});
