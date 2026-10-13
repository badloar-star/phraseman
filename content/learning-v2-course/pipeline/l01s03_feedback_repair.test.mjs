import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseIntro } from "./build_release.mjs";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s03");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const choiceIds = ["i02", "i04", "i05", "i09", "i12", "i14", "i17:s02"];
const tileIds = ["i10", "i11", "i13", "i15:s02", "i17:s04"];
const introCorrectFeedback = {
  ru: [
    "Верно: `I am not tired` прямо отвечает начальнику «я не устал»: `not` стоит сразу после `am` и отрицает `tired`.",
    "Верно: `I am not cold` — «я не замёрз»: `not` после `am` отрицает `cold`, поэтому вы снимаете их беспокойство.",
    "Верно: `I am not sure` — «я не уверен»: `not` после `am` показывает, что вы не знаете точного времени встречи.",
  ],
  uk: [
    "Правильно: `I am not tired` прямо відповідає начальнику «я не втомився»: `not` стоїть одразу після `am` і заперечує `tired`.",
    "Правильно: `I am not cold` — «я не змерз»: `not` після `am` заперечує `cold`, тому ви заспокоюєте тих, хто хвилювався.",
    "Правильно: `I am not sure` — «я не впевнений»: `not` після `am` показує, що ви не знаєте точного часу зустрічі.",
  ],
};

test("L01/S03 gives each intro correct r1 prompt-specific localized feedback", () => {
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    const pages = parseIntro(markdown);
    assert.equal(pages.length, 3, `${locale}: expected three intro pages`);
    pages.forEach((page, index) => {
      assert.equal(page.options[0]?.correct, true, `${locale}:intro${index + 1}: r1 remains correct`);
      assert.equal(
        page.options[0]?.feedback,
        introCorrectFeedback[locale][index],
        `${locale}:intro${index + 1}: correct r1 needs its authored explanation`,
      );
    });
    assert.equal(new Set(introCorrectFeedback[locale]).size, 3, `${locale}: feedback is not mass-templated`);
  }
});

test("L01/S03 explains every learner-selectable answer", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of choiceIds) {
    const id = `en:lesson-01:session-03:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = data.answers.find((entry) => entry.interactionId === id);
    const row = interaction?.modePayload?.choiceFeedback?.find((item) => item.responseId === answer?.correctResponseId);
    assert.equal(row?.correct, true, `${locale}:${suffix} needs correct-choice feedback`);
    assert.ok(row?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian feedback`);
    assert.ok(row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian feedback`);
  }
});

test("L01/S03 explains every authored extra tile including Ukrainian not", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) for (const suffix of tileIds) {
    const id = `en:lesson-01:session-03:${suffix}`;
    const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const row = interaction?.modePayload?.slotFeedback?.[0];
    assert.equal(row?.responseId, `${id}:tile:d1`, `${locale}:${suffix} needs its physical tile feedback`);
    assert.equal(row?.correct, false, `${locale}:${suffix} tile must be wrong`);
    assert.ok(row?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian tile feedback`);
    assert.ok(row?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian tile feedback`);
  }
  const ukI13 = data.interactionsByLocale.uk.find((entry) => entry.interactionId.endsWith(":i13"));
  assert.deepEqual(ukI13?.modePayload?.authoredDistractorTokens, ["not"]);
});

test("L01/S03 i03 names Mira explicitly in both source locales and atomic projections", () => {
  const expected = {
    ru: "«холодно, замёрз». Мира включила кондиционер слишком сильно.",
    uk: "«холодно, змерз». Міра ввімкнула кондиціонер надто сильно.",
  };
  for (const locale of ["ru", "uk"]) {
    const markdown = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    assert.match(markdown, new RegExp(expected[locale].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.doesNotMatch(markdown, /(?:кто-то|кем-то|хтось)/iu, `${locale}: source must not use an unspecified actor`);
  }

  const data = atomic();
  for (const projectionLocale of ["ru", "uk"]) {
    const interaction = data.interactionsByLocale[projectionLocale]
      .find((entry) => entry.interactionId === "en:lesson-01:session-03:i03");
    assert.deepEqual(interaction?.modePayload?.localizedMeaningChoices?.[0]?.meaningByLocale, expected);
    assert.deepEqual(interaction?.modePayload?.wordCard?.definitionByLocale, expected);
  }
});
