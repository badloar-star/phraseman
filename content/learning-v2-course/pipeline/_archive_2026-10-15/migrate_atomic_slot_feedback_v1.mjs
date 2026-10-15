#!/usr/bin/env node
// Make legacy atomic tile feedback identical to the reviewed Markdown source.
// It never creates feedback from a guess: every rewritten tile must be bound
// to a matching source annotation in both authored learner locales.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePractice, slotFeedbackForTask } from "./build_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOCALES = ["ru", "uk"];
const BUILD_FAMILIES = new Set(["phrase_builder", "listen_build_dictation"]);

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function feedbackForTasks(tasksByLocale, atomic, index) {
  const ruTask = tasksByLocale.ru[index];
  const ukTask = tasksByLocale.uk[index];
  const ruInteraction = atomic.interactionsByLocale?.ru?.[index];
  const ukInteraction = atomic.interactionsByLocale?.uk?.[index];
  const holds = [];
  if (!ruTask || !ukTask || !ruInteraction || !ukInteraction) {
    holds.push("locale_shape");
    return { holds };
  }
  if (!BUILD_FAMILIES.has(ruTask.family) || ruTask.family !== ukTask.family) return { holds };
  if (ruTask.interactionId !== ukTask.interactionId || ruTask.interactionId !== ruInteraction.interactionId || ruTask.interactionId !== ukInteraction.interactionId) {
    holds.push("interaction_id");
    return { holds };
  }
  const orderedByLocale = {
    ru: ruInteraction.modePayload?.orderedTokens,
    uk: ukInteraction.modePayload?.orderedTokens,
  };
  if (LOCALES.some((locale) => !Array.isArray(orderedByLocale[locale]) || !orderedByLocale[locale].length)) {
    holds.push("ordered_tokens");
    return { holds };
  }
  const expectedByLocale = {
    ru: slotFeedbackForTask(ruTask, { ru: ruTask, uk: ukTask }, "", orderedByLocale.ru),
    uk: slotFeedbackForTask(ukTask, { ru: ruTask, uk: ukTask }, "", orderedByLocale.uk),
  };
  if (LOCALES.some((projection) => expectedByLocale[projection]
    .some((entry) => LOCALES.some((locale) => !entry.feedbackByLocale?.[locale])))) {
    holds.push("source_annotation_missing_or_tile_order_mismatch");
    return { holds };
  }
  return { holds, expectedByLocale };
}

export function slotFeedbackMigrationsForAtomic(atomic, tasksByLocale) {
  const holds = [];
  let changed = 0;
  const ru = atomic.interactionsByLocale?.ru;
  const uk = atomic.interactionsByLocale?.uk;
  if (!Array.isArray(ru) || !Array.isArray(uk) || ru.length !== uk.length ||
    !Array.isArray(tasksByLocale.ru) || !Array.isArray(tasksByLocale.uk) ||
    tasksByLocale.ru.length !== ru.length || tasksByLocale.uk.length !== uk.length) {
    return { changed, holds: [{ index: null, reason: "session_locale_shape" }] };
  }
  for (let index = 0; index < ru.length; index += 1) {
    const result = feedbackForTasks(tasksByLocale, atomic, index);
    if (result.holds.length) {
      holds.push(...result.holds.map((reason) => ({ index, reason })));
      continue;
    }
    if (!result.expectedByLocale) continue;
    const currentRu = ru[index].modePayload?.slotFeedback;
    const currentUk = uk[index].modePayload?.slotFeedback;
    if (sameJson(currentRu, result.expectedByLocale.ru) && sameJson(currentUk, result.expectedByLocale.uk)) continue;
    if (!ru[index].modePayload || !uk[index].modePayload) {
      holds.push({ index, reason: "mode_payload_missing" });
      continue;
    }
    ru[index].modePayload.slotFeedback = structuredClone(result.expectedByLocale.ru);
    uk[index].modePayload.slotFeedback = structuredClone(result.expectedByLocale.uk);
    changed += 1;
  }
  return { changed, holds };
}

export function parseSessionFilter(argv = process.argv) {
  const positions = argv.flatMap((value, index) => value === "--session" ? [index] : []);
  if (!positions.length) return null;
  if (positions.length > 1) throw new Error("--session may be supplied only once");
  const value = argv[positions[0] + 1] ?? "";
  const match = /^en\/(l\d{2})\/(s\d{2})$/u.exec(value);
  if (!match) throw new Error(`Invalid --session: ${value}`);
  return `${match[1]}/${match[2]}`;
}

function sessionDirectories(sessionFilter = null) {
  return fs.readdirSync(path.join(ROOT, "sessions", "en"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^l\d{2}$/u.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((lesson) => fs.readdirSync(path.join(ROOT, "sessions", "en", lesson.name), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^s\d{2}$/u.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((session) => ({ lesson: lesson.name, session: session.name, directory: path.join(ROOT, "sessions", "en", lesson.name, session.name) })))
    .filter((entry) => !sessionFilter || `${entry.lesson}/${entry.session}` === sessionFilter);
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const sessionFilter = parseSessionFilter(process.argv);
  let sessions = 0;
  let interactions = 0;
  const holds = [];
  for (const entry of sessionDirectories(sessionFilter)) {
    const atomicPath = path.join(entry.directory, "practice.atomic.json");
    if (!fs.existsSync(atomicPath)) continue;
    const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
    const tasksByLocale = Object.fromEntries(LOCALES.map((locale) => [locale,
      parsePractice(fs.readFileSync(path.join(entry.directory, `final.${locale}.md`), "utf8")),
    ]));
    const result = slotFeedbackMigrationsForAtomic(atomic, tasksByLocale);
    holds.push(...result.holds.map((hold) => ({ session: `${entry.lesson}/${entry.session}`, ...hold })));
    if (!result.changed) continue;
    sessions += 1;
    interactions += result.changed;
    if (!checkOnly) fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
  }
  const verdict = checkOnly && interactions ? "CHANGES_REQUIRED" : holds.length ? "HOLD" : "PASS";
  console.log(JSON.stringify({ verdict, sessions, interactions, holds, checkOnly }));
  process.exitCode = verdict === "PASS" ? 0 : 1;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) main();
