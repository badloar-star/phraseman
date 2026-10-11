import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

function fixture(prompt) {
  const id = "en:lesson-01:session-01:i01";
  const interactions = [{
    interactionId: id, ordinal: 4, purpose: "independent_check", family: "scripted_repeat_compare", inputMode: "tap_record_compare",
    prompt, responseOptions: [], mediaIds: [], audioTargetIds: [`${id}:audio`], accessibilityLabel: prompt,
    modePayload: { family: "scripted_repeat_compare", referenceAudio: { audioTargetId: `${id}:audio`, transcript: "I am here. I am ready." }, slowReferenceAudio: null, targetPhrase: "I am here. I am ready.", recordControlPolicy: "hold_press_release_with_accessible_toggle", modelPlayback: "reference_and_slow", learnerPlayback: "available_after_capture", honestOutcomeStates: ["UNCERTAIN"] },
    scriptedAlternate: null,
  }];
  return { schemaVersion: "learning_v2_course_session_learner_child_v1", courseSessionId: "en:lesson-01:session-01", targetLanguage: "en", interactions, practiceInteractionCount: 1, firstPracticeOrdinal: 4, evaluatorPayload: "absent_by_exact_schema", acceptedAnswerPayload: "absent_by_exact_schema", runtimeAuthority: "none_active_release_join_required", releaseAuthority: false, learnerFingerprint: crypto.createHash("sha256").update(JSON.stringify(interactions)).digest("hex") };
}

test("canonical migration is dry-run by default and atomically projects every locale on apply", (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "single-phrase-migration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "en/l01/s01");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "learner.json"), JSON.stringify(fixture("Финал"), null, 2));
  fs.writeFileSync(path.join(dir, "learner.uk.json"), JSON.stringify(fixture("Фінал"), null, 2));
  fs.writeFileSync(path.join(dir, "answers.json"), JSON.stringify([{ interactionId: "en:lesson-01:session-01:i01", correctText: "I am here. I am ready.", correctResponseId: null }], null, 2));
  const script = path.join(here, "migrate_single_phrase_release.mjs");
  const ledgerFile = path.join(root, "preservation-ledger.json");
  const before = fs.readFileSync(path.join(dir, "learner.json"), "utf8");
  const dry = spawnSync(process.execPath, [script, "--release", root], { encoding: "utf8" });
  assert.equal(dry.status, 0, dry.stderr || dry.stdout);
  assert.equal(fs.readFileSync(path.join(dir, "learner.json"), "utf8"), before);
  assert.deepEqual(JSON.parse(dry.stdout), { mode: "dry-run", sessions: 1, affectedSessions: 1, violationsBefore: 2, violationsAfter: 0, compositeGapAnswersBefore: 0, compositeGapAnswersAfter: 0, dictationAudioMismatchesBefore: 0, dictationAudioMismatchesAfter: 0, answerContractViolationsBefore: 0, answerContractViolationsAfter: 0, emptyCorrectTextBefore: 0, emptyCorrectTextAfter: 0, preservationLedgerRows: 4, preservationLedgerViolations: 0, interactionsBefore: 2, interactionsAfter: 4 });
  const apply = spawnSync(process.execPath, [script, "--release", root, "--apply", "--ledger", ledgerFile], { encoding: "utf8" });
  assert.equal(apply.status, 0, apply.stderr || apply.stdout);
  const base = JSON.parse(fs.readFileSync(path.join(dir, "learner.json"), "utf8"));
  const uk = JSON.parse(fs.readFileSync(path.join(dir, "learner.uk.json"), "utf8"));
  const answers = JSON.parse(fs.readFileSync(path.join(dir, "answers.json"), "utf8"));
  assert.equal(base.interactions.length, 2);
  assert.equal(base.practiceInteractionCount, 2);
  assert.deepEqual(base.interactions.map((item) => item.interactionId), uk.interactions.map((item) => item.interactionId));
  assert.deepEqual(base.interactions.map((item) => item.interactionId), answers.map((item) => item.interactionId));
  assert.equal(base.learnerFingerprint, crypto.createHash("sha256").update(JSON.stringify(base.interactions)).digest("hex"));
  const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
  assert.equal(ledger.schemaVersion, "learning_v2_single_phrase_preservation_ledger_v1");
  assert.equal(ledger.rows.length, 4);
  assert.equal(ledger.rows.every((row) => row.sourceFile && row.oldInteractionId && row.newInteractionId && row.correctText && row.audioTranscript), true);
  assert.equal(ledger.preservationLedgerViolations, 0);
  assert.equal(fs.readdirSync(dir).some((name) => name.endsWith(".single-phrase.tmp")), false);
});

test("canonical migration collapses adjacent blanks for base, locale, and answer", (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "single-gap-migration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, "en/l03/s50");
  fs.mkdirSync(dir, { recursive: true });
  const id = "en:lesson-03:session-50:i17:s01";
  const options = ["A; black", "The; black", "A; white"].map((text, index) => ({ responseId: `${id}:r${index + 1}`, text }));
  const child = {
    ...fixture("Финал"),
    courseSessionId: "en:lesson-03:session-50",
    interactions: [{
      interactionId: id, ordinal: 4, purpose: "independent_check", family: "context_gap_grammar", inputMode: "single_choice",
      prompt: "Финал", responseOptions: options, mediaIds: [], audioTargetIds: [], accessibilityLabel: "Финал",
      modePayload: { family: "context_gap_grammar", localizedScene: { ru: "Финал", uk: "Фінал" }, gappedTargetPhrase: "___ ___ sofa is here.", gapOptions: options, testedDimension: "articles and colours", choiceFeedback: [] },
      scriptedAlternate: null,
    }],
    practiceInteractionCount: 1,
  };
  child.learnerFingerprint = crypto.createHash("sha256").update(JSON.stringify(child.interactions)).digest("hex");
  fs.writeFileSync(path.join(dir, "learner.json"), JSON.stringify(child, null, 2));
  fs.writeFileSync(path.join(dir, "learner.uk.json"), JSON.stringify({ ...child, interactions: child.interactions.map((item) => ({ ...item, prompt: "Фінал", accessibilityLabel: "Фінал" })) }, null, 2));
  fs.writeFileSync(path.join(dir, "answers.json"), JSON.stringify([{ interactionId: id, correctText: "A; black", correctResponseId: `${id}:r1` }], null, 2));
  const script = path.join(here, "migrate_single_phrase_release.mjs");
  const apply = spawnSync(process.execPath, [script, "--release", root, "--apply"], { encoding: "utf8" });
  assert.equal(apply.status, 0, apply.stderr || apply.stdout);
  assert.deepEqual(JSON.parse(apply.stdout), { mode: "apply", sessions: 1, affectedSessions: 1, violationsBefore: 6, violationsAfter: 0, compositeGapAnswersBefore: 2, compositeGapAnswersAfter: 0, dictationAudioMismatchesBefore: 0, dictationAudioMismatchesAfter: 0, answerContractViolationsBefore: 0, answerContractViolationsAfter: 0, emptyCorrectTextBefore: 0, emptyCorrectTextAfter: 0, preservationLedgerRows: 2, preservationLedgerViolations: 0, interactionsBefore: 2, interactionsAfter: 2 });
  const base = JSON.parse(fs.readFileSync(path.join(dir, "learner.json"), "utf8"));
  const uk = JSON.parse(fs.readFileSync(path.join(dir, "learner.uk.json"), "utf8"));
  const answers = JSON.parse(fs.readFileSync(path.join(dir, "answers.json"), "utf8"));
  for (const learner of [base, uk]) {
    assert.equal(learner.interactions[0].modePayload.gappedTargetPhrase, "___ sofa is here.");
    assert.deepEqual(learner.interactions[0].responseOptions.map((item) => item.text), ["A black", "The black", "A white"]);
    assert.deepEqual(learner.interactions[0].modePayload.gapOptions, learner.interactions[0].responseOptions);
  }
  assert.deepEqual(answers, [{ interactionId: id, correctText: "A black", correctResponseId: `${id}:r1` }]);
});
