import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { sourceQualityFindings } from "./sync_mockup_source_quality_findings.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-08";
const expected = [
  ["i15:s01", "I am tired."],
  ["i15:s02", "I am not hungry."],
  ["i17:s01", "I am ready."],
  ["i17:s02", "I am not lost."],
  ["i17:s03", "I am not hungry."],
  ["i17:s04", "I am done."],
];
const atomic = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s08/practice.atomic.json"), "utf8"));
const ledger = () => JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));

test("L01/S08 preserves every historical split spoken segment in both locales", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.equal(interactions.length, 21, locale);
    for (const [suffix, target] of expected) {
      const row = interactions.find((entry) => entry.interactionId === `${session}:${suffix}`);
      assert.equal(row?.family, "scripted_repeat_compare", `${locale}:${suffix}:family`);
      assert.equal(row?.modePayload?.targetPhrase, target, `${locale}:${suffix}:target`);
      assert.equal(row?.modePayload?.referenceAudio?.transcript, target, `${locale}:${suffix}:audio`);
    }
    assert.equal(interactions.some((entry) => entry.interactionId === `${session}:i15` || entry.interactionId === `${session}:i17`), false, `${locale}:unsegmented`);
  }
});

test("L01/S08 has no retirement or replacement amendment for protected history", () => {
  const amendments = ledger().amendments.filter((entry) => entry.courseSessionId === session);
  assert.equal(amendments.some((entry) => entry.action === "retire" || entry.action === "replacement"), false);
});

test("L01/S08 permits only its exact documented historical repeat", () => {
  const data = atomic();
  const evidence = { ledger: ledger() };
  const findings = sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s08"]), preservationEvidence: evidence });
  assert.deepEqual(
    findings["en/l01/s08"]?.filter((finding) => (
      (finding.taskNumber === 2 || finding.taskNumber === 9)
      && finding.reason === "исходный текст задания не совпадает с проверенным вариантом"
    )) ?? [],
    [],
    "answer-bearing Markdown tails removed by the canonical learner projection are not source mismatches",
  );
  assert.deepEqual(findings, {});
  const altered = structuredClone(evidence);
  altered.ledger.protectedHistoricalRepeatExceptions[0].occurrences[1].newInteractionId = "en:lesson-01:session-08:i17:s04";
  const rejected = sourceQualityFindings({ root, sessionKeys: new Set(["en/l01/s08"]), preservationEvidence: altered });
  assert.equal(rejected["en/l01/s08"]?.some((item) => item.interactionId === "en:lesson-01:session-08:i17:s03"), true);
});
