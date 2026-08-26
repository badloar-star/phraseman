import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../app/learning_v2_direct_session_player_v1.tsx", import.meta.url),
  "utf8",
);

assert.match(source, /useLayoutEffect\(\(\) => \{\s*if \(!introDone \|\| !practice\) return;/s);
assert.match(source, /key=\{`practice-\$\{practiceIndex\}-\$\{practiceActivated \? "active" : "blocked"\}`\}/);
assert.match(source, /style=\{practiceActivated \? undefined : styles\.practiceBlocked\}/);
assert.match(source, /practiceBlocked:\s*\{\s*opacity:\s*0/s);

console.log("LEARNING V2 NEW WORD BEFORE PRACTICE MOTION GATE: PASS");
