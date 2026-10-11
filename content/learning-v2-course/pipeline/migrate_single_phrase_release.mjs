#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  answerContractIssues,
  compositeGapReleaseIssues,
  dictationAudioTargetIssues,
  preservationLedgerIssues,
  projectSinglePhraseRelease,
  singlePhraseReleaseIssues,
} from "./single_phrase_release.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RELEASE = path.resolve(HERE, "..", "release");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const APPLY = args.includes("--apply");
const RELEASE = path.resolve(option("release", DEFAULT_RELEASE));
const LEDGER = option("ledger", "");

const sha = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

function sessionDirectories(root) {
  if (!fs.existsSync(root)) throw new Error(`single_phrase_migration_hold:release_missing:${root}`);
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
    }
    if (fs.existsSync(path.join(directory, "learner.json"))) result.push(directory);
  };
  visit(root);
  return result.sort();
}

function learnerFiles(directory) {
  return fs.readdirSync(directory)
    .filter((name) => /^learner(?:\.[a-z]{2})?\.json$/u.test(name))
    .sort()
    .map((name) => path.join(directory, name));
}

function projectedChild(child, answers) {
  const projected = projectSinglePhraseRelease({ interactions: child.interactions, answers });
  return {
    child: {
      ...child,
      interactions: projected.interactions,
      practiceInteractionCount: projected.interactions.length,
      learnerFingerprint: sha(projected.interactions),
    },
    answers: projected.answers,
    preservationLedger: projected.preservationLedger,
  };
}

function validateLocaleShape(base, localized, file) {
  if (base.length !== localized.length) throw new Error(`single_phrase_migration_hold:${file}:locale_interaction_count`);
  for (let index = 0; index < base.length; index += 1) {
    const a = base[index];
    const b = localized[index];
    if (a.interactionId !== b.interactionId || a.family !== b.family ||
      (/:s\d{2}$/u.test(a.interactionId) && a.responseOptions.length !== b.responseOptions.length)) {
      throw new Error(`single_phrase_migration_hold:${file}:locale_shape:${index}:${a.interactionId}:${b.interactionId}`);
    }
  }
}

function buildMigration(root) {
  const writes = [];
  const affected = new Set();
  let violationsBefore = 0;
  let violationsAfter = 0;
  let compositeGapAnswersBefore = 0;
  let compositeGapAnswersAfter = 0;
  let dictationAudioMismatchesBefore = 0;
  let dictationAudioMismatchesAfter = 0;
  let answerContractViolationsBefore = 0;
  let answerContractViolationsAfter = 0;
  let emptyCorrectTextBefore = 0;
  let emptyCorrectTextAfter = 0;
  let preservationLedgerViolations = 0;
  let interactionsBefore = 0;
  let interactionsAfter = 0;
  const preservationLedger = [];
  const directories = sessionDirectories(root);

  for (const directory of directories) {
    const answerFile = path.join(directory, "answers.json");
    if (!fs.existsSync(answerFile)) throw new Error(`single_phrase_migration_hold:${answerFile}:answers_missing`);
    const answers = readJson(answerFile);
    const files = learnerFiles(directory);
    const projectedByFile = [];
    let baseProjected = null;
    let projectedAnswers = null;
    for (const file of files) {
      const child = readJson(file);
      const before = singlePhraseReleaseIssues(child.interactions ?? [], path.relative(root, file));
      const compositeBefore = compositeGapReleaseIssues(child.interactions ?? [], path.relative(root, file));
      const dictationBefore = dictationAudioTargetIssues(child.interactions ?? [], path.relative(root, file));
      violationsBefore += before.length;
      compositeGapAnswersBefore += compositeBefore.length;
      dictationAudioMismatchesBefore += dictationBefore.length;
      interactionsBefore += child.interactions?.length ?? 0;
      if (before.length || compositeBefore.length || dictationBefore.length) affected.add(directory);
      if (path.basename(file) === "learner.json") {
        const beforeAnswers = answerContractIssues(child.interactions ?? [], answers, path.relative(root, file));
        answerContractViolationsBefore += beforeAnswers.length;
        emptyCorrectTextBefore += beforeAnswers.filter((issue) => issue.reason === "empty_correct_text").length;
        if (beforeAnswers.length) affected.add(directory);
      }
      const projected = projectedChild(child, answers);
      const after = singlePhraseReleaseIssues(projected.child.interactions ?? [], path.relative(root, file));
      const compositeAfter = compositeGapReleaseIssues(projected.child.interactions ?? [], path.relative(root, file));
      const dictationAfter = dictationAudioTargetIssues(projected.child.interactions ?? [], path.relative(root, file));
      violationsAfter += after.length;
      compositeGapAnswersAfter += compositeAfter.length;
      dictationAudioMismatchesAfter += dictationAfter.length;
      interactionsAfter += projected.child.interactions.length;
      if (after.length) throw new Error(`single_phrase_migration_hold:${file}:remaining_violations:${after.length}`);
      if (compositeAfter.length) throw new Error(`single_phrase_migration_hold:${file}:remaining_composite_gap_answers:${compositeAfter.length}`);
      if (dictationAfter.length) throw new Error(`single_phrase_migration_hold:${file}:remaining_dictation_audio_mismatches:${dictationAfter.length}`);
      const ledgerIssues = preservationLedgerIssues({
        sourceInteractions: child.interactions ?? [],
        projectedInteractions: projected.child.interactions,
        projectedAnswers: projected.answers,
        ledger: projected.preservationLedger,
      });
      preservationLedgerViolations += ledgerIssues.length;
      if (ledgerIssues.length) throw new Error(`single_phrase_migration_hold:${file}:preservation_ledger:${ledgerIssues.length}`);
      preservationLedger.push(...projected.preservationLedger.map((row) => ({ sourceFile: path.relative(root, file).replace(/\\/gu, "/"), ...row })));
      if (path.basename(file) === "learner.json") {
        const afterAnswers = answerContractIssues(projected.child.interactions, projected.answers, path.relative(root, file));
        answerContractViolationsAfter += afterAnswers.length;
        emptyCorrectTextAfter += afterAnswers.filter((issue) => issue.reason === "empty_correct_text").length;
        if (afterAnswers.length) throw new Error(`single_phrase_migration_hold:${file}:remaining_answer_contract_violations:${afterAnswers.length}`);
        baseProjected = projected.child;
        projectedAnswers = projected.answers;
      }
      projectedByFile.push({ file, value: projected.child });
    }
    if (!baseProjected || !projectedAnswers) throw new Error(`single_phrase_migration_hold:${directory}:base_projection_missing`);
    for (const entry of projectedByFile) validateLocaleShape(baseProjected.interactions, entry.value.interactions, entry.file);
    writes.push(...projectedByFile, { file: answerFile, value: projectedAnswers });
  }

  return {
    summary: {
      mode: APPLY ? "apply" : "dry-run",
      sessions: directories.length,
      affectedSessions: affected.size,
      violationsBefore,
      violationsAfter,
      compositeGapAnswersBefore,
      compositeGapAnswersAfter,
      dictationAudioMismatchesBefore,
      dictationAudioMismatchesAfter,
      answerContractViolationsBefore,
      answerContractViolationsAfter,
      emptyCorrectTextBefore,
      emptyCorrectTextAfter,
      preservationLedgerRows: preservationLedger.length,
      preservationLedgerViolations,
      interactionsBefore,
      interactionsAfter,
    },
    writes,
    preservationLedger,
  };
}

function applyWrites(writes) {
  const staged = [];
  try {
    for (const { file, value } of writes) {
      const temporary = `${file}.single-phrase.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { encoding: "utf8", flag: "wx" });
      staged.push({ temporary, file });
    }
    for (const { temporary, file } of staged) fs.renameSync(temporary, file);
  } catch (error) {
    for (const { temporary } of staged) {
      try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch {}
    }
    throw error;
  }
}

function writeLedger(file, migration) {
  const target = path.resolve(file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  const payload = {
    schemaVersion: "learning_v2_single_phrase_preservation_ledger_v1",
    releaseRoot: RELEASE.replace(/\\/gu, "/"),
    mode: APPLY ? "apply" : "dry-run",
    preservationLedgerViolations: migration.summary.preservationLedgerViolations,
    rowCount: migration.preservationLedger.length,
    rows: migration.preservationLedger,
  };
  fs.writeFileSync(temporary, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(temporary, target);
}

try {
  const migration = buildMigration(RELEASE);
  if (APPLY) applyWrites(migration.writes);
  if (LEDGER) writeLedger(LEDGER, migration);
  console.log(JSON.stringify(migration.summary));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
