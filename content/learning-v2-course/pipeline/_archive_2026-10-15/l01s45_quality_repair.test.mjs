import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const sessionDir = path.resolve("content/learning-v2-course/sessions/en/l01/s45");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const item = (data, locale, suffix) => data.interactionsByLocale[locale]
  .find((entry) => entry.interactionId === `en:lesson-01:session-45:${suffix}`);

test("L01/S45 explains every selected answer and every authored builder trap", () => {
  const data = atomic();
  const choiceIds = ["i02", "i04", "i06", "i08", "i10", "i12", "i14", "i17:s01", "i17:s02"];
  const tileIds = ["i09", "i11", "i13", "i15", "i17:s03"];
  for (const locale of ["ru", "uk"]) {
    for (const suffix of choiceIds) {
      const current = item(data, locale, suffix);
      const answer = data.answers.find((row) => row.interactionId === current.interactionId);
      const feedback = current.modePayload.choiceFeedback.find((row) => row.responseId === answer.correctResponseId);
      assert.equal(feedback?.correct, true, `${locale}:${suffix} needs correct feedback`);
      assert.ok(feedback?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs RU correct feedback`);
      assert.ok(feedback?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs UK correct feedback`);
    }
    for (const suffix of tileIds) {
      const current = item(data, locale, suffix);
      assert.equal(current.modePayload.slotFeedback.length, 1, `${locale}:${suffix} needs one tile-trap explanation`);
      assert.equal(current.modePayload.slotFeedback[0].correct, false, `${locale}:${suffix} tile trap must be marked wrong`);
    }
  }
});

test("L01/S45 preserves exact negative meaning and explains the meeting referent without a false number rule", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const finalBuilder = item(data, locale, "i17:s03");
    assert.equal(finalBuilder.modePayload.localizedMeaning[locale], locale === "ru" ? "не изнурены" : "не виснажені");
    const meeting = item(data, locale, "i17:s02");
    const theyFeedback = meeting.modePayload.choiceFeedback.find((row) => row.responseId.endsWith(":r3"));
    assert.match(theyFeedback.feedbackByLocale[locale], locale === "ru" ? /времени встречи.*не о людях/u : /час зустрічі.*не про людей/u, `${locale}: meeting feedback must explain the actual referent`);
    assert.doesNotMatch(theyFeedback.feedbackByLocale[locale], /объект|об’єкт/u, `${locale}: they is not explained as an object-taking form`);
  }
});

test("L01/S45 keeps the settled word card anchored to the authored meeting scene", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const card = item(data, locale, "i05").modePayload;
    const definition = card.wordCard.definitionByLocale[locale];
    const expected = locale === "ru"
      ? "«решено, улажено»: Лина и коллеги выбрали время встречи и все согласились."
      : "«вирішено, домовилися»: Ліна та колеги обрали час зустрічі й усі погодилися.";
    assert.equal(definition, expected, `${locale}: word-card wording must exactly match the reviewed source`);
    assert.equal(card.localizedMeaningChoices[0].meaningByLocale[locale], definition, `${locale}: meaning choice must match the displayed word-card scene`);
  }
});
