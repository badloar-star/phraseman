#!/usr/bin/env node

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { atomicMarkdownParityIssues, parsePractice } from "./build_release.mjs";
import { newWordDeclarationIssues, parseSessionHeader } from "./session_header.mjs";
import { feedbackLocaleParityIssues, preJudgeChoreographyIssues } from "./single_phrase_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COURSE_ROOT = path.resolve(HERE, "..");

function expectedCourseSessionId(sessionIdentity) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(sessionIdentity ?? "");
  return match ? `${match[1]}:lesson-${match[2]}:session-${match[3]}` : null;
}

// The preauthoring packet is a contract, not decorative prose.  In particular,
// an author may not claim a 17-task independent final and then project a
// different number of learner steps or a chain of answer-revealing subtasks.
export function authoringPlanProjectionIssues({ guardian, atomicSource }) {
  const issues = [];
  const plan = guardian?.authoringPlan;
  if (!plan || typeof plan !== "object") return issues;

  const plannedCount = Number(plan.taskCount);
  for (const [locale, interactions] of Object.entries(atomicSource?.interactionsByLocale ?? {})) {
    if (Number.isInteger(plannedCount) && plannedCount > 0 && interactions.length !== plannedCount) {
      issues.push(`authoring_plan_task_count:${locale}:planned=${plannedCount}:actual=${interactions.length}`);
    }
    const finalSteps = interactions.filter((interaction) => /:i17(?::|$)/u.test(String(interaction?.interactionId ?? "")));
    if (finalSteps.length !== 1) {
      issues.push(`authoring_plan_final_shape:${locale}:expected_one_i17:actual=${finalSteps.length}`);
      continue;
    }
    const final = finalSteps[0];
    const requirement = String(plan.requiredIndependentFinal ?? guardian?.independentFinal?.independence ?? "");
    if (/no\s+(?:answer\s+)?tiles/iu.test(requirement)
      && ["phrase_builder", "listen_build_dictation"].includes(final.family)) {
      issues.push(`authoring_plan_final_reveals_tiles:${locale}:${final.interactionId}`);
    }
    if (/no\s+ready-made\s+complete\s+target\s+phrase/iu.test(requirement)
      && final.family === "scripted_repeat_compare") {
      issues.push(`authoring_plan_final_reveals_target:${locale}:${final.interactionId}`);
    }
  }
  return issues;
}

export function strictProjectionContractIssues({ sessionIdentity, sessionId = expectedCourseSessionId(sessionIdentity), atomicSource, markdownByLocale, guardianNewWords = null }) {
  const headersByLocale = Object.fromEntries(Object.entries(markdownByLocale ?? {})
    .map(([locale, markdown]) => [locale, parseSessionHeader(markdown)]));
  const tasksByLocale = Object.fromEntries(Object.entries(markdownByLocale ?? {})
    .map(([locale, markdown]) => [locale, parsePractice(markdown)]));
  const issues = atomicMarkdownParityIssues({ sessionIdentity, sessionId, atomicSource, tasksByLocale });
  issues.push(...feedbackLocaleParityIssues(atomicSource?.interactionsByLocale, { answers: atomicSource?.answers }));
  issues.push(...newWordDeclarationIssues(headersByLocale, { guardianNewWords }));
  return { headersByLocale, tasksByLocale, issues, newWords: headersByLocale.ru?.newWords ?? [] };
}

export function inspectPreJudgeChoreography({ sessionIdentity, sessionDir = null, judgedFile = null, judgedSource = null, canonicalSources = null }) {
  const sessionId = expectedCourseSessionId(sessionIdentity);
  if (!sessionId) return { verdict: "HOLD", session: sessionIdentity, issues: ["session_identity"] };

  const dir = sessionDir ?? path.join(COURSE_ROOT, "sessions", ...sessionIdentity.split("/"));
  const atomicFile = path.join(dir, "practice.atomic.json");
  const markdownFiles = { ru: path.join(dir, "final.ru.md"), uk: path.join(dir, "final.uk.md") };
  if (judgedFile && path.resolve(judgedFile) !== path.resolve(markdownFiles.ru)) {
    return {
      verdict: "HOLD",
      session: sessionIdentity,
      issues: [`candidate_source_not_canonical:${path.basename(judgedFile)}`],
    };
  }
  const missing = [atomicFile, ...Object.values(markdownFiles)].filter((file) => !fs.existsSync(file));
  if (missing.length) {
    return { verdict: "HOLD", session: sessionIdentity, issues: [`source_missing:${missing.map((file) => path.basename(file)).join(",")}`] };
  }

  const sourceText = (name, file) => {
    const captured = canonicalSources?.[name];
    if (captured === undefined || captured === null) return fs.readFileSync(file, "utf8");
    return Buffer.isBuffer(captured) ? captured.toString("utf8") : String(captured);
  };
  let atomic;
  try {
    atomic = JSON.parse(sourceText("atomic", atomicFile));
  } catch (error) {
    return { verdict: "HOLD", session: sessionIdentity, issues: [`atomic_source_malformed:${error.message}`] };
  }

  const markdownByLocale = Object.fromEntries(Object.entries(markdownFiles)
    .map(([locale, file]) => [locale, locale === "ru" && typeof judgedSource === "string" ? judgedSource : sourceText(locale, file)]));
  let guardianNewWords = null;
  let guardian = null;
  const guardianIssues = [];
  const guardianFile = path.join(dir, "preauthoring.json");
  if (fs.existsSync(guardianFile)) {
    try {
      guardian = JSON.parse(fs.readFileSync(guardianFile, "utf8"));
      guardianNewWords = Array.isArray(guardian?.newWords) ? guardian.newWords : [];
    } catch (error) {
      guardianIssues.push(`new_words_guardian_unreadable:${error.message}`);
    }
  }
  const strictContract = strictProjectionContractIssues({
    sessionIdentity,
    sessionId,
    atomicSource: atomic,
    markdownByLocale,
    guardianNewWords,
  });
  const issues = [...guardianIssues, ...strictContract.issues, ...authoringPlanProjectionIssues({ guardian, atomicSource: atomic })];
  const newWords = strictContract.newWords;

  if (!issues.length) {
    issues.push(...preJudgeChoreographyIssues({
      sessionIdentity,
      interactionsByLocale: atomic.interactionsByLocale,
      answers: atomic.answers,
      newWords,
    }));
  }

  return {
    verdict: issues.length ? "HOLD" : "PASS",
    session: sessionIdentity,
    issues,
    locales: Object.keys(atomic.interactionsByLocale ?? {}).sort(),
    interactionsPerLocale: Object.fromEntries(Object.entries(atomic.interactionsByLocale ?? {})
      .map(([locale, interactions]) => [locale, interactions.length])),
    newWords,
  };
}

export function requirePreJudgeChoreography(options) {
  const result = inspectPreJudgeChoreography(options);
  if (result.verdict !== "PASS") throw new Error(`PREJUDGE HOLD ${JSON.stringify(result)}`);
  return result;
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback = null) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };
  const result = inspectPreJudgeChoreography({ sessionIdentity: opt("session"), sessionDir: opt("session-dir") });
  const output = JSON.stringify(result, null, 2);
  if (result.verdict !== "PASS") {
    console.error(output);
    process.exitCode = 1;
    return;
  }
  console.log(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
