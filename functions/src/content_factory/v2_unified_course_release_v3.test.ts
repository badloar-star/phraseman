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
import { v2UnifiedCourseReleaseRootObjectPathV2 } from "./v2_unified_course_release_repository_v2";
import {
  materializeV2UnifiedCourseReleaseRootV2,
  v2UnifiedCourseLessonIndexObjectPathV2,
} from "./v2_unified_course_release_v2";
import {
  decideV2UnifiedCourseReleaseHeadV3,
  encodeV2UnifiedCourseReleaseHeadV3,
  encodeV2UnifiedCourseReleaseRootV3,
  isV2UnifiedCourseReleaseHeadV3,
  isV2UnifiedCourseReleaseRootV3,
  materializeV2UnifiedCourseReleaseRootV3,
  parseV2UnifiedCourseReleaseHeadV3,
  parseV2UnifiedCourseReleaseRootV3,
} from "./v2_unified_course_release_v3";

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
  generation = "7",
) {
  return Object.freeze({
    objectPath,
    contentHash,
    objectGeneration: generation,
    byteSize,
    contentType: "application/json; charset=utf-8" as const,
  });
}

function baseRelease(releaseId = "neutral-release") {
  const index = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId,
    lessonOrdinal: 1,
    titleByLocale: localized("Neutral lesson"),
    canDoByLocale: localized("Neutral outcome"),
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    sessions: Array.from(
      { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
      (_, index) => {
        const sessionOrdinal = index + 1;
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
  const indexRaw = encodeLearningV2CourseLessonReleaseIndexV1(index);
  const indexRawHash = sha256Utf8(indexRaw);
  const root = materializeV2UnifiedCourseReleaseRootV2({
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
        index,
        indexObject: pin(
          v2UnifiedCourseLessonIndexObjectPathV2({
            releaseId,
            lessonId: index.lessonId,
            indexFingerprint: index.indexFingerprint,
            rawHash: indexRawHash,
          }),
          indexRawHash,
          utf8ByteLengthV1(indexRaw),
        ),
        ownerConfirmationObject: pin(
          `learning-v2/test/confirmation/${h("confirmation")}.json`,
          h("confirmation"),
          100,
        ),
      },
    ],
  });
  const rootRaw = canonicalJsonV1(root);
  const rootRawHash = sha256Utf8(rootRaw);
  return {
    index,
    root,
    rootObject: pin(
      v2UnifiedCourseReleaseRootObjectPathV2({
        releaseId,
        rootFingerprint: root.rootFingerprint,
        rawHash: rootRawHash,
      }),
      rootRawHash,
      utf8ByteLengthV1(rootRaw),
    ),
  };
}

function audioIndex(base: ReturnType<typeof baseRelease>) {
  const sessions = base.index.sessions.map((session) => {
    const extensionFingerprint = h([
      session.courseSessionId,
      "audio-extension",
    ]);
    const rawHash = h([session.courseSessionId, "extension-raw"]);
    return {
      courseSessionId: session.courseSessionId,
      sessionOrdinal: session.sessionOrdinal,
      basePackageFingerprint: session.packageFingerprint,
      baseChildSetFingerprint: h([session.courseSessionId, "children"]),
      learnerFingerprint: h([session.courseSessionId, "learner"]),
      audioFingerprint: h([session.courseSessionId, "audio"]),
      extensionFingerprint,
      extensionPin: {
        objectPath: learningV2CourseSessionAudioReleaseExtensionObjectPathV1({
          releaseId: base.root.releaseId,
          lessonId: base.index.lessonId,
          courseSessionId: session.courseSessionId,
          extensionFingerprint,
          rawHash,
        }),
        contentHash: rawHash,
        objectGeneration: String(1_000 + session.sessionOrdinal),
        byteSize: 2_000 + session.sessionOrdinal,
        contentType: "application/json; charset=utf-8" as const,
      },
    };
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
    releaseId: base.root.releaseId,
    lessonId: base.index.lessonId,
    lessonOrdinal: 1,
    baseLessonIndexFingerprint: base.index.indexFingerprint,
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
  return parseLearningV2CourseLessonAudioReleaseIndexV1(
    canonicalJsonV1({ ...body, indexFingerprint: hashCanonicalBody(body) }),
  );
}

function composite(releaseId = "neutral-release") {
  const base = baseRelease(releaseId);
  const index = audioIndex(base);
  const indexRaw = encodeLearningV2CourseLessonAudioReleaseIndexV1(index);
  const rawHash = sha256Utf8(indexRaw);
  const root = materializeV2UnifiedCourseReleaseRootV3({
    baseRoot: base.root,
    baseRootObject: base.rootObject,
    lessons: [
      {
        index,
        indexObject: pin(
          learningV2CourseLessonAudioReleaseIndexObjectPathV1({
            releaseId: index.releaseId,
            lessonId: index.lessonId,
            indexFingerprint: index.indexFingerprint,
            rawHash,
          }),
          rawHash,
          utf8ByteLengthV1(indexRaw),
        ),
      },
    ],
  });
  const rootRaw = encodeV2UnifiedCourseReleaseRootV3(root);
  return {
    base,
    index,
    root,
    rootObject: pin(
      `learning-v2/unified-course-release-v3/roots/${h(releaseId)}/${root.rootFingerprint}/${sha256Utf8(rootRaw)}.json`,
      sha256Utf8(rootRaw),
      utf8ByteLengthV1(rootRaw),
      "9",
    ),
  };
}

describe("Learning V2 unified audio-required release root v3", () => {
  test("binds the base root and exact 56-session audio inventory", () => {
    const { base, root } = composite();
    const raw = encodeV2UnifiedCourseReleaseRootV3(root);
    expect(parseV2UnifiedCourseReleaseRootV3(raw, base.root)).toEqual(root);
    expect(isV2UnifiedCourseReleaseRootV3(root)).toBe(true);
    expect(isV2UnifiedCourseReleaseRootV3({ ...root })).toBe(false);
    expect(root).toMatchObject({
      courseModel: "direct_32_lessons_56_sessions_audio_required",
      lessonCount: 1,
      directSessionCount: 56,
      audioCoverage: "exact_audio_extension_for_every_released_session",
      requiredVoiceIds: ["ash", "onyx", "nova", "coral"],
      taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words",
      serverRequestPerPlayback: false,
      serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
      releaseAuthority: false,
    });
  });

  test("activates and rolls back the composite text+audio root atomically", () => {
    const a = composite("release-a");
    const b = composite("release-b");
    const first = decideV2UnifiedCourseReleaseHeadV3({
      current: null,
      target: a.root,
      targetObject: a.rootObject,
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-14T12:00:00.000Z",
    });
    const second = decideV2UnifiedCourseReleaseHeadV3({
      current: first.head,
      target: b.root,
      targetObject: b.rootObject,
      action: "activate",
      expectedRevision: 1,
      operationId: "activate-b",
      updatedAtIso: "2026-08-14T12:01:00.000Z",
    });
    const rollback = decideV2UnifiedCourseReleaseHeadV3({
      current: second.head,
      target: a.root,
      targetObject: a.rootObject,
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-14T12:02:00.000Z",
    });
    expect(first.kind).toBe("commit");
    expect(second.head).toMatchObject({
      activeReleaseId: "release-b",
      activeRootFingerprint: b.root.rootFingerprint,
      activeBaseRootFingerprint: b.root.baseRootFingerprint,
      previousReleaseId: "release-a",
      operationRevision: 2,
    });
    expect(rollback.head).toMatchObject({
      activeReleaseId: "release-a",
      activeRootFingerprint: a.root.rootFingerprint,
      activeBaseRootFingerprint: a.root.baseRootFingerprint,
      state: "rolled_back",
      operationRevision: 3,
      serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
    });
    const raw = encodeV2UnifiedCourseReleaseHeadV3(rollback.head);
    expect(parseV2UnifiedCourseReleaseHeadV3(raw)).toEqual(rollback.head);
    expect(isV2UnifiedCourseReleaseHeadV3(rollback.head)).toBe(true);
    expect(isV2UnifiedCourseReleaseHeadV3({ ...rollback.head })).toBe(false);
    expect(() =>
      decideV2UnifiedCourseReleaseHeadV3({
        current: second.head,
        target: b.root,
        targetObject: b.rootObject,
        action: "activate",
        expectedRevision: 2,
        operationId: "activate-b-again",
        updatedAtIso: "2026-08-14T12:03:00.000Z",
      }),
    ).toThrow("v2_unified_course_release_v3_invalid");

    expect(() =>
      decideV2UnifiedCourseReleaseHeadV3({
        current: { ...second.head },
        target: a.root,
        targetObject: a.rootObject,
        action: "rollback",
        expectedRevision: 2,
        operationId: "forged-current",
        updatedAtIso: "2026-08-14T12:04:00.000Z",
      }),
    ).toThrow("v2_unified_course_release_v3_invalid");

    const hostileHead = JSON.parse(raw);
    hostileHead.environment = "moon";
    const { headFingerprint: _ignored, ...hostileBody } = hostileHead;
    hostileHead.headFingerprint = hashCanonicalBody(hostileBody);
    expect(() =>
      parseV2UnifiedCourseReleaseHeadV3(canonicalJsonV1(hostileHead)),
    ).toThrow("v2_unified_course_release_v3_invalid");
  });

  test("rejects missing audio lessons, wrong base package binding and authority escalation", () => {
    const base = baseRelease();
    const index = audioIndex(base);
    const indexRaw = encodeLearningV2CourseLessonAudioReleaseIndexV1(index);
    const rawHash = sha256Utf8(indexRaw);
    const input = {
      baseRoot: base.root,
      baseRootObject: base.rootObject,
      lessons: [
        {
          index,
          indexObject: pin(
            learningV2CourseLessonAudioReleaseIndexObjectPathV1({
              releaseId: index.releaseId,
              lessonId: index.lessonId,
              indexFingerprint: index.indexFingerprint,
              rawHash,
            }),
            rawHash,
            utf8ByteLengthV1(indexRaw),
          ),
        },
      ],
    } as const;
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV3({ ...input, lessons: [] }),
    ).toThrow("v2_unified_course_release_v3_invalid");

    const root = materializeV2UnifiedCourseReleaseRootV3(input);
    const mutated = JSON.parse(encodeV2UnifiedCourseReleaseRootV3(root));
    mutated.serverAnswerAuthority = "server_evaluates";
    mutated.lessons[0].baseLessonIndexFingerprint = h("wrong-package-set");
    expect(() =>
      parseV2UnifiedCourseReleaseRootV3(canonicalJsonV1(mutated), base.root),
    ).toThrow("v2_unified_course_release_v3_invalid");

    const other = baseRelease("other-release");
    expect(() =>
      parseV2UnifiedCourseReleaseRootV3(
        encodeV2UnifiedCourseReleaseRootV3(root),
        other.root,
      ),
    ).toThrow("v2_unified_course_release_v3_invalid");
  });
});
