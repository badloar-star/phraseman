import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react-native";

import {
  LearningV2ModeFeedbackLaneV1,
  resolveLearningV2ModeFeedbackV1,
} from "../modules/learning-v2/modes/mode_feedback_v1";
import PhraseBuilderModeV1 from "../modules/learning-v2/modes/phrase_builder_mode_v1";
import ListenBuildDictationModeV1 from "../modules/learning-v2/modes/listen_build_dictation_mode_v1";
import ScriptedRepeatCompareModeV1 from "../modules/learning-v2/modes/scripted_repeat_compare_mode_v1";
import { LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1 } from "../modules/learning-v2/contracts/mode_native_payload_v1";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  Pressable: "Pressable",
  AccessibilityInfo: { announceForAccessibility: jest.fn() },
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {} },
  Platform: { OS: "android", select: (o: Record<string, unknown>) => o.android ?? o.default }, // зачем (чистка красных 05.11): constants/theme.ts читает Platform.OS при импорте
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
  Lv2Explain: "Lv2Explain",
  useLv2Glass: () => ({ secondary: "#555", text: "#111", mutedText: "#777", glassEdge: "#ccc", opaqueControl: "#ddd", opaqueCard: "#fff", opaqueSheet: "#fafafa", good: "#080", accent: "#08a", plateFillFrom: "#eeeeee", plateFillTo: "#dddddd" }),
}));
jest.mock("../hooks/use-haptics", () => ({ hapticError: jest.fn(), hapticLightImpact: jest.fn(), hapticSuccess: jest.fn() }));
jest.mock("../hooks/useLineScale", () => ({ useScaledTextStyles: (styles: unknown) => styles }));
// зачем (задания №23, 22.10): общее тело заданий тянет шапку заданий и переводы — их тема/Platform в этом тесте не нужны, подменяем лёгкими заглушками
jest.mock("../constants/i18n", () => ({ triLang: (lang: string, txt: Record<string, unknown>) => txt[lang] ?? txt.ru }));
jest.mock("../components/learning-v2/LearningV2TaskChrome", () => {
  const ReactInMock = jest.requireActual<typeof React>("react");
  return {
    LearningV2TaskTitle: ({ title, trailing, testID }: { title: string; trailing?: React.ReactNode; testID?: string }) =>
      ReactInMock.createElement("View", { testID }, ReactInMock.createElement("Text", null, title), trailing),
  };
});
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

test("renders authored analysis only for a wrong response", async () => {
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
  const screen = await render(<LearningV2ModeFeedbackLaneV1 interfaceLocale="ru" feedback={{ tone: "wrong", text: "Попробуйте ещё раз.", authored: true, responseId: "r1", analysis, diagnostics: null }} />);
  expect(screen.getByText("I am here.")).toBeTruthy();
  expect(screen.getByText("Я здесь.")).toBeTruthy();
  expect(screen.getByText("here · наречие · здесь")).toBeTruthy();
  expect(screen.getByText("Сообщает место.")).toBeTruthy();
});

const visibilityModeProps = {
  family: "phrase_builder",
  interfaceLocale: "ru",
  phase: "idle",
  prompt: "Соберите фразу",
  options: [
    { responseId: "r1", text: "I" },
    { responseId: "r2", text: "am" },
    { responseId: "r3", text: "ready" },
  ],
  selectedChoiceId: null,
  orderedResponseIds: [],
  wrongNudge: { responseId: null, token: 0 },
  reducedMotion: true,
  resolved: false,
  explanation: null,
  learnerFeedback: null,
  onPick: () => {},
  onAppendToken: () => {},
  onUndoToken: () => {},
  onRemoveTokenAt: () => {},
  onPlaySelectableAudio: () => {},
  onPlayFullPhraseAudio: null,
  onPlaySlowPhraseAudio: null,
  referenceAudioState: "unavailable",
  onModeNativeComplete: () => {},
  onToggleRecording: () => {},
  onSubmit: () => {},
  canSubmit: false,
} as const;

test("phrase builder does not render its target phrase before submission", async () => {
  const screen = await render(<PhraseBuilderModeV1
    {...visibilityModeProps}
    // зачем (22.10, правило Learning V2): смысл фразы стоит в кавычках текста задания (так в выпуске), а не в localizedMeaning
    prompt="Соберите фразу: «Смысл без готового ответа»"
    modePayload={{
      family: "phrase_builder",
      targetPhrase: "SECRET PHRASE TARGET",
      localizedMeaning: { ru: "Смысл без готового ответа", uk: "Зміст без готової відповіді" },
      orderedTokens: ["I", "am", "ready"],
      authoredDistractorTokens: [],
      slotFeedback: [],
    } as never}
  />);
  expect(screen.getByText("Смысл без готового ответа")).toBeTruthy();
  expect(screen.queryByText("SECRET PHRASE TARGET")).toBeNull();
});

test("dictation hides its target through needs-work and reveals it only after success", async () => {
  const modePayload = {
    family: "listen_build_dictation",
    referenceAudio: null,
    slowReferenceAudio: null,
    hiddenTargetPhrase: "HIDDEN DICTATION TARGET",
    orderedTokens: ["HIDDEN", "DICTATION", "TARGET"],
    authoredDistractorTokens: [],
    slotFeedback: [],
  } as never;
  const { queryByText, rerender } = await render(<ListenBuildDictationModeV1
    {...visibilityModeProps}
    family="listen_build_dictation"
    modePayload={modePayload}
  />);
  expect(queryByText("HIDDEN DICTATION TARGET")).toBeNull();

  await rerender(<ListenBuildDictationModeV1
    {...visibilityModeProps}
    family="listen_build_dictation"
    phase="needs_work"
    modePayload={modePayload}
  />);
  expect(queryByText("HIDDEN DICTATION TARGET")).toBeNull();

  await rerender(<ListenBuildDictationModeV1
    {...visibilityModeProps}
    family="listen_build_dictation"
    phase="success"
    resolved
    modePayload={modePayload}
  />);
  expect(queryByText("HIDDEN DICTATION TARGET")).toBeTruthy();
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

test("scripted repeat keeps its target phrase visible before recording by design", async () => {
  const modePayload = realRepeatPayload("ru", "i14");
  const screen = await render(<ScriptedRepeatCompareModeV1
    family="scripted_repeat_compare"
    interfaceLocale="ru"
    modePayload={modePayload}
    phase="idle"
    prompt="Повторите фразу"
    options={[]}
    selectedChoiceId={null}
    orderedResponseIds={[]}
    wrongNudge={{ responseId: null, token: 0 }}
    reducedMotion
    resolved={false}
    explanation={null}
    learnerFeedback={null}
    referenceAudioState="unavailable"
    voiceStatus="idle"
    transcript={modePayload.targetPhrase}
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
    canSubmit={false}
  />);
  expect(screen.getByText(modePayload.targetPhrase)).toBeTruthy();
});

test("independent scripted repeat hides answer-bearing UI until the first scored attempt", async () => {
  const targetPhrase = "SECRET INDEPENDENT TARGET";
  const modePayload = {
    ...realRepeatPayload("ru", "i14"),
    targetPhrase,
    referenceAudio: {
      audioTargetId: "independent-reference-audio",
      transcript: targetPhrase,
    },
    scriptedRepeatRevealPolicy:
      LEARNING_V2_SCRIPTED_REPEAT_AFTER_FIRST_ATTEMPT_REVEAL_POLICY_V1,
  } as never;
  const onPlayFullPhraseAudio = jest.fn();
  const commonProps = {
    family: "scripted_repeat_compare" as const,
    interfaceLocale: "ru" as const,
    modePayload,
    phase: "idle" as const,
    prompt: `Скажите ${targetPhrase} самостоятельно`,
    options: [],
    selectedChoiceId: null,
    orderedResponseIds: [],
    wrongNudge: { responseId: null, token: 0 },
    reducedMotion: true,
    resolved: false,
    explanation: null,
    learnerFeedback: null,
    referenceAudioState: "idle" as const,
    voiceStatus: "idle" as const,
    transcript: "",
    instruction: `Подсказка: ${targetPhrase}`,
    onPick: () => {},
    onAppendToken: () => {},
    onUndoToken: () => {},
    onRemoveTokenAt: () => {},
    onPlaySelectableAudio: () => {},
    onPlayFullPhraseAudio,
    onPlaySlowPhraseAudio: jest.fn(),
    onModeNativeComplete: () => {},
    onToggleRecording: () => {},
    onSubmit: () => {},
    canSubmit: false,
  };
  const screen = await render(
    <ScriptedRepeatCompareModeV1 {...commonProps} attemptSubmitted={false} />,
  );

  expect(screen.queryByText(targetPhrase)).toBeNull();
  expect(screen.queryByTestId("learning-v2-repeat-reference-play")).toBeNull();
  expect(JSON.stringify(screen.toJSON())).not.toContain(targetPhrase);

  await screen.rerender(
    <ScriptedRepeatCompareModeV1
      {...commonProps}
      attemptSubmitted
      phase="needs_work"
    />,
  );

  expect(screen.getByText(targetPhrase)).toBeTruthy();
  expect(screen.getByTestId("learning-v2-repeat-reference-play")).toBeTruthy();
});

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
  expect(feedback).toMatchObject({
    tone: "correct",
    // перепривязка 05.11: вердикт «верно» в RU/UK — с «!» (modules/learning-v2/modes/mode_feedback_v1.tsx CORRECT_VERDICT_BY_LOCALE)
    text: interfaceLocale === "ru" ? "Верно!" : "Правильно!",
    analysis: null,
    diagnostics: null,
  });
  expect(screen.getAllByText(phrase.text)).toHaveLength(1);
  // зачем (владелец 22.10, «Предлагаем», `.say .ru`): под английской фразой после открытия — её перевод, один раз; прежнее «перевода нет» отменено
  expect(screen.getAllByText(phrase.meaningByLocale[interfaceLocale])).toHaveLength(1);
  const lexicalUnit = phrase.units.find((unit: { partOfSpeech: string }) => unit.partOfSpeech !== "personal_pronoun" && unit.partOfSpeech !== "linking_verb" && unit.partOfSpeech !== "punctuation");
  expect(lexicalUnit).toBeTruthy();
  expect(screen.queryByText(`${lexicalUnit.text} · ${lexicalUnit.partOfSpeechLabelByLocale[interfaceLocale]} · ${lexicalUnit.meaningByLocale[interfaceLocale]}`)).toBeNull();
  expect(screen.queryByText(lexicalUnit.functionByLocale[interfaceLocale])).toBeNull();
});
