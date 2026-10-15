import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-17";
const expected = {
  "i02:r1": "tall", "i04:r1": "nice", "i06:r1": "is", "i08:r1": "new",
  "i09:tile:d1": "She is friendly", "i10:r1": "nice",
  "i15:tile:d1": "He is quiet", "i16:r1": "kind"
};

const source = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s17/practice.atomic.json"), "utf8"));

test("L01/S17 feedback explains each exact answer and unused tile", () => {
  for (const locale of ["ru", "uk"]) {
    const feedback = source().interactionsByLocale[locale].flatMap((interaction) => [
      ...(interaction.modePayload?.choiceFeedback ?? []), ...(interaction.modePayload?.slotFeedback ?? [])
    ]);
    for (const [suffix, answer] of Object.entries(expected)) {
      const entry = feedback.find((item) => item.responseId === `${session}:${suffix}`);
      assert.ok(entry, `${locale}:${suffix}: missing feedback`);
      assert.equal(Boolean(entry.correct), suffix.includes(":r1"), `${locale}:${suffix}: incorrect correctness`);
      for (const feedbackLocale of ["ru", "uk"]) {
        const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
        assert.match(text, new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${locale}:${suffix}:${feedbackLocale}: must name exact answer`);
        assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
      }
    }
  }
});

test("L01/S17 does not ask a learner to reject an unintroduced or equally plausible word", () => {
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(source().interactionsByLocale[locale].map((item) => [item.interactionId, item]));
    const i10 = byId.get(`${session}:i10`);
    assert.equal(i10.responseOptions.find((option) => option.responseId.endsWith(":r2"))?.text, "tall", `${locale}: i10 distractor must be unambiguous`);
    assert.match(i10.modePayload.choiceFeedback.find((item) => item.responseId.endsWith(":r2"))?.feedbackByLocale?.ru ?? "", /tall/u, `${locale}: i10 distractor must explain the exact word`);
    const i15 = byId.get(`${session}:i15`);
    assert.deepEqual(i15.modePayload.authoredDistractorTokens, ["tall"], `${locale}: i15 must use a taught distractor`);
    assert.match(i15.modePayload.slotFeedback[0]?.feedbackByLocale?.ru ?? "", /tall/u, `${locale}: i15 distractor must explain the exact tile`);
  }
});

test("L01/S17 Markdown shows the same repaired learner choices", () => {
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(root, `sessions/en/l01/s17/final.${locale}.md`), "utf8");
    assert.match(markdown, /\*\*nice\*\* · tall · new/u, `${locale}: i10 Markdown options must match source`);
    assert.match(markdown, /Плитки: `quiet` `is` `He` `tall` → \*\*He is quiet\./u, `${locale}: i15 Markdown tiles must match source`);
  }
});
