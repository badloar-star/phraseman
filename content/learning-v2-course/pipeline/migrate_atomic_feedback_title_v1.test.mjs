import assert from "node:assert/strict";
import test from "node:test";

import { feedbackTitleMigrationsForAtomic } from "./migrate_atomic_feedback_title_v1.mjs";

test("restores only exact forty-character feedback-title prefixes from the same locale task", () => {
  const ruTitle = "Соберите фразу — скажите подруге, что довольны ужином";
  const ukTitle = "Складіть фразу — скажіть подрузі, що задоволені вечерею";
  const atomic = {
    interactionsByLocale: {
      ru: [{
        interactionId: "en:lesson-01:session-45:i09",
        modePayload: {
          family: "phrase_builder",
          slotFeedback: [
            { testedDimension: ruTitle.slice(0, 40) },
            { testedDimension: "Авторское объяснение нельзя заменять" },
          ],
        },
      }],
      uk: [{
        interactionId: "en:lesson-01:session-45:i09",
        modePayload: {
          family: "phrase_builder",
          slotFeedback: [{ testedDimension: ukTitle.slice(0, 40) }],
        },
      }],
    },
  };
  const tasksByLocale = {
    ru: [{ interactionId: "en:lesson-01:session-45:i09", title: ruTitle, family: "phrase_builder" }],
    uk: [{ interactionId: "en:lesson-01:session-45:i09", title: ukTitle, family: "phrase_builder" }],
  };

  const result = feedbackTitleMigrationsForAtomic(atomic, tasksByLocale);

  assert.deepEqual(result.holds, []);
  assert.equal(result.changed, 2);
  assert.equal(atomic.interactionsByLocale.ru[0].modePayload.slotFeedback[0].testedDimension, ruTitle);
  assert.equal(atomic.interactionsByLocale.uk[0].modePayload.slotFeedback[0].testedDimension, ukTitle);
  assert.equal(
    atomic.interactionsByLocale.ru[0].modePayload.slotFeedback[1].testedDimension,
    "Авторское объяснение нельзя заменять",
  );
});

test("restores direct grammar and sound metadata without creating absent feedback fields", () => {
  const grammarTitle = "Вставьте слово — после двух смен сил почти нет";
  const soundTitle = "Послушайте и выберите — различите ship и sheep в сообщении";
  const atomic = {
    interactionsByLocale: {
      ru: [
        {
          interactionId: "en:lesson-01:session-45:i10",
          modePayload: { family: "context_gap_grammar", testedDimension: grammarTitle.slice(0, 40) },
        },
        {
          interactionId: "en:lesson-01:session-45:i11",
          modePayload: { family: "sound_contrast", testedPhoneticContrast: soundTitle.slice(0, 40) },
        },
      ],
      uk: [
        {
          interactionId: "en:lesson-01:session-45:i10",
          modePayload: { family: "context_gap_grammar" },
        },
        {
          interactionId: "en:lesson-01:session-45:i11",
          modePayload: { family: "sound_contrast", testedPhoneticContrast: "Інше авторське поле" },
        },
      ],
    },
  };
  const tasksByLocale = {
    ru: [
      { interactionId: "en:lesson-01:session-45:i10", title: grammarTitle, family: "context_gap_grammar" },
      { interactionId: "en:lesson-01:session-45:i11", title: soundTitle, family: "sound_contrast" },
    ],
    uk: [
      { interactionId: "en:lesson-01:session-45:i10", title: "Вставте слово — після двох змін сил майже немає", family: "context_gap_grammar" },
      { interactionId: "en:lesson-01:session-45:i11", title: "Послухайте й оберіть — розрізніть ship і sheep", family: "sound_contrast" },
    ],
  };

  const result = feedbackTitleMigrationsForAtomic(atomic, tasksByLocale);

  assert.deepEqual(result.holds, []);
  assert.equal(result.changed, 2);
  assert.equal(atomic.interactionsByLocale.ru[0].modePayload.testedDimension, grammarTitle);
  assert.equal(atomic.interactionsByLocale.ru[1].modePayload.testedPhoneticContrast, soundTitle);
  assert.equal("testedDimension" in atomic.interactionsByLocale.uk[0].modePayload, false);
  assert.equal(atomic.interactionsByLocale.uk[1].modePayload.testedPhoneticContrast, "Інше авторське поле");
});

test("holds when parsed Markdown and atomic interaction identities diverge", () => {
  const atomic = {
    interactionsByLocale: {
      ru: [{ interactionId: "en:lesson-01:session-45:i09", modePayload: {} }],
      uk: [{ interactionId: "en:lesson-01:session-45:i09", modePayload: {} }],
    },
  };
  const tasksByLocale = {
    ru: [{ interactionId: "en:lesson-01:session-45:i10", title: "Полный заголовок", family: "phrase_builder" }],
    uk: [{ interactionId: "en:lesson-01:session-45:i10", title: "Повний заголовок", family: "phrase_builder" }],
  };

  const result = feedbackTitleMigrationsForAtomic(atomic, tasksByLocale);

  assert.equal(result.changed, 0);
  assert.ok(result.holds.every((hold) => hold.index === 0 && hold.reason === "interaction_id"));
  assert.equal(result.holds.length, 2);
});
