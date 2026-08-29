import { authoredLearningV2SessionSource } from "../content/source/authored_sessions_v1";
import { expandLocalized } from "../content/source/session_shard_from_source_v1";
import type { LearningV2IntroTextRunV1 } from "../content/intro_semantic_runs_v1";
import type { LearningV2ModeNativePayloadV1 } from "../contracts/mode_native_payload_v1";
import type { Lesson1AuthoringStatusV1 } from "../content/source/lesson1_authoring_registry_v1";
import { hashCanonicalBody } from "../policies/decision_registry";
import type {
  LearningV2CourseSessionAuxiliaryEntryV1,
  LearningV2CourseSessionPracticeInteractionV1,
} from "../runtime/course_session_client_children_v1";
import {
  buildLearningV2AuthoringDevicePreviewV1,
  learningV2AuthoringDevicePreviewRowsV1,
} from "./authoring_device_preview_v1";

export const LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1 =
  "learning-v2-static-owner-review-bundle.v1" as const;

export const LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1 = Object.freeze(
  ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const,
);

export type LearningV2StaticOwnerReviewInterfaceLocaleV1 =
  (typeof LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1)[number];

type LocalizedTextV1 = Readonly<
  Record<LearningV2StaticOwnerReviewInterfaceLocaleV1, string>
>;

export type LearningV2StaticOwnerReviewIntroPageV1 = Readonly<{
  pageOrdinal: number;
  pageId: string;
  kind: string;
  title: string;
  body: string;
  bodyRuns: readonly LearningV2IntroTextRunV1[];
  prompt: string;
  choices: readonly string[];
  accessibilityLabel: string;
}>;

export type LearningV2StaticOwnerReviewPracticeProjectionV1 = Readonly<{
  interactionId: string;
  prompt: string;
  responseOptions: LearningV2CourseSessionPracticeInteractionV1["responseOptions"];
  accessibilityLabel: string;
}>;

export type LearningV2StaticOwnerReviewLocaleProjectionV1 = Readonly<{
  title: string;
  summary: string;
  learningGoal: string;
  learningOutcome: string;
  introPages: readonly LearningV2StaticOwnerReviewIntroPageV1[];
  practice: readonly LearningV2StaticOwnerReviewPracticeProjectionV1[];
}>;

export type LearningV2StaticOwnerReviewInteractionV1 = Readonly<{
  interactionId: string;
  ordinal: number;
  purpose: LearningV2CourseSessionPracticeInteractionV1["purpose"];
  family: LearningV2ModeNativePayloadV1["family"];
  inputMode: LearningV2CourseSessionPracticeInteractionV1["inputMode"];
  mediaIds: readonly string[];
  audioTargetIds: readonly string[];
  modePayload: LearningV2ModeNativePayloadV1;
  scriptedAlternate: LearningV2CourseSessionPracticeInteractionV1["scriptedAlternate"];
}>;

export type LearningV2StaticOwnerReviewSessionV1 = Readonly<{
  sessionOrdinal: number;
  status: Lesson1AuthoringStatusV1;
  courseSessionId: string;
  sourceFingerprint: string;
  packageFingerprint: string;
  childSetFingerprint: string;
  practiceInteractionCount: number;
  localeProjections: Readonly<
    Record<
      LearningV2StaticOwnerReviewInterfaceLocaleV1,
      LearningV2StaticOwnerReviewLocaleProjectionV1
    >
  >;
  interactions: readonly LearningV2StaticOwnerReviewInteractionV1[];
  auxiliaryEntries: readonly LearningV2CourseSessionAuxiliaryEntryV1[];
  introAnswerKeys: readonly Readonly<{
    pageId: string;
    correctChoiceIndex: 0 | 1 | 2;
    explanationByLocale: LocalizedTextV1;
  }>[];
}>;

export type LearningV2StaticOwnerReviewBundleV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1;
  targetLanguage: "en";
  lessonOrdinal: 1;
  interfaceLocales: readonly LearningV2StaticOwnerReviewInterfaceLocaleV1[];
  sessions: readonly LearningV2StaticOwnerReviewSessionV1[];
  sideEffectPolicy: "review_only_no_learner_or_authoring_writes";
}>;

function requireModePayload(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
): LearningV2ModeNativePayloadV1 {
  if (!interaction.modePayload) {
    throw new Error(
      `learning_v2_static_owner_review_mode_payload_missing:${interaction.interactionId}`,
    );
  }
  return interaction.modePayload;
}

function buildSession(
  sessionOrdinal: number,
  status: Lesson1AuthoringStatusV1,
): LearningV2StaticOwnerReviewSessionV1 {
  const source = authoredLearningV2SessionSource(sessionOrdinal);
  if (!source) {
    throw new Error(
      `learning_v2_static_owner_review_source_missing:session=${sessionOrdinal}`,
    );
  }

  const previews = Object.fromEntries(
    LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1.map((locale) => [
      locale,
      buildLearningV2AuthoringDevicePreviewV1(sessionOrdinal, locale),
    ]),
  ) as Readonly<
    Record<
      LearningV2StaticOwnerReviewInterfaceLocaleV1,
      ReturnType<typeof buildLearningV2AuthoringDevicePreviewV1>
    >
  >;
  const base = previews.ru;
  const localizedTitle = expandLocalized(source.title);
  const localizedSummary = expandLocalized(source.summary);
  const localizedGoal = expandLocalized(source.learningGoal);

  const localeProjections = Object.fromEntries(
    LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1.map((locale) => {
      const preview = previews[locale];
      return [
        locale,
        Object.freeze({
          title: localizedTitle[locale],
          summary: localizedSummary[locale],
          learningGoal: localizedGoal[locale],
          learningOutcome: preview.introChild.learningOutcomeByLocale[locale],
          introPages: Object.freeze(
            preview.introChild.pages.map((page) =>
              Object.freeze({
                pageOrdinal: page.pageOrdinal,
                pageId: page.pageId,
                kind: page.kind,
                title: page.titleByLocale[locale],
                body: page.bodyByLocale[locale],
                bodyRuns:
                  page.bodyRunsByLocale?.[locale] ??
                  Object.freeze([
                    Object.freeze({
                      text: page.bodyByLocale[locale],
                      semantic: "explanation" as const,
                    }),
                  ]),
                prompt: page.question.promptByLocale[locale],
                choices: page.question.choicesByLocale[locale],
                accessibilityLabel:
                  page.question.accessibilityLabelByLocale[locale],
              }),
            ),
          ),
          practice: Object.freeze(
            preview.learnerChild.interactions.map((interaction) =>
              Object.freeze({
                interactionId: interaction.interactionId,
                prompt: interaction.prompt,
                responseOptions: interaction.responseOptions,
                accessibilityLabel: interaction.accessibilityLabel,
              }),
            ),
          ),
        }),
      ] as const;
    }),
  ) as Readonly<
    Record<
      LearningV2StaticOwnerReviewInterfaceLocaleV1,
      LearningV2StaticOwnerReviewLocaleProjectionV1
    >
  >;

  return Object.freeze({
    sessionOrdinal,
    status,
    courseSessionId: base.courseSessionId,
    sourceFingerprint: hashCanonicalBody(source),
    packageFingerprint: base.packageFingerprint,
    childSetFingerprint: base.childSetFingerprint,
    practiceInteractionCount: base.learnerChild.practiceInteractionCount,
    localeProjections,
    interactions: Object.freeze(
      base.learnerChild.interactions.map((interaction) =>
        Object.freeze({
          interactionId: interaction.interactionId,
          ordinal: interaction.ordinal,
          purpose: interaction.purpose,
          family: requireModePayload(interaction).family,
          inputMode: interaction.inputMode,
          mediaIds: interaction.mediaIds,
          audioTargetIds: interaction.audioTargetIds,
          modePayload: requireModePayload(interaction),
          scriptedAlternate: interaction.scriptedAlternate,
        }),
      ),
    ),
    auxiliaryEntries: base.auxiliaryChild.entries,
    introAnswerKeys: Object.freeze(
      source.introPages.map((page, index) =>
        Object.freeze({
          pageId: base.introChild.pages[index].pageId,
          correctChoiceIndex: page.question.correctChoiceIndex,
          explanationByLocale: expandLocalized(page.question.explanation),
        }),
      ),
    ),
  });
}

export function buildLearningV2StaticOwnerReviewBundleV1(): LearningV2StaticOwnerReviewBundleV1 {
  return Object.freeze({
    schemaVersion: LEARNING_V2_STATIC_OWNER_REVIEW_BUNDLE_SCHEMA_V1,
    targetLanguage: "en" as const,
    lessonOrdinal: 1 as const,
    interfaceLocales: LEARNING_V2_STATIC_OWNER_REVIEW_INTERFACE_LOCALES_V1,
    sessions: Object.freeze(
      learningV2AuthoringDevicePreviewRowsV1().map((row) =>
        buildSession(row.sessionOrdinal, row.status),
      ),
    ),
    sideEffectPolicy:
      "review_only_no_learner_or_authoring_writes" as const,
  });
}
