import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("l02 s02 i07 ledger records the documented phrase-builder projection", () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));
  const row = ledger.rows.find((item) => item.courseSessionId === "en:lesson-02:session-02" && item.oldInteractionId === "en:lesson-02:session-02:i07" && item.segmentIndex === 1);
  assert.deepEqual(row && { newTargetSegment: row.newTargetSegment, correctText: row.correctText, audioTranscript: row.audioTranscript }, {
    newTargetSegment: "Are you upset?", correctText: "Are you upset?", audioTranscript: null,
  });
});
