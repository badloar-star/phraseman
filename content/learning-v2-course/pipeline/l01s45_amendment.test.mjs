import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("l01 s45 i14 has one exact original-to-current preservation amendment", () => {
  const ledger = JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));
  const amendments = ledger.amendments.filter((item) => item.courseSessionId === "en:lesson-01:session-45" && item.oldInteractionId === "en:lesson-01:session-45:i14" && item.segmentIndex === 1);
  assert.deepEqual(amendments.map(({ from, to }) => ({ from, to })), [{ from: "___ busy.", to: "I'm ___ exhausted." }]);
});
