import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-14";
const expected = {
  "i02:r1": "safe",
  "i04:r1": "warm",
  "i05:tile:d1": "You are safe",
  "i06:r1": "You are lost",
  "i08:r1": "dry",
  "i10:r1": "dry",
  "i11:r1": "You are safe",
  "i12:tile:d1": "You are warm",
  "i13:tile:d1": "You are ready",
  "i15:r1": "cold",
  "i16:tile:d1": "You are scared",
  "i17:tile:d1": "You are cold"
};

function source() {
  return JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s14/practice.atomic.json"), "utf8"));
}

test("L01/S14 feedback teaches each accepted answer and why each unused tile cannot fit", () => {
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
        assert.match(text, new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${locale}:${suffix}:${feedbackLocale}: must name the concrete answer`);
        assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
      }
    }
  }
});
