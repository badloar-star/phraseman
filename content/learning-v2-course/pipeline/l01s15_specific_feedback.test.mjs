import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-15";
const expected = {
  "i02:r1": "polite",
  "i04:r1": "serious",
  "i05:r1": "You are polite",
  "i08:r1": "lucky",
  "i10:r1": "sad",
  "i12:r1": "You are lucky",
  "i13:tile:d1": "You are not sad",
  "i15:r1": "calm",
  "i17:s01:tile:d1": "You are honest",
  "i17:s02:tile:d1": "I am not sad",
  "i19:s02:tile:d1": "I am tired"
};

function source() {
  return JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s15/practice.atomic.json"), "utf8"));
}

test("L01/S15 feedback teaches every accepted answer and every unused tile", () => {
  for (const locale of ["ru", "uk"]) {
    const feedback = source().interactionsByLocale[locale].flatMap((interaction) => [
      ...(interaction.modePayload?.choiceFeedback ?? []),
      ...(interaction.modePayload?.slotFeedback ?? [])
    ]);
    for (const [suffix, answer] of Object.entries(expected)) {
      const entry = feedback.find((item) => item.responseId === `${session}:${suffix}`);
      assert.ok(entry, `${locale}:${suffix}: missing feedback`);
      assert.equal(Boolean(entry.correct), suffix.includes(":r1"), `${locale}:${suffix}: wrong correctness flag`);
      for (const feedbackLocale of ["ru", "uk"]) {
        const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
        assert.match(text, new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${locale}:${suffix}:${feedbackLocale}: must name the exact answer`);
        assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
      }
    }
  }
});
