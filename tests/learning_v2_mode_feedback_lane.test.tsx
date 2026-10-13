import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react-native";

import {
  LearningV2ModeFeedbackLaneV1,
  resolveLearningV2ModeFeedbackV1,
} from "../modules/learning-v2/modes/mode_feedback_v1";
import ScriptedRepeatCompareModeV1 from "../modules/learning-v2/modes/scripted_repeat_compare_mode_v1";

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
  withRepeat: (value: unknown) => value,
  withSequence: (...values: unknown[]) => values.at(-1),
  withTiming: (value: unknown) => value,
}));
jest.mock("../components/learning-v2/LearningV2PracticeViewport", () => ({
  useLearningV2CompactPractice: () => false,
}));
jest.mock("../components/learning-v2/LearningV2Glass", () => ({
  Lv2Explain: "Lv2Explain",
  useLv2Glass: () => ({ secondary: "#555", text: "#111", opaqueControl: "#ddd", opaqueCard: "#fff", good: "#080" }),
}));
jest.mock("../hooks/use-haptics", () => ({ hapticError: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock("../hooks/useLineScale", () => ({ useScaledTextStyles: (styles: unknown) => styles }));
jest.mock("../hooks/use_runtime_active", () => ({ useRuntimeActive: () => true }));

test.each([
  ["correct", "Верно: here означает «здесь»."],
  ["wrong", "Ready означает «готов», а здесь нужно here."],
] as const)("renders submitted %s feedback in a polite live lane", async (tone, text) => {
  const screen = await render(<LearningV2ModeFeedbackLaneV1 interfaceLocale="ru" feedback={{ tone, text, authored: true, responseId: "r1", analysis: null, diagnostics: null }} />);
  const lane = screen.getByTestId("learning-v2-mode-feedback-lane");
  expect(screen.getByText(text)).toBeTruthy();
  expect(lane.props.accessibilityLiveRegion).toBe("polite");
  expect(lane.props.accessibilityLabel).toBe(text);
});

test("renders the selected phrase and every word explanation instead of hiding authored analysis", async () => {
  const analysis = {
    text: "I am here.",
    meaningByLocale: { ru: "Я здесь.", uk: "Я тут." },
    explanationByLocale: { ru: "Полная фраза о местоположении.", uk: "Повна фраза про місце." },
    units: [
      { text: "I", start: 0, end: 1, lemma: "I", partOfSpeech: "personal_pronoun", partOfSpeechLabelByLocale: { ru: "местоимение", uk: "займенник" }, meaningByLocale: { ru: "я", uk: "я" }, functionByLocale: { ru: "Называет говорящего.", uk: "Називає мовця." }, sourceRefs: ["source#I"] },
      { text: "am", start: 2, end: 4, lemma: "be", partOfSpeech: "linking_verb", partOfSpeechLabelByLocale: { ru: "глагол-связка", uk: "дієслово-зв'язка" }, meaningByLocale: { ru: "форма be", uk: "форма be" }, functionByLocale: { ru: "Связывает части фразы.", uk: "Пов'язує частини фрази." }, sourceRefs: ["source#am"] },
      { text: "here", start: 5, end: 9, lemma: "here", partOfSpeech: "adverb", partOfSpeechLabelByLocale: { ru: "наречие", uk: "прислівник" }, meaningByLocale: { ru: "здесь", uk: "тут" }, functionByLocale: { ru: "Сообщает место.", uk: "Повідомляє місце." }, sourceRefs: ["source#here"] },
      { text: ".", start: 9, end: 10, lemma: ".", partOfSpeech: "punctuation", partOfSpeechLabelByLocale: { ru: "знак", uk: "знак" }, meaningByLocale: { ru: "конец", uk: "кінець" }, functionByLocale: { ru: "Завершает фразу.", uk: "Завершує фразу." }, sourceRefs: ["source#period"] },
    ],
  } as const;
  const screen = await render(<LearningV2ModeFeedbackLaneV1 interfaceLocale="ru" feedback={{ tone: "correct", text: "Верно.", authored: true, responseId: "r1", analysis, diagnostics: null }} />);
  expect(screen.getByText("I am here.")).toBeTruthy();
  expect(screen.getByText("Я здесь.")).toBeTruthy();
  expect(screen.getByText("here · наречие · здесь")).toBeTruthy();
  expect(screen.getByText("Сообщает место.")).toBeTruthy();
});

const candidateRoot = path.join(
  __dirname,
  "../content/learning-v2-course/outputs/s01-token-analysis-evidence-fixed-20261013/en/l01/s01",
);

function realRepeatPayload(interfaceLocale: "ru" | "uk", suffix: "i14" | "i17:s02") {
  const learner = JSON.parse(fs.readFileSync(
    path.join(candidateRoot, interfaceLocale === "uk" ? "learner.uk.json" : "learner.json"),
    "utf8",
  ));
  const interaction = learner.interactions.find((entry: { interactionId?: string }) =>
    entry.interactionId === `en:lesson-01:session-01:${suffix}`);
  if (!interaction) throw new Error(`missing_real_s01_interaction:${interfaceLocale}:${suffix}`);
  return interaction.modePayload;
}

test.each([
  ["i14", "ru"],
  ["i17:s02", "uk"],
] as const)("scripted repeat %s renders the shared authored feedback lane", async (suffix, interfaceLocale) => {
  const modePayload = realRepeatPayload(interfaceLocale, suffix);
  const phrase = modePayload.explanationV1.phrase;
  const feedback = resolveLearningV2ModeFeedbackV1({
    interfaceLocale,
    modePayload,
    outcome: "correct",
    selectedResponseId: null,
    orderedResponseIds: [],
  });
  const screen = await render(<ScriptedRepeatCompareModeV1
    family="scripted_repeat_compare"
    interfaceLocale={interfaceLocale}
    modePayload={modePayload}
    phase="success"
    prompt={`Задание ${suffix}`}
    options={[]}
    selectedChoiceId={null}
    orderedResponseIds={[]}
    wrongNudge={{ responseId: null, token: 0 }}
    reducedMotion
    resolved
    explanation={null}
    learnerFeedback={feedback}
    referenceAudioState="unavailable"
    voiceStatus="idle"
    transcript={phrase.text}
    instruction={null}
    onPick={() => {}}
    onAppendToken={() => {}}
    onUndoToken={() => {}}
    onRemoveTokenAt={() => {}}
    onPlaySelectableAudio={() => {}}
    onPlayFullPhraseAudio={null}
    onPlaySlowPhraseAudio={null}
    onModeNativeComplete={() => {}}
    onToggleRecording={() => {}}
    onSubmit={() => {}}
    canSubmit
  />);
  expect(screen.getByTestId("learning-v2-mode-feedback-lane")).toBeTruthy();
  expect(screen.getAllByText(phrase.text)).toHaveLength(2);
  expect(screen.getByText(phrase.meaningByLocale[interfaceLocale])).toBeTruthy();
  const lexicalUnit = phrase.units.find((unit: { partOfSpeech: string }) => unit.partOfSpeech !== "personal_pronoun" && unit.partOfSpeech !== "linking_verb" && unit.partOfSpeech !== "punctuation");
  expect(lexicalUnit).toBeTruthy();
  expect(screen.getByText(`${lexicalUnit.text} · ${lexicalUnit.partOfSpeechLabelByLocale[interfaceLocale]} · ${lexicalUnit.meaningByLocale[interfaceLocale]}`)).toBeTruthy();
  expect(screen.getByText(lexicalUnit.functionByLocale[interfaceLocale])).toBeTruthy();
});
