import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sessionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s01");
const atomic = () => JSON.parse(fs.readFileSync(path.join(sessionDir, "practice.atomic.json"), "utf8"));
const missingCorrectFeedback = ["i02", "i04", "i06", "i07:a01", "i10", "i13", "i17:s02"];

test("L01/S01 explains every correct response that a learner can select", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    for (const suffix of missingCorrectFeedback) {
      const interactionId = `en:lesson-01:session-01:${suffix}`;
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
      const answer = data.answers.find((entry) => entry.interactionId === interactionId);
      const feedback = interaction?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === answer?.correctResponseId);
      assert.equal(feedback?.correct, true, `${locale}:${suffix} needs feedback for the correct choice`);
      assert.ok(feedback?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian correct-choice feedback`);
      assert.ok(feedback?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian correct-choice feedback`);
    }
  }
});

test("L01/S01 explains every authored extra tile", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    for (const suffix of ["i09", "i11", "i12", "i15", "i16"]) {
      const interactionId = `en:lesson-01:session-01:${suffix}`;
      const interaction = data.interactionsByLocale[locale].find((entry) => entry.interactionId === interactionId);
      const feedback = interaction?.modePayload?.slotFeedback;
      assert.equal(feedback?.length, 1, `${locale}:${suffix} needs one extra-tile explanation`);
      assert.equal(feedback?.[0]?.correct, false, `${locale}:${suffix} extra tile must be marked wrong`);
      assert.equal(feedback?.[0]?.responseId, `${interactionId}:tile:d1`, `${locale}:${suffix} feedback must identify the physical extra tile`);
      assert.ok(feedback?.[0]?.feedbackByLocale?.ru?.trim(), `${locale}:${suffix} needs Russian tile feedback`);
      assert.ok(feedback?.[0]?.feedbackByLocale?.uk?.trim(), `${locale}:${suffix} needs Ukrainian tile feedback`);
    }
  }
});

test("L01/S01 avoids false universal claims and unsupported sound descriptions", () => {
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(sessionDir, `final.${locale}.md`), "utf8");
    for (const forbidden of [
      "Дальше подставляйте что хотите",
      "Далі підставляйте що завгодно",
      "оно всегда в конце такой фразы",
      "воно завжди в кінці такої фрази",
      "на слог длиннее",
      "на склад довше",
      "мягкое «н»",
      "м'яке «н»",
      "два звука /p/",
    ]) assert.equal(source.includes(forbidden), false, `${locale} retains unsupported claim: ${forbidden}`);
    assert.match(source, locale === "ru"
      ? /в этой фразе `here` стоит после `am`/u
      : /у цій фразі `here` стоїть після `am`/u);
  }
});

test("L01/S01 atomic feedback does not preserve the replaced sound claims", () => {
  const data = atomic();
  const serialized = JSON.stringify(data.interactionsByLocale);
  for (const obsolete of ["here тянется", "на слог длиннее", "мягкое «н»", "два звука /p/"]) {
    assert.equal(serialized.includes(obsolete), false, `atomic learner data preserves obsolete claim: ${obsolete}`);
  }
});

test("L01/S01 introduces happy on a card before a separate visible listening check", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.equal(interactions.length, 20, `${locale} must retain all twenty learning actions`);
    const card = interactions.find((entry) => entry.interactionId.endsWith(":i07"));
    const listening = interactions.find((entry) => entry.interactionId.endsWith(":i07:a01"));
    assert.equal(card?.modePayload?.isWordCard, true, `${locale}: happy must first appear as a word card`);
    assert.deepEqual(card?.responseOptions, [], `${locale}: a word card cannot hide selectable answers`);
    assert.equal(listening?.modePayload?.isWordCard, false, `${locale}: happy listening must be a separate interaction`);
    assert.deepEqual(listening?.responseOptions?.map((option) => option.text), ["happy", "hobby", "heavy"]);
    assert.equal(listening?.modePayload?.referenceAudio?.transcript, "happy");
  }
});

test("L01/S01 preserves historical IDs when adding the happy listening check", () => {
  const data = atomic();
  for (const locale of ["ru", "uk"]) {
    const interactions = data.interactionsByLocale[locale];
    assert.deepEqual(interactions.slice(6, 10).map((entry) => entry.interactionId), [
      "en:lesson-01:session-01:i07",
      "en:lesson-01:session-01:i07:a01",
      "en:lesson-01:session-01:i08",
      "en:lesson-01:session-01:i09",
    ]);
  }
});
