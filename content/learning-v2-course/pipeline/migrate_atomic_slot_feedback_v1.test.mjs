import assert from "node:assert/strict";
import test from "node:test";

import { parseSessionFilter, slotFeedbackMigrationsForAtomic } from "./migrate_atomic_slot_feedback_v1.mjs";

test("accepts one exact session filter and rejects malformed or duplicated filters", () => {
  assert.equal(parseSessionFilter(["node", "script", "--session", "en/l01/s56"]), "l01/s56");
  assert.throws(() => parseSessionFilter(["node", "script", "--session", "l01/s56"]), /Invalid --session/u);
  assert.throws(() => parseSessionFilter(["node", "script", "--session", "en/l01/s56", "--session", "en/l01/s55"]), /only once/u);
});

test("copies the reviewed tile explanation verbatim instead of retaining an older paraphrase", () => {
  const task = {
    ordinal: 11,
    interactionId: "en:lesson-01:session-03:i11",
    family: "listen_build_dictation",
    title: "Послушайте и соберите — «я не уверен»",
    target: "I am not sure.",
    tokens: ["sure", "am", "not", "I", "no"],
    body: "🔊 *I am not sure.* Плитки: `sure` `am` `not` `I` `no` → **I am not sure.**\n*(плитка `no` лишняя: это отдельный ответ, а внутри фразы нужно not)*",
  };
  const atomic = {
    interactionsByLocale: {
      ru: [{ interactionId: task.interactionId, modePayload: { orderedTokens: ["I", "am", "not", "sure"], slotFeedback: [{ responseId: `${task.interactionId}:tile:d1`, correct: false, feedbackByLocale: { ru: "no — отдельный ответ, а внутри фразы нужно not." } }] } }],
      uk: [{ interactionId: task.interactionId, modePayload: { orderedTokens: ["I", "am", "not", "sure"], slotFeedback: [{ responseId: `${task.interactionId}:tile:d1`, correct: false, feedbackByLocale: { uk: "no — окрема відповідь, а всередині фрази потрібне not." } }] } }],
    },
  };
  const perLocale = {
    ru: [task],
    uk: [{ ...task, title: "Послухайте і складіть — «я не впевнений»", body: "🔊 *I am not sure.* Плитки: `sure` `am` `not` `I` `no` → **I am not sure.**\n*(плитка `no` зайва: це окрема відповідь, а всередині фрази потрібне not)*" }],
  };

  const result = slotFeedbackMigrationsForAtomic(atomic, perLocale);

  assert.deepEqual(result.holds, []);
  assert.equal(result.changed, 1);
  assert.deepEqual(atomic.interactionsByLocale.ru[0].modePayload.slotFeedback[0].feedbackByLocale, {
    ru: "это отдельный ответ, а внутри фразы нужно not",
    uk: "це окрема відповідь, а всередині фрази потрібне not",
  });
  assert.equal(atomic.interactionsByLocale.ru[0].modePayload.slotFeedback[0].testedDimension, task.title);
  assert.equal(
    atomic.interactionsByLocale.uk[0].modePayload.slotFeedback[0].testedDimension,
    perLocale.uk[0].title,
    "the Ukrainian projection must bind feedback to the reviewed Ukrainian title",
  );
});
