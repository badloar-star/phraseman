import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { splitLearningV2IntroTitleByTargetsV1 } from "../app/learning_v2_intro_title_semantics_v1";

assert.deepEqual(
  splitLearningV2IntroTitleByTargetsV1("Am создаёт связь", ["I", "am"]),
  [
    { text: "Am", isTarget: true },
    { text: " создаёт связь", isTarget: false },
  ],
  "the target-language token in a mixed title must be isolated",
);

assert.deepEqual(
  splitLearningV2IntroTitleByTargetsV1("I am здесь", ["I", "I am"]),
  [
    { text: "I am", isTarget: true },
    { text: " здесь", isTarget: false },
  ],
  "the longest authored target fragment must win",
);

assert.deepEqual(
  splitLearningV2IntroTitleByTargetsV1("Grammar matters", ["am"]),
  [{ text: "Grammar matters", isTarget: false }],
  "a target token must never color a substring inside an explanation word",
);

const introSource = readFileSync("app/learning_v2_session_intro.tsx", "utf8");
assert.match(
  introSource,
  /splitLearningV2IntroTitleByTargetsV1/,
  "the production intro title must use authored target semantics",
);
assert.match(
  introSource,
  /part\.semantic === "targetCorrect"/,
  "title targets must come from explicit authored target-language runs",
);

process.stdout.write("LEARNING V2 INTRO TITLE SEMANTICS V1 GATE: PASS\n");
