#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SESSIONS_ROOT = path.resolve(HERE, "..", "sessions", "en");
const LESSON_SESSION_COUNTS = Object.freeze({ l01: 56, l02: 56, l03: 56, l04: 18 });

export const FACTORY_ENGLISH_SESSION_INVENTORY = Object.freeze(
  Object.entries(LESSON_SESSION_COUNTS).flatMap(([lesson, count]) =>
    Array.from({ length: count }, (_, index) => Object.freeze({
      lesson,
      session: `s${String(index + 1).padStart(2, "0")}`,
    }))),
);

const EXACT_TARGET_FAMILIES = Object.freeze([
  "context_gap_grammar",
  "listen_build_dictation",
  "listen_choose",
  "phrase_builder",
  "scripted_repeat_compare",
  "sound_contrast",
  "speed_match",
]);
const ALLOWED_PRACTICE_PURPOSES = new Set([
  "supported_practice",
  "guided_practice",
  "retrieval_practice",
  "independent_check",
  "independent_final",
]);

export function cleanFactoryExactTarget(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function finding(sessionIdentity, code, details = {}) {
  return { sessionIdentity, code, ...details };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([value]) => value);
}

function stripIntroAnswer(raw) {
  let value = String(raw ?? "").trim();
  value = value.split(/\s+—\s+\*/u, 1)[0].trim();
  while ((value.startsWith("**") && value.endsWith("**")) ||
    (value.startsWith("__") && value.endsWith("__")) ||
    (value.startsWith("`") && value.endsWith("`"))) {
    value = value.slice(value.startsWith("`") ? 1 : 2, value.endsWith("`") ? -1 : -2).trim();
  }
  return cleanFactoryExactTarget(value);
}

function introTargets(markdown, { sessionIdentity, locale }) {
  const findings = [];
  const text = String(markdown ?? "");
  const headings = [...text.matchAll(/^##\s*(?:Интро|Інтро|Вступ)\s*(\d+)\b[^\n]*$/gmi)];
  const sectionHeadings = [...text.matchAll(/^##\s+[^#\n].*$/gmu)];
  const pages = new Map();
  for (let index = 0; index < headings.length; index += 1) {
    const page = Number(headings[index][1]);
    const start = headings[index].index + headings[index][0].length;
    const end = sectionHeadings.find((heading) => heading.index > headings[index].index)?.index ?? text.length;
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page).push(text.slice(start, end));
  }
  const targets = [];
  for (const page of [1, 2, 3]) {
    const blocks = pages.get(page) ?? [];
    if (blocks.length !== 1) {
      findings.push(finding(sessionIdentity, "intro_page_count", { locale, page, actual: blocks.length, expected: 1 }));
      targets.push(null);
      continue;
    }
    const markers = [...blocks[0].matchAll(/^-\s*✅\s+(.+)$/gmu)].map((match) => stripIntroAnswer(match[1]));
    if (markers.length !== 1 || !markers[0]) {
      findings.push(finding(sessionIdentity, "intro_answer_marker_count", { locale, page, actual: markers.length, expected: 1 }));
      targets.push(null);
      continue;
    }
    targets.push(markers[0]);
  }
  const unexpected = headings.filter((match) => ![1, 2, 3].includes(Number(match[1])));
  if (unexpected.length) findings.push(finding(sessionIdentity, "unexpected_intro_page", { locale, pages: unexpected.map((match) => Number(match[1])) }));
  return { targets, findings };
}

function exactText(value, expected) {
  return cleanFactoryExactTarget(value) === cleanFactoryExactTarget(expected);
}

function requireExact({ findings, sessionIdentity, locale, interactionId, field, actual, expected }) {
  if (!exactText(actual, expected)) {
    findings.push(finding(sessionIdentity, "answer_authority_mismatch", {
      locale, interactionId, field,
      actual: cleanFactoryExactTarget(actual),
      expected: cleanFactoryExactTarget(expected),
    }));
    return false;
  }
  return true;
}

function selectedResponseAuthority({ item, answer, locale, sessionIdentity, findings, verifyCorrectText = true }) {
  const interactionId = cleanFactoryExactTarget(item?.interactionId);
  const responseId = cleanFactoryExactTarget(answer?.correctResponseId);
  const options = Array.isArray(item?.responseOptions) ? item.responseOptions : [];
  const matches = options.filter((option) => cleanFactoryExactTarget(option?.responseId) === responseId);
  if (!responseId || matches.length !== 1) {
    findings.push(finding(sessionIdentity, "ambiguous_selected_response_authority", {
      locale, interactionId, correctResponseId: responseId, matches: matches.length,
    }));
    return null;
  }
  const selectedText = cleanFactoryExactTarget(matches[0]?.text);
  if (!selectedText || (verifyCorrectText && !exactText(answer?.correctText, selectedText))) {
    findings.push(finding(sessionIdentity, "selected_response_text_mismatch", {
      locale, interactionId, correctResponseId: responseId,
      selectedText, correctText: cleanFactoryExactTarget(answer?.correctText),
    }));
    return null;
  }
  return selectedText;
}

function extractPracticeTargets({ item, answer, locale, sessionIdentity, findings }) {
  const interactionId = cleanFactoryExactTarget(item?.interactionId);
  const payload = item?.modePayload ?? {};
  const family = item?.family;
  const authority = cleanFactoryExactTarget(answer?.correctText);
  const base = { findings, sessionIdentity, locale, interactionId };
  if (!EXACT_TARGET_FAMILIES.includes(family)) {
    findings.push(finding(sessionIdentity, "unknown_practice_family", { locale, interactionId, family: String(family ?? "") }));
    return [];
  }
  if (family === "listen_choose") {
    const target = cleanFactoryExactTarget(payload.referenceAudio?.transcript);
    if (payload.isWordCard) {
      const word = cleanFactoryExactTarget(payload.wordCard?.word);
      if (!target || !word || target !== word) findings.push(finding(sessionIdentity, "word_card_target_mismatch", { locale, interactionId, target, word }));
      if (authority && authority !== word) findings.push(finding(sessionIdentity, "word_card_answer_authority_mismatch", { locale, interactionId, target: word, correctText: authority }));
      const responseId = cleanFactoryExactTarget(answer?.correctResponseId);
      if (responseId) {
        const choices = Array.isArray(payload.localizedMeaningChoices) ? payload.localizedMeaningChoices : [];
        const matches = choices.filter((choice) => cleanFactoryExactTarget(choice?.responseId) === responseId && cleanFactoryExactTarget(choice?.targetText) === word);
        if (matches.length !== 1) findings.push(finding(sessionIdentity, "word_card_response_authority_mismatch", { locale, interactionId, responseId, matches: matches.length }));
      }
      return target ? [target] : [];
    }
    const selected = selectedResponseAuthority({ item, answer, locale, sessionIdentity, findings, verifyCorrectText: false });
    const responseId = cleanFactoryExactTarget(answer?.correctResponseId);
    const meaningMatches = (Array.isArray(payload.localizedMeaningChoices) ? payload.localizedMeaningChoices : [])
      .filter((choice) => cleanFactoryExactTarget(choice?.responseId) === responseId && cleanFactoryExactTarget(choice?.targetText) === selected);
    if (meaningMatches.length !== 1) {
      findings.push(finding(sessionIdentity, "listen_choice_target_mismatch", { locale, interactionId, responseId, target, matches: meaningMatches.length }));
      return [];
    }
    return target && selected ? [target] : [];
  }
  if (family === "phrase_builder") {
    const target = cleanFactoryExactTarget(payload.targetPhrase);
    return target && requireExact({ ...base, field: "targetPhrase", actual: authority, expected: target }) ? [target] : [];
  }
  if (family === "scripted_repeat_compare") {
    const target = cleanFactoryExactTarget(payload.targetPhrase);
    const transcript = cleanFactoryExactTarget(payload.referenceAudio?.transcript);
    if (target && transcript && !exactText(target, transcript)) findings.push(finding(sessionIdentity, "target_audio_mismatch", { locale, interactionId, target, transcript }));
    return target && requireExact({ ...base, field: "targetPhrase", actual: authority, expected: target }) ? [target] : [];
  }
  if (family === "listen_build_dictation") {
    const target = cleanFactoryExactTarget(payload.hiddenTargetPhrase);
    const transcript = cleanFactoryExactTarget(payload.referenceAudio?.transcript);
    if (target && transcript && !exactText(target, transcript)) findings.push(finding(sessionIdentity, "target_audio_mismatch", { locale, interactionId, target, transcript }));
    return target && requireExact({ ...base, field: "hiddenTargetPhrase", actual: authority, expected: target }) ? [target] : [];
  }
  if (family === "sound_contrast") {
    const contrastA = cleanFactoryExactTarget(payload.contrastA);
    const contrastB = cleanFactoryExactTarget(payload.contrastB);
    const selected = selectedResponseAuthority({ item, answer, locale, sessionIdentity, findings });
    if (!selected || (selected !== contrastA && selected !== contrastB)) {
      if (selected) findings.push(finding(sessionIdentity, "sound_contrast_selection_mismatch", { locale, interactionId, selected, contrastA, contrastB }));
      return [];
    }
    const selectedTranscript = cleanFactoryExactTarget(selected === contrastA
      ? (payload.audioA?.transcript ?? payload.referenceAudioA?.transcript)
      : (payload.audioB?.transcript ?? payload.referenceAudioB?.transcript));
    if (selectedTranscript !== selected) {
      findings.push(finding(sessionIdentity, "sound_contrast_audio_mismatch", { locale, interactionId, selected, transcript: selectedTranscript }));
      return [];
    }
    return [selected];
  }
  if (family === "context_gap_grammar") {
    const gapped = cleanFactoryExactTarget(payload.gappedTargetPhrase);
    const blankCount = (gapped.match(/___/gu) ?? []).length;
    const options = Array.isArray(payload.gapOptions) ? payload.gapOptions : [];
    const optionMatches = options.filter((option) => option?.responseId === answer?.correctResponseId && exactText(option?.text, authority));
    const responseMatches = (Array.isArray(item?.responseOptions) ? item.responseOptions : [])
      .filter((option) => option?.responseId === answer?.correctResponseId && exactText(option?.text, authority));
    if (responseMatches.length !== 1 || optionMatches.length !== 1 || !exactText(responseMatches[0]?.text, optionMatches[0]?.text)) {
      findings.push(finding(sessionIdentity, "context_gap_response_authority_mismatch", {
        locale, interactionId, responseMatches: responseMatches.length, gapMatches: optionMatches.length,
      }));
    }
    if (blankCount !== 1 || !authority || optionMatches.length !== 1 || responseMatches.length !== 1) {
      findings.push(finding(sessionIdentity, "ambiguous_context_gap_authority", { locale, interactionId, blankCount, optionMatches: optionMatches.length }));
      return [];
    }
    return [cleanFactoryExactTarget(gapped.replace("___", authority))];
  }
  const pairs = Array.isArray(payload.pairGrid) ? payload.pairGrid : [];
  const pairIds = pairs.map((pair) => cleanFactoryExactTarget(pair?.pairId));
  const duplicatePairIds = duplicateValues(pairIds.filter(Boolean));
  for (const pairId of duplicatePairIds) {
    findings.push(finding(sessionIdentity, "duplicate_pair_id", { locale, interactionId, pairId }));
  }
  const canonicalTargets = pairs.map((pair) => cleanFactoryExactTarget(pair?.target));
  if (!pairs.length || pairIds.some((pairId) => !pairId) || canonicalTargets.some((target) => !target) || duplicatePairIds.length) {
    findings.push(finding(sessionIdentity, "ambiguous_speed_match_authority", { locale, interactionId }));
    return [];
  }
  if (!authority) return canonicalTargets;
  const authorityRows = String(answer?.correctText ?? "").split(/\r?\n/u).filter((row) => row.trim()).map((row) => {
    const separator = row.indexOf("=");
    return separator < 1 ? null : { pairId: cleanFactoryExactTarget(row.slice(0, separator)), target: cleanFactoryExactTarget(row.slice(separator + 1)) };
  });
  if (authorityRows.some((row) => !row) || authorityRows.length !== pairs.length || duplicateValues(authorityRows.filter(Boolean).map((row) => row.pairId)).length) {
    findings.push(finding(sessionIdentity, "ambiguous_speed_match_authority", { locale, interactionId }));
    return [];
  }
  const rowById = new Map(authorityRows.map((row) => [row.pairId, row.target]));
  const targets = [];
  for (const pair of pairs) {
    const pairId = cleanFactoryExactTarget(pair?.pairId);
    const target = cleanFactoryExactTarget(pair?.target);
    if (!pairId || !target || !rowById.has(pairId) || !exactText(rowById.get(pairId), target)) {
      findings.push(finding(sessionIdentity, "speed_match_authority_mismatch", { locale, interactionId, pairId, target }));
      continue;
    }
    targets.push(target);
  }
  return targets;
}

function readText(file, sessionIdentity, code, findings) {
  try { return fs.readFileSync(file, "utf8"); }
  catch (error) {
    findings.push(finding(sessionIdentity, code, { file: path.basename(file), error: error.code ?? error.message }));
    return null;
  }
}

function readJson(file, sessionIdentity, findings) {
  const text = readText(file, sessionIdentity, "required_source_missing", findings);
  if (text === null) return null;
  try { return JSON.parse(text); }
  catch (error) {
    findings.push(finding(sessionIdentity, "practice_json_invalid", { error: error.message }));
    return null;
  }
}

function auditSession({ sessionsRoot, lesson, session }) {
  const sessionIdentity = `en/${lesson}/${session}`;
  const findings = [];
  const directory = path.join(sessionsRoot, lesson, session);
  const ruText = readText(path.join(directory, "final.ru.md"), sessionIdentity, "required_source_missing", findings);
  const ukText = readText(path.join(directory, "final.uk.md"), sessionIdentity, "required_source_missing", findings);
  const source = readJson(path.join(directory, "practice.atomic.json"), sessionIdentity, findings);
  const ruIntro = ruText === null ? { targets: [null, null, null], findings: [] } : introTargets(ruText, { sessionIdentity, locale: "ru" });
  const ukIntro = ukText === null ? { targets: [null, null, null], findings: [] } : introTargets(ukText, { sessionIdentity, locale: "uk" });
  findings.push(...ruIntro.findings, ...ukIntro.findings);
  for (const page of [1, 2, 3]) {
    const ru = ruIntro.targets[page - 1];
    const uk = ukIntro.targets[page - 1];
    if (ru && uk && ru !== uk) findings.push(finding(sessionIdentity, "intro_answer_locale_mismatch", { page, ru, uk }));
  }

  const practiceTargets = [];
  const families = new Set();
  if (source) {
    const expectedId = `en:lesson-${lesson.slice(1)}:session-${session.slice(1)}`;
    if (source.courseSessionId !== expectedId) findings.push(finding(sessionIdentity, "course_session_id_mismatch", { expected: expectedId, actual: source.courseSessionId ?? null }));
    const answers = Array.isArray(source.answers) ? source.answers : [];
    const answerGroups = new Map();
    const rawAnswerGroups = new Map();
    for (const answer of answers) {
      const id = cleanFactoryExactTarget(answer?.interactionId);
      if (!answerGroups.has(id)) answerGroups.set(id, []);
      answerGroups.get(id).push(answer);
      const rawId = typeof answer?.interactionId === "string" ? answer.interactionId : "";
      if (!rawAnswerGroups.has(rawId)) rawAnswerGroups.set(rawId, []);
      rawAnswerGroups.get(rawId).push(answer);
    }
    for (const [interactionId, group] of answerGroups) {
      if (!interactionId || group.length > 1) findings.push(finding(sessionIdentity, "duplicate_answer_id", { interactionId, count: group.length }));
    }
    const byLocale = source.interactionsByLocale ?? {};
    for (const locale of ["ru", "uk"]) {
      const items = Array.isArray(byLocale[locale]) ? byLocale[locale] : [];
      const ids = items.map((item) => cleanFactoryExactTarget(item?.interactionId));
      for (const interactionId of duplicateValues(ids.filter(Boolean))) {
        findings.push(finding(sessionIdentity, "duplicate_interaction_id", { locale, interactionId }));
      }
      for (const item of items) {
        const interactionId = cleanFactoryExactTarget(item?.interactionId);
        if (!ALLOWED_PRACTICE_PURPOSES.has(item?.purpose)) {
          findings.push(finding(sessionIdentity, "invalid_practice_purpose", {
            locale, interactionId: interactionId || null, purpose: item?.purpose ?? null,
          }));
        }
        const responseIds = (Array.isArray(item?.responseOptions) ? item.responseOptions : [])
          .map((option) => cleanFactoryExactTarget(option?.responseId));
        responseIds.forEach((responseId, optionIndex) => {
          if (!responseId) findings.push(finding(sessionIdentity, "missing_response_id", { locale, interactionId, optionIndex }));
        });
        for (const responseId of duplicateValues(responseIds)) {
          findings.push(finding(sessionIdentity, "duplicate_response_id", { locale, interactionId, responseId }));
        }
        const gapIds = (Array.isArray(item?.modePayload?.gapOptions) ? item.modePayload.gapOptions : [])
          .map((option) => cleanFactoryExactTarget(option?.responseId));
        gapIds.forEach((responseId, optionIndex) => {
          if (!responseId) findings.push(finding(sessionIdentity, "missing_gap_option_id", { locale, interactionId, optionIndex }));
        });
        for (const responseId of duplicateValues(gapIds)) {
          findings.push(finding(sessionIdentity, "duplicate_gap_option_id", { locale, interactionId, responseId }));
        }
      }
    }
    const ruItems = Array.isArray(byLocale.ru) ? byLocale.ru : [];
    const ukItems = Array.isArray(byLocale.uk) ? byLocale.uk : [];
    const rawIdCountsByLocale = new Map([["ru", new Map()], ["uk", new Map()]]);
    for (const [locale, items] of [["ru", ruItems], ["uk", ukItems]]) {
      const counts = rawIdCountsByLocale.get(locale);
      for (const item of items) {
        const rawId = typeof item?.interactionId === "string" ? item.interactionId : "";
        counts.set(rawId, (counts.get(rawId) ?? 0) + 1);
      }
    }
    const max = Math.max(ruItems.length, ukItems.length);
    for (let index = 0; index < max; index += 1) {
      const ru = ruItems[index];
      const uk = ukItems[index];
      if (!ru || !uk || ru.interactionId !== uk.interactionId || ru.family !== uk.family || ru.purpose !== uk.purpose) {
        findings.push(finding(sessionIdentity, "locale_interaction_shape_mismatch", {
          index, ruInteractionId: ru?.interactionId ?? null, ukInteractionId: uk?.interactionId ?? null,
        }));
      }
    }
    const localizedAnswerTextInvalidIds = new Set();
    for (const ruItem of ruItems) {
      if (ruItem?.family !== "listen_choose" || ruItem?.modePayload?.isWordCard) continue;
      const interactionId = cleanFactoryExactTarget(ruItem?.interactionId);
      const answerGroup = answerGroups.get(interactionId) ?? [];
      if (answerGroup.length !== 1) continue;
      const answer = answerGroup[0];
      const responseId = cleanFactoryExactTarget(answer?.correctResponseId);
      const ukItem = ukItems.find((candidate) => candidate?.interactionId === interactionId);
      const selectedTexts = [ruItem, ukItem].flatMap((item) => (item?.responseOptions ?? [])
        .filter((option) => cleanFactoryExactTarget(option?.responseId) === responseId)
        .map((option) => cleanFactoryExactTarget(option?.text)));
      if (!responseId || selectedTexts.length !== 2 || !selectedTexts.some((text) => exactText(text, answer?.correctText))) {
        localizedAnswerTextInvalidIds.add(interactionId);
        findings.push(finding(sessionIdentity, "localized_answer_text_mismatch", {
          interactionId, correctResponseId: responseId,
          correctText: cleanFactoryExactTarget(answer?.correctText), selectedTexts,
        }));
      }
    }
    for (const [locale, items] of [["ru", ruItems], ["uk", ukItems]]) {
      const seen = new Set();
      let independentCutoffSeen = false;
      let validIndependentBoundarySeen = false;
      const peerItems = locale === "ru" ? ukItems : ruItems;
      const ownRawIdCounts = rawIdCountsByLocale.get(locale);
      const peerRawIdCounts = rawIdCountsByLocale.get(locale === "ru" ? "uk" : "ru");
      const runtimeInteractionId = new RegExp(`^${expectedId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}:i\\d{2}(?::(?:s|a)\\d{2})?$`, "u");
      for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
        const item = items[itemIndex];
        const rawInteractionId = typeof item?.interactionId === "string" ? item.interactionId : "";
        const interactionId = cleanFactoryExactTarget(item?.interactionId);
        const validPurpose = ALLOWED_PRACTICE_PURPOSES.has(item?.purpose);
        const isIndependent = validPurpose && (item?.purpose === "independent_final" || item?.purpose === "independent_check");
        const answerGroup = answerGroups.get(interactionId) ?? [];
        const rawAnswerGroup = rawAnswerGroups.get(rawInteractionId) ?? [];
        const peerItem = peerItems[itemIndex];
        const boundaryLocaleAligned = Boolean(peerItem)
          && peerItem?.interactionId === rawInteractionId
          && peerItem?.family === item?.family
          && peerItem?.purpose === item?.purpose;
        let invalidBoundaryReason = null;
        if (isIndependent) {
          if (!rawInteractionId) invalidBoundaryReason = "missing_interaction_id";
          else if (!runtimeInteractionId.test(rawInteractionId)) invalidBoundaryReason = "invalid_raw_interaction_id";
          else if ((ownRawIdCounts.get(rawInteractionId) ?? 0) !== 1 || (peerRawIdCounts.get(rawInteractionId) ?? 0) !== 1) invalidBoundaryReason = "duplicate_interaction_id";
          else if (!boundaryLocaleAligned) invalidBoundaryReason = "locale_alignment";
          else if (rawAnswerGroup.length !== 1) invalidBoundaryReason = "answer_authority_count";
          else if (!cleanFactoryExactTarget(rawAnswerGroup[0]?.correctText)) invalidBoundaryReason = "missing_correct_text";
          else {
            const nativeFindings = [];
            const nativeTargets = extractPracticeTargets({
              item, answer: rawAnswerGroup[0], locale, sessionIdentity, findings: nativeFindings,
            });
            findings.push(...nativeFindings);
            if (!nativeTargets.length || nativeFindings.length || localizedAnswerTextInvalidIds.has(interactionId)) {
              invalidBoundaryReason = "family_native_authority";
            }
          }
          if (invalidBoundaryReason) {
            findings.push(finding(sessionIdentity, "invalid_independent_boundary", {
              locale, interactionId: interactionId || null, purpose: item?.purpose ?? null,
              reason: invalidBoundaryReason,
            }));
          }
        }
        const isFirstIndependent = isIndependent && !independentCutoffSeen;
        const followsIndependentBoundary = independentCutoffSeen && !isIndependent;
        if (isIndependent) independentCutoffSeen = true;
        if (isFirstIndependent && !invalidBoundaryReason) validIndependentBoundarySeen = true;
        if (followsIndependentBoundary) {
          findings.push(finding(sessionIdentity, "practice_after_independent_boundary", {
            locale, interactionId: interactionId || null, purpose: item?.purpose ?? null,
          }));
        }
        if (!interactionId || seen.has(interactionId)) continue;
        seen.add(interactionId);
        if (answerGroup.length !== 1) {
          findings.push(finding(sessionIdentity, "answer_authority_count", { locale, interactionId, actual: answerGroup.length, expected: 1 }));
          continue;
        }
        if (!validPurpose) continue;
        if (isIndependent) continue;
        if (followsIndependentBoundary) continue;
        families.add(String(item?.family ?? ""));
        const targets = extractPracticeTargets({ item, answer: answerGroup[0], locale, sessionIdentity, findings });
        if (locale === "ru") practiceTargets.push(...targets);
        else {
          const ruItem = ruItems.find((candidate) => candidate?.interactionId === interactionId);
          if (ruItem) {
            const ruTargets = extractPracticeTargets({ item: ruItem, answer: answerGroup[0], locale: "ru-parity", sessionIdentity, findings: [] });
            if (targets.length !== ruTargets.length || targets.some((target, targetIndex) => target !== ruTargets[targetIndex])) {
              findings.push(finding(sessionIdentity, "practice_target_locale_mismatch", { interactionId, ru: ruTargets, uk: targets }));
            }
          }
        }
      }
      if (!validIndependentBoundarySeen) findings.push(finding(sessionIdentity, "independent_boundary_missing", { locale }));
    }
  }

  const practiceSet = new Set(practiceTargets);
  for (let index = 0; index < ruIntro.targets.length; index += 1) {
    const target = ruIntro.targets[index];
    if (target && ukIntro.targets[index] === target && !practiceSet.has(target)) {
      findings.push(finding(sessionIdentity, "intro_target_not_practiced", { page: index + 1, target }));
    }
  }
  return {
    sessionIdentity,
    introTargetCount: ruIntro.targets.filter(Boolean).length,
    practiceTargetCount: practiceTargets.length,
    families: [...families].filter(Boolean).sort(),
    findingCount: findings.length,
    findings,
  };
}

export function auditFactoryIntroPractice({
  sessionsRoot = DEFAULT_SESSIONS_ROOT,
  inventory = FACTORY_ENGLISH_SESSION_INVENTORY,
} = {}) {
  const perSession = inventory.map(({ lesson, session }) => auditSession({ sessionsRoot, lesson, session }));
  const findings = perSession.flatMap((entry) => entry.findings);
  return {
    schemaVersion: "learning_v2_factory_intro_practice_gate_v1",
    verdict: findings.length ? "HOLD" : "PASS",
    inventoryCount: inventory.length,
    auditedSessionCount: perSession.length,
    findingCount: findings.length,
    perSession: perSession.map(({ findings: ignored, ...entry }) => entry),
    findings,
  };
}

function main() {
  const index = process.argv.indexOf("--sessions-root");
  const sessionsRoot = index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]) : DEFAULT_SESSIONS_ROOT;
  const report = auditFactoryIntroPractice({ sessionsRoot });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.verdict !== "PASS") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
