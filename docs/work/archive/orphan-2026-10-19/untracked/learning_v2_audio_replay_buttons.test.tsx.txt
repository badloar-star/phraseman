import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ContextGapGrammarModeV1 } from "../modules/learning-v2/modes/context_gap_grammar_mode_v1";
import { ListenBuildDictationModeV1 } from "../modules/learning-v2/modes/listen_build_dictation_mode_v1";
import { ListenChooseModeV1 } from "../modules/learning-v2/modes/listen_choose_mode_v1";
import { PhraseBuilderModeV1 } from "../modules/learning-v2/modes/phrase_builder_mode_v1";
import { ScriptedRepeatCompareModeV1 } from "../modules/learning-v2/modes/scripted_repeat_compare_mode_v1";
import { SoundContrastModeV1 } from "../modules/learning-v2/modes/sound_contrast_mode_v1";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {} },
}));
jest.mock("@expo/vector-icons/Ionicons", () => "Ionicons");
jest.mock("react-native-svg", () => ({ __esModule: true, default: "Svg", Circle: "Circle" }));
jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: { createAnimatedComponent: (component: unknown) => component, View: "AnimatedView" },
  cancelAnimation: jest.fn(),
  Easing: { bezier: () => "ease", linear: "linear" },
  useAnimatedProps: (factory: () => unknown) => factory(),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  useSharedValue: (value: unknown) => ({ value }),
  withDelay: (_delay: number, value: unknown) => value,
  withRepeat: (value: unknown) => value,
  withSequence: (...values: unknown[]) => values.at(-1),
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
}));
jest.mock("../components/learning-v2/LearningV2PracticeViewport", () => ({
  useLearningV2CompactPractice: () => false,
}));
jest.mock("../components/learning-v2/LearningV2Glass", () => ({
  Lv2Chip: "Text",
  Lv2Cta: "Text",
  Lv2Explain: "Text",
  Lv2Option: "Text",
  useLv2Glass: () => ({
    secondary: "#555",
    text: "#111",
    mutedText: "#777",
    glassEdge: "#ccc",
    opaqueControl: "#ddd",
    opaqueCard: "#fff",
    selected: "#eef",
    good: "#080",
  }),
}));
jest.mock("../components/ThemeContext", () => ({
  useTheme: () => ({
    theme: {
      bgCard: "#fff",
      accentBg: "#eef",
      accent: "#44f",
      textPrimary: "#111",
      textMuted: "#777",
      correctText: "#080",
      wrong: "#800",
      bgSurface2: "#eee",
    },
  }),
}));
jest.mock("../components/ui/v2_theme", () => ({ useTournamentPalette: () => ({}) }));
jest.mock("../components/ui/v2_ui", () => {
  const ReactInMock = jest.requireActual<typeof React>("react");
  return {
    V2Chip: ({ children, right, ...props }: { children?: React.ReactNode; right?: React.ReactNode }) =>
      ReactInMock.createElement(
        "View",
        null,
        ReactInMock.createElement("Text", props, children),
        right,
      ),
  };
});
jest.mock("../hooks/use-haptics", () => ({
  hapticError: jest.fn(),
  hapticLightImpact: jest.fn(),
  hapticSuccess: jest.fn(),
}));
jest.mock("../hooks/useLineScale", () => ({ useScaledTextStyles: (styles: unknown) => styles }));
jest.mock("../hooks/use_runtime_active", () => ({ useRuntimeActive: () => true }));

const commonProps = {
  interfaceLocale: "ru",
  phase: "success",
  prompt: "Задание",
  options: [
    { responseId: "r1", text: "sad" },
    { responseId: "r2", text: "happy" },
  ],
  selectedChoiceId: "r1",
  orderedResponseIds: [],
  wrongNudge: { responseId: null, token: 0 },
  reducedMotion: true,
  resolved: true,
  explanation: null,
  learnerFeedback: null,
  onPick: jest.fn(),
  onAppendToken: jest.fn(),
  onUndoToken: jest.fn(),
  onRemoveTokenAt: jest.fn(),
  onPlaySelectableAudio: jest.fn(),
  onPlayFullPhraseAudio: jest.fn(),
  onPlaySlowPhraseAudio: null,
  referenceAudioState: "idle",
  onModeNativeComplete: jest.fn(),
  onToggleRecording: jest.fn(),
  onSubmit: jest.fn(),
  canSubmit: true,
} as const;

async function expectAnimatedReplayPress(
  screen: Awaited<ReturnType<typeof render>>,
  expectedCalls: number,
  callback: jest.Mock,
  testID = "learning-v2-audio-replay-button",
) {
  const button = screen.getByTestId(testID);
  expect(button.props.onPressIn).toEqual(expect.any(Function));
  expect(button.props.onPressOut).toEqual(expect.any(Function));
  expect(button.props.hitSlop).toEqual(expect.objectContaining({ top: expect.any(Number) }));
  await fireEvent(button, "pressIn");
  await fireEvent.press(button);
  await fireEvent(button, "pressOut");
  expect(callback).toHaveBeenCalledTimes(expectedCalls);
}

test("listen modes allow loading-state replacement and repeated replay after the answer", async () => {
  const chooseReplay = jest.fn();
  const choose = await render(
    <ListenChooseModeV1
      {...commonProps}
      family="listen_choose"
      referenceAudioState="loading"
      onPlayFullPhraseAudio={chooseReplay}
      modePayload={{
        family: "listen_choose",
        referenceAudio: { audioTargetId: "phrase", transcript: "I am sad" },
        localizedMeaningChoices: [
          { responseId: "r1", meaningByLocale: { ru: "Мне грустно", uk: "Мені сумно" } },
          { responseId: "r2", meaningByLocale: { ru: "Я счастлив", uk: "Я щасливий" } },
        ],
      } as never}
    />,
  );
  expect(choose.getByText("I am sad")).toBeTruthy();
  await expectAnimatedReplayPress(choose, 1, chooseReplay);
  await fireEvent.press(choose.getByTestId("learning-v2-audio-replay-button"));
  expect(chooseReplay).toHaveBeenCalledTimes(2);
  await choose.unmount();

  const dictationReplay = jest.fn();
  const dictation = await render(
    <ListenBuildDictationModeV1
      {...commonProps}
      family="listen_build_dictation"
      referenceAudioState="loading"
      onPlayFullPhraseAudio={dictationReplay}
      modePayload={{
        family: "listen_build_dictation",
        hiddenTargetPhrase: "I am sad",
        orderedTokens: ["I", "am", "sad"],
        authoredDistractorTokens: [],
        slotFeedback: [],
      } as never}
    />,
  );
  await expectAnimatedReplayPress(dictation, 1, dictationReplay);
  await dictation.unmount();
});

test("every full-phrase audio surface stays replayable after answer feedback", async () => {
  const phraseReplay = jest.fn();
  const phrase = await render(
    <PhraseBuilderModeV1
      {...commonProps}
      family="phrase_builder"
      onPlayFullPhraseAudio={phraseReplay}
      modePayload={{
        family: "phrase_builder",
        localizedMeaning: { ru: "Мне грустно", uk: "Мені сумно" },
        orderedTokens: ["I", "am", "sad"],
        authoredDistractorTokens: [],
        slotFeedback: [],
      } as never}
    />,
  );
  await expectAnimatedReplayPress(phrase, 1, phraseReplay);
  await phrase.unmount();

  const contextReplay = jest.fn();
  const context = await render(
    <ContextGapGrammarModeV1
      {...commonProps}
      family="context_gap_grammar"
      onPlayFullPhraseAudio={contextReplay}
      modePayload={{
        family: "context_gap_grammar",
        gappedTargetPhrase: "I am ___",
        localizedScene: { ru: "Опишите чувство", uk: "Опишіть почуття" },
      } as never}
    />,
  );
  await expectAnimatedReplayPress(context, 1, contextReplay);
  await context.unmount();

  const repeatReplay = jest.fn();
  const repeat = await render(
    <ScriptedRepeatCompareModeV1
      {...commonProps}
      family="scripted_repeat_compare"
      referenceAudioState="loading"
      onPlayFullPhraseAudio={repeatReplay}
      modePayload={{ family: "scripted_repeat_compare", targetPhrase: "I am sad" } as never}
      voiceStatus="idle"
      transcript=""
      instruction={null}
      attemptSubmitted
    />,
  );
  await expectAnimatedReplayPress(repeat, 1, repeatReplay, "learning-v2-repeat-reference-play");
  await repeat.unmount();
});

test("sound contrast option audio remains independent from the resolved answer card", async () => {
  const optionReplay = jest.fn();
  const screen = await render(
    <SoundContrastModeV1
      {...commonProps}
      family="sound_contrast"
      onPlaySelectableAudio={optionReplay}
      modePayload={{ family: "sound_contrast", ipaA: "/sɪd/", ipaB: "/siːd/" } as never}
    />,
  );
  const buttons = screen.getAllByTestId("learning-v2-audio-replay-button");
  expect(buttons).toHaveLength(2);
  await fireEvent(buttons[0], "pressIn");
  await fireEvent.press(buttons[0]);
  await fireEvent(buttons[0], "pressOut");
  await fireEvent.press(buttons[0]);
  expect(optionReplay).toHaveBeenNthCalledWith(1, "r1");
  expect(optionReplay).toHaveBeenNthCalledWith(2, "r1");
  await screen.unmount();
});
