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

function checkFeedbackMap({ category, file, responseIds, feedbackById, correctResponseId = null, projectionLocale = null }) {
  const issues = [];
  for (const responseId of responseIds) {
    const feedback = feedbackById.get(responseId);
    if (!feedback) {
      issues.push(issue(category, file, responseId, "feedback_missing", projectionLocale ? { projectionLocale } : {}));
      continue;
    }
    if (correctResponseId && feedback.correct !== (responseId === correctResponseId)) {
      issues.push(issue(category, file, responseId, "correct_flag_mismatch", projectionLocale ? { projectionLocale } : {}));
    }
    const localized = feedback.feedbackByLocale ?? feedback;
    for (const locale of REQUIRED_LOCALES) if (!String(localized?.[locale] ?? "").trim()) {
      issues.push(issue(category, file, responseId, "feedback_locale_missing", { locale, ...(projectionLocale ? { projectionLocale } : {}) }));
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
        for (const [optionIndex, option] of page.options.entries()) {
          if (!String(option.feedback ?? "").trim()) issues.push(issue(
            "source", file, `${sessionId}:intro${pageIndex + 1}:r${optionIndex + 1}`, "feedback_missing", { locale },
          ));
        }
      }
    }
    const atomicFile = path.join(dir, "practice.atomic.json");
    if (!exists(atomicFile)) continue;
    const atomic = readJson(atomicFile);
    const answerById = new Map((atomic.answers ?? []).map((answer) => [answer.interactionId, answer]));
    for (const projectionLocale of Object.keys(atomic.interactionsByLocale ?? {}).sort()) {
      for (const interaction of atomic.interactionsByLocale[projectionLocale] ?? []) {
        const responseIds = (interaction.responseOptions ?? []).map((option) => option.responseId).filter(Boolean);
        if (interaction.inputMode !== "single_choice" || responseIds.length < 2) continue;
        const correctResponseId = answerById.get(interaction.interactionId)?.correctResponseId ?? null;
        const feedbackById = new Map((interaction.modePayload?.choiceFeedback ?? []).map((row) => [row.responseId, row]));
        issues.push(...checkFeedbackMap({ category: "source", file: atomicFile, responseIds, feedbackById, correctResponseId, projectionLocale }));
      }
    }
  }
  return issues;
}

function auditProjection(category, rootName) {
  const base = path.join(ROOT, ...rootName.split("/"));
  const issues = [];
  for (const scope of collectSessionScopes(base)) {
    const dir = path.join(base, ...scope.split("/"));
    const introFile = path.join(dir, "intro.json");
    const auxiliaryFile = path.join(dir, "auxiliary.json");
    if (exists(introFile)) {
      const intro = readJson(introFile);
      const auxiliary = exists(auxiliaryFile) ? readJson(auxiliaryFile) : { entries: [] };
      const auxByInteraction = new Map((auxiliary.entries ?? []).map((entry) => [entry.interactionId, entry.responseFeedbackById ?? {}]));
      for (const page of intro.pages ?? []) {
        const question = page.question ?? {};
        const choices = question.choicesByLocale?.ru ?? Object.values(question.choicesByLocale ?? {})[0] ?? [];
        const feedbackById = new Map(Object.entries(auxByInteraction.get(question.interactionId) ?? {}));
        issues.push(...checkFeedbackMap({ category, file: auxiliaryFile, responseIds: choices.map((choice) => choice.responseId), feedbackById }));
      }
    }
    const answersFile = path.join(dir, "answers.json");
    const answers = exists(answersFile) ? readJson(answersFile) : [];
    const answerById = new Map(answers.map((answer) => [answer.interactionId, answer]));
    for (const learnerName of ["learner.json", "learner.uk.json"]) {
      const learnerFile = path.join(dir, learnerName);
      if (!exists(learnerFile)) continue;
      const learner = readJson(learnerFile);
      for (const interaction of learner.interactions ?? []) {
        const responseIds = (interaction.responseOptions ?? []).map((option) => option.responseId).filter(Boolean);
        if (interaction.inputMode !== "single_choice" || responseIds.length < 2) continue;
        const feedbackById = new Map((interaction.modePayload?.choiceFeedback ?? []).map((row) => [row.responseId, row]));
        issues.push(...checkFeedbackMap({
          category, file: learnerFile, responseIds, feedbackById,
          correctResponseId: answerById.get(interaction.interactionId)?.correctResponseId ?? null,
          projectionLocale: learnerName === "learner.uk.json" ? "uk" : "ru",
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
    || a.responseId.localeCompare(b.responseId)
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
