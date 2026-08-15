import { learningV2CourseSessionIdV1 } from "../../../modules/learning-v2/content/course_topology_v1";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  materializeLearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
  encodeLearningV2CourseSessionReleasePackageV1,
  materializeLearningV2CourseSessionReleasePackageV1,
} from "../../../modules/learning-v2/runtime/course_session_release_package_v1";
import {
  encodeLearningV2CourseSessionAuxiliaryChildV1,
  encodeLearningV2CourseSessionIntroChildV1,
  encodeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionIntroChildV1,
  materializeLearningV2CourseSessionLearnerChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  encodeLearningV2CourseSessionEvaluatorCapsuleChildV1,
  materializeLearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import {
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
  createV2CourseReleasedSessionAdapterV2,
  getV2CourseReleasedSessionSummaryV2,
  isV2CourseReleasedSessionHandleV2,
  resolveV2CourseReleasedSessionLearnerMaterialV2,
} from "./v2_course_released_session_adapter_v2";

const h = (value: string) => sha256Utf8(value);
const RELEASE_ID = "release-v2-session";

class MemoryFirestore {
  readonly values = new Map<string, string>();
  async runTransaction<T>(body: (transaction: any) => Promise<T>): Promise<T> {
    const pending: (() => void)[] = [];
    const result = await body({
      readExact: async (path: string) =>
        this.values.has(path)
          ? { exists: true as const, raw: this.values.get(path)! }
          : { exists: false as const },
      createExact: async (path: string, raw: string) => {
        if (this.values.has(path)) throw new Error("create_conflict");
        pending.push(() => this.values.set(path, raw));
      },
      compareAndSetExact: async (path: string, expected: any, raw: string) => {
        const current = JSON.parse(this.values.get(path) ?? "null");
        if (
          current?.operationRevision !== expected.operationRevision ||
          current?.operationFingerprint !== expected.operationFingerprint
        )
          throw new Error("cas_conflict");
        pending.push(() => this.values.set(path, raw));
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

function outcomes() {
  return Object.freeze({
    ru: "Вы поймёте, как строить простую фразу.",
    uk: "Ви зрозумієте, як будувати просту фразу.",
    es: "Entenderás cómo construir una frase sencilla.",
    "pt-BR": "Você entenderá como formar uma frase simples.",
    vi: "Bạn sẽ hiểu cách tạo một câu đơn giản.",
    id: "Kamu akan memahami cara membuat kalimat sederhana.",
    tr: "Basit bir cümlenin nasıl kurulduğunu anlayacaksınız.",
    pl: "Zrozumiesz, jak zbudować proste zdanie.",
  });
}

async function fixture() {
  const storage = new MemoryStorage();
  const firestore = new MemoryFirestore();
  const interactionIds = Array.from(
    { length: 16 },
    (_, index) => `interaction-${index + 1}`,
  );
  const localized = (prefix: string) =>
    Object.freeze({
      ru: `${prefix} русский`,
      uk: `${prefix} українська`,
      es: `${prefix} español`,
      "pt-BR": `${prefix} português`,
      vi: `${prefix} tiếng Việt`,
      id: `${prefix} Indonesia`,
      tr: `${prefix} Türkçe`,
      pl: `${prefix} polski`,
    });
  const intro = materializeLearningV2CourseSessionIntroChildV1({
    courseSessionId: "lesson-01:session:01",
    learningOutcomeByLocale: outcomes(),
    pages: [1, 2, 3].map((ordinal) => ({
      pageOrdinal: ordinal as 1 | 2 | 3,
      pageId: `intro-page-${ordinal}`,
      kind:
        ordinal === 1
          ? ("concept" as const)
          : ordinal === 2
            ? ("formula" as const)
            : ("example" as const),
      titleByLocale: localized(`Title ${ordinal}`),
      bodyByLocale: localized(`Explanation ${ordinal}`),
      question: {
        interactionId: interactionIds[ordinal - 1]!,
        promptByLocale: localized(`Question ${ordinal}`),
        choicesByLocale: Object.freeze(
          Object.fromEntries(
            ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"].map(
              (locale) => [
                locale,
                [`Option A ${ordinal}`, `Option B ${ordinal}`],
              ],
            ),
          ),
        ) as any,
        accessibilityLabelByLocale: localized(`Accessible ${ordinal}`),
      },
    })) as any,
  });
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: interactionIds.slice(3).map((interactionId, index) => ({
      interactionId,
      ordinal: index + 4,
      purpose:
        index < 4
          ? ("supported_practice" as const)
          : index < 8
            ? ("guided_practice" as const)
            : ("retrieval_practice" as const),
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Build phrase ${index + 1}`,
      responseOptions: [
        { responseId: `word-${index + 1}`, text: `word${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: [`audio-${index + 1}`],
      accessibilityLabel: `Build phrase ${index + 1}`,
      scriptedAlternate: null,
    })),
  });
  const auxiliary = materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: "lesson-01:session:01",
    entries: interactionIds.map((interactionId, index) => ({
      interactionId,
      report: {
        available: true as const,
        reportContextRef: `report-${index + 1}`,
        screen: "learning_v2_session" as const,
      },
      save: materializeLearningV2CourseSessionSavablePhraseV1({
        targetLanguage: "en-US",
        targetText: `phrase ${index + 1}`,
        meaningByLocale: localized(`Meaning ${index + 1}`),
      }),
      voice: {
        available: true,
        tapToRecordAllowed: true as const,
        holdToTalkAllowed: true as const,
      },
      secondErrorExplanationRef: `error-${index + 1}`,
      secondErrorExplanationByLocale: localized(
        `Error explanation ${index + 1}`,
      ),
    })),
  });
  const evaluatorCapsule =
    materializeLearningV2CourseSessionEvaluatorCapsuleChildV1({
      courseSessionId: "lesson-01:session:01",
      entries: interactionIds.map((interactionId, index) => ({
        interactionId,
        activityId: `activity-${index + 1}`,
        capsuleId: `capsule-${index + 1}`,
        family: "phrase_builder" as const,
        normalizationLocale: "en-US",
        salt: `${"0".repeat(63)}${index % 10}`,
        acceptedResponses: [`word${index + 1}`],
      })),
    });
  const childRaws = {
    intro: encodeLearningV2CourseSessionIntroChildV1(intro),
    learner: encodeLearningV2CourseSessionLearnerChildV1(learner),
    evaluator_capsule:
      encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(evaluatorCapsule),
    evaluator_sidecar: JSON.stringify({
      schemaVersion: "learning-v2-course-session-evaluator-sidecar-child.v1",
      acceptedAnswers: ["evaluator-private"],
    }),
    auxiliary: encodeLearningV2CourseSessionAuxiliaryChildV1(auxiliary),
  };
  const childKinds = [
    "intro",
    "learner",
    "evaluator_capsule",
    "evaluator_sidecar",
    "auxiliary",
  ] as const;
  const childInputs = childKinds.map((kind, index) => {
    const raw = childRaws[kind];
    return {
      kind,
      schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
      artifactFingerprint: h(`artifact:${kind}`),
      contentHash: h(raw),
      objectGeneration: String(100 + index),
      byteSize: utf8ByteLengthV1(raw),
      raw,
    };
  });
  const sessionPackage = materializeLearningV2CourseSessionReleasePackageV1({
    releaseId: RELEASE_ID,
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    learningOutcomeKind: "understand" as const,
    learningOutcomeByLocale: outcomes(),
    interactionProfile: "standard",
    interactionIds,
    children: childInputs.map(({ raw: _raw, ...child }) => child),
  });
  sessionPackage.children.forEach((pin, index) =>
    storage.put(pin.objectPath, childInputs[index]!.raw, pin.objectGeneration),
  );
  const packageRaw =
    encodeLearningV2CourseSessionReleasePackageV1(sessionPackage);
  const sessionRows = Array.from({ length: 56 }, (_, offset) => {
    const ordinal = offset + 1;
    return ordinal === 1
      ? {
          courseSessionId: learningV2CourseSessionIdV1(1, 1),
          learningOutcomeKind: "understand" as const,
          learningOutcomeByLocale: outcomes(),
          packageSchemaVersion:
            "learning-v2-course-session-release-package.v1" as const,
          packageFingerprint: sessionPackage.packageFingerprint,
          contentHash: h(packageRaw),
          objectGeneration: "200",
          byteSize: utf8ByteLengthV1(packageRaw),
        }
      : {
          courseSessionId: learningV2CourseSessionIdV1(1, ordinal),
          learningOutcomeKind: "understand" as const,
          learningOutcomeByLocale: outcomes(),
          packageSchemaVersion:
            "learning-v2-course-session-release-package.v1" as const,
          packageFingerprint: h(`package:${ordinal}`),
          contentHash: h(`raw:${ordinal}`),
          objectGeneration: String(200 + ordinal),
          byteSize: 2_000 + ordinal,
        };
  });
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: RELEASE_ID,
    lessonOrdinal: 1,
    titleByLocale: localized("Lesson title"),
    canDoByLocale: localized("Can do outcome"),
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    sessions: sessionRows,
  });
  storage.put(index.sessions[0]!.packagePin.objectPath, packageRaw, "200");
  const indexRaw = encodeLearningV2CourseLessonReleaseIndexV1(index);
  const indexPath = v2UnifiedCourseLessonIndexObjectPathV2({
    releaseId: RELEASE_ID,
    lessonId: index.lessonId,
    indexFingerprint: index.indexFingerprint,
    rawHash: h(indexRaw),
  });
  storage.put(indexPath, indexRaw, "300");
  const root = materializeV2UnifiedCourseReleaseRootV2({
    environment: "lab",
    releaseId: RELEASE_ID,
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
  return { storage, active, sessionPackage, childInputs };
}

describe("Learning V2 active direct course session adapter v2", () => {
  test("joins active head→root→lesson index→package, exposes capsules and hides evaluator sidecar", async () => {
    const value = await fixture();
    const handle = await createV2CourseReleasedSessionAdapterV2({
      storage: value.storage,
    }).load({
      activeHandle: value.active.activeHandle,
      lessonOrdinal: 1,
      sessionOrdinal: 1,
    });
    expect(isV2CourseReleasedSessionHandleV2(handle)).toBe(true);
    expect(isV2CourseReleasedSessionHandleV2({ ...handle })).toBe(false);
    const summary = getV2CourseReleasedSessionSummaryV2(handle);
    expect(summary).toMatchObject({
      lessonId: "lesson-01",
      courseSessionId: "lesson-01:session:01",
      packageFingerprint: value.sessionPackage.packageFingerprint,
      learningOutcomeAvailable: true,
      evaluatorIsolation: "server_sidecar_not_exposed",
      releaseAuthority: false,
    });
    const material = resolveV2CourseReleasedSessionLearnerMaterialV2(handle);
    expect(material.introChild.pages).toHaveLength(3);
    expect(material.learnerChild.interactions).toHaveLength(13);
    expect(material.evaluatorCapsuleChild.entries).toHaveLength(16);
    expect(material.auxiliaryChild.entries).toHaveLength(16);
    expect(material.learner).not.toHaveProperty("evaluatorSidecarRaw");
    expect(JSON.stringify(material)).not.toContain("evaluator-private");
    expect(material.evaluatorSidecarRawExposed).toBe(false);
  });

  test.each([
    [
      "generation",
      (entry: any) => ({
        ...entry,
        metadata: { ...entry.metadata, generation: "999" },
      }),
    ],
    [
      "hash",
      (entry: any) => ({
        ...entry,
        metadata: { ...entry.metadata, contentHash: h("wrong") },
      }),
    ],
    [
      "size",
      (entry: any) => ({
        ...entry,
        metadata: { ...entry.metadata, byteSize: entry.metadata.byteSize + 1 },
      }),
    ],
    [
      "content type",
      (entry: any) => ({
        ...entry,
        metadata: { ...entry.metadata, contentType: "text/plain" },
      }),
    ],
  ])(
    "rejects %s substitution before learner projection",
    async (_name, mutate) => {
      const value = await fixture();
      const child = value.sessionPackage.children[0]!;
      value.storage.values.set(
        child.objectPath,
        mutate(value.storage.values.get(child.objectPath)!),
      );
      await expect(
        createV2CourseReleasedSessionAdapterV2({ storage: value.storage }).load(
          {
            activeHandle: value.active.activeHandle,
            lessonOrdinal: 1,
            sessionOrdinal: 1,
          },
        ),
      ).rejects.toThrow("metadata_mismatch");
    },
  );

  test("rejects a cloned active handle and missing future session bytes", async () => {
    const value = await fixture();
    await expect(
      createV2CourseReleasedSessionAdapterV2({ storage: value.storage }).load({
        activeHandle: { ...value.active.activeHandle },
        lessonOrdinal: 1,
        sessionOrdinal: 1,
      }),
    ).rejects.toThrow("active_handle_invalid");
    await expect(
      createV2CourseReleasedSessionAdapterV2({ storage: value.storage }).load({
        activeHandle: value.active.activeHandle,
        lessonOrdinal: 1,
        sessionOrdinal: 13,
      }),
    ).rejects.toThrow("metadata_mismatch");
  });
});
