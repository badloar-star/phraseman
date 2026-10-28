import { createHash } from "node:crypto";
import {
  LearningV2AudioTransportError,
  createCloudflareR2LearningV2AudioTransport,
  createFirebaseLearningV2AudioTransport,
  createLearningV2ProgressiveAudioRuntime,
  resolveCloudflareR2LearningV2AudioOrigin,
  type LearningV2AudioIo,
} from "../modules/learning-v2/audio/progressive_audio_runtime";

const enc = new TextEncoder();
const sha = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
const digest = async (bytes: Uint8Array): Promise<string> => sha(bytes);

class MemoryIo implements LearningV2AudioIo {
  readonly files = new Map<string, Uint8Array>();
  async read(key: string) {
    return this.files.get(key) ?? null;
  }
  async size(key: string) {
    return this.files.get(key)?.length ?? null;
  }
  async writeAtomic(key: string, bytes: Uint8Array) {
    this.files.set(key, Uint8Array.from(bytes));
  }
  async remove(key: string) {
    this.files.delete(key);
  }
  async list(prefix: string) {
    return [...this.files.entries()]
      .filter(([key]) => key.startsWith(`${prefix}/`))
      .map(([key, bytes]) => ({ key, byteSize: bytes.length }));
  }
  uri(key: string) {
    return `file:///documents/${key}`;
  }
}

class FailingStateIo extends MemoryIo {
  private stateWrites = 0;
  constructor(private readonly failOnStateWrite: number) {
    super();
  }
  override async writeAtomic(key: string, bytes: Uint8Array) {
    if (key === "state.v1.json" && ++this.stateWrites === this.failOnStateWrite)
      throw new Error("injected_state_write_failure");
    await super.writeAtomic(key, bytes);
  }
}

function releaseFixture(
  releaseChar: string,
  lessonSessionCounts: readonly number[],
  fill: number,
) {
  const releaseId = releaseChar.repeat(64);
  const objects = new Map<string, Uint8Array>();
  const lessons = [];
  let absolute = 1;
  for (
    let lessonIndex = 0;
    lessonIndex < lessonSessionCounts.length;
    lessonIndex += 1
  ) {
    const lessonOrdinal = lessonIndex + 1;
    const count = lessonSessionCounts[lessonIndex];
    const clip = Uint8Array.from(
      { length: 300 },
      (_, index) => (fill + lessonIndex + index) % 251,
    );
    const clipSha = sha(clip);
    const packId = `base-s${String(absolute).padStart(4, "0")}-s${String(absolute + count - 1).padStart(4, "0")}-p01`;
    const packPath = `learning-v2/voice-audio/v1/es/packs/${packId}-${clipSha}.bin`;
    const lesson = {
      schemaVersion: "learning-v2-audio-lesson-catalog.v1",
      studyTarget: "es",
      releaseId,
      lessonOrdinal,
      startOrdinal: absolute,
      endOrdinal: absolute + count - 1,
      packs: [
        {
          packId,
          sha256: clipSha,
          byteSize: clip.length,
          objectPath: packPath,
          clips: [{ sha256: clipSha, offset: 0, byteSize: clip.length }],
        },
      ],
      sessions: Array.from({ length: count }, (_, index) => ({
        ordinal: absolute + index,
        sessionOrdinal: index + 1,
        phrases: [
          {
            textKey: `Phrase ${lessonOrdinal}-${index + 1}.`,
            clipSha256: clipSha,
          },
        ],
      })),
    };
    const lessonBytes = enc.encode(JSON.stringify(lesson));
    const lessonSha = sha(lessonBytes);
    const lessonPath = `learning-v2/voice-audio/v1/es/releases/${releaseId}/lessons/l${String(lessonOrdinal).padStart(3, "0")}-${lessonSha}.json`;
    lessons.push({
      lessonOrdinal,
      startOrdinal: absolute,
      endOrdinal: absolute + count - 1,
      byteSize: lessonBytes.length,
      sha256: lessonSha,
      objectPath: lessonPath,
    });
    objects.set(lessonPath, lessonBytes);
    objects.set(packPath, clip);
    absolute += count;
  }
  const manifest = {
    schemaVersion: "learning-v2-audio-release-manifest.v1",
    studyTarget: "es",
    releaseId,
    availability: "generated_ready",
    totalSessionCount: absolute - 1,
    lessons,
  };
  return {
    releaseId,
    manifest,
    manifestBytes: enc.encode(JSON.stringify(manifest)),
    objects,
  };
}

function fixture() {
  const clipA = Uint8Array.from({ length: 300 }, (_, i) => i % 251);
  const clipB = Uint8Array.from({ length: 350 }, (_, i) => (i + 7) % 251);
  const pack = new Uint8Array(clipA.length + clipB.length);
  pack.set(clipA);
  pack.set(clipB, clipA.length);
  const packSha = sha(pack);
  const aSha = sha(clipA);
  const bSha = sha(clipB);
  const releaseId = "c".repeat(64);
  const lesson = {
    schemaVersion: "learning-v2-audio-lesson-catalog.v1",
    studyTarget: "es",
    releaseId,
    lessonOrdinal: 1,
    startOrdinal: 1,
    endOrdinal: 1,
    packs: [
      {
        packId: "base-s0001-s0001-p01",
        sha256: packSha,
        byteSize: pack.length,
        objectPath: `learning-v2/voice-audio/v1/es/packs/base-s0001-s0001-p01-${packSha}.bin`,
        clips: [
          { sha256: aSha, offset: 0, byteSize: clipA.length },
          { sha256: bSha, offset: clipA.length, byteSize: clipB.length },
        ],
      },
    ],
    sessions: [
      {
        ordinal: 1,
        sessionOrdinal: 1,
        phrases: [
          { textKey: "Es fácil.", clipSha256: aSha },
          { textKey: "Muy fácil.", clipSha256: bSha },
        ],
      },
    ],
  };
  const lessonBytes = enc.encode(JSON.stringify(lesson));
  const lessonSha = sha(lessonBytes);
  const lessonPath = `learning-v2/voice-audio/v1/es/releases/${releaseId}/lessons/l001-${lessonSha}.json`;
  const manifest = {
    schemaVersion: "learning-v2-audio-release-manifest.v1",
    studyTarget: "es",
    releaseId,
    availability: "generated_ready",
    totalSessionCount: 1,
    lessons: [
      {
        lessonOrdinal: 1,
        startOrdinal: 1,
        endOrdinal: 1,
        byteSize: lessonBytes.length,
        sha256: lessonSha,
        objectPath: lessonPath,
      },
    ],
  };
  const manifestPath = "learning-v2/voice-audio/v1/es/current.json";
  return {
    clipA,
    clipB,
    pack,
    packSha,
    lessonBytes,
    lessonPath,
    manifestPath,
    manifestBytes: enc.encode(JSON.stringify(manifest)),
  };
}

describe("Learning V2 progressive audio runtime", () => {
  test("one authenticated pack GET installs multiple phrases and cached playback survives restart with zero network", async () => {
    const f = fixture();
    const io = new MemoryIo();
    const calls: string[] = [];
    const objects = new Map([
      [f.manifestPath, f.manifestBytes],
      [f.lessonPath, f.lessonBytes],
      [
        `learning-v2/voice-audio/v1/es/packs/base-s0001-s0001-p01-${f.packSha}.bin`,
        f.pack,
      ],
    ]);
    const runtime = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 1_000,
      sleep: async () => {},
      connection: async () => "wifi",
      transport: {
        get: async (path) => {
          calls.push(path);
          const value = objects.get(path);
          if (!value) throw new Error(path);
          return value;
        },
      },
    });

    await runtime.prepare({ studyTarget: "es", completedPrefixCount: 0 });
    expect(calls.filter((path) => path.includes("/packs/"))).toHaveLength(1);
    expect(
      (
        await runtime.resolveCached({
          studyTarget: "es",
          lessonOrdinal: 1,
          sessionOrdinal: 1,
          text: "Es fácil.",
        })
      )?.uri,
    ).toContain("file:///documents/");
    expect(
      await runtime.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "Muy fácil.",
      }),
    ).not.toBeNull();

    const restart = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 2_000,
      sleep: async () => {},
      connection: async () => "unknown",
      transport: {
        get: async () => {
          throw new Error("network forbidden");
        },
      },
    });
    expect(
      await restart.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "Es fácil.",
      }),
    ).not.toBeNull();
    expect(
      await restart.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "missing",
      }),
    ).toBeNull();
  });

  test("coalesces concurrent pack downloads and persists 404 cooldown across runtime restarts", async () => {
    const f = fixture();
    const io = new MemoryIo();
    let packCalls = 0;
    const transport = {
      get: async (path: string) => {
        if (path === f.manifestPath) return f.manifestBytes;
        if (path === f.lessonPath) return f.lessonBytes;
        packCalls += 1;
        throw new LearningV2AudioTransportError("not_found", path);
      },
    };
    const deps = {
      io,
      digestSha256: digest,
      now: () => 10_000,
      sleep: async () => {},
      connection: async () => "wifi" as const,
      transport,
    };
    const runtime = createLearningV2ProgressiveAudioRuntime(deps);
    await Promise.all([
      runtime.prepare({ studyTarget: "es", completedPrefixCount: 0 }),
      runtime.prepare({ studyTarget: "es", completedPrefixCount: 0 }),
    ]);
    expect(packCalls).toBe(1);
    const restart = createLearningV2ProgressiveAudioRuntime(deps);
    await restart.prepare({ studyTarget: "es", completedPrefixCount: 0 });
    expect(packCalls).toBe(1);
  });

  test("uses exact Firebase media GET with auth and enforces response ceiling", async () => {
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "3" },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }));
    const transport = createFirebaseLearningV2AudioTransport({
      bucket: () => "bucket.example",
      token: async () => "id-token",
      fetcher: fetcher as never,
    });
    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        3,
        new AbortController().signal,
      ),
    ).resolves.toEqual(Uint8Array.from([1, 2, 3]));
    expect(fetcher).toHaveBeenCalledWith(
      `https://firebasestorage.googleapis.com/v0/b/bucket.example/o/${encodeURIComponent("learning-v2/voice-audio/v1/es/current.json")}?alt=media`,
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Firebase id-token" },
      }),
    );
    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        2,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ reason: "too_large" });
  });

  test("uses one configured HTTPS R2 Worker transport with Firebase auth", async () => {
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => "3" },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }));
    const transport = createCloudflareR2LearningV2AudioTransport({
      origin: () => "https://phraseman-learning-audio.badloar.workers.dev",
      token: async () => "id-token",
      fetcher: fetcher as never,
    });
    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        3,
        new AbortController().signal,
      ),
    ).resolves.toEqual(Uint8Array.from([1, 2, 3]));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      "https://phraseman-learning-audio.badloar.workers.dev/learning-v2/voice-audio/v1/es/current.json",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Firebase id-token" },
      }),
    );
  });

  test("uses the Worker size header when React Native hides content-length", async () => {
    const arrayBuffer = jest.fn(async () =>
      Uint8Array.from([1, 2, 3]).buffer,
    );
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === "x-phraseman-content-length" ? "3" : null,
      },
      arrayBuffer,
    }));
    const transport = createCloudflareR2LearningV2AudioTransport({
      origin: () => "https://phraseman-learning-audio.badloar.workers.dev",
      token: async () => "id-token",
      fetcher: fetcher as never,
    });

    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        3,
        new AbortController().signal,
      ),
    ).resolves.toEqual(Uint8Array.from([1, 2, 3]));
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
  });

  test("fails closed before reading an R2 body when no size header is visible", async () => {
    const arrayBuffer = jest.fn(async () =>
      Uint8Array.from([1, 2, 3]).buffer,
    );
    const transport = createCloudflareR2LearningV2AudioTransport({
      origin: () => "https://phraseman-learning-audio.badloar.workers.dev",
      token: async () => "id-token",
      fetcher: async () =>
        ({
          ok: true,
          status: 200,
          headers: { get: () => null },
          arrayBuffer,
        }) as never,
    });

    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        3,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ reason: "too_large" });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  test("fails closed before reading an R2 body when size headers disagree", async () => {
    const arrayBuffer = jest.fn(async () =>
      Uint8Array.from([1, 2, 3]).buffer,
    );
    const transport = createCloudflareR2LearningV2AudioTransport({
      origin: () => "https://phraseman-learning-audio.badloar.workers.dev",
      token: async () => "id-token",
      fetcher: async () =>
        ({
          ok: true,
          status: 200,
          headers: {
            get: (name: string) =>
              name.toLowerCase() === "content-length" ? "3" : "4",
          },
          arrayBuffer,
        }) as never,
    });

    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        4,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ reason: "too_large" });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  test("rejects an unsafe R2 origin before auth or network", async () => {
    const token = jest.fn(async () => "id-token");
    const fetcher = jest.fn();
    const transport = createCloudflareR2LearningV2AudioTransport({
      origin: () => "http://learning-v2-audio.example.workers.dev/path",
      token,
      fetcher: fetcher as never,
    });
    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        3,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ reason: "no_origin" });
    expect(token).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("requires an explicit enable flag and the exact owner Worker origin", () => {
    const expected = "https://phraseman-learning-audio.badloar.workers.dev";
    expect(
      resolveCloudflareR2LearningV2AudioOrigin({
        enabled: undefined,
        origin: expected,
      }),
    ).toBeNull();
    expect(
      resolveCloudflareR2LearningV2AudioOrigin({
        enabled: "1",
        origin: "https://attacker.example",
      }),
    ).toBeNull();
    expect(
      resolveCloudflareR2LearningV2AudioOrigin({
        enabled: "1",
        origin: expected,
      }),
    ).toBe(expected);
  });

  test("pre-aborted transport rejects while token hangs and never starts GET", async () => {
    const fetcher = jest.fn();
    const controller = new AbortController();
    controller.abort();
    const transport = createFirebaseLearningV2AudioTransport({
      bucket: () => "bucket.example",
      token: () => new Promise(() => {}),
      fetcher: fetcher as never,
    });
    await expect(
      transport.get(
        "learning-v2/voice-audio/v1/es/current.json",
        100,
        controller.signal,
      ),
    ).rejects.toMatchObject({ reason: "cancelled" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("caller-scoped cancellation cannot abort a later preparation", async () => {
    const f = fixture();
    const io = new MemoryIo();
    let firstManifest = true;
    let noteFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => { noteFirstStarted = resolve; });
    const transport = {
      get: async (
        objectPath: string,
        _maxBytes: number,
        signal: AbortSignal,
      ): Promise<Uint8Array> => {
        if (objectPath === f.manifestPath && firstManifest) {
          firstManifest = false;
          noteFirstStarted();
          if (signal.aborted)
            throw new LearningV2AudioTransportError("cancelled", objectPath);
          return new Promise((_resolve, reject) =>
            signal.addEventListener(
              "abort",
              () =>
                reject(
                  new LearningV2AudioTransportError("cancelled", objectPath),
                ),
              { once: true },
            ),
          );
        }
        if (objectPath === f.manifestPath) return f.manifestBytes;
        if (objectPath === f.lessonPath) return f.lessonBytes;
        return f.pack;
      },
    };
    const runtime = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 5_000,
      sleep: async () => {},
      connection: async () => "wifi",
      transport,
    });
    const stale = new AbortController();
    const focused = new AbortController();
    const stalePrepare = runtime.prepare({
      studyTarget: "es",
      completedPrefixCount: 0,
      signal: stale.signal,
    });
    await firstStarted;
    const focusedPrepare = runtime.prepare({
      studyTarget: "es",
      completedPrefixCount: 0,
      signal: focused.signal,
    });
    stale.abort();
    await Promise.all([stalePrepare, focusedPrepare]);
    expect(focused.signal.aborted).toBe(false);
    expect(
      await runtime.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "Es fácil.",
      }),
    ).not.toBeNull();
  });

  test("offline preparation does no network work and reconnect retries immediately", async () => {
    const f = fixture();
    const io = new MemoryIo();
    const calls: string[] = [];
    let connection: "offline" | "wifi" = "offline";
    const runtime = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 9_000,
      sleep: async () => {},
      connection: async () => connection,
      transport: {
        get: async (objectPath) => {
          calls.push(objectPath);
          if (objectPath === f.manifestPath) return f.manifestBytes;
          if (objectPath === f.lessonPath) return f.lessonBytes;
          return f.pack;
        },
      },
    });
    await runtime.prepare({ studyTarget: "es", completedPrefixCount: 0 });
    expect(calls).toHaveLength(0);
    connection = "wifi";
    await runtime.prepare({ studyTarget: "es", completedPrefixCount: 0 });
    expect(calls).toHaveLength(3);
    expect(
      await runtime.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "Es fácil.",
      }),
    ).not.toBeNull();
  });

  test("malformed persisted cache rows are dropped before disk accounting", async () => {
    const io = new MemoryIo();
    const clipSha = "a".repeat(64);
    await io.writeAtomic(
      "state.v1.json",
      enc.encode(
        JSON.stringify({
          version: 1,
          manifestCheckedAt: { es: "bad" },
          manifestFailureUntil: {},
          negative: { bad: { reason: "not_found", until: "never" } },
          clips: {
            [`es:${"b".repeat(64)}`]: { byteSize: "huge", lastAccessAt: -1 },
          },
        }),
      ),
    );
    await io.writeAtomic(
      `targets/es/clips/${clipSha}.mp3`,
      Uint8Array.from([1, 2, 3]),
    );
    const runtime = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 1,
      sleep: async () => {},
      connection: async () => "offline",
      transport: {
        get: async () => {
          throw new Error("network forbidden");
        },
      },
    });
    await runtime.prepare({ studyTarget: "es", completedPrefixCount: 0 });
    const state = JSON.parse(
      new TextDecoder().decode((await io.read("state.v1.json"))!),
    );
    expect(state.clips).toEqual({
      [`es:${clipSha}`]: { byteSize: 3, lastAccessAt: 0 },
    });
    expect(state.negative).toEqual({});
  });

  test("advanced progress loads only the frontier catalog while an explicit jump loads its active lesson", async () => {
    const f = releaseFixture("d", [50, 50, 50], 11);
    const io = new MemoryIo();
    const calls: string[] = [];
    await io.writeAtomic("targets/es/active-manifest.json", f.manifestBytes);
    await io.writeAtomic(
      "state.v1.json",
      enc.encode(
        JSON.stringify({
          version: 1,
          manifestCheckedAt: { es: 50_000 },
          manifestFailureUntil: {},
          negative: {},
          clips: {},
        }),
      ),
    );
    const runtime = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 50_000,
      sleep: async () => {},
      connection: async () => "wifi",
      transport: {
        get: async (objectPath) => {
          calls.push(objectPath);
          const bytes = f.objects.get(objectPath);
          if (!bytes) throw new Error(objectPath);
          return bytes;
        },
      },
    });
    await runtime.prepare({
      studyTarget: "es",
      completedPrefixCount: 100,
      activeLessonOrdinal: 3,
      activeSessionOrdinal: 1,
    });
    expect(calls.some((path) => path.includes("/lessons/l001-"))).toBe(false);
    expect(calls.some((path) => path.includes("/lessons/l002-"))).toBe(true); // overlaps the protected current chapter (97-100)
    expect(calls.some((path) => path.includes("/lessons/l003-"))).toBe(true);
    expect(calls.filter((path) => path.includes("/packs/"))).toHaveLength(1);

    const jump = releaseFixture("e", [1, 1], 21);
    const jumpIo = new MemoryIo();
    const jumpCalls: string[] = [];
    const jumpRuntime = createLearningV2ProgressiveAudioRuntime({
      io: jumpIo,
      digestSha256: digest,
      now: () => 1,
      sleep: async () => {},
      connection: async () => "wifi",
      transport: {
        get: async (objectPath) => {
          jumpCalls.push(objectPath);
          if (objectPath.endsWith("/current.json")) return jump.manifestBytes;
          const bytes = jump.objects.get(objectPath);
          if (!bytes) throw new Error(objectPath);
          return bytes;
        },
      },
    });
    await jumpRuntime.prepare({
      studyTarget: "es",
      completedPrefixCount: 0,
      activeLessonOrdinal: 2,
      activeSessionOrdinal: 1,
    });
    expect(jumpCalls.some((path) => path.includes("/lessons/l002-"))).toBe(
      true,
    );
    expect(
      await jumpRuntime.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 2,
        sessionOrdinal: 1,
        text: "Phrase 2-1.",
      }),
    ).not.toBeNull();
  });

  test("failed retained-window update keeps the previous release and its cached clip reachable", async () => {
    const oldRelease = releaseFixture("a", [8], 31);
    const nextRelease = releaseFixture("b", [8], 41);
    const io = new MemoryIo();
    await io.writeAtomic(
      "targets/es/active-manifest.json",
      oldRelease.manifestBytes,
    );
    const oldLesson = oldRelease.manifest.lessons[0];
    const oldLessonBytes = oldRelease.objects.get(oldLesson.objectPath)!;
    await io.writeAtomic(
      `targets/es/releases/${oldRelease.releaseId}/lesson-1.json`,
      oldLessonBytes,
    );
    const oldCatalog = JSON.parse(new TextDecoder().decode(oldLessonBytes));
    const oldClip = oldRelease.objects.get(oldCatalog.packs[0].objectPath)!;
    const oldSha = oldCatalog.packs[0].clips[0].sha256;
    await io.writeAtomic(`targets/es/clips/${oldSha}.mp3`, oldClip);
    const runtime = createLearningV2ProgressiveAudioRuntime({
      io,
      digestSha256: digest,
      now: () => 100_000_000,
      sleep: async () => {},
      connection: async () => "wifi",
      transport: {
        get: async (objectPath) => {
          if (objectPath.endsWith("/current.json"))
            return nextRelease.manifestBytes;
          const bytes = nextRelease.objects.get(objectPath);
          if (!bytes) throw new Error(objectPath);
          if (objectPath.includes("/packs/"))
            throw new LearningV2AudioTransportError("not_found", objectPath);
          return bytes;
        },
      },
    });
    await runtime.prepare({
      studyTarget: "es",
      completedPrefixCount: 4,
      activeLessonOrdinal: 1,
      activeSessionOrdinal: 5,
    });
    expect(
      await runtime.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "Phrase 1-1.",
      }),
    ).not.toBeNull();
    expect(
      JSON.parse(
        new TextDecoder().decode(
          (await io.read("targets/es/active-manifest.json"))!,
        ),
      ).releaseId,
    ).toBe(oldRelease.releaseId);
  });

  test("restart reconciles clips orphaned by a failed state save without downloading their pack again", async () => {
    const f = fixture();
    const io = new FailingStateIo(2);
    let packCalls = 0;
    const transport = {
      get: async (objectPath: string) => {
        if (objectPath === f.manifestPath) return f.manifestBytes;
        if (objectPath === f.lessonPath) return f.lessonBytes;
        packCalls += 1;
        return f.pack;
      },
    };
    const deps = {
      io,
      digestSha256: digest,
      now: () => 7_000,
      sleep: async () => {},
      connection: async () => "wifi" as const,
      transport,
    };
    await expect(
      createLearningV2ProgressiveAudioRuntime(deps).prepare({
        studyTarget: "es",
        completedPrefixCount: 0,
      }),
    ).rejects.toThrow("injected_state_write_failure");
    expect(packCalls).toBe(1);
    const restart = createLearningV2ProgressiveAudioRuntime(deps);
    await restart.prepare({ studyTarget: "es", completedPrefixCount: 0 });
    expect(packCalls).toBe(1);
    expect(
      await restart.resolveCached({
        studyTarget: "es",
        lessonOrdinal: 1,
        sessionOrdinal: 1,
        text: "Es fácil.",
      }),
    ).not.toBeNull();
  });
});
