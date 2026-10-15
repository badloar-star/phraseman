#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseIntro } from "./build_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const ROOT = path.resolve(option("root", DEFAULT_ROOT));
const SCOPE = option("scope", "").replaceAll("\\", "/").replace(/^\/+|\/+$/gu, "");
const JSON_OUTPUT = args.includes("--json");
const REQUIRED_LOCALES = ["ru", "uk"];
const CATEGORY_ORDER = new Map([["source", 0], ["release", 1], ["mockup", 2]]);

const relative = (file) => path.relative(ROOT, file).replaceAll("\\", "/");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const exists = (file) => fs.existsSync(file) && fs.statSync(file).isFile();
const sessionIdFor = (scope) => {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(scope);
  return match ? `${match[1]}:lesson-${match[2]}:session-${match[3]}` : null;
};

function collectSessionScopes(base) {
  if (SCOPE) return [SCOPE];
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const language of fs.readdirSync(base, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const languageDir = path.join(base, language.name);
    for (const lesson of fs.readdirSync(languageDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
      const lessonDir = path.join(languageDir, lesson.name);
      for (const session of fs.readdirSync(lessonDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
        const scope = `${language.name}/${lesson.name}/${session.name}`;
        if (sessionIdFor(scope)) out.push(scope);
      }
    }
  }
  return out.sort();
}

function issue(category, file, responseId, reason, extra = {}) {
  return { category, path: relative(file), responseId, reason, ...extra };
}

function projectionExtra(projectionLocale) {
  return projectionLocale ? { projectionLocale } : {};
}

function resolveAnswerCorrectness({ category, file, interactionId, responseIds, answers, projectionLocale = null }) {
  const matching = (answers ?? []).filter((answer) => answer?.interactionId === interactionId);
  const extra = projectionExtra(projectionLocale);
  if (!matching.length || !String(matching[0]?.correctResponseId ?? "").trim()) {
    return { issues: [issue(category, file, interactionId, "answer_correctness_missing", extra)] };
  }
  if (matching.length !== 1 || !responseIds.includes(matching[0].correctResponseId)) {
    return { issues: [issue(category, file, interactionId, "answer_correctness_ambiguous", extra)] };
  }
  return { correctResponseId: matching[0].correctResponseId, issues: [] };
}

function resolveMarkedCorrectness({ category, file, interactionId, responseIds, options, projectionLocale = null }) {
  const correctIndexes = (options ?? []).flatMap((option, index) => option?.correct === true ? [index] : []);
  const extra = projectionExtra(projectionLocale);
  if (!correctIndexes.length) {
    return { issues: [issue(category, file, interactionId, "answer_correctness_missing", extra)] };
  }
  const correctResponseId = responseIds[correctIndexes[0]];
  if (correctIndexes.length !== 1 || !correctResponseId) {
    return { issues: [issue(category, file, interactionId, "answer_correctness_ambiguous", extra)] };
  }
  return { correctResponseId, issues: [] };
}

function checkFeedbackMap({
  category,
  file,
  responseIds,
  feedbackEntries,
  correctResponseId,
  projectionLocale = null,
}) {
  const issues = [];
  const extra = projectionExtra(projectionLocale);
  const feedbackById = new Map();
  for (const [responseId, feedback] of feedbackEntries) {
    if (feedbackById.has(responseId)) {
      issues.push(issue(category, file, responseId ?? "missing", "feedback_target_duplicate", extra));
      continue;
    }
    feedbackById.set(responseId, feedback);
    if (responseId === correctResponseId || !responseIds.includes(responseId)) {
      issues.push(issue(category, file, responseId ?? "missing", "feedback_target_invalid", extra));
    }
  }

  for (const responseId of responseIds.filter((id) => id !== correctResponseId)) {
    const feedback = feedbackById.get(responseId);
    if (!feedback) {
      issues.push(issue(category, file, responseId, "feedback_missing", extra));
      continue;
    }
    if (feedback.correct !== undefined && feedback.correct !== false) {
      issues.push(issue(category, file, responseId, "correct_flag_mismatch", extra));
    }
    const localized = feedback.feedbackByLocale ?? feedback;
    for (const locale of REQUIRED_LOCALES) if (!String(localized?.[locale] ?? "").trim()) {
      issues.push(issue(category, file, responseId, "feedback_locale_missing", { locale, ...extra }));
    }
  }
  return issues;
}

function auditSource() {
  const base = path.join(ROOT, "sessions");
  const issues = [];
  for (const scope of collectSessionScopes(base)) {
    const dir = path.join(base, ...scope.split("/"));
    const sessionId = sessionIdFor(scope);
    for (const locale of REQUIRED_LOCALES) {
      const file = path.join(dir, `final.${locale}.md`);
      if (!exists(file)) continue;
      for (const [pageIndex, page] of parseIntro(fs.readFileSync(file, "utf8")).entries()) {
        const interactionId = `${sessionId}:intro${pageIndex + 1}:q`;
        const responseIds = page.options.map((_, optionIndex) => `${sessionId}:intro${pageIndex + 1}:r${optionIndex + 1}`);
        const correctness = resolveMarkedCorrectness({ category: "source", file, interactionId, responseIds, options: page.options });
        issues.push(...correctness.issues);
        if (!correctness.correctResponseId) continue;
        for (const [optionIndex, option] of page.options.entries()) {
          if (responseIds[optionIndex] === correctness.correctResponseId) continue;
          if (!String(option.feedback ?? "").trim()) issues.push(issue(
            "source", file, responseIds[optionIndex], "feedback_missing", { locale },
          ));
        }
      }
    }
    const atomicFile = path.join(dir, "practice.atomic.json");
    if (!exists(atomicFile)) continue;
    const atomic = readJson(atomicFile);
    for (const projectionLocale of Object.keys(atomic.interactionsByLocale ?? {}).sort()) {
      for (const interaction of atomic.interactionsByLocale[projectionLocale] ?? []) {
        const responseIds = (interaction.responseOptions ?? []).map((option) => option.responseId).filter(Boolean);
        if (interaction.inputMode !== "single_choice" || responseIds.length < 2) continue;
        const correctness = resolveAnswerCorrectness({
          category: "source", file: atomicFile, interactionId: interaction.interactionId,
          responseIds, answers: atomic.answers, projectionLocale,
        });
        issues.push(...correctness.issues);
        if (!correctness.correctResponseId) continue;
        const feedbackEntries = (interaction.modePayload?.choiceFeedback ?? []).map((row) => [row.responseId, row]);
        issues.push(...checkFeedbackMap({
          category: "source", file: atomicFile, responseIds, feedbackEntries,
          correctResponseId: correctness.correctResponseId, projectionLocale,
        }));
      }
    }
  }
  return issues;
}

function sourceIntroForScope(scope) {
  const file = path.join(ROOT, "sessions", ...scope.split("/"), "final.ru.md");
  return { file, pages: exists(file) ? parseIntro(fs.readFileSync(file, "utf8")) : [] };
}

function auditProjection(category, rootName) {
  const base = path.join(ROOT, ...rootName.split("/"));
  const issues = [];
  for (const scope of collectSessionScopes(base)) {
    const dir = path.join(base, ...scope.split("/"));
    const sessionId = sessionIdFor(scope);
    const introFile = path.join(dir, "intro.json");
    const auxiliaryFile = path.join(dir, "auxiliary.json");
    if (exists(introFile)) {
      const intro = readJson(introFile);
      const auxiliary = exists(auxiliaryFile) ? readJson(auxiliaryFile) : { entries: [] };
      const auxByInteraction = new Map((auxiliary.entries ?? []).map((entry) => [entry.interactionId, entry.responseFeedbackById ?? {}]));
      const sourceIntro = sourceIntroForScope(scope);
      for (const [pageIndex, page] of (intro.pages ?? []).entries()) {
        const question = page.question ?? {};
        const choices = question.choicesByLocale?.ru ?? Object.values(question.choicesByLocale ?? {})[0] ?? [];
        const responseIds = choices.map((choice) => choice.responseId).filter(Boolean);
        const sourceOptions = sourceIntro.pages[pageIndex]?.options ?? [];
        const sourceResponseIds = sourceOptions.map((_, optionIndex) => `${sessionId}:intro${pageIndex + 1}:r${optionIndex + 1}`);
        const correctness = resolveMarkedCorrectness({
          category, file: auxiliaryFile, interactionId: question.interactionId,
          responseIds: sourceResponseIds, options: sourceOptions,
        });
        issues.push(...correctness.issues);
        if (!correctness.correctResponseId || !responseIds.includes(correctness.correctResponseId)) {
          if (correctness.correctResponseId) issues.push(issue(category, auxiliaryFile, question.interactionId, "answer_correctness_ambiguous"));
          continue;
        }
        issues.push(...checkFeedbackMap({
          category, file: auxiliaryFile, responseIds,
          feedbackEntries: Object.entries(auxByInteraction.get(question.interactionId) ?? {}),
          correctResponseId: correctness.correctResponseId,
        }));
      }
    }
    const answersFile = path.join(dir, "answers.json");
    const answers = exists(answersFile) ? readJson(answersFile) : [];
    for (const learnerName of ["learner.json", "learner.uk.json"]) {
      const learnerFile = path.join(dir, learnerName);
      if (!exists(learnerFile)) continue;
      const learner = readJson(learnerFile);
      for (const interaction of learner.interactions ?? []) {
        const responseIds = (interaction.responseOptions ?? []).map((option) => option.responseId).filter(Boolean);
        if (interaction.inputMode !== "single_choice" || responseIds.length < 2) continue;
        const projectionLocale = learnerName === "learner.uk.json" ? "uk" : "ru";
        const correctness = resolveAnswerCorrectness({
          category, file: learnerFile, interactionId: interaction.interactionId,
          responseIds, answers, projectionLocale,
        });
        issues.push(...correctness.issues);
        if (!correctness.correctResponseId) continue;
        const feedbackEntries = (interaction.modePayload?.choiceFeedback ?? []).map((row) => [row.responseId, row]);
        issues.push(...checkFeedbackMap({
          category, file: learnerFile, responseIds, feedbackEntries,
          correctResponseId: correctness.correctResponseId, projectionLocale,
        }));
      }
    }
  }
  return issues;
}

export function auditSelectableFeedback() {
  const issues = [
    ...auditSource(),
    ...auditProjection("release", "release"),
    ...auditProjection("mockup", "mockup/reviewed-source"),
  ].sort((a, b) => (
    CATEGORY_ORDER.get(a.category) - CATEGORY_ORDER.get(b.category)
    || a.path.localeCompare(b.path)
    || String(a.responseId).localeCompare(String(b.responseId))
    || a.reason.localeCompare(b.reason)
    || String(a.locale ?? "").localeCompare(String(b.locale ?? ""))
  ));
  const countsByCategory = Object.fromEntries(["source", "release", "mockup"].map((category) => [
    category, issues.filter((row) => row.category === category).length,
  ]));
  return { scope: SCOPE || "all", countsByCategory, issueCount: issues.length, issues };
}

function isMainModule(argvPath) {
  if (!argvPath) return false;
  try {
    return fs.realpathSync.native(path.resolve(argvPath)) === fs.realpathSync.native(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isMainModule(process.argv[1])) {
  const report = auditSelectableFeedback();
  if (JSON_OUTPUT) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else {
    console.log(`SELECTABLE FEEDBACK AUDIT: ${report.issueCount ? "HOLD" : "PASS"} scope=${report.scope} issues=${report.issueCount}`);
    console.log(`source=${report.countsByCategory.source} release=${report.countsByCategory.release} mockup=${report.countsByCategory.mockup}`);
    for (const row of report.issues) console.log(`${row.category}\t${row.path}\t${row.responseId}\t${row.reason}${row.locale ? `:${row.locale}` : ""}`);
  }
  process.exitCode = report.issueCount ? 1 : 0;
}
