import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-16";
const expected = {
  "i01:r1": "kind", "i02:r1": "You are kind", "i03:r1": "honest",
  "i04:tile:d1": "You are honest", "i05:r1": "You are calm",
  "i08:r1": "You are not wrong", "i09:tile:d1": "You are not wrong",
  "i10:r1": "brave", "i11:r1": "sad", "i12:tile:d1": "You are brave",
  "i13:tile:d1": "You are lucky", "i14:r1": "tired", "i16:tile:d1": "You are not sad"
};

const source = () => JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s16/practice.atomic.json"), "utf8"));

test("L01/S16 feedback explains each exact answer and unused tile", () => {
  for (const locale of ["ru", "uk"]) {
    const feedback = source().interactionsByLocale[locale].flatMap((interaction) => [
      ...(interaction.modePayload?.choiceFeedback ?? []), ...(interaction.modePayload?.slotFeedback ?? [])
    ]);
    for (const [suffix, answer] of Object.entries(expected)) {
      const entry = feedback.find((item) => item.responseId === `${session}:${suffix}`);
      assert.ok(entry, `${locale}:${suffix}: missing feedback`);
      assert.equal(Boolean(entry.correct), suffix.includes(":r1"), `${locale}:${suffix}: incorrect correctness`);
      for (const feedbackLocale of ["ru", "uk"]) {
        const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
        assert.match(text, new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${locale}:${suffix}:${feedbackLocale}: must name exact answer`);
        assert.doesNotMatch(text, /соответствует смыслу задания|відповідає змісту завдання|следуйте форме|дотримуйтеся форми/iu, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
      }
    }
  }
});
