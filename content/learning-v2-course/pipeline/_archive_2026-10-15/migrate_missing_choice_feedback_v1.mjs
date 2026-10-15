#!/usr/bin/env node
// Restores missing Markdown explanations only from the matching existing
// atomic feedback record. It does not author, translate, or paraphrase text.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePractice } from "./build_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const LOCALES = ["ru", "uk"];

function practiceStarts(markdown) {
  return [...markdown.matchAll(/^\*\*\d+ · /gmu)].map((match) => match.index);
}

function practiceEnd(markdown, from) {
  const boundary = /\n(?:---|##\s)/gmu;
  boundary.lastIndex = from;
  const match = boundary.exec(markdown);
  return match ? match.index : markdown.length;
}

function missingFeedbackForTask(task, interaction, locale) {
  const missing = task.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.correct && !String(option.feedback ?? "").trim());
  if (!missing.length) return { additions: [] };
  const responseOptions = interaction?.responseOptions;
  const feedback = interaction?.modePayload?.choiceFeedback;
  if (!Array.isArray(responseOptions) || responseOptions.length !== task.options.length || !Array.isArray(feedback)) {
    return { hold: "atomic_choice_shape" };
  }
  const feedbackById = new Map(feedback.map((entry) => [entry.responseId, entry]));
  const additions = [];
  for (const { option, index } of missing) {
    const response = responseOptions[index];
    const entry = feedbackById.get(response?.responseId);
    const text = String(entry?.feedbackByLocale?.[locale] ?? "").trim();
    if (!response || response.text !== option.text || entry?.correct !== false || !text) {
      return { hold: `atomic_feedback_missing:index=${index}` };
    }
    additions.push(`- ${option.text} — *${text}*`);
  }
  return { additions };
}

export function appendMissingChoiceFeedback(markdown, tasks, interactions, locale) {
  const starts = practiceStarts(markdown);
  if (starts.length !== tasks.length || interactions.length !== tasks.length) {
    return { markdown, changed: 0, holds: [{ index: null, reason: "practice_shape" }] };
  }
  const edits = [];
  const holds = [];
  for (const [index, task] of tasks.entries()) {
    const result = missingFeedbackForTask(task, interactions[index], locale);
    if (result.hold) {
      holds.push({ index, reason: result.hold });
      continue;
    }
    if (!result.additions.length) continue;
    const end = index + 1 < starts.length ? starts[index + 1] : practiceEnd(markdown, starts[index]);
    const body = markdown.slice(starts[index], end);
    const suffix = body.match(/\s*$/u)?.[0] ?? "";
    edits.push({ start: starts[index], end, replacement: `${body.slice(0, body.length - suffix.length)}\n${result.additions.join("\n")}\n${suffix}` });
  }
  let repaired = markdown;
  for (const edit of edits.reverse()) repaired = `${repaired.slice(0, edit.start)}${edit.replacement}${repaired.slice(edit.end)}`;
  return { markdown: repaired, changed: edits.length, holds };
}

function main() {
  const checkOnly = process.argv.includes("--check");
  let sessions = 0;
  let tasks = 0;
  const holds = [];
  const lessons = fs.readdirSync(path.join(ROOT, "sessions", "en"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^l\d{2}$/u.test(entry.name));
  for (const lesson of lessons) {
    const sessionEntries = fs.readdirSync(path.join(ROOT, "sessions", "en", lesson.name), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^s\d{2}$/u.test(entry.name));
    for (const session of sessionEntries) {
      const directory = path.join(ROOT, "sessions", "en", lesson.name, session.name);
      const atomicPath = path.join(directory, "practice.atomic.json");
      if (!fs.existsSync(atomicPath)) continue;
      const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
      let sessionChanged = 0;
      const outputs = [];
      for (const locale of LOCALES) {
        const file = path.join(directory, `final.${locale}.md`);
        const original = fs.readFileSync(file, "utf8");
        const result = appendMissingChoiceFeedback(original, parsePractice(original), atomic.interactionsByLocale?.[locale] ?? [], locale);
        holds.push(...result.holds.map((hold) => ({ session: `${lesson.name}/${session.name}`, locale, ...hold })));
        outputs.push({ file, result });
        sessionChanged += result.changed;
      }
      if (!sessionChanged) continue;
      sessions += 1;
      tasks += sessionChanged;
      if (!checkOnly) for (const output of outputs) if (output.result.changed) fs.writeFileSync(output.file, output.result.markdown);
    }
  }
  const verdict = checkOnly && tasks ? "CHANGES_REQUIRED" : holds.length ? "HOLD" : "PASS";
  console.log(JSON.stringify({ verdict, sessions, tasks, holds, checkOnly }));
  process.exitCode = verdict === "PASS" ? 0 : 1;
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) main();
