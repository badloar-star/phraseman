import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { firstMarkdownAtomicLearnerMismatch, parsePractice, projectSpeedMatchColumnsForLocale } from "./build_release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-13";
const locales = ["ru", "uk"];
const sessionDir = path.join(root, "sessions/en/l01/s13");
const source = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const markdown = (locale) => fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");

test("L01/S13 RU and UK source fields match the native learner projection", () => {
  const atomic = source();
  const answers = new Map(atomic.answers.map((answer) => [answer.interactionId, answer]));
  const canonicalIds = atomic.interactionsByLocale.ru.map((item) => item.interactionId);
  for (const locale of locales) {
    const tasks = parsePractice(markdown(locale));
    const interactions = atomic.interactionsByLocale[locale];
    assert.equal(tasks.length, 18, `${locale}: expected 18 parsed practice tasks`);
    assert.deepEqual(interactions.map((item) => item.interactionId), canonicalIds, `${locale}: interaction order drift`);
    assert.equal(interactions.length, tasks.length, `${locale}: parsed/atomic count drift`);
    tasks.forEach((task, index) => {
      const interaction = interactions[index];
      const mismatch = firstMarkdownAtomicLearnerMismatch(task, interaction, locale, answers.get(interaction.interactionId));
      assert.equal(mismatch, null, `${locale}:${interaction.interactionId}: ${mismatch}`);
    });
  }
});

test("L01/S13 has wrong-only, response-specific choice and tile feedback", () => {
  const atomic = source();
  const answers = new Map(atomic.answers.map((answer) => [answer.interactionId, answer]));
  for (const locale of locales) {
    for (const interaction of atomic.interactionsByLocale[locale]) {
      const choiceFeedback = interaction.modePayload?.choiceFeedback ?? [];
      const responses = interaction.responseOptions.map((option) => option.responseId);
      const correctResponseId = answers.get(interaction.interactionId)?.correctResponseId;
      assert.deepEqual(choiceFeedback.map((item) => item.responseId).sort(), responses.filter((id) => id !== correctResponseId).sort(), `${locale}:${interaction.interactionId} must correct each wrong choice exactly once`);
      for (const entry of choiceFeedback) {
        assert.equal(entry.correct, false, `${locale}:${entry.responseId}: feedback entry must be for a wrong choice`);
        assert.ok(entry.feedbackByLocale?.ru?.trim(), `${locale}:${entry.responseId}: missing RU correction`);
        assert.ok(entry.feedbackByLocale?.uk?.trim(), `${locale}:${entry.responseId}: missing UK correction`);
      }
      for (const [index] of (interaction.modePayload?.authoredDistractorTokens ?? []).entries()) {
        const responseId = `${interaction.interactionId}:tile:d${index + 1}`;
        const feedback = (interaction.modePayload?.slotFeedback ?? []).find((item) => item.responseId === responseId);
        assert.ok(feedback && !feedback.correct, `${locale}:${responseId}: missing wrong-tile correction`);
        assert.ok(feedback.feedbackByLocale?.ru?.trim(), `${locale}:${responseId}: missing RU correction`);
        assert.ok(feedback.feedbackByLocale?.uk?.trim(), `${locale}:${responseId}: missing UK correction`);
      }
    }
  }
});

test("L01/S13 learner text uses gender-inclusive self descriptions and direct addressees", () => {
  const atomic = source();
  const required = {
    ru: ["я готов/готова", "ты молодая", "я высокий/высокая", "я сильный/сильная", "ты сильная", "ты смелая", "ты добрая", "смелый/смелая", "добрый/добрая"],
    uk: ["я готовий/готова", "ти молода", "я високий/висока", "я сильний/сильна", "ти сильна", "ти смілива", "ти добра", "сміливий/смілива", "добрий/добра"],
  };
  for (const locale of locales) {
    const text = markdown(locale);
    for (const phrase of required[locale]) assert.ok(text.toLowerCase().includes(phrase), `${locale}: missing inclusive phrase ${phrase}`);
    const learnerText = text.split(locale === "ru" ? "## Для сборщика" : "## Для збирача")[0];
    assert.doesNotMatch(learnerText, locale === "ru" ? /«я готов»(?!\/)|«я высокий»|«я сильный»/u : /«я готовий»(?!\/)|«я високий»|«я сильний»/u);
  }
  for (const locale of locales) {
    const get = (suffix) => atomic.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
    assert.match(get("i10").prompt, /Мира|Міра/u);
    assert.match(get("i10").prompt, /Миру напрямую|Міру прямо/u);
    assert.match(get("i13").prompt, /Скажите ей:|Скажіть їй:/u);
    assert.match(get("i17").prompt, /Мира|Мире|Міра|Мірі/u);
    assert.match(get("i18").prompt, /Лина|Ліна/u);
    assert.match(get("i18").prompt, /ей|їй/u);
  }
});

test("L01/S13 audio-choice corrections avoid unsupported pronunciation claims", () => {
  const atomic = source();
  const ids = ["i02", "i07", "i09", "i15"];
  for (const locale of locales) {
    for (const suffix of ids) {
      const interaction = atomic.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
      const wrong = interaction.modePayload.choiceFeedback.filter((item) => !item.correct);
      assert.equal(wrong.length, 2, `${locale}:${suffix}: expected both wrong options to be explained`);
      for (const entry of wrong) {
        const feedback = entry.feedbackByLocale[locale];
        assert.ok(feedback.trim().length <= 120, `${locale}:${entry.responseId}: keep correction concise`);
        assert.doesNotMatch(feedback, /слыш|звук|слог|гласн|звуч|на слух/u, `${locale}:${entry.responseId}: unsupported sound claim`);
      }
    }
  }
});

test("L01/S13 key scenes identify the intended message and speaker perspective", () => {
  const atomic = source();
  const expected = {
    ru: {
      i12: /Скажите о себе: «я сильный\/сильная»/u,
      i13: /Скажите ей: «ты высокая»/u,
      i17: /Мире .*Похвалите её: «ты смелая»/u,
      i18: /скажите ей: «ты добрая»/u,
    },
    uk: {
      i12: /Скажіть про себе: «я сильний\/сильна»/u,
      i13: /Скажіть їй: «ти висока»/u,
      i17: /Мірі .*Похваліть її: «ти смілива»/u,
      i18: /скажіть їй: «ти добра»/u,
    },
  };
  for (const locale of locales) {
    const final = markdown(locale);
    const tasks = parsePractice(final);
    const i05Title = tasks.find((item) => item.interactionId === `${session}:i05`).title;
    assert.match(i05Title, locale === "ru"
      ? /В анкете о возрасте вы описываете себя как человека старшего возраста/u
      : /В анкеті про вік ви описуєте себе як людину поважного віку/u);
    assert.doesNotMatch(i05Title, /старше коллеги|старші за колег/u);
    for (const suffix of ["i12", "i13", "i17", "i18"]) {
      const title = tasks.find((item) => item.interactionId === `${session}:${suffix}`).title;
      assert.match(title, expected[locale][suffix], `${locale}:${suffix}: title does not cue the intended perspective`);
      const interaction = atomic.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
      assert.equal(interaction.prompt, title, `${locale}:${suffix}: prompt drift`);
    }
    for (const suffix of ["i04", "i05", "i10", "i12", "i13", "i17", "i18"]) {
      const interaction = atomic.interactionsByLocale[locale].find((item) => item.interactionId === `${session}:${suffix}`);
      const title = tasks.find((item) => item.interactionId === `${session}:${suffix}`).title;
      assert.equal(interaction.accessibilityLabel, title, `${locale}:${suffix}: accessibility label drift`);
      if (interaction.modePayload.localizedScene) assert.equal(interaction.modePayload.localizedScene[locale], title, `${locale}:${suffix}: localized scene drift`);
      if (interaction.modePayload.localizedMeaning) assert.equal(interaction.modePayload.localizedMeaning[locale], title, `${locale}:${suffix}: localized meaning drift`);
      if (interaction.modePayload.testedDimension) assert.equal(interaction.modePayload.testedDimension, title, `${locale}:${suffix}: tested dimension drift`);
      for (const entry of interaction.modePayload.choiceFeedback ?? []) assert.equal(entry.testedDimension, title, `${locale}:${suffix}:${entry.responseId}: choice tested dimension drift`);
      for (const entry of interaction.modePayload.slotFeedback ?? []) assert.equal(entry.testedDimension, title, `${locale}:${suffix}:${entry.responseId}: tile tested dimension drift`);
    }
    for (const suffix of ["i12", "i17"]) {
      const task = final.match(new RegExp(`interaction_id: ${session}:${suffix};[\\s\\S]*?(?=\\r?\\n\\r?\\n\\*\\*\\d+|\\r?\\n---)`))?.[0] ?? "";
      assert.doesNotMatch(task, /плитка .* лишн|плитка .* зайв/u, `${locale}:${suffix}: correct-answer view must not explain extra tile`);
    }
  }
});

test("L01/S13 speed-match columns project the active locale", () => {
  const atomic = source();
  for (const locale of locales) {
    const projected = projectSpeedMatchColumnsForLocale(structuredClone(atomic.interactionsByLocale[locale]), locale);
    const match = projected.find((item) => item.interactionId === `${session}:i11`);
    assert.deepEqual(match.modePayload.leftColumn, ["young", "old", "strong", "tall"]);
    assert.deepEqual(match.modePayload.rightColumn, locale === "ru"
      ? ["молодой/молодая", "старый/старая", "сильный/сильная", "высокий/высокая"]
      : ["молодий/молода", "старий/стара", "сильний/сильна", "високий/висока"]);
  }
});

test("L01/S13 UK learner-facing metadata has no Russian prompt leakage", () => {
  const atomic = source();
  const forbidden = /Послушайте|Вставьте|Соберите|Карточка слова|Соедините пары|Скажите вслух|Похвалите её|Плитки:/u;
  const check = (value, label) => {
    if (typeof value === "string") assert.doesNotMatch(value, forbidden, label);
  };
  for (const interaction of atomic.interactionsByLocale.uk) {
    const payload = interaction.modePayload ?? {};
    check(interaction.prompt, `${interaction.interactionId}:prompt`);
    check(interaction.accessibilityLabel, `${interaction.interactionId}:accessibilityLabel`);
    check(payload.localizedScene?.uk, `${interaction.interactionId}:localizedScene`);
    check(payload.localizedMeaning?.uk, `${interaction.interactionId}:localizedMeaning`);
    check(payload.testedDimension, `${interaction.interactionId}:testedDimension`);
    for (const item of payload.localizedMeaningChoices ?? []) check(item.meaningByLocale?.uk, `${interaction.interactionId}:meaning choice`);
    for (const item of payload.pairGrid ?? []) check(item.meaningByLocale?.uk, `${interaction.interactionId}:pair meaning`);
    for (const item of payload.choiceFeedback ?? []) check(item.testedDimension, `${interaction.interactionId}:choice testedDimension`);
    for (const item of payload.slotFeedback ?? []) {
      check(item.testedDimension, `${interaction.interactionId}:tile testedDimension`);
      check(item.feedbackByLocale?.uk, `${interaction.interactionId}:tile feedback`);
    }
  }
});

test("L01/S13 UK locale batch is byte-for-byte synchronized", () => {
  assert.equal(markdown("uk").length > 0, true);
  assert.equal(fs.readFileSync(path.join(sessionDir, "locales_batch.md"), "utf8"), `===LOCALE: uk===\n${markdown("uk").trim()}\n`);
});
