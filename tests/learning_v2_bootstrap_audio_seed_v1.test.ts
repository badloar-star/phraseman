const bootstrapBytes = new Uint8Array([1, 2, 3, 4]);
const bootstrapHash = "a".repeat(64);
const bootstrapHandle = Object.freeze({ bootstrap: true });
const assetDownload = jest.fn(async () => undefined);
const assetLoad = jest.fn(async () => undefined);
const prepareBytes = jest.fn(async ({ loadBytes }: { loadBytes: () => Promise<Uint8Array> }) => {
  expect(await loadBytes()).toEqual(bootstrapBytes);
  return bootstrapHandle;
});
const resolvePrepared = jest.fn(async () => null);

jest.mock("../app/learning_v2_bootstrap_audio_assets_v1.generated", () => ({
  LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1: Object.freeze([
    Object.freeze({
      transcript: "ready",
      voiceId: "ash",
      contentHash: bootstrapHash,
      byteSize: bootstrapBytes.byteLength,
      assetModule: 101,
    }),
  ]),
}));
jest.mock("expo-asset", () => ({
  Asset: {
    loadAsync: (modules: readonly number[]) => assetLoad(modules),
    fromModule: () => ({
      localUri: "file:///bootstrap.mp3",
      uri: "file:///bootstrap.mp3",
      downloadAsync: assetDownload,
    }),
  },
}));
jest.mock("expo-file-system", () => ({
  File: class MockFile {
    async bytes(): Promise<Uint8Array> {
      return bootstrapBytes;
    }
  },
}));
jest.mock("../modules/learning-v2/runtime/voice_audio_offline_cache_v1", () => ({
  prepareLearningV2VoiceAudioOfflineBytesV1: (input: unknown) => prepareBytes(input),
  resolvePreparedLearningV2VoiceAudioOfflineFileV1: (identity: unknown) => resolvePrepared(identity),
}));
jest.mock("../app/learning_v2_factory_production_audio_v1", () => ({
  learningV2FactoryRemoteAudioFilesForContentHashesV1: () => [Object.freeze({
    contentHash: bootstrapHash,
    byteSize: bootstrapBytes.byteLength,
  })],
}));
jest.mock("../app/learning_v2_audio_identity_v1", () => ({
  learningV2NativeDecoderIdentityForAudioFileV1: () => identity,
}));

/* eslint-disable import/first -- native asset and cache seams are mocked first */
import {
  preloadLearningV2BootstrapAudioAssetsV1,
  resolveLearningV2BootstrapAudioOfflineFileV1,
  seedLearningV2BootstrapAudioCacheV1,
} from "../app/learning_v2_bootstrap_audio_seed_v1";
/* eslint-enable import/first */

const identity = Object.freeze({ contentHash: bootstrapHash, byteSize: 4 });

describe("Learning V2 bundled bootstrap audio", () => {
  beforeEach(() => {
    assetDownload.mockClear();
    assetLoad.mockClear();
    prepareBytes.mockClear();
    resolvePrepared.mockClear();
  });

  it("prewarms every bundled asset without network transport", async () => {
    await preloadLearningV2BootstrapAudioAssetsV1();
    expect(assetLoad).toHaveBeenCalledWith([101]);
  });

  it("seeds every bundled asset into the immutable durable cache at app boot", async () => {
    await seedLearningV2BootstrapAudioCacheV1();
    expect(assetLoad).toHaveBeenCalledWith([101]);
    expect(prepareBytes).toHaveBeenCalledTimes(1);
  });

  it("materializes an exact bootstrap file through the immutable local cache", async () => {
    await expect(resolveLearningV2BootstrapAudioOfflineFileV1(identity as never))
      .resolves.toBe(bootstrapHandle);
    expect(assetDownload).toHaveBeenCalledTimes(1);
    expect(prepareBytes).toHaveBeenCalledTimes(1);
  });

  it("returns null for audio outside the bootstrap inventory", async () => {
    await expect(resolveLearningV2BootstrapAudioOfflineFileV1({
      ...identity,
      contentHash: "b".repeat(64),
    } as never)).resolves.toBeNull();
    expect(assetDownload).not.toHaveBeenCalled();
    expect(prepareBytes).not.toHaveBeenCalled();
  });
});
