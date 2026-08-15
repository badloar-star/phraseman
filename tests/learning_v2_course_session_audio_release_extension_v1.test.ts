import {
  encodeLearningV2CourseSessionAudioChildV1,
  materializeLearningV2CourseSessionAudioChildV1,
} from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  encodeLearningV2CourseSessionAudioReleaseExtensionV1,
  materializeLearningV2CourseSessionAudioReleaseExtensionV1,
  parseLearningV2CourseSessionAudioReleaseExtensionV1,
} from "../modules/learning-v2/runtime/course_session_audio_release_extension_v1";
import { materializeLearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1,
  materializeLearningV2CourseSessionReleasePackageV1,
} from "../modules/learning-v2/runtime/course_session_release_package_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;
const localized = (value: string) =>
  Object.freeze(
    Object.fromEntries(locales.map((locale) => [locale, `${value} ${locale}`])),
  ) as Record<(typeof locales)[number], string>;

function fixture() {
  const interactionIds = Array.from(
    { length: 16 },
    (_, index) => `interaction-${index + 1}`,
  );
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: interactionIds.slice(3).map((interactionId, index) => ({
      interactionId,
      ordinal: index + 4,
      purpose: "supported_practice" as const,
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Neutral ${index + 1}`,
      responseOptions: [
        { responseId: `chip-${index + 1}`, text: `word${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: index === 0 ? [h("target")] : [],
      accessibilityLabel: `Neutral ${index + 1}`,
      scriptedAlternate: null,
    })),
  });
  const voices = ["ash", "onyx", "nova", "coral"] as const;
  const files = voices.map((voiceId) => {
    const contentHash = h([voiceId, "word"]);
    return {
      voiceId,
      objectPath: `learning-v2/voice-audio/${h("a")}/${h("b")}/${h("c")}/${contentHash}.mp3`,
      contentHash,
      objectGeneration: "1",
      byteSize: 999,
      contentType: "audio/mpeg" as const,
    };
  });
  const audio = materializeLearningV2CourseSessionAudioChildV1({
    learner,
    interactions: [
      {
        interactionId: "interaction-4",
        taskVoiceGroupFingerprint: h("group"),
        fullPhraseFiles: files,
        selectables: [
          {
            selectableId: "chip-1",
            audioTargetId: h("target"),
            wordId: h("word"),
            wordOrdinal: 1,
            visibleText: "word1",
            files,
          },
        ],
      },
    ],
  });
  const childKinds = [
    "intro",
    "learner",
    "evaluator_capsule",
    "evaluator_sidecar",
    "auxiliary",
  ] as const;
  const packageValue = materializeLearningV2CourseSessionReleasePackageV1({
    releaseId: "neutral-release",
    lessonOrdinal: 1,
    sessionOrdinal: 1,
    ownerLessonFingerprint: h("owner-lesson"),
    ownerConfirmationFingerprint: h("owner-confirmation"),
    learningOutcomeKind: "learn",
    learningOutcomeByLocale: localized("Neutral outcome"),
    interactionProfile: "standard",
    interactionIds,
    children: childKinds.map((kind) => ({
      kind,
      schemaVersion: LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind],
      artifactFingerprint: h([kind, "artifact"]),
      contentHash: h([kind, "raw"]),
      objectGeneration: "1",
      byteSize: 100,
    })),
  });
  return { learner, audio, packageValue };
}

describe("Learning V2 additive direct-session audio release extension", () => {
  test("binds audio child without mutating the existing package fingerprint", () => {
    const value = fixture();
    const originalPackageFingerprint = value.packageValue.packageFingerprint;
    const extension = materializeLearningV2CourseSessionAudioReleaseExtensionV1(
      {
        package: value.packageValue,
        learner: value.learner,
        audio: value.audio,
        audioChildObjectGeneration: "7",
      },
    );
    const raw = encodeLearningV2CourseSessionAudioReleaseExtensionV1(extension);
    expect(parseLearningV2CourseSessionAudioReleaseExtensionV1(raw)).toEqual(
      extension,
    );
    expect(value.packageValue.packageFingerprint).toBe(
      originalPackageFingerprint,
    );
    expect(extension).toMatchObject({
      basePackageFingerprint: originalPackageFingerprint,
      learnerFingerprint: value.learner.learnerFingerprint,
      audioFingerprint: value.audio.audioFingerprint,
      extensionModel: "additive_audio_child_does_not_mutate_base_package_v1",
      serverRequestPerPlayback: false,
      answerPayload: "absent_by_exact_schema",
      correctnessAuthority: "none",
      releaseAuthority: false,
    });
    expect(extension.audioChildPin.contentHash).toBe(
      sha256Utf8(encodeLearningV2CourseSessionAudioChildV1(value.audio)),
    );
  });

  test("rejects base-package, learner, audio-pin and authority substitution", () => {
    const value = fixture();
    const extension = materializeLearningV2CourseSessionAudioReleaseExtensionV1(
      {
        package: value.packageValue,
        learner: value.learner,
        audio: value.audio,
        audioChildObjectGeneration: "7",
      },
    );
    const decoded = JSON.parse(
      encodeLearningV2CourseSessionAudioReleaseExtensionV1(extension),
    );
    decoded.basePackageFingerprint = h("wrong-package");
    decoded.repositoryOriginAuthority = "authenticated";
    decoded.audioChildPin.contentHash = h("wrong-audio");
    expect(() =>
      parseLearningV2CourseSessionAudioReleaseExtensionV1(
        canonicalJsonV1(decoded),
      ),
    ).toThrow("learning_v2_course_session_audio_release_extension_invalid");
  });
});
