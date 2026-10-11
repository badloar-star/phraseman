#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { projectSinglePhraseRelease } from "./single_phrase_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SESSIONS = path.join(ROOT, "sessions", "en");
const APPLY = process.argv.includes("--apply");
const REFRESH_FROM_EVIDENCE = process.argv.includes("--refresh-from-evidence");
const requestedSession = process.argv.includes("--session") ? process.argv[process.argv.indexOf("--session") + 1] : null;
const sha = (value) => crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function sessionEntries() {
  const result = [];
  for (const lesson of fs.readdirSync(SESSIONS).filter((name) => /^l\d{2}$/u.test(name)).sort()) {
    const lessonDir = path.join(SESSIONS, lesson);
    for (const session of fs.readdirSync(lessonDir).filter((name) => /^s\d{2}$/u.test(name)).sort()) {
      const directory = path.join(lessonDir, session);
      if (fs.existsSync(path.join(directory, "final.ru.md")) && fs.existsSync(path.join(directory, "final.uk.md"))) {
        result.push({ lesson, session, directory, key: `en/${lesson}/${session}` });
      }
    }
  }
  return result;
}

function targetFor(interaction) {
  const payload = interaction.modePayload ?? {};
  if (interaction.family === "scripted_repeat_compare" || interaction.family === "phrase_builder") return payload.targetPhrase ?? "";
  if (interaction.family === "listen_build_dictation") return payload.hiddenTargetPhrase ?? "";
  if (interaction.family === "context_gap_grammar") return payload.gappedTargetPhrase ?? "";
  if (interaction.family === "listen_choose") return payload.referenceAudio?.transcript ?? "";
  if (interaction.family === "speed_match") return (payload.pairGrid ?? []).map((pair) => pair.target).join(" · ");
  return "";
}

function renderPractice(interactions, locale) {
  const title = locale === "uk" ? "## Практика — по одній цільовій фразі" : "## Практика — по одной целевой фразе";
  const targetLabel = locale === "uk" ? "Ціль" : "Цель";
  const choicesLabel = locale === "uk" ? "Варіанти" : "Варианты";
  const lines = [title, ""];
  interactions.forEach((interaction, index) => {
    lines.push(`**${index + 1} · ${interaction.prompt}**`);
    lines.push(`<!-- interaction_id: ${interaction.interactionId}; family: ${interaction.family} -->`);
    const target = targetFor(interaction);
    if (target) lines.push(`${targetLabel}: \`${target}\``);
    if ((interaction.responseOptions ?? []).length) {
      lines.push(`${choicesLabel}: ${(interaction.responseOptions ?? []).map((option) => `\`${option.text}\``).join(" · ")}`);
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function rewriteMarkdown(markdown, interactions, locale) {
  const intro3 = /^##\s*[ИІ]нтро\s*3[^\n]*$/mi.exec(markdown);
  if (!intro3) throw new Error(`source_migration_hold:intro3_missing:${locale}`);
  const afterIntro3 = intro3.index + intro3[0].length;
  const practiceHeading = /^##\s+(?!Для сборщика)[^\n]+$/m.exec(markdown.slice(afterIntro3));
  if (!practiceHeading) throw new Error(`source_migration_hold:practice_boundary_missing:${locale}`);
  const practiceStart = afterIntro3 + practiceHeading.index;
  const boundary = /^## (?:Для сборщика|Вердикт владельца)[^\n]*$/m.exec(markdown.slice(practiceStart + practiceHeading[0].length));
  const practiceEnd = boundary ? practiceStart + practiceHeading[0].length + boundary.index : markdown.length;
  if (practiceEnd <= practiceStart) throw new Error(`source_migration_hold:practice_boundary_order:${locale}`);
  let suffix = markdown.slice(practiceEnd);
  const modes = interactions.map((interaction, index) => `${index + 1}=${interaction.family}`).join(", ");
  if (/^## Для сборщика\s*$/m.test(suffix)) {
    if (/^modes:\s*.*$/m.test(suffix)) suffix = suffix.replace(/^modes:\s*.*$/m, `modes: ${modes}`);
    else suffix = suffix.replace(/^## Для сборщика\s*$/m, `## Для сборщика\natomic_practice: practice.atomic.json\nmodes: ${modes}`);
  } else {
    suffix = `## Для сборщика\natomic_practice: practice.atomic.json\nmodes: ${modes}\n\n${suffix.trimStart()}`;
  }
  return `${markdown.slice(0, practiceStart).trimEnd()}\n\n${renderPractice(interactions, locale)}\n\n${suffix}`;
}

function privateBuild(entry, outputRoot) {
  const result = spawnSync(process.execPath, [
    path.join(HERE, "build_release.mjs"),
    "--session", entry.key,
    "--locales", "ru,uk",
    "--out", outputRoot,
    "--migration-composite-source",
  ], { cwd: path.resolve(ROOT, "..", ".."), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`source_migration_hold:${entry.key}:build_failed:${result.stderr || result.stdout}`);
  return path.join(outputRoot, "en", entry.lesson, entry.session);
}

const allEntries = sessionEntries();
const entries = requestedSession ? allEntries.filter((entry) => entry.key === requestedSession) : allEntries;
if (requestedSession && entries.length !== 1) throw new Error(`source_migration_hold:session_not_found:${requestedSession}`);
const tempParent = path.resolve(ROOT, "..", "..", ".codex-tmp");
fs.mkdirSync(tempParent, { recursive: true });
const outputRoot = fs.mkdtempSync(path.join(tempParent, "single-phrase-source-"));
const writes = [];
const beforeSessions = [];
const ledgerRows = [];
const evidenceDir = path.join(ROOT, "migration", "single-phrase-2026-10-03");
const storedBefore = REFRESH_FROM_EVIDENCE ? readJson(path.join(evidenceDir, "before-source-audit.json")) : null;
const storedLedger = REFRESH_FROM_EVIDENCE ? readJson(path.join(evidenceDir, "preservation-ledger.json")) : null;
const storedSnapshotByKey = new Map((storedBefore?.sessions ?? []).map((item) => [item.key, item.snapshot]));
const storedRowsById = new Map();
for (const row of storedLedger?.rows ?? []) {
  if (!storedRowsById.has(row.courseSessionId)) storedRowsById.set(row.courseSessionId, []);
  const { courseSessionId: ignored, ...plain } = row;
  storedRowsById.get(row.courseSessionId).push(plain);
}

for (const entry of entries) {
  let snapshot;
  let sessionLedger;
  let learnerRu;
  let learnerUk;
  let answers;
  if (REFRESH_FROM_EVIDENCE) {
    snapshot = storedSnapshotByKey.get(entry.key);
    if (!snapshot) throw new Error(`source_migration_hold:${entry.key}:stored_snapshot_missing`);
    const ru = projectSinglePhraseRelease({ interactions: snapshot.interactionsByLocale.ru, answers: snapshot.answers, locale: "ru" });
    const uk = projectSinglePhraseRelease({ interactions: snapshot.interactionsByLocale.uk, answers: snapshot.answers, locale: "uk" });
    learnerRu = { courseSessionId: snapshot.courseSessionId, interactions: ru.interactions };
    learnerUk = { courseSessionId: snapshot.courseSessionId, interactions: uk.interactions };
    answers = ru.answers;
    sessionLedger = {
      schemaVersion: "learning_v2_single_phrase_preservation_ledger_v1",
      courseSessionId: snapshot.courseSessionId,
      rows: storedRowsById.get(snapshot.courseSessionId) ?? [],
    };
  } else {
    const output = privateBuild(entry, outputRoot);
    snapshot = readJson(path.join(output, "source.snapshot.json"));
    sessionLedger = readJson(path.join(output, "preservation.ledger.json"));
    learnerRu = readJson(path.join(output, "learner.json"));
    learnerUk = readJson(path.join(output, "learner.uk.json"));
    answers = readJson(path.join(output, "answers.json"));
  }
  const atomic = {
    schemaVersion: "learning_v2_atomic_practice_source_v1",
    courseSessionId: learnerRu.courseSessionId,
    sourceSnapshotSha256: sha(snapshot),
    preservationLedgerSha256: sha(sessionLedger),
    interactionsByLocale: { ru: learnerRu.interactions, uk: learnerUk.interactions },
    answers,
  };
  const ruFile = path.join(entry.directory, "final.ru.md");
  const ukFile = path.join(entry.directory, "final.uk.md");
  try {
    writes.push(
      { file: path.join(entry.directory, "practice.atomic.json"), content: `${JSON.stringify(atomic, null, 2)}\n` },
      { file: ruFile, content: rewriteMarkdown(fs.readFileSync(ruFile, "utf8"), learnerRu.interactions, "ru") },
      { file: ukFile, content: rewriteMarkdown(fs.readFileSync(ukFile, "utf8"), learnerUk.interactions, "uk") },
    );
  } catch (error) {
    throw new Error(`${entry.key}:${error instanceof Error ? error.message : String(error)}`);
  }
  beforeSessions.push({ key: entry.key, snapshot });
  ledgerRows.push(...sessionLedger.rows.map((row) => ({ courseSessionId: learnerRu.courseSessionId, ...row })));
}

const before = {
  schemaVersion: "learning_v2_composite_source_before_audit_v1",
  generatedFrom: "pre-migration Markdown masters through the private migration-only builder",
  sessionCount: beforeSessions.length,
  sessions: beforeSessions,
};
const ledger = {
  schemaVersion: "learning_v2_single_phrase_preservation_ledger_v1",
  beforeAuditSha256: sha(before),
  sessionCount: beforeSessions.length,
  rowCount: ledgerRows.length,
  rows: ledgerRows,
};
writes.push(
  { file: path.join(evidenceDir, "before-source-audit.json"), content: `${JSON.stringify(before, null, 2)}\n` },
  { file: path.join(evidenceDir, "preservation-ledger.json"), content: `${JSON.stringify(ledger, null, 2)}\n` },
);

if (APPLY) {
  for (const write of writes) {
    fs.mkdirSync(path.dirname(write.file), { recursive: true });
    const temporary = `${write.file}.single-phrase.tmp`;
    fs.writeFileSync(temporary, write.content, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, write.file);
  }
}

console.log(JSON.stringify({
  mode: APPLY ? "apply" : "dry-run",
  sessions: entries.length,
  markdownFiles: entries.length * 2,
  atomicSourceFiles: entries.length,
  preservationRows: ledgerRows.length,
  beforeAuditSha256: sha(before),
  ledgerSha256: sha(ledger),
  outputRoot,
}));
