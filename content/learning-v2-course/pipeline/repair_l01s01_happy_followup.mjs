import fs from "node:fs";
import path from "node:path";

const apply = process.argv.includes("--apply");
const dir = path.resolve(import.meta.dirname, "../sessions/en/l01/s01");
const atomicPath = path.join(dir, "practice.atomic.json");
const ledgerPath = path.resolve(import.meta.dirname, "../migration/single-phrase-2026-10-03/preservation-ledger.json");
const prefix = "en:lesson-01:session-01";

// i08..i17 existed before the new happy listening check. They retain those
// identities; only their visible ordinal moves one step later. The inserted
// check receives a non-historical child ID so preservation cannot confuse it
// with the old speed-match exercise.
function restoreHistoricalId(value) {
  if (typeof value !== "string") return value;
  const inserted = value.replaceAll(`${prefix}:i08`, `${prefix}:i07:a01`);
  return inserted.replace(new RegExp(`${prefix}:i(0[9]|1[0-8])(?=\\D|$)`, "gu"), (_, digits) =>
    `${prefix}:i${String(Number(digits) - 1).padStart(2, "0")}`,
  );
}

function restoreTree(value) {
  if (typeof value === "string") return restoreHistoricalId(value);
  if (Array.isArray(value)) return value.map(restoreTree);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, restoreTree(entry)]));
  return value;
}

function restoreMarkdown(source) {
  return source.replace(/(<!--\s*interaction_id:\s*)([^;\s]+)(;)/gu, (_, start, id, end) => `${start}${restoreHistoricalId(id)}${end}`);
}

const atomic = JSON.parse(fs.readFileSync(atomicPath, "utf8"));
// This is a one-time migration.  A second transform would treat the already
// restored historical i08 as the temporary inserted exercise and corrupt the
// ledger.  Make repeat invocation a no-op instead of mutating content again.
if (atomic.interactionsByLocale?.ru?.some((entry) => entry.interactionId === `${prefix}:i07:a01`)) {
  console.log("[L01S01-HAPPY] already applied; no files changed");
  process.exit(0);
}
for (const locale of ["ru", "uk"]) {
  const interactions = atomic.interactionsByLocale[locale];
  if (!Array.isArray(interactions) || interactions.length !== 20) throw new Error(`expected twenty interactions in ${locale}`);
  const restored = interactions.map(restoreTree);
  const inserted = restored.find((entry) => entry.interactionId === `${prefix}:i07:a01`);
  if (!inserted || inserted.ordinal !== 8 || inserted.modePayload?.isWordCard !== false) throw new Error(`unexpected inserted happy listening check in ${locale}`);
  const historicalSpeedMatch = restored.find((entry) => entry.interactionId === `${prefix}:i08`);
  if (!historicalSpeedMatch || historicalSpeedMatch.ordinal !== 9) throw new Error(`historical speed-match identity was not restored in ${locale}`);
  atomic.interactionsByLocale[locale] = restored;
}
atomic.answers = atomic.answers.map(restoreTree);

const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
for (const row of ledger.rows ?? []) {
  if (row.courseSessionId === prefix) row.newInteractionId = restoreHistoricalId(row.newInteractionId);
}
const additions = ledger.amendments ?? (ledger.amendments = []);
const addition = additions.find((item) => item.courseSessionId === prefix && item.action === "addition" && item.newInteractionId === `${prefix}:i07:a01`);
if (!addition) additions.push({
  action: "addition",
  courseSessionId: prefix,
  newInteractionId: `${prefix}:i07:a01`,
  reason: "Added a separate visible happy listening discrimination after the word card; it replaces no historical exercise (2026-10-11).",
});

if (!apply) {
  console.log("[L01S01-HAPPY] dry run: add --apply to restore historical IDs and declare the new listening check");
  process.exit(0);
}
for (const locale of ["ru", "uk"]) {
  const file = path.join(dir, `final.${locale}.md`);
  fs.writeFileSync(file, restoreMarkdown(fs.readFileSync(file, "utf8")));
}
fs.writeFileSync(atomicPath, `${JSON.stringify(atomic, null, 2)}\n`);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log("[L01S01-HAPPY] restored historical IDs and declared happy listening addition");
