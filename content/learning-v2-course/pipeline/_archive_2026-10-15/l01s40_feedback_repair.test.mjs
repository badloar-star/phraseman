import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-40";
const choices = { i02: "are", i04: "kind", i07: "funny", i08: "kind", i09: "mean", i10: "mean", i12: "are" };
const tiles = { i03: "is", i05: "is", i13: "is", i16: "not" };
test("L01/S40 explains every checked wrong answer", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s40/practice.atomic.json"), "utf8"));
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
