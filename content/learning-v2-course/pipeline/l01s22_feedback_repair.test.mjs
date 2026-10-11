import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-22";
const choiceAnswers = { i02: "asleep", i04: "awake", i05: "asleep", i08: "ill", i10: "ill", i13: "quiet" };
const extraTiles = { i09: "am", i11: "asleep", i14: "are", i16: "not", "i17:s02": "are", "i17:s03": "are", "i17:s04": "are" };
const load = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s22/practice.atomic.json"), "utf8"));

test("L01/S22 explains every checked answer and every authored extra tile in both locales", () => {
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

test("L01/S22 opens with a literal, learner-readable definition of asleep", () => {
  const ru = fs.readFileSync(path.join(root, "sessions/en/l01/s22/final.ru.md"), "utf8");
  const uk = fs.readFileSync(path.join(root, "sessions/en/l01/s22/final.uk.md"), "utf8");
  assert.match(ru, /`asleep` — «спит»\. Глаза закрыты, дыхание ровное\./);
  assert.match(uk, /`asleep` — «спить»\. Очі заплющені, дихання рівне\./);
  assert.doesNotMatch(ru, /звать его бесполезно/);
  assert.doesNotMatch(uk, /гукати її марно/);
});
