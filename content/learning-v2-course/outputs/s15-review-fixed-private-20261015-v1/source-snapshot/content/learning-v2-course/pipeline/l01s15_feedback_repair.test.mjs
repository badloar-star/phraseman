import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "sessions/en/l01/s15");
const data = JSON.parse(fs.readFileSync(path.join(dir, "practice.atomic.json"), "utf8"));

test("L01/S15 feedback is wrong-only, response-specific, and avoids unsupported sound claims", () => {
  const answers = new Map(data.answers.map((answer) => [answer.interactionId, answer.correctResponseId]));
  const unsupportedSound = /(?:ударен\w*|наголос\w*|слог\w*|склад\w*|звуч\w*|слыш\w*|чути\w*|голосн\w*|гласн\w*|звук\w*|sound|stress|syllable|pronounc\w*)/iu;

  for (const locale of ["ru", "uk"]) {
    for (const item of data.interactionsByLocale[locale]) {
      const correctId = answers.get(item.interactionId);
      const options = item.responseOptions ?? [];
      if (options.length) {
        const wrongIds = options.map((option) => option.responseId).filter((id) => id !== correctId).toSorted();
        const entries = item.modePayload?.choiceFeedback ?? [];
        assert.deepEqual(entries.map((entry) => entry.responseId).toSorted(), wrongIds, `${locale}:${item.interactionId}: only wrong options get authored feedback`);
        for (const entry of entries) assert.equal(entry.correct, false, `${locale}:${entry.responseId}: correct-choice feedback is runtime-owned`);
      }

      const tiles = item.modePayload?.authoredDistractorTokens ?? [];
      const tileFeedback = item.modePayload?.slotFeedback ?? [];
      assert.equal(tileFeedback.length, tiles.length, `${locale}:${item.interactionId}: each extra tile needs one correction`);
      for (const entry of [...(item.modePayload?.choiceFeedback ?? []), ...tileFeedback]) {
        for (const feedbackLocale of ["ru", "uk"]) {
          const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
          assert.ok(text.trim(), `${locale}:${entry.responseId}:${feedbackLocale}: missing feedback`);
          assert.doesNotMatch(text, unsupportedSound, `${locale}:${entry.responseId}:${feedbackLocale}: unsupported sound claim`);
        }
      }
    }
  }
});
