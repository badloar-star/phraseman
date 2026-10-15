import assert from "node:assert/strict";
import test from "node:test";

import { appendMissingChoiceFeedback } from "./migrate_missing_choice_feedback_v1.mjs";

test("adds source-visible explanations for missing wrong choices from their exact existing atomic feedback", () => {
  const markdown = `**1 · Послушайте и выберите**\n<!-- interaction_id: en:lesson-01:session-03:i01; family: listen_choose -->\n🔊 *I am not hungry.* → **I am not hungry.** · I am hungry. · I am not cold.\n`;
  const tasks = [{
    options: [
      { text: "I am not hungry.", correct: true },
      { text: "I am hungry.", correct: false, feedback: "" },
      { text: "I am not cold.", correct: false, feedback: "" },
    ],
  }];
  const interactions = [{
    responseOptions: [{ responseId: "r1", text: "I am not hungry." }, { responseId: "r2", text: "I am hungry." }, { responseId: "r3", text: "I am not cold." }],
    modePayload: { choiceFeedback: [
      { responseId: "r1", correct: true, feedbackByLocale: { ru: "Верно." } },
      { responseId: "r2", correct: false, feedbackByLocale: { ru: "В аудио слышно not." } },
      { responseId: "r3", correct: false, feedbackByLocale: { ru: "Последнее слово hungry, не cold." } },
    ] },
  }];

  const result = appendMissingChoiceFeedback(markdown, tasks, interactions, "ru");

  assert.deepEqual(result.holds, []);
  assert.match(result.markdown, /- I am hungry\. — \*В аудио слышно not\.\*/u);
  assert.match(result.markdown, /- I am not cold\. — \*Последнее слово hungry, не cold\.\*/u);
});
