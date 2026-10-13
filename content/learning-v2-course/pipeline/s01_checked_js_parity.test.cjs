const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repository = path.resolve(__dirname, "../../..");
const contract = require(path.join(repository, "functions-content/lib/modules/learning-v2/contracts/mode_native_payload_v1.js"));
const runtime = require(path.join(repository, "functions-content/lib/modules/learning-v2/runtime/course_session_client_children_v1.js"));
const compiledFactoryPath = path.join(repository, "functions-content/lib/modules/learning-v2/content/factory_native/factory_native_course_v1.js");
const compiledLesson1ParityPath = path.join(repository, "functions-content/lib/modules/learning-v2/content/lesson1_release_parity_v1.js");

const locales = ["ru", "uk", "en", "es", "pt-BR", "vi", "id", "tr", "pl"];
const localized = (ru, uk = ru) => Object.fromEntries(locales.map((locale) => [locale, locale === "uk" ? uk : ru]));
const analysis = {
  text: "here",
  meaningByLocale: localized("здесь", "тут"),
  explanationByLocale: localized("Наречие места.", "Прислівник місця."),
  units: [{
    text: "here", start: 0, end: 4, lemma: "here", partOfSpeech: "adverb",
    partOfSpeechLabelByLocale: localized("наречие", "прислівник"),
    meaningByLocale: localized("здесь", "тут"),
    functionByLocale: localized("Сообщает место.", "Повідомляє місце."),
    sourceRefs: ["s01#here"],
  }],
};
const diagnostics = {
  errorType: "wrong_lexeme",
  whyTemptingByLocale: localized("Слово знакомо.", "Слово знайоме."),
  whyWrongHereByLocale: localized("Не выражает место.", "Не виражає місце."),
  minimalContrastByLocale: localized("ready → here", "ready → here"),
  acceptabilityBoundaryByLocale: localized("Ready подходит для состояния.", "Ready пасує для стану."),
};

test("checked JavaScript validator keeps the TypeScript RU/UK fail-closed rule", () => {
  const payload = {
    family: "context_gap_grammar",
    localizedScene: localized("Сцена"),
    gappedTargetPhrase: "I am ___.",
    gapOptions: [{ responseId: "r1", text: "here" }],
    testedDimension: "location",
    choiceFeedback: [{ responseId: "r1", correct: true, feedbackByLocale: localized("Верно."), analysisV1: analysis }],
  };
  assert.equal(contract.validateLearningV2ModeNativePayloadV1(payload).family, "context_gap_grammar");
  const missingUk = structuredClone(payload);
  delete missingUk.choiceFeedback[0].analysisV1.meaningByLocale.uk;
  assert.throws(() => contract.validateLearningV2ModeNativePayloadV1(missingUk), /localized_copy_missing/u);
});

test("checked JavaScript runtime and native projector preserve intro diagnostics", () => {
  const compiledFactory = fs.readFileSync(compiledFactoryPath, "utf8");
  assert.match(compiledFactory, /exports\.factoryNativeIntroResponseDiagnosticsByIdV1/u);
  assert.match(compiledFactory, /responseDiagnosticsById/u);

  const save = runtime.materializeLearningV2CourseSessionSavablePhraseV1({
    targetLanguage: "en", targetText: "here", meaningByLocale: localized("здесь", "тут"),
  });
  const entries = Array.from({ length: 9 }, (_, index) => ({
    interactionId: `intro${index + 1}`,
    report: { available: true, reportContextRef: `intro${index + 1}:report`, screen: "learning_v2_session" },
    save,
    voice: { available: true, tapToRecordAllowed: true, holdToTalkAllowed: true },
    secondErrorExplanationRef: `intro${index + 1}:feedback`,
    secondErrorExplanationByLocale: localized("Объяснение.", "Пояснення."),
    ...(index === 0 ? {
      responseFeedbackById: { r2: localized("Неверно.", "Неправильно.") },
      responseAnalysisById: { r2: Object.fromEntries(locales.map((locale) => [locale, analysis])) },
      responseDiagnosticsById: { r2: diagnostics },
    } : {}),
  }));
  const auxiliary = runtime.materializeLearningV2CourseSessionAuxiliaryChildV1({
    courseSessionId: "en:lesson-01:session-01", entries,
  });
  assert.equal(auxiliary.entries[0].responseDiagnosticsById.r2.errorType, "wrong_lexeme");
});

test("checked JavaScript lesson 1 parity module loads its real dependency graph", () => {
  const parity = require(compiledLesson1ParityPath);
  assert.equal(typeof parity.releasedLesson1SessionSignatureV1, "function");
  const signature = parity.releasedLesson1SessionSignatureV1(1);
  assert.equal(signature.sessionOrdinal, 1);
  assert.deepEqual(signature.newWords, ["fine", "happy", "here", "ready"]);
  assert.equal(typeof signature.interactionProfile, "string");
});
