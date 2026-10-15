import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-14";
const locales = ["ru", "uk"];

function source() {
  return JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s14/practice.atomic.json"), "utf8"));
}

function interactionsById(data, locale) {
  return new Map(data.interactionsByLocale[locale].map((interaction) => [interaction.interactionId, interaction]));
}

test("L01/S14 authors feedback only for wrong selectable responses and tiles", () => {
  const data = source();
  const answers = new Map(data.answers.map((answer) => [answer.interactionId, answer.correctResponseId]));

  for (const locale of locales) {
    for (const interaction of data.interactionsByLocale[locale]) {
      const options = interaction.responseOptions ?? [];
      if (options.length < 2) continue;

      const correctId = answers.get(interaction.interactionId);
      assert.ok(correctId, `${locale}:${interaction.interactionId}: missing correct response authority`);
      const wrongIds = options.map((option) => option.responseId).filter((id) => id !== correctId);
      const feedback = interaction.modePayload?.choiceFeedback ?? [];
      const feedbackIds = feedback.map((entry) => entry.responseId);

      assert.deepEqual(feedbackIds.toSorted(), wrongIds.toSorted(), `${locale}:${interaction.interactionId}: feedback must cover wrong options only`);
      for (const entry of feedback) {
        assert.equal(entry.correct, false, `${locale}:${entry.responseId}: correct-option feedback is runtime-owned`);
        for (const feedbackLocale of locales) {
          const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
          assert.ok(text.trim(), `${locale}:${entry.responseId}:${feedbackLocale}: missing localized correction`);
          assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${entry.responseId}:${feedbackLocale}: generic feedback`);
        }
      }
    }

    for (const interaction of data.interactionsByLocale[locale]) {
      const extraTiles = interaction.modePayload?.authoredDistractorTokens ?? [];
      const feedback = interaction.modePayload?.slotFeedback ?? [];
      if (!extraTiles.length) {
        assert.equal(feedback.length, 0, `${locale}:${interaction.interactionId}: unexpected tile feedback`);
        continue;
      }

      assert.equal(feedback.length, extraTiles.length, `${locale}:${interaction.interactionId}: each extra tile needs one correction`);
      for (let index = 0; index < extraTiles.length; index += 1) {
        const entry = feedback[index];
        assert.equal(entry.responseId, `${interaction.interactionId}:tile:d${index + 1}`, `${locale}:${interaction.interactionId}: tile feedback order/ID`);
        assert.equal(entry.correct, false, `${locale}:${entry.responseId}: correct-tile feedback is forbidden`);
        for (const feedbackLocale of locales) {
          assert.ok(entry.feedbackByLocale?.[feedbackLocale]?.trim(), `${locale}:${entry.responseId}:${feedbackLocale}: missing localized tile correction`);
        }
      }
    }
  }
});

test("L01/S14 does not make pronunciation claims without audio evidence", () => {
  const forbidden = /(?:слыш\w*|чути\w*|глух\w*|дзвінк\w*|звонк\w*|гласн\w*|голосн\w*|долг\w* гласн|довг\w* голосн|звуки йдуть слитно|звуки йдуть злито|звуки идут слитно|после `?r`? сразу слыш|після `?r`? одразу чути)/iu;

  const data = source();
  for (const locale of locales) {
    for (const interaction of data.interactionsByLocale[locale]) {
      for (const entry of interaction.modePayload?.choiceFeedback ?? []) {
        for (const feedbackLocale of locales) {
          assert.doesNotMatch(entry.feedbackByLocale?.[feedbackLocale] ?? "", forbidden, `${locale}:${entry.responseId}:${feedbackLocale}: unverified sound claim`);
        }
      }
    }
  }

  for (const file of ["final.ru.md", "final.uk.md"]) {
    const text = fs.readFileSync(path.join(root, `sessions/en/l01/s14/${file}`), "utf8");
    const practice = text.split("## Практика")[1]?.split("## Для сборщика")[0] ?? "";
    const feedbackLines = practice.split(/\r?\n/u).filter((line) => /^- .+ — \*/u.test(line));
    for (const line of feedbackLines) {
      assert.doesNotMatch(line, forbidden, `${file}: remove unverified sound/pronunciation claim from feedback`);
    }
  }
});

test("L01/S14 scene and tested dimension are locale-consistent", () => {
  const data = source();
  const byLocale = Object.fromEntries(locales.map((locale) => [locale, interactionsById(data, locale)]));

  for (const interactionId of byLocale.ru.keys()) {
    const ru = byLocale.ru.get(interactionId);
    const uk = byLocale.uk.get(interactionId);
    assert.ok(uk, `${interactionId}: missing Ukrainian interaction`);
    assert.equal(ru.ordinal, uk.ordinal, `${interactionId}: locale order drift`);
    assert.equal(ru.family, uk.family, `${interactionId}: locale family drift`);
    if (ru.modePayload?.localizedScene) assert.equal(ru.modePayload.localizedScene.ru, ru.prompt, `${interactionId}: RU scene differs from its prompt`);
    if (uk.modePayload?.localizedScene) assert.equal(uk.modePayload.localizedScene.uk, uk.prompt, `${interactionId}: UK scene differs from its prompt`);
    if (ru.modePayload?.localizedMeaning) assert.equal(ru.modePayload.localizedMeaning.ru, ru.prompt, `${interactionId}: RU meaning differs from its prompt`);
    if (uk.modePayload?.localizedMeaning) assert.equal(uk.modePayload.localizedMeaning.uk, uk.prompt, `${interactionId}: UK meaning differs from its prompt`);

    if (ru.modePayload?.testedDimension || uk.modePayload?.testedDimension) {
      assert.equal(typeof ru.modePayload?.testedDimension, "string", `${interactionId}: RU tested dimension missing`);
      assert.equal(typeof uk.modePayload?.testedDimension, "string", `${interactionId}: UK tested dimension missing`);
      assert.ok(ru.modePayload.testedDimension.trim(), `${interactionId}: RU tested dimension is empty`);
      assert.ok(uk.modePayload.testedDimension.trim(), `${interactionId}: UK tested dimension is empty`);
    }
  }
});
