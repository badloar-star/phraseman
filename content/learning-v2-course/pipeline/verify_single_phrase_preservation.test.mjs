import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));

test("historical audit ledger proves every old target segment remains in its projected interaction", (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "single-phrase-history-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = path.join(root, "release/en/l01/s01");
  fs.mkdirSync(session, { recursive: true });
  const oldSpoken = "en:lesson-01:session-01:i17";
  const oldListen = "en:lesson-01:session-01:i10";
  const interactions = [
    ...["I am here.", "I am ready."].map((text, index) => ({
      interactionId: `${oldSpoken}:s0${index + 1}`, family: "scripted_repeat_compare", responseOptions: [],
      modePayload: { targetPhrase: text, referenceAudio: { transcript: text } },
    })),
    { interactionId: `${oldListen}:s01`, family: "scripted_repeat_compare", responseOptions: [], modePayload: { targetPhrase: "Excuse me.", referenceAudio: { transcript: "Excuse me." } } },
    { interactionId: `${oldListen}:s02`, family: "listen_choose", responseOptions: [{ responseId: "r1", text: "Are you busy?" }, { responseId: "r2", text: "Are you ready?" }], modePayload: { referenceAudio: { transcript: "Are you busy?" }, localizedMeaningChoices: [] } },
  ];
  fs.writeFileSync(path.join(session, "learner.json"), JSON.stringify({ interactions }));
  fs.writeFileSync(path.join(session, "answers.json"), JSON.stringify(interactions.map((item) => ({ interactionId: item.interactionId, correctText: item.modePayload.targetPhrase ?? item.responseOptions[0]?.text, correctResponseId: null }))));
  const before = path.join(root, "before.json");
  fs.writeFileSync(before, JSON.stringify({ hits: [
    { session: "l01/s01", ordinal: 20, family: "scripted_repeat_compare", key: "targetPhrase", count: 2, text: "I am here. I am ready." },
    { session: "l01/s01", ordinal: 13, family: "listen_choose", key: "responseOption", count: 2, text: "Excuse me. Are you busy?" },
    { session: "l01/s01", ordinal: 13, family: "listen_choose", key: "responseOption", count: 2, text: "Excuse me. Are you ready?" },
  ] }));
  const output = path.join(root, "ledger.json");
  const run = spawnSync(process.execPath, [path.join(here, "verify_single_phrase_preservation.mjs"), "--before-audit", before, "--release", path.join(root, "release"), "--output", output], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const ledger = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(ledger.violationCount, 0);
  assert.equal(ledger.oldAssessedFieldCount, 3);
  assert.equal(ledger.preservedSegmentCount, 6);
  assert.equal(ledger.rows.every((row) => row.newInteractionId && row.correctText && row.preservedInField), true);

  const learner = JSON.parse(fs.readFileSync(path.join(session, "learner.json")));
  learner.interactions[1].modePayload.targetPhrase = "I am substituted.";
  learner.interactions[1].modePayload.referenceAudio.transcript = "I am substituted.";
  fs.writeFileSync(path.join(session, "learner.json"), JSON.stringify(learner));
  const blocked = spawnSync(process.execPath, [path.join(here, "verify_single_phrase_preservation.mjs"), "--before-audit", before, "--release", path.join(root, "release")], { encoding: "utf8" });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stdout, /segment_not_preserved/u);
});
