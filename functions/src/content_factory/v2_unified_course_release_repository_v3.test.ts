import {
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseSessionIdV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import {
  LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
  encodeLearningV2CourseLessonAudioReleaseIndexV1,
  learningV2CourseLessonAudioReleaseIndexObjectPathV1,
  parseLearningV2CourseLessonAudioReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_audio_release_index_v1";
import { learningV2CourseSessionAudioReleaseExtensionObjectPathV1 } from "../../../modules/learning-v2/runtime/course_session_audio_release_extension_v1";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type {
  V2RepositoryFirestorePortV1,
  V2RepositoryImmutableObjectMetadataV1,
  V2RepositoryImmutableObjectPinV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import { v2UnifiedCourseReleaseRootObjectPathV2 } from "./v2_unified_course_release_repository_v2";
import {
  materializeV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
} from "./v2_unified_course_release_v2";
import {
  createV2UnifiedCourseReleaseRepositoryV3,
  isV2UnifiedCourseReleaseActiveHandleV3,
  resolveV2UnifiedCourseReleaseActiveMaterialV3,
} from "./v2_unified_course_release_repository_v3";
import { materializeV2UnifiedCourseReleaseRootV3 } from "./v2_unified_course_release_v3";

const h = (value: unknown) => hashCanonicalBody(value);
const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const localized = (value: string) =>
  Object.fromEntries(
    locales.map((locale) => [locale, `${value} ${locale}`]),
  ) as Record<(typeof locales)[number], string>;

function pin(
  objectPath: string,
  contentHash: string,
  byteSize: number,
  objectGeneration: string,
): V2RepositoryImmutableObjectPinV1 {
  return Object.freeze({
    objectPath,
    contentHash,
    objectGeneration,
    byteSize,
    contentType: "application/json; charset=utf-8" as const,
  });
}

function buildFixture(releaseId: string) {
  const lessonIndex = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId,
    lessonOrdinal: 1,
    titleByLocale: localized("Neutral lesson"),
    canDoByLocale: localized("Neutral outcome"),
    ownerLessonFingerprint: h([releaseId, "owner-lesson"]),
    ownerConfirmationFingerprint: h([releaseId, "owner-confirmation"]),
    sessions: Array.from(
      { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
      (_, offset) => {
        const sessionOrdinal = offset + 1;
        return {
          courseSessionId: learningV2CourseSessionIdV1(1, sessionOrdinal),
          learningOutcomeKind: "learn" as const,
          learningOutcomeByLocale: localized(`Session ${sessionOrdinal}`),
          packageSchemaVersion:
            "learning-v2-course-session-release-package.v1" as const,
          packageFingerprint: h([releaseId, sessionOrdinal, "package"]),
          contentHash: h([releaseId, sessionOrdinal, "package-raw"]),
          objectGeneration: String(100 + sessionOrdinal),
          byteSize: 1_000 + sessionOrdinal,
        };
      },
    ),
  });
  const lessonRaw = encodeLearningV2CourseLessonReleaseIndexV1(lessonIndex);
  const lessonRawHash = sha256Utf8(lessonRaw);
  const baseRoot = materializeV2UnifiedCourseReleaseRootV2({
    environment: "lab",
    releaseId,
    planFingerprint: h("plan"),
    courseContractFingerprint: h("course-contract"),
    seasonId: "season-v2",
    targetLanguage: "en-US",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: locales,
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
        index: lessonIndex,
        indexObject: pin(
          v2UnifiedCourseLessonIndexObjectPathV2({
            releaseId,
            lessonId: lessonIndex.lessonId,
            indexFingerprint: lessonIndex.indexFingerprint,
            rawHash: lessonRawHash,
          }),
          lessonRawHash,
          utf8ByteLengthV1(lessonRaw),
          "5",
        ),
        ownerConfirmationObject: pin(
          `learning-v2/test/confirmation/${h([releaseId, "confirmation"])}.json`,
          h([releaseId, "confirmation"]),
          100,
          "6",
        ),
      },
    ],
  });
  const baseRaw = canonicalJsonV1(baseRoot);
  const baseRawHash = sha256Utf8(baseRaw);
  const baseRootObject = pin(
    v2UnifiedCourseReleaseRootObjectPathV2({
      releaseId,
      rootFingerprint: baseRoot.rootFingerprint,
      rawHash: baseRawHash,
    }),
    baseRawHash,
    utf8ByteLengthV1(baseRaw),
    "7",
  );
  const sessions = lessonIndex.sessions.map((session) => {
    const extensionFingerprint = h([
      releaseId,
      session.courseSessionId,
      "audio-extension",
    ]);
    const extensionRawHash = h([
      releaseId,
      session.courseSessionId,
      "extension-raw",
    ]);
    return {
      courseSessionId: session.courseSessionId,
      sessionOrdinal: session.sessionOrdinal,
      basePackageFingerprint: session.packageFingerprint,
      baseChildSetFingerprint: h([
        releaseId,
        session.courseSessionId,
        "children",
      ]),
      learnerFingerprint: h([releaseId, session.courseSessionId, "learner"]),
      audioFingerprint: h([releaseId, session.courseSessionId, "audio"]),
      extensionFingerprint,
      extensionPin: {
        objectPath: learningV2CourseSessionAudioReleaseExtensionObjectPathV1({
          releaseId,
          lessonId: lessonIndex.lessonId,
          courseSessionId: session.courseSessionId,
          extensionFingerprint,
          rawHash: extensionRawHash,
        }),
        contentHash: extensionRawHash,
        objectGeneration: String(1_000 + session.sessionOrdinal),
        byteSize: 2_000 + session.sessionOrdinal,
        contentType: "application/json; charset=utf-8" as const,
      },
    };
  });
  const audioBody = {
    schemaVersion: LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
    releaseId,
    lessonId: lessonIndex.lessonId,
    lessonOrdinal: 1,
    baseLessonIndexFingerprint: lessonIndex.indexFingerprint,
    sessions,
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    extensionSetFingerprint: hashCanonicalBody(
      sessions.map((session) => session.extensionFingerprint),
    ),
    audioSetFingerprint: hashCanonicalBody(
      sessions.map((session) => session.audioFingerprint),
    ),
    joinPolicy: "exact_56_base_package_to_audio_extension_bijection",
    playbackPolicy: "generation_pinned_local_files_no_session_network_tts",
    answerPayload: "absent_by_exact_schema",
    correctnessAuthority: "none",
    repositoryOriginAuthority: "none_active_release_join_required",
    storageAuthority: "none_generation_pinned_readback_required",
    runtimeAuthority: "none_active_release_join_required",
    publicationAuthority: "none",
    releaseAuthority: false,
  };
  const audioIndex = parseLearningV2CourseLessonAudioReleaseIndexV1(
    canonicalJsonV1({
      ...audioBody,
      indexFingerprint: hashCanonicalBody(audioBody),
    }),
  );
  const audioRaw = encodeLearningV2CourseLessonAudioReleaseIndexV1(audioIndex);
  const audioRawHash = sha256Utf8(audioRaw);
  const audioIndexObject = pin(
    learningV2CourseLessonAudioReleaseIndexObjectPathV1({
      releaseId,
      lessonId: lessonIndex.lessonId,
      indexFingerprint: audioIndex.indexFingerprint,
      rawHash: audioRawHash,
    }),
    audioRawHash,
    utf8ByteLengthV1(audioRaw),
    "8",
  );
  const root = materializeV2UnifiedCourseReleaseRootV3({
    baseRoot,
    baseRootObject,
    lessons: [{ index: audioIndex, indexObject: audioIndexObject }],
  });
  return {
    root,
    baseRootObject,
    baseRaw,
    audioIndexObject,
    audioRaw,
  };
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

  seed(pinValue: V2RepositoryImmutableObjectPinV1, raw: string) {
    this.values.set(pinValue.objectPath, {
      bytes: new TextEncoder().encode(raw),
      metadata: {
        generation: pinValue.objectGeneration,
        byteSize: pinValue.byteSize,
        contentType: pinValue.contentType,
        contentHash: pinValue.contentHash,
      },
    });
  }

  async readMetadataExact(path: string) {
    return this.values.get(path)?.metadata ?? null;
  }

  async createExact(input: any) {
    if (this.values.has(input.objectPath))
      return { kind: "precondition_failed" as const };
    const metadata = {
      generation: String(100 + this.values.size),
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

function seedDependencies(
  storage: MemoryStorage,
  fixture: ReturnType<typeof buildFixture>,
) {
  storage.seed(fixture.baseRootObject, fixture.baseRaw);
  storage.seed(fixture.audioIndexObject, fixture.audioRaw);
}

describe("Learning V2 unified text+audio release repository v3", () => {
  test("activates A and B, atomically rolls back to A and cold-loads all audio indexes", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const a = buildFixture("release-a");
    const b = buildFixture("release-b");
    seedDependencies(storage, a);
    seedDependencies(storage, b);
    const repository = createV2UnifiedCourseReleaseRepositoryV3({
      firestore,
      storage,
    });
    const first = await repository.persistAndAdvance({
      target: a.root,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-14T12:00:00.000Z",
    });
    await repository.persistAndAdvance({
      target: b.root,
      action: "activate",
      expectedRevision: 1,
      operationId: "activate-b",
      updatedAtIso: "2026-08-14T12:01:00.000Z",
    });
    const rollback = await repository.persistAndAdvance({
      target: a.root,
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-14T12:02:00.000Z",
    });
    expect(rollback).toMatchObject({
      root: { releaseId: "release-a" },
      head: { state: "rolled_back", operationRevision: 3 },
      audioIndexes: [{ sessionCount: 56 }],
    });
    expect(isV2UnifiedCourseReleaseActiveHandleV3(rollback.activeHandle)).toBe(
      true,
    );
    expect(
      isV2UnifiedCourseReleaseActiveHandleV3({ ...rollback.activeHandle }),
    ).toBe(false);
    expect(
      resolveV2UnifiedCourseReleaseActiveMaterialV3(rollback.activeHandle).root,
    ).toBe(rollback.root);
    const active = await repository.readActive({
      environment: "lab",
      seasonId: "season-v2",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
    });
    expect(active.root.rootFingerprint).toBe(a.root.rootFingerprint);
    expect(active.rootObject.objectGeneration).toBe(
      first.rootObject.objectGeneration,
    );
    expect(active.audioIndexes[0]?.indexFingerprint).toBe(
      a.root.lessons[0]?.audioIndexFingerprint,
    );
  });

  test("exact replay is write-free and a missing audio dependency blocks activation before the head", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const fixture = buildFixture("release-a");
    seedDependencies(storage, fixture);
    const repository = createV2UnifiedCourseReleaseRepositoryV3({
      firestore,
      storage,
    });
    const request = {
      target: fixture.root,
      action: "activate" as const,
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-14T12:00:00.000Z",
    };
    await repository.persistAndAdvance(request);
    const before = [firestore.writes, storage.writes];
    const replay = await repository.persistAndAdvance({
      ...request,
      updatedAtIso: "2026-08-14T13:00:00.000Z",
    });
    expect(replay.headDecision).toBe("exact_replay");
    expect([firestore.writes, storage.writes]).toEqual(before);

    const missingFirestore = new MemoryFirestore();
    const missingStorage = new MemoryStorage();
    missingStorage.seed(fixture.baseRootObject, fixture.baseRaw);
    await expect(
      createV2UnifiedCourseReleaseRepositoryV3({
        firestore: missingFirestore,
        storage: missingStorage,
      }).persistAndAdvance(request),
    ).rejects.toThrow("audio_index_metadata_mismatch");
    expect([missingFirestore.writes, missingStorage.writes]).toEqual([0, 0]);
  });

  test("tampered audio bytes and base-root generation drift fail closed on cold read", async () => {
    const firestore = new MemoryFirestore();
    const storage = new MemoryStorage();
    const fixture = buildFixture("release-a");
    seedDependencies(storage, fixture);
    const repository = createV2UnifiedCourseReleaseRepositoryV3({
      firestore,
      storage,
    });
    await repository.persistAndAdvance({
      target: fixture.root,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-14T12:00:00.000Z",
    });
    const audioStored = storage.values.get(
      fixture.audioIndexObject.objectPath,
    )!;
    audioStored.bytes[10] = audioStored.bytes[10]! ^ 1;
    await expect(
      repository.readActive({
        environment: "lab",
        seasonId: "season-v2",
        targetLanguage: "en-US",
        studyTarget: "en",
        learnerSourceLocale: "ru",
      }),
    ).rejects.toThrow("audio_index_readback_mismatch");
    storage.seed(fixture.audioIndexObject, fixture.audioRaw);
    const baseStored = storage.values.get(fixture.baseRootObject.objectPath)!;
    baseStored.metadata = { ...baseStored.metadata, generation: "999" };
    await expect(
      repository.readActive({
        environment: "lab",
        seasonId: "season-v2",
        targetLanguage: "en-US",
        studyTarget: "en",
        learnerSourceLocale: "ru",
      }),
    ).rejects.toThrow("base_root_metadata_mismatch");
  });
});
