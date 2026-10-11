import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-21";
const choiceAnswers = { i02: "short", i04: "thin", i06: "is", i09: "young", i10: "am", i14: "quiet", i17: "are" };
const extraTiles = { i05: "am", i15: "are", i16: "is", "i18:s03": "are" };
const load = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s21/practice.atomic.json"), "utf8"));

test("L01/S21 explains every checked answer and every authored extra tile in both locales", () => {
  for (const locale of ["ru", "uk"]) {
    const interactions = new Map(load().interactionsByLocale[locale].map((item) => [item.interactionId.slice(`${session}:`.length), item]));
    for (const [id, answer] of Object.entries(choiceAnswers)) {
      const item = interactions.get(id);
      const row = item.modePayload.choiceFeedback.find((feedback) => feedback.responseId === `${session}:${id}:r1`);
      assert.equal(row?.correct, true, `${locale}:${id}: correct feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(answer), `${locale}:${id}: feedback names the correct answer`);
    }
    for (const [id, tile] of Object.entries(extraTiles)) {
      const item = interactions.get(id);
      const row = item.modePayload.slotFeedback.find((feedback) => feedback.responseId === `${session}:${id}:tile:d1`);
      assert.equal(row?.correct, false, `${locale}:${id}: tile feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(tile), `${locale}:${id}: feedback names the rejected tile`);
    }
  }
});
