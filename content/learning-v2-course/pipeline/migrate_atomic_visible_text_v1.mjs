#!/usr/bin/env node
// Repair only an answer leaked verbatim through a learner-visible task title.
// This migration never invents text and never rewrites an authored scene.

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePractice } from "./build_release.mjs";
import { parseSessionFilter } from "./migrate_atomic_slot_feedback_v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const { projectLearnerVisiblePromptV1 } = createRequire(import.meta.url)(
  path.resolve(ROOT, "../../modules/learning-v2/content/learner_visible_text_v1.js"),
);
const checkOnly = process.argv.includes("--check");
const sessionFilter = parseSessionFilter(process.argv);
const locales = ["ru", "uk"];
let sessions = 0;
let fields = 0;
const locked = [];
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

export function visibleTextRepairsForAtomic(interaction, task, locale) {
  const atomicWordCard = interaction.modePayload?.wordCard?.word ?? "";
  const isWordCard = Boolean(task.card) || Boolean(atomicWordCard);
  const correctText = task.options.find((option) => option.correct)?.text ?? task.target ?? task.card?.word ?? atomicWordCard;
  const projected = projectLearnerVisiblePromptV1({
    title: task.title,
    family: task.family,
    correctText,
    isWordCard,
  });
  let repaired = 0;
  const oldPrompt = String(interaction.prompt ?? "");
  const isLegacyWordCard = isWordCard &&
    String(atomicWordCard) === String(task.card?.word ?? atomicWordCard) &&
    oldPrompt !== projected;
  if (oldPrompt !== projected && (oldPrompt === task.title || isLegacyWordCard)) {
    interaction.prompt = projected;
    interaction.accessibilityLabel = projected;
    repaired += 2;
  }
  const scene = interaction.modePayload?.localizedScene;
  const explicitScene = task.visibleGuidance ?? task.condition;
  // A scene distinct from the task title has authority only when the Markdown
  // explicitly declares it. Otherwise it is legacy derived text and must not
  // survive after the learner prompt has been repaired.
  if (task.family === "context_gap_grammar" && scene && !explicitScene &&
    String(scene[locale] ?? "") !== projected) {
    scene[locale] = projected;
    repaired += 1;
  }
  return repaired;
}

if (isMain) {
for (const lesson of fs.readdirSync(path.join(ROOT, "sessions/en"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^l\d{2}$/u.test(entry.name))) {
  for (const session of fs.readdirSync(path.join(ROOT, "sessions/en", lesson.name), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^s\d{2}$/u.test(entry.name))) {
    if (sessionFilter && `${lesson.name}/${session.name}` !== sessionFilter) continue;
    const directory = path.join(ROOT, "sessions/en", lesson.name, session.name);
    const atomicPath = path.join(directory, "practice.atomic.json");
    if (!fs.existsSync(atomicPath)) continue;
    const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
    let changed = false;
    for (const locale of locales) {
      const markdownPath = path.join(directory, `final.${locale}.md`);
      const tasks = parsePractice(fs.readFileSync(markdownPath, "utf8"));
      const interactions = atomic.interactionsByLocale?.[locale];
      if (!Array.isArray(interactions) || interactions.length !== tasks.length)
        throw new Error(`atomic_visible_text_shape:${lesson.name}/${session.name}:${locale}`);
      for (const [index, task] of tasks.entries()) {
        const interaction = interactions[index];
        const repaired = visibleTextRepairsForAtomic(interaction, task, locale);
        if (repaired) {
          changed = true;
          fields += repaired;
        }
      }
    }
    if (changed) {
      sessions += 1;
      if (!checkOnly) {
        try {
          fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
        } catch (error) {
          locked.push({ session: `${lesson.name}/${session.name}`, code: error?.code ?? "write_failed" });
        }
      }
    }
  }
}

console.log(JSON.stringify({
  verdict: checkOnly && fields ? "CHANGES_REQUIRED" : locked.length ? "RETRY_REQUIRED" : "PASS",
  sessions,
  fields,
  locked,
  checkOnly,
}));
process.exitCode = checkOnly && fields || locked.length ? 1 : 0;
}
