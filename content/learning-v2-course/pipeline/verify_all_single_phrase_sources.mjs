#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import {
  answerContractIssues,
  compositeGapReleaseIssues,
  dictationAudioTargetIssues,
  feedbackLocaleParityIssues,
  preservationLedgerIssues,
  introPracticeTargetRepeatIssues,
  practiceTargetRepeatIssues,
  scopedFamilyChoreographyIssues,
  singlePhraseReleaseIssues,
  wordCardDefinitionIssues,
} from "./single_phrase_release.mjs";
import { parseSessionHeader } from "./session_header.mjs";
import { strictProjectionContractIssues } from "./prejudge_choreography.mjs";
import { isSinglePhraseMigrationLesson } from "./single_phrase_scope.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const PROJECT = path.resolve(ROOT, "..", "..");
const { projectLearnerVisiblePromptV1 } = createRequire(import.meta.url)(
  path.resolve(PROJECT, "modules/learning-v2/content/learner_visible_text_v1.js"),
);
const BUILD_ALL = process.argv.includes("--build-all");
const sha = (value) => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function markdownPracticeRows(markdown) {
  const practice = (markdown.split(/^##\s*[ИІ]нтро\s*3[^\n]*$/mi)[1] ?? markdown)
    .split(/^##\s+(?!Для сборщика)/m)[1]?.split(/^## Для сборщика/m)[0] ?? "";
  return practice.split(/^\*\*(?=\d+ · )/m).slice(1).map((chunk) => {
    const heading = /^(\d+) · ([^*]+)\*\*/u.exec(chunk);
    return {
      ordinal: Number(heading?.[1]),
      prompt: heading?.[2]?.trim() ?? "",
      interactionId: /<!--\s*interaction_id:\s*([^;]+);/u.exec(chunk)?.[1]?.trim() ?? "",
    };
  });
}

function markdownIntroAssessment(markdown, courseSessionId) {
  const blocks = markdown.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/gmi).slice(1, 4);
  return {
    pages: blocks.map((block, index) => ({
      pageId: `${courseSessionId}:intro${index + 1}`,
      question: {
        choicesByLocale: {
          ru: [...block.matchAll(/^-\s+✅\s+\*\*(.+?)\*\*\s*$/gmu)].slice(0, 1).map((match) => ({ text: match[1] })),
        },
      },
    })),
  };
}

const evidenceRoot = path.join(ROOT, "migration", "single-phrase-2026-10-03");
const before = readJson(path.join(evidenceRoot, "before-source-audit.json"));
const ledger = readJson(path.join(evidenceRoot, "preservation-ledger.json"));
if (ledger.beforeAuditSha256 !== sha(before)) throw new Error("single_phrase_all_source_hold:before_audit_hash");
if (ledger.rowCount !== ledger.rows.length) throw new Error("single_phrase_all_source_hold:ledger_row_count");

const beforeById = new Map(before.sessions.map((entry) => [entry.snapshot.courseSessionId, entry.snapshot]));
const ledgerById = new Map();
for (const row of ledger.rows) {
  if (!ledgerById.has(row.courseSessionId)) ledgerById.set(row.courseSessionId, []);
  const { courseSessionId: ignored, ...plain } = row;
  ledgerById.get(row.courseSessionId).push(plain);
}

const sidecars = [];
for (const lesson of fs.readdirSync(path.join(ROOT, "sessions", "en")).filter(isSinglePhraseMigrationLesson).sort()) {
  const lessonDir = path.join(ROOT, "sessions", "en", lesson);
  for (const session of fs.readdirSync(lessonDir).filter((name) => /^s\d{2}$/u.test(name)).sort()) {
    const file = path.join(lessonDir, session, "practice.atomic.json");
    if (fs.existsSync(path.join(lessonDir, session, "final.ru.md"))) {
      if (!fs.existsSync(file)) throw new Error(`single_phrase_all_source_hold:sidecar_missing:en/${lesson}/${session}`);
      sidecars.push({ lesson, session, file, value: readJson(file) });
    }
  }
}

let interactions = 0;
let preservationRows = 0;
for (const entry of sidecars) {
  const source = entry.value;
  const ru = source.interactionsByLocale?.ru ?? [];
  const uk = source.interactionsByLocale?.uk ?? [];
  const answers = source.answers ?? [];
  const sessionIdentity = `en/${entry.lesson}/${entry.session}`;
  const markdownByLocale = Object.fromEntries(["ru", "uk"].map((locale) => [
    locale,
    fs.readFileSync(path.join(path.dirname(entry.file), `final.${locale}.md`), "utf8"),
  ]));
  const guardianFile = path.join(path.dirname(entry.file), "preauthoring.json");
  let guardianNewWords = null;
  if (fs.existsSync(guardianFile)) {
    const guardian = readJson(guardianFile);
    guardianNewWords = Array.isArray(guardian?.newWords) ? guardian.newWords : [];
  }
  const strictContract = strictProjectionContractIssues({
    sessionIdentity,
    sessionId: source.courseSessionId,
    atomicSource: source,
    markdownByLocale,
    guardianNewWords,
  });
  if (strictContract.issues.length) {
    throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:strict_projection_contract:${JSON.stringify(strictContract.issues[0])}`);
  }
  for (const [locale, items] of [["ru", ru], ["uk", uk]]) {
    const markdown = markdownByLocale[locale];
    const issues = [
      ...singlePhraseReleaseIssues(items, `${source.courseSessionId}:${locale}`),
      ...compositeGapReleaseIssues(items, `${source.courseSessionId}:${locale}`),
      ...dictationAudioTargetIssues(items, `${source.courseSessionId}:${locale}`),
    ];
    if (issues.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:${JSON.stringify(issues[0])}`);
    const newWords = parseSessionHeader(markdown).newWords;
    const introPracticeRepeats = introPracticeTargetRepeatIssues(markdownIntroAssessment(markdown, source.courseSessionId), items, { source: `${source.courseSessionId}:${locale}`, newWords });
    if (introPracticeRepeats.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:intro_practice_target_repeat:${JSON.stringify(introPracticeRepeats[0])}`);
    const practiceRepeats = practiceTargetRepeatIssues(items, { source: `${source.courseSessionId}:${locale}`, newWords });
    if (practiceRepeats.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:practice_target_cross_family_repeat:${JSON.stringify(practiceRepeats[0])}`);
    const choreography = scopedFamilyChoreographyIssues(source.courseSessionId, items, {
      source: `${source.courseSessionId}:${locale}`,
      newWords,
      answers,
    });
    if (choreography.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:family_choreography:${JSON.stringify(choreography[0])}`);
    const splitPromptActions = locale === "uk"
      ? { scripted_repeat_compare: /(?:промов|скаж|повтор)/iu, phrase_builder: /склад/iu, listen_build_dictation: /(?:послух|склад)/iu, context_gap_grammar: /встав/iu, listen_choose: /послух/iu }
      : { scripted_repeat_compare: /(?:произнес|скаж|повтор)/iu, phrase_builder: /собер/iu, listen_build_dictation: /(?:послуш|собер)/iu, context_gap_grammar: /встав/iu, listen_choose: /послуш/iu };
    const promptMismatch = items.find((item) => /:s\d{2}$/u.test(item.interactionId) && splitPromptActions[item.family] && !splitPromptActions[item.family].test(String(item.prompt ?? "")));
    if (promptMismatch) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:prompt_family:${promptMismatch.interactionId}`);
    const spokenPromptMismatch = items.find((item) => item.family === "scripted_repeat_compare" &&
      !(locale === "uk" ? /(?:промов|скаж|повтор)/iu : /(?:произнес|скаж|повтор)/iu).test(item.prompt ?? ""));
    if (spokenPromptMismatch) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:spoken_prompt_action:${spokenPromptMismatch.interactionId}`);
  }
  if (ru.length !== uk.length || ru.some((item, index) => item.interactionId !== uk[index]?.interactionId || item.family !== uk[index]?.family)) {
    throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:locale_shape`);
  }
  const feedbackParity = feedbackLocaleParityIssues({ ru, uk }, { answers });
  if (feedbackParity.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:feedback_locale_parity:${JSON.stringify(feedbackParity[0])}`);
  const wordCardDefinitions = wordCardDefinitionIssues({ ru, uk }, source.courseSessionId);
  if (wordCardDefinitions.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:word_card_definition:${JSON.stringify(wordCardDefinitions[0])}`);
  const leakedPrompt = uk.find((item, index) => /[А-Яа-яЁё]/u.test(item.prompt ?? "") && item.prompt === ru[index]?.prompt);
  if (leakedPrompt) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:uk_prompt_matches_ru:${leakedPrompt.interactionId}`);
  for (const [locale, items] of [["ru", ru], ["uk", uk]]) {
    const markdownFile = path.join(path.dirname(entry.file), `final.${locale}.md`);
    const rows = markdownPracticeRows(fs.readFileSync(markdownFile, "utf8"));
    const mismatch = items.findIndex((item, index) => {
      const answer = answers.find((entry) => entry.interactionId === item.interactionId)?.correctText ??
        item.modePayload?.wordCard?.word ?? item.modePayload?.targetPhrase ?? "";
      const prompt = projectLearnerVisiblePromptV1({
        title: rows[index]?.prompt ?? "",
        family: item.family,
        correctText: answer,
        isWordCard: Boolean(item.modePayload?.wordCard),
      });
      return rows[index]?.ordinal !== index + 1 || rows[index]?.interactionId !== item.interactionId || prompt !== item.prompt;
    });
    if (mismatch >= 0 || rows.length !== items.length) {
      throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:markdown_atomic_parity:${mismatch}`);
    }
  }
  const answerIssues = answerContractIssues(ru, answers, source.courseSessionId);
  if (answerIssues.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:answers:${JSON.stringify(answerIssues[0])}`);
  const snapshot = beforeById.get(source.courseSessionId);
  const allRows = ledgerById.get(source.courseSessionId) ?? [];
  if (!snapshot || !allRows.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:preservation_evidence_missing`);
  for (const [locale, projected] of [["ru", ru], ["uk", uk]]) {
    const rows = allRows
      .filter((item) => !item.locale || item.locale === locale)
      .map(({ courseSessionId: ignoredCourseSessionId, locale: ignoredLocale, ...item }) => item);
    const issues = preservationLedgerIssues({
      sourceInteractions: snapshot.interactionsByLocale?.[locale] ?? [],
      projectedInteractions: projected,
      projectedAnswers: answers,
      ledger: rows,
      amendments: (ledger.amendments ?? []).filter((item) => item.courseSessionId === source.courseSessionId && (!item.locale || item.locale === locale)),
    });
    if (issues.length) throw new Error(`single_phrase_all_source_hold:${source.courseSessionId}:${locale}:preservation:${JSON.stringify(issues[0])}`);
  }
  interactions += ru.length;
  preservationRows += allRows.length;
}

let built = 0;
let outputRoot = null;
if (BUILD_ALL) {
  const parent = path.join(PROJECT, ".codex-tmp");
  fs.mkdirSync(parent, { recursive: true });
  outputRoot = fs.mkdtempSync(path.join(parent, "single-phrase-all-build-"));
  for (const entry of sidecars) {
    const sessionKey = `en/${entry.lesson}/${entry.session}`;
    const result = spawnSync(process.execPath, [
      path.join(HERE, "build_release.mjs"),
      "--session", sessionKey,
      "--locales", "ru,uk",
      "--out", outputRoot,
    ], { cwd: PROJECT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    if (result.status !== 0) throw new Error(`single_phrase_all_source_hold:${sessionKey}:private_build:${result.stderr || result.stdout}`);
    built += 1;
  }
}

console.log(JSON.stringify({
  verdict: "PASS",
  sessions: sidecars.length,
  interactions,
  preservationRows,
  preservationViolations: 0,
  built,
  outputRoot,
}));
