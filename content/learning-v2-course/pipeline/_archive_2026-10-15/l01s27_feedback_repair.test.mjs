import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-27";
const choiceAnswers = { i02: "cheap", i04: "far", i07: "far", i10: "hard", i12: "hard", i15: "is" };
const extraTiles = { i16: "no", "i21:s02": "are", "i21:s03": "are" };
const load = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s27/practice.atomic.json"), "utf8"));

test("L01/S27 explains every checked answer and every extra tile without phantom choices", () => {
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

test("L01/S27 uses a natural named role in learner-facing copy", () => {
  for (const locale of ["ru", "uk"]) {
    const text = fs.readFileSync(path.join(root, `sessions/en/l01/s27/final.${locale}.md`), "utf8");
    assert.doesNotMatch(text, /Агент|Агенту|Агентом|Агент\b|агент\b/i, `${locale}: no vague agent label`);
    const item = load().interactionsByLocale[locale].find((row) => row.interactionId === `${session}:i15`);
    assert.doesNotMatch(item.prompt, /агент\b/i, `${locale}: source prompt names the role`);
  }
});
