import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const LOCALES = Object.freeze(["ru", "uk"]);
const PHRASE_FAMILIES = new Set(["phrase_builder", "listen_build_dictation"]);
const CHOICE_FAMILIES = new Set(["listen_choose", "context_gap_grammar"]);
const SPOKEN_FAMILIES = new Set(["scripted_repeat_compare"]);
const EXPLAINED_FAMILIES = new Set([...PHRASE_FAMILIES, ...CHOICE_FAMILIES, ...SPOKEN_FAMILIES, "speed_match"]);
const WRONG_REASON_FIELDS = Object.freeze([
  "whyTemptingByLocale", "whyWrongHereByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale",
]);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function localizedIssues(value, code, context) {
  const issues = exactKeysIssues(value, new Set(LOCALES), `${context}:${code}`);
  for (const locale of LOCALES) {
    if (!nonEmpty(value?.[locale])) issues.push(`${context}:${code}:${locale}`);
  }
  return issues;
}

function exactKeysIssues(value, allowed, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [`${context}:object_missing`];
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${context}:unknown_field:${key}`);
}

function sourceRefsIssues(value, context) {
  return Array.isArray(value) && value.length > 0 && value.every(nonEmpty)
    ? []
    : [`${context}:unit_source_missing`];
}

// JavaScript's `\b` is ASCII-oriented even with the Unicode flag, so it does
// not provide reliable boundaries for Cyrillic words. Use Unicode-letter
// lookarounds to keep the contamination gate deterministic for RU/UK text.
const RUSSIAN_ONLY = /(?<!\p{L})(?:отдельное|его|говорящего|прилагательное|местоимение|наречие|служит|называет|сообщает|после|завершает|здесь|всё|готов)(?!\p{L})/iu;
const UKRAINIAN_ONLY = /(?<!\p{L})(?:окреме|його|мовця|прикметник|займенник|прислівник|слугує|називає|повідомляє|після|завершує|тут|усе|готовий)(?!\p{L})/iu;
const GENERIC_PEDAGOGY = [
  /знакомо и подходит по форме, поэтому его легко выбрать автоматически/iu,
  /знайоме й підходить за формою, тому його легко вибрати автоматично/iu,
  /меняется ответ на конкретную ситуацию/iu,
  /змінюється відповідь на конкретну ситуацію/iu,
  /Такой вариант не является полной нейтральной фразой/iu,
  /Такий варіант не є повною нейтральною фразою/iu,
  /Само слово возможно в другой ситуации/iu,
  /Саме слово можливе в іншій ситуації/iu,
  /отдельное слово; его смысл и роль зависят/iu,
  /окреме слово; його зміст і роль залежать/iu,
];

function sourceReferenceResolutionIssues(value, sessionDir) {
  const issues = [];
  const courseRoot = path.resolve(sessionDir, "../../../..");
  const visit = (node, context) => {
    if (Array.isArray(node)) return node.forEach((entry, index) => visit(entry, `${context}:${index}`));
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.sourceRefs)) {
      for (const ref of node.sourceRefs) {
        const match = /^(judgements\/[^#]+\.md)#([a-z0-9-]+)$/u.exec(ref);
        if (!match) {
          issues.push(`${context}:source_reference_unresolved:${ref}`);
          continue;
        }
        const file = path.join(courseRoot, match[1]);
        if (!fs.existsSync(file) || !fs.readFileSync(file, "utf8").includes(`<a id="${match[2]}"></a>`)) {
          issues.push(`${context}:source_reference_unresolved:${ref}`);
        }
      }
    }
    for (const [key, entry] of Object.entries(node)) visit(entry, `${context}:${key}`);
  };
  visit(value, "practice_explanations");
  return issues;
}

function localeAndSpecificityIssues(value) {
  const issues = [];
  const visit = (node, context) => {
    if (Array.isArray(node)) return node.forEach((entry, index) => visit(entry, `${context}:${index}`));
    if (!node || typeof node !== "object") return;
    if (typeof node.ru === "string" && typeof node.uk === "string") {
      if (UKRAINIAN_ONLY.test(node.ru)) issues.push(`${context}:locale_contamination:ru`);
      if (RUSSIAN_ONLY.test(node.uk)) issues.push(`${context}:locale_contamination:uk`);
      for (const locale of LOCALES) {
        if (GENERIC_PEDAGOGY.some((pattern) => pattern.test(node[locale]))) {
          issues.push(`${context}:generic_pedagogy_text:${locale}`);
        }
      }
    }
    for (const [key, entry] of Object.entries(node)) visit(entry, `${context}:${key}`);
  };
  visit(value, "practice_explanations");
  return issues;
}

function unitIssues(unit, phraseText, index, context) {
  const unitContext = `${context}:unit:${index}`;
  const issues = exactKeysIssues(unit, new Set([
    "text", "start", "end", "lemma", "partOfSpeech", "partOfSpeechLabelByLocale",
    "meaningByLocale", "functionByLocale", "sourceRefs",
  ]), unitContext);
  if (!nonEmpty(unit?.text)) issues.push(`${unitContext}:unit_text_missing`);
  if (!Number.isInteger(unit?.start) || !Number.isInteger(unit?.end) || unit.start < 0 || unit.end <= unit.start) {
    issues.push(`${unitContext}:unit_offsets_invalid`);
  } else if (phraseText.slice(unit.start, unit.end) !== unit.text) {
    issues.push(`${unitContext}:unit_offsets_mismatch`);
  }
  if (!nonEmpty(unit?.lemma)) issues.push(`${unitContext}:unit_lemma_missing`);
  if (!nonEmpty(unit?.partOfSpeech)) issues.push(`${unitContext}:unit_part_of_speech_missing`);
  issues.push(...localizedIssues(unit?.partOfSpeechLabelByLocale, "unit_part_of_speech_label_missing", unitContext));
  issues.push(...localizedIssues(unit?.meaningByLocale, "unit_meaning_missing", unitContext));
  issues.push(...localizedIssues(unit?.functionByLocale, "unit_function_missing", unitContext));
  issues.push(...sourceRefsIssues(unit?.sourceRefs, unitContext));
  return issues;
}

function textAnalysisIssues(analysis, expectedText, context) {
  const issues = exactKeysIssues(analysis, new Set([
    "text", "meaningByLocale", "explanationByLocale", "units",
  ]), context);
  if (!nonEmpty(analysis?.text) || analysis.text !== expectedText) issues.push(`${context}:analysis_text_mismatch`);
  issues.push(...localizedIssues(analysis?.meaningByLocale, "analysis_meaning_missing", context));
  issues.push(...localizedIssues(analysis?.explanationByLocale, "analysis_explanation_missing", context));
  if (!Array.isArray(analysis?.units) || analysis.units.length === 0) {
    issues.push(`${context}:unit_analysis_missing`);
    return issues;
  }
  analysis.units.forEach((unit, index) => issues.push(...unitIssues(unit, expectedText, index, context)));
  for (let index = 1; index < analysis.units.length; index += 1) {
    if (analysis.units[index].start < analysis.units[index - 1].start) issues.push(`${context}:unit_order_invalid`);
    if (analysis.units[index].start < analysis.units[index - 1].end) issues.push(`${context}:unit_offsets_overlap`);
  }
  for (let index = 0; index < expectedText.length; index += 1) {
    if (/\s/u.test(expectedText[index])) continue;
    if (!analysis.units.some((unit) => Number.isInteger(unit.start) && Number.isInteger(unit.end) && unit.start <= index && index < unit.end)) {
      issues.push(`${context}:unit_analysis_gap:${index}`);
    }
  }
  const s01Phrase = /^I am ([A-Za-z]+)([.!?])$/u.exec(expectedText);
  if (s01Phrase) {
    const expectedUnits = ["I", "am", s01Phrase[1], s01Phrase[2]];
    const actualUnits = analysis.units.map((unit) => unit?.text);
    if (actualUnits.length !== expectedUnits.length || actualUnits.some((unit, index) => unit !== expectedUnits[index])) {
      issues.push(`${context}:s01_phrase_units_mismatch`);
    }
  }
  return issues;
}

function responseEntryIssues(entry, expected, context) {
  const issues = exactKeysIssues(entry, new Set([
    "responseId", "correct", "textByLocale", "analysisByLocale", "errorType", ...WRONG_REASON_FIELDS,
  ]), context);
  if (entry?.responseId !== expected.responseId) issues.push(`${context}:response_id_mismatch`);
  if (entry?.correct !== expected.correct) issues.push(`${context}:response_correctness_mismatch`);
  issues.push(...exactKeysIssues(entry?.textByLocale, new Set(LOCALES), `${context}:text_by_locale`));
  issues.push(...exactKeysIssues(entry?.analysisByLocale, new Set(LOCALES), `${context}:analysis_by_locale`));
  for (const locale of LOCALES) {
    if (!nonEmpty(entry?.textByLocale?.[locale]) || entry.textByLocale[locale] !== expected.textByLocale[locale]) {
      issues.push(`${context}:response_text_mismatch:${locale}`);
    }
    issues.push(...textAnalysisIssues(entry?.analysisByLocale?.[locale], expected.textByLocale[locale], `${context}:analysis:${locale}`));
  }
  if (!expected.correct) {
    if (!nonEmpty(entry?.errorType)) issues.push(`${context}:wrong_reason_missing:errorType`);
    for (const field of WRONG_REASON_FIELDS) {
      const fieldIssues = localizedIssues(entry?.[field], `wrong_reason_missing:${field}`, context);
      issues.push(...fieldIssues);
    }
  } else {
    if (Object.prototype.hasOwnProperty.call(entry ?? {}, "errorType")) issues.push(`${context}:correct_response_has_error_type`);
    for (const field of WRONG_REASON_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(entry ?? {}, field)) issues.push(`${context}:correct_response_has_wrong_reason:${field}`);
    }
  }
  return issues;
}

function phraseEntryIssues(entry, interaction, context) {
  const issues = exactKeysIssues(entry, new Set(["family", "completionFeedbackByLocale", "phrase", "responses"]), context);
  issues.push(...localizedIssues(entry?.completionFeedbackByLocale, "completion_feedback_missing", context));
  const phrase = entry?.phrase;
  const expectedText = interaction?.family === "phrase_builder"
    ? interaction?.modePayload?.targetPhrase
    : interaction?.modePayload?.hiddenTargetPhrase;
  issues.push(...textAnalysisIssues(phrase, expectedText, `${context}:phrase`));
  issues.push(...responseCoverageIssues(entry?.responses, expectedResponses(interaction), context));
  return issues;
}

function speedAnalysisIssues(analysis, pair, context) {
  const issues = exactKeysIssues(analysis, new Set([
    "lemma", "partOfSpeech", "partOfSpeechLabelByLocale", "meaningByLocale",
    "functionByLocale", "matchExplanationByLocale", "sourceRefs", "phrase",
  ]), context);
  if (!nonEmpty(analysis?.lemma)) issues.push(`${context}:unit_lemma_missing`);
  if (!nonEmpty(analysis?.partOfSpeech)) issues.push(`${context}:unit_part_of_speech_missing`);
  issues.push(...localizedIssues(analysis?.partOfSpeechLabelByLocale, "unit_part_of_speech_label_missing", context));
  issues.push(...localizedIssues(analysis?.meaningByLocale, "unit_meaning_missing", context));
  issues.push(...localizedIssues(analysis?.functionByLocale, "unit_function_missing", context));
  issues.push(...localizedIssues(analysis?.matchExplanationByLocale, "speed_pair_explanation_missing", context));
  issues.push(...sourceRefsIssues(analysis?.sourceRefs, context));
  for (const locale of LOCALES) {
    if (analysis?.meaningByLocale?.[locale] !== pair?.meaningByLocale?.[locale]) {
      issues.push(`${context}:speed_pair_meaning_mismatch:${locale}`);
    }
  }
  issues.push(...textAnalysisIssues(analysis?.phrase, pair?.target, `${context}:phrase`));
  return issues;
}

function expectedResponses(interaction, atomicSource = null) {
  const payload = interaction?.modePayload ?? {};
  let rows = [];
  if (interaction?.family === "listen_choose") rows = payload.localizedMeaningChoices ?? [];
  if (interaction?.family === "context_gap_grammar") rows = payload.gapOptions ?? [];
  if (PHRASE_FAMILIES.has(interaction?.family)) {
    const distractors = payload.authoredDistractorTokens ?? [];
    rows = (payload.slotFeedback ?? []).map((feedback, index) => ({
      responseId: feedback.responseId,
      text: distractors[index] ?? "",
    }));
  }
  const feedbackById = new Map((payload.choiceFeedback ?? []).map((feedback) => [feedback.responseId, feedback]));
  const soleChoiceCorrect = interaction?.family === "listen_choose" && rows.length === 1;
  return rows.map((row, index) => ({
    responseId: row.responseId,
    correct: feedbackById.get(row.responseId)?.correct ?? soleChoiceCorrect,
    textByLocale: Object.fromEntries(LOCALES.map((locale) => {
      const localizedInteraction = atomicSource?.interactionsByLocale?.[locale]?.find((candidate) =>
        candidate.interactionId === interaction.interactionId) ?? interaction;
      const localizedPayload = localizedInteraction.modePayload ?? {};
      const localizedRows = interaction.family === "listen_choose"
        ? localizedPayload.localizedMeaningChoices ?? []
        : interaction.family === "context_gap_grammar"
          ? localizedPayload.gapOptions ?? []
          : localizedPayload.authoredDistractorTokens ?? [];
      const localizedRow = localizedRows[index];
      return [locale, typeof localizedRow === "string" ? localizedRow : localizedRow?.text ?? localizedRow?.targetText ?? ""];
    })),
  }));
}

function responseCoverageIssues(authoredResponses, expected, context) {
  const issues = [];
  if (!Array.isArray(authoredResponses)) return [`${context}:response_analysis_missing`];
  if (new Set(authoredResponses.map((entry) => entry?.responseId)).size !== authoredResponses.length) {
    issues.push(`${context}:response_analysis_duplicate`);
  }
  const expectedById = new Map(expected.map((entry) => [entry.responseId, entry]));
  const authoredById = new Map(authoredResponses.map((entry) => [entry?.responseId, entry]));
  for (const expectedEntry of expected) {
    const authored = authoredById.get(expectedEntry.responseId);
    if (!authored) {
      issues.push(`${context}:response_analysis_missing:${expectedEntry.responseId}`);
      continue;
    }
    issues.push(...responseEntryIssues(authored, expectedEntry, `${context}:response:${expectedEntry.responseId}`));
  }
  for (const authored of authoredResponses) {
    if (!expectedById.has(authored?.responseId)) issues.push(`${context}:response_analysis_unknown:${authored?.responseId ?? "missing"}`);
  }
  return issues;
}

function choiceEntryIssues(entry, interaction, atomicSource, context) {
  const issues = exactKeysIssues(entry, new Set(["family", "responses"]), context);
  issues.push(...responseCoverageIssues(entry?.responses, expectedResponses(interaction, atomicSource), context));
  return issues;
}

function spokenEntryIssues(entry, interaction, context) {
  const issues = exactKeysIssues(entry, new Set(["family", "phrase"]), context);
  issues.push(...textAnalysisIssues(entry?.phrase, interaction?.modePayload?.targetPhrase, `${context}:phrase`));
  return issues;
}

function speedEntryIssues(entry, interaction, context) {
  const issues = exactKeysIssues(entry, new Set(["family", "pairs"]), context);
  const sourcePairs = interaction?.modePayload?.pairGrid ?? [];
  if (!Array.isArray(entry?.pairs)) return [...issues, `${context}:speed_pairs_missing`];
  if (new Set(entry.pairs.map((pair) => pair?.pairId)).size !== entry.pairs.length) {
    issues.push(`${context}:speed_pair_duplicate`);
  }
  const authoredById = new Map(entry.pairs.map((pair) => [pair?.pairId, pair]));
  for (const pair of sourcePairs) {
    const authored = authoredById.get(pair.pairId);
    const pairContext = `${context}:pair:${pair.pairId}`;
    if (!authored) {
      issues.push(`${pairContext}:speed_pair_analysis_missing`);
      continue;
    }
    issues.push(...exactKeysIssues(authored, new Set(["pairId", "target", "analysisV1"]), pairContext));
    if (authored.target !== pair.target) issues.push(`${pairContext}:speed_pair_target_mismatch`);
    issues.push(...speedAnalysisIssues(authored.analysisV1, pair, pairContext));
  }
  for (const authored of entry.pairs) {
    if (!sourcePairs.some((pair) => pair.pairId === authored?.pairId)) {
      issues.push(`${context}:speed_pair_unknown:${authored?.pairId ?? "missing"}`);
    }
  }
  return issues;
}

function uniqueExplainedInteractions(atomicSource) {
  const byId = new Map();
  for (const interactions of Object.values(atomicSource?.interactionsByLocale ?? {})) {
    for (const interaction of interactions ?? []) {
      if (!EXPLAINED_FAMILIES.has(interaction?.family)) continue;
      if (!byId.has(interaction.interactionId)) byId.set(interaction.interactionId, interaction);
    }
  }
  return byId;
}

function introOptionsFromMarkdown(sessionDir) {
  const byLocale = {};
  for (const locale of LOCALES) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const intro = markdown.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/mi).slice(1, 4);
    byLocale[locale] = intro.flatMap((block, pageIndex) => {
      const section = block.split(/^##\s+/m, 1)[0];
      return [...section.matchAll(/^-\s+([✅❌])\s*(?:\*\*)?(.+?)(?:\*\*)?\s+—\s+\*[^\n]+\*\s*$/gmu)].map((match, choiceIndex) => ({
        pageIndex,
        choiceIndex,
        text: match[2].trim().replace(/^\*\*|\*\*$/gu, ""),
        correct: match[1] === "✅",
      }));
    });
  }
  return byLocale;
}

function introResponseIssues(sidecar, sessionDir) {
  const byLocale = introOptionsFromMarkdown(sessionDir);
  const expected = (byLocale.ru ?? []).map((entry) => ({
    responseId: `${sidecar.courseSessionId}:intro${entry.pageIndex + 1}:r${entry.choiceIndex + 1}`,
    correct: entry.correct,
    textByLocale: Object.fromEntries(LOCALES.map((locale) => [locale, byLocale[locale]?.find((row) =>
      row.pageIndex === entry.pageIndex && row.choiceIndex === entry.choiceIndex)?.text ?? ""])),
  }));
  const issues = responseCoverageIssues(sidecar?.introResponses, expected, "practice_explanations:intro");
  return issues.map((value) => value.replace("response_analysis_missing", "intro_response_analysis_missing"));
}

export function validatePracticeExplanationsV1({ sidecar, atomicSource, sessionDir }) {
  const issues = exactKeysIssues(sidecar, new Set([
    "schemaVersion", "courseSessionId", "sourceBindings", "introResponses", "interactions",
  ]), "practice_explanations");
  if (sidecar?.schemaVersion !== "learning_v2_practice_explanations_v1") issues.push("practice_explanations:schema_invalid");
  if (sidecar?.courseSessionId !== atomicSource?.courseSessionId) issues.push("practice_explanations:course_session_mismatch");
  issues.push(...exactKeysIssues(sidecar?.sourceBindings, new Set(LOCALES), "practice_explanations:source_bindings"));

  for (const locale of LOCALES) {
    const binding = sidecar?.sourceBindings?.[locale];
    issues.push(...exactKeysIssues(binding, new Set(["path", "sha256"]), `practice_explanations:source_binding:${locale}`));
    const expectedPath = `final.${locale}.md`;
    if (binding?.path !== expectedPath) issues.push(`practice_explanations:source_path_mismatch:${locale}`);
    const sourcePath = path.join(sessionDir, expectedPath);
    if (!fs.existsSync(sourcePath) || binding?.sha256 !== sha256(sourcePath)) {
      issues.push(`practice_explanations:source_binding_mismatch:${locale}`);
    }
  }
  issues.push(...introResponseIssues(sidecar, sessionDir));

  const sourceInteractions = uniqueExplainedInteractions(atomicSource);
  const authoredInteractions = sidecar?.interactions && typeof sidecar.interactions === "object"
    ? sidecar.interactions
    : {};
  for (const [interactionId, interaction] of sourceInteractions) {
    const entry = authoredInteractions[interactionId];
    const context = `practice_explanations:${interactionId}`;
    if (!entry) {
      issues.push(`${context}:interaction_explanation_missing`);
      continue;
    }
    if (entry.family !== interaction.family) issues.push(`${context}:family_mismatch`);
    if (PHRASE_FAMILIES.has(interaction.family)) issues.push(...phraseEntryIssues(entry, interaction, context));
    if (CHOICE_FAMILIES.has(interaction.family)) issues.push(...choiceEntryIssues(entry, interaction, atomicSource, context));
    if (SPOKEN_FAMILIES.has(interaction.family)) issues.push(...spokenEntryIssues(entry, interaction, context));
    if (interaction.family === "speed_match") issues.push(...speedEntryIssues(entry, interaction, context));
  }
  for (const interactionId of Object.keys(authoredInteractions)) {
    if (!sourceInteractions.has(interactionId)) issues.push(`practice_explanations:${interactionId}:interaction_unknown`);
  }
  issues.push(...localeAndSpecificityIssues(sidecar));
  issues.push(...sourceReferenceResolutionIssues(sidecar, sessionDir));
  return Object.freeze(issues);
}

export function applyPracticeExplanationsV1({ atomicSource, sidecar }) {
  const projected = structuredClone(atomicSource);
  for (const [locale, interactions] of Object.entries(projected.interactionsByLocale ?? {})) {
    for (const interaction of interactions ?? []) {
      const authored = sidecar?.interactions?.[interaction.interactionId];
      if (!authored) continue;
      const projectResponse = (feedback) => {
        const response = authored.responses?.find((entry) => entry.responseId === feedback.responseId);
        if (!response) return feedback;
        return {
          ...feedback,
          analysisV1: structuredClone(response.analysisByLocale[locale]),
          ...(response.correct ? {} : {
            errorType: response.errorType,
            whyTemptingByLocale: structuredClone(response.whyTemptingByLocale),
            whyWrongHereByLocale: structuredClone(response.whyWrongHereByLocale),
            minimalContrastByLocale: structuredClone(response.minimalContrastByLocale),
            acceptabilityBoundaryByLocale: structuredClone(response.acceptabilityBoundaryByLocale),
          }),
        };
      };
      if (PHRASE_FAMILIES.has(interaction.family)) {
        interaction.modePayload.completionFeedbackByLocale = structuredClone(authored.completionFeedbackByLocale);
        interaction.modePayload.explanationV1 = structuredClone({
          completionFeedbackByLocale: authored.completionFeedbackByLocale,
          phrase: authored.phrase,
        });
        interaction.modePayload.slotFeedback = interaction.modePayload.slotFeedback.map(projectResponse);
      } else if (CHOICE_FAMILIES.has(interaction.family)) {
        const existingById = new Map((interaction.modePayload.choiceFeedback ?? []).map((entry) => [entry.responseId, entry]));
        interaction.modePayload.choiceFeedback = authored.responses.map((response) => projectResponse(existingById.get(response.responseId) ?? {
          responseId: response.responseId,
          correct: response.correct,
          feedbackByLocale: structuredClone(response.analysisByLocale[locale].explanationByLocale),
        }));
      } else if (SPOKEN_FAMILIES.has(interaction.family)) {
        interaction.modePayload.explanationV1 = structuredClone({ phrase: authored.phrase });
      } else if (interaction.family === "speed_match") {
        const authoredById = new Map(authored.pairs.map((pair) => [pair.pairId, pair]));
        interaction.modePayload.pairGrid = interaction.modePayload.pairGrid.map((pair) => ({
          ...pair,
          analysisV1: structuredClone(authoredById.get(pair.pairId).analysisV1),
        }));
      }
    }
  }
  return projected;
}

export function projectIntroResponseAnalysesV1(sidecar) {
  const result = {};
  for (const response of sidecar?.introResponses ?? []) {
    result[response.responseId] = structuredClone(response.analysisByLocale);
  }
  return result;
}

export function projectIntroResponseDiagnosticsV1(sidecar) {
  const result = {};
  for (const response of sidecar?.introResponses ?? []) {
    if (response.correct) continue;
    result[response.responseId] = structuredClone({
      errorType: response.errorType,
      whyTemptingByLocale: response.whyTemptingByLocale,
      whyWrongHereByLocale: response.whyWrongHereByLocale,
      minimalContrastByLocale: response.minimalContrastByLocale,
      acceptabilityBoundaryByLocale: response.acceptabilityBoundaryByLocale,
    });
  }
  return result;
}
