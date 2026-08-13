import { createHash } from "node:crypto";

const files = new Map<string, Uint8Array>();
const mockDownload = jest.fn();

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: async (_algorithm: string, data: Uint8Array) => {
    const bytes = createHash("sha256").update(data).digest();
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
  },
}));

jest.mock("expo-file-system", () => {
  class MockDirectory {
    readonly uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts
        .map((part) => (typeof part === "string" ? part : part.uri))
        .join("/")
        .replace(/\/+$/u, "");
    }
    get exists(): boolean {
      return true;
    }
    create(): void {}
    list(): MockFile[] {
      return Array.from(files.keys())
        .filter((uri) => uri.startsWith(`${this.uri}/`))
        .map((uri) => new MockFile(uri));
    }
  }
  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts
        .map((part) => (typeof part === "string" ? part : part.uri))
        .join("/");
    }
    get exists(): boolean {
      return files.has(this.uri);
    }
    get size(): number {
      return files.get(this.uri)?.byteLength ?? 0;
    }
    get modificationTime(): number {
      return 1;
    }
    get creationTime(): number {
      return 1;
    }
    async bytes(): Promise<Uint8Array> {
      const value = files.get(this.uri);
      if (!value) throw new Error("missing");
      return new Uint8Array(value);
    }
    delete(): void {
      files.delete(this.uri);
    }
    move(destination: MockFile): void {
      const value = files.get(this.uri);
      if (!value) throw new Error("missing");
      files.set(destination.uri, new Uint8Array(value));
      files.delete(this.uri);
      this.uri = destination.uri;
    }
    write(value: Uint8Array): void {
      files.set(this.uri, new Uint8Array(value));
    }
    static downloadFileAsync(
      url: string,
      destination: MockFile,
      options: unknown,
    ): Promise<MockFile> {
      return mockDownload(url, destination, options);
    }
  }
  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { cache: { uri: "file:///cache" } },
  };
});

/* eslint-disable import/first -- native file and crypto ports are mocked first */
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  getLearningV2VoiceAudioOfflineCacheSummaryV1,
  isLearningV2VoiceAudioOfflineCacheHandleV1,
  prepareLearningV2VoiceAudioOfflineBytesV1,
  prepareLearningV2VoiceAudioOfflineFileV1,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";
/* eslint-enable import/first */

const bytes = new TextEncoder().encode("bounded fake mp3 bytes");
const contentHash = createHash("sha256").update(bytes).digest("hex");
const h = (value: unknown) => hashCanonicalBody(value);
const identity = Object.freeze({
  itemIndex: 0,
  generationTargetFingerprint: h("generation"),
  entryFingerprint: h("entry"),
  objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("generation")}/${contentHash}.mp3`,
  contentHash,
  objectGeneration: "7",
  byteSize: bytes.byteLength,
  platform: "ios" as const,
  deviceClass: "physical_device" as const,
  osVersion: "18.6",
  appBuildFingerprint: h("build"),
  expoAudioVersion: "1.1.1" as const,
});
const sourceUrl = `https://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/${encodeURIComponent(identity.objectPath)}?alt=media&token=test-only`;
const finalUri = `file:///cache/learning-v2-voice-audio-v1/${contentHash}.mp3`;

describe("Learning V2 exact offline voice-audio cache", () => {
  beforeEach(() => {
    files.clear();
    mockDownload.mockReset();
  });

  it("downloads to a temporary file, verifies exact bytes twice and returns an opaque handle", async () => {
    mockDownload.mockImplementation(
      async (_url: string, destination: { uri: string }) => {
        files.set(destination.uri, new Uint8Array(bytes));
        return destination;
      },
    );
    const handle = await prepareLearningV2VoiceAudioOfflineFileV1({
      sourceUrl,
      identity,
    });
    expect(isLearningV2VoiceAudioOfflineCacheHandleV1(handle)).toBe(true);
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(files.get(finalUri)).toEqual(bytes);
    expect(getLearningV2VoiceAudioOfflineCacheSummaryV1(handle)).toMatchObject({
      contentHash,
      byteSize: bytes.byteLength,
      cacheDisposition: "downloaded_and_verified",
      localByteEvidence: "exact_sha256_and_byte_size_readback",
      repositoryOriginAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
    });
    expect(
      resolveLearningV2VoiceAudioOfflineCacheMaterialV1({ handle, identity }),
    ).toMatchObject({ fileUri: finalUri, identity });
    expect(() =>
      resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
        handle,
        identity: { ...identity, objectGeneration: "8" },
      }),
    ).toThrow("learning_v2_voice_audio_offline_cache_invalid");
  });

  it("uses an exact cache hit offline without touching the transport", async () => {
    files.set(finalUri, new Uint8Array(bytes));
    const handle = await prepareLearningV2VoiceAudioOfflineFileV1({
      sourceUrl,
      identity,
    });
    expect(mockDownload).not.toHaveBeenCalled();
    expect(
      getLearningV2VoiceAudioOfflineCacheSummaryV1(handle).cacheDisposition,
    ).toBe("exact_cache_hit");
  });

  it("accepts exact authenticated bytes without retaining transport credentials", async () => {
    const loadBytes = jest.fn(async () => new Uint8Array(bytes));
    const handle = await prepareLearningV2VoiceAudioOfflineBytesV1({
      identity,
      loadBytes,
    });
    expect(loadBytes).toHaveBeenCalledTimes(1);
    expect(files.get(finalUri)).toEqual(bytes);
    expect(
      JSON.stringify(getLearningV2VoiceAudioOfflineCacheSummaryV1(handle)),
    ).not.toMatch(/authorization|token|header|sourceUrl/iu);

    const cached = await prepareLearningV2VoiceAudioOfflineBytesV1({
      identity,
      loadBytes: async () => {
        throw new Error("network must stay quiet on an exact cache hit");
      },
    });
    expect(
      getLearningV2VoiceAudioOfflineCacheSummaryV1(cached).cacheDisposition,
    ).toBe("exact_cache_hit");
  });

  it("rejects wrong byte length from an authenticated loader before publishing a handle", async () => {
    await expect(
      prepareLearningV2VoiceAudioOfflineBytesV1({
        identity,
        loadBytes: async () => new Uint8Array([1]),
      }),
    ).rejects.toThrow("learning_v2_voice_audio_offline_cache_invalid");
    expect(files.size).toBe(0);
  });

  it("coalesces concurrent requests for the same immutable bytes", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    mockDownload.mockImplementation(
      async (_url: string, destination: { uri: string }) => {
        await pending;
        files.set(destination.uri, new Uint8Array(bytes));
        return destination;
      },
    );
    const first = prepareLearningV2VoiceAudioOfflineFileV1({
      sourceUrl,
      identity,
    });
    const second = prepareLearningV2VoiceAudioOfflineFileV1({
      sourceUrl,
      identity,
    });
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(left).not.toBe(right);
    expect(
      getLearningV2VoiceAudioOfflineCacheSummaryV1(left).summaryFingerprint,
    ).toBe(
      getLearningV2VoiceAudioOfflineCacheSummaryV1(right).summaryFingerprint,
    );
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  it("deduplicates equal bytes while preserving each manifest entry identity", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => (release = resolve));
    mockDownload.mockImplementation(
      async (_url: string, destination: { uri: string }) => {
        await pending;
        files.set(destination.uri, new Uint8Array(bytes));
        return destination;
      },
    );
    const secondIdentity = {
      ...identity,
      itemIndex: 1,
      entryFingerprint: h("second-entry"),
      generationTargetFingerprint: h("second-generation"),
    };
    const first = prepareLearningV2VoiceAudioOfflineFileV1({
      sourceUrl,
      identity,
    });
    const second = prepareLearningV2VoiceAudioOfflineFileV1({
      sourceUrl,
      identity: secondIdentity,
    });
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(
      resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
        handle: left,
        identity,
      }).fileUri,
    ).toBe(finalUri);
    expect(
      resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
        handle: right,
        identity: secondIdentity,
      }).fileUri,
    ).toBe(finalUri);
    expect(() =>
      resolveLearningV2VoiceAudioOfflineCacheMaterialV1({
        handle: right,
        identity,
      }),
    ).toThrow("learning_v2_voice_audio_offline_cache_invalid");
  });

  it.each([
    "http://firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/x",
    "https://evil.example/voice.mp3",
    "https://user:password@firebasestorage.googleapis.com/v0/b/phraseman-ea0b3.firebasestorage.app/o/x",
  ])("rejects an untrusted transport URL before file I/O", async (badUrl) => {
    await expect(
      prepareLearningV2VoiceAudioOfflineFileV1({
        sourceUrl: badUrl,
        identity,
      }),
    ).rejects.toThrow("learning_v2_voice_audio_offline_cache_invalid");
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("deletes a corrupted download and never returns a cache handle", async () => {
    mockDownload.mockImplementation(
      async (_url: string, destination: { uri: string }) => {
        files.set(destination.uri, new TextEncoder().encode("tampered"));
        return destination;
      },
    );
    await expect(
      prepareLearningV2VoiceAudioOfflineFileV1({ sourceUrl, identity }),
    ).rejects.toThrow("learning_v2_voice_audio_offline_cache_invalid");
    expect(files.size).toBe(0);
  });

  it("rejects path, hash, size and clone drift before download", async () => {
    const cases = [
      { ...identity, objectPath: `learning-v2/voice-audio/${contentHash}.mp3` },
      { ...identity, contentHash: h("forged") },
      { ...identity, byteSize: 64 * 1024 + 1 },
      { ...identity, hidden: true },
    ];
    for (const candidate of cases) {
      await expect(
        prepareLearningV2VoiceAudioOfflineFileV1({
          sourceUrl,
          identity: candidate as never,
        }),
      ).rejects.toThrow("learning_v2_voice_audio_offline_cache_invalid");
    }
    expect(mockDownload).not.toHaveBeenCalled();
  });
});
