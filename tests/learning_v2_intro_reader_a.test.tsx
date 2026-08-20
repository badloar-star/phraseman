import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import LearningV2SessionIntro from "../app/learning_v2_session_intro";
import { INDIGO } from "../constants/theme";
import type { LessonIntroScreen } from "../app/lesson_data_types";

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
jest.mock("../app/lesson_intro_rich", () => ({
  plainIntroText: (screen: LessonIntroScreen) => screen.textRU ?? "",
  richIntroLines: (screen: LessonIntroScreen) => screen.linesRU ?? [],
  richSubtitle: (screen: LessonIntroScreen) => screen.subtitleRU ?? "",
  richTitle: (screen: LessonIntroScreen) => screen.titleRU ?? "",
}));
jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({ theme: require("../constants/theme").INDIGO, themeMode: "indigo" }),
}));
jest.mock("../app/stable_safe_area_metrics", () => ({
  useStableSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock("../hooks/use-haptics", () => ({
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticTap: jest.fn(),
}));
jest.mock("@expo/vector-icons/Ionicons", () => {
  const MockIonicon = () => null;
  (MockIonicon as any).glyphMap = {};
  return MockIonicon;
});
jest.mock("../components/SafeLinearGradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
  };
});
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
jest.mock("../components/DuoPressable", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return ({ children, wrapStyle, edgeColor, edgeHeight, ...props }: any) =>
    React.createElement(Pressable, { ...props, style: [wrapStyle, props.style] }, children);
});
jest.mock("../components/PressableHybrid", () => {
  const React = require("react");
  const { Pressable, View } = require("react-native");
  return ({ children, contentStyle, variant, ...props }: any) =>
    React.createElement(
      Pressable,
      props,
      React.createElement(View, { style: contentStyle }, children),
    );
});
jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View } = require("react-native");
  const animation = {
    duration: () => animation,
    reduceMotion: () => animation,
  };
  return {
    __esModule: true,
    default: { View },
    FadeIn: animation,
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

const screen = (ordinal: 1 | 2 | 3): LessonIntroScreen => ({
  lessonId: 1,
  screenId: `page-${ordinal}`,
  order: ordinal,
  kind: ordinal === 2 ? "formula" : ordinal === 3 ? "practice" : "concept",
  titleRU: "Почему здесь нужна связка",
  titleUK: "Title",
  titleES: "Title",
  linesRU: [
    {
      type: "text",
      parts: [
        { text: "По-английски говорим ", semantic: "explanation" },
        { text: "I am here", semantic: "targetCorrect" },
        { text: ", а не ", semantic: "explanation" },
        { text: "I here", semantic: "targetWrong" },
        { text: ".", semantic: "explanation" },
      ],
    },
  ],
  learningV2EmbeddedQuestion: {
    kind: "embedded_intro_question",
    taskSlot: ordinal,
    questionId: `question-${ordinal}`,
    promptByLocale: localized("Какая фраза верна?"),
    choicesByLocale: localized(["I here", "Am here", "I am here"]),
    correctChoiceIndex: 2,
    explanationByLocale: localized("После I нужна связка am."),
  },
});

describe("Learning V2 intro Reader A", () => {
  test("renders semantic inline copy and keeps progress locked until the supplied answer is correct", async () => {
    const evaluateChoice = jest.fn(({ choiceIndex }) =>
      choiceIndex === 2 ? "correct" : "wrong",
    );
    const view = await render(
      <LearningV2SessionIntro
        introScreens={[screen(1), screen(2), screen(3)]}
        lessonId={1}
        sessionOrdinal={1}
        taskIds={["task-1", "task-2", "task-3"]}
        evaluateChoice={evaluateChoice}
        onComplete={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    const paragraph = view.getByTestId("learning-v2-intro-reader-paragraph");
    const inlineText = paragraph.props.children
      .map((child: { props: { children: string } }) => child.props.children)
      .join("");
    expect(inlineText).toBe("По-английски говорим I am here, а не I here.");

    const target = view.getByTestId("learning-v2-intro-part-0-1");
    const targetStyle = StyleSheet.flatten(target.props.style);
    expect(targetStyle.fontWeight).toBe("700");
    expect(targetStyle.color).not.toBe(INDIGO.textOnCard);

    const wrong = view.getByTestId("learning-v2-intro-part-0-3");
    const wrongStyle = StyleSheet.flatten(wrong.props.style);
    expect(wrongStyle.textDecorationLine).toBe("line-through");
    expect(wrong.props.accessibilityLabel).toContain("неверный пример");

    const close = view.getByTestId("learning-v2-intro-close");
    expect(StyleSheet.flatten(close.props.style)).toMatchObject({
      minWidth: 44,
      minHeight: 44,
    });

    const next = view.getByTestId("learning-v2-intro-next");
    expect(next.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(view.getByTestId("learning-v2-intro-answer-0"));
    await fireEvent.press(view.getByTestId("learning-v2-intro-answer-1"));
    expect(view.getByText("После I нужна связка am.")).toBeTruthy();
    await fireEvent.press(view.getByTestId("learning-v2-intro-answer-2"));
    expect(view.getByTestId("learning-v2-intro-next").props.accessibilityState.disabled).toBe(false);
    expect(JSON.stringify(view.toJSON()).toLowerCase()).not.toContain("сесси");
  });
});
