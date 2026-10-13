import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-43";
const choices = { i02: "bad", i05: "real", i07: "true", i10: "is", i14: "wrong", i15: "ok" };
const tiles = { i03: { d1: "are" }, i08: { d1: "is" }, i09: { d1: "isn't" } };
test("L01/S43 explains every checked answer and distractor", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s43/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:explanation`); } for (const [id, slots] of Object.entries(tiles)) for (const [slot, word] of Object.entries(slots)) { const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:${slot}`); assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile`); assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:${slot}:explanation`); } }
});
