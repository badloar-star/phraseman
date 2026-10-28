const mockFiles = new Map<string, Uint8Array>();
let mockFailPartCommit = false;

class MockDirectory {
  uri: string;
  constructor(base: { uri?: string } | string, ...parts: string[]) {
    const root = typeof base === "string" ? base : (base.uri ?? "");
    this.uri = [root.replace(/\/$/u, ""), ...parts].join("/");
  }
  get exists() {
    return (
      this.uri === "file:///documents/learning-v2-audio-v1" ||
      [...mockFiles.keys()].some((key) => key.startsWith(`${this.uri}/`))
    );
  }
  get name() {
    return this.uri.split("/").at(-1) ?? "";
  }
  create() {}
  list() {
    const entries = new Map<string, MockDirectory | MockFile>();
    for (const key of mockFiles.keys()) {
      if (!key.startsWith(`${this.uri}/`)) continue;
      const relative = key.slice(this.uri.length + 1);
      const [first, ...rest] = relative.split("/");
      if (!first) continue;
      entries.set(
        first,
        rest.length
          ? new MockDirectory(this, first)
          : new MockFile(this, first),
      );
    }
    return [...entries.values()];
  }
}

class MockFile {
  uri: string;
  constructor(base: { uri?: string } | string, ...parts: string[]) {
    const root = typeof base === "string" ? base : (base.uri ?? "");
    this.uri = parts.length
      ? [root.replace(/\/$/u, ""), ...parts].join("/")
      : root;
  }
  get exists() {
    return mockFiles.has(this.uri);
  }
  get size() {
    return mockFiles.get(this.uri)?.length ?? 0;
  }
  get name() {
    return this.uri.split("/").at(-1) ?? "";
  }
  async bytes() {
    return Uint8Array.from(mockFiles.get(this.uri) ?? []);
  }
  write(bytes: Uint8Array) {
    mockFiles.set(this.uri, Uint8Array.from(bytes));
  }
  move(destination: MockFile) {
    if (
      mockFailPartCommit &&
      this.uri.includes(".part-") &&
      !destination.uri.includes(".part-")
    ) {
      mockFailPartCommit = false;
      throw new Error("injected_part_commit_failure");
    }
    const bytes = mockFiles.get(this.uri);
    if (bytes) mockFiles.set(destination.uri, bytes);
    mockFiles.delete(this.uri);
    this.uri = destination.uri; // Expo File.move mutates the source object's URI.
  }
  delete() {
    mockFiles.delete(this.uri);
  }
}

jest.mock("expo-file-system", () => ({
  Directory: MockDirectory,
  File: MockFile,
  Paths: { document: "file:///documents" },
}));
jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
  digest: jest.fn(),
}));

import { ExpoLearningV2AudioIo } from "../modules/learning-v2/audio/progressive_audio_runtime";

beforeEach(() => {
  mockFiles.clear();
  mockFailPartCommit = false;
});

test("atomic replacement survives Expo File.move mutating the source URI", async () => {
  const io = new ExpoLearningV2AudioIo();
  await io.writeAtomic("state.v1.json", Uint8Array.from([1, 2, 3]));
  await io.writeAtomic("state.v1.json", Uint8Array.from([4, 5]));
  expect(await io.read("state.v1.json")).toEqual(Uint8Array.from([4, 5]));
  expect([...mockFiles.keys()].some((key) => key.endsWith(".previous"))).toBe(
    false,
  );
});

test("failed part commit restores the previous file and leaves no recovery artifact", async () => {
  const io = new ExpoLearningV2AudioIo();
  await io.writeAtomic(
    "targets/es/active-manifest.json",
    Uint8Array.from([7, 8, 9]),
  );
  mockFailPartCommit = true;
  await expect(
    io.writeAtomic(
      "targets/es/active-manifest.json",
      Uint8Array.from([10, 11]),
    ),
  ).rejects.toThrow("injected_part_commit_failure");
  expect(await io.read("targets/es/active-manifest.json")).toEqual(
    Uint8Array.from([7, 8, 9]),
  );
  expect(
    [...mockFiles.keys()].some(
      (key) => key.includes(".part-") || key.endsWith(".previous"),
    ),
  ).toBe(false);
});

test("startup restores a crash-left backup before recursively deleting part files", async () => {
  const root = "file:///documents/learning-v2-audio-v1";
  mockFiles.set(
    `${root}/targets/es/clips/${"a".repeat(64)}.mp3.previous`,
    Uint8Array.from([1, 2, 3]),
  );
  mockFiles.set(
    `${root}/targets/es/clips/${"a".repeat(64)}.mp3.part-crash`,
    Uint8Array.from([9, 9]),
  );
  mockFiles.set(
    `${root}/targets/es/releases/r/lesson-1.json.part-crash`,
    Uint8Array.from([8, 8]),
  );
  const io = new ExpoLearningV2AudioIo();
  expect(await io.read(`targets/es/clips/${"a".repeat(64)}.mp3`)).toEqual(
    Uint8Array.from([1, 2, 3]),
  );
  expect(
    [...mockFiles.keys()].some(
      (key) => key.includes(".part-") || key.endsWith(".previous"),
    ),
  ).toBe(false);
});
