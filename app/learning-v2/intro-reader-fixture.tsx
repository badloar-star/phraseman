import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import LearningV2SessionIntro from "../learning_v2_session_intro";
import { ENABLE_DEV_TOOLS } from "../config";
import { isSelectableThemeMode } from "../theme_access_policy";
import type {
  IntroLine,
  LearningV2EmbeddedIntroQuestion,
  LessonIntroScreen,
} from "../lesson_data_types";
import { useTheme } from "../../components/ThemeContext";

const locales = ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"] as const;

const localized = <T,>(value: T) =>
  Object.freeze(Object.fromEntries(locales.map((locale) => [locale, value]))) as Record<
    (typeof locales)[number],
    T
  >;

const readerLines = (
  before: string,
  correct: string,
  between: string,
  wrong: string,
  after: string,
): IntroLine[] => [
  {
    type: "text",
    parts: [
      { text: before, semantic: "explanation" },
      { text: correct, semantic: "targetCorrect" },
      { text: between, semantic: "explanation" },
      { text: wrong, semantic: "targetWrong" },
      { text: after, semantic: "explanation" },
    ],
  },
];

const question = (taskSlot: 1 | 2 | 3): LearningV2EmbeddedIntroQuestion => ({
  kind: "embedded_intro_question",
  taskSlot,
  questionId: `reader-a-fixture-question-${taskSlot}`,
  promptByLocale: localized("Which phrase is complete?"),
  choicesByLocale: localized(["I here", "Am here", "I am here"]),
  correctChoiceIndex: 2,
  explanationByLocale: localized("I needs the linking verb am."),
});

const fixtureScreens: readonly LessonIntroScreen[] = Object.freeze([
  {
    lessonId: 1,
    screenId: "reader-a-fixture-concept",
    order: 1,
    kind: "concept",
    titleRU: "English needs a linking verb",
    titleUK: "English needs a linking verb",
    titleES: "English needs a linking verb",
    titlePtBr: "English needs a linking verb",
    titleVi: "English needs a linking verb",
    titleId: "English needs a linking verb",
    titleTr: "English needs a linking verb",
    titlePl: "English needs a linking verb",
    linesRU: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesUK: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesES: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesPtBr: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesVi: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesId: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesTr: readerLines("Use ", "I am here", ", not ", "I here", "."),
    linesPl: readerLines("Use ", "I am here", ", not ", "I here", "."),
    learningV2EmbeddedQuestion: question(1),
  },
  {
    lessonId: 1,
    screenId: "reader-a-fixture-formula",
    order: 2,
    kind: "formula",
    titleRU: "Build the complete thought",
    titleUK: "Build the complete thought",
    titleES: "Build the complete thought",
    titlePtBr: "Build the complete thought",
    titleVi: "Build the complete thought",
    titleId: "Build the complete thought",
    titleTr: "Build the complete thought",
    titlePl: "Build the complete thought",
    linesRU: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesUK: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesES: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesPtBr: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesVi: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesId: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesTr: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    linesPl: readerLines("The pattern is ", "I + am + place", ", not ", "I + place", "."),
    learningV2EmbeddedQuestion: question(2),
  },
  {
    lessonId: 1,
    screenId: "reader-a-fixture-trap",
    order: 3,
    kind: "practice",
    titleRU: "Do not drop am",
    titleUK: "Do not drop am",
    titleES: "Do not drop am",
    titlePtBr: "Do not drop am",
    titleVi: "Do not drop am",
    titleId: "Do not drop am",
    titleTr: "Do not drop am",
    titlePl: "Do not drop am",
    linesRU: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesUK: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesES: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesPtBr: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesVi: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesId: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesTr: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    linesPl: readerLines("Say ", "I am ready", ", never ", "I ready", "."),
    learningV2EmbeddedQuestion: question(3),
  },
]);

export default function LearningV2IntroReaderFixtureRoute() {
  const params = useLocalSearchParams<{ run?: string; theme?: string }>();
  const { setPreviewThemeMode } = useTheme();
  const [complete, setComplete] = useState(false);
  const requestedTheme = useMemo(
    () => (isSelectableThemeMode(params.theme) ? params.theme : "indigo"),
    [params.theme],
  );
  const fixtureKey = `${requestedTheme}:${params.run ?? "default"}`;

  useEffect(() => {
    setPreviewThemeMode(requestedTheme);
    return () => setPreviewThemeMode(null);
  }, [requestedTheme, setPreviewThemeMode]);

  // зачем (владелец, 25.08): DEV_MODE=true всегда истинно в этом билде, поэтому
  // `!DEV_MODE && ...` было мёртвым кодом и пропускало фикстуру в стор-сборку
  // по диплинку. ENABLE_DEV_TOOLS уже гасится IS_STORE_RELEASE — этого хватает.
  if (!ENABLE_DEV_TOOLS) return <Redirect href="/" />;
  if (complete) return <View testID="learning-v2-intro-fixture-complete" />;

  return (
    <View testID="learning-v2-intro-fixture" style={{ flex: 1 }}>
      <LearningV2SessionIntro
        key={fixtureKey}
        introScreens={fixtureScreens}
        lessonId={1}
        sessionOrdinal={1}
        taskIds={["fixture-task-1", "fixture-task-2", "fixture-task-3"]}
        evaluateChoice={({ choiceIndex }) =>
          choiceIndex === 2 ? "correct" : "wrong"
        }
        onComplete={() => setComplete(true)}
      />
    </View>
  );
}
