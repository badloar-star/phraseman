import { LEARNING_V2_INTERFACE_LOCALES } from "../../../modules/learning-v2/content/generator_course_contract";
import { learningV2CourseSessionIdV1 } from "../../../modules/learning-v2/content/course_topology_v1";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import { parseLearningV2ActiveCourseCatalogV1 } from "../../../modules/learning-v2/runtime/course_active_catalog_v1";
import {
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import { createV2UnifiedCourseReleaseRepositoryV2 } from "./v2_unified_course_release_repository_v2";
import {
  materializeV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
} from "./v2_unified_course_release_v2";
import {
  createV2CourseActiveCatalogAdapterV1,
  getV2CourseActiveCatalogSummaryV1,
  isV2CourseActiveCatalogHandleV1,
  resolveV2CourseActiveCatalogLearnerRawV1,
} from "./v2_course_active_catalog_adapter_v1";

const h = (value: string) => sha256Utf8(value);
const localized = (prefix: string) =>
  Object.fromEntries(
    LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
      locale,
      `${prefix} ${locale}`,
    ]),
  ) as any;

class MemoryFirestore {
  readonly values = new Map<string, string>();
  async runTransaction<T>(body: (transaction: any) => Promise<T>): Promise<T> {
    const pending: (() => void)[] = [];
    const result = await body({
      readExact: async (path: string) =>
        this.values.has(path)
          ? { exists: true as const, raw: this.values.get(path)! }
          : { exists: false as const },
      createExact: async (path: string, raw: string) =>
        pending.push(() => this.values.set(path, raw)),
      compareAndSetExact: async (path: string, _expected: any, raw: string) =>
        pending.push(() => this.values.set(path, raw)),
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
  async readMetadataExact(path: string) {
    return this.values.get(path)?.metadata ?? null;
  }
  async createExact(input: any) {
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
  put(path: string, raw: string, generation: string) {
    const bytes = new TextEncoder().encode(raw);
    this.values.set(path, {
      bytes,
      metadata: {
        generation,
        byteSize: bytes.byteLength,
        contentType: "application/json; charset=utf-8",
        contentHash: h(raw),
      },
    });
  }
}

async function fixture() {
  const storage = new MemoryStorage();
  const firestore = new MemoryFirestore();
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: "release-catalog",
    lessonOrdinal: 1,
    titleByLocale: localized("Lesson title"),
    canDoByLocale: localized("Can do"),
    ownerLessonFingerprint: h("owner"),
    ownerConfirmationFingerprint: h("confirmation"),
    sessions: Array.from({ length: 56 }, (_, offset) => {
      const ordinal = offset + 1;
      return {
        courseSessionId: learningV2CourseSessionIdV1(1, ordinal),
        learningOutcomeKind:
          ordinal <= 8 ? ("understand" as const) : ("can_do" as const),
        learningOutcomeByLocale: localized(`Outcome ${ordinal}`),
        packageSchemaVersion:
          "learning-v2-course-session-release-package.v1" as const,
        packageFingerprint: h(`package:${ordinal}`),
        contentHash: h(`raw:${ordinal}`),
        objectGeneration: String(1000 + ordinal),
        byteSize: 2048,
      };
    }),
  });
  const indexRaw = encodeLearningV2CourseLessonReleaseIndexV1(index);
  const indexPath = v2UnifiedCourseLessonIndexObjectPathV2({
    releaseId: index.releaseId,
    lessonId: index.lessonId,
    indexFingerprint: index.indexFingerprint,
    rawHash: h(indexRaw),
  });
  storage.put(indexPath, indexRaw, "300");
  const root = materializeV2UnifiedCourseReleaseRootV2({
    environment: "lab",
    releaseId: index.releaseId,
    planFingerprint: h("plan"),
    courseContractFingerprint: h("course"),
    seasonId: "neutral-course",
    targetLanguage: "en",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
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
    lessons: [
      {
        index,
        indexObject: {
          objectPath: indexPath,
          contentHash: h(indexRaw),
          objectGeneration: "300",
          byteSize: utf8ByteLengthV1(indexRaw),
          contentType: "application/json; charset=utf-8",
        },
        ownerConfirmationObject: {
          objectPath: "learning-v2/test/confirmation.json",
          contentHash: h("confirmation"),
          objectGeneration: "1",
          byteSize: 100,
          contentType: "application/json; charset=utf-8",
        },
      },
    ],
  });
  const repository = createV2UnifiedCourseReleaseRepositoryV2({
    firestore,
    storage,
  });
  const active = await repository.persistAndAdvance({
    target: root,
    action: "activate",
    expectedRevision: 0,
    operationId: "activate",
    updatedAtIso: "2026-08-13T00:00:00.000Z",
  });
  return { storage, active, indexPath };
}

describe("Learning V2 active catalog generation-pinned adapter", () => {
  test("loads the active release indexes and returns only learner-safe catalog bytes", async () => {
    const value = await fixture();
    const handle = await createV2CourseActiveCatalogAdapterV1({
      storage: value.storage,
    }).load({
      activeHandle: value.active.activeHandle,
      interfaceLocale: "ru",
    });
    expect(isV2CourseActiveCatalogHandleV1(handle)).toBe(true);
    expect(isV2CourseActiveCatalogHandleV1({ ...handle })).toBe(false);
    expect(getV2CourseActiveCatalogSummaryV1(handle)).toMatchObject({
      interfaceLocale: "ru",
      lessonCount: 1,
      directSessionCount: 56,
      correctnessAuthority: "local_device_only",
      serverAnswerAuthority: "none_answers_never_transported",
      progressWriteAuthority: "completed_session_summary_only",
      releaseAuthority: false,
    });
    const raw = resolveV2CourseActiveCatalogLearnerRawV1(handle);
    const catalog = parseLearningV2ActiveCourseCatalogV1(raw);
    expect(catalog.lessons[0]?.title).toBe("Lesson title ru");
    expect(raw).not.toMatch(/correctResponse|acceptedResponse|sidecar|salt/u);
  });

  test("rejects a copied active handle before storage reads", async () => {
    const value = await fixture();
    const readsBefore = value.storage.values.size;
    await expect(
      createV2CourseActiveCatalogAdapterV1({ storage: value.storage }).load({
        activeHandle: { ...value.active.activeHandle },
        interfaceLocale: "ru",
      }),
    ).rejects.toThrow("v2_course_active_catalog_input_invalid");
    expect(value.storage.values.size).toBe(readsBefore);
  });

  test("fails closed on index generation metadata drift", async () => {
    const value = await fixture();
    const entry = value.storage.values.get(value.indexPath)!;
    value.storage.values.set(value.indexPath, {
      ...entry,
      metadata: { ...entry.metadata, generation: "999" },
    });
    await expect(
      createV2CourseActiveCatalogAdapterV1({ storage: value.storage }).load({
        activeHandle: value.active.activeHandle,
        interfaceLocale: "ru",
      }),
    ).rejects.toThrow("v2_course_active_catalog_metadata_mismatch");
  });

  test("the root aggregate is the exact ordered release-index closure", async () => {
    const value = await fixture();
    const handle = await createV2CourseActiveCatalogAdapterV1({
      storage: value.storage,
    }).load({
      activeHandle: value.active.activeHandle,
      interfaceLocale: "pl",
    });
    const catalog = parseLearningV2ActiveCourseCatalogV1(
      resolveV2CourseActiveCatalogLearnerRawV1(handle),
    );
    expect(catalog.lessonIndexAggregate).toBe(
      hashCanonicalBody(
        catalog.lessons.map((lesson) => ({
          lessonOrdinal: lesson.lessonOrdinal,
          value: lesson.lessonIndexFingerprint,
        })),
      ),
    );
  });
});
