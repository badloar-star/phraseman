import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  applyPracticeExplanationsV1,
  projectIntroResponseAnalysesV1,
  projectIntroResponseDiagnosticsV1,
  validatePracticeExplanationsV1,
} from "./practice_explanations_v1.mjs";
import { singlePhraseReleaseIssues } from "./single_phrase_release.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const S01 = path.join(ROOT, "sessions/en/l01/s01");
const SIDECAR = path.join(S01, "practice.explanations.v1.json");
const ATOMIC = path.join(S01, "practice.atomic.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("S01 has a source-bound RU/UK explanation packet for every builder, dictation, and speed pair", () => {
  assert.equal(fs.existsSync(SIDECAR), true, "practice.explanations.v1.json missing");
  const sidecar = readJson(SIDECAR);
  assert.equal(sidecar.schemaVersion, "learning_v2_practice_explanations_v1");
  assert.match(sidecar.sourceBindings.ru.sha256, /^[a-f0-9]{64}$/u);
  assert.match(sidecar.sourceBindings.uk.sha256, /^[a-f0-9]{64}$/u);
  const atomic = readJson(ATOMIC);
  const authoritativeIds = [...new Set(Object.values(atomic.interactionsByLocale).flat()
    .filter((entry) => ["phrase_builder", "listen_build_dictation", "listen_choose", "context_gap_grammar", "scripted_repeat_compare", "speed_match"].includes(entry.family))
    .map((entry) => entry.interactionId))].sort();
  assert.deepEqual(Object.keys(sidecar.interactions).sort(), authoritativeIds, "analysis inventory must derive from the current source IDs");
  for (const entry of Object.values(sidecar.interactions)) {
    if (entry.family === "speed_match") {
      assert.equal(entry.pairs.length, 4);
      for (const pair of entry.pairs) {
        for (const locale of ["ru", "uk"]) assert.ok(pair.analysisV1.matchExplanationByLocale[locale].trim());
        assert.ok(pair.analysisV1.lemma.trim());
        assert.ok(pair.analysisV1.partOfSpeech.trim());
        assert.ok(pair.analysisV1.sourceRefs.length);
      }
      continue;
    }
    if (!["phrase_builder", "listen_build_dictation"].includes(entry.family)) continue;
    for (const locale of ["ru", "uk"]) assert.ok(entry.completionFeedbackByLocale[locale].trim());
    assert.equal(entry.phrase.text.slice(-1), ".");
    for (const unit of entry.phrase.units) {
      assert.equal(entry.phrase.text.slice(unit.start, unit.end), unit.text);
      assert.ok(unit.lemma.trim());
      assert.ok(unit.partOfSpeech.trim());
      assert.ok(unit.sourceRefs.length);
      for (const locale of ["ru", "uk"]) {
        assert.ok(unit.partOfSpeechLabelByLocale[locale].trim());
        assert.ok(unit.meaningByLocale[locale].trim());
        assert.ok(unit.functionByLocale[locale].trim());
      }
    }
  }
});

test("S01 explanation gate rejects every incomplete authored field and stale source binding", () => {
  const sidecar = readJson(SIDECAR);
  const atomicSource = readJson(ATOMIC);
  assert.deepEqual(validatePracticeExplanationsV1({ sidecar, atomicSource, sessionDir: S01 }), []);

  const phraseId = "en:lesson-01:session-01:i10";
  const speedId = "en:lesson-01:session-01:i08";
  const mutants = [
    ["completion_feedback_missing:ru", (value) => delete value.interactions[phraseId].completionFeedbackByLocale.ru],
    ["completion_feedback_missing:uk", (value) => delete value.interactions[phraseId].completionFeedbackByLocale.uk],
    ["unit_lemma_missing", (value) => delete value.interactions[phraseId].phrase.units[0].lemma],
    ["unit_part_of_speech_missing", (value) => delete value.interactions[phraseId].phrase.units[0].partOfSpeech],
    ["unit_function_missing:ru", (value) => delete value.interactions[phraseId].phrase.units[0].functionByLocale.ru],
    ["unit_source_missing", (value) => { value.interactions[phraseId].phrase.units[0].sourceRefs = []; }],
    ["speed_pair_explanation_missing:uk", (value) => delete value.interactions[speedId].pairs[0].analysisV1.matchExplanationByLocale.uk],
    ["source_binding_mismatch:ru", (value) => { value.sourceBindings.ru.sha256 = "0".repeat(64); }],
  ];
  for (const [expected, mutate] of mutants) {
    const mutant = clone(sidecar);
    mutate(mutant);
    assert.ok(
      validatePracticeExplanationsV1({ sidecar: mutant, atomicSource, sessionDir: S01 })
        .some((issue) => issue.includes(expected)),
      expected,
    );
  }
});

test("S01 explanation projection preserves authored completion, phrase units, and speed-pair analyses", () => {
  const sidecar = readJson(SIDECAR);
  const projected = applyPracticeExplanationsV1({ atomicSource: readJson(ATOMIC), sidecar });
  for (const interactions of Object.values(projected.interactionsByLocale)) {
    for (const interaction of interactions) {
      if (["phrase_builder", "listen_build_dictation"].includes(interaction.family)) {
        assert.equal(interaction.modePayload.explanationV1.phrase.units.length, 4);
        assert.ok(interaction.modePayload.explanationV1.completionFeedbackByLocale.ru);
        assert.ok(interaction.modePayload.explanationV1.completionFeedbackByLocale.uk);
      }
      if (interaction.family === "speed_match") {
        assert.ok(interaction.modePayload.pairGrid.every((pair) => pair.analysisV1?.sourceRefs?.length));
      }
    }
    assert.equal(
      singlePhraseReleaseIssues(interactions, "en/l01/s01:explanation-projection")
        .some((issue) => ["unknown_learner_payload", "invalid_nested_learner_schema"].includes(issue.reason)),
      false,
    );
  }
});

test("S01 phrase speed matches analyse each word instead of labelling a whole sentence as one lemma", () => {
  const sidecar = readJson(SIDECAR);
  const speed = sidecar.interactions["en:lesson-01:session-01:i17:s01"];
  assert.equal(speed.family, "speed_match");
  for (const pair of speed.pairs) {
    const phrase = pair.analysisV1.phrase;
    assert.equal(phrase?.text, pair.target, `${pair.pairId} needs a phrase analysis bound to its target`);
    assert.deepEqual(phrase?.units?.map((unit) => unit.text), ["I", "am", pair.target.split(" ")[2].replace(".", ""), "."]);
    for (const unit of phrase.units) {
      assert.ok(unit.lemma.trim(), `${pair.pairId}:${unit.text} needs a lemma`);
      assert.ok(unit.partOfSpeech.trim(), `${pair.pairId}:${unit.text} needs a part of speech`);
      for (const locale of ["ru", "uk"]) {
        assert.ok(unit.meaningByLocale?.[locale]?.trim(), `${pair.pairId}:${unit.text}:${locale} needs meaning`);
        assert.ok(unit.functionByLocale?.[locale]?.trim(), `${pair.pairId}:${unit.text}:${locale} needs function`);
      }
    }
  }
});

function assertTextAnalysis(analysis, expectedText, context) {
  assert.equal(analysis?.text, expectedText, `${context}: text binding`);
  assert.ok(analysis?.meaningByLocale?.ru?.trim(), `${context}: ru meaning`);
  assert.ok(analysis?.meaningByLocale?.uk?.trim(), `${context}: uk meaning`);
  assert.ok(analysis?.explanationByLocale?.ru?.trim(), `${context}: ru explanation`);
  assert.ok(analysis?.explanationByLocale?.uk?.trim(), `${context}: uk explanation`);
  assert.ok(Array.isArray(analysis?.units) && analysis.units.length > 0, `${context}: units`);
  const covered = new Set();
  for (const [index, unit] of analysis.units.entries()) {
    assert.equal(expectedText.slice(unit.start, unit.end), unit.text, `${context}: unit ${index} offsets`);
    assert.ok(unit.lemma?.trim(), `${context}: unit ${index} lemma`);
    assert.ok(unit.partOfSpeech?.trim(), `${context}: unit ${index} part of speech`);
    assert.ok(unit.partOfSpeechLabelByLocale?.ru?.trim(), `${context}: unit ${index} ru POS label`);
    assert.ok(unit.partOfSpeechLabelByLocale?.uk?.trim(), `${context}: unit ${index} uk POS label`);
    assert.ok(unit.meaningByLocale?.ru?.trim(), `${context}: unit ${index} ru meaning`);
    assert.ok(unit.meaningByLocale?.uk?.trim(), `${context}: unit ${index} uk meaning`);
    assert.ok(unit.functionByLocale?.ru?.trim(), `${context}: unit ${index} ru function`);
    assert.ok(unit.functionByLocale?.uk?.trim(), `${context}: unit ${index} uk function`);
    assert.ok(unit.sourceRefs?.length, `${context}: unit ${index} source refs`);
    for (let offset = unit.start; offset < unit.end; offset += 1) covered.add(offset);
  }
  for (let offset = 0; offset < expectedText.length; offset += 1) {
    if (!/\s/u.test(expectedText[offset])) assert.ok(covered.has(offset), `${context}: uncovered offset ${offset}`);
  }
}

test("S01 packet covers every intro and practice selection plus both spoken targets", () => {
  const sidecar = readJson(SIDECAR);
  const atomic = readJson(ATOMIC);
  const expectedIntroIds = Array.from({ length: 3 }, (_, page) =>
    Array.from({ length: 3 }, (_, choice) => `en:lesson-01:session-01:intro${page + 1}:r${choice + 1}`),
  ).flat();
  assert.deepEqual(
    sidecar.introResponses.map((entry) => entry.responseId).sort(),
    expectedIntroIds.sort(),
  );
  for (const entry of sidecar.introResponses) {
    for (const locale of ["ru", "uk"]) {
      assertTextAnalysis(entry.analysisByLocale[locale], entry.textByLocale[locale], `intro:${entry.responseId}:${locale}`);
    }
    if (!entry.correct) {
      assert.ok(entry.errorType?.trim(), `${entry.responseId}: errorType`);
      for (const field of ["whyTemptingByLocale", "whyWrongHereByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale"]) {
        assert.ok(entry[field]?.ru?.trim(), `${entry.responseId}: ${field}:ru`);
        assert.ok(entry[field]?.uk?.trim(), `${entry.responseId}: ${field}:uk`);
      }
    }
  }

  const sourceInteractions = atomic.interactionsByLocale.ru;
  for (const interaction of sourceInteractions) {
    const authored = sidecar.interactions[interaction.interactionId];
    assert.ok(authored, `${interaction.interactionId}: authored analysis missing`);
    if (["listen_choose", "context_gap_grammar"].includes(interaction.family)) {
      const selectable = interaction.modePayload.localizedMeaningChoices ?? interaction.modePayload.gapOptions;
      assert.deepEqual(
        authored.responses.map((entry) => entry.responseId).sort(),
        selectable.map((entry) => entry.responseId).sort(),
        `${interaction.interactionId}: exact response coverage`,
      );
      for (const response of authored.responses) {
        for (const locale of ["ru", "uk"]) {
          assertTextAnalysis(response.analysisByLocale[locale], response.textByLocale[locale], `${interaction.interactionId}:${response.responseId}:${locale}`);
        }
        if (!response.correct) {
          assert.ok(response.errorType?.trim());
          for (const field of ["whyTemptingByLocale", "whyWrongHereByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale"]) {
            assert.ok(response[field]?.ru?.trim(), `${interaction.interactionId}:${response.responseId}:${field}:ru`);
            assert.ok(response[field]?.uk?.trim(), `${interaction.interactionId}:${response.responseId}:${field}:uk`);
          }
        }
      }
    }
    if (["phrase_builder", "listen_build_dictation"].includes(interaction.family)) {
      const distractors = interaction.modePayload.slotFeedback.map((entry) => entry.responseId);
      assert.deepEqual(authored.responses.map((entry) => entry.responseId).sort(), distractors.sort());
      for (const response of authored.responses) {
        assert.equal(response.correct, false);
        for (const locale of ["ru", "uk"]) {
          assertTextAnalysis(response.analysisByLocale[locale], response.textByLocale[locale], `${interaction.interactionId}:${response.responseId}:${locale}`);
        }
        assert.ok(response.errorType?.trim());
      }
    }
    if (interaction.family === "scripted_repeat_compare") {
      assertTextAnalysis(authored.phrase, interaction.modePayload.targetPhrase, interaction.interactionId);
    }
  }
});

test("S01 explanation validator fails closed on response coverage, token offsets, and wrong-choice reasoning", () => {
  const sidecar = readJson(SIDECAR);
  const atomicSource = readJson(ATOMIC);
  const mutations = [
    ["response_analysis_missing", (value) => value.interactions["en:lesson-01:session-01:i02"].responses.pop()],
    ["response_analysis_unknown", (value) => value.interactions["en:lesson-01:session-01:i02"].responses.push({ ...value.interactions["en:lesson-01:session-01:i02"].responses[0], responseId: "unknown" })],
    ["unit_offsets_mismatch", (value) => { value.interactions["en:lesson-01:session-01:i02"].responses[0].analysisByLocale.ru.units[0].start = 1; }],
    ["unit_analysis_gap", (value) => { value.interactions["en:lesson-01:session-01:i17:s01"].pairs[0].analysisV1.phrase.units.pop(); }],
    ["s01_phrase_units_mismatch", (value) => {
      const phrase = value.interactions["en:lesson-01:session-01:i17:s01"].pairs[0].analysisV1.phrase;
      phrase.units = [{
        ...phrase.units[0], text: phrase.text, start: 0, end: phrase.text.length, lemma: phrase.text,
      }];
    }],
    ["unit_meaning_missing:uk", (value) => { delete value.interactions["en:lesson-01:session-01:i02"].responses[0].analysisByLocale.ru.units[0].meaningByLocale.uk; }],
    ["analysis_meaning_missing:uk", (value) => { delete value.interactions["en:lesson-01:session-01:i02"].responses[0].analysisByLocale.ru.meaningByLocale.uk; }],
    ["unit_source_missing", (value) => { value.interactions["en:lesson-01:session-01:i02"].responses[0].analysisByLocale.ru.units[0].sourceRefs = []; }],
    ["response_correctness_mismatch", (value) => { value.interactions["en:lesson-01:session-01:i02"].responses[1].correct = true; }],
    ["wrong_reason_missing:whyWrongHereByLocale", (value) => delete value.interactions["en:lesson-01:session-01:i02"].responses[1].whyWrongHereByLocale],
    ["intro_response_analysis_missing", (value) => value.introResponses.pop()],
    ["locale_contamination:uk", (value) => { value.introResponses[0].analysisByLocale.uk.units[0].functionByLocale.uk = "Называет говорящего."; }],
    ["generic_pedagogy_text:ru", (value) => { value.introResponses[1].whyTemptingByLocale.ru = "Вариант знакомо и подходит по форме, поэтому его легко выбрать автоматически."; }],
    ["source_reference_unresolved", (value) => { value.introResponses[0].analysisByLocale.ru.units[0].sourceRefs = ["final.ru.md#missing"]; }],
  ];
  for (const [expected, mutate] of mutations) {
    const mutant = clone(sidecar);
    mutate(mutant);
    const issues = validatePracticeExplanationsV1({ sidecar: mutant, atomicSource, sessionDir: S01 });
    assert.ok(issues.some((issue) => issue.includes(expected)), `${expected}: ${JSON.stringify(issues.slice(0, 5))}`);
  }
});

test("S01 intro projection preserves all five diagnostic fields for each wrong answer", () => {
  const sidecar = readJson(SIDECAR);
  const diagnostics = projectIntroResponseDiagnosticsV1(sidecar);
  const wrong = sidecar.introResponses.filter((entry) => !entry.correct);
  assert.equal(wrong.length, 6);
  assert.deepEqual(Object.keys(diagnostics).sort(), wrong.map((entry) => entry.responseId).sort());
  for (const entry of wrong) {
    const projected = diagnostics[entry.responseId];
    assert.equal(projected.errorType, entry.errorType);
    for (const field of ["whyTemptingByLocale", "whyWrongHereByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale"]) {
      assert.deepEqual(projected[field], entry[field], `${entry.responseId}:${field}`);
    }
  }
});

test("S01 wrong-answer explanations are contextual and do not reuse one generic template", () => {
  const sidecar = readJson(SIDECAR);
  const wrong = [
    ...sidecar.introResponses.filter((entry) => !entry.correct),
    ...Object.values(sidecar.interactions).flatMap((entry) => (entry.responses ?? []).filter((response) => !response.correct)),
  ];
  const temptingRu = wrong.map((entry) => entry.whyTemptingByLocale.ru);
  assert.equal(temptingRu.some((text) => text === "Вариант использует знакомые слова из текущего урока и поэтому может показаться близким по смыслу."), false);
  assert.ok(new Set(temptingRu).size >= Math.ceil(temptingRu.length * 0.75), "whyTempting must explain the exact option, not a repeated template");
  const minimalRu = wrong.map((entry) => entry.minimalContrastByLocale.ru);
  assert.ok(new Set(minimalRu).size >= Math.ceil(minimalRu.length * 0.75), "minimalContrast must be option-specific");

  const amHere = sidecar.introResponses.find((entry) => entry.textByLocale.ru === "Am here.");
  assert.match(amHere.analysisByLocale.ru.units[0].functionByLocale.ru, /без I|нет подлежащего|пропущен.*I/iu);
  const iHappy = sidecar.introResponses.find((entry) => entry.textByLocale.ru === "I happy.");
  assert.match(iHappy.analysisByLocale.ru.units.find((unit) => unit.text === "happy").functionByLocale.ru, /без am|пропущен.*am/iu);
});

test("S01 visible tasks 11 and 12 use different learner actions while all reviewed targets and audio bindings remain intact", () => {
  const atomic = readJson(ATOMIC);
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(atomic.interactionsByLocale[locale].map((entry) => [entry.interactionId, entry]));
    const i09 = byId.get("en:lesson-01:session-01:i09");
    const i10 = byId.get("en:lesson-01:session-01:i10");
    const i11 = byId.get("en:lesson-01:session-01:i11");
    const i12 = byId.get("en:lesson-01:session-01:i12");
    const i13 = byId.get("en:lesson-01:session-01:i13");
    assert.equal(i09.family, "phrase_builder");
    assert.equal(i09.modePayload.targetPhrase, "I am here.");
    assert.equal(i09.ordinal, 10);
    assert.equal(i13.family, "listen_choose");
    assert.equal(i13.ordinal, 11);
    assert.equal(i13.modePayload.referenceAudio.transcript, "I am here.");
    assert.equal(i10.family, "phrase_builder");
    assert.equal(i10.modePayload.targetPhrase, "I am fine.");
    assert.equal(i10.ordinal, 12);
    assert.equal(i12.family, "listen_build_dictation");
    assert.equal(i12.modePayload.hiddenTargetPhrase, "I am ready.");
    assert.equal(i12.ordinal, 13);
    assert.equal(i11.family, "phrase_builder");
    assert.equal(i11.modePayload.targetPhrase, "I am ready.");
    assert.equal(i11.ordinal, 14);
  }
});

test("S01 projection retains analyses for every authored response and spoken target", () => {
  const sidecar = readJson(SIDECAR);
  const projected = applyPracticeExplanationsV1({ atomicSource: readJson(ATOMIC), sidecar });
  for (const interactions of Object.values(projected.interactionsByLocale)) {
    for (const interaction of interactions) {
      const payload = interaction.modePayload;
      if (["listen_choose", "context_gap_grammar"].includes(interaction.family)) {
        assert.ok(payload.choiceFeedback.length > 0, `${interaction.interactionId}: choice feedback`);
        assert.ok(payload.choiceFeedback.every((entry) => entry.analysisV1?.units?.length), `${interaction.interactionId}: response analysis`);
      }
      if (["phrase_builder", "listen_build_dictation"].includes(interaction.family)) {
        assert.ok(payload.slotFeedback.every((entry) => entry.analysisV1?.units?.length), `${interaction.interactionId}: slot analysis`);
      }
      if (interaction.family === "scripted_repeat_compare") {
        assert.ok(payload.explanationV1?.phrase?.units?.length, `${interaction.interactionId}: phrase analysis`);
      }
      if (interaction.family === "speed_match") {
        assert.ok(payload.pairGrid.every((pair) => pair.analysisV1?.phrase?.units?.length), `${interaction.interactionId}: pair phrase analysis`);
      }
    }
  }
  const intro = projectIntroResponseAnalysesV1(sidecar);
  assert.equal(Object.keys(intro).length, 9);
  assert.equal(intro["en:lesson-01:session-01:intro1:r1"].ru.text, "I am here.");
  assert.equal(intro["en:lesson-01:session-01:intro1:r1"].uk.text, "I am here.");
});

function allS01Analyses(sidecar) {
  const analyses = [];
  for (const entry of sidecar.introResponses) analyses.push(...Object.values(entry.analysisByLocale));
  for (const entry of Object.values(sidecar.interactions)) {
    if (entry.phrase) analyses.push(entry.phrase);
    for (const response of entry.responses ?? []) analyses.push(...Object.values(response.analysisByLocale));
    for (const pair of entry.pairs ?? []) {
      if (pair.analysisV1?.phrase) analyses.push(pair.analysisV1.phrase);
    }
  }
  return analyses;
}

test("S01 RU/UK explanations stay locale-clean and avoid boilerplate token notes", () => {
  const sidecar = readJson(SIDECAR);
  const analyses = allS01Analyses(sidecar);
  const russianLeakInUk = /\b(?:отдельное|его|говорящего|прилагательное|местоимение|наречие|служит|называет|сообщает|после|завершает|здесь|всё|готов)\b/iu;
  const ukrainianLeakInRu = /\b(?:окреме|його|мовця|прикметник|займенник|прислівник|слугує|називає|повідомляє|після|завершує|тут|усе|готовий)\b/iu;
  const boilerplate = /отдельное слово; его смысл и роль зависят|окреме слово; його зміст і роль залежать/iu;
  for (const analysis of analyses) {
    for (const [field, localized] of Object.entries({
      meaning: analysis.meaningByLocale,
      explanation: analysis.explanationByLocale,
    })) {
      assert.doesNotMatch(localized.ru, ukrainianLeakInRu, `${analysis.text}:${field}:ru`);
      assert.doesNotMatch(localized.uk, russianLeakInUk, `${analysis.text}:${field}:uk`);
      assert.doesNotMatch(localized.ru, boilerplate, `${analysis.text}:${field}:ru boilerplate`);
      assert.doesNotMatch(localized.uk, boilerplate, `${analysis.text}:${field}:uk boilerplate`);
    }
    for (const unit of analysis.units) {
      for (const [field, localized] of Object.entries({
        label: unit.partOfSpeechLabelByLocale,
        meaning: unit.meaningByLocale,
        function: unit.functionByLocale,
      })) {
        assert.doesNotMatch(localized.ru, ukrainianLeakInRu, `${analysis.text}:${unit.text}:${field}:ru`);
        assert.doesNotMatch(localized.uk, russianLeakInUk, `${analysis.text}:${unit.text}:${field}:uk`);
        assert.doesNotMatch(localized.ru, boilerplate, `${analysis.text}:${unit.text}:${field}:ru boilerplate`);
        assert.doesNotMatch(localized.uk, boilerplate, `${analysis.text}:${unit.text}:${field}:uk boilerplate`);
      }
    }
  }
});

test("S01 wrong-answer diagnostics are misconception-specific and state a truthful boundary", () => {
  const sidecar = readJson(SIDECAR);
  const wrong = [
    ...sidecar.introResponses.filter((entry) => !entry.correct),
    ...Object.values(sidecar.interactions).flatMap((entry) => (entry.responses ?? []).filter((response) => !response.correct)),
  ];
  const forbidden = [
    /знакомо и подходит по форме, поэтому его легко выбрать автоматически/iu,
    /знайоме й підходить за формою, тому його легко вибрати автоматично/iu,
    /меняется ответ на конкретную ситуацию/iu,
    /змінюється відповідь на конкретну ситуацію/iu,
    /Такой вариант не является полной нейтральной фразой/iu,
    /Такий варіант не є повною нейтральною фразою/iu,
    /Само слово возможно в другой ситуации/iu,
    /Саме слово можливе в іншій ситуації/iu,
  ];
  for (const entry of wrong) {
    for (const field of ["whyTemptingByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale"]) {
      for (const locale of ["ru", "uk"]) {
        for (const pattern of forbidden) assert.doesNotMatch(entry[field][locale], pattern, `${entry.responseId}:${field}:${locale}`);
      }
    }
  }
  assert.ok(new Set(wrong.map((entry) => entry.whyTemptingByLocale.ru)).size >= Math.ceil(wrong.length * 0.9));
  assert.ok(new Set(wrong.map((entry) => entry.minimalContrastByLocale.ru)).size >= Math.ceil(wrong.length * 0.9));
  assert.ok(new Set(wrong.map((entry) => entry.acceptabilityBoundaryByLocale.ru)).size >= Math.ceil(wrong.length * 0.75));

  const shortAnswer = sidecar.introResponses.find((entry) => entry.textByLocale.ru === "I am.");
  assert.match(shortAnswer.analysisByLocale.ru.explanationByLocale.ru, /кратк(?:ий|ого) ответ/iu);
  assert.match(shortAnswer.analysisByLocale.uk.explanationByLocale.uk, /коротк(?:а|ої) відповід/iu);
  assert.match(shortAnswer.whyWrongHereByLocale.ru, /не отвечает.*рад/iu);
  assert.match(shortAnswer.whyWrongHereByLocale.uk, /не відповідає.*рад/iu);
  for (const locale of ["ru", "uk"]) {
    const am = shortAnswer.analysisByLocale[locale].units.find((unit) => unit.text === "am");
    assert.doesNotMatch(am.functionByLocale.ru, /не закончен|не хватает слова/iu);
    assert.doesNotMatch(am.functionByLocale.uk, /не завершен|бракує слова/iu);
    assert.match(am.functionByLocale[locale], locale === "ru" ? /кратк.*ответ.*эмоц/iu : /коротк.*відповід.*емоці/iu);
  }
});

test("S01 linguistic source references resolve to retained independent evidence anchors", () => {
  const sidecar = readJson(SIDECAR);
  const refs = allS01Analyses(sidecar).flatMap((analysis) => analysis.units.flatMap((unit) => unit.sourceRefs));
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    const match = /^(judgements\/[^#]+\.md)#([a-z0-9-]+)$/u.exec(ref);
    assert.ok(match, `source ref must bind retained evidence: ${ref}`);
    const file = path.join(ROOT, match[1]);
    assert.equal(fs.existsSync(file), true, `source evidence missing: ${ref}`);
    assert.match(fs.readFileSync(file, "utf8"), new RegExp(`<a id=["']${match[2]}["']></a>`, "u"), `source anchor missing: ${ref}`);
  }
  for (const analysis of allS01Analyses(sidecar)) {
    for (const unit of analysis.units) {
      assert.ok(unit.sourceRefs.length <= 2, `${analysis.text}:${unit.text} must not inherit an overbroad evidence bundle`);
    }
  }

  const expectedAnchorByUnit = {
    I: ["i-pronoun-ru-uk"],
    am: ["be-i-am-ru-uk"],
    here: ["here-adverb-ru-uk"],
    ready: ["ready-adjective-ru-uk"],
    fine: ["fine-adjective-ru-uk"],
    happy: ["happy-adjective-ru-uk"],
    ".": ["punctuation-full-stop"],
  };
  for (const analysis of allS01Analyses(sidecar).filter((entry) => /^[A-Za-z'. ]+$/u.test(entry.text))) {
    for (const unit of analysis.units) {
      const surface = unit.text === "I" ? "I" : unit.text.toLocaleLowerCase("en-US");
      const expected = [...expectedAnchorByUnit[surface]];
      if (analysis.text === "I am." && unit.text === "am") expected.push("short-answer-i-am");
      const actual = unit.sourceRefs.map((ref) => ref.split("#").at(-1)).sort();
      assert.deepEqual(actual, expected.sort(), `${analysis.text}:${unit.text} must cite only claim-specific evidence`);
    }
  }
});

test("S01 localized I am fine paraphrase binds every RU/UK unit to exact evidence", () => {
  const response = readJson(SIDECAR)
    .interactions["en:lesson-01:session-01:i13"]
    .responses.find((entry) => entry.responseId === "en:lesson-01:session-01:i13:r3");
  const expectedByLocale = {
    ru: {
      "У": "localized-fine-preposition-u-ru-uk",
      "меня": "localized-fine-pronoun-menya-mene",
      "всё": "localized-fine-pronoun-vsyo-vse",
      "хорошо": "localized-fine-adverb-khorosho-dobre",
      ".": "punctuation-full-stop",
    },
    uk: {
      "У": "localized-fine-preposition-u-ru-uk",
      "мене": "localized-fine-pronoun-menya-mene",
      "все": "localized-fine-pronoun-vsyo-vse",
      "добре": "localized-fine-adverb-khorosho-dobre",
      ".": "punctuation-full-stop",
    },
  };
  for (const locale of ["ru", "uk"]) {
    const analysis = response.analysisByLocale[locale];
    for (const unit of analysis.units) {
      const anchors = unit.sourceRefs.map((ref) => ref.split("#").at(-1));
      assert.deepEqual(
        anchors,
        [expectedByLocale[locale][unit.text]],
        `${locale}:${unit.text} must cite only evidence for its own lexical and grammatical claim`,
      );
      if (unit.text !== ".") {
        assert.equal(anchors.includes("i-pronoun-ru-uk"), false);
        assert.equal(anchors.includes("fine-adjective-ru-uk"), false);
      }
    }
  }
});

test("S01 task 11 keeps the listening clue neutral and identifies the learner in feedback", () => {
  const atomic = readJson(ATOMIC);
  for (const locale of ["ru", "uk"]) {
    const interaction = atomic.interactionsByLocale[locale].find((entry) => entry.ordinal === 11);
    assert.equal(interaction.interactionId, "en:lesson-01:session-01:i13");
    assert.doesNotMatch(interaction.prompt, /фраз[ау]\s+М[иі]р/iu);
    assert.equal(interaction.modePayload.localizedScene[locale], locale === "ru"
      ? "Вы разговариваете с Мирой; выберите смысл услышанной реплики."
      : "Ви розмовляєте з Мірою; виберіть зміст почутої репліки.");
    const correct = interaction.modePayload.choiceFeedback.find((entry) => entry.correct);
    assert.match(correct.feedbackByLocale[locale], locale === "ru" ? /вы отвечаете/iu : /ви відповідаєте/iu);
  }
});

test("S01 task 11 keeps the listening clue neutral until the audio is heard", () => {
  const atomic = readJson(ATOMIC);
  const expected = {
    ru: {
      prompt: "Послушайте реплику и выберите её смысл",
      scene: "Вы разговариваете с Мирой; выберите смысл услышанной реплики.",
    },
    uk: {
      prompt: "Послухайте репліку та виберіть її зміст",
      scene: "Ви розмовляєте з Мірою; виберіть зміст почутої репліки.",
    },
  };
  for (const locale of ["ru", "uk"]) {
    const interaction = atomic.interactionsByLocale[locale].find((entry) => entry.interactionId === "en:lesson-01:session-01:i13");
    assert.equal(interaction.prompt, expected[locale].prompt);
    assert.equal(interaction.accessibilityLabel, expected[locale].prompt);
    assert.equal(interaction.modePayload.localizedScene[locale], expected[locale].scene);
    assert.doesNotMatch(
      `${interaction.prompt} ${interaction.modePayload.localizedScene[locale]}`,
      locale === "ru" ? /здесь|мест(?:о|е)|у входа/iu : /тут|місц(?:е|я)|біля входу/iu,
      `${locale}: the visible clue must not disclose the recorded meaning`,
    );
  }
});

test("S01 final matching check gives four mutually distinct and sufficient situations", () => {
  const atomic = readJson(ATOMIC);
  const expected = [
    {
      target: "I am here.",
      ru: "Вы уже у входа и сообщаете об этом Мире.",
      uk: "Ви вже біля входу й повідомляєте про це Мірі.",
    },
    { target: "I am ready.", ru: "Встречу можно начинать.", uk: "Зустріч можна починати." },
    { target: "I am fine.", ru: "Коллега спрашивает, как у вас дела.", uk: "Колега запитує, як ваші справи." },
    { target: "I am happy.", ru: "Вас радует хорошая новость.", uk: "Вас тішить добра новина." },
  ];
  for (const locale of ["ru", "uk"]) {
    const interaction = atomic.interactionsByLocale[locale].find((entry) => entry.interactionId === "en:lesson-01:session-01:i17:s01");
    assert.deepEqual(
      interaction.modePayload.pairGrid.map((pair) => ({ target: pair.target, ru: pair.meaningByLocale.ru, uk: pair.meaningByLocale.uk })),
      expected,
    );
    assert.deepEqual(interaction.modePayload.rightColumn, expected.map((pair) => pair[locale]));
  }
  const pairs = readJson(SIDECAR).interactions["en:lesson-01:session-01:i17:s01"].pairs;
  assert.equal(pairs.length, 4);
  for (const [index, pair] of pairs.entries()) {
    assert.deepEqual(pair.analysisV1.meaningByLocale, { ru: expected[index].ru, uk: expected[index].uk });
    assert.match(pair.analysisV1.matchExplanationByLocale.ru, new RegExp(expected[index].target.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.match(pair.analysisV1.matchExplanationByLocale.uk, new RegExp(expected[index].target.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});

test("S01 Ukrainian learner explanations contain no Russian уже", () => {
  const hits = [];
  const visit = (value, fieldPath = "") => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const nextPath = `${fieldPath}.${key}`;
      if (key === "uk" && typeof child === "string" && /(?:^|[^\p{L}])уже(?:$|[^\p{L}])/iu.test(child)) hits.push(`${nextPath}: ${child}`);
      visit(child, nextPath);
    }
  };
  visit(readJson(SIDECAR));
  assert.deepEqual(hits, []);
});

test("S01 cites claim-specific English and RU/UK evidence for every lexical unit", () => {
  const sidecar = readJson(SIDECAR);
  const translationAnchorByLemma = {
    I: "i-pronoun-ru-uk",
    be: "be-i-am-ru-uk",
    here: "here-adverb-ru-uk",
    ready: "ready-adjective-ru-uk",
    fine: "fine-adjective-ru-uk",
    happy: "happy-adjective-ru-uk",
  };
  for (const analysis of allS01Analyses(sidecar)) {
    for (const unit of analysis.units) {
      const anchor = translationAnchorByLemma[unit.lemma];
      if (!anchor) continue;
      assert.ok(
        unit.sourceRefs.some((ref) => ref.endsWith(`#${anchor}`)),
        `${analysis.text}:${unit.text} must cite bilingual evidence for ${unit.lemma}`,
      );
      assert.ok(unit.sourceRefs.length <= 2, `${analysis.text}:${unit.text} must retain a claim-specific evidence set`);
    }
  }
  for (const pair of sidecar.interactions["en:lesson-01:session-01:i08"].pairs) {
    const lexicalAnchor = pair.target === "here" ? "here-adverb-ru-uk" : `${pair.target}-adjective-ru-uk`;
    const anchors = pair.analysisV1.sourceRefs.map((ref) => ref.split("#").at(-1)).sort();
    assert.deepEqual(
      anchors,
      ["be-i-am-ru-uk", lexicalAnchor].sort(),
      `${pair.pairId} must cite only the I am frame and its own lexical claim`,
    );
  }
  for (const pair of sidecar.interactions["en:lesson-01:session-01:i17:s01"].pairs) {
    const targetLemma = pair.analysisV1.phrase.units.find((unit) => ["here", "ready", "fine", "happy"].includes(unit.lemma)).lemma;
    const lexicalAnchor = targetLemma === "here" ? "here-adverb-ru-uk" : `${targetLemma}-adjective-ru-uk`;
    const anchors = pair.analysisV1.sourceRefs.map((ref) => ref.split("#").at(-1)).sort();
    assert.deepEqual(
      anchors,
      ["be-i-am-ru-uk", "i-pronoun-ru-uk", lexicalAnchor, "punctuation-full-stop"].sort(),
      `${pair.pairId} must not carry unrelated lexical sources`,
    );
  }
});

test("S01 learner explanations use only admitted English constructions", () => {
  const sidecar = readJson(SIDECAR);
  const learnerText = [];
  const collect = (value) => {
    if (typeof value === "string") learnerText.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(sidecar.interactions);
  collect(sidecar.introResponses);
  const joined = learnerText.join("\n");
  for (const unexplained of ["Are you ready?", "Yes, I am", "The desk is ready"]) {
    assert.equal(joined.includes(unexplained), false, `unexplained construction remains: ${unexplained}`);
  }
});

test("S01 I am distractor is classified as contextually incomplete and every token note states that boundary", () => {
  const sidecar = readJson(SIDECAR);
  const response = sidecar.introResponses.find((entry) => entry.textByLocale.ru === "I am.");
  assert.equal(response.errorType, "meaning_incomplete");
  for (const locale of ["ru", "uk"]) {
    const analysis = response.analysisByLocale[locale];
    for (const unit of analysis.units) {
      assert.match(unit.functionByLocale.ru, /happy/u, `${locale}:${unit.text}: RU note must state the whole-answer boundary`);
      assert.match(unit.functionByLocale.uk, /happy/u, `${locale}:${unit.text}: UK note must state the whole-answer boundary`);
    }
    assert.match(analysis.units[0].functionByLocale.ru, /подлежащ/u);
    assert.match(analysis.units[0].functionByLocale.uk, /підмет/u);
    assert.match(analysis.units.at(-1).functionByLocale.ru, /предложен/u);
    assert.match(analysis.units.at(-1).functionByLocale.uk, /реченн/u);
  }
});
