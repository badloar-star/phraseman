#!/usr/bin/env node
// Узкий ремонт утраченных явных привязок Markdown ↔ atomic.
// По умолчанию ничего не пишет. --apply разрешает запись только после того,
// как все пары RU/UK текущего scope прошли fail-closed сравнение.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parsePractice } from "./build_release.mjs";
import { canonicalAnnotation, hasAnnotationChanges, parseAnnotation } from "./interaction_annotation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const scopeIndex = process.argv.indexOf("--scope");
const SCOPE = scopeIndex >= 0 ? process.argv[scopeIndex + 1] : "en";
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const runtimeFamily = (family) => family === "word_card" ? "listen_choose" : family;

function sessionDirs() {
  const [language = "en", lessonFilter, sessionFilter] = SCOPE.split("/");
  const languageDir = path.join(ROOT, "sessions", language);
  if (!fs.existsSync(languageDir)) throw new Error(`scope_missing:${SCOPE}`);
  const lessons = lessonFilter ? [lessonFilter] : fs.readdirSync(languageDir).filter((name) => /^l\d+$/u.test(name));
  return lessons.flatMap((lesson) => {
    const lessonDir = path.join(languageDir, lesson);
    if (!fs.existsSync(lessonDir)) throw new Error(`scope_missing:${language}/${lesson}`);
    const sessions = sessionFilter ? [sessionFilter] : fs.readdirSync(lessonDir).filter((name) => /^s\d+$/u.test(name));
    return sessions.map((session) => ({ key: `${language}/${lesson}/${session}`, dir: path.join(lessonDir, session) }));
  });
}

function plannedFileRepair({ sessionKey, locale, file, atomic }) {
  const before = fs.readFileSync(file, "utf8");
  const tasks = parsePractice(before);
  const interactions = atomic.interactionsByLocale?.[locale];
  if (!Array.isArray(interactions) || tasks.length !== interactions.length) throw new Error(`shape_hold:${sessionKey}:${locale}`);
  const lines = before.split(/(\r?\n)/u);
  const lineText = lines.filter((_, index) => index % 2 === 0);
  if (lineText.at(-1) === "" && (before.endsWith("\r\n") || before.endsWith("\n"))) lineText.pop();
  const insertions = [];
  const replacements = [];
  for (const [index, task] of tasks.entries()) {
    const interaction = interactions[index];
    const expectedFamily = interaction?.family;
    if (!interaction || task.ordinal !== index + 1 || task.title !== interaction.prompt || runtimeFamily(task.family) !== expectedFamily) {
      throw new Error(`tuple_hold:${sessionKey}:${locale}:index=${index}`);
    }
    const headingIndex = lineText.findIndex((line) => new RegExp(`^\\*\\*${task.ordinal} · `, "u").test(line));
    if (headingIndex < 0) throw new Error(`heading_hold:${sessionKey}:${locale}:index=${index}`);
    const following = lineText[headingIndex + 1] ?? "";
    const onHeading = parseAnnotation(lineText[headingIndex]);
    const onFollowing = parseAnnotation(following);
    if (onHeading && onFollowing) throw new Error(`annotation_duplicate_hold:${sessionKey}:${locale}:index=${index}`);
    const existing = onHeading ?? onFollowing;
    if (existing) {
      if (existing.interactionId !== interaction.interactionId || (existing.family && existing.family !== expectedFamily)) {
        throw new Error(`annotation_drift:${sessionKey}:${locale}:index=${index}`);
      }
      if (!existing.family) {
        const annotation = canonicalAnnotation(interaction.interactionId, expectedFamily);
        const lineIndex = onHeading ? headingIndex : headingIndex + 1;
        const original = lineText[lineIndex];
        const legacy = `<!-- interaction_id: ${interaction.interactionId}; -->`;
        if (!original.includes(legacy)) throw new Error(`legacy_annotation_shape_hold:${sessionKey}:${locale}:index=${index}`);
        replacements.push({ lineIndex, original, legacy, annotation });
      }
      continue;
    }
    if (task.interactionId) throw new Error(`annotation_parse_drift:${sessionKey}:${locale}:index=${index}`);
    insertions.push({ headingIndex, annotation: canonicalAnnotation(interaction.interactionId, expectedFamily) });
  }
  let afterLines = [...lineText];
  for (const replacement of replacements) afterLines[replacement.lineIndex] = afterLines[replacement.lineIndex].replace(replacement.legacy, replacement.annotation);
  for (const insertion of [...insertions].sort((a, b) => b.headingIndex - a.headingIndex)) {
    const heading = afterLines[insertion.headingIndex];
    const suffix = /^(\*\*\d+ · .*?\*\*)(.*)$/u.exec(heading);
    if (!suffix) throw new Error(`heading_shape_hold:${sessionKey}:${locale}:line=${insertion.headingIndex + 1}`);
    if (suffix[2]) afterLines[insertion.headingIndex] = `${suffix[1]}${insertion.annotation}${suffix[2]}`;
    else afterLines.splice(insertion.headingIndex + 1, 0, insertion.annotation);
  }
  const eol = before.includes("\r\n") ? "\r\n" : "\n";
  const trailing = before.endsWith("\r\n") || before.endsWith("\n") ? eol : "";
  const after = afterLines.join(eol) + trailing;
  let restored = after;
  for (const insertion of insertions) {
    restored = restored.replace(`${insertion.annotation}${eol}`, "").replace(insertion.annotation, "");
  }
  for (const replacement of replacements) restored = restored.replace(replacement.annotation, replacement.legacy);
  if (restored !== before) throw new Error(`byte_reversal_hold:${sessionKey}:${locale}`);
  return { file, before, beforeSha: sha(before), after, insertions: insertions.length, replacements: replacements.length };
}

const plans = [];
for (const session of sessionDirs()) {
  const atomicPath = path.join(session.dir, "practice.atomic.json");
  const ruPath = path.join(session.dir, "final.ru.md");
  const ukPath = path.join(session.dir, "final.uk.md");
  if (![atomicPath, ruPath, ukPath].every(fs.existsSync)) continue;
  const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
  if (atomic.courseSessionId !== `en:lesson-${session.key.split("/")[1].slice(1)}:session-${session.key.split("/")[2].slice(1)}`) throw new Error(`atomic_identity_hold:${session.key}`);
  const ru = plannedFileRepair({ sessionKey: session.key, locale: "ru", file: ruPath, atomic });
  const uk = plannedFileRepair({ sessionKey: session.key, locale: "uk", file: ukPath, atomic });
  plans.push({ session, atomicPath, atomicSha: sha(fs.readFileSync(atomicPath, "utf8")), files: [ru, uk] });
}
const insertions = plans.flatMap((plan) => plan.files).reduce((total, file) => total + file.insertions + file.replacements, 0);
if (APPLY) {
  for (const plan of plans) {
    if (sha(fs.readFileSync(plan.atomicPath, "utf8")) !== plan.atomicSha) throw new Error(`concurrent_atomic_hold:${plan.session.key}`);
    for (const file of plan.files) if (sha(fs.readFileSync(file.file, "utf8")) !== file.beforeSha) throw new Error(`concurrent_markdown_hold:${file.file}`);
  }
  for (const plan of plans) for (const file of plan.files) if (hasAnnotationChanges(file)) fs.writeFileSync(file.file, file.after, "utf8");
}
console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry_run", sessions: plans.filter((plan) => plan.files.some((file) => file.insertions)).map((plan) => plan.session.key), insertions }, null, 2));
