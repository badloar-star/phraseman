import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryFirestorePortV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  materializeV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseEpisodeV1,
} from "./v2_unified_course_release_v1";
import { createV2UnifiedCourseReleaseRepositoryV1 } from "./v2_unified_course_release_repository_v1";

const hash = (value: string) => sha256Utf8(value);
const pin = (name: string) => ({
  objectPath: `learning-v2/test/${name}.json`,
  contentHash: hash(name),
  objectGeneration: "1",
  byteSize: 10,
  contentType: "application/json; charset=utf-8" as const,
});
function episode(
  ordinal: number,
): Omit<V2UnifiedCourseReleaseEpisodeV1, "episodeReleaseFingerprint"> {
  const p = `e${ordinal}`;
  return {
    episodeOrdinal: ordinal,
    episodeId: `episode-${ordinal}`,
    stageId: `stage-${ordinal}`,
    activityAssemblyFingerprint: hash(`${p}-assembly`),
    activityPackageFingerprint: hash(`${p}-package`),
    ownerInputFingerprint: hash(`${p}-owner`),
    ownerConfirmationFingerprint: hash(`${p}-confirm`),
    ownerConfirmationObject: pin(`${p}-confirm`),
    learnerCoreIndexFingerprint: hash(`${p}-learner`),
    learnerCoreIndexObject: pin(`${p}-learner`),
    serverEvaluatorIndexFingerprint: hash(`${p}-server`),
    serverEvaluatorIndexObject: pin(`${p}-server`),
    auxiliaryIndexFingerprint: hash(`${p}-aux`),
    auxiliaryIndexObject: pin(`${p}-aux`),
    voiceAudioIndexFingerprint: hash(`${p}-voice`),
    voiceAudioIndexObject: pin(`${p}-voice`),
    localizationIndexFingerprint: hash(`${p}-locale`),
    localizationIndexObject: pin(`${p}-locale`),
    errorGuidanceIndexFingerprint: hash(`${p}-error`),
    errorGuidanceIndexObject: pin(`${p}-error`),
  };
}
function release(id: string) {
  return materializeV2UnifiedCourseReleaseRootV1({
    environment: "production",
    releaseId: id,
    activeManifestHash: hash(`${id}-manifest`),
    planFingerprint: hash("plan"),
    courseContractFingerprint: hash("course"),
    seasonId: "season-1",
    targetLanguage: "en-US",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
    contentClass: "production_candidate",
    releaseScope: "full_season",
    rollout: {
      revision: 1,
      state: "live",
      percent: 100,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    episodes: Array.from({ length: 32 }, (_, index) => episode(index + 1)),
  });
}

class MemoryFirestore implements V2RepositoryFirestorePortV1 {
  readonly values = new Map<string, string>();
  writes = 0;
  async runTransaction<T>(body: (transaction: any) => Promise<T>): Promise<T> {
    const pending: (() => void)[] = [];
    const result = await body({
      readExact: async (path: string) =>
        this.values.has(path)
          ? { exists: true as const, raw: this.values.get(path)! }
          : { exists: false as const },
      createExact: async (path: string, raw: string) => {
        if (this.values.has(path)) throw new Error("create_conflict");
        pending.push(() => {
          this.values.set(path, raw);
          this.writes += 1;
        });
      },
      compareAndSetExact: async (path: string, expected: any, raw: string) => {
        const current = JSON.parse(this.values.get(path) ?? "null");
        if (
          current?.operationRevision !== expected.operationRevision ||
          current?.operationFingerprint !== expected.operationFingerprint
        )
          throw new Error("cas_conflict");
        pending.push(() => {
          this.values.set(path, raw);
          this.writes += 1;
        });
      },
    });
    pending.forEach((write) => write());
    return result;
  }
}

class MemoryStorage implements V2RepositoryImmutableStoragePortV1 {
  readonly values = new Map<
    string,
    { bytes: Uint8Array; metadata: V2RepositoryImmutableObjectMetadataV1 }
  >();
  writes = 0;
  async readMetadataExact(path: string) {
    return this.values.get(path)?.metadata ?? null;
  }
  async createExact(input: any) {
    if (this.values.has(input.objectPath))
      return { kind: "precondition_failed" as const };
    const metadata = {
      generation: String(this.values.size + 1),
      byteSize: input.bytes.byteLength,
      contentType: input.contentType,
      contentHash: input.contentHash,
    };
    this.values.set(input.objectPath, {
      bytes: new Uint8Array(input.bytes),
      metadata,
    });
    this.writes += 1;
    return { kind: "created" as const, metadata };
  }
  async downloadGenerationExact(input: any) {
    const value = this.values.get(input.objectPath);
    if (!value) return { kind: "not_found" as const };
    if (value.metadata.generation !== input.ifGenerationMatch)
      return { kind: "generation_mismatch" as const };
    return { kind: "downloaded" as const, bytes: new Uint8Array(value.bytes) };
  }
  async quarantineConflict() {}
}

describe("unified release immutable repository", () => {
  it("persists A and B, atomically rolls back to exact A bytes, and reads one active join", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage,
    });
    const a = release("release-a");
    const b = release("release-b");
    const first = await repository.persistAndAdvance({
      target: a,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const second = await repository.persistAndAdvance({
      target: b,
      action: "activate",
      expectedRevision: 1,
      operationId: "activate-b",
      updatedAtIso: "2026-08-13T00:01:00.000Z",
    });
    const rollback = await repository.persistAndAdvance({
      target: a,
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-13T00:02:00.000Z",
    });
    expect([
      first.root.releaseId,
      second.root.releaseId,
      rollback.root.releaseId,
    ]).toEqual(["release-a", "release-b", "release-a"]);
    expect(rollback.head.state).toBe("rolled_back");
    const active = await repository.readActive({
      environment: "production",
      seasonId: "season-1",
      studyTarget: "en",
      learnerSourceLocale: "ru",
    });
    expect(active.root.rootFingerprint).toBe(a.rootFingerprint);
    expect(active.rootObject.objectGeneration).toBe(
      first.rootObject.objectGeneration,
    );
  });

  it("exact replay writes nothing and stale CAS is rejected", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage,
    });
    const a = release("release-a");
    await repository.persistAndAdvance({
      target: a,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const before = [firestore.writes, storage.writes];
    const replay = await repository.persistAndAdvance({
      target: a,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T01:00:00.000Z",
    });
    expect(replay.headDecision).toBe("exact_replay");
    expect([firestore.writes, storage.writes]).toEqual(before);
    await expect(
      repository.persistAndAdvance({
        target: release("release-b"),
        action: "activate",
        expectedRevision: 0,
        operationId: "stale",
        updatedAtIso: "2026-08-13T02:00:00.000Z",
      }),
    ).rejects.toThrow("head_conflict");
  });

  it("never allows one release id to name a different immutable root", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage,
    });
    const original = release("release-a");
    await repository.persistAndAdvance({
      target: original,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const changed = materializeV2UnifiedCourseReleaseRootV1({
      environment: "production",
      releaseId: "release-a",
      activeManifestHash: hash("changed-manifest"),
      planFingerprint: hash("different-plan"),
      courseContractFingerprint: hash("course"),
      seasonId: "season-1",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
      contentClass: "production_candidate",
      releaseScope: "full_season",
      rollout: {
        revision: 1,
        state: "live",
        percent: 100,
        cohortSaltVersion: 1,
        allowlistCohortIds: [],
        excludeCohortIds: [],
      },
      episodes: Array.from({ length: 32 }, (_, index) => episode(index + 1)),
    });
    await expect(
      repository.persistAndAdvance({
        target: changed,
        action: "activate",
        expectedRevision: 1,
        operationId: "reuse-id",
        updatedAtIso: "2026-08-13T00:01:00.000Z",
      }),
    ).rejects.toThrow("release_id_reuse_conflict");
  });

  it("fails closed when active root bytes are changed after head commit", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage,
    });
    const result = await repository.persistAndAdvance({
      target: release("release-a"),
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const stored = storage.values.get(result.rootObject.objectPath)!;
    stored.bytes[stored.bytes.length - 2] ^= 1;
    await expect(
      repository.readActive({
        environment: "production",
        seasonId: "season-1",
        studyTarget: "en",
        learnerSourceLocale: "ru",
      }),
    ).rejects.toThrow("root_readback_mismatch");
    expect(canonicalJsonV1(result.head)).toContain(
      result.rootObject.contentHash,
    );
  });

  it("does not let a copied active summary become a pinned-read authority handle", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV1({
      firestore,
      storage,
    });
    const result = await repository.persistAndAdvance({
      target: release("release-a"),
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const { resolveV2UnifiedCourseReleaseActiveMaterialV1 } =
      await import("./v2_unified_course_release_repository_v1");
    expect(
      resolveV2UnifiedCourseReleaseActiveMaterialV1(result.activeHandle).root
        .releaseId,
    ).toBe("release-a");
    expect(() =>
      resolveV2UnifiedCourseReleaseActiveMaterialV1({ ...result.activeHandle }),
    ).toThrow("active_handle_invalid");
  });
});
