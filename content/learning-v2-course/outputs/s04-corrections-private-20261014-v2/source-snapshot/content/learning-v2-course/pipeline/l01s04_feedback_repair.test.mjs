import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s04");
const read = () => JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
const text = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const idFor = (suffix) => `en:lesson-01:session-04:${suffix}`;
const choiceIds = ["i02", "i04", "i06", "i08", "i09", "i13", "i15", "i21"];
const tileIds = ["i12", "i14", "i16", "i18", "i20"];

function interaction(data, locale, suffix) {
  return data.interactionsByLocale[locale].find((entry) => entry.interactionId === idFor(suffix));
}

test("S04 selectable feedback is complete, bilingual, specific, and wrong-answer only", () => {
  const data = read();
  for (const suffix of choiceIds) {
    const answer = data.answers.find((entry) => entry.interactionId === idFor(suffix));
    for (const locale of ["ru", "uk"]) {
      const item = interaction(data, locale, suffix);
      const rows = item?.modePayload?.choiceFeedback ?? [];
      assert.ok(rows.length > 0, `${locale}:${suffix} needs wrong-answer feedback`);
      assert.ok(!rows.some((row) => row.correct === true || row.responseId === answer?.correctResponseId), `${locale}:${suffix} must not explain a correct answer`);
      for (const row of rows) {
        assert.equal(row.correct, false, `${locale}:${suffix}:${row.responseId} is not a wrong-answer row`);
        assert.ok(row.feedbackByLocale?.ru?.trim() && row.feedbackByLocale?.uk?.trim(), `${locale}:${suffix}:${row.responseId} needs bilingual feedback`);
        assert.ok(!/^верно:|^правильно:/iu.test(row.feedbackByLocale.ru.trim()), `${locale}:${suffix}:${row.responseId} reveals correct-answer feedback`);
      }
    }
  }
});

test("S04 builder feedback covers each wrong physical tile in both locales", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) for (const suffix of tileIds) {
    const row = interaction(data, locale, suffix)?.modePayload?.slotFeedback?.[0];
    assert.equal(row?.responseId, `${idFor(suffix)}:tile:d1`, `${locale}:${suffix} needs physical tile feedback`);
    assert.equal(row?.correct, false, `${locale}:${suffix} extra tile must be wrong`);
    assert.ok(row?.feedbackByLocale?.ru?.trim() && row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs bilingual tile feedback`);
  }
});

test("S04 word cards have localized meanings for all four new words", () => {
  const data = read();
  for (const suffix of ["i01", "i03", "i05", "i07"]) for (const locale of ["ru", "uk"]) {
    const item = interaction(data, locale, suffix);
    assert.ok(item?.modePayload?.wordCard?.definitionByLocale?.[locale]?.trim(), `${locale}:${suffix} needs a localized definition`);
    assert.ok(item?.modePayload?.localizedMeaningChoices?.[0]?.meaningByLocale?.[locale]?.trim(), `${locale}:${suffix} needs a localized meaning choice`);
  }
});

test("S04 source feedback documents only incorrect selectable answers", () => {
  for (const locale of ["ru", "uk"]) {
    const source = text(`final.${locale}.md`);
    for (const suffix of choiceIds) {
      const start = source.indexOf(`interaction_id: ${idFor(suffix)};`);
      assert.notEqual(start, -1, `${locale}:${suffix} must be documented`);
      const next = source.indexOf("<!-- interaction_id:", start + 1);
      const section = source.slice(start, next < 0 ? source.length : next);
      assert.doesNotMatch(section, /-\s*✅/u, `${locale}:${suffix} must not show correct-answer feedback`);
    }
  }
});

test("S04 word-card meanings, interaction answer text, and feedback rows contain no blank values", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) for (const item of data.interactionsByLocale[locale]) {
    for (const [index, choice] of (item.modePayload?.localizedMeaningChoices ?? []).entries()) {
      for (const value of Object.values(choice.meaningByLocale ?? {})) assert.ok(value?.trim(), `${locale}:${item.interactionId}:choice${index} has an empty meaning`);
    }
    for (const [index, row] of (item.modePayload?.choiceFeedback ?? []).entries()) {
      for (const value of Object.values(row.feedbackByLocale ?? {})) assert.ok(value?.trim(), `${locale}:${item.interactionId}:feedback${index} is empty`);
    }
  }
});

test("S04 sound contrast asks about an audible clue without naming the selected word", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) {
    const item = interaction(data, locale, "i08");
    const prompt = `${item.prompt} ${item.modePayload.testedPhoneticContrast} ${item.modePayload.localizedScene?.[locale] ?? ""}`;
    assert.doesNotMatch(prompt, /wrong|неверн|неправильн|wrong\s*—/iu);
    assert.match(prompt, /song|rhyme|рим|рима|звук|закінч/iu, `${locale}:i08 needs a neutral audible clue`);
  }
});

test("S04 Anton gap does not tell the learner which word belongs in the blank", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) {
    const item = interaction(data, locale, "i13");
    const scene = item.modePayload.localizedScene[locale];
    assert.doesNotMatch(scene, /не хватает am|бракує am|нужно am|потрібне am/iu);
    assert.match(scene, /I wrong/u);
  }
});

test("S04 final practice builds varied affirmative and negative self-descriptions", () => {
  const data = read();
  const expected = { i14: "I am not late.", i16: "I am not tired.", i18: "I am not alone.", i20: "I am right." };
  for (const locale of ["ru", "uk"]) for (const [suffix, answer] of Object.entries(expected)) {
    assert.equal(interaction(data, locale, suffix)?.modePayload?.targetPhrase, answer, `${locale}:${suffix} should preserve a distinct target`);
  }
  assert.equal(new Set(Object.values(expected)).size, 4);
});

test("S04 localized batch is the exact contractual wrapper around final.uk.md", () => {
  assert.equal(text("locales_batch.md"), `===LOCALE: uk===\n${text("final.uk.md").trim()}\n`);
});
