import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);

assert.match(
  source,
  /answeredUiByInteractionRef/,
  "the direct player must retain the learner-visible answer for review navigation",
);
assert.match(
  source,
  /answeredUiByInteractionRef\.current\.set\(practice\.interactionId/,
  "a correct answer must snapshot its UI state",
);
assert.match(
  source,
  /answeredUiByInteractionRef\.current\.get\(\s*nextInteraction\.interactionId,?\s*\)/,
  "back and forward navigation must restore the answered screen",
);
assert.match(
  source,
  /setSelectedChoiceId\(answeredUi\.selectedChoiceId\)/,
  "single-choice review must restore the selected option",
);
assert.match(
  source,
  /setOrderedIds\(answeredUi\.orderedIds\)/,
  "builder review must restore the completed token order",
);

process.stdout.write("LEARNING V2 DIRECT SESSION REVIEW RESTORE V1 GATE: PASS\n");
