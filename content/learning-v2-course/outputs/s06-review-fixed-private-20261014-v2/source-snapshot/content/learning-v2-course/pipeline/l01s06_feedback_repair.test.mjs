import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s06");
const data = () => JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
const choices = ["i02", "i04", "i08", "i09", "i11"];
const tiles = { i05: ["is"], i07: ["is", "not"], i12: ["is", "are", "not"], i13: ["home"], i16: ["is", "not"], i17: ["is", "are", "not"] };

test("L01/S06 authors feedback only for wrong selectable answers", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) for (const suffix of choices) {
    const id = `en:lesson-01:session-06:${suffix}`;
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = snapshot.answers.find((entry) => entry.interactionId === id);
    const feedback = interaction?.modePayload?.choiceFeedback ?? [];
    assert.equal(feedback.some((entry) => entry.responseId === answer?.correctResponseId || entry.correct), false, `${locale}:${suffix}: no authored correct-answer explanation`);
    assert.ok(feedback.every((entry) => entry.correct === false && entry.feedbackByLocale?.ru && entry.feedbackByLocale?.uk), `${locale}:${suffix}: wrong answers only`);
  }
});

test("L01/S06 uses safe, response-specific choice feedback without audio claims", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) for (const suffix of ["i02", "i04", "i08"]) {
    const id = `en:lesson-01:session-06:${suffix}`;
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const wrong = interaction?.modePayload?.choiceFeedback ?? [];
    assert.equal(wrong.length, 2, `${locale}:${suffix}: both wrong choices have feedback`);
    for (const row of wrong) {
      const copy = row.feedbackByLocale?.[locale] ?? "";
      assert.ok(copy.trim(), `${locale}:${suffix}: feedback is localized`);
      assert.doesNotMatch(copy, /запис[іи].*звуч|на кінц|на конце|голосн|гласн|тягн|длинн|коротк|м['’]?я|дзвінк|мягк/u, `${locale}:${suffix}: no unverified sound claim`);
    }
  }
});

test("L01/S06 neutralizes gendered learner-facing wording and ties not feedback to its exact target", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8");
    assert.doesNotMatch(source, /«я не голоден|«я не голодна|«я не втомився|«я не втомилася|«я не устал|«я не устала/u, `${locale}: neutral learner-facing text`);
    for (const suffix of ["i15", "i17"]) {
      const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
      assert.doesNotMatch(interaction.prompt, /«я не голоден|«я не голодна|«я не втомився|«я не втомилася|«я не устал|«я не устала/u, `${locale}:${suffix}: prompt is gender neutral`);
    }
    const matching = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i18"));
    const glosses = matching.modePayload.pairGrid.map((pair) => pair.meaningByLocale[locale]);
    assert.deepEqual(glosses, locale === "ru"
      ? ["чувствовать усталость", "иметь свободное время", "здесь", "хотеть есть"]
      : ["відчувати втому", "мати вільний час", "тут", "хотіти їсти"], `${locale}: i18 glosses avoid single-gender forms`);
    const i16 = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i16"));
    const notFeedback = i16.modePayload.slotFeedback.find((entry) => entry.responseId.endsWith(":d2")).feedbackByLocale[locale];
    assert.match(notFeedback, /I am free/u, `${locale}: i16 correction names the exact target`);
    assert.doesNotMatch(notFeedback, /нет времени|немає часу/u, `${locale}: i16 avoids equating free/not with having no time`);
  }
});

test("L01/S06 intro distractors and feedback preserve the grammatical/contextual distinction", async () => {
  const { parseIntro } = await import("./build_release.mjs");
  const sources = Object.fromEntries(["ru", "uk"].map((locale) => [locale, fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8")]));
  const choicesByLocale = Object.fromEntries(Object.entries(sources).map(([locale, source]) => [locale, parseIntro(source)[1].options.map((option) => option.text)]));
  assert.deepEqual(choicesByLocale.ru, choicesByLocale.uk, "intro 2 choices are identical across locales");
  assert.ok(choicesByLocale.ru.includes("I am back to home."), "the shared distractor is genuinely incorrect");
  for (const locale of ["ru", "uk"]) {
    const source = sources[locale];
    assert.doesNotMatch(source, /❌\s*I am back home\./u, `${locale}: grammatical back home is not marked incorrect`);
    const intro3 = parseIntro(source)[2].options.find((option) => option.text === "I am here.");
    assert.match(intro3.feedback, /grammatical|грамматич|граматич/u, `${locale}: intro 3 names grammaticality`);
    assert.match(intro3.feedback, /context|контекст|не відповіда|не ответ/u, `${locale}: intro 3 names the contextual mismatch`);
  }
});

test("L01/S06 i17 prompt and i18 matching meanings project the Markdown source exactly", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8");
    const heading = source.split(/\r?\n/u).find((line) => line.startsWith("**17 · "));
    const sourcePrompt = heading.replace(/^\*\*17 · /u, "").replace(/\*\*$/u, "");
    const i17 = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i17"));
    assert.equal(i17.prompt, sourcePrompt, `${locale}: i17 prompt mirrors the authored heading`);
    assert.ok(i17.modePayload.slotFeedback.every((entry) => entry.testedDimension === sourcePrompt),
      `${locale}: i17 feedback context mirrors the localized heading`);

    const sourceGlossLine = source.split(/\r?\n/u).find((line) => line.startsWith("tired — "));
    const sourceGlosses = Object.fromEntries(sourceGlossLine.split(" · ").map((entry) => entry.split(" — ")));
    const i18 = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i18"));
    const expectedPairPrompt = locale === "ru"
      ? "Соедините английские слова с их значениями"
      : "З'єднайте англійські слова з їхніми значеннями";
    const i18Heading = source.split(/\r?\n/u).find((line) => line.startsWith("**18 · "));
    const sourcePairPrompt = i18Heading.replace(/^\*\*18 · /u, "").replace(/\*\*$/u, "");
    assert.equal(sourcePairPrompt, expectedPairPrompt, `${locale}: i18 prompt is direct and specific`);
    assert.equal(i18.prompt, expectedPairPrompt, `${locale}: atomic i18 prompt mirrors the source`);
    assert.deepEqual(i18.modePayload.pairGrid.map((pair) => [pair.target, pair.meaningByLocale[locale]]),
      Object.entries(sourceGlosses), `${locale}: i18 atomic meanings mirror the authored row`);
  }
});

test("L01/S06 avoids unsupported pronunciation spellings and claims", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8");
    assert.doesNotMatch(source, /Буква «о» тут только для красоты|Буква «о» тут лише для вигляду/u, `${locale}: no unsupported letter claim`);
    assert.doesNotMatch(source, /«(?:хоум|бэк|бек|дан|доне)»/u, `${locale}: no exact-looking transliteration`);
  }
});

test("L01/S06 i11 gap punctuation is consistently attached to the period", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8");
    assert.ok(source.split(/\r?\n/u).some((line) => line.startsWith("I am ___. →")), `${locale}: source i11 gap punctuation`);
    const i11 = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(":i11"));
    assert.equal(i11.modePayload.gappedTargetPhrase, "I am ___.", `${locale}: atomic i11 gap punctuation`);
  }
});

test("L01/S06 i02, i04, and i08 atomic feedback mirrors the source correction text", async () => {
  const { parsePractice, firstMarkdownAtomicLearnerMismatch } = await import("./build_release.mjs");
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8");
    const tasks = parsePractice(source);
    for (const suffix of ["i02", "i04", "i08"]) {
      const index = Number(suffix.slice(1)) - 1;
      const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId.endsWith(`:${suffix}`));
      const answer = snapshot.answers.find((entry) => entry.interactionId === interaction.interactionId);
      assert.equal(firstMarkdownAtomicLearnerMismatch(tasks[index], interaction, locale, answer), null,
        `${locale}:${suffix}: exact source feedback parity`);
    }
  }
});

test("L01/S06 learner-visible Markdown and atomic fields stay in parity", async () => {
  const { parsePractice, firstMarkdownAtomicLearnerMismatch } = await import("./build_release.mjs");
  const snapshot = data();
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(dir, `final.${locale}.md`), "utf8");
    const tasks = parsePractice(source);
    assert.equal(tasks.length, snapshot.interactionsByLocale[locale].length, `${locale}: interaction count`);
    for (const [index, task] of tasks.entries()) {
      const interaction = snapshot.interactionsByLocale[locale][index];
      const answer = snapshot.answers.find((entry) => entry.interactionId === interaction.interactionId);
      assert.equal(firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answer), null,
        `${locale}:${interaction.interactionId}: learner parity`);
    }
  }
});

test("L01/S06 supplies feedback for every physical extra tile", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) for (const [suffix, expectedTokens] of Object.entries(tiles)) {
    const id = `en:lesson-01:session-06:${suffix}`;
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const feedback = interaction?.modePayload?.slotFeedback ?? [];
    assert.deepEqual(interaction?.modePayload?.authoredDistractorTokens, expectedTokens, `${locale}:${suffix}:tokens`);
    assert.equal(feedback.length, expectedTokens.length, `${locale}:${suffix}`);
    feedback.forEach((entry, index) => {
      assert.equal(entry.responseId, `${id}:tile:d${index + 1}`);
      assert.equal(entry.correct, false, `${locale}:${suffix}:d${index + 1}:correctness`);
      assert.ok(entry.feedbackByLocale?.ru && entry.feedbackByLocale?.uk, `${locale}:${suffix}:d${index + 1}:copy`);
    });
  }
});
