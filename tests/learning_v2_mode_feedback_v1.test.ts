import fs from "node:fs";
import path from "node:path";

// зачем (18.10): mode_feedback_v1.tsx тянет экранный LearningV2Glass (@expo/vector-icons, StyleSheet react-native),
// который основной jest-конфиг (node, без react-native) не исполняет — набор падал до первого теста. Тест проверяет
// только чистые функции разбора обратной связи; экранный модуль подменяем пустышкой.
jest.mock("../components/learning-v2/LearningV2Glass", () => new Proxy({}, { get: () => () => null }));

import { resolveLearningV2ModeFeedbackV1 } from "../modules/learning-v2/modes/mode_feedback_v1";
import { resolveLearningV2SpeedMatchMismatchExplanationV1 } from "../modules/learning-v2/modes/speed_match_runtime_v1";
import {
  factoryNativeChoiceFeedbackV1,
  factoryNativeOrderedTokenSlotFeedbackV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import { projectLearningV2ModeNativePayloadForLearnerV1 } from "../modules/learning-v2/contracts/mode_native_payload_v1";

const SESSION_ID = "lesson-01:session:01";
const SOURCE_SESSION_ID = "en:lesson-01:session-01";

function s01Source() {
  return JSON.parse(fs.readFileSync(path.resolve(
    __dirname,
    "../content/learning-v2-course/sessions/en/l01/s01/practice.atomic.json",
  ), "utf8"));
}

function s01Explanations() {
  return JSON.parse(fs.readFileSync(path.resolve(
    __dirname,
    "../content/learning-v2-course/sessions/en/l01/s01/practice.explanations.v1.json",
  ), "utf8"));
}

test("S01 choice feedback keeps correct confirmation brief and resolves exact authored wrong copy", () => {
  const interaction = s01Source().interactionsByLocale.ru.find((entry: any) =>
    entry.interactionId === `${SOURCE_SESSION_ID}:i02`);
  expect(interaction?.modePayload?.family).toBe("context_gap_grammar");
  if (interaction?.modePayload?.family !== "context_gap_grammar") throw new Error("fixture_missing");

  // зачем (координатор 18.10): с 597e2a933 choiceFeedback хранит только неверные варианты, а правильный ответ —
  // в answers[].correctResponseId. Берём его оттуда; если у задания с выбором его нет — тест обязан краснеть.
  const answer = s01Source().answers.find((entry: any) => entry.interactionId === interaction.interactionId);
  expect(answer?.correctResponseId).toEqual(expect.any(String));
  const correctId = String(answer.correctResponseId).replace(SOURCE_SESSION_ID, SESSION_ID);
  const authoredById = new Map(s01Explanations().interactions[interaction.interactionId].responses
    .map((entry: any) => [entry.responseId, entry]));
  const projectedChoiceFeedback = interaction.modePayload.choiceFeedback.map((entry: any) => {
    const authored: any = authoredById.get(entry.responseId);
    return {
      ...entry,
      analysisV1: authored.analysisByLocale.ru,
      ...(authored.correct ? {} : {
        errorType: authored.errorType,
        whyTemptingByLocale: authored.whyTemptingByLocale,
        whyWrongHereByLocale: authored.whyWrongHereByLocale,
        minimalContrastByLocale: authored.minimalContrastByLocale,
        acceptabilityBoundaryByLocale: authored.acceptabilityBoundaryByLocale,
      }),
    };
  });
  const feedback = factoryNativeChoiceFeedbackV1(
    { ...interaction.modePayload, choiceFeedback: projectedChoiceFeedback },
    interaction.responseOptions,
    correctId,
    SOURCE_SESSION_ID,
    SESSION_ID,
  );
  // зачем (18.10): с 597e2a933 в choiceFeedback нет записи правильного варианта — на верный ответ показывается
  // краткое общее «Верно.», а правильный id берётся из answers (выше). Неверные варианты по-прежнему со своим текстом.
  const wrong = feedback.find((entry) => !entry.correct);
  expect(wrong).toBeDefined();
  expect(interaction.responseOptions.some((option: any) =>
    String(option.responseId).replace(SOURCE_SESSION_ID, SESSION_ID) === correctId)).toBe(true);

  const resolvedCorrect = resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload: { ...interaction.modePayload, choiceFeedback: feedback },
    outcome: "correct",
    selectedResponseId: correctId,
    orderedResponseIds: [],
  });
  expect(resolvedCorrect).toEqual({
    tone: "correct",
    text: "Верно.",
    authored: false,
    responseId: null,
    analysis: null,
    diagnostics: null,
  });
  const resolvedWrong = resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "uk",
    modePayload: { ...interaction.modePayload, choiceFeedback: feedback },
    outcome: "wrong",
    selectedResponseId: wrong!.responseId,
    orderedResponseIds: [],
  });
  expect(resolvedWrong).toMatchObject({ tone: "wrong", text: wrong!.feedbackByLocale.uk, authored: true, responseId: wrong!.responseId });
  expect(resolvedWrong.analysis?.text).toBe(wrong!.analysisV1?.text);
  expect(resolvedWrong.diagnostics?.whyWrongHereByLocale.uk).toBe(wrong!.whyWrongHereByLocale?.uk);
});

test("learner-wire feedback still resolves by response id after correctness markers are removed", () => {
  const modePayload = projectLearningV2ModeNativePayloadForLearnerV1({
    family: "context_gap_grammar",
    localizedScene: { ru: "Я готов.", uk: "Я готовий." },
    gappedTargetPhrase: "I ___ ready.",
    gapOptions: [
      { responseId: "am", text: "am" },
      { responseId: "is", text: "is" },
    ],
    testedDimension: "present_be_first_person",
    choiceFeedback: [
      {
        responseId: "am",
        correct: true,
        feedbackByLocale: { ru: "Верно.", uk: "Правильно." },
      },
      {
        responseId: "is",
        correct: false,
        feedbackByLocale: {
          ru: "С I нужна форма am.",
          uk: "З I потрібна форма am.",
        },
      },
    ],
  });

  expect(JSON.stringify(modePayload)).not.toContain('"correct"');
  expect(resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload,
    outcome: "wrong",
    selectedResponseId: "is",
    orderedResponseIds: [],
  })).toMatchObject({
    tone: "wrong",
    text: "С I нужна форма am.",
    authored: true,
    responseId: "is",
  });
});

test.each([
  ["phrase_builder", "targetPhrase"],
  ["listen_build_dictation", "hiddenTargetPhrase"],
] as const)("%s chooses error-specific ordered-token feedback only for one unambiguous wrong tile", (family, phraseField) => {
  const base = {
    family,
    [phraseField]: "I am ready.",
    ...(family === "phrase_builder"
      ? { localizedMeaning: { ru: "Я готов.", uk: "Я готовий." } }
      : {
          referenceAudio: null,
          slowReferenceAudio: null,
        }),
    orderedTokens: ["I", "am", "ready"],
    authoredDistractorTokens: ["is", "late"],
    slotFeedback: [
      {
        responseId: "tile-I",
        correct: true,
        feedbackByLocale: { ru: "Длинное объяснение правильной плитки.", uk: "Довге пояснення правильної плитки." },
      },
      {
        responseId: "tile-is",
        correct: false,
        feedbackByLocale: { ru: "После I нужна форма am, не is.", uk: "Після I потрібна форма am, не is." },
      },
      {
        responseId: "tile-late",
        correct: false,
        feedbackByLocale: { ru: "Здесь нужна готовность, не опоздание.", uk: "Тут потрібна готовність, не запізнення." },
      },
    ],
  };
  const modePayload = projectLearningV2ModeNativePayloadForLearnerV1(base);

  expect(resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload,
    outcome: "wrong",
    selectedResponseId: null,
    orderedResponseIds: ["tile-I", "tile-is"],
  })).toMatchObject({
    tone: "wrong",
    text: "После I нужна форма am, не is.",
    authored: true,
    responseId: "tile-is",
  });

  expect(resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload,
    outcome: "wrong",
    selectedResponseId: null,
    orderedResponseIds: ["tile-is", "tile-late"],
  })).toEqual({
    tone: "wrong",
    text: "Попробуй ещё раз.",
    authored: false,
    responseId: null,
    analysis: null,
    diagnostics: null,
  });
});

test.each([
  ["phrase_builder", "targetPhrase"],
  ["listen_build_dictation", "hiddenTargetPhrase"],
] as const)("%s uses brief feedback after a correct ordered-token answer", (family, phraseField) => {
  const modePayload = projectLearningV2ModeNativePayloadForLearnerV1({
    family,
    [phraseField]: "I am ready.",
    ...(family === "phrase_builder"
      ? { localizedMeaning: { ru: "Я готов.", uk: "Я готовий." } }
      : {
          referenceAudio: null,
          slowReferenceAudio: null,
        }),
    orderedTokens: ["I", "am", "ready"],
    authoredDistractorTokens: ["is"],
    slotFeedback: [{
      responseId: "tile-is",
      correct: false,
      feedbackByLocale: { ru: "После I нужна am.", uk: "Після I потрібна am." },
    }],
    completionFeedbackByLocale: {
      ru: "Верно: длинное объяснение всей фразы.",
      uk: "Правильно: довге пояснення всієї фрази.",
    },
  });

  expect(resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload,
    outcome: "correct",
    selectedResponseId: null,
    orderedResponseIds: ["tile-I", "tile-am", "tile-ready"],
  })).toEqual({
    tone: "correct",
    text: "Верно.",
    authored: false,
    responseId: null,
    analysis: null,
    diagnostics: null,
  });
});

test("S01 builder and dictation bind :tile:dN feedback to generated runtime tile ids and never invent correct explanations", () => {
  const learner = s01Source().interactionsByLocale.ru;
  for (const interactionId of [`${SOURCE_SESSION_ID}:i12`, `${SOURCE_SESSION_ID}:i16`]) {
    const interaction = learner.find((entry: any) => entry.interactionId === interactionId);
    expect(interaction?.modePayload?.family).toBe("listen_build_dictation");
    if (interaction?.modePayload?.family !== "listen_build_dictation") throw new Error("fixture_missing");
    const runtimeOptions = [
      ...interaction.modePayload.orderedTokens,
      ...interaction.modePayload.authoredDistractorTokens,
    ].map((text: string, index: number) => ({ responseId: `${SESSION_ID}:${interaction.interactionId.split(":").at(-1)}:t${String(index + 1).padStart(2, "0")}`, text }));
    const slotFeedback = factoryNativeOrderedTokenSlotFeedbackV1(interaction.modePayload, runtimeOptions);
    const wrong = slotFeedback[0];
    expect(wrong?.responseId).toMatch(/:t\d{2}$/u);

    const wrongFeedback = resolveLearningV2ModeFeedbackV1({
      interfaceLocale: "ru",
      modePayload: { ...interaction.modePayload, slotFeedback },
      outcome: "wrong",
      selectedResponseId: null,
      orderedResponseIds: [wrong.responseId],
    });
    expect(wrongFeedback).toMatchObject({ tone: "wrong", text: wrong.feedbackByLocale.ru, authored: true, responseId: wrong.responseId });
    expect(wrongFeedback.analysis?.text).toBe(wrong.analysisV1?.text);

    const completionFeedbackByLocale = {
      ru: "Верно: I называет говорящего, am связывает I с сообщением о себе, а ready сообщает о готовности.",
      uk: "Правильно: I називає мовця, am пов’язує I з повідомленням про себе, а ready повідомляє про готовність.",
    };
    const correctFeedback = resolveLearningV2ModeFeedbackV1({
      interfaceLocale: "uk",
      modePayload: {
        ...interaction.modePayload,
        slotFeedback,
        explanationV1: {
          completionFeedbackByLocale,
          phrase: {
            text: interaction.modePayload.hiddenTargetPhrase,
            meaningByLocale: { ru: "Я готов / готова.", uk: "Я готовий / готова." },
            explanationByLocale: completionFeedbackByLocale,
            units: [],
          },
        },
      } as any,
      outcome: "correct",
      selectedResponseId: null,
      orderedResponseIds: runtimeOptions.slice(0, interaction.modePayload.orderedTokens.length).map((entry) => entry.responseId),
    });
    expect(correctFeedback).toEqual({
      tone: "correct",
      text: "Правильно.",
      authored: false,
      responseId: null,
      analysis: null,
      diagnostics: null,
    });
    expect(correctFeedback.text).not.toContain(wrong.feedbackByLocale.uk);
  }
});

test.each([
  ["i14", "ru", "I am here."],
  ["i17:s02", "uk", "I am ready."],
] as const)("S01 scripted repeat %s keeps correct confirmation brief", (suffix, interfaceLocale, targetPhrase) => {
  const interaction = s01Source().interactionsByLocale[interfaceLocale].find((entry: any) =>
    entry.interactionId === `${SOURCE_SESSION_ID}:${suffix}`);
  expect(interaction?.modePayload?.family).toBe("scripted_repeat_compare");
  if (interaction?.modePayload?.family !== "scripted_repeat_compare") throw new Error("fixture_missing");

  const resolved = resolveLearningV2ModeFeedbackV1({
    interfaceLocale,
    modePayload: interaction.modePayload,
    outcome: "correct",
    selectedResponseId: null,
    orderedResponseIds: [],
  });

  expect(resolved).toEqual({
    tone: "correct",
    text: interfaceLocale === "ru" ? "Верно." : "Правильно.",
    authored: false,
    responseId: null,
    analysis: null,
    diagnostics: null,
  });
  // зачем (18.10): в нынешнем исходнике у повтора вслух может не быть explanationV1.phrase — сравниваем, только если есть
  const authoredExplanation = interaction.modePayload.explanationV1?.phrase?.explanationByLocale?.[interfaceLocale];
  if (authoredExplanation) expect(resolved.text).not.toBe(authoredExplanation);
  expect(targetPhrase.length).toBeGreaterThan(0);
});

test("ambiguous duplicate feedback rows fail closed to generic wrong feedback", () => {
  const duplicate = {
    responseId: "wrong",
    feedbackByLocale: {
      ru: "Первое объяснение.", uk: "Перше пояснення.", en: "First.", es: "Primero.",
      "pt-BR": "Primeiro.", vi: "Đầu tiên.", id: "Pertama.", tr: "Birinci.", pl: "Pierwsze.",
    },
  };
  expect(resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload: {
      family: "context_gap_grammar",
      localizedScene: { ru: "Сцена.", uk: "Сцена.", en: "Scene.", es: "Escena.", "pt-BR": "Cena.", vi: "Cảnh.", id: "Adegan.", tr: "Sahne.", pl: "Scena." },
      gappedTargetPhrase: "I ___ ready.",
      gapOptions: [{ responseId: "wrong", text: "is" }],
      testedDimension: "present_be_first_person",
      choiceFeedback: [duplicate, { ...duplicate, feedbackByLocale: { ...duplicate.feedbackByLocale, ru: "Второе объяснение." } }],
    } as any,
    outcome: "wrong",
    selectedResponseId: "wrong",
    orderedResponseIds: [],
  })).toEqual({
    tone: "wrong",
    text: "Попробуй ещё раз.",
    authored: false,
    responseId: null,
    analysis: null,
    diagnostics: null,
  });
});

test("direct player projects feedback at the submitted response before clearing learner state", () => {
  const player = fs.readFileSync(path.resolve(__dirname, "../app/learning_v2_direct_session_player_v1.tsx"), "utf8");
  expect(player).toContain("resolveLearningV2ModeFeedbackV1");
  expect(player).toContain("learnerFeedback={learnerFeedback}");
  expect(player).toMatch(/setLearnerFeedback\(resolveLearningV2ModeFeedbackV1\([\s\S]+?orderedResponseIds:\s*orderedIds/u);
});

test("feedback resolver uses an unconditional wrong fallback after the early correct return", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../modules/learning-v2/modes/mode_feedback_v1.tsx"),
    "utf8",
  );
  expect(source).toContain("text: WRONG_VERDICT_BY_LOCALE[interfaceLocale]");
  expect(source).not.toMatch(/text:\s*outcome === "correct"/u);
});

test("S01 speed mismatch explains both the selected English item and the owner of the selected translation", () => {
  const explanation = resolveLearningV2SpeedMatchMismatchExplanationV1({
    interfaceLocale: "ru",
    leftPairId: "p1",
    rightPairId: "p2",
    payload: {
      family: "speed_match",
      pairGrid: [
        { pairId: "p1", target: "here", meaningByLocale: { ru: "здесь", uk: "тут" }, analysisV1: {
          lemma: "here", partOfSpeech: "adverb", partOfSpeechLabelByLocale: { ru: "наречие", uk: "прислівник" },
          meaningByLocale: { ru: "здесь", uk: "тут" }, functionByLocale: { ru: "Сообщает место.", uk: "Повідомляє місце." },
          matchExplanationByLocale: { ru: "here соответствует «здесь».", uk: "here відповідає «тут»." }, sourceRefs: ["final.ru.md#intro-1"],
        } },
        { pairId: "p2", target: "ready", meaningByLocale: { ru: "готов", uk: "готовий" }, analysisV1: {
          lemma: "ready", partOfSpeech: "adjective", partOfSpeechLabelByLocale: { ru: "прилагательное", uk: "прикметник" },
          meaningByLocale: { ru: "готов", uk: "готовий" }, functionByLocale: { ru: "Сообщает готовность.", uk: "Повідомляє готовність." },
          matchExplanationByLocale: { ru: "ready соответствует «готов».", uk: "ready відповідає «готовий»." }, sourceRefs: ["final.ru.md#intro-2"],
        } },
      ],
      leftColumn: ["p1", "p2"], rightColumn: ["p2", "p1"], pairingKey: "pair_id",
      timerPolicy: { enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true },
      finishStats: ["speed", "accuracy", "personal_best"],
    },
  });
  expect(explanation).toEqual({
    selectedTarget: "here",
    selectedMeaning: "готов",
    selectedTargetExplanation: "here соответствует «здесь».",
    meaningOwnerTarget: "ready",
    meaningOwnerExplanation: "ready соответствует «готов».",
  });
});
