import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-15";
const expected = {
  "i13:tile:d1": "You are not sad",
  "i17:s01:tile:d1": "You are honest",
  "i17:s02:tile:d1": "I am not sad",
  "i19:s02:tile:d1": "I am tired"
};

function source() {
  return JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s15/practice.atomic.json"), "utf8"));
}

test("L01/S15 feedback covers authored errors only and every unused tile", () => {
  for (const locale of ["ru", "uk"]) {
    const feedback = source().interactionsByLocale[locale].flatMap((interaction) => [
      ...(interaction.modePayload?.choiceFeedback ?? []),
      ...(interaction.modePayload?.slotFeedback ?? [])
    ]);
    for (const [suffix, answer] of Object.entries(expected)) {
      const entry = feedback.find((item) => item.responseId === `${session}:${suffix}`);
      assert.ok(entry, `${locale}:${suffix}: missing feedback`);
      assert.equal(entry.correct, false, `${locale}:${suffix}: correct-answer feedback is runtime-owned`);
      for (const feedbackLocale of ["ru", "uk"]) {
        const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
        assert.ok(text.trim(), `${locale}:${suffix}:${feedbackLocale}: missing localized error explanation`);
        assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
      }
    }
  }
});
