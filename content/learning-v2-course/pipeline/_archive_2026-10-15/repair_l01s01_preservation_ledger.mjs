import fs from "node:fs";
import path from "node:path";

const ledgerPath = path.resolve(import.meta.dirname, "../migration/single-phrase-2026-10-03/preservation-ledger.json");
const prefix = "en:lesson-01:session-01";
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));

for (const row of ledger.rows ?? []) {
  if (row.courseSessionId !== prefix) continue;
  if (row.oldInteractionId === `${prefix}:i17`) {
    row.newInteractionId = `${prefix}:i17:s${String(row.segmentIndex).padStart(2, "0")}`;
  } else {
    row.newInteractionId = row.oldInteractionId;
  }
}

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log("[L01S01-LEDGER] restored the historical ID mapping after the explicit addition");
