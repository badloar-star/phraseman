import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../sessions/en/l01/s06");
const data = () => JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));
const choices = ["i02", "i04", "i08", "i09", "i11"];
const tiles = { i05: ["is"], i07: ["is", "not"], i12: ["is", "are", "not"], i13: ["home"], i16: ["is", "not"], i17: ["is", "are", "not"] };

test("L01/S06 supplies feedback for every selectable correct answer", () => {
  const snapshot = data();
  for (const locale of ["ru", "uk"]) for (const suffix of choices) {
    const id = `en:lesson-01:session-06:${suffix}`;
    const interaction = snapshot.interactionsByLocale[locale].find((entry) => entry.interactionId === id);
    const answer = snapshot.answers.find((entry) => entry.interactionId === id);
    const feedback = interaction?.modePayload?.choiceFeedback?.find((entry) => entry.responseId === answer?.correctResponseId);
    assert.equal(feedback?.correct, true, `${locale}:${suffix}`);
    assert.ok(feedback?.feedbackByLocale?.ru && feedback?.feedbackByLocale?.uk, `${locale}:${suffix}:copy`);
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
