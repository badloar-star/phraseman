import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);

const invalidLocatorState = player.slice(
  player.indexOf("if (!locator || !lessonOrdinal || !sessionOrdinal)"),
  player.indexOf("if (finaleStars !== null && isCheckpoint)"),
);
assert.match(
  invalidLocatorState,
  /testID="learning-v2-unavailable-back"/u,
  "an invalid session locator must still offer a Back action",
);
assert.match(invalidLocatorState, /safeRouterBack\(router, exitRoute\)/u);

const loadFailureState = player.slice(
  player.indexOf("if (\n    (!readyHandle && !isAuthoringPreview)"),
  player.indexOf("if (isCheckpoint && !checkpointEntryDone)"),
);
assert.match(
  loadFailureState,
  /testID="learning-v2-unavailable-back"/u,
  "a failed session load must offer Back as well as Retry",
);
assert.match(loadFailureState, /safeRouterBack\(router, exitRoute\)/u);
assert.match(loadFailureState, /setLoadRevision\(\(value\) => value \+ 1\)/u);

process.stdout.write(
  "LEARNING V2 SESSION UNAVAILABLE BACK 2026-08-28 GATE: PASS\n",
);
