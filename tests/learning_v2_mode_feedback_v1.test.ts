import fs from "node:fs";
import path from "node:path";

import { resolveLearningV2ModeFeedbackV1 } from "../modules/learning-v2/modes/mode_feedback_v1";
import { resolveLearningV2SpeedMatchMismatchExplanationV1 } from "../modules/learning-v2/modes/speed_match_runtime_v1";
import {
  factoryNativeChoiceFeedbackV1,
  factoryNativeOrderedTokenSlotFeedbackV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";

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

test("S01 choice feedback preserves and resolves the exact authored RU and UK copy for correct and wrong submissions", () => {
  const interaction = s01Source().interactionsByLocale.ru.find((entry: any) =>
    entry.interactionId === `${SOURCE_SESSION_ID}:i02`);
  expect(interaction?.modePayload?.family).toBe("context_gap_grammar");
  if (interaction?.modePayload?.family !== "context_gap_grammar") throw new Error("fixture_missing");

  const correctId = interaction.modePayload.choiceFeedback
    .find((entry: any) => entry.correct).responseId
    .replace(SOURCE_SESSION_ID, SESSION_ID);
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
  const correct = feedback.find((entry) => entry.correct);
  const wrong = feedback.find((entry) => !entry.correct);
  expect(correct).toBeDefined();
  expect(wrong).toBeDefined();

  const resolvedCorrect = resolveLearningV2ModeFeedbackV1({
    interfaceLocale: "ru",
    modePayload: { ...interaction.modePayload, choiceFeedback: feedback },
    outcome: "correct",
    selectedResponseId: correct!.responseId,
    orderedResponseIds: [],
  });
  expect(resolvedCorrect).toMatchObject({ tone: "correct", text: correct!.feedbackByLocale.ru, authored: true, responseId: correct!.responseId });
  expect(resolvedCorrect.analysis?.text).toBe("here");
  expect(resolvedCorrect.analysis?.units[0]?.meaningByLocale.ru).toBe("здесь");
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
    expect(correctFeedback).toMatchObject({
      tone: "correct",
      text: completionFeedbackByLocale.uk,
      authored: true,
      responseId: null,
    });
    expect(correctFeedback.analysis?.text).toBe(interaction.modePayload.hiddenTargetPhrase);
    expect(correctFeedback.text).not.toContain(wrong.feedbackByLocale.uk);
  }
});

test.each([
  ["i14", "ru", "I am here."],
  ["i17:s02", "uk", "I am ready."],
] as const)("S01 scripted repeat %s resolves its authored phrase analysis", (suffix, interfaceLocale, targetPhrase) => {
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

  expect(resolved).toMatchObject({
    tone: "correct",
    authored: true,
    responseId: null,
    analysis: { text: targetPhrase },
  });
  expect(resolved.text).toBe(interaction.modePayload.explanationV1.phrase.explanationByLocale[interfaceLocale]);
});

test("direct player projects feedback at the submitted response before clearing learner state", () => {
  const player = fs.readFileSync(path.resolve(__dirname, "../app/learning_v2_direct_session_player_v1.tsx"), "utf8");
  expect(player).toContain("resolveLearningV2ModeFeedbackV1");
  expect(player).toContain("learnerFeedback={learnerFeedback}");
  expect(player).toMatch(/setLearnerFeedback\(resolveLearningV2ModeFeedbackV1\([\s\S]+?orderedResponseIds:\s*orderedIds/u);
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
