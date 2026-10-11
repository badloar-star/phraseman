import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("l02 s01 i12 ledger records the documented phrase-builder projection", () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));
  const row = ledger.rows.find((item) => item.courseSessionId === "en:lesson-02:session-01" && item.oldInteractionId === "en:lesson-02:session-01:i12" && item.segmentIndex === 1);
  assert.deepEqual(row && { newTargetSegment: row.newTargetSegment, correctText: row.correctText, audioTranscript: row.audioTranscript }, {
    newTargetSegment: "Are you hungry?", correctText: "Are you hungry?", audioTranscript: null,
  });
});

test("l02 s01 i16 ledger keeps the reference-audio transcript", () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));
  const row = ledger.rows.find((item) => item.courseSessionId === "en:lesson-02:session-01" && item.oldInteractionId === "en:lesson-02:session-01:i16" && item.segmentIndex === 1);
  assert.equal(row?.audioTranscript, "Are you lost?");
});
