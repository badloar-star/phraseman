import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// These pipeline modules are JavaScript authorities shared by the release builder.
// @ts-expect-error no declaration file is published for the pipeline module.
import { applyPracticeExplanationsV1 } from "../content/learning-v2-course/pipeline/practice_explanations_v1.mjs";
// @ts-expect-error no declaration file is published for the pipeline module.
import { projectSinglePhraseRelease } from "../content/learning-v2-course/pipeline/single_phrase_release.mjs";

import { validateLearningV2ModeNativePayloadV1 } from "../modules/learning-v2/contracts/mode_native_payload_v1";
import {
  factoryNativeChoiceFeedbackV1,
  factoryNativeExplanationV1,
  factoryNativeIntroResponseAnalysisByIdV1,
  factoryNativeIntroResponseDiagnosticsByIdV1,
  factoryNativeIntroResponseFeedbackByIdV1,
} from "../modules/learning-v2/content/factory_native/factory_native_course_v1";
import {
  materializeLearningV2CourseSessionAuxiliaryChildV1,
  materializeLearningV2CourseSessionSavablePhraseV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";

const localized = (ru: string, uk: string) => Object.freeze({
  ru, uk, en: ru, es: ru, "pt-BR": ru, vi: ru, id: ru, tr: ru, pl: ru,
});
const localizedValue = <T,>(value: T) => Object.freeze({
  ru: value, uk: value, en: value, es: value, "pt-BR": value, vi: value, id: value, tr: value, pl: value,
});

const phrase = Object.freeze({
  text: "I am here.",
  meaningByLocale: localized("Я здесь.", "Я тут."),
  explanationByLocale: localized("Полная фраза.", "Повна фраза."),
  units: Object.freeze([
    Object.freeze({ text: "I", start: 0, end: 1, lemma: "I", partOfSpeech: "personal_pronoun", partOfSpeechLabelByLocale: localized("местоимение", "займенник"), meaningByLocale: localized("я", "я"), functionByLocale: localized("Подлежащее.", "Підмет."), sourceRefs: Object.freeze(["source#I"]) }),
    Object.freeze({ text: "am", start: 2, end: 4, lemma: "be", partOfSpeech: "linking_verb", partOfSpeechLabelByLocale: localized("глагол-связка", "дієслово-зв'язка"), meaningByLocale: localized("форма be", "форма be"), functionByLocale: localized("Связка.", "Зв'язка."), sourceRefs: Object.freeze(["source#am"]) }),
    Object.freeze({ text: "here", start: 5, end: 9, lemma: "here", partOfSpeech: "adverb", partOfSpeechLabelByLocale: localized("наречие", "прислівник"), meaningByLocale: localized("здесь", "тут"), functionByLocale: localized("Место.", "Місце."), sourceRefs: Object.freeze(["source#here"]) }),
    Object.freeze({ text: ".", start: 9, end: 10, lemma: ".", partOfSpeech: "punctuation", partOfSpeechLabelByLocale: localized("знак", "знак"), meaningByLocale: localized("конец", "кінець"), functionByLocale: localized("Завершает.", "Завершує."), sourceRefs: Object.freeze(["source#period"]) }),
  ]),
});

const word = (text: "here" | "ready") => Object.freeze({
  text,
  meaningByLocale: localized(text === "here" ? "здесь" : "готов", text === "here" ? "тут" : "готовий"),
  explanationByLocale: localized("Слово в выбранной сцене.", "Слово у вибраній сцені."),
  units: Object.freeze([Object.freeze({
    text, start: 0, end: text.length, lemma: text, partOfSpeech: text === "here" ? "adverb" : "adjective",
    partOfSpeechLabelByLocale: localized(text === "here" ? "наречие" : "прилагательное", text === "here" ? "прислівник" : "прикметник"),
    meaningByLocale: localized(text === "here" ? "здесь" : "готов", text === "here" ? "тут" : "готовий"),
    functionByLocale: localized("Передаёт выбранный смысл.", "Передає вибраний зміст."),
    sourceRefs: Object.freeze([`source#${text}`]),
  })]),
});

const wrong = Object.freeze({
  responseId: "r2",
  correct: false,
  feedbackByLocale: localized("Не тот смысл.", "Не той зміст."),
  analysisV1: word("ready"),
  errorType: "wrong_lexeme",
  whyTemptingByLocale: localized("Слово знакомо.", "Слово знайоме."),
  whyWrongHereByLocale: localized("Не отвечает сцене.", "Не відповідає сцені."),
  minimalContrastByLocale: localized("Сравните с here.", "Порівняйте з here."),
  acceptabilityBoundaryByLocale: localized("Возможно в другой сцене.", "Можливо в іншій сцені."),
});

const payload = {
  family: "context_gap_grammar" as const,
  localizedScene: localized("Сцена", "Сцена"),
  gappedTargetPhrase: "I am ___.",
  gapOptions: Object.freeze([{ responseId: "r1", text: "here" }, { responseId: "r2", text: "ready" }]),
  testedDimension: "location",
  choiceFeedback: Object.freeze([
    Object.freeze({ responseId: "r1", correct: true, feedbackByLocale: localized("Верно.", "Правильно."), analysisV1: word("here") }),
    wrong,
  ]),
};

assert.equal(validateLearningV2ModeNativePayloadV1(payload).family, "context_gap_grammar");

const missingUkrainianMeaning = structuredClone(payload);
delete missingUkrainianMeaning.choiceFeedback[0].analysisV1.meaningByLocale.uk;
assert.throws(
  () => validateLearningV2ModeNativePayloadV1(missingUkrainianMeaning),
  /learning_v2_mode_text_analysis_localized_copy_missing/u,
);

const missingUkrainianDiagnostic = structuredClone(payload);
delete missingUkrainianDiagnostic.choiceFeedback[1].whyWrongHereByLocale.uk;
assert.throws(
  () => validateLearningV2ModeNativePayloadV1(missingUkrainianDiagnostic),
  /learning_v2_mode_choice_wrong_reason_missing/u,
);

const badOffset = structuredClone(payload);
badOffset.choiceFeedback[0].analysisV1.units[0].start = 1;
assert.throws(() => validateLearningV2ModeNativePayloadV1(badOffset), /learning_v2_mode_text_analysis_unit_offsets/u);

const missingWrongReason = structuredClone(payload);
delete (missingWrongReason.choiceFeedback[1] as Partial<typeof wrong>).whyWrongHereByLocale;
assert.throws(() => validateLearningV2ModeNativePayloadV1(missingWrongReason), /learning_v2_mode_choice_wrong_reason_missing/u);

const speed = {
  family: "speed_match" as const,
  pairGrid: [{
    pairId: "p1",
    target: "I am here.",
    meaningByLocale: localized("Я здесь.", "Я тут."),
    analysisV1: {
      lemma: "here",
      partOfSpeech: "adverb",
      partOfSpeechLabelByLocale: localized("наречие", "прислівник"),
      meaningByLocale: localized("Я здесь.", "Я тут."),
      functionByLocale: localized("Сообщает место.", "Повідомляє місце."),
      matchExplanationByLocale: localized("Пара по месту.", "Пара за місцем."),
      sourceRefs: ["source#pair"],
      phrase,
    },
  }],
  leftColumn: ["p1"], rightColumn: ["p1"], pairingKey: "pair_id" as const,
  timerPolicy: { enabledByDefault: true as const, learnerCanDisable: true as const, pausesOnInterruption: true as const },
  finishStats: ["speed", "accuracy", "personal_best"] as const,
};
assert.equal(validateLearningV2ModeNativePayloadV1(speed).family, "speed_match");
const mismatchedPhrase = structuredClone(speed);
mismatchedPhrase.pairGrid[0].analysisV1.phrase.text = "I am ready.";
assert.throws(() => validateLearningV2ModeNativePayloadV1(mismatchedPhrase), /learning_v2_mode_text_analysis_text_mismatch/u);

const projectedSpeed = factoryNativeExplanationV1({ analysisV1: speed.pairGrid[0].analysisV1 });
assert.equal(projectedSpeed?.analysisV1?.phrase?.text, "I am here.");
assert.equal(projectedSpeed?.analysisV1?.phrase?.units.length, 4);

const projectedFeedback = factoryNativeChoiceFeedbackV1(
  { choiceFeedback: payload.choiceFeedback },
  payload.gapOptions,
  "r1",
  "source",
  "source",
);
assert.equal(projectedFeedback[0]?.analysisV1?.text, "here");
assert.equal(projectedFeedback[1]?.errorType, "wrong_lexeme");
assert.equal(projectedFeedback[1]?.whyWrongHereByLocale.ru, "Не отвечает сцене.");

const introFeedback = factoryNativeIntroResponseFeedbackByIdV1({
  rawAuxiliary: { entries: [{ interactionId: "source:intro1:q", responseFeedbackById: {
    "source:intro1:r1": localized("Верно.", "Правильно."),
    "source:intro1:r2": localized("Неверно.", "Неправильно."),
  } }] },
  sourceInteractionId: "source:intro1:q",
  sourceResponseIds: ["source:intro1:r1", "source:intro1:r2"],
  sourceCorrectResponseId: "source:intro1:r1",
  oldPrefix: "source",
  courseSessionId: "en:lesson-01:session-01",
});
assert.deepEqual(Object.keys(introFeedback).sort(), [
  "en:lesson-01:session-01:intro1:r1",
  "en:lesson-01:session-01:intro1:r2",
]);
const introAnalysis = factoryNativeIntroResponseAnalysisByIdV1({
  rawAuxiliary: { entries: [{ interactionId: "source:intro1:q", responseAnalysisById: {
    "source:intro1:r1": { ru: phrase, uk: phrase },
    "source:intro1:r2": { ru: phrase, uk: phrase },
  } }] },
  sourceInteractionId: "source:intro1:q",
  sourceResponseIds: ["source:intro1:r1", "source:intro1:r2"],
  oldPrefix: "source",
  courseSessionId: "en:lesson-01:session-01",
});
assert.equal(introAnalysis["en:lesson-01:session-01:intro1:r1"]?.uk.text, "I am here.");
const introDiagnostics = factoryNativeIntroResponseDiagnosticsByIdV1({
  rawAuxiliary: { entries: [{ interactionId: "source:intro1:q", responseDiagnosticsById: {
    "source:intro1:r2": {
      errorType: "missing_linking_verb",
      whyTemptingByLocale: localized("Похоже на краткую фразу.", "Схоже на коротку фразу."),
      whyWrongHereByLocale: localized("Нужен am.", "Потрібне am."),
      minimalContrastByLocale: localized("I here. → I am here.", "I here. → I am here."),
      acceptabilityBoundaryByLocale: localized("Только как заметка.", "Лише як нотатка."),
    },
  } }] },
  sourceInteractionId: "source:intro1:q",
  sourceResponseIds: ["source:intro1:r1", "source:intro1:r2"],
  sourceCorrectResponseId: "source:intro1:r1",
  oldPrefix: "source",
  courseSessionId: "en:lesson-01:session-01",
});
assert.equal(introDiagnostics["en:lesson-01:session-01:intro1:r2"]?.whyWrongHereByLocale.uk, "Потрібне am.");

const save = materializeLearningV2CourseSessionSavablePhraseV1({
  targetLanguage: "en",
  targetText: "I am here.",
  meaningByLocale: localized("Я здесь.", "Я тут."),
});
const auxiliary = materializeLearningV2CourseSessionAuxiliaryChildV1({
  courseSessionId: "en:lesson-01:session-01",
  entries: Object.freeze(Array.from({ length: 9 }, (_, index) => Object.freeze({
    interactionId: `intro${index + 1}`,
    report: Object.freeze({ available: true as const, reportContextRef: `intro${index + 1}:report`, screen: "learning_v2_session" as const }),
    save,
    voice: Object.freeze({ available: true as const, tapToRecordAllowed: true as const, holdToTalkAllowed: true as const }),
    secondErrorExplanationRef: `intro${index + 1}:feedback`,
    secondErrorExplanationByLocale: localized("Объяснение.", "Пояснення."),
    ...(index === 0 ? {
      responseFeedbackById: Object.freeze({ r1: localized("Верно.", "Правильно.") }),
      responseAnalysisById: Object.freeze({ r1: localizedValue(phrase) }),
      responseDiagnosticsById: Object.freeze({ r1: Object.freeze({
        errorType: "missing_linking_verb",
        whyTemptingByLocale: localized("Похоже на фразу.", "Схоже на фразу."),
        whyWrongHereByLocale: localized("Нужен am.", "Потрібне am."),
        minimalContrastByLocale: localized("I here. → I am here.", "I here. → I am here."),
        acceptabilityBoundaryByLocale: localized("Только заметка.", "Лише нотатка."),
      }) }),
    } : {}),
  }))),
});
assert.equal(auxiliary.entries[0]?.responseAnalysisById?.r1?.ru.text, "I am here.");
assert.equal(auxiliary.entries[0]?.responseDiagnosticsById?.r1?.errorType, "missing_linking_verb");

const s01Dir = path.resolve(__dirname, "../content/learning-v2-course/sessions/en/l01/s01");
const atomicSource = JSON.parse(fs.readFileSync(path.join(s01Dir, "practice.atomic.json"), "utf8"));
const explanationSidecar = JSON.parse(fs.readFileSync(path.join(s01Dir, "practice.explanations.v1.json"), "utf8"));
const semanticSource = applyPracticeExplanationsV1({ atomicSource, sidecar: explanationSidecar });
const releaseProjection = projectSinglePhraseRelease({
  interactions: semanticSource.interactionsByLocale.ru,
  answers: semanticSource.answers,
  locale: "ru",
});
const releaseI17 = releaseProjection.interactions.find((interaction: { interactionId: string }) =>
  interaction.interactionId === "en:lesson-01:session-01:i17:s01");
assert.ok(releaseI17);
const releasePair = releaseI17.modePayload.pairGrid.find((pair: { target: string }) => pair.target === "I am here.");
assert.ok(releasePair?.analysisV1?.phrase);
const nativeI17 = factoryNativeExplanationV1({ analysisV1: releasePair.analysisV1 });
assert.deepEqual(nativeI17?.analysisV1?.phrase?.units.map((unit) => unit.text), ["I", "am", "here", "."]);
assert.equal(nativeI17?.analysisV1?.phrase?.text, "I am here.");

console.log("learning_v2_mode_text_analysis_contract_gate: PASS");
