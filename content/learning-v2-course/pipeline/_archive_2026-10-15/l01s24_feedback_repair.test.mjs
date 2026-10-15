import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-24";
const choiceAnswers = { i02: "is", i03: "quiet", i04: "quiet", i06: "tired", i08: "kind", i09: "kind", i12: "is" };
const extraTiles = { i05: "are", i13: "she", i15: "are" };
const load = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s24/practice.atomic.json"), "utf8"));

test("L01/S24 explains every checked answer and every authored extra tile in both locales", () => {
  for (const locale of ["ru", "uk"]) {
    const interactions = new Map(load().interactionsByLocale[locale].map((item) => [item.interactionId.slice(`${session}:`.length), item]));
    for (const [id, answer] of Object.entries(choiceAnswers)) {
      const row = interactions.get(id).modePayload.choiceFeedback.find((feedback) => feedback.responseId === `${session}:${id}:r1`);
      assert.equal(row?.correct, true, `${locale}:${id}: correct feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(answer), `${locale}:${id}: feedback names the correct answer`);
    }
    for (const [id, tile] of Object.entries(extraTiles)) {
      const row = interactions.get(id).modePayload.slotFeedback.find((feedback) => feedback.responseId === `${session}:${id}:tile:d1`);
      assert.equal(row?.correct, false, `${locale}:${id}: tile feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(tile), `${locale}:${id}: feedback names the rejected tile`);
    }
  }
});
