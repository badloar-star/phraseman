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

test("S04 i08 asks for the second recording and matches audio order, accessibility and wrong feedback", () => {
  const data = read();
  const expectedPrompts = {
    ru: "Послушайте две записи. Какое слово звучит во второй?",
    uk: "Послухайте дві аудіозаписи. Яке слово звучить у другій?",
  };
  for (const locale of ["ru", "uk"]) {
    const item = interaction(data, locale, "i08");
    const payload = item.modePayload;
    assert.equal(item.prompt, expectedPrompts[locale]);
    assert.equal(item.accessibilityLabel, item.prompt);
    assert.equal(payload.testedPhoneticContrast, item.prompt);
    assert.equal(payload.audioA.transcript, "right", `${locale}:i08 first recording must be right`);
    assert.equal(payload.audioB.transcript, "wrong", `${locale}:i08 second recording must be wrong`);
    assert.deepEqual(item.responseOptions.map(({ text }) => text), ["right", "wrong"]);
    const feedback = payload.choiceFeedback;
    assert.deepEqual(feedback.map(({ responseId }) => responseId), [`${idFor("i08")}:r1`]);
    assert.match(feedback[0].feedbackByLocale.ru, /right.*перв.*во второй.*wrong/iu);
    assert.match(feedback[0].feedbackByLocale.uk, /right.*перш.*у другому.*wrong/iu);
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

test("S04 practices every intro sentence target in both locales", () => {
  for (const locale of ["ru", "uk"]) {
    const source = text(`final.${locale}.md`);
    for (const target of ["I am early.", "I am free."]) {
      assert.ok(source.includes(`→ **${target}**`) || source.includes(`🎙 **${target}**`), `${locale} must practice intro target ${target}`);
    }
    assert.match(source, /I ___ wrong\. → \*\*am\*\*/u, `${locale} must assess the form in the I am wrong intro target`);
  }
});

test("S04 retrieves free before the independent boundary in a contextual builder", () => {
  const data = read();
  for (const locale of ["ru", "uk"]) {
    const items = data.interactionsByLocale[locale];
    const retrieval = items.findIndex((item) => item.interactionId === idFor("i19"));
    const boundary = items.findIndex((item) => item.interactionId === idFor("i18"));
    assert.ok(retrieval >= 0 && retrieval < boundary, `${locale}:i19 must precede i18`);
    assert.equal(items[retrieval].purpose, "retrieval_practice");
    assert.equal(items[retrieval].family, "phrase_builder");
    assert.equal(items[retrieval].modePayload.targetPhrase, "I am free.");
    assert.match(items[retrieval].modePayload.localizedScene[locale], /пятниц|п'ятниц|п’ятниц|п'ятн/iu);
  }
});

test("S04 bounds not to the scene, repairs I-not feedback, and uses gender-aware free glosses", () => {
  const data = read();
  const expectations = {
    ru: {
      claim: /Not` делает высказывание отрицательным[\s\S]*I am not free` значит, что вы сейчас не можете взять задачу[\s\S]*не всегда означает, что вы заняты/u,
      gloss: "свободен/свободна, не занят/не занята",
      i10: ["прав/права", "не прав/не права", "свободен/свободна"],
      i10Source: "early — рано · right — прав/права · wrong — не прав/не права · free — свободен/свободна",
      feedback: /I not wrong[\s\S]*после I нужна форма am[\s\S]*not не заменяет глагол/iu,
    },
    uk: {
      claim: /Not` робить висловлювання заперечним[\s\S]*I am not free` означає, що ви зараз не можете взяти завдання[\s\S]*не завжди означає, що ви зайняті/u,
      gloss: "вільний/вільна, не зайнятий/не зайнята",
      i10: ["маю рацію", "помиляюся", "вільний/вільна"],
      i10Source: "early — рано · right — маю рацію · wrong — помиляюся · free — вільний/вільна",
      feedback: /I not wrong[\s\S]*після I потрібна форма am[\s\S]*not не замінює дієслово/iu,
    },
  };
  for (const locale of ["ru", "uk"]) {
    const source = text(`final.${locale}.md`);
    assert.match(source, expectations[locale].claim);
    assert.doesNotMatch(source, /not.{0,30}противополож|not.{0,30}протилеж/iu);
    assert.ok(source.includes(expectations[locale].i10Source), `${locale}: i10 Markdown glosses must avoid unpaired forms`);
    assert.ok(source.includes(expectations[locale].gloss), `${locale}: intro3 must use paired gender forms`);
    const i07 = interaction(data, locale, "i07");
    assert.ok(i07.modePayload.wordCard.definitionByLocale[locale].includes(expectations[locale].gloss), `${locale}:i07 definition must use paired forms`);
    const i10 = interaction(data, locale, "i10").modePayload.pairGrid;
    assert.deepEqual(i10.map((pair) => pair.meaningByLocale[locale]), ["рано", ...expectations[locale].i10]);
    const i13r2 = interaction(data, locale, "i13").modePayload.choiceFeedback.find((row) => row.responseId === `${idFor("i13")}:r2`);
    assert.equal(i13r2.correct, false);
    assert.match(i13r2.feedbackByLocale[locale], expectations[locale].feedback);
    assert.doesNotMatch(i13r2.feedbackByLocale[locale], /opposite|противополож|протилеж/u);
  }
});

test("S04 i17 matches gender-inclusive or neutral meanings for all four localized pairs", () => {
  const data = read();
  const expected = {
    ru: ["занят/занята", "один/одна", "устал/устала", "уверен/уверена"],
    uk: ["зайнятий/зайнята", "сам/сама", "втомлений/втомлена", "упевнений/упевнена"],
  };
  for (const locale of ["ru", "uk"]) {
    for (const copy of ["ru", "uk"]) {
      const item = interaction(data, copy, "i17");
      assert.deepEqual(item.modePayload.pairGrid.map((pair) => pair.meaningByLocale[locale]), expected[locale], `${copy}:i17 ${locale} meanings`);
    }
    const source = text(`final.${locale}.md`);
    assert.ok(source.includes(expected[locale].map((meaning, index) => `${["busy", "alone", "tired", "sure"][index]} — ${meaning}`).join(" · ")), `${locale}:i17 Markdown must match all four atomic glosses`);
    assert.doesNotMatch(source, /busy — занят · alone — один · tired — устал · sure — уверен|busy — зайнятий · alone — сам · tired — втомився · sure — упевнений/u);
  }
});
