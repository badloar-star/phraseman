import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-42";
const choices = { i02: "great", i04: "awful", i07: "gone", i08: "great", i12: "gone", i15: "awful" };
const tiles = { i05: { d1: "is" }, i09: { d1: "She" }, i11: { d1: "great", d2: "is" }, i13: { d1: "is", d2: "quiet" }, i14: { d1: "gone", d2: "is" }, i16: { d1: "is" } };
test("L01/S42 explains every checked answer and distractor", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s42/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
    for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:explanation`); }
    for (const [id, distractors] of Object.entries(tiles)) for (const [slot, word] of Object.entries(distractors)) { const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:${slot}`); assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile`); assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:${slot}:explanation`); }
  }
});
