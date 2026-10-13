import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const session = path.resolve("sessions/en/l01/s54");
const read = (name) => fs.readFileSync(path.join(session, name), "utf8");
const atomic = () => JSON.parse(read("practice.atomic.json"));

test("L01/S54 declares what the learner will be able to say in both locales", () => {
  assert.match(read("final.ru.md"), /\*\*Что вы освоите:\*\* Сказать, что вы волнуетесь, уверены в себе или свободно говорите по-английски\./u);
  assert.match(read("final.uk.md"), /\*\*Що ви опануєте:\*\* Сказати, що ви хвилюєтеся, упевнені в собі або вільно говорите англійською\./u);
});

test("L01/S54 gives authored feedback for every scored choice and builder distractor", () => {
  const source = atomic();
  for (const locale of ["ru", "uk"]) {
    for (const interaction of source.interactionsByLocale[locale]) {
      const payload = interaction.modePayload;
      if (Array.isArray(payload.choiceFeedback) && payload.choiceFeedback.length > 0) {
        assert.ok(payload.choiceFeedback.some((item) => item.correct === true), `${locale}:${interaction.interactionId} has correct choice feedback`);
      }
      if (Array.isArray(payload.authoredDistractorTokens) && payload.authoredDistractorTokens.length > 0) {
        assert.equal(payload.slotFeedback.length, payload.authoredDistractorTokens.length, `${locale}:${interaction.interactionId} explains every distractor tile`);
        assert.ok(payload.completionFeedbackByLocale?.[locale], `${locale}:${interaction.interactionId} has correct completion feedback`);
      }
    }
  }
});
