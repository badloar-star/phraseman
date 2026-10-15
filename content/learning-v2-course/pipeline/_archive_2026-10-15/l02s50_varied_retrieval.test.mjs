import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { preservationLedgerIssues } from "./single_phrase_release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-02:session-50";
const correctChoices = {
  i01: "Are you ready", i03: "Is she free", i06: "Yes, it is",
  i11: "ready", i12: "Yes, I am ready", i14: "is", i16: "Are you sure", i17: "am",
};

test("L02/S50 ends with a new retrieval action, not a second Yes, I am builder", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l02/s50/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const items = data.interactionsByLocale[locale];
    const early = items.find((item) => item.interactionId === `${session}:i02`);
    const final = items.find((item) => item.interactionId === `${session}:i17`);
    assert.equal(early?.family, "phrase_builder", `${locale}: early task keeps its phrase builder`);
    assert.equal(final?.family, "context_gap_grammar", `${locale}: final task changes the learner action`);
    assert.equal(final?.modePayload?.gappedTargetPhrase, "Yes, I ___ .", `${locale}: final cue`);
    assert.deepEqual(final?.modePayload?.gapOptions?.map((option) => option.text), ["am", "are", "is"], `${locale}: visible choices`);
    for (const responseId of ["r1", "r2", "r3"]) {
      const feedback = final?.modePayload?.choiceFeedback?.find((item) => item.responseId === `${session}:i17:${responseId}`);
      assert.ok(feedback?.feedbackByLocale?.[locale]?.trim(), `${locale}:${responseId}:feedback`);
    }
    for (const [id, text] of Object.entries(correctChoices)) {
      const item = items.find((entry) => entry.interactionId === `${session}:${id}`);
      const feedback = item?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === `${session}:${id}:r1`);
      assert.equal(feedback?.correct, true, `${locale}:${id}:correct choice feedback`);
      assert.ok(feedback?.feedbackByLocale?.[locale]?.includes(text), `${locale}:${id}:correct explanation names the answer`);
    }
  }
});

test("L02/S50 records why the full phrase is now a contextual gap", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l02/s50/practice.atomic.json"), "utf8"));
  const baseline = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/before-source-audit.json"), "utf8"));
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));
  const source = baseline.sessions.find((entry) => entry.snapshot?.courseSessionId === session)?.snapshot;
  assert.ok(source, "historical source exists");
  const issues = preservationLedgerIssues({
    sourceInteractions: source.interactionsByLocale.ru,
    projectedInteractions: data.interactionsByLocale.ru,
    projectedAnswers: data.answers,
    ledger: ledger.rows
      .filter((row) => row.courseSessionId === session)
      .map(({ courseSessionId: ignored, ...row }) => row),
    amendments: ledger.amendments.filter((entry) => entry.courseSessionId === session),
  });
  assert.deepEqual(issues, [], "the preservation ledger explains the intentional task redesign");
});
