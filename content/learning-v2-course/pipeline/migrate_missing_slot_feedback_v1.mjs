#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePractice } from "./build_release.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["ru", "uk"];
const annotation = /плитка\s+`([^`]+)`\s+(?:лишняя|зайва)\s*:/giu;
const starts = (value) => [...value.matchAll(/^\*\*\d+ · /gmu)].map((m) => m.index);
const endOf = (value, from) => { const m = /\n(?:---|##\s)/gmu.exec(value.slice(from)); return m ? from + m.index : value.length; };

export function appendMissingSlotFeedback(markdown, tasks, interactions, locale) {
  const positions = starts(markdown);
  if (positions.length !== tasks.length || interactions.length !== tasks.length) return { markdown, changed: 0, holds: [{ index: null, reason: "practice_shape" }] };
  const edits = [], holds = [];
  for (const [index, task] of tasks.entries()) {
    if (!new Set(["phrase_builder", "listen_build_dictation"]).has(task.family)) continue;
    const payload = interactions[index]?.modePayload;
    const distractors = payload?.authoredDistractorTokens;
    const feedback = payload?.slotFeedback;
    if (!Array.isArray(distractors) || !Array.isArray(feedback) || distractors.length !== feedback.length) { holds.push({ index, reason: "atomic_slot_shape" }); continue; }
    const end = index + 1 < positions.length ? positions[index + 1] : endOf(markdown, positions[index]);
    const body = markdown.slice(positions[index], end);
    const existing = new Set([...body.matchAll(annotation)].map((m) => m[1].trim().toLocaleLowerCase("en")));
    const additions = [];
    for (const [slot, token] of distractors.entries()) {
      if (existing.has(String(token).trim().toLocaleLowerCase("en"))) continue;
      const entry = feedback[slot], text = String(entry?.feedbackByLocale?.[locale] ?? "").trim();
      if (entry?.correct !== false || !text) { holds.push({ index, reason: `atomic_slot_feedback_missing:index=${slot}` }); continue; }
      additions.push(`*(плитка \`${token}\` ${locale === "uk" ? "зайва" : "лишняя"}: ${text})*`);
    }
    if (additions.length) { const suffix = body.match(/\s*$/u)?.[0] ?? ""; edits.push({ start: positions[index], end, text: `${body.slice(0, body.length - suffix.length)}\n${additions.join("\n")}\n${suffix}` }); }
  }
  let next = markdown; for (const edit of edits.reverse()) next = `${next.slice(0, edit.start)}${edit.text}${next.slice(edit.end)}`;
  return { markdown: next, changed: edits.length, holds };
}

function main() {
  const check = process.argv.includes("--check"); let sessions = 0, tasks = 0; const holds = [];
  for (const lesson of fs.readdirSync(path.join(ROOT, "sessions/en"), { withFileTypes: true }).filter((x) => x.isDirectory() && /^l\d{2}$/u.test(x.name))) for (const session of fs.readdirSync(path.join(ROOT, "sessions/en", lesson.name), { withFileTypes: true }).filter((x) => x.isDirectory() && /^s\d{2}$/u.test(x.name))) {
    const dir = path.join(ROOT, "sessions/en", lesson.name, session.name), atomicPath = path.join(dir, "practice.atomic.json"); if (!fs.existsSync(atomicPath)) continue;
    const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8")); let changed = 0; const outputs = [];
    for (const locale of LOCALES) { const file = path.join(dir, `final.${locale}.md`), source = fs.readFileSync(file, "utf8"), result = appendMissingSlotFeedback(source, parsePractice(source), atomic.interactionsByLocale?.[locale] ?? [], locale); holds.push(...result.holds.map((hold) => ({ session: `${lesson.name}/${session.name}`, locale, ...hold }))); changed += result.changed; outputs.push({ file, result }); }
    if (changed) { sessions++; tasks += changed; if (!check) for (const item of outputs) if (item.result.changed) fs.writeFileSync(item.file, item.result.markdown); }
  }
  const verdict = check && tasks ? "CHANGES_REQUIRED" : holds.length ? "HOLD" : "PASS"; console.log(JSON.stringify({ verdict, sessions, tasks, holds, check })); process.exitCode = verdict === "PASS" ? 0 : 1;
}
if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) main();
