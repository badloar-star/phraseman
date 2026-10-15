import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-44";
const choices = { i01: "I'm", i02: "tired", i03: "He's", i06: "wrong", i07: "cold", i08: "free", i10: "It's", i12: "are", "i16:s01": "'s" };
const tiles = { i04: { d1: "is" }, i05: { d1: "are", d2: "cold" }, i09: { d1: "am" }, i13: { d1: "It's" }, i15: { d1: "They" }, "i16:s02": { d1: "are" } };
test("L01/S44 explains every checked answer and distractor", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s44/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.ok((feedback?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:explanation`); } for (const [id, slots] of Object.entries(tiles)) for (const [slot, word] of Object.entries(slots)) { const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:${slot}`); assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile`); assert.ok((feedback?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:${slot}:explanation`); } }
});
