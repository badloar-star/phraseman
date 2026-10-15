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
  "i02:r2": ["young", "young"],
  "i02:r3": ["young", "young"],
  "i05:r2": ["am", "am"],
  "i05:r3": ["I am", "I am"],
  "i07:r2": ["strong", "strong"],
  "i07:r3": ["strong", "strong"],
  "i09:r2": ["tall", "tall"],
  "i09:r3": ["tall", "tall"],
  "i10:r2": ["Миру", "Міру"],
  "i10:r3": ["Мира", "Міра"],
  "i12:tile:d1": ["I am", "I am"],
  "i13:r2": ["you are", "you are"],
  "i13:r3": ["you are", "you are"],
  "i15:r2": ["brave", "brave"],
  "i15:r3": ["brave", "brave"],
  "i17:tile:d1": ["You", "You"]
};

function data() {
  return JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s13/practice.atomic.json"), "utf8"));
}

test("L01/S13 gives concise, specific feedback only for incorrect choices and tiles", () => {
  const source = data();
  const correctIds = new Set(source.answers.map((answer) => answer.correctResponseId).filter(Boolean));
  for (const locale of ["ru", "uk"]) {
    const interactions = source.interactionsByLocale[locale];
    const feedback = [];
    for (const interaction of interactions) {
      const choices = interaction.modePayload?.choiceFeedback ?? [];
      const slots = interaction.modePayload?.slotFeedback ?? [];
      const wrongOptions = interaction.responseOptions
        .filter((option) => !correctIds.has(option.responseId))
        .map((option) => option.responseId);
      assert.deepEqual(choices.map((entry) => entry.responseId).sort(), wrongOptions.sort(), `${locale}:${interaction.interactionId}: feedback must cover every wrong choice and no correct choice`);
      assert.equal(choices.some((entry) => correctIds.has(entry.responseId)), false, `${locale}:${interaction.interactionId}: correct choice has feedback`);
      for (const entry of [...choices, ...slots]) {
        assert.equal(entry.correct, false, `${locale}:${interaction.interactionId}:${entry.responseId}: feedback must be wrong-answer-only`);
        for (const feedbackLocale of ["ru", "uk"]) {
          const text = entry.feedbackByLocale?.[feedbackLocale] ?? "";
          assert.ok(text.trim().length > 0 && text.length <= 140, `${locale}:${entry.responseId}:${feedbackLocale}: missing or overlong feedback`);
          assert.equal(generic.has(text), false, `${locale}:${entry.responseId}:${feedbackLocale}: generic feedback`);
        }
      }
      if (interaction.modePayload?.authoredDistractorTokens?.length) {
        assert.equal(slots.length, interaction.modePayload.authoredDistractorTokens.length, `${locale}:${interaction.interactionId}: each distractor tile needs feedback`);
      }
      feedback.push(...choices, ...slots);
    }
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
