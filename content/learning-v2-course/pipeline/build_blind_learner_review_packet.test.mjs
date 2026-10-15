import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBlindLearnerReviewPacket,
  projectionRelativePathForReceipt,
} from "./build_blind_learner_review_packet.mjs";

test("blind packet projection path is derived from the exact receipt session", () => {
  assert.equal(
    projectionRelativePathForReceipt({ courseSessionId: "en:lesson-01:session-13" }),
    "en/l01/s13",
  );
  assert.throws(
    () => projectionRelativePathForReceipt({ courseSessionId: "en:lesson-1:session-13" }),
    /blind_packet_course_session_invalid/u,
  );
});

test("blind learner packet excludes evaluator authority and hidden targets while preserving rendered choices", () => {
  const packet = buildBlindLearnerReviewPacket({
    candidateBundleSha256: "a".repeat(64),
    contentReceiptSha256: "b".repeat(64),
    candidateInventorySha256: "c".repeat(64),
    sourceFingerprint: "d".repeat(64),
    intro: { courseSessionId: "en:lesson-01:session-12", pages: [] },
    learnersByLocale: {
      ru: {
        interactions: [{
          interactionId: "en:lesson-01:session-12:i01",
          ordinal: 4,
          purpose: "guided_practice",
          family: "phrase_builder",
          inputMode: "ordered_tokens",
          prompt: "Соберите фразу",
          responseOptions: [{ responseId: "r1", text: "visible choice", correct: true }],
          accessibilityLabel: "Соберите фразу",
          modePayload: {
            targetPhrase: "SECRET TARGET",
            hiddenTargetPhrase: "SECRET HIDDEN",
            orderedTokens: ["I", "am"],
            authoredDistractorTokens: ["is"],
            referenceAudio: { transcript: "SECRET AUDIO", audioTargetId: "audio" },
            choiceFeedback: [{ responseId: "r2", correct: false, testedDimension: "form", feedbackByLocale: { ru: "Visible feedback" } }],
          },
        }],
      },
    },
    auxiliary: { entries: [] },
  });

  const serialized = JSON.stringify(packet);
  for (const forbidden of ['"targetPhrase":', '"hiddenTargetPhrase":', '"correctResponseId":', '"correctText":', '"evaluator":', "SECRET TARGET", "SECRET HIDDEN", "SECRET AUDIO", '"correct":']) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual([...packet.locales.ru.interactions[0].visibleTiles].sort(), ["I", "am", "is"].sort());
  assert.notDeepEqual(packet.locales.ru.interactions[0].visibleTiles, ["I", "am", "is"]);
  assert.equal(packet.locales.ru.interactions[0].feedback[0].text, "Visible feedback");
});
