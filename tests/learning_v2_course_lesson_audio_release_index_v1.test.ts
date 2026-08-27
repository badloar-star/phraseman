import {
  encodeLearningV2CourseLessonAudioReleaseIndexV1,
  materializeLearningV2CourseLessonAudioReleaseIndexV1,
  parseLearningV2CourseLessonAudioReleaseIndexV1,
} from "../modules/learning-v2/runtime/course_lesson_audio_release_index_v1";
import {
  materializeLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioFileInputV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  materializeLearningV2CourseSessionAudioReleaseExtensionV1,
} from "../modules/learning-v2/runtime/course_session_audio_release_extension_v1";
import {
  materializeLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
  materializeLearningV2CourseLessonReleaseIndexV1,
} from "../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
  encodeLearningV2CourseSessionReleasePackageV1,
  materializeLearningV2CourseSessionReleasePackageV1,
} from "../modules/learning-v2/runtime/course_session_release_package_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../modules/learning-v2/policies/decision_registry";

const locales = ["ru", "uk", "en", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const localized = (value: string) =>
  Object.freeze(
    Object.fromEntries(locales.map((locale) => [locale, `${value} ${locale}`])),
  ) as Record<(typeof locales)[number], string>;
const h = (value: unknown) => hashCanonicalBody(value);

function files(
  sessionOrdinal: number,
): readonly LearningV2CourseSessionAudioFileInputV1[] {
  return (["ash", "onyx", "nova", "coral"] as const).map((voiceId) => {
    const contentHash = h(["audio", sessionOrdinal, voiceId]);
    return {
      voiceId,
      objectPath: `learning-v2/voice-audio/${h("profile")}/${h("source")}/${h([sessionOrdinal, "group"])}/${contentHash}.mp3`,
      contentHash,
      objectGeneration: "3",
      byteSize: 1_024,
      contentType: "audio/mpeg" as const,
    };
  });
}

function sessionArtifacts(sessionOrdinal: number) {
  const courseSessionId = `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`;
  const interactionIds = Array.from(
    { length: 16 },
    (_, index) => `s${sessionOrdinal}-interaction-${index + 1}`,
  );
  const learner: LearningV2CourseSessionLearnerChildV1 =
    materializeLearningV2CourseSessionLearnerChildV1({
      courseSessionId,
      targetLanguage: "en-US",
      interactionProfile: "standard",
      interactions: interactionIds.slice(3).map((interactionId, index) => ({
        interactionId,
        ordinal: index + 4,
        purpose: "supported_practice" as const,
        family: "phrase_builder" as const,
        inputMode: "ordered_tokens" as const,
        prompt: `Neutral prompt ${sessionOrdinal}-${index + 1}`,
        responseOptions: [
          {
            responseId: `s${sessionOrdinal}-chip-${index + 1}`,
            text: `word${index + 1}`,
          },
        ],
        mediaIds: [],
        audioTargetIds: index === 0 ? [h([sessionOrdinal, "target"])] : [],
        accessibilityLabel: `Neutral prompt ${sessionOrdinal}-${index + 1}`,
        scriptedAlternate: null,
      })),
    });
  const packageValue = materializeLearningV2CourseSessionReleasePackageV1({
    releaseId: "neutral-release",
    lessonOrdinal: 1,
    sessionOrdinal,
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    learningOutcomeKind: "learn",
    learningOutcomeByLocale: localized(`Neutral outcome ${sessionOrdinal}`),
    interactionProfile: "standard",
    interactionIds,
    children: (
      [
        "intro",
        "learner",
        "evaluator_capsule",
        "evaluator_sidecar",
        "auxiliary",
      ] as const
    ).map((kind) => ({
      kind,
      schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
      artifactFingerprint:
        kind === "learner"
          ? learner.learnerFingerprint
          : h([sessionOrdinal, kind, "artifact"]),
      contentHash: h([sessionOrdinal, kind, "raw"]),
      objectGeneration: "1",
      byteSize: 128,
    })),
  });
  const audio = materializeLearningV2CourseSessionAudioChildV1({
    learner,
    interactions: [
      {
        interactionId: interactionIds[3]!,
        taskVoiceGroupFingerprint: h([sessionOrdinal, "voice-group"]),
        fullPhraseFiles: files(sessionOrdinal),
        selectables: [
          {
            selectableId: `s${sessionOrdinal}-chip-1`,
            audioTargetId: h([sessionOrdinal, "target"]),
            wordId: h([sessionOrdinal, "word", 1]),
            wordOrdinal: 1,
            visibleText: "word1",
            files: files(sessionOrdinal),
          },
        ],
      },
    ],
  });
  const extension = materializeLearningV2CourseSessionAudioReleaseExtensionV1({
    package: packageValue,
    learner,
    audio,
    audioChildObjectGeneration: "4",
  });
  const packageRaw =
    encodeLearningV2CourseSessionReleasePackageV1(packageValue);
  return { extension, packageValue, packageRaw };
}

function fixture() {
  const artifacts = Array.from({ length: 56 }, (_, index) =>
    sessionArtifacts(index + 1),
  );
  const baseIndex = materializeLearningV2CourseLessonReleaseIndexV1({
    releaseId: "neutral-release",
    lessonOrdinal: 1,
    titleByLocale: localized("Neutral lesson"),
    canDoByLocale: localized("Neutral learner outcome"),
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    sessions: artifacts.map(({ packageValue, packageRaw }) => ({
      courseSessionId: packageValue.courseSessionId,
      learningOutcomeKind: packageValue.learningOutcomeKind,
      learningOutcomeByLocale: packageValue.learningOutcomeByLocale,
      packageSchemaVersion:
        LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
      packageFingerprint: packageValue.packageFingerprint,
      contentHash: sha256Utf8(packageRaw),
      objectGeneration: "5",
      byteSize: utf8ByteLengthV1(packageRaw),
    })),
  });
  return { artifacts, baseIndex };
}

describe("Learning V2 lesson audio release index", () => {
  test("binds all 56 base packages to exact audio extensions", () => {
    const { artifacts, baseIndex } = fixture();
    const index = materializeLearningV2CourseLessonAudioReleaseIndexV1({
      baseIndex,
      sessions: artifacts.map(({ extension }) => ({
        extension,
        extensionObjectGeneration: "6",
      })),
    });
    const raw = encodeLearningV2CourseLessonAudioReleaseIndexV1(index);
    expect(parseLearningV2CourseLessonAudioReleaseIndexV1(raw)).toEqual(index);
    expect(index.sessions).toHaveLength(56);
    expect(index.sessions[0]).toMatchObject({
      courseSessionId: "lesson-01:session:01",
      basePackageFingerprint: artifacts[0]!.packageValue.packageFingerprint,
      extensionFingerprint: artifacts[0]!.extension.extensionFingerprint,
    });
    expect(index.sessions[55]).toMatchObject({
      courseSessionId: "lesson-01:session:56",
      basePackageFingerprint: artifacts[55]!.packageValue.packageFingerprint,
    });
    expect(index).toMatchObject({
      joinPolicy: "exact_56_base_package_to_audio_extension_bijection",
      playbackPolicy: "generation_pinned_local_files_no_session_network_tts",
      answerPayload: "absent_by_exact_schema",
      correctnessAuthority: "none",
      releaseAuthority: false,
    });
  });

  test("rejects missing, reordered, cross-session and authority-mutated rows", () => {
    const { artifacts, baseIndex } = fixture();
    const sessions = artifacts.map(({ extension }) => ({
      extension,
      extensionObjectGeneration: "6",
    }));
    expect(() =>
      materializeLearningV2CourseLessonAudioReleaseIndexV1({
        baseIndex,
        sessions: sessions.slice(0, 55),
      }),
    ).toThrow("learning_v2_course_lesson_audio_release_index_invalid");
    expect(() =>
      materializeLearningV2CourseLessonAudioReleaseIndexV1({
        baseIndex,
        sessions: [sessions[1]!, sessions[0]!, ...sessions.slice(2)],
      }),
    ).toThrow("learning_v2_course_lesson_audio_release_index_invalid");

    const index = materializeLearningV2CourseLessonAudioReleaseIndexV1({
      baseIndex,
      sessions,
    });
    const mutated = JSON.parse(
      encodeLearningV2CourseLessonAudioReleaseIndexV1(index),
    );
    mutated.correctnessAuthority = "server";
    mutated.sessions[0].extensionPin.contentHash = h("wrong-raw");
    expect(() =>
      parseLearningV2CourseLessonAudioReleaseIndexV1(canonicalJsonV1(mutated)),
    ).toThrow("learning_v2_course_lesson_audio_release_index_invalid");
  });
});
