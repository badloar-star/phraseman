#!/usr/bin/env node
// Restore only deterministic forty-character title truncations in feedback metadata.
// The parsed Markdown task title remains the sole source of replacement text.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePractice } from "./build_release.mjs";
import { parseSessionFilter } from "./migrate_atomic_slot_feedback_v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOCALES = ["ru", "uk"];
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

function isExactFortyCharacterPrefix(value, title) {
  return typeof value === "string" && typeof title === "string" &&
    title.length > 40 && value === title.slice(0, 40);
}

function replaceExactPrefix(container, field, title) {
  if (!container || !isExactFortyCharacterPrefix(container[field], title)) return 0;
  container[field] = title;
  return 1;
}

function migrationForInteraction(interaction, task) {
  const payload = interaction.modePayload;
  if (!payload) return { changed: 0, hold: "mode_payload" };
  let changed = 0;
  if (Array.isArray(payload.slotFeedback)) {
    for (const entry of payload.slotFeedback) changed += replaceExactPrefix(entry, "testedDimension", task.title);
  }
  if (task.family === "context_gap_grammar") changed += replaceExactPrefix(payload, "testedDimension", task.title);
  if (task.family === "sound_contrast") changed += replaceExactPrefix(payload, "testedPhoneticContrast", task.title);
  return { changed };
}

export function feedbackTitleMigrationsForAtomic(atomic, tasksByLocale) {
  const holds = [];
  let changed = 0;
  const interactionsByLocale = atomic.interactionsByLocale ?? {};
  for (const locale of LOCALES) {
    const interactions = interactionsByLocale[locale];
    const tasks = tasksByLocale[locale];
    if (!Array.isArray(interactions) || !Array.isArray(tasks) || interactions.length !== tasks.length) {
      holds.push({ index: null, reason: `session_locale_shape:${locale}` });
      continue;
    }
    for (const [index, task] of tasks.entries()) {
      const interaction = interactions[index];
      if (interaction?.interactionId !== task?.interactionId) {
        holds.push({ index, reason: "interaction_id" });
        continue;
      }
      const result = migrationForInteraction(interaction, task);
      if (result.hold) holds.push({ index, reason: result.hold });
      changed += result.changed;
    }
  }
  return { changed, holds };
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
  const checkOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");
  const sessionFilter = parseSessionFilter(process.argv);
  let sessions = 0;
  let fields = 0;
  const holds = [];
  for (const entry of sessionDirectories(sessionFilter)) {
    const atomicPath = path.join(entry.directory, "practice.atomic.json");
    if (!fs.existsSync(atomicPath)) continue;
    const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
    const tasksByLocale = Object.fromEntries(LOCALES.map((locale) => [locale,
      parsePractice(fs.readFileSync(path.join(entry.directory, `final.${locale}.md`), "utf8")),
    ]));
    const result = feedbackTitleMigrationsForAtomic(atomic, tasksByLocale);
    holds.push(...result.holds.map((hold) => ({ session: `${entry.lesson}/${entry.session}`, ...hold })));
    if (!result.changed) continue;
    sessions += 1;
    fields += result.changed;
    if (!checkOnly) fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
  }
  const verdict = holds.length ? "HOLD" : checkOnly && fields ? "CHANGES_REQUIRED" : "PASS";
  console.log(JSON.stringify({ verdict, sessions, fields, holds, checkOnly }));
  process.exitCode = verdict === "PASS" ? 0 : 1;
}

if (isMain) main();
