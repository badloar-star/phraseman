import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-41";
const choices = { i01: "I'm", i02: "I'm", i04: "you're", i05: "You're", i07: "sure", i09: "You're", i13: "fine", i14: "You're fine" };
const tiles = { i03: "am", i06: "are", i10: "sorry", i12: "am" };
test("L01/S41 explains every checked wrong answer", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s41/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
    for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:explanation`); }
    for (const [id, word] of Object.entries(tiles)) { const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:d1`); assert.equal(feedback?.correct, false, `${locale}:${id}:wrong tile`); assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:explanation`); }
  }
});
