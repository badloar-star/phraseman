import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-47";
const choices = { i02: "drunk", i06: "sleepy", i08: "awake", i10: "sober", i12: "tired", i16: "quiet" };
const tiles = { i04: { d1: "am", d2: "he's" }, i13: { d1: "aren't" }, i14: { d1: "isn't" }, i17: { d1: "quiet" } };
test("L01/S47 explains every checked answer and distractor", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s47/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.match((feedback?.feedbackByLocale?.[locale] ?? "").toLowerCase(), new RegExp(word), `${locale}:${id}:explanation`); } for (const [id, slots] of Object.entries(tiles)) for (const [slot, word] of Object.entries(slots)) { const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:${slot}`); assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile`); assert.match((feedback?.feedbackByLocale?.[locale] ?? "").toLowerCase(), new RegExp(word), `${locale}:${id}:${slot}:explanation`); } }
});
