import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-38";
const choices = { i02: "lost", i07: "safe", i08: "safe", i10: "back", i13: "together" };
const tiles = { i04: "is", i09: "safe", i15: "is", i16: "home" };

test("L01/S38 explains every checked wrong answer", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s38/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
    for (const [id, word] of Object.entries(choices)) {
      const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`);
      assert.equal(feedback?.correct, true, `${locale}:${id}:correct choice feedback`);
      assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:explanation`);
    }
    for (const [id, word] of Object.entries(tiles)) {
      const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:d1`);
      assert.equal(feedback?.correct, false, `${locale}:${id}:wrong tile feedback`);
      assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word), `${locale}:${id}:explanation`);
    }
  }
});
