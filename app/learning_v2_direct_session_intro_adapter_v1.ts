import type {
  IntroLine,
  LessonIntroScreen,
  LearningV2EmbeddedIntroQuestion,
} from "./lesson_data_types";
import type { LearningV2CourseSessionDeviceRunHandleV1 } from "../modules/learning-v2/runtime/course_session_device_run_v1";
import {
  getLearningV2CourseSessionAuxiliaryEntryV1,
  getLearningV2CourseSessionDeviceRunSummaryV1,
  getLearningV2CourseSessionIntroPageV1,
} from "../modules/learning-v2/runtime/course_session_device_run_v1";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";

const locales = [
  "ru",
  "uk",
  "es",
  "pt-BR",
  "vi",
  "id",
  "tr",
  "pl",
] as const satisfies readonly LearningV2InterfaceLocale[];

const lineKeyByLocale = Object.freeze({
  ru: "linesRU",
  uk: "linesUK",
  es: "linesES",
  "pt-BR": "linesPtBr",
  vi: "linesVi",
  id: "linesId",
  tr: "linesTr",
  pl: "linesPl",
} as const);
const titleKeyByLocale = Object.freeze({
  ru: "titleRU",
  uk: "titleUK",
  es: "titleES",
  "pt-BR": "titlePtBr",
  vi: "titleVi",
  id: "titleId",
  tr: "titleTr",
  pl: "titlePl",
} as const);

/**
 * Produces the existing rich intro view model without exposing the accepted
 * answer. The placeholder index is never read when `evaluateChoice` is wired;
 * device-run evaluator commitments own the actual decision.
 */
export function adaptLearningV2DirectSessionIntroV1(
  run: LearningV2CourseSessionDeviceRunHandleV1,
): readonly [LessonIntroScreen, LessonIntroScreen, LessonIntroScreen] {
  const summary = getLearningV2CourseSessionDeviceRunSummaryV1(run);
  const screens = [1, 2, 3].map((pageOrdinal) => {
    const page = getLearningV2CourseSessionIntroPageV1(
      run,
      pageOrdinal as 1 | 2 | 3,
    );
    const choicesByLocale = Object.fromEntries(
      locales.map((locale) => [
        locale,
        Object.freeze([...page.question.choicesByLocale[locale]]),
      ]),
    ) as LearningV2EmbeddedIntroQuestion["choicesByLocale"];
    const promptByLocale = Object.freeze({
      ...page.question.promptByLocale,
    }) as LearningV2EmbeddedIntroQuestion["promptByLocale"];
    const explanation = getLearningV2CourseSessionAuxiliaryEntryV1(
      run,
      page.question.interactionId,
    ).secondErrorExplanationByLocale;
    const question = Object.freeze({
      kind: "embedded_intro_question" as const,
      taskSlot: page.pageOrdinal,
      // The intro component passes this exact value back to the local device
      // evaluator; it is an interaction id despite the legacy field name.
      questionId: page.question.interactionId,
      promptByLocale,
      choicesByLocale: Object.freeze(choicesByLocale),
      correctChoiceIndex: 0 as const,
      explanationByLocale: Object.freeze({ ...explanation }),
    });
    const localizedLines = Object.fromEntries(
      locales.map((locale) => [
        lineKeyByLocale[locale],
        [
          {
            type: page.kind === "formula" ? "formula" : "text",
            parts: page.bodyRunsByLocale
              ? page.bodyRunsByLocale[locale].map((run) => ({
                  text: run.text,
                  semantic: run.semantic,
                }))
              : [
                  {
                    text: page.bodyByLocale[locale],
                    semantic: "explanation" as const,
                  },
                ],
          },
        ] satisfies IntroLine[],
      ]),
    );
    const localizedTitles = Object.fromEntries(
      locales.map((locale) => [
        titleKeyByLocale[locale],
        page.titleByLocale[locale],
      ]),
    );
    return Object.freeze({
      lessonId: summary.lessonOrdinal,
      screenId: page.pageId,
      order: page.pageOrdinal,
      kind:
        page.kind === "formula"
          ? "formula"
          : page.pageOrdinal === 3
            ? "practice"
            : "concept",
      ...localizedTitles,
      ...localizedLines,
      learningV2EmbeddedQuestion: question,
    }) as LessonIntroScreen;
  });
  return Object.freeze(screens) as readonly [
    LessonIntroScreen,
    LessonIntroScreen,
    LessonIntroScreen,
  ];
}
