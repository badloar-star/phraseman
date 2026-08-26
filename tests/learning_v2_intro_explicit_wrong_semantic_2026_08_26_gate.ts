import assert from "node:assert/strict";

import { introPartRole } from "../app/learning_v2_intro_semantic_bridge";

// A visual tone is not linguistic evidence. Only an explicit semantic marker
// may tell the learner that a target form is wrong and strike it through.
assert.equal(
  introPartRole({ text: "обычное предупреждение", tone: "danger" }, true),
  "plain",
);
assert.equal(
  introPartRole({ text: "aviso importante", tone: "danger" }, false),
  "plain",
);
assert.equal(
  introPartRole(
    { text: "I here", tone: "normal", semantic: "targetWrong" },
    true,
  ),
  "targetWrong",
);

console.log("LEARNING V2 INTRO EXPLICIT WRONG SEMANTIC GATE: PASS");
