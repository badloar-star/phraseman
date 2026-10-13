#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RELEASE = path.resolve(HERE, "..", "release");
const CYRILLIC = /[\p{Script=Cyrillic}]/u;

const clone = (value) => JSON.parse(JSON.stringify(value));
const normalizeSpace = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();
const normalizeRequiredText = (value) => normalizeSpace(String(value ?? "").replace(/\p{Cf}/gu, ""));
const normalizeWords = (value) => normalizeSpace(value)
  .replace(/[.!?;,:[\](){}«»"“”'’]/gu, "")
  .toLocaleLowerCase("en-US")
  .split(/\s+/u)
  .filter(Boolean);

export function splitAssessedSentences(value) {
  const text = normalizeSpace(value);
  if (!text) return [];
  const matches = text.match(/[^.!?]+(?:[.!?]+(?:["'»”\])}]*)|$)/gu) ?? [];
  return matches.map(normalizeSpace).filter(Boolean);
}

function sentenceCount(value) {
  return splitAssessedSentences(value).length;
}

function hasClausePacketDelimiter(value) {
  return /[;；|]/u.test(normalizeSpace(value));
}

function hasCompactListPacket(value, { rejectTwoPartPacket = false } = {}) {
  const parts = String(value ?? "").split(/\s*(?:,|\/|·)\s*/u).map(normalizeSpace).filter(Boolean);
  const lexicalWord = /^\p{L}[\p{L}\p{M}'’\-]*$/u;
  if (!parts.every((part) => lexicalWord.test(part))) return false;
  return parts.length >= 3 || (rejectTwoPartPacket && parts.length === 2);
}

function hasCommaSeparatedIndependentClauses(value) {
  const parts = String(value ?? "").split(/\s*,\s*/u).map(normalizeSpace).filter(Boolean);
  if (parts.length < 2) return false;
  const tagQuestion = /^(?:right|okay|ok|isn['’]t (?:it|that)|aren['’]t (?:they|we|you)|don['’]t (?:you|they|we)|won['’]t (?:you|they|we))\?$/iu;
  const finiteVerb = /\b(?:am|are|is|was|were|be|been|being|do|does|did|have|has|had|can|could|will|would|shall|should|may|might|must|[a-z]+(?:s|ed))\b/iu;
  const pronounSubject = /^(?:this|that|these|those|it|i|you|we|they|he|she|there)\b/iu;
  const nounSubject = /^(?:(?:the|a|an|my|your|his|her|our|their)\s+)?\p{L}[\p{L}'’\-]*\s+/u;
  const imperative = /^(?:be|come|go|stop|start|open|close|sit|stand|look|listen|say|tell|give|take|put|keep|make|let|wait|help|show|find|turn|walk|run|smile|laugh|sleep|wake|dance|sing|read|write|choose|match|repeat|build)\b/iu;
  const independentClause = (part) => (
    (pronounSubject.test(part) || nounSubject.test(part)) && finiteVerb.test(part)
  ) || imperative.test(part);
  return parts.filter((part) => !tagQuestion.test(part)).filter(independentClause).length >= 2;
}

const LEARNER_HEARD_AUDIO_FIELDS = ["referenceAudio", "slowReferenceAudio", "audioA", "audioB"];
const KNOWN_INTERACTION_FAMILIES = new Set([
  "scripted_repeat_compare",
  "phrase_builder",
  "listen_build_dictation",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "sound_contrast",
]);
// The learner interaction is a closed JSON contract. New top-level fields may
// be rendered by an app before this guard has learned how to inspect them, so
// they must hold the source rather than silently bypass the one-phrase audit.
export const KNOWN_INTERACTION_TOP_LEVEL_FIELDS = new Set([
  "interactionId",
  "ordinal",
  "purpose",
  "family",
  "inputMode",
  "prompt",
  "responseOptions",
  "mediaIds",
  "audioTargetIds",
  "accessibilityLabel",
  "modePayload",
  "scriptedAlternate",
]);
const STRUCTURAL_OR_EXPLANATORY_PAYLOAD_FIELDS = new Set([
  "family", "localizedScene", "testedDimension", "choiceFeedback", "definitionByLocale",
  "localizedMeaning", "slotFeedback", "testedPhoneticContrast",
  "recordControlPolicy", "modelPlayback", "learnerPlayback", "honestOutcomeStates",
  "transcriptRevealPolicy", "isWordCard", "pairingKey", "timerPolicy", "finishStats",
  "ipaA", "ipaB", "audioTargetId", "audioTargetIds", "wordCard", "explanationV1",
]);

function learnerHeardAudioCandidates(payload) {
  return LEARNER_HEARD_AUDIO_FIELDS.map((field) => [
    `${field}.transcript`,
    payload?.[field]?.transcript,
  ]);
}

function indexedStringCandidates(payload, field) {
  return (payload?.[field] ?? []).map((value, index) => [`${field}[${index}]`, value]);
}

function pairGridCandidates(payload) {
  return (payload?.pairGrid ?? []).flatMap((item, index) => [
    [`pairGrid[${index}].target`, item.target],
    ...Object.entries(item.meaningByLocale ?? {}).map(([locale, value]) => [`pairGrid[${index}].meaningByLocale.${locale}`, value]),
  ]);
}

function pairGridColumnIssues(interaction, source) {
  if (interaction?.family !== "speed_match") return [];
  const payload = interaction?.modePayload ?? {};
  const pairs = payload.pairGrid ?? [];
  const expected = { leftColumn: [pairs.map((item) => normalizeSpace(item?.target))] };
  // Legacy sources use either the RU structural projection or the active locale
  // projection. Both remain safe only when they exactly mirror pairGrid.
  expected.rightColumn = ["ru", "uk"].map((locale) => pairs.map((item) => normalizeSpace(item?.meaningByLocale?.[locale] ?? item?.target)));
  return Object.entries(expected).flatMap(([field, variants]) => {
    if (payload[field] == null) return [];
    const actual = (payload[field] ?? []).map(normalizeSpace);
    return variants.some((values) => JSON.stringify(actual) === JSON.stringify(values)) ? [] : [{
      source,
      interactionId: interaction.interactionId,
      family: interaction.family,
      field,
      reason: "pair_grid_column_mismatch",
    }];
  });
}

function isPlainJsonObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function unknownPayloadValueIssues({ value, rootPath, interaction, source, reason = "unknown_learner_facing_payload" }) {
  const issues = [];
  const visited = new WeakSet();
  const reportedPaths = new Set();
  const addIssue = (field) => {
    if (reportedPaths.has(field)) return;
    reportedPaths.add(field);
    issues.push({
      source,
      interactionId: interaction.interactionId,
      family: interaction.family,
      field,
      reason,
    });
  };
  const walk = (node, currentPath, depth = 0) => {
    if (typeof node !== "object" || node === null) {
      // Unknown scalar data has no reviewed schema, including a string that a
      // renderer could expose to the learner.
      addIssue(currentPath);
      return;
    }
    // An unclassified object or array is itself a hold, even if every nested
    // value happens to look harmless today.
    addIssue(currentPath);
    if (depth >= 64 || visited.has(node)) return;
    visited.add(node);
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${currentPath}[${index}]`, depth + 1));
      return;
    }
    if (!isPlainJsonObject(node)) return;
    for (const key of Object.keys(node)) {
      const descriptor = Object.getOwnPropertyDescriptor(node, key);
      if (!descriptor || !("value" in descriptor)) {
        addIssue(`${currentPath}.${key}`);
        continue;
      }
      walk(descriptor.value, `${currentPath}.${key}`, depth + 1);
    }
  };
  walk(value, rootPath);
  return issues;
}

function unknownInteractionTopLevelIssues(interaction, source) {
  return Object.entries(interaction ?? {}).flatMap(([key, value]) => {
    if (KNOWN_INTERACTION_TOP_LEVEL_FIELDS.has(key)) return [];
    return unknownPayloadValueIssues({
      value,
      rootPath: `interaction.${key}`,
      interaction,
      source,
      reason: "unknown_interaction_top_level_field",
    });
  });
}

function closedObjectIssues({ value, rootPath, allowedKeys, interaction, source }) {
  if (value == null) return [];
  if (!isPlainJsonObject(value)) return unknownPayloadValueIssues({
    value,
    rootPath,
    interaction,
    source,
    reason: "unknown_nested_learner_schema",
  });
  return Object.entries(value).flatMap(([key, nested]) => {
    if (allowedKeys.has(key)) return [];
    return unknownPayloadValueIssues({
      value: nested,
      rootPath: `${rootPath}.${key}`,
      interaction,
      source,
      reason: "unknown_nested_learner_schema",
    });
  });
}

function closedArrayObjectIssues({ value, rootPath, allowedKeys, interaction, source }) {
  if (value == null) return [];
  if (!Array.isArray(value)) return unknownPayloadValueIssues({
    value,
    rootPath,
    interaction,
    source,
    reason: "unknown_nested_learner_schema",
  });
  return value.flatMap((entry, index) => closedObjectIssues({
    value: entry,
    rootPath: `${rootPath}[${index}]`,
    allowedKeys,
    interaction,
    source,
  }));
}

function localeMapIssues({ value, rootPath, interaction, source }) {
  if (value == null) return [];
  if (!isPlainJsonObject(value)) return unknownPayloadValueIssues({
    value,
    rootPath,
    interaction,
    source,
    reason: "unknown_nested_learner_schema",
  });
  return Object.entries(value).flatMap(([locale, localized]) => {
    if (/^[a-z]{2,3}(?:-[a-z0-9]+)*$/iu.test(locale) && (typeof localized === "string" || localized == null)) return [];
    return unknownPayloadValueIssues({
      value: localized,
      rootPath: `${rootPath}.${locale}`,
      interaction,
      source,
      reason: "unknown_nested_learner_schema",
    });
  });
}

function knownNestedSchemaIssues(interaction, source) {
  const payload = interaction?.modePayload ?? {};
  const issues = [];
  const invalid = (field) => issues.push({
    source,
    interactionId: interaction.interactionId,
    family: interaction.family,
    field,
    reason: "invalid_nested_learner_schema",
  });
  const requireString = (value, field) => {
    if (value != null && typeof value !== "string") invalid(field);
  };
  const requireBoolean = (value, field) => {
    if (value != null && typeof value !== "boolean") invalid(field);
  };
  const requireInteger = (value, field) => {
    if (value != null && !Number.isInteger(value)) invalid(field);
  };
  const requireStringArray = (value, field) => {
    if (value == null) return;
    if (!Array.isArray(value)) { invalid(field); return; }
    value.forEach((item, index) => {
      if (typeof item !== "string") invalid(`${field}[${index}]`);
    });
  };
  const audioKeys = new Set(["audioTargetId", "transcript"]);
  const responseKeys = new Set(["responseId", "text"]);
  const wordCardKeys = new Set(["word", "definitionByLocale"]);
  const meaningKeys = new Set(["responseId", "targetText", "meaningByLocale"]);
  const pairKeys = new Set(["pairId", "target", "meaningByLocale", "analysisV1"]);
  const gapKeys = new Set(["responseId", "text"]);
  const feedbackKeys = new Set([
    "responseId", "correct", "testedDimension", "feedbackByLocale", "analysisV1", "errorType",
    "whyTemptingByLocale", "whyWrongHereByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale",
  ]);
  const timerKeys = new Set(["enabledByDefault", "learnerCanDisable", "pausesOnInterruption"]);
  const textAnalysisKeys = new Set(["text", "meaningByLocale", "explanationByLocale", "units"]);
  const textUnitKeys = new Set([
    "text", "start", "end", "lemma", "partOfSpeech", "partOfSpeechLabelByLocale",
    "meaningByLocale", "functionByLocale", "sourceRefs",
  ]);
  const speedAnalysisKeys = new Set([
    "lemma", "partOfSpeech", "partOfSpeechLabelByLocale", "meaningByLocale", "functionByLocale",
    "matchExplanationByLocale", "sourceRefs", "phrase",
  ]);
  const textAnalysisIssues = (value, rootPath) => {
    const nestedIssues = closedObjectIssues({ value, rootPath, allowedKeys: textAnalysisKeys, interaction, source });
    if (!isPlainJsonObject(value)) return nestedIssues;
    requireString(value.text, `${rootPath}.text`);
    for (const field of ["meaningByLocale", "explanationByLocale"]) nestedIssues.push(...localeMapIssues({
      value: value[field], rootPath: `${rootPath}.${field}`, interaction, source,
    }));
    nestedIssues.push(...closedArrayObjectIssues({
      value: value.units, rootPath: `${rootPath}.units`, allowedKeys: textUnitKeys, interaction, source,
    }));
    for (const [index, unit] of (value.units ?? []).entries()) if (isPlainJsonObject(unit)) {
      const unitPath = `${rootPath}.units[${index}]`;
      for (const field of ["text", "lemma", "partOfSpeech"]) requireString(unit[field], `${unitPath}.${field}`);
      requireInteger(unit.start, `${unitPath}.start`);
      requireInteger(unit.end, `${unitPath}.end`);
      requireStringArray(unit.sourceRefs, `${unitPath}.sourceRefs`);
      for (const field of ["partOfSpeechLabelByLocale", "meaningByLocale", "functionByLocale"]) nestedIssues.push(...localeMapIssues({
        value: unit[field], rootPath: `${unitPath}.${field}`, interaction, source,
      }));
    }
    return nestedIssues;
  };
  const speedAnalysisIssues = (value, rootPath) => {
    const nestedIssues = closedObjectIssues({ value, rootPath, allowedKeys: speedAnalysisKeys, interaction, source });
    if (!isPlainJsonObject(value)) return nestedIssues;
    for (const field of ["lemma", "partOfSpeech"]) requireString(value[field], `${rootPath}.${field}`);
    requireStringArray(value.sourceRefs, `${rootPath}.sourceRefs`);
    for (const field of ["partOfSpeechLabelByLocale", "meaningByLocale", "functionByLocale", "matchExplanationByLocale"]) nestedIssues.push(...localeMapIssues({
      value: value[field], rootPath: `${rootPath}.${field}`, interaction, source,
    }));
    if (value.phrase != null) nestedIssues.push(...textAnalysisIssues(value.phrase, `${rootPath}.phrase`));
    return nestedIssues;
  };

  issues.push(...closedArrayObjectIssues({
    value: interaction?.responseOptions,
    rootPath: "interaction.responseOptions",
    allowedKeys: responseKeys,
    interaction,
    source,
  }));
  for (const [index, item] of (interaction?.responseOptions ?? []).entries()) if (isPlainJsonObject(item)) {
    requireString(item.responseId, `interaction.responseOptions[${index}].responseId`);
    requireString(item.text, `interaction.responseOptions[${index}].text`);
  }
  for (const field of LEARNER_HEARD_AUDIO_FIELDS) issues.push(...closedObjectIssues({
    value: payload[field],
    rootPath: `modePayload.${field}`,
    allowedKeys: audioKeys,
    interaction,
    source,
  }));
  for (const field of LEARNER_HEARD_AUDIO_FIELDS) if (isPlainJsonObject(payload[field])) {
    requireString(payload[field].audioTargetId, `modePayload.${field}.audioTargetId`);
    requireString(payload[field].transcript, `modePayload.${field}.transcript`);
  }
  issues.push(...closedObjectIssues({ value: payload.wordCard, rootPath: "modePayload.wordCard", allowedKeys: wordCardKeys, interaction, source }));
  if (isPlainJsonObject(payload.wordCard)) {
    requireString(payload.wordCard.word, "modePayload.wordCard.word");
    issues.push(...localeMapIssues({
      value: payload.wordCard.definitionByLocale,
      rootPath: "modePayload.wordCard.definitionByLocale",
      interaction,
      source,
    }));
  }
  issues.push(...closedArrayObjectIssues({ value: payload.localizedMeaningChoices, rootPath: "modePayload.localizedMeaningChoices", allowedKeys: meaningKeys, interaction, source }));
  for (const [index, item] of (payload.localizedMeaningChoices ?? []).entries()) if (isPlainJsonObject(item)) {
    requireString(item.responseId, `modePayload.localizedMeaningChoices[${index}].responseId`);
    requireString(item.targetText, `modePayload.localizedMeaningChoices[${index}].targetText`);
    issues.push(...localeMapIssues({
      value: item.meaningByLocale,
      rootPath: `modePayload.localizedMeaningChoices[${index}].meaningByLocale`,
      interaction,
      source,
    }));
  }
  issues.push(...closedArrayObjectIssues({ value: payload.pairGrid, rootPath: "modePayload.pairGrid", allowedKeys: pairKeys, interaction, source }));
  for (const [index, item] of (payload.pairGrid ?? []).entries()) if (isPlainJsonObject(item)) {
    requireString(item.pairId, `modePayload.pairGrid[${index}].pairId`);
    requireString(item.target, `modePayload.pairGrid[${index}].target`);
    issues.push(...localeMapIssues({
      value: item.meaningByLocale,
      rootPath: `modePayload.pairGrid[${index}].meaningByLocale`,
      interaction,
      source,
    }));
    if (item.analysisV1 != null) issues.push(...speedAnalysisIssues(item.analysisV1, `modePayload.pairGrid[${index}].analysisV1`));
  }
  issues.push(...closedArrayObjectIssues({ value: payload.gapOptions, rootPath: "modePayload.gapOptions", allowedKeys: gapKeys, interaction, source }));
  for (const [index, item] of (payload.gapOptions ?? []).entries()) if (isPlainJsonObject(item)) {
    requireString(item.responseId, `modePayload.gapOptions[${index}].responseId`);
    requireString(item.text, `modePayload.gapOptions[${index}].text`);
  }
  for (const field of ["choiceFeedback", "slotFeedback"]) {
    issues.push(...closedArrayObjectIssues({ value: payload[field], rootPath: `modePayload.${field}`, allowedKeys: feedbackKeys, interaction, source }));
    for (const [index, item] of (payload[field] ?? []).entries()) if (isPlainJsonObject(item)) {
      requireString(item.responseId, `modePayload.${field}[${index}].responseId`);
      requireBoolean(item.correct, `modePayload.${field}[${index}].correct`);
      requireString(item.testedDimension, `modePayload.${field}[${index}].testedDimension`);
      issues.push(...localeMapIssues({
        value: item.feedbackByLocale,
        rootPath: `modePayload.${field}[${index}].feedbackByLocale`,
        interaction,
        source,
      }));
      if (item.analysisV1 != null) issues.push(...textAnalysisIssues(item.analysisV1, `modePayload.${field}[${index}].analysisV1`));
      requireString(item.errorType, `modePayload.${field}[${index}].errorType`);
      for (const reasonField of ["whyTemptingByLocale", "whyWrongHereByLocale", "minimalContrastByLocale", "acceptabilityBoundaryByLocale"]) {
        issues.push(...localeMapIssues({
          value: item[reasonField], rootPath: `modePayload.${field}[${index}].${reasonField}`, interaction, source,
        }));
      }
    }
  }
  if (payload.explanationV1 != null) {
    const explanationKeys = new Set(["completionFeedbackByLocale", "phrase"]);
    issues.push(...closedObjectIssues({
      value: payload.explanationV1, rootPath: "modePayload.explanationV1", allowedKeys: explanationKeys, interaction, source,
    }));
    if (isPlainJsonObject(payload.explanationV1)) {
      issues.push(...localeMapIssues({
        value: payload.explanationV1.completionFeedbackByLocale,
        rootPath: "modePayload.explanationV1.completionFeedbackByLocale",
        interaction,
        source,
      }));
      if (payload.explanationV1.phrase != null) issues.push(...textAnalysisIssues(payload.explanationV1.phrase, "modePayload.explanationV1.phrase"));
    }
  }
  issues.push(...closedObjectIssues({ value: payload.timerPolicy, rootPath: "modePayload.timerPolicy", allowedKeys: timerKeys, interaction, source }));
  if (isPlainJsonObject(payload.timerPolicy)) for (const key of timerKeys) requireBoolean(payload.timerPolicy[key], `modePayload.timerPolicy.${key}`);
  for (const field of ["localizedScene", "localizedMeaning", "completionFeedbackByLocale"]) issues.push(...localeMapIssues({
    value: payload[field],
    rootPath: `modePayload.${field}`,
    interaction,
    source,
  }));
  for (const field of ["targetPhrase", "hiddenTargetPhrase", "gappedTargetPhrase", "contrastA", "contrastB"]) {
    requireString(payload[field], `modePayload.${field}`);
  }
  for (const field of ["orderedTokens", "authoredDistractorTokens", "distractorTokens", "tiles", "leftColumn", "rightColumn", "finishStats", "honestOutcomeStates", "audioTargetIds"]) {
    requireStringArray(payload[field], `modePayload.${field}`);
  }
  requireBoolean(payload.isWordCard, "modePayload.isWordCard");
  return issues;
}

function unknownLearnerFacingPayloadIssues(interaction, source) {
  const payload = interaction?.modePayload ?? {};
  const knownByFamily = {
    scripted_repeat_compare: new Set(["targetPhrase", ...LEARNER_HEARD_AUDIO_FIELDS]),
    phrase_builder: new Set(["targetPhrase", "orderedTokens", "authoredDistractorTokens", "distractorTokens", "tiles", "completionFeedbackByLocale", ...LEARNER_HEARD_AUDIO_FIELDS]),
    listen_build_dictation: new Set(["hiddenTargetPhrase", "orderedTokens", "authoredDistractorTokens", "distractorTokens", "tiles", "completionFeedbackByLocale", ...LEARNER_HEARD_AUDIO_FIELDS]),
    context_gap_grammar: new Set(["gappedTargetPhrase", "gapOptions", ...LEARNER_HEARD_AUDIO_FIELDS]),
    listen_choose: new Set(["localizedMeaningChoices", "wordCard", ...LEARNER_HEARD_AUDIO_FIELDS]),
    speed_match: new Set(["pairGrid", "leftColumn", "rightColumn"]),
    sound_contrast: new Set(["contrastA", "contrastB", "audioA", "audioB", ...LEARNER_HEARD_AUDIO_FIELDS]),
  };
  const known = knownByFamily[interaction?.family] ?? new Set();
  return Object.entries(payload).flatMap(([key, value]) => {
    if (known.has(key) || STRUCTURAL_OR_EXPLANATORY_PAYLOAD_FIELDS.has(key)) return [];
    return unknownPayloadValueIssues({
      value,
      rootPath: `modePayload.${key}`,
      interaction,
      source,
    });
  });
}

function visibleChoicePacket(interaction, field, raw) {
  if (!field.startsWith("responseOptions[") && !field.includes(".meaningByLocale.")) return false;
  const source = String(raw ?? "");
  const text = normalizeSpace(source);
  if (!text) return false;
  if (hasClausePacketDelimiter(source)) return false;
  if (/\r|\n/u.test(source) || /(?:^|\n)\s*(?:[-*•]|\d+[.)])\s+/u.test(source)) return true;
  if ((source.match(/—/gu) ?? []).length >= 2) return true;
  if (hasCompactListPacket(source)) return true;
  if (!field.startsWith("responseOptions[") || interaction?.family !== "listen_choose") return false;
  const transcript = normalizeSpace(interaction?.modePayload?.referenceAudio?.transcript);
  const lexicalAudio = /^\p{L}[\p{L}\p{M}'’\-]*$/u.test(transcript);
  const targetTokens = text.match(/\p{L}[\p{L}\p{M}'’\-]*/gu) ?? [];
  const targetOnly = text.replace(/[\p{L}\p{M}'’\-\s]/gu, "").length === 0;
  return lexicalAudio && targetOnly && targetTokens.length >= 3;
}

function assessedCandidates(interaction) {
  const payload = interaction?.modePayload ?? {};
  const visibleChoices = (interaction?.responseOptions ?? [])
    .map((item, index) => [`responseOptions[${index}]`, item.text]);
  const commonLearnerPayload = [...learnerHeardAudioCandidates(payload), ["wordCard.word", payload.wordCard?.word]];
  if (interaction?.family === "scripted_repeat_compare") return [
    ...visibleChoices,
    ["targetPhrase", payload.targetPhrase],
    ...commonLearnerPayload,
  ];
  if (interaction?.family === "phrase_builder") return [
    ...visibleChoices, ["targetPhrase", payload.targetPhrase], ...indexedStringCandidates(payload, "orderedTokens"),
    ...indexedStringCandidates(payload, "authoredDistractorTokens"), ...indexedStringCandidates(payload, "distractorTokens"),
    ...indexedStringCandidates(payload, "tiles"), ...commonLearnerPayload,
  ];
  if (interaction?.family === "listen_build_dictation") return [
    ...visibleChoices,
    ["hiddenTargetPhrase", payload.hiddenTargetPhrase],
    ...indexedStringCandidates(payload, "orderedTokens"), ...indexedStringCandidates(payload, "authoredDistractorTokens"),
    ...indexedStringCandidates(payload, "distractorTokens"), ...indexedStringCandidates(payload, "tiles"), ...commonLearnerPayload,
  ];
  if (interaction?.family === "context_gap_grammar") return [
    ...visibleChoices, ["gappedTargetPhrase", payload.gappedTargetPhrase],
    ...(payload.gapOptions ?? []).map((item, index) => [`gapOptions[${index}].text`, item.text]),
    ...commonLearnerPayload,
  ];
  if (interaction?.family === "listen_choose") return [
    ...visibleChoices,
    ...commonLearnerPayload,
    ...(!payload.isWordCard ? (payload.localizedMeaningChoices ?? []).flatMap((item, index) => [
      [`localizedMeaningChoices[${index}].targetText`, item.targetText],
      ...Object.entries(item.meaningByLocale ?? {}).map(([locale, value]) => [`localizedMeaningChoices[${index}].meaningByLocale.${locale}`, value]),
    ]) : []),
  ];
  if (interaction?.family === "speed_match") return [
    ...visibleChoices,
    ...pairGridCandidates(payload),
  ];
  if (interaction?.family === "sound_contrast") return [
    ...visibleChoices,
    ["contrastA", payload.contrastA], ["contrastB", payload.contrastB],
    ...commonLearnerPayload,
  ];
  return visibleChoices;
}

function isEnglishAssessedTargetField(field) {
  return new Set([
    "targetPhrase",
    "hiddenTargetPhrase",
    "gappedTargetPhrase",
    "wordCard.word",
    "contrastA",
    "contrastB",
    ...LEARNER_HEARD_AUDIO_FIELDS.map((name) => `${name}.transcript`),
  ]).has(field)
    || /^(?:orderedTokens|authoredDistractorTokens|distractorTokens|tiles)\[\d+\]$/u.test(field)
    || /^pairGrid\[\d+\]\.target$/u.test(field);
}

function isLocalizedZeroArticleControl(field, text) {
  return field.startsWith("responseOptions[") && /^(?:ничего|нічого|nothing)$/iu.test(text);
}

export function singlePhraseReleaseIssues(interactions, source = "") {
  const issues = [];
  const inputModeByFamily = {
    phrase_builder: "ordered_tokens",
    listen_choose: "single_choice",
    sound_contrast: "single_choice",
    listen_build_dictation: "ordered_tokens",
    context_gap_grammar: "single_choice",
    speed_match: "pair_grid",
    scripted_repeat_compare: "tap_record_compare",
  };
  for (const interaction of interactions ?? []) {
    if (!KNOWN_INTERACTION_FAMILIES.has(interaction?.family)) {
      issues.push({
        source,
        interactionId: interaction?.interactionId,
        family: interaction?.family,
        reason: "unknown_family",
      });
    }
    issues.push(...unknownInteractionTopLevelIssues(interaction, source));
    const expectedInputMode = inputModeByFamily[interaction?.family];
    if (expectedInputMode && interaction?.inputMode !== expectedInputMode) issues.push({
      source,
      interactionId: interaction.interactionId,
      family: interaction.family,
      inputMode: interaction.inputMode,
      expectedInputMode,
      reason: "input_mode_family_mismatch",
    });
    issues.push(...pairGridColumnIssues(interaction, source));
    issues.push(...unknownLearnerFacingPayloadIssues(interaction, source));
    issues.push(...knownNestedSchemaIssues(interaction, source));
    const payload = interaction?.modePayload ?? {};
    if (interaction?.family === "listen_choose"
      && payload.isWordCard !== true
      && !normalizeRequiredText(payload.referenceAudio?.transcript)) {
      issues.push({
        source,
        interactionId: interaction.interactionId,
        family: interaction.family,
        field: "referenceAudio.transcript",
        reason: "listen_choice_audio_transcript_missing",
      });
    }
    const seen = new Set();
    for (const [field, raw] of assessedCandidates(interaction)) {
      const text = normalizeSpace(raw);
      if (!text) continue;
      if (isLocalizedZeroArticleControl(field, text)) {
        issues.push({
          source,
          interactionId: interaction.interactionId,
          family: interaction.family,
          field,
          reason: "localized_zero_article_control",
          text,
        });
        continue;
      }
      if (String(interaction?.interactionId ?? "").startsWith("en:") && isEnglishAssessedTargetField(field) && CYRILLIC.test(text)) {
        issues.push({
          source,
          interactionId: interaction.interactionId,
          family: interaction.family,
          field,
          reason: "english_target_contains_cyrillic",
          text,
        });
        continue;
      }
      if (seen.has(text)) continue;
      seen.add(text);
      const compactSpeedMatchTarget = interaction?.family === "speed_match"
        && /^pairGrid\[\d+\]\.target$/u.test(field)
        && hasCompactListPacket(raw, { rejectTwoPartPacket: true });
      const commaClausePacket = String(interaction?.interactionId ?? "").startsWith("en:")
        && isEnglishAssessedTargetField(field)
        && hasCommaSeparatedIndependentClauses(raw);
      if (compactSpeedMatchTarget || commaClausePacket || visibleChoicePacket(interaction, field, raw)) {
        issues.push({
          source,
          interactionId: interaction.interactionId,
          family: interaction.family,
          field,
          sentenceCount: sentenceCount(text),
          reason: commaClausePacket ? "comma_clause_packet" : "visible_choice_packet",
          text,
        });
        continue;
      }
      const count = sentenceCount(text);
      if (count > 1) issues.push({
        source,
        interactionId: interaction.interactionId,
        family: interaction.family,
        field,
        sentenceCount: count,
        text,
      });
      else if (hasClausePacketDelimiter(text)) issues.push({
        source,
        interactionId: interaction.interactionId,
        family: interaction.family,
        field,
        sentenceCount: 1,
        reason: "delimiter_clause_packet",
        text,
      });
    }
  }
  return issues;
}

export function singlePhraseIntroIssues(intro, source = "") {
  const issues = [];
  for (const page of intro?.pages ?? []) {
    for (const [locale, choices] of Object.entries(page?.question?.choicesByLocale ?? {})) {
      for (const choice of choices ?? []) {
        const text = normalizeSpace(choice?.text);
        if (!text) continue;
        if (visibleChoicePacket(null, "responseOptions[intro]", choice?.text)) {
          issues.push({
            source,
            pageId: page.pageId,
            locale,
            responseId: choice.responseId,
            field: "question.choicesByLocale",
            sentenceCount: sentenceCount(text),
            reason: "visible_choice_packet",
            text,
          });
          continue;
        }
        const count = sentenceCount(text);
        if (count > 1) issues.push({
          source,
          pageId: page.pageId,
          locale,
          responseId: choice.responseId,
          field: "question.choicesByLocale",
          sentenceCount: count,
          reason: "multi_sentence",
          text,
        });
        else if (hasClausePacketDelimiter(text)) issues.push({
          source,
          pageId: page.pageId,
          locale,
          responseId: choice.responseId,
          field: "question.choicesByLocale",
          sentenceCount: 1,
          reason: "delimiter_clause_packet",
          text,
        });
      }
    }
  }
  return issues;
}

export function assertSinglePhraseIntro(intro, source = "") {
  const issues = singlePhraseIntroIssues(intro, source);
  if (!issues.length) return;
  const first = issues[0];
  throw new Error(`single_phrase_intro_hold:${first.pageId}:${first.locale}:${first.responseId}:${first.reason}:${issues.length}`);
}

export function compositeGapReleaseIssues(interactions, source = "") {
  const issues = [];
  for (const interaction of interactions ?? []) {
    if (interaction?.family !== "context_gap_grammar") continue;
    const text = normalizeSpace(interaction.modePayload?.gappedTargetPhrase);
    const blankCount = (text.match(/___/gu) ?? []).length;
    const blankRunCount = (text.match(/___(?:\s+___)*/gu) ?? []).length;
    const compositeOptions = (interaction.responseOptions ?? [])
      .filter((option) => /[;·]/u.test(normalizeSpace(option.text)))
      .map((option) => ({ responseId: option.responseId, text: normalizeSpace(option.text) }));
    if (blankCount !== 1 || blankRunCount !== 1 || compositeOptions.length) {
      issues.push({
        source,
        interactionId: interaction.interactionId,
        family: interaction.family,
        blankCount,
        blankRunCount,
        compositeOptions,
        text,
      });
    }
  }
  return issues;
}

export function dictationAudioTargetIssues(interactions, source = "") {
  const issues = [];
  for (const interaction of interactions ?? []) {
    if (interaction?.family !== "listen_build_dictation") continue;
    const target = normalizeSpace(interaction.modePayload?.hiddenTargetPhrase);
    const transcript = normalizeSpace(interaction.modePayload?.referenceAudio?.transcript);
    if (!target || !transcript || target !== transcript) issues.push({
      source,
      interactionId: interaction.interactionId,
      target,
      transcript,
      reason: !target ? "target_missing" : !transcript ? "audio_transcript_missing" : "dictation_audio_target_mismatch",
    });
  }
  return issues;
}

export function assertSinglePhraseSource(interactions, source = "") {
  const issues = singlePhraseReleaseIssues(interactions, source);
  if (issues.length) {
    const first = issues[0];
    throw new Error(`single_phrase_source_hold:${first.interactionId}:${first.field}:${first.reason ?? "multi_sentence"}:${issues.length}`);
  }
  const gapIssues = compositeGapReleaseIssues(interactions, source);
  if (gapIssues.length) {
    const first = gapIssues[0];
    throw new Error(`single_gap_source_hold:${first.interactionId}:blank_count_${first.blankCount}:${gapIssues.length}`);
  }
  const dictationIssues = dictationAudioTargetIssues(interactions, source);
  if (dictationIssues.length) {
    const first = dictationIssues[0];
    throw new Error(`dictation_audio_source_hold:${first.interactionId}:${first.reason}:${dictationIssues.length}`);
  }
}

function projectedId(originalId, index, total) {
  return total === 1 ? originalId : `${originalId}:s${String(index + 1).padStart(2, "0")}`;
}

function atomicStepPrompt(interaction, index, total, locale) {
  const ukrainian = locale === "uk";
  const base = interaction.family === "listen_build_dictation"
    ? (ukrainian ? "Послухайте та складіть одну фразу" : "Послушайте и соберите одну фразу")
    : interaction.family === "context_gap_grammar"
      ? (ukrainian ? "Вставте одну відповідь в одну фразу" : "Вставьте один ответ в одну фразу")
      : interaction.family === "scripted_repeat_compare"
        ? (ukrainian ? "Промовте одну фразу" : "Произнесите одну фразу")
        : interaction.family === "listen_choose"
          ? (ukrainian ? "Послухайте одну фразу та виберіть відповідь" : "Послушайте одну фразу и выберите ответ")
          : (ukrainian ? "Складіть одну фразу" : "Соберите одну фразу");
  return total === 1
    ? base
    : `${base} — ${ukrainian ? "крок" : "шаг"} ${index + 1} ${ukrainian ? "із" : "из"} ${total}`;
}

function promptTargetLeak(interaction) {
  const payload = interaction?.modePayload ?? {};
  const target = normalizeSpace(payload.targetPhrase ?? payload.hiddenTargetPhrase);
  if (!target) return false;
  const normalizedTarget = target.toLocaleLowerCase("en-US");
  return [interaction?.prompt, interaction?.accessibilityLabel]
    .map((value) => normalizeSpace(value).toLocaleLowerCase("en-US"))
    .some((visible) => visible.includes(normalizedTarget));
}

function withPromptContext(interaction, context) {
  const suffix = normalizeSpace(context.join(" "));
  if (!suffix) return interaction;
  const prompt = normalizeSpace(`${interaction.prompt} ${suffix}`);
  return { ...interaction, prompt, accessibilityLabel: prompt };
}

function spokenInteraction(source, id, sentence) {
  return {
    ...clone(source),
    interactionId: id,
    family: "scripted_repeat_compare",
    inputMode: "tap_record_compare",
    responseOptions: [],
    audioTargetIds: [`${id}:audio`],
    modePayload: {
      family: "scripted_repeat_compare",
      referenceAudio: { audioTargetId: `${id}:audio`, transcript: sentence },
      slowReferenceAudio: null,
      targetPhrase: sentence,
      recordControlPolicy: "hold_press_release_with_accessible_toggle",
      modelPlayback: "reference_and_slow",
      learnerPlayback: "available_after_capture",
      honestOutcomeStates: ["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"],
    },
  };
}

function projectedAnswer(id, correctResponseId = null, correctText = "") {
  return { interactionId: id, correctText, correctResponseId };
}

function splitOrderedTokens(interactionId, sentences, orderedTokens) {
  const output = [];
  let tokenIndex = 0;
  for (const sentence of sentences) {
    const expected = normalizeWords(sentence);
    const selected = [];
    const actual = [];
    while (tokenIndex < orderedTokens.length && actual.length < expected.length) {
      const token = orderedTokens[tokenIndex++];
      const words = normalizeWords(token);
      if (!words.length || actual.length + words.length > expected.length) {
        throw new Error(`single_phrase_projection_hold:${interactionId}:ordered_token_boundary`);
      }
      selected.push(token);
      actual.push(...words);
    }
    if (actual.join(" ") !== expected.join(" ")) {
      throw new Error(`single_phrase_projection_hold:${interactionId}:ordered_tokens_do_not_match_target`);
    }
    output.push(selected);
  }
  if (tokenIndex !== orderedTokens.length) {
    throw new Error(`single_phrase_projection_hold:${interactionId}:unused_ordered_tokens`);
  }
  return output;
}

function projectScripted(source, answer) {
  const target = splitAssessedSentences(source.modePayload?.targetPhrase);
  const audio = splitAssessedSentences(source.modePayload?.referenceAudio?.transcript);
  if (target.length <= 1 && audio.length <= 1) return {
    interactions: [clone(source)],
    answers: [projectedAnswer(source.interactionId, null, answer?.correctText || target[0] || audio[0] || "")],
  };
  if (!target.length || target.length !== audio.length || target.some((value, index) => normalizeSpace(value) !== normalizeSpace(audio[index]))) {
    throw new Error(`single_phrase_projection_hold:${source.interactionId}:scripted_audio_target_alignment`);
  }
  const interactions = target.map((sentence, index) => {
    const id = projectedId(source.interactionId, index, target.length);
    const item = spokenInteraction(source, id, sentence);
    item.modePayload = {
      ...clone(source.modePayload),
      targetPhrase: sentence,
      referenceAudio: { ...clone(source.modePayload.referenceAudio), audioTargetId: `${id}:audio`, transcript: sentence },
    };
    item.audioTargetIds = [`${id}:audio`];
    return item;
  });
  return { interactions, answers: interactions.map((item) => projectedAnswer(item.interactionId, null, item.modePayload.targetPhrase)) };
}

function projectBuilder(source, answer, dictation) {
  let effectiveSource = source;
  if (dictation) {
    const target = normalizeSpace(source.modePayload?.hiddenTargetPhrase);
    const transcript = normalizeSpace(source.modePayload?.referenceAudio?.transcript);
    if (target !== transcript) {
      if (/^(?:audio|аудио|аудіо)$/iu.test(transcript) && target) {
        effectiveSource = clone(source);
        effectiveSource.modePayload.referenceAudio.transcript = target;
      } else {
        throw new Error(`single_phrase_projection_hold:${source.interactionId}:dictation_audio_target_alignment`);
      }
    }
  }
  const field = dictation ? "hiddenTargetPhrase" : "targetPhrase";
  const sentences = splitAssessedSentences(effectiveSource.modePayload?.[field]);
  if (sentences.length <= 1) {
    const sentence = sentences[0] || "";
    if (sentence && (effectiveSource.modePayload?.orderedTokens ?? []).length < 2) {
      return {
        interactions: [spokenInteraction(effectiveSource, source.interactionId, sentence)],
        answers: [projectedAnswer(source.interactionId, null, sentence)],
      };
    }
    return {
      interactions: [clone(effectiveSource)],
      answers: [projectedAnswer(source.interactionId, null, answer?.correctText || sentence)],
    };
  }
  const tokenGroups = splitOrderedTokens(source.interactionId, sentences, effectiveSource.modePayload?.orderedTokens ?? []);
  let audio = null;
  if (dictation) {
    audio = splitAssessedSentences(effectiveSource.modePayload?.referenceAudio?.transcript);
    if (audio.length !== sentences.length || audio.some((value, index) => normalizeSpace(value) !== normalizeSpace(sentences[index]))) {
      throw new Error(`single_phrase_projection_hold:${source.interactionId}:dictation_audio_target_alignment`);
    }
  }
  const interactions = sentences.map((sentence, index) => {
    const id = projectedId(source.interactionId, index, sentences.length);
    if (tokenGroups[index].length < 2) {
      return spokenInteraction(effectiveSource, id, sentence);
    }
    const item = clone(effectiveSource);
    item.interactionId = id;
    item.modePayload[field] = sentence;
    item.modePayload.orderedTokens = tokenGroups[index];
    if (dictation) {
      item.modePayload.referenceAudio = { ...item.modePayload.referenceAudio, audioTargetId: `${id}:audio`, transcript: audio[index] };
      item.audioTargetIds = [`${id}:audio`];
    }
    return item;
  });
  return { interactions, answers: interactions.map((item) => projectedAnswer(item.interactionId, null, item.modePayload[field])) };
}

function extractGapUnits(value) {
  const context = [];
  const targets = [];
  for (const unit of splitAssessedSentences(value)) {
    if (!CYRILLIC.test(unit)) {
      targets.push(unit);
      continue;
    }
    const colon = unit.lastIndexOf(":");
    const tail = colon >= 0 ? normalizeSpace(unit.slice(colon + 1)) : "";
    if (tail && (/___/u.test(tail) || (!CYRILLIC.test(tail) && /[A-Za-z]/u.test(tail)))) {
      const prefix = normalizeSpace(unit.slice(0, colon + 1));
      if (prefix) context.push(prefix);
      targets.push(tail);
    } else {
      context.push(unit);
    }
  }
  return { context, targets };
}

function optionFeedbackMap(payload) {
  return new Map((payload?.choiceFeedback ?? []).map((item) => [item.responseId, item]));
}

function uniqueChoiceProjection({ source, id, choiceTexts, correctOriginalId, payload }) {
  const correctIndex = source.responseOptions.findIndex((item) => item.responseId === correctOriginalId);
  if (correctIndex < 0) throw new Error(`single_phrase_projection_hold:${source.interactionId}:correct_response_missing`);
  const correctText = normalizeSpace(choiceTexts[correctIndex]);
  const unique = [];
  const byText = new Map();
  for (const [index, raw] of choiceTexts.entries()) {
    const text = normalizeSpace(raw);
    if (!text) throw new Error(`single_phrase_projection_hold:${source.interactionId}:empty_projected_choice`);
    let entry = byText.get(text);
    if (!entry) {
      entry = { text, sourceIndices: [] };
      byText.set(text, entry);
      unique.push(entry);
    }
    entry.sourceIndices.push(index);
  }
  const options = unique.map((entry, index) => ({ responseId: `${id}:r${index + 1}`, text: entry.text }));
  const correctOptionIndex = unique.findIndex((entry) => entry.text === correctText);
  const feedbackByOriginal = optionFeedbackMap(payload);
  const feedback = unique.flatMap((entry, index) => {
    const originalFeedback = index === correctOptionIndex
      ? feedbackByOriginal.get(correctOriginalId)
      : entry.sourceIndices.map((sourceIndex) => feedbackByOriginal.get(source.responseOptions[sourceIndex].responseId)).find(Boolean);
    return originalFeedback ? [{ ...clone(originalFeedback), responseId: options[index].responseId }] : [];
  });
  return {
    options,
    unique,
    feedback,
    correctText,
    correctResponseId: options[correctOptionIndex]?.responseId ?? null,
  };
}

function optionSegments(source, totalSegments) {
  return source.responseOptions.map((option) => {
    const parts = normalizeSpace(option.text).split(/\s*[;·]\s*/u).filter(Boolean);
    if (parts.length !== totalSegments) {
      throw new Error(`single_phrase_projection_hold:${source.interactionId}:gap_answer_segments`);
    }
    return parts;
  });
}

function projectGap(source, answer) {
  const { context, targets } = extractGapUnits(source.modePayload?.gappedTargetPhrase);
  if (!targets.length) throw new Error(`single_phrase_projection_hold:${source.interactionId}:gap_target_missing`);
  const blankCounts = targets.map((sentence) => (sentence.match(/___/gu) ?? []).length);
  if (blankCounts.some((count) => count < 1)) {
    // A complete antecedent is retained as a one-sentence spoken interaction.
    // Gap choices are consumed only by the sentences that actually contain gaps.
  }
  const totalBlanks = blankCounts.reduce((sum, count) => sum + count, 0);
  const segments = optionSegments(source, totalBlanks);
  const outputs = [];
  let segmentOffset = 0;
  for (const [index, sentence] of targets.entries()) {
    const id = projectedId(source.interactionId, index, targets.length);
    const blankCount = blankCounts[index];
    if (!blankCount) {
      const spoken = withPromptContext(spokenInteraction(source, id, sentence), context);
      outputs.push({ interaction: spoken, answer: projectedAnswer(id, null, sentence) });
      continue;
    }
    const blankRuns = sentence.match(/___(?:\s+___)*/gu) ?? [];
    if (blankRuns.length !== 1) {
      throw new Error(`single_phrase_projection_hold:${source.interactionId}:non_adjacent_gaps`);
    }
    const choiceTexts = segments.map((parts) => parts.slice(segmentOffset, segmentOffset + blankCount).join(" "));
    segmentOffset += blankCount;
    const choice = uniqueChoiceProjection({ source, id, choiceTexts, correctOriginalId: answer.correctResponseId, payload: source.modePayload });
    if (choice.options.length < 2) throw new Error(`single_phrase_projection_hold:${source.interactionId}:gap_choices_collapse`);
    const item = withPromptContext(clone(source), context);
    item.interactionId = id;
    item.responseOptions = choice.options;
    item.audioTargetIds = [];
    item.modePayload.gappedTargetPhrase = sentence.replace(/___(?:\s+___)+/gu, "___");
    item.modePayload.gapOptions = choice.options;
    item.modePayload.choiceFeedback = choice.feedback;
    outputs.push({ interaction: item, answer: projectedAnswer(id, choice.correctResponseId, choice.correctText) });
  }
  if (segmentOffset !== totalBlanks) throw new Error(`single_phrase_projection_hold:${source.interactionId}:gap_segment_accounting`);
  return { interactions: outputs.map((item) => item.interaction), answers: outputs.map((item) => item.answer) };
}

function alignedSentenceParts(value, count, interactionId, field) {
  const parts = splitAssessedSentences(value);
  if (parts.length !== count) throw new Error(`single_phrase_projection_hold:${interactionId}:${field}_sentence_alignment`);
  return parts;
}

function projectListenChoice(source, answer) {
  const audioParts = splitAssessedSentences(source.modePayload?.referenceAudio?.transcript);
  const optionParts = source.responseOptions.map((option) => splitAssessedSentences(option.text));
  const count = Math.max(audioParts.length, ...optionParts.map((parts) => parts.length));
  if (count <= 1) return { interactions: [clone(source)], answers: [clone(answer)] };
  if (audioParts.length !== count || optionParts.some((parts) => parts.length !== count)) {
    throw new Error(`single_phrase_projection_hold:${source.interactionId}:listen_choice_sentence_alignment`);
  }
  const meanings = source.modePayload?.localizedMeaningChoices ?? [];
  if (meanings.length !== source.responseOptions.length) {
    throw new Error(`single_phrase_projection_hold:${source.interactionId}:listen_choice_meaning_alignment`);
  }
  const targetParts = meanings.map((item, index) => alignedSentenceParts(item.targetText ?? source.responseOptions[index].text, count, source.interactionId, "listen_choice_target"));
  const meaningParts = meanings.map((item) => Object.fromEntries(Object.entries(item.meaningByLocale ?? {}).map(([locale, value]) => [
    locale,
    alignedSentenceParts(value, count, source.interactionId, `listen_choice_meaning_${locale}`),
  ])));
  const outputs = [];
  for (let index = 0; index < count; index += 1) {
    const id = projectedId(source.interactionId, index, count);
    const choiceTexts = optionParts.map((parts) => parts[index]);
    const choice = uniqueChoiceProjection({ source, id, choiceTexts, correctOriginalId: answer.correctResponseId, payload: source.modePayload });
    if (choice.options.length < 2) {
      outputs.push({ interaction: spokenInteraction(source, id, audioParts[index]), answer: projectedAnswer(id, null, audioParts[index]) });
      continue;
    }
    const item = clone(source);
    item.interactionId = id;
    item.responseOptions = choice.options;
    item.audioTargetIds = [`${id}:audio`];
    item.modePayload.referenceAudio = { ...item.modePayload.referenceAudio, audioTargetId: `${id}:audio`, transcript: audioParts[index] };
    item.modePayload.choiceFeedback = choice.feedback;
    item.modePayload.localizedMeaningChoices = choice.unique.map((entry, optionIndex) => {
      const sourceIndex = entry.sourceIndices[0];
      const original = meanings[sourceIndex];
      const localized = original.meaningByLocale == null ? null : Object.fromEntries(Object.keys(original.meaningByLocale).map((locale) => [locale, meaningParts[sourceIndex][locale][index]]));
      return {
        responseId: choice.options[optionIndex].responseId,
        targetText: targetParts[sourceIndex][index],
        meaningByLocale: localized,
      };
    });
    outputs.push({ interaction: item, answer: projectedAnswer(id, choice.correctResponseId, choice.correctText) });
  }
  return { interactions: outputs.map((item) => item.interaction), answers: outputs.map((item) => item.answer) };
}

function speedMatchCorrectText(interaction) {
  const pairs = interaction.modePayload?.pairGrid ?? [];
  if (!pairs.length) throw new Error(`answer_contract_hold:${interaction.interactionId}:speed_match_pairs_missing`);
  const pairIds = new Set();
  return pairs.map((pair) => {
    const pairId = normalizeSpace(pair?.pairId);
    const target = normalizeSpace(pair?.target);
    if (!pairId || !target || pairIds.has(pairId)) {
      throw new Error(`answer_contract_hold:${interaction.interactionId}:speed_match_pair_invalid`);
    }
    pairIds.add(pairId);
    return `${pairId}=${target}`;
  }).join("\n");
}

function selectedResponseText(interaction, answer) {
  const responseId = answer?.correctResponseId;
  if (!responseId) return "";
  return normalizeSpace((interaction.responseOptions ?? []).find((item) => item.responseId === responseId)?.text);
}

function expectedCorrectText(interaction, answer) {
  if (interaction.family === "speed_match") return speedMatchCorrectText(interaction);
  if (interaction.family === "listen_choose" && interaction.modePayload?.isWordCard) {
    const word = normalizeSpace(interaction.modePayload?.wordCard?.word);
    const transcript = normalizeSpace(interaction.modePayload?.referenceAudio?.transcript);
    const targetText = normalizeSpace(interaction.modePayload?.localizedMeaningChoices?.[0]?.targetText);
    if (!word || !transcript || word !== transcript || (targetText && targetText !== word)) {
      throw new Error(`answer_contract_hold:${interaction.interactionId}:word_card_target_alignment`);
    }
    return word;
  }
  if (answer?.correctResponseId) {
    const selected = selectedResponseText(interaction, answer);
    if (!selected) throw new Error(`answer_contract_hold:${interaction.interactionId}:correct_response_missing`);
    return selected;
  }
  const payload = interaction.modePayload ?? {};
  const target = normalizeSpace(
    payload.targetPhrase ??
    payload.hiddenTargetPhrase ??
    payload.referenceAudio?.transcript,
  );
  if (target) return target;
  throw new Error(`answer_contract_hold:${interaction.interactionId}:correct_text_missing`);
}

function derivedCorrectText(interaction, answer, { allowLocalizedChoiceText = false } = {}) {
  const expected = expectedCorrectText(interaction, answer);
  const authored = normalizeSpace(answer?.correctText);
  if (allowLocalizedChoiceText && answer?.correctResponseId) return authored || expected;
  if (authored && authored !== normalizeSpace(expected)) {
    throw new Error(`answer_contract_hold:${interaction.interactionId}:correct_text_contract_mismatch`);
  }
  return expected;
}

function materializeAnswer(interaction, answer, options = {}) {
  return {
    ...clone(answer ?? projectedAnswer(interaction.interactionId)),
    interactionId: interaction.interactionId,
    correctText: derivedCorrectText(interaction, answer, options),
  };
}

export function answerContractIssues(interactions, answers, source = "", { allowLocalizedChoiceText = false } = {}) {
  const answerById = new Map((answers ?? []).map((item) => [item.interactionId, item]));
  const issues = [];
  for (const interaction of interactions ?? []) {
    const answer = answerById.get(interaction.interactionId);
    if (!answer) {
      issues.push({ source, interactionId: interaction.interactionId, family: interaction.family, reason: "answer_missing" });
      continue;
    }
    const wordCardText = interaction.family === "listen_choose" && interaction.modePayload?.isWordCard
      ? normalizeSpace(interaction.modePayload?.wordCard?.word)
      : "";
    const speedMatchText = interaction.family === "speed_match" ? normalizeSpace(speedMatchCorrectText(interaction)) : "";
    const effectiveCorrectText = normalizeSpace(answer.correctText) || wordCardText || speedMatchText;
    if (!effectiveCorrectText) {
      issues.push({ source, interactionId: interaction.interactionId, family: interaction.family, reason: "empty_correct_text" });
      continue;
    }
    try {
      const expected = expectedCorrectText(interaction, { ...answer, correctText: effectiveCorrectText });
      if (!allowLocalizedChoiceText && effectiveCorrectText !== normalizeSpace(expected)) {
        issues.push({ source, interactionId: interaction.interactionId, family: interaction.family, reason: "correct_text_contract_mismatch", expected, actual: effectiveCorrectText });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const reason = /:correct_response_missing$/u.test(message) ? "correct_response_missing" : "correct_text_derivation_failed";
      issues.push({ source, interactionId: interaction.interactionId, family: interaction.family, reason, error: message });
    }
  }
  for (const answer of answers ?? []) {
    if (!(interactions ?? []).some((item) => item.interactionId === answer.interactionId)) {
      issues.push({ source, interactionId: answer.interactionId, family: null, reason: "orphan_answer" });
    }
  }
  return issues;
}

function projectOne(source, answer) {
  if (source.family === "scripted_repeat_compare") return projectScripted(source, answer);
  if (source.family === "phrase_builder") return projectBuilder(source, answer, false);
  if (source.family === "listen_build_dictation") return projectBuilder(source, answer, true);
  if (source.family === "context_gap_grammar") return projectGap(source, answer);
  if (source.family === "listen_choose" && !source.modePayload?.isWordCard) return projectListenChoice(source, answer);
  return { interactions: [clone(source)], answers: [clone(answer)] };
}

function preservationSegments(interaction) {
  const payload = interaction.modePayload ?? {};
  if (interaction.family === "scripted_repeat_compare") return splitAssessedSentences(payload.targetPhrase);
  if (interaction.family === "phrase_builder") return splitAssessedSentences(payload.targetPhrase);
  if (interaction.family === "listen_build_dictation") return splitAssessedSentences(payload.hiddenTargetPhrase);
  if (interaction.family === "context_gap_grammar") return extractGapUnits(payload.gappedTargetPhrase).targets;
  if (interaction.family === "listen_choose") {
    const audio = splitAssessedSentences(payload.referenceAudio?.transcript);
    return audio.length ? audio : [interaction.interactionId];
  }
  // `contrastA` is the assessed lexical answer in the sound-contrast runtime
  // contract. The other contrast is a distractor, so the interaction id is not
  // a learner target and must never hide a missing word-first contact.
  if (interaction.family === "sound_contrast") return [normalizeSpace(payload.contrastA) || interaction.interactionId];
  if (interaction.family === "speed_match") return [speedMatchCorrectText(interaction)];
  return [interaction.interactionId];
}

function projectedPreservedTarget(interaction) {
  const payload = interaction.modePayload ?? {};
  if (interaction.family === "scripted_repeat_compare") return normalizeSpace(payload.targetPhrase);
  if (interaction.family === "phrase_builder") return normalizeSpace(payload.targetPhrase);
  if (interaction.family === "listen_build_dictation") return normalizeSpace(payload.hiddenTargetPhrase);
  if (interaction.family === "context_gap_grammar") return normalizeSpace(payload.gappedTargetPhrase);
  if (interaction.family === "listen_choose") return normalizeSpace(payload.referenceAudio?.transcript) || interaction.interactionId;
  if (interaction.family === "sound_contrast") return normalizeSpace(payload.contrastA) || interaction.interactionId;
  if (interaction.family === "speed_match") return speedMatchCorrectText(interaction);
  return interaction.interactionId;
}

function normalizedExactPrimaryTarget(value) {
  return normalizeSpace(value)
    .replace(/\p{P}+$/gu, "")
    .toLocaleLowerCase("en-US");
}

function introPrimaryTargets(intro) {
  return (intro?.pages ?? []).flatMap((page) => {
    const localeChoices = page?.question?.choicesByLocale ?? {};
    const preferred = localeChoices.ru ?? localeChoices.uk ?? Object.values(localeChoices)[0] ?? [];
    const first = preferred[0];
    const target = normalizedExactPrimaryTarget(first?.text);
    return target ? [{ pageId: page.pageId, target }] : [];
  });
}

function isRequiredWordFirstContact(normalizedTarget, newWords) {
  if (!normalizedTarget) return false;
  const normalizedWords = new Set((newWords ?? []).map(normalizedExactPrimaryTarget));
  return normalizedWords.has(normalizedTarget);
}

// An intro question is already an assessed contact. Repeating its exact correct
// answer in practice lets the learner recall screen position instead of making
// the new decision. Explanatory prose is deliberately outside this check, and
// standalone word-first contacts remain repeatable across their required three
// different families.
export function introPracticeTargetRepeatIssues(intro, interactions, { source = "", newWords = [] } = {}) {
  const introTargets = introPrimaryTargets(intro);
  const issues = [];
  for (const interaction of interactions ?? []) {
    const target = normalizedExactPrimaryTarget(projectedPreservedTarget(interaction));
    if (!target || isRequiredWordFirstContact(target, newWords)) continue;
    const repeated = introTargets.find((entry) => entry.target === target);
    if (!repeated) continue;
    // Retrieval after an explanation is the point of practice. It remains a
    // genuine decision if a later constructive task supplies a fresh visible
    // situation and does not show the target phrase; a bare repeat prompt does
    // not qualify.
    if (isContextualRetrievalAfterIntro(interaction, target) || isIndependentShortReplyFinal(interaction, target)) continue;
    issues.push({
      ...(source ? { source } : {}),
      introPageId: repeated.pageId,
      practiceInteractionId: interaction.interactionId,
      practiceFamily: interaction.family,
      target,
      reason: "intro_practice_exact_primary_target_repeat",
    });
  }
  return issues;
}

function isContextualRetrievalAfterIntro(interaction, target) {
  if (!new Set(["supported_practice", "guided_practice", "retrieval_practice", "independent_check"]).has(interaction?.purpose)) return false;
  if (!new Set(["phrase_builder", "context_gap_grammar", "listen_build_dictation", "listen_choose", "sound_contrast", "scripted_repeat_compare"]).has(interaction?.family)) return false;
  if (interaction?.family === "listen_build_dictation") {
    return normalizedExactPrimaryTarget(interaction?.modePayload?.referenceAudio?.transcript) === target;
  }
  if (interaction?.family === "listen_choose") {
    if (interaction?.modePayload?.isWordCard) return false;
    return normalizedExactPrimaryTarget(interaction?.modePayload?.referenceAudio?.transcript) === target && hasVisibleContextWithoutTarget(interaction, target);
  }
  if (interaction?.family === "sound_contrast") {
    return normalizedExactPrimaryTarget(interaction?.modePayload?.contrastA) === target && hasVisibleContextWithoutTarget(interaction, target);
  }
  if (interaction?.family === "scripted_repeat_compare") return hasContextualVoicePrompt(interaction, target);
  if (learnerHeardAudioDeclared(interaction)) return false;
  return hasVisibleContextWithoutTarget(interaction, target);
}

function hasVisibleContextWithoutTarget(interaction, target) {
  const visible = normalizedComparableText(visibleConditionValues(interaction).join(" "));
  if (!visible || visible.includes(normalizedComparableText(target))) return false;
  return !/^(?:послушайте(?:\s+и)?\s+выберите|послухайте(?:\s+й)?\s+виберіть)$/u.test(visible);
}

function hasContextualVoicePrompt(interaction, target) {
  if (normalizedExactPrimaryTarget(interaction?.modePayload?.referenceAudio?.transcript) !== target) return false;
  const visible = normalizedComparableText(visibleConditionValues(interaction).join(" "));
  if (!visible || visible.includes(normalizedComparableText(target))) return false;
  return !/^(?:произнесите|промовте|скажите|скажіть)\s+(?:одну\s+)?фразу(?:\s+[—-]\s+(?:шаг|крок)\s+\d+\s+(?:із|из)\s+\d+)?$/u.test(visible);
}

function isIndependentShortReplyFinal(interaction, target) {
  if (interaction?.purpose !== "independent_check") return false;
  const signature = finiteBeShortReplySignature(target);
  if (!signature || learnerHeardAudioDeclared(interaction)) return false;
  const visible = normalizedComparableText(visibleConditionValues(interaction).join(" "));
  if (visible.includes(normalizedComparableText(target))) return false;
  return explicitEnglishQuestionFacts(interaction, signature).questions.size > 0;
}

// A practice target may recur only inside the same activity family. Reusing
// the exact assessed phrase under a different mechanic turns the later task
// into answer recall. Atomic new-word contacts are the sole exception because
// the course contract requires the word itself in three distinct families.
export function practiceTargetRepeatIssues(interactions, { source = "", newWords = [] } = {}) {
  const seen = new Map();
  const issues = [];
  for (const interaction of interactions ?? []) {
    const target = normalizedExactPrimaryTarget(projectedPreservedTarget(interaction));
    if (!target || isRequiredWordFirstContact(target, newWords)) continue;
    const previous = seen.get(target);
    if (previous && previous.family !== interaction.family && !isContextualTargetReassessment(previous.item, interaction, target)) {
      issues.push({
        ...(source ? { source } : {}),
        previousInteractionId: previous.interactionId,
        practiceInteractionId: interaction.interactionId,
        previousFamily: previous.family,
        practiceFamily: interaction.family,
        target,
        reason: "practice_exact_primary_target_cross_family_repeat",
      });
    } else if (!previous) {
      seen.set(target, { interactionId: interaction.interactionId, family: interaction.family, item: interaction });
    }
  }
  return issues;
}

function isContextualTargetReassessment(previous, current, target) {
  if (finiteBeShortReplySignature(target)) return false;
  // A reviewed word card is an explanation, not a second blind assessment.
  // Its first meaningful use may therefore be a later contextual retrieval;
  // the retrieval still needs a distinct visible situation.
  if (isWordCardTeachingContact(previous, target) && isContextualRetrievalAfterIntro(current, target)) return true;
  if (!isContextualRetrievalAfterIntro(previous, target) || !isContextualRetrievalAfterIntro(current, target)) return false;
  const previousVisible = normalizedComparableText(visibleConditionValues(previous).join(" "));
  const currentVisible = normalizedComparableText(visibleConditionValues(current).join(" "));
  return Boolean(previousVisible && currentVisible && previousVisible !== currentVisible);
}

function isWordCardTeachingContact(interaction, target) {
  return interaction?.family === "listen_choose" &&
    interaction?.modePayload?.isWordCard === true &&
    normalizedExactPrimaryTarget(interaction?.modePayload?.referenceAudio?.transcript) === target;
}

function comparablePreservedTarget(family, value) {
  const text = normalizeSpace(value);
  return family === "context_gap_grammar" ? text.replace(/___(?:\s+___)+/gu, "___") : text;
}

export function buildPreservationLedger(sourceInteractions, projectedInteractions, projectedAnswers) {
  const interactionById = new Map((projectedInteractions ?? []).map((item) => [item.interactionId, item]));
  const answerById = new Map((projectedAnswers ?? []).map((item) => [item.interactionId, item]));
  const rows = [];
  const issues = [];
  const mappedIds = new Set();
  for (const source of sourceInteractions ?? []) {
    const segments = preservationSegments(source);
    if (!segments.length) {
      issues.push({ oldInteractionId: source.interactionId, reason: "source_segments_missing" });
      continue;
    }
    for (const [index, sourceSegment] of segments.entries()) {
      const newInteractionId = projectedId(source.interactionId, index, segments.length);
      const interaction = interactionById.get(newInteractionId);
      const answer = answerById.get(newInteractionId);
      if (!interaction || !answer) {
        issues.push({ oldInteractionId: source.interactionId, segmentIndex: index + 1, newInteractionId, reason: !interaction ? "projected_interaction_missing" : "projected_answer_missing" });
        continue;
      }
      mappedIds.add(newInteractionId);
      const newTargetSegment = projectedPreservedTarget(interaction);
      if (comparablePreservedTarget(source.family, sourceSegment) !== comparablePreservedTarget(source.family, newTargetSegment)) {
        issues.push({ oldInteractionId: source.interactionId, segmentIndex: index + 1, newInteractionId, reason: "source_segment_substituted", sourceSegment, newTargetSegment });
      }
      rows.push({
        oldInteractionId: source.interactionId,
        sourceFamily: source.family,
        segmentIndex: index + 1,
        sourceSegment: normalizeSpace(sourceSegment),
        newInteractionId,
        newTargetSegment,
        correctText: answer.correctText,
        audioTranscript: normalizeSpace(interaction.modePayload?.referenceAudio?.transcript) || null,
      });
    }
  }
  for (const interaction of projectedInteractions ?? []) {
    if (!mappedIds.has(interaction.interactionId)) issues.push({ newInteractionId: interaction.interactionId, reason: "projected_interaction_unmapped" });
  }
  return { rows, issues };
}

export function preservationLedgerIssues({ sourceInteractions, projectedInteractions, projectedAnswers, ledger, amendments = [] }) {
  const expected = buildPreservationLedger(sourceInteractions, projectedInteractions, projectedAnswers);
  const amendmentGroups = new Map();
  const retirements = new Map();
  const replacements = new Map();
  const additions = new Map();
  for (const item of amendments ?? []) {
    if (item?.action === "addition") {
      const key = String(item.newInteractionId ?? "");
      if (!additions.has(key)) additions.set(key, []);
      additions.get(key).push(item);
      continue;
    }
    if (item?.action === "retire") {
      const key = `${item.oldInteractionId}\u0000${item.segmentIndex}`;
      if (!retirements.has(key)) retirements.set(key, []);
      retirements.get(key).push(item);
      continue;
    }
    if (item?.action === "replacement") {
      const key = String(item.newInteractionId ?? "");
      if (!replacements.has(key)) replacements.set(key, []);
      replacements.get(key).push(item);
      continue;
    }
    const key = `${item.oldInteractionId}\u0000${item.segmentIndex}`;
    if (!amendmentGroups.has(key)) amendmentGroups.set(key, []);
    amendmentGroups.get(key).push(item);
  }
  const amendmentIssues = [];
  for (const groups of [amendmentGroups, retirements, replacements, additions]) for (const [key, items] of groups) {
    if (items.length !== 1) {
      const [oldInteractionId, segmentIndex] = key.split("\u0000");
      amendmentIssues.push({ oldInteractionId: oldInteractionId || key, segmentIndex: Number(segmentIndex), reason: "amendment_duplicate" });
    }
  }
  if (amendmentIssues.length) return amendmentIssues;
  const consumedAmendments = new Set();
  const consumedRetirements = new Set();
  const consumedReplacements = new Set();
  const consumedAdditions = new Set();
  const ledgerByKey = new Map((ledger ?? []).map((row) => [`${row.oldInteractionId}\u0000${row.segmentIndex}`, row]));
  const unresolved = expected.issues.filter((issue) => {
    if (issue.reason === "projected_interaction_missing") {
      const key = `${issue.oldInteractionId}\u0000${issue.segmentIndex}`;
      const retirement = retirements.get(key)?.[0];
      const historical = ledgerByKey.get(key);
      const valid = retirement && historical && normalizeSpace(retirement.from) === normalizeSpace(historical.sourceSegment)
        && normalizeSpace(retirement.reason) && normalizeSpace(retirement.replacementInteractionId);
      if (valid) consumedRetirements.add(key);
      return !valid;
    }
    if (issue.reason === "projected_interaction_unmapped") {
      const key = String(issue.newInteractionId);
      const addition = additions.get(key)?.[0];
      if (addition && normalizeSpace(addition.reason)) {
        consumedAdditions.add(key);
        return false;
      }
      const replacement = replacements.get(key)?.[0];
      const valid = replacement && normalizeSpace(replacement.reason)
        && Array.isArray(replacement.retires) && replacement.retires.length > 0
        && replacement.retires.every((entry) => consumedRetirements.has(`${entry.oldInteractionId}\u0000${entry.segmentIndex}`));
      if (valid) consumedReplacements.add(key);
      return !valid;
    }
    if (issue.reason !== "source_segment_substituted") return true;
    const key = `${issue.oldInteractionId}\u0000${issue.segmentIndex}`;
    const amendment = amendmentGroups.get(key)?.[0];
    const mismatch = !amendment ||
      !normalizeSpace(amendment.reason) ||
      normalizeSpace(amendment.from) !== normalizeSpace(issue.sourceSegment) ||
      normalizeSpace(amendment.to) !== normalizeSpace(issue.newTargetSegment);
    if (!mismatch) consumedAmendments.add(key);
    return mismatch;
  });
  if (unresolved.length) return unresolved;
  for (const key of amendmentGroups.keys()) {
    if (!consumedAmendments.has(key)) {
      const [oldInteractionId, segmentIndex] = key.split("\u0000");
      amendmentIssues.push({ oldInteractionId, segmentIndex: Number(segmentIndex), reason: "amendment_orphan" });
    }
  }
  for (const key of retirements.keys()) if (!consumedRetirements.has(key)) {
    const [oldInteractionId, segmentIndex] = key.split("\u0000");
    amendmentIssues.push({ oldInteractionId, segmentIndex: Number(segmentIndex), reason: "retirement_orphan" });
  }
  for (const key of replacements.keys()) if (!consumedReplacements.has(key)) {
    amendmentIssues.push({ newInteractionId: key, reason: "replacement_orphan" });
  }
  for (const key of additions.keys()) if (!consumedAdditions.has(key)) {
    amendmentIssues.push({ newInteractionId: key, reason: "addition_orphan" });
  }
  if (amendmentIssues.length) return amendmentIssues;
  const issues = [];
  const actualByKey = new Map(ledgerByKey);
  for (const row of expected.rows) {
    const key = `${row.oldInteractionId}\u0000${row.segmentIndex}`;
    const actual = actualByKey.get(key);
    if (!actual) issues.push({ oldInteractionId: row.oldInteractionId, segmentIndex: row.segmentIndex, reason: "ledger_row_missing" });
    else if (JSON.stringify(actual) !== JSON.stringify(row)) issues.push({ oldInteractionId: row.oldInteractionId, segmentIndex: row.segmentIndex, reason: "ledger_row_mismatch", expected: row, actual });
    actualByKey.delete(key);
  }
  for (const [key, row] of actualByKey) {
    if (consumedRetirements.has(key)) continue;
    issues.push({ oldInteractionId: row.oldInteractionId, segmentIndex: row.segmentIndex, reason: "ledger_row_orphan" });
  }
  return issues;
}

export function feedbackLocaleParityIssues(interactionsByLocale, { answers = [] } = {}) {
  const locales = Object.keys(interactionsByLocale ?? {}).sort();
  if (!locales.length) return [];
  const [baseLocale, ...otherLocales] = locales;
  const baseItems = interactionsByLocale[baseLocale] ?? [];
  const issues = [];
  const answerById = new Map((answers ?? []).map((answer) => [answer.interactionId, answer]));
  for (const projectionLocale of locales) {
    for (const interaction of interactionsByLocale[projectionLocale] ?? []) {
      const responseIds = (interaction?.responseOptions ?? []).map((option) => option?.responseId).filter(Boolean);
      const feedbackRows = interaction?.modePayload?.choiceFeedback ?? [];
      const feedbackById = new Map();
      for (const feedback of feedbackRows) {
        if (feedbackById.has(feedback?.responseId)) issues.push({
          interactionId: interaction.interactionId,
          responseId: feedback?.responseId,
          projectionLocale,
          reason: "choice_feedback_duplicate",
        });
        feedbackById.set(feedback?.responseId, feedback);
        for (const requiredLocale of locales) {
          if (!String(feedback?.feedbackByLocale?.[requiredLocale] ?? "").trim()) issues.push({
            interactionId: interaction.interactionId,
            responseId: feedback?.responseId,
            projectionLocale,
            locale: requiredLocale,
            reason: "choice_feedback_locale_value_missing",
          });
        }
      }
      // A builder has no selectable responseOptions: its learner-visible
      // choices are physical tiles.  Bind an explanation to the nth authored
      // distractor, not to a made-up rN choice ID.  This keeps two identical
      // extra words distinguishable in both the player and the data contract.
      if (["phrase_builder", "listen_build_dictation"].includes(interaction?.family)) {
        const distractors = interaction?.modePayload?.authoredDistractorTokens ?? [];
        const expectedTileIds = distractors.map((_, index) => `${interaction.interactionId}:tile:d${index + 1}`);
        const slotFeedback = interaction?.modePayload?.slotFeedback ?? [];
        const slotById = new Map();
        for (const feedback of slotFeedback) {
          if (slotById.has(feedback?.responseId)) issues.push({
            interactionId: interaction.interactionId, responseId: feedback?.responseId, projectionLocale, reason: "slot_feedback_duplicate",
          });
          slotById.set(feedback?.responseId, feedback);
          if (!expectedTileIds.includes(feedback?.responseId)) issues.push({
            interactionId: interaction.interactionId, responseId: feedback?.responseId, projectionLocale, reason: "slot_feedback_unknown_tile",
          });
          if (feedback?.correct !== false) issues.push({
            interactionId: interaction.interactionId, responseId: feedback?.responseId, projectionLocale, reason: "slot_feedback_wrong_contract",
          });
          for (const requiredLocale of locales) if (!String(feedback?.feedbackByLocale?.[requiredLocale] ?? "").trim()) issues.push({
            interactionId: interaction.interactionId, responseId: feedback?.responseId, projectionLocale, locale: requiredLocale, reason: "slot_feedback_locale_value_missing",
          });
        }
        for (const responseId of expectedTileIds) if (!slotById.has(responseId)) issues.push({
          interactionId: interaction.interactionId, responseId, projectionLocale, reason: "slot_feedback_missing",
        });
      }
      if (interaction?.inputMode !== "single_choice" || responseIds.length < 2 || !answers.length) continue;
      const correctResponseId = answerById.get(interaction.interactionId)?.correctResponseId;
      if (!correctResponseId || !responseIds.includes(correctResponseId)) {
        issues.push({ interactionId: interaction.interactionId, projectionLocale, reason: "choice_feedback_answer_missing" });
        continue;
      }
      for (const responseId of responseIds) {
        const feedback = feedbackById.get(responseId);
        if (!feedback) {
          issues.push({ interactionId: interaction.interactionId, responseId, projectionLocale, reason: "choice_feedback_missing" });
        } else if (feedback.correct !== (responseId === correctResponseId)) {
          issues.push({ interactionId: interaction.interactionId, responseId, projectionLocale, reason: "choice_feedback_wrong_contract" });
        }
      }
      for (const responseId of feedbackById.keys()) {
        if (!responseIds.includes(responseId)) issues.push({ interactionId: interaction.interactionId, responseId, projectionLocale, reason: "choice_feedback_unknown_response" });
      }

    }
  }
  const normalizedMap = (interaction) => new Map((interaction?.modePayload?.choiceFeedback ?? []).map((item) => [
    item.responseId,
    JSON.stringify(Object.fromEntries(Object.entries(item.feedbackByLocale ?? {}).sort(([a], [b]) => a.localeCompare(b)))),
  ]));
  const responseContract = (interaction) => (interaction?.responseOptions ?? []).map((item) => item.responseId).sort();
  const tileFeedbackContract = (interaction) => new Map((interaction?.modePayload?.slotFeedback ?? []).map((item) => [
    item.responseId,
    JSON.stringify({ correct: item.correct, feedbackByLocale: Object.fromEntries(Object.entries(item.feedbackByLocale ?? {}).sort(([a], [b]) => a.localeCompare(b))) }),
  ]));
  for (const base of baseItems) {
    const expected = normalizedMap(base);
    for (const locale of otherLocales) {
      const candidate = (interactionsByLocale[locale] ?? []).find((item) => item.interactionId === base.interactionId);
      const actual = normalizedMap(candidate);
      // Legacy locale projections may intentionally use different option ids.
      // Compare the full locale map only when the response contract is shared.
      if (JSON.stringify(responseContract(base)) !== JSON.stringify(responseContract(candidate))) continue;
      for (const [responseId, feedback] of expected) {
        if (actual.get(responseId) !== feedback) issues.push({
          interactionId: base.interactionId,
          responseId,
          baseLocale,
          locale,
          reason: "choice_feedback_locale_map_mismatch",
        });
      }
      for (const responseId of actual.keys()) {
        if (!expected.has(responseId)) issues.push({
          interactionId: base.interactionId,
          responseId,
          baseLocale,
          locale,
          reason: "choice_feedback_locale_map_mismatch",
        });
      }
      const expectedTiles = tileFeedbackContract(base);
      const actualTiles = tileFeedbackContract(candidate);
      for (const [responseId, feedback] of expectedTiles) if (actualTiles.get(responseId) !== feedback) issues.push({
        interactionId: base.interactionId, responseId, baseLocale, locale, reason: "slot_feedback_locale_map_mismatch",
      });
      for (const responseId of actualTiles.keys()) if (!expectedTiles.has(responseId)) issues.push({
        interactionId: base.interactionId, responseId, baseLocale, locale, reason: "slot_feedback_locale_map_mismatch",
      });
    }
  }
  return issues;
}

// A word card must teach a reviewed localized meaning. A bare repetition of
// the English headword is not a definition and must never reach the learner.
// The single reviewed `one` card predates the quoted-gloss convention and is
// intentionally descriptive; every other card must expose a short quoted gloss
// so the native projection can derive the saved word meaning without guessing.
export function wordCardDefinitionIssues(interactionsByLocale, source = "") {
  const issues = [];
  for (const [projectionLocale, interactions] of Object.entries(interactionsByLocale ?? {})) {
    for (const interaction of interactions ?? []) {
      const card = interaction?.modePayload?.wordCard;
      if (!card?.word) continue;
      const word = normalizeSpace(card.word).toLocaleLowerCase("en");
      for (const [definitionLocale, rawDefinition] of Object.entries(card.definitionByLocale ?? {})) {
        const definition = normalizeSpace(rawDefinition);
        const reviewedLegacyOne = word === "one" && /Which one\?/u.test(definition);
        if (!definition) {
          issues.push({ source, interactionId: interaction.interactionId, projectionLocale, definitionLocale, reason: "word_card_definition_missing" });
        } else if (definition.toLocaleLowerCase("en") === word) {
          issues.push({ source, interactionId: interaction.interactionId, projectionLocale, definitionLocale, reason: "word_card_definition_repeats_headword" });
        } else if (!/[«“"]([^»”"]+)[»”"]/u.test(definition) && !reviewedLegacyOne) {
          issues.push({ source, interactionId: interaction.interactionId, projectionLocale, definitionLocale, reason: "word_card_short_gloss_missing" });
        }
      }
    }
  }
  return issues;
}

export const REQUIRED_ACTIVITY_FAMILIES = [
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
];

// Owner contract: after the three intros, mechanics alternate; the same exact
// target cannot be repeated in the same family; every required family appears;
// and each new word gets three standalone contacts in three different families
// staged across the vocabulary (all first contacts, then all second, then all third).
function answerAwareAssessedTarget(interaction, answer) {
  const rawTarget = projectedPreservedTarget(interaction);
  if (interaction?.family !== "context_gap_grammar") return {
    target: normalizedExactPrimaryTarget(rawTarget),
    issues: [],
  };

  const gappedTarget = normalizeSpace(interaction?.modePayload?.gappedTargetPhrase);
  const gapRuns = gappedTarget.match(/___(?:\s+___)*/gu) ?? [];
  if (gapRuns.length !== 1) return {
    target: normalizedExactPrimaryTarget(rawTarget),
    issues: [],
  };
  if (!answer?.correctResponseId) return {
    target: normalizedExactPrimaryTarget(rawTarget),
    issues: gappedTarget === "___" ? [{
      interactionId: interaction.interactionId,
      family: interaction.family,
      reason: "context_gap_correct_answer_missing",
    }] : [],
  };
  const correctOption = (interaction?.modePayload?.gapOptions ?? [])
    .find((option) => option?.responseId === answer.correctResponseId);
  if (!correctOption) return {
    target: normalizedExactPrimaryTarget(rawTarget),
    issues: [{
      interactionId: interaction.interactionId,
      family: interaction.family,
      correctResponseId: answer.correctResponseId,
      reason: "context_gap_correct_response_missing",
    }],
  };
  const optionText = normalizeSpace(correctOption.text);
  const correctText = normalizeSpace(answer.correctText);
  if (!optionText || normalizedExactPrimaryTarget(optionText) !== normalizedExactPrimaryTarget(correctText)) return {
    target: normalizedExactPrimaryTarget(rawTarget),
    issues: [{
      interactionId: interaction.interactionId,
      family: interaction.family,
      correctResponseId: answer.correctResponseId,
      optionText,
      correctText,
      reason: "context_gap_correct_text_mismatch",
    }],
  };
  // A standalone blank is an assessed lexical choice, so its exact answer is
  // the word-first target. A blank inside a sentence stays a phrase target.
  const resolved = gappedTarget === "___"
    ? optionText
    : gappedTarget.replace(/___(?:\s+___)*/u, optionText);
  return { target: normalizedExactPrimaryTarget(resolved), issues: [] };
}

function projectedBuilderCollapses(interaction) {
  if (!new Set(["phrase_builder", "listen_build_dictation"]).has(interaction?.family)) return false;
  const payload = interaction?.modePayload ?? {};
  const target = interaction.family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase;
  return Boolean(normalizeSpace(target)) && (payload.orderedTokens ?? []).length < 2;
}

function containsExactLexicalSurface(target, word) {
  if (!target || !word) return false;
  const pieces = word.split(/\s+/u);
  const last = pieces.at(-1) ?? "";
  const pluralLast = /[^aeiou]y$/u.test(last) ? `${last.slice(0, -1)}ies`
    : /(?:s|x|z|ch|sh)$/u.test(last) ? `${last}es`
      : `${last}s`;
  const surfaces = [word, [...pieces.slice(0, -1), pluralLast].join(" ")];
  return surfaces.some((surface) => {
    const escaped = surface.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "u").test(target);
  });
}

function visibleConditionValues(interaction) {
  return [
    interaction?.prompt,
    interaction?.accessibilityLabel,
    ...Object.values(interaction?.modePayload?.localizedScene ?? {}),
  ].map(normalizeSpace).filter(Boolean);
}

function normalizedComparableText(value) {
  return normalizeSpace(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[‘’]/gu, "'")
    .replace(/[`*_#>«»“”"()[\]{}.,!?:;]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function finiteBeShortReplySignature(value) {
  const answer = normalizedComparableText(value);
  const positive = /^yes (i am|you are|he is|she is|it is|we are|they are|there is|there are)$/u.exec(answer);
  const negative = /^no (i am not|i'm not|you are not|you aren't|you're not|he is not|he isn't|he's not|she is not|she isn't|she's not|it is not|it isn't|it's not|we are not|we aren't|we're not|they are not|they aren't|they're not|there is not|there isn't|there are not|there aren't)$/u.exec(answer);
  const finite = positive?.[1] ?? negative?.[1];
  if (!finite) return null;
  const canonical = new Map([
    ["i am", "i am"], ["i am not", "i am"], ["i'm not", "i am"],
    ["you are", "you are"], ["you are not", "you are"], ["you aren't", "you are"], ["you're not", "you are"],
    ["he is", "he is"], ["he is not", "he is"], ["he isn't", "he is"], ["he's not", "he is"],
    ["she is", "she is"], ["she is not", "she is"], ["she isn't", "she is"], ["she's not", "she is"],
    ["it is", "it is"], ["it is not", "it is"], ["it isn't", "it is"], ["it's not", "it is"],
    ["we are", "we are"], ["we are not", "we are"], ["we aren't", "we are"], ["we're not", "we are"],
    ["they are", "they are"], ["they are not", "they are"], ["they aren't", "they are"], ["they're not", "they are"],
    ["there is", "there is"], ["there is not", "there is"], ["there isn't", "there is"],
    ["there are", "there are"], ["there are not", "there are"], ["there aren't", "there are"],
  ]).get(finite);
  const questionHeads = {
    "i am": ["are you"],
    "you are": ["am i"],
    "he is": ["is he"],
    "she is": ["is she"],
    "it is": ["is it"],
    "we are": ["are we"],
    "they are": ["are they"],
    "there is": ["is there"],
    "there are": ["are there"],
  }[canonical];
  return questionHeads ? { canonical, polarity: positive ? "positive" : "negative", questionHeads } : null;
}

const FINITE_BE_SHORT_REPLY_IN_TEXT_RE = /(?:^|\s)(yes (?:i am|you are|he is|she is|it is|we are|they are|there is|there are)|no (?:i am not|i'm not|you are not|you aren't|you're not|he is not|he isn't|he's not|she is not|she isn't|she's not|it is not|it isn't|it's not|we are not|we aren't|we're not|they are not|they aren't|they're not|there is not|there isn't|there are not|there aren't))(?=$|\s)/gu;

function visibleFiniteBeShortReplySignatures(interaction) {
  return visibleConditionValues(interaction).flatMap((value) => [...normalizedComparableText(value)
    .matchAll(FINITE_BE_SHORT_REPLY_IN_TEXT_RE)]
    .map((match) => finiteBeShortReplySignature(match[1]))
    .filter(Boolean));
}

const EXPLICIT_ENGLISH_BE_QUESTION_RE = /\b(?:am\s+i|are\s+you|is\s+he|is\s+she|is\s+it|are\s+we|are\s+they|is\s+there|are\s+there)\b[^?\r\n]*\?/giu;
const FACTUAL_CONTEXT_ACTION_RE = /(?:ответьте\s+коротко|выберите\s+(?:короткий\s+ответ|ответ)|дайте\s+(?:короткий|отрицательный|положительный)\s+ответ|відповідайте\s+коротко|(?:оберіть|виберіть|дайте)\s+(?:коротку|заперечну|ствердну)\s+відповідь)/gu;
const FACTUAL_CONTEXT_WRAPPER_RE = /(?:^|\s)(?:(?:тренировка|тренування|финал|фінал|спрашивают|спрашивает|спросили|питають|питає|запитують|запитує|запитали)|на\s+(?:вопрос|запитання)|для\s+(?:этой|новой|цієї|нової)\s+(?:ситуации|ситуації)|для\s+нового\s+(?:вопроса|запитання))(?=$|\s)/gu;

function normalizedFactualContext(value) {
  return normalizedComparableText(String(value ?? "").replace(EXPLICIT_ENGLISH_BE_QUESTION_RE, " "))
    .replace(FACTUAL_CONTEXT_ACTION_RE, " ")
    .replace(FACTUAL_CONTEXT_WRAPPER_RE, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function explicitEnglishQuestionFacts(interaction, signature) {
  const visibleValues = visibleConditionValues(interaction);
  const questions = visibleValues
    .flatMap((value) => value.match(EXPLICIT_ENGLISH_BE_QUESTION_RE) ?? [])
    .map(normalizedComparableText)
    .filter((question) => signature.questionHeads.some((head) => question.startsWith(`${head} `) || question === head));
  const sceneContexts = new Map(Object.entries(interaction?.modePayload?.localizedScene ?? {})
    .map(([locale, value]) => [locale, normalizedFactualContext(value)])
    .filter(([, context]) => Boolean(context)));
  const fallbackContext = [interaction?.prompt, interaction?.accessibilityLabel]
    .map(normalizedFactualContext)
    .find(Boolean) ?? "";
  return { questions: new Set(questions), sceneContexts, fallbackContext };
}

function factualContextChanged(previousFacts, currentFacts) {
  const previousScenes = previousFacts.sceneContexts;
  const currentScenes = currentFacts.sceneContexts;
  if (previousScenes.size && currentScenes.size) {
    const sharedLocales = [...currentScenes.keys()].filter((locale) => previousScenes.has(locale));
    if (!sharedLocales.length) return false;
    return sharedLocales.every((locale) => currentScenes.get(locale) !== previousScenes.get(locale));
  }
  const previousContexts = previousScenes.size ? [...new Set(previousScenes.values())] : [previousFacts.fallbackContext].filter(Boolean);
  const currentContexts = currentScenes.size ? [...new Set(currentScenes.values())] : [currentFacts.fallbackContext].filter(Boolean);
  if (!previousContexts.length || !currentContexts.length) return false;
  return currentContexts.every((context) => !previousContexts.includes(context));
}

function learnerHeardAudioDeclared(interaction) {
  const payload = interaction?.modePayload ?? {};
  if ((interaction?.audioTargetIds ?? []).length > 0 || (payload.audioTargetIds ?? []).length > 0) return true;
  return LEARNER_HEARD_AUDIO_FIELDS.some((field) => payload[field] != null);
}

function isIndependentShortReplyReassessment(previous, current, target) {
  if (current?.purpose !== "independent_check" || current?.family !== "context_gap_grammar") return false;
  if (normalizeSpace(current?.modePayload?.gappedTargetPhrase) !== "___") return false;
  const signature = finiteBeShortReplySignature(target);
  if (!signature || learnerHeardAudioDeclared(current)) return false;

  const visible = normalizedComparableText(visibleConditionValues(current).join(" "));
  if (visible.includes(normalizedComparableText(target))) return false;
  if (visibleFiniteBeShortReplySignatures(current)
    .some((candidate) => candidate.canonical === signature.canonical && candidate.polarity === signature.polarity)) return false;
  const previousFacts = explicitEnglishQuestionFacts(previous, signature);
  const currentFacts = explicitEnglishQuestionFacts(current, signature);
  if (!currentFacts.questions.size) return false;
  if ([...currentFacts.questions].some((question) => previousFacts.questions.has(question))) return false;
  return factualContextChanged(previousFacts, currentFacts);
}

export function familyChoreographyIssues(interactions, {
  source = "",
  newWords = [],
  answers = [],
  inactiveFamilies = [],
} = {}) {
  // `listen_choose` is a transport/input family, not always one learning
  // operation. A word card establishes meaning; a later choice among near
  // sounds tests phonetic discrimination. Treating those as identical made
  // the audit condemn a deliberate, useful sequence as a duplicate.
  const learningMechanic = (item) => {
    if (item?.family !== "listen_choose") return item?.family;
    if (item?.modePayload?.isWordCard === true) return "listen_word_meaning";
    if ((item?.responseOptions ?? []).length > 1 || (item?.modePayload?.choiceFeedback ?? []).length) return "listen_sound_choice";
    return "listen_choose";
  };
  const issues = [];
  const items = interactions ?? [];
  const answerById = new Map((answers ?? []).map((item) => [item.interactionId, item]));
  const inactive = new Set(inactiveFamilies ?? []);
  const resolved = items.map((item, index) => {
    const assessed = answerAwareAssessedTarget(item, answerById.get(item.interactionId));
    issues.push(...assessed.issues.map((issue) => ({ source, ...issue })));
    if (inactive.has(item.family)) {
      issues.push({ source, interactionId: item.interactionId, family: item.family, reason: "inactive_family" });
    }
    // A one-tile builder or dictation makes the learner press through a
    // labelled action without constructing or transcribing anything.  It is
    // not a smaller version of the exercise; it is a different, invalid
    // learner experience and must fail even when the word-contact count
    // happens to fail for another reason too.
    if (Array.isArray(item?.modePayload?.orderedTokens) && projectedBuilderCollapses(item)) {
      issues.push({ source, interactionId: item.interactionId, family: item.family, reason: "one_token_pseudo_action" });
    }
    return {
      item,
      index,
      target: assessed.target,
      wordFirstTargets: item.family === "speed_match"
        ? (item.modePayload?.pairGrid ?? []).map((pair) => normalizedExactPrimaryTarget(pair?.target)).filter(Boolean)
        : [assessed.target],
      eligibleWordFirstFamily: !inactive.has(item.family) && !projectedBuilderCollapses(item),
    };
  });
  const seen = new Map();
  const seenAcrossFamilies = new Map();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const mechanic = learningMechanic(item);
    // Consecutive word cards introduce different words and do not ask the
    // learner to repeat one response operation.  Treating the cards as a
    // repeated mechanic creates false quality holds for normal vocabulary
    // disclosure before the later discrimination/production exercises.
    const previous = items[index - 1];
    const distinctSpokenPhrases = mechanic === "scripted_repeat_compare"
      && normalizedComparableText(resolved[index - 1]?.target) !== normalizedComparableText(resolved[index]?.target);
    if (index > 0 && mechanic !== "listen_word_meaning" && !distinctSpokenPhrases && learningMechanic(previous) === mechanic) {
      issues.push({ source, interactionId: item.interactionId, previousInteractionId: items[index - 1].interactionId, family: mechanic, reason: "adjacent_family_repeat" });
    }
    const target = resolved[index].target;
    // A gap template is an exercise shape, not an assessed phrase.  Two
    // different correct words may legitimately share `It is ___`; comparing
    // the template falsely reports a duplicate answer.
    const repeatEligibleTarget = target && !String(target).includes("___") ? target : "";
    const key = `${mechanic}\u0000${repeatEligibleTarget}`;
    const sameFamilyContacts = repeatEligibleTarget ? (seen.get(key) ?? []) : [];
    const sameFamilyBlocker = sameFamilyContacts.find((previous) => !isIndependentShortReplyReassessment(previous.item, item, target));
    if (sameFamilyBlocker) issues.push({ source, interactionId: item.interactionId, previousInteractionId: sameFamilyBlocker.interactionId, family: mechanic, target, reason: "target_family_repeat" });
    if (repeatEligibleTarget) {
      sameFamilyContacts.push({ interactionId: item.interactionId, item });
      seen.set(key, sameFamilyContacts);
    }
    if (!isRequiredWordFirstContact(target, newWords)) {
      const previousContacts = seenAcrossFamilies.get(target) ?? [];
      const crossFamilyBlocker = previousContacts.find((previous) => previous.family !== item.family && !isIndependentShortReplyReassessment(previous.item, item, target) && !isContextualTargetReassessment(previous.item, item, target));
      if (crossFamilyBlocker) {
        issues.push({ source, interactionId: item.interactionId, previousInteractionId: crossFamilyBlocker.interactionId, family: item.family, previousFamily: crossFamilyBlocker.family, target, reason: "target_cross_family_repeat" });
      }
      previousContacts.push({ interactionId: item.interactionId, family: item.family, item });
      seenAcrossFamilies.set(target, previousContacts);
    }
  }
  const present = new Set(items.map((item) => item.family));
  for (const family of REQUIRED_ACTIVITY_FAMILIES) if (!present.has(family)) issues.push({ source, family, reason: "required_family_missing" });
  const stages = [];
  const normalizedNewWords = new Set((newWords ?? []).map(normalizedExactPrimaryTarget).filter(Boolean));
  const isSharedMeaningGrid = (entry) => entry.item.family === "speed_match"
    && normalizedNewWords.size > 0
    && [...normalizedNewWords].every((candidate) => entry.wordFirstTargets.includes(candidate));
  for (const rawWord of newWords ?? []) {
    const word = normalizedExactPrimaryTarget(rawWord);
    const contacts = resolved.filter((entry) => entry.eligibleWordFirstFamily && entry.wordFirstTargets.includes(word));
    const families = new Set(contacts.map((entry) => entry.item.family));
    const firstPhrase = resolved.find((entry) => entry.target !== word && containsExactLexicalSurface(entry.target, word));
    const initialContacts = firstPhrase ? contacts.filter((entry) => entry.index < firstPhrase.index) : contacts;
    const initialFamilies = new Set(initialContacts.map((entry) => entry.item.family));
    // После трёх разных первых контактов допустима ровно одна общая
    // таблица значений всех новых слов. Это не четвёртое «знакомство»,
    // а проверка соответствия слов и значений; одиночные повторы и две
    // такие таблицы по-прежнему блокируются.
    const sharedMeaningReinforcements = initialContacts.filter((entry, index) => index >= 3 && isSharedMeaningGrid(entry));
    const nonReinforcementContacts = initialContacts.filter((entry, index) => !(index >= 3 && isSharedMeaningGrid(entry)));
    if (nonReinforcementContacts.length > 3 || sharedMeaningReinforcements.length > 1) {
      issues.push({ source, word, contacts: initialContacts.length, families: [...initialFamilies], reason: "word_first_contact_overflow" });
    }
    if (initialContacts.length < 3 || initialFamilies.size < 3) {
      issues.push({ source, word, contacts: contacts.length, families: [...families], reason: "word_first_three_distinct_contacts_missing" });
      if (firstPhrase) {
        issues.push({
          source,
          word,
          interactionId: firstPhrase.item.interactionId,
          phraseIndex: firstPhrase.index,
          thirdContactIndex: contacts[2]?.index ?? null,
          reason: "word_first_phrase_before_three_contacts",
        });
      }
      continue;
    }
    stages.push(initialContacts.slice(0, 3).map((entry) => entry.index));
    const thirdContact = initialContacts[2].index;
    if (firstPhrase && firstPhrase.index < thirdContact) {
      issues.push({
        source,
        word,
        interactionId: firstPhrase.item.interactionId,
        phraseIndex: firstPhrase.index,
        thirdContactIndex: thirdContact,
        reason: "word_first_phrase_before_three_contacts",
      });
    }
  }
  if (stages.length > 1) {
    for (let stage = 0; stage < 2; stage += 1) {
      const currentMax = Math.max(...stages.map((entry) => entry[stage]));
      const nextMin = Math.min(...stages.map((entry) => entry[stage + 1]));
      if (currentMax >= nextMin) issues.push({ source, stage: stage + 1, reason: "word_first_stage_not_across_vocabulary" });
    }
  }
  return issues;
}

export function familyChoreographyRequiredForSession(sessionIdentity) {
  const factory = /^en\/l(\d{2})\/s(\d{2})$/u.exec(String(sessionIdentity ?? ""));
  const runtime = /^en:lesson-(\d{2}):session-(\d{2})$/u.exec(String(sessionIdentity ?? ""));
  const match = factory ?? runtime;
  if (!match) return false;
  const lesson = Number(match[1]);
  const session = Number(match[2]);
  return lesson === 4 || (lesson === 3 && session >= 25);
}

export function scopedFamilyChoreographyIssues(sessionIdentity, interactions, options = {}) {
  const isL4 = /^(?:en\/l04\/s\d{2}|en:lesson-04:session-\d{2})$/u.test(String(sessionIdentity ?? ""));
  return familyChoreographyRequiredForSession(sessionIdentity)
    ? familyChoreographyIssues(interactions, {
      ...options,
      inactiveFamilies: isL4
        ? [...new Set([...(options.inactiveFamilies ?? []), "sound_contrast"])]
        : options.inactiveFamilies,
    })
    : [];
}

// Cheap deterministic gate for the boundary immediately before LLM judges.
// It validates both the authored source and the exact runtime projection,
// because projection can collapse a one-token builder into spoken practice and
// thereby create an adjacent-family repeat that is invisible in source JSON.
export function preJudgeChoreographyIssues({
  sessionIdentity,
  interactionsByLocale,
  answers = [],
  newWords = [],
}) {
  const issues = [];
  for (const [locale, interactions] of Object.entries(interactionsByLocale ?? {})) {
    issues.push(...scopedFamilyChoreographyIssues(sessionIdentity, interactions, {
      source: `${sessionIdentity}:${locale}:source`,
      newWords,
      answers,
    }).map((issue) => ({ locale, stage: "source", ...issue })));
    try {
      const projected = projectSinglePhraseRelease({ interactions, answers, locale });
      issues.push(...scopedFamilyChoreographyIssues(sessionIdentity, projected.interactions, {
        source: `${sessionIdentity}:${locale}:projected`,
        newWords,
        answers: projected.answers,
      }).map((issue) => ({ locale, stage: "projected", ...issue })));
    } catch (error) {
      issues.push({
        locale,
        stage: "projection",
        reason: "single_phrase_projection_failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return issues;
}

export function projectSinglePhraseRelease({ interactions, answers, locale = "ru" }) {
  const answerById = new Map((answers ?? []).map((item) => [item.interactionId, item]));
  const outputInteractions = [];
  const outputAnswers = [];
  for (const interaction of interactions ?? []) {
    if (promptTargetLeak(interaction)) {
      throw new Error(`single_phrase_projection_hold:${interaction.interactionId}:prompt_target_leak`);
    }
    const answer = answerById.get(interaction.interactionId) ?? projectedAnswer(interaction.interactionId);
    const projected = projectOne(interaction, answer);
    if (projected.interactions.length > 1 || projected.interactions.some((item) => item.family !== interaction.family || item.inputMode !== interaction.inputMode)) {
      projected.interactions.forEach((item, index) => {
        if (item.family === "scripted_repeat_compare") return;
        const prompt = atomicStepPrompt(item, index, projected.interactions.length, locale);
        item.prompt = prompt;
        item.accessibilityLabel = prompt;
      });
    }
    outputInteractions.push(...projected.interactions);
    outputAnswers.push(...projected.answers);
  }
  outputInteractions.forEach((interaction, index) => { interaction.ordinal = index + 4; });
  const allowLocalizedChoiceText = locale !== "ru";
  const materializedAnswers = outputAnswers.map((answer, index) => materializeAnswer(outputInteractions[index], answer, { allowLocalizedChoiceText }));
  const issues = singlePhraseReleaseIssues(outputInteractions);
  if (issues.length) {
    const first = issues[0];
    throw new Error(`single_phrase_projection_hold:${first.interactionId}:${first.field}:${first.reason ?? "remaining_multi_sentence"}`);
  }
  const gapIssues = compositeGapReleaseIssues(outputInteractions);
  if (gapIssues.length) {
    const first = gapIssues[0];
    throw new Error(`single_phrase_projection_hold:${first.interactionId}:composite_gap_remaining`);
  }
  const dictationIssues = dictationAudioTargetIssues(outputInteractions);
  if (dictationIssues.length) {
    const first = dictationIssues[0];
    throw new Error(`single_phrase_projection_hold:${first.interactionId}:dictation_audio_target_alignment`);
  }
  const answerIssues = answerContractIssues(outputInteractions, materializedAnswers, "", { allowLocalizedChoiceText });
  if (answerIssues.length) {
    const first = answerIssues[0];
    throw new Error(`single_phrase_projection_hold:${first.interactionId}:${first.reason}`);
  }
  const preservation = buildPreservationLedger(interactions, outputInteractions, materializedAnswers);
  if (preservation.issues.length) {
    const first = preservation.issues[0];
    throw new Error(`single_phrase_projection_hold:${first.oldInteractionId ?? first.newInteractionId}:${first.reason}`);
  }
  return { interactions: outputInteractions, answers: materializedAnswers, preservationLedger: preservation.rows };
}

function learnerFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/^learner(?:\.[a-z]{2})?\.json$/u.test(entry.name)) files.push(full);
    }
  };
  visit(root);
  return files.sort();
}

function introFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name === "intro.json") files.push(full);
    }
  };
  visit(root);
  return files.sort();
}

export function auditSinglePhraseRelease(root = DEFAULT_RELEASE) {
  const files = learnerFiles(root);
  const intros = introFiles(root);
  const issues = [];
  let interactionCount = 0;
  const compositeGapIssues = [];
  const dictationIssues = [];
  const answerIssues = [];
  const preservationIssues = [];
  const feedbackLocaleParity = [];
  for (const file of intros) {
    const child = JSON.parse(fs.readFileSync(file, "utf8"));
    const relative = path.relative(root, file).replace(/\\/gu, "/");
    issues.push(...singlePhraseIntroIssues(child, relative));
  }
  for (const file of files) {
    const child = JSON.parse(fs.readFileSync(file, "utf8"));
    const relative = path.relative(root, file).replace(/\\/gu, "/");
    interactionCount += child.interactions?.length ?? 0;
    issues.push(...singlePhraseReleaseIssues(child.interactions ?? [], relative));
    compositeGapIssues.push(...compositeGapReleaseIssues(child.interactions ?? [], relative));
    dictationIssues.push(...dictationAudioTargetIssues(child.interactions ?? [], relative));
    if (path.basename(file) === "learner.json") {
      const answerFile = path.join(path.dirname(file), "answers.json");
      if (!fs.existsSync(answerFile)) {
        answerIssues.push({ source: relative, interactionId: null, family: null, reason: "answers_file_missing" });
      } else {
        const answers = JSON.parse(fs.readFileSync(answerFile, "utf8"));
        answerIssues.push(...answerContractIssues(child.interactions ?? [], answers, relative));
        try {
          const projected = projectSinglePhraseRelease({ interactions: child.interactions ?? [], answers });
          preservationIssues.push(...preservationLedgerIssues({
            sourceInteractions: child.interactions ?? [],
            projectedInteractions: projected.interactions,
            projectedAnswers: projected.answers,
            ledger: projected.preservationLedger,
          }).map((issue) => ({ source: relative, ...issue })));
        } catch (error) {
          preservationIssues.push({ source: relative, reason: "projection_failed", error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
  }
  for (const file of files.filter((candidate) => path.basename(candidate) === "learner.json")) {
    const directory = path.dirname(file);
    const relative = path.relative(root, file).replace(/\\/gu, "/");
    const interactionsByLocale = { ru: JSON.parse(fs.readFileSync(file, "utf8")).interactions ?? [] };
    for (const sibling of files.filter((candidate) => path.dirname(candidate) === directory && path.basename(candidate) !== "learner.json")) {
      const locale = /^learner\.([a-z]{2}(?:-[A-Z]{2})?)\.json$/u.exec(path.basename(sibling))?.[1];
      if (locale) interactionsByLocale[locale] = JSON.parse(fs.readFileSync(sibling, "utf8")).interactions ?? [];
    }
    const answerFile = path.join(directory, "answers.json");
    const answers = fs.existsSync(answerFile) ? JSON.parse(fs.readFileSync(answerFile, "utf8")) : [];
    feedbackLocaleParity.push(...feedbackLocaleParityIssues(interactionsByLocale, { answers }).map((issue) => ({ source: relative, ...issue })));
  }
  return {
    root,
    fileCount: files.length,
    introFileCount: intros.length,
    interactionCount,
    violationCount: issues.length,
    compositeGapAnswers: compositeGapIssues.length,
    dictationAudioMismatches: dictationIssues.length,
    answerContractViolations: answerIssues.length,
    emptyCorrectText: answerIssues.filter((issue) => issue.reason === "empty_correct_text").length,
    preservationLedgerViolations: preservationIssues.length,
    feedbackLocaleParityViolations: feedbackLocaleParity.length,
    issues,
    compositeGapIssues,
    dictationIssues,
    answerIssues,
    preservationIssues,
    feedbackLocaleParity,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_RELEASE;
  try {
    const report = auditSinglePhraseRelease(root);
    console.log(JSON.stringify(report, null, 2));
    if (report.violationCount || report.compositeGapAnswers || report.dictationAudioMismatches || report.answerContractViolations || report.preservationLedgerViolations || report.feedbackLocaleParityViolations) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ root, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 2;
  }
}
