import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { atomicMarkdownParityIssues, parseIntro, parsePractice } from "./build_release.mjs";

const sessionDir = process.env.LEARNING_V2_FROZEN_SESSION_DIR
  ? path.resolve(process.env.LEARNING_V2_FROZEN_SESSION_DIR)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s02");
const read = (name) => fs.readFileSync(path.join(sessionDir, name), "utf8");
const loadAtomic = () => JSON.parse(read("practice.atomic.json"));

test("L01/S02 authored choice feedback corrects wrong responses only", () => {
  const data = loadAtomic();

  for (const locale of ["ru", "uk"]) {
    for (const interaction of data.interactionsByLocale[locale]) {
      const payload = interaction.modePayload ?? {};
      const choiceFeedback = payload.choiceFeedback ?? [];
      assert.ok(choiceFeedback.every((entry) => entry.correct === false),
        `${locale}:${interaction.interactionId} must not author correct-answer feedback`);

      const answer = data.answers.find((entry) => entry.interactionId === interaction.interactionId);
      const selectableIds = (interaction.responseOptions ?? []).map(({ responseId }) => responseId);
      if (answer?.correctResponseId && selectableIds.length > 1) {
        const wrongIds = selectableIds.filter((responseId) => responseId !== answer.correctResponseId).sort();
        assert.equal(choiceFeedback.some(({ responseId }) => responseId === answer.correctResponseId), false,
          `${locale}:${interaction.interactionId} must not give feedback for the correct choice`);
        assert.deepEqual(choiceFeedback.map(({ responseId }) => responseId).sort(), wrongIds,
          `${locale}:${interaction.interactionId} needs exactly one correction for each wrong choice`);
        assert.ok(choiceFeedback.every(({ feedbackByLocale }) =>
          typeof feedbackByLocale?.[locale] === "string" && feedbackByLocale[locale].trim().length > 0),
        `${locale}:${interaction.interactionId} needs localized wrong-choice corrections`);
      }

      const distractors = payload.authoredDistractorTokens ?? [];
      const tileFeedback = payload.slotFeedback ?? [];
      assert.ok(tileFeedback.every((entry) => entry.correct === false),
        `${locale}:${interaction.interactionId} must not author correct-tile feedback`);
      assert.ok(tileFeedback.length <= distractors.length,
        `${locale}:${interaction.interactionId} may correct only authored distractors`);
      assert.deepEqual(tileFeedback.map(({ responseId }) => responseId).sort(),
        distractors.map((_, index) => `${interaction.interactionId}:tile:d${index + 1}`).sort(),
        `${locale}:${interaction.interactionId} needs one concise correction per extra tile`);
      assert.ok(tileFeedback.every(({ feedbackByLocale }) =>
        typeof feedbackByLocale?.[locale] === "string" && feedbackByLocale[locale].trim().length > 0),
      `${locale}:${interaction.interactionId} needs localized extra-tile corrections`);
      assert.equal(Object.hasOwn(payload, "completionFeedbackByLocale"), false,
        `${locale}:${interaction.interactionId} leaves completion feedback to the runtime`);
    }
  }
});

test("L01/S02 correct intro answers have no authored feedback", () => {
  for (const locale of ["ru", "uk"]) {
    const pages = parseIntro(read(`final.${locale}.md`));
    assert.equal(pages.length, 3, `${locale} has the three authored intro pages`);
    for (const [index, page] of pages.entries()) {
      assert.equal(page.options.filter(({ correct }) => correct).length, 1,
        `${locale}: intro ${index + 1} has one correct option`);
      assert.ok(page.options.filter(({ correct }) => correct).every(({ feedback }) => !feedback),
        `${locale}: intro ${index + 1} keeps correct-answer feedback runtime-owned`);
    }
  }
});

test("L01/S02 RU and UK practice remain aligned with the atomic learner projection", () => {
  const data = loadAtomic();
  const tasksByLocale = Object.fromEntries(["ru", "uk"].map((locale) =>
    [locale, parsePractice(read(`final.${locale}.md`))]));

  assert.deepEqual(atomicMarkdownParityIssues({
    sessionIdentity: "en/l01/s02",
    sessionId: data.courseSessionId,
    atomicSource: data,
    tasksByLocale,
  }), [], "the canonical builder projection matches each locale's source");
  assert.equal(tasksByLocale.ru.length, tasksByLocale.uk.length, "RU and UK have matching practice counts");

  const batch = read("locales_batch.md");
  assert.equal(batch, `===LOCALE: uk===\n${read("final.uk.md")}`,
    "the locale batch is the exact UK source projection");
});

test("L01/S02 keeps the cancellation context consistent and the final match probe distinct", () => {
  const data = loadAtomic();

  for (const locale of ["ru", "uk"]) {
    const interactions = new Map(data.interactionsByLocale[locale]
      .map((interaction) => [interaction.interactionId, interaction]));
    const i04 = interactions.get("en:lesson-01:session-02:i04");
    const i10 = interactions.get("en:lesson-01:session-02:i10");
    const i14 = interactions.get("en:lesson-01:session-02:i14");
    const i16 = interactions.get("en:lesson-01:session-02:i16");

    assert.ok(i04 && i10 && i14 && i16, `${locale}: reviewed interactions exist`);
    assert.doesNotMatch(i14.prompt, /завтра/u, `${locale}: prompt does not invent a move to tomorrow`);
    assert.match(i14.modePayload.localizedScene[locale], /отмен|скас/u,
      `${locale}: scene states the same cancellation as the prompt`);

    const pairs = (interaction) => interaction.modePayload.pairGrid
      .map(({ target, meaningByLocale }) => [target, meaningByLocale[locale]]);
    assert.notDeepEqual(pairs(i16), pairs(i04), `${locale}: independent probe is not a copy of i04`);
    assert.notDeepEqual(pairs(i16), pairs(i10), `${locale}: independent probe is not a copy of i10`);
    assert.match(i16.prompt, /соедин|з’єдн/iu, `${locale}: prompt gives the learner a direct action`);
  }
});
