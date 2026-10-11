import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-20";
const requiredChoices = { i02: "married", i04: "single", i06: "married", i09: "famous", i11: "rich", i13: "famous", i15: "quiet" };
const requiredTiles = { i07: "are", i12: "famous", i16: "young", i17: "young" };
const source = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s20/practice.atomic.json"), "utf8"));

test("L01/S20 gives every required answer and distractor a direct explanation", () => {
  for (const locale of ["ru", "uk"]) {
    for (const [id, answer] of Object.entries(requiredChoices)) {
      const item = source().interactionsByLocale[locale].find((row) => row.interactionId === `${session}:${id}`);
      const row = item.modePayload.choiceFeedback.find((feedback) => feedback.responseId === `${session}:${id}:r1`);
      assert.equal(row?.correct, true, `${locale}:${id}: correct feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(answer), `${locale}:${id}: names its answer`);
    }
    for (const [id, tile] of Object.entries(requiredTiles)) {
      const item = source().interactionsByLocale[locale].find((row) => row.interactionId === `${session}:${id}`);
      const row = item.modePayload.slotFeedback.find((feedback) => feedback.responseId === `${session}:${id}:tile:d1`);
      assert.equal(row?.correct, false, `${locale}:${id}: distractor feedback exists`);
      assert.match(row?.feedbackByLocale?.[locale] ?? "", new RegExp(tile), `${locale}:${id}: names its distractor`);
    }
  }
});

test("L01/S20 does not overclaim from its scenarios or teach a false sound cue", () => {
  const data = source();
  const all = JSON.stringify(data);
  assert.doesNotMatch(all, /у людини немає пари|у человека нет пары/i, "single is constrained to marital status");
  assert.doesNotMatch(all, /У `single` — «н»|У `single` — «н»/i, "single does not mislabel ng as plain n");
  assert.doesNotMatch(all, /Початок однаковий|Начало одинаковое/i, "family is not presented as sharing famous's stressed vowel");
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.split(":").at(-1), item]));
    assert.match(byId.get("i13").prompt, /реклам/i, `${locale}: i13 includes the evidence that identifies fame`);
    assert.doesNotMatch(byId.get("i15").prompt, /весь день|цілий день/i, `${locale}: i15 agrees with the evening scene`);
  }
});
