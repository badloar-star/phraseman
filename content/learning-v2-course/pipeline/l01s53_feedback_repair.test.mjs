import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parsePractice } from "./build_release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const session = "en:lesson-01:session-53";
const correctChoices = {
  i02: "is", i03: "busy", i05: "are", i07: "not", i09: "sick",
  i10: "together", i14: "tired",
};
const wrongTiles = {
  i08: { d1: "is" },
  i13: { d1: "not" },
  "i16:s04": { d1: "is" },
};

test("L01/S53 explains every correct choice and every distractor tile", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s53/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const byId = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId.slice(session.length + 1), item]));
    for (const [id, word] of Object.entries(correctChoices)) {
      const feedback = byId.get(id).modePayload.choiceFeedback?.find((item) => item.responseId === `${session}:${id}:r1`);
      assert.equal(feedback?.correct, true, `${locale}:${id}:correct choice feedback`);
      assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")), `${locale}:${id}:explains correct choice`);
    }
    for (const [id, slots] of Object.entries(wrongTiles)) {
      for (const [slot, word] of Object.entries(slots)) {
        const feedback = byId.get(id).modePayload.slotFeedback?.find((item) => item.responseId === `${session}:${id}:tile:${slot}`);
        assert.equal(feedback?.correct, false, `${locale}:${id}:${slot}:wrong tile feedback`);
        assert.match(feedback?.feedbackByLocale?.[locale] ?? "", new RegExp(word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")), `${locale}:${id}:${slot}:explains wrong tile`);
      }
    }
  }
});

test("L01/S53 keeps the same deliberate not distractor in both localizations", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s53/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const item = data.interactionsByLocale[locale].find((entry) => entry.interactionId === `${session}:i13`);
    assert.deepEqual(item?.modePayload?.authoredDistractorTokens, ["not"], `${locale}:i13`);
  }
});

test("L01/S53 authors and projects an explanation for every learner decision", () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, "sessions/en/l01/s53/practice.atomic.json"), "utf8"));
  for (const locale of ["ru", "uk"]) {
    const source = fs.readFileSync(path.join(root, `sessions/en/l01/s53/final.${locale}.md`), "utf8");
    const tasks = parsePractice(source);
    const interactions = new Map(data.interactionsByLocale[locale].map((item) => [item.interactionId, item]));

    for (const task of tasks) {
      const interaction = interactions.get(task.interactionId);
      assert.ok(interaction, `${locale}:${task.interactionId}: interaction exists`);

      if (["context_gap_grammar", "listen_choose"].includes(task.family)) {
        for (const [index, option] of task.options.entries()) {
          assert.notEqual(option.feedback, "", `${locale}:${task.interactionId}: source explains ${option.text}`);
          assert.equal(
            interaction.modePayload.choiceFeedback[index]?.feedbackByLocale?.[locale],
            option.feedback,
            `${locale}:${task.interactionId}: atomic projects ${option.text}`,
          );
        }
      }

      if (["phrase_builder", "listen_build_dictation"].includes(task.family)) {
        assert.notEqual(task.completionFeedback ?? "", "", `${locale}:${task.interactionId}: source has correct-completion feedback`);
        assert.equal(
          interaction.modePayload.completionFeedbackByLocale?.[locale],
          task.completionFeedback,
          `${locale}:${task.interactionId}: atomic projects correct-completion feedback`,
        );
        for (const feedback of interaction.modePayload.slotFeedback ?? []) {
          assert.notEqual(feedback.feedbackByLocale?.[locale] ?? "", "", `${locale}:${task.interactionId}: source explains distractor tile`);
        }
      }
    }
  }
});
