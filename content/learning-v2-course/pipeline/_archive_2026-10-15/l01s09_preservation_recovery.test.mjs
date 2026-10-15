import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-09";
const expectedFinal = [
  ["i18:s01", "You are right."],
  ["i18:s02", "I am new."],
  ["i18:s03", "I am not tired."],
  ["i18:s04", "You are kind."],
];
const expectedCorrectResponses = ["i02:r1", "i04:r1", "i06:r1", "i08:r1", "i11:r1", "i17:r1"];
const expectedTileFeedback = ["i13:tile:d1", "i13:tile:d2", "i16:tile:d1"];
const atomic = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s09/practice.atomic.json"), "utf8"));
const ledger = () => JSON.parse(fs.readFileSync(path.join(root, "migration/single-phrase-2026-10-03/preservation-ledger.json"), "utf8"));

test("L01/S09 preserves all four historical final spoken steps in both locales", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.equal(interactions.length, 21, locale);
    for (const [suffix, target] of expectedFinal) {
      const row = interactions.find((entry) => entry.interactionId === `${session}:${suffix}`);
      assert.equal(row?.family, "scripted_repeat_compare", `${locale}:${suffix}:family`);
      assert.equal(row?.modePayload?.targetPhrase, target, `${locale}:${suffix}:target`);
      assert.equal(row?.modePayload?.referenceAudio?.transcript, target, `${locale}:${suffix}:audio`);
    }
    assert.equal(interactions.some((entry) => entry.interactionId === `${session}:i18`), false, `${locale}:unsegmented`);
  }
});

test("L01/S09 explains unused builder tiles without adding correct-answer feedback", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    const feedback = interactions.flatMap((entry) => [
      ...(entry.modePayload?.choiceFeedback ?? []),
      ...(entry.modePayload?.slotFeedback ?? []),
    ]);
    for (const suffix of expectedCorrectResponses) {
      assert.equal(feedback.some((entry) => entry.responseId === `${session}:${suffix}`), false, `${locale}:${suffix}`);
    }
    for (const suffix of expectedTileFeedback) {
      assert.equal(feedback.some((entry) => entry.responseId === `${session}:${suffix}` && entry.feedbackByLocale?.ru?.trim() && entry.feedbackByLocale?.uk?.trim()), true, `${locale}:${suffix}`);
    }
  }
});

test("L01/S09 has no retirement or replacement amendment for protected history", () => {
  const amendments = ledger().amendments.filter((entry) => entry.courseSessionId === session);
  assert.equal(amendments.some((entry) => entry.action === "retire" || entry.action === "replacement"), false);
});
