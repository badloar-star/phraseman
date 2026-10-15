import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-48";
const choices = { i01: "tired", i02: "tired", i03: "gone", i05: "is", i06: "loud", i07: "loud", i10: "great", i12: "home", i14: "happy" };
const tiles = { i04: { d1: "is", d2: "home" }, i08: { d1: "They're" }, i09: { d1: "I", d2: "happy" }, i13: { d1: "isn't" }, "i16:s01": { d1: "are" } };
test("L01/S48 explains every checked answer and distractor", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s48/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) { const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item])); for (const [id, word] of Object.entries(choices)) { const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`); assert.equal(feedback?.correct, true, `${locale}:${id}:correct`); assert.ok((feedback?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:explanation`); } for (const [id, slots] of Object.entries(tiles)) for (const [slot, word] of Object.entries(slots)) { const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:${slot}`); assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile`); assert.ok((feedback?.feedbackByLocale?.[locale] ?? "").includes(word), `${locale}:${id}:${slot}:explanation`); } }
});

test("L01/S48 tired prompt has one defensible answer", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s48/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${session}:i02`);
    const option = item.modePayload.gapOptions.find((entry) => entry.responseId === `${session}:i02:r2`);
    const visibleOption = item.responseOptions.find((entry) => entry.responseId === `${session}:i02:r2`);
    const feedback = item.modePayload.choiceFeedback.find((entry) => entry.responseId === `${session}:i02:r2`);
    assert.equal(option?.text, "are", `${locale}: i02 r2 must be grammatically impossible after I'm`);
    assert.equal(visibleOption?.text, "are", `${locale}: i02 r2 visible option matches its gap option`);
    assert.match(feedback?.feedbackByLocale?.[locale] ?? "", /I'm/, `${locale}: i02 r2 explains the grammar`);
  }
});
