import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-26";
const choiceAnswers = { i02: "rainy", i04: "windy", i08: "early", i10: "rainy", i12: "is", i15: "warm" };
const extraTiles = { i05: "not", i09: "early", i14: "not", i16: "windy", i17: "am", "i18:s02": "are", "i18:s03": "are" };
const load = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s26/practice.atomic.json"), "utf8"));

test("L01/S26 explains every checked answer and every extra tile without phantom choice options", () => {
  for (const locale of ["ru", "uk"]) {
    const interactions = new Map(load().interactionsByLocale[locale].map((item) => [item.interactionId.slice(`${session}:`.length), item]));
    for (const [id, answer] of Object.entries(choiceAnswers)) {
      const row = interactions.get(id).modePayload.choiceFeedback.find((feedback) => feedback.responseId === `${session}:${id}:r1`);
      assert.equal(row?.correct, true, `${locale}:${id}: correct feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(answer), `${locale}:${id}: feedback names the correct answer`);
    }
    for (const [id, tile] of Object.entries(extraTiles)) {
      const item = interactions.get(id);
      assert.deepEqual(item.responseOptions, [], `${locale}:${id}: a tile task has no phantom choices`);
      assert.ok(item.modePayload.slotFeedback.every((feedback) => feedback.responseId === `${session}:${id}:tile:d1`), `${locale}:${id}: tile feedback has no stale response binding`);
      const row = item.modePayload.slotFeedback.find((feedback) => feedback.responseId === `${session}:${id}:tile:d1`);
      assert.equal(row?.correct, false, `${locale}:${id}: tile feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(tile), `${locale}:${id}: feedback names the rejected tile`);
    }
  }
});
