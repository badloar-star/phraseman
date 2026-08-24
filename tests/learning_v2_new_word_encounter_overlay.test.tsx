import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import LearningV2NewWordEncounterOverlay from "../components/learning-v2/LearningV2NewWordEncounterOverlay";
import { INDIGO } from "../constants/theme";

jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({ theme: require("../constants/theme").INDIGO }),
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
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const animation = {
    duration: () => animation,
    springify: () => animation,
    damping: () => animation,
    stiffness: () => animation,
  };
  return {
    __esModule: true,
    default: { View },
    FadeIn: animation,
    FadeInDown: animation,
    FadeInUp: animation,
    useReducedMotion: () => true,
  };
});

const localized = (value: string) => ({
  ru: value,
  uk: value,
  es: value,
  en: value,
  "pt-BR": value,
  vi: value,
  id: value,
  tr: value,
  pl: value,
});

const encounter = {
  lexicalItemId: "e01-s01-word-ready",
  transcription: "/ˈredi/",
  playfulMeaningByLocale: localized(
    "Стартовая кнопка уже нервничает: человек подготовился и ждёт сигнала.",
  ),
  motionVariant: "premium_a" as const,
  presentation: "blocking_task_overlay" as const,
  dismissal: "continue_only" as const,
  saveControl: "bookmark_icon" as const,
  orderWithinSession: 4,
  save: {
    available: true as const,
    savablePhraseRef: "save-ready",
    targetLanguage: "en",
    targetText: "ready",
    meaningByLocale: localized("готовый, подготовленный"),
    sourceTextFingerprint: "a".repeat(64),
    contentOrigin: "learner_safe_release_projection" as const,
  },
};

describe("Learning V2 premium new-word overlay", () => {
  test("renders a readable blocking card without image or reward language", () => {
    const view = render(
      <LearningV2NewWordEncounterOverlay
        encounter={encounter}
        locale="ru"
        position={4}
        total={4}
        saveState="not_saved"
        audioState="idle"
        onContinue={jest.fn()}
        onToggleSave={jest.fn()}
        onPlayAudio={jest.fn()}
      />,
    );

    expect(view.getByText("ready")).toBeTruthy();
    expect(view.getByText("/ˈredi/")).toBeTruthy();
    expect(view.getByText("готовый, подготовленный")).toBeTruthy();
    expect(
      view.getByText(
        "Стартовая кнопка уже нервничает: человек подготовился и ждёт сигнала.",
      ),
    ).toBeTruthy();
    expect(view.getByText("4 из 4")).toBeTruthy();
    expect(view.UNSAFE_queryAllByType(Image)).toHaveLength(0);
    expect(JSON.stringify(view.toJSON())).not.toMatch(
      /награда|редкость|сундук|mastery/iu,
    );
    expect(view.queryByTestId("learning-v2-new-word-holo-sweep")).toBeNull();

    const target = view.getByTestId("learning-v2-new-word-target");
    expect(target.props.accessibilityLanguage).toBe("en");
    expect(StyleSheet.flatten(target.props.style)).toMatchObject({
      color: INDIGO.accent,
      fontWeight: "900",
    });
  });

  test("uses icon-only save/audio controls with accessible 48px targets", () => {
    const onContinue = jest.fn();
    const onToggleSave = jest.fn();
    const onPlayAudio = jest.fn();
    const view = render(
      <LearningV2NewWordEncounterOverlay
        encounter={encounter}
        locale="ru"
        position={1}
        total={4}
        saveState="not_saved"
        audioState="idle"
        onContinue={onContinue}
        onToggleSave={onToggleSave}
        onPlayAudio={onPlayAudio}
      />,
    );

    const save = view.getByLabelText("Сохранить ready в карточки");
    const audio = view.getByLabelText("Повторить слово ready");
    for (const control of [save, audio]) {
      expect(
        StyleSheet.flatten(control.props.style).minWidth,
      ).toBeGreaterThanOrEqual(48);
      expect(
        StyleSheet.flatten(control.props.style).minHeight,
      ).toBeGreaterThanOrEqual(48);
    }
    fireEvent.press(save);
    fireEvent.press(audio);
    fireEvent.press(view.getByText("Продолжить"));
    expect(onToggleSave).toHaveBeenCalledTimes(1);
    expect(onPlayAudio).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
