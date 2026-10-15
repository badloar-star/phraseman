import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atomic = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l02/s03/practice.atomic.json"), "utf8"));
const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));

for (const locale of ["ru", "uk"]) test(`l02 s03 uses distinct full negative answers in ${locale}`, () => {
  const byId = new Map(atomic.interactionsByLocale[locale].map((item) => [item.interactionId, item]));
  assert.equal(byId.get("en:lesson-02:session-03:i09")?.modePayload?.hiddenTargetPhrase, "No, I am not prepared.");
  assert.equal(byId.get("en:lesson-02:session-03:i15")?.modePayload?.targetPhrase, "No, I am not lost.");
});

test("l02 s03 preservation ledger records the two expanded negative answers", () => {
  const row = (interactionId) => ledger.rows.find((item) => item.courseSessionId === "en:lesson-02:session-03" && item.oldInteractionId === interactionId && item.segmentIndex === 1);
  assert.deepEqual(row("en:lesson-02:session-03:i09") && {
    newTargetSegment: row("en:lesson-02:session-03:i09").newTargetSegment,
    correctText: row("en:lesson-02:session-03:i09").correctText,
    audioTranscript: row("en:lesson-02:session-03:i09").audioTranscript,
  }, { newTargetSegment: "No, I am not prepared.", correctText: "No, I am not prepared.", audioTranscript: "No, I am not prepared." });
  assert.deepEqual(row("en:lesson-02:session-03:i15") && {
    newTargetSegment: row("en:lesson-02:session-03:i15").newTargetSegment,
    correctText: row("en:lesson-02:session-03:i15").correctText,
    audioTranscript: row("en:lesson-02:session-03:i15").audioTranscript,
  }, { newTargetSegment: "No, I am not lost.", correctText: "No, I am not lost.", audioTranscript: "No, I am not lost." });
});

test("l02 s03 i01 ledger answer agrees with its target word and audio", () => {
  const row = ledger.rows.find((item) => item.courseSessionId === "en:lesson-02:session-03" && item.oldInteractionId === "en:lesson-02:session-03:i01" && item.segmentIndex === 1);
  assert.deepEqual(row && { newTargetSegment: row.newTargetSegment, correctText: row.correctText, audioTranscript: row.audioTranscript }, {
    newTargetSegment: "worried", correctText: "worried", audioTranscript: "worried",
  });
});

test("l02 s03 records each negative-answer change without rewriting its earlier amendment", () => {
  const amendments = ledger.amendments.filter((item) => item.courseSessionId === "en:lesson-02:session-03" && ["en:lesson-02:session-03:i09", "en:lesson-02:session-03:i15"].includes(item.oldInteractionId));
  assert.deepEqual(amendments.map(({ oldInteractionId, from, to }) => ({ oldInteractionId, from, to })), [
    { oldInteractionId: "en:lesson-02:session-03:i09", from: "No, I ___ not.", to: "No, I am not prepared." },
    { oldInteractionId: "en:lesson-02:session-03:i15", from: "No, I am not.", to: "No, I am not lost." },
  ]);
});
