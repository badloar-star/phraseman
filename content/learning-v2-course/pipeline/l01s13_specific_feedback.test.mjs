import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-13";
const generic = new Set([
  "Верно: этот вариант соответствует смыслу задания.",
  "Правильно: цей варіант відповідає змісту завдання.",
  "Эта плитка не входит в правильную фразу: следуйте форме, заданной в упражнении.",
  "Ця плитка не входить до правильної фрази: дотримуйтеся форми, заданої у вправі."
]);

const expected = {
  "i02:r1": ["young", "young"],
  "i05:r1": ["I am old", "I am old"],
  "i07:r1": ["strong", "strong"],
  "i09:r1": ["tall", "tall"],
  "i10:r1": ["strong", "strong"],
  "i12:tile:d1": ["I am strong", "I am strong"],
  "i13:r1": ["You are tall", "You are tall"],
  "i15:r1": ["brave", "brave"],
  "i17:tile:d1": ["You are brave", "You are brave"]
};

function data() {
  return JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s13/practice.atomic.json"), "utf8"));
}

test("L01/S13 feedback teaches the exact accepted answer and never uses a generic substitute", () => {
  for (const locale of ["ru", "uk"]) {
    const interactions = data().interactionsByLocale[locale];
    const feedback = interactions.flatMap((interaction) => [
      ...(interaction.modePayload?.choiceFeedback ?? []),
      ...(interaction.modePayload?.slotFeedback ?? [])
    ]);
    for (const [suffix, [ruNeedle, ukNeedle]] of Object.entries(expected)) {
      const item = feedback.find((entry) => entry.responseId === `${session}:${suffix}`);
      assert.ok(item, `${locale}:${suffix}: missing feedback`);
      for (const [feedbackLocale, needle] of [["ru", ruNeedle], ["uk", ukNeedle]]) {
        const text = item.feedbackByLocale?.[feedbackLocale] ?? "";
        assert.equal(generic.has(text), false, `${locale}:${suffix}:${feedbackLocale}: generic feedback`);
        assert.match(text, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${locale}:${suffix}:${feedbackLocale}: does not name the answer`);
      }
    }
  }
});
