import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("l01 s20 gap-fill ledger preserves the gap template rather than the answer", () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));
  const row = ledger.rows.find((item) => item.courseSessionId === "en:lesson-01:session-20" && item.oldInteractionId === "en:lesson-01:session-20:i15" && item.segmentIndex === 1);
  assert.deepEqual(row && {
    newTargetSegment: row.newTargetSegment,
    correctText: row.correctText,
    audioTranscript: row.audioTranscript,
  }, {
    newTargetSegment: "He is ___.",
    correctText: "quiet",
    audioTranscript: null,
  });
});
