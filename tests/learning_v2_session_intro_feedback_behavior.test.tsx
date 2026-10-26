import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import LearningV2SessionIntro from "../app/learning_v2_session_intro";
import type { LessonIntroScreen } from "../app/lesson_data_types";

/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load their mocked modules at runtime. */

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Pressable: "Pressable",
  Platform: { OS: "ios", select: (values: Record<string, unknown>) => values.ios },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) =>
      Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
  useWindowDimensions: () => ({ width: 375, height: 812 }),
}));

jest.mock("../components/LangContext", () => ({
  useLang: () => ({ lang: "ru" }),
}));
jest.mock("../constants/i18n", () => ({
  triLang: (lang: string, values: Record<string, string>) => values[lang],
}));
jest.mock("../components/StudyTargetContext", () => ({
  useStudyTarget: () => ({ studyTarget: "en" }),
}));
jest.mock("../components/lesson_intro_rich", () => ({
  plainIntroText: (screen: LessonIntroScreen) => screen.textRU ?? "",
  richIntroLines: (screen: LessonIntroScreen) => screen.linesRU ?? [],
  richSubtitle: (screen: LessonIntroScreen) => screen.subtitleRU ?? "",
  richTitle: (screen: LessonIntroScreen) => screen.titleRU ?? "",
}));
jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({
    theme: require("../constants/theme").INDIGO,
    themeMode: "indigo",
  }),
}));
jest.mock("../app/stable_safe_area_metrics", () => ({
  useStableSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("../components/ReportErrorButton", () => () => null);
jest.mock("../hooks/use-haptics", () => ({
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticTap: jest.fn(),
}));
jest.mock("@expo/vector-icons/Ionicons", () => {
  const MockIonicon = () => null;
  (MockIonicon as { glyphMap?: Readonly<Record<string, unknown>> }).glyphMap = {};
  return MockIonicon;
});
jest.mock("../components/SafeLinearGradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
  };
});
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
  };
});
jest.mock("../components/PressableHybrid", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return function MockPressableHybrid({
    children,
    contentStyle,
    variant: _variant,
    ...props
  }: React.PropsWithChildren<Record<string, unknown> & { contentStyle?: unknown; variant?: unknown }>) {
    return React.createElement(
      Pressable,
      props,
      React.createElement(View, { style: contentStyle }, children),
    );
  };
});
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const animation = {
    duration: () => animation,
    reduceMotion: () => animation,
  };
  return {
    __esModule: true,
    default: { View },
    FadeInDown: animation,
    ReduceMotion: { System: "system" },
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: unknown) => ({ value }),
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
  };
});

const localized = <T,>(value: T) => ({
  ru: value,
  uk: value,
  es: value,
  "pt-BR": value,
  vi: value,
  id: value,
  tr: value,
  pl: value,
});

const introScreen: LessonIntroScreen = {
  lessonId: 1,
  screenId: "feedback-contract",
  order: 1,
  kind: "concept",
  titleRU: "Связка am",
  titleUK: "Linking verb am",
  titleES: "Linking verb am",
  linesRU: [{ type: "text", text: "После I нужна связка am." }],
  learningV2EmbeddedQuestion: {
    kind: "embedded_intro_question",
    taskSlot: 1,
    questionId: "feedback-question",
    promptByLocale: localized("Какая фраза верна?"),
    choicesByLocale: localized(["I here", "Am here", "I am here"]),
    correctChoiceIndex: 2,
    explanationByLocale: localized("Резервное объяснение не должно показываться."),
    responseIdsInVisibleOrder: ["wrong-1", "wrong-2", "correct"],
  },
};

const detailedAnalysis = (text: string) => ({
  analysis: {
    text,
    meaningByLocale: localized("Длинное значение ответа."),
    explanationByLocale: localized("Длинный полный разбор ответа."),
    units: [{
      text: "am",
      start: 2,
      end: 4,
      lemma: "be",
      partOfSpeech: "linking_verb" as const,
      partOfSpeechLabelByLocale: localized("глагол-связка"),
      meaningByLocale: localized("форма be"),
      functionByLocale: localized("Полное описание функции слова."),
      sourceRefs: ["test#am"],
    }],
  },
  diagnostics: {
    errorType: "missing_subject",
    whyTemptingByLocale: localized("Почему вариант кажется подходящим."),
    whyWrongHereByLocale: localized("Почему вариант здесь неверен."),
    minimalContrastByLocale: localized("Полный диагностический контраст."),
    acceptabilityBoundaryByLocale: localized("Граница допустимости."),
  },
});

test("intro shows only concise error feedback after wrong answers and no analysis after a correct answer", async () => {
  const resolveChoiceAnalysis = jest.fn((_interactionId: string, choiceIndex: number) =>
    detailedAnalysis(["I here", "Am here", "I am here"][choiceIndex] ?? ""),
  );
  const view = await render(
    <LearningV2SessionIntro
      introScreens={[introScreen]}
      lessonId={1}
      sessionOrdinal={1}
      taskIds={["task-1", "task-2", "task-3"]}
      evaluateChoice={({ choiceIndex }) => choiceIndex === 2 ? "correct" : "wrong"}
      resolveSecondWrongExplanation={(_interactionId, choiceIndex) =>
        choiceIndex === 1 ? "Добавьте подлежащее I: I am here." : null
      }
      resolveChoiceAnalysis={resolveChoiceAnalysis}
      onComplete={jest.fn()}
    />,
  );

  await fireEvent.press(view.getByTestId("learning-v2-intro-answer-0"));
  await fireEvent.press(view.getByTestId("learning-v2-intro-answer-1"));
  expect(view.getByText("Добавьте подлежащее I: I am here.")).toBeTruthy();
  expect(view.queryByTestId("learning-v2-text-analysis")).toBeNull();
  expect(view.queryByText("Полный диагностический контраст.")).toBeNull();

  await fireEvent.press(view.getByTestId("learning-v2-intro-answer-2"));
  expect(view.getByText("Верно")).toBeTruthy();
  expect(view.queryByText("Добавьте подлежащее I: I am here.")).toBeNull();
  expect(view.queryByTestId("learning-v2-text-analysis")).toBeNull();
  expect(view.queryByText("Длинный полный разбор ответа.")).toBeNull();
  expect(resolveChoiceAnalysis).not.toHaveBeenCalled();
});
