import { learningV2CourseSessionIdV1 } from "../../../modules/learning-v2/content/course_topology_v1";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryFirestorePortV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  createV2UnifiedCourseReleaseRepositoryV2,
  isV2UnifiedCourseReleaseActiveHandleV2,
  resolveV2UnifiedCourseReleaseActiveMaterialV2,
} from "./v2_unified_course_release_repository_v2";
import {
  materializeV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
} from "./v2_unified_course_release_v2";

const h = (value: string) => sha256Utf8(value);
const localized = (prefix: string) =>
  Object.fromEntries(
    ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"].map((locale) => [
      locale,
      `${prefix} ${locale}`,
    ]),
  ) as any;

function pin(
  name: string,
  overrides: Partial<{
    objectPath: string;
    contentHash: string;
    byteSize: number;
  }> = {},
) {
  return Object.freeze({
    objectPath: overrides.objectPath ?? `learning-v2/test/${name}.json`,
    contentHash: overrides.contentHash ?? h(name),
    objectGeneration: "7",
    byteSize: overrides.byteSize ?? 100,
    contentType: "application/json; charset=utf-8" as const,
  });
}

function lesson(releaseId: string) {
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId,
    lessonOrdinal: 1,
    titleByLocale: localized("Lesson title"),
    canDoByLocale: localized("Can do outcome"),
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    sessions: Array.from({ length: 56 }, (_, offset) => {
      const ordinal = offset + 1;
      return {
        courseSessionId: learningV2CourseSessionIdV1(1, ordinal),
        learningOutcomeKind: "understand" as const,
        learningOutcomeByLocale: localized("Session learning outcome"),
        packageSchemaVersion:
          "learning-v2-course-session-release-package.v1" as const,
        packageFingerprint: h(`package:${releaseId}:${ordinal}`),
        contentHash: h(`raw:${releaseId}:${ordinal}`),
        objectGeneration: String(100 + ordinal),
        byteSize: 2_000 + ordinal,
      };
    }),
  });
  const raw = encodeLearningV2CourseLessonReleaseIndexV1(index);
  const rawHash = h(raw);
  return Object.freeze({
    index,
    indexObject: pin("index", {
      objectPath: v2UnifiedCourseLessonIndexObjectPathV2({
        releaseId,
        lessonId: index.lessonId,
        indexFingerprint: index.indexFingerprint,
        rawHash,
      }),
      contentHash: rawHash,
      byteSize: utf8ByteLengthV1(raw),
    }),
    ownerConfirmationObject: pin("confirmation"),
  });
}

function release(releaseId: string) {
  return materializeV2UnifiedCourseReleaseRootV2({
    environment: "lab",
    releaseId,
    planFingerprint: h("plan"),
    courseContractFingerprint: h("course"),
    seasonId: "season-v2",
    targetLanguage: "en-US",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
    contentClass: "neutral_test_fixture",
    releaseScope: "vertical_slice",
    rollout: {
      revision: 1,
      state: "internal",
      percent: 0,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    lessons: [lesson(releaseId)],
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

describe("Learning V2 direct 32×56 release repository v2", () => {
  test("persists A and B, rolls back to exact A and cold-loads one active root", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV2({
      firestore,
      storage,
    });
    const a = release("release-v2-a");
    const b = release("release-v2-b");
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
    ]).toEqual(["release-v2-a", "release-v2-b", "release-v2-a"]);
    expect(rollback.head.state).toBe("rolled_back");
    expect(isV2UnifiedCourseReleaseActiveHandleV2(rollback.activeHandle)).toBe(
      true,
    );
    expect(
      isV2UnifiedCourseReleaseActiveHandleV2({ ...rollback.activeHandle }),
    ).toBe(false);
    expect(
      resolveV2UnifiedCourseReleaseActiveMaterialV2(rollback.activeHandle).root,
    ).toBe(rollback.root);
    const active = await repository.readActive({
      environment: "lab",
      seasonId: "season-v2",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
    });
    expect(active.root.rootFingerprint).toBe(a.rootFingerprint);
    expect(active.rootObject.objectGeneration).toBe(
      first.rootObject.objectGeneration,
    );
  });

  test("exact replay performs no writes and a stale transition fails closed", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV2({
      firestore,
      storage,
    });
    const a = release("release-v2-a");
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
        target: release("release-v2-b"),
        action: "activate",
        expectedRevision: 0,
        operationId: "stale",
        updatedAtIso: "2026-08-13T02:00:00.000Z",
      }),
    ).rejects.toThrow("head_conflict");
  });

  test("same release id cannot name different immutable root bytes", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const repository = createV2UnifiedCourseReleaseRepositoryV2({
      firestore,
      storage,
    });
    const original = release("release-v2-a");
    await repository.persistAndAdvance({
      target: original,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const changed = materializeV2UnifiedCourseReleaseRootV2({
      environment: "lab",
      releaseId: "release-v2-a",
      planFingerprint: h("different-plan"),
      courseContractFingerprint: h("course"),
      seasonId: "season-v2",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
      contentClass: "neutral_test_fixture",
      releaseScope: "vertical_slice",
      rollout: {
        revision: 1,
        state: "internal",
        percent: 0,
        cohortSaltVersion: 1,
        allowlistCohortIds: [],
        excludeCohortIds: [],
      },
      lessons: [lesson("release-v2-a")],
    });
    await expect(
      repository.persistAndAdvance({
        target: changed,
        action: "activate",
        expectedRevision: 1,
        operationId: "changed",
        updatedAtIso: "2026-08-13T01:00:00.000Z",
      }),
    ).rejects.toThrow("release_id_reuse_conflict");
  });
});
