import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");
const start = source.indexOf("void managedAudio.playFromStart()");
assert.ok(start > 0, "managed local playback effect must exist");
const effect = source.slice(Math.max(0, start - 260), start + 700);
assert.match(
  effect,
  /audioStatus\.isLoaded/,
  "playback must wait for the newly replaced local source to be loaded",
);
assert.match(
  effect,
  /\[audioRequest, audioStatus\.isLoaded, managedAudio\]/,
  "loaded transition must retry the exact pending request",
);

process.stdout.write("LEARNING V2 AUDIO REPLAY READINESS V1 GATE: PASS\n");
