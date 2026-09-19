import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const speedMatch = read("modules/learning-v2/modes/speed_match_mode_v1.tsx");
const player = read("app/learning_v2_direct_session_player_v1.tsx");
const speakingPanel = read("components/SpeakingPanel.tsx");

assert.ok(
  speedMatch.includes('matchedPairIds.has(pair.pairId) ? "ok"'),
  "matched Speed Match tiles must stay rendered in their success state",
);
assert.ok(
  speedMatch.includes("disabled={disabled || verdict === \"ok\"}"),
  "matched Speed Match tiles must be disabled after a correct connection",
);
assert.ok(
  !speedMatch.includes('matchedPairIds.has(pair.pairId) ? "void"'),
  "matched Speed Match tiles must never switch to the invisible void state",
);
assert.ok(
  !/if \(verdict === "ok"\)[\s\S]{0,500}opacity\.value = withTiming\(0,/u.test(
    speedMatch,
  ),
  "the success animation must not fade matched tiles out",
);

assert.ok(
  player.includes("<SpeakingPanel"),
  "the player must use the same SpeakingPanel engine as Oral mode",
);
assert.ok(
  player.includes("<SpeakHoldButton"),
  "the voice task must expose the proven hold control on the task screen",
);
assert.ok(
  !player.includes('testID="learning-v2-footer-hold-to-talk"'),
  "the primary voice action must not remain hidden in the footer",
);
assert.ok(
  player.includes("onHoldStart={startVoiceHold}"),
  "the on-screen microphone must retain press-in capture",
);
assert.ok(
  player.includes("onHoldEnd={stopVoiceCapture}"),
  "the on-screen microphone must retain press-out completion",
);
assert.ok(
  !player.includes("renderInlineSurface={false}"),
  "the shared SpeakingPanel equalizer must remain visible",
);
assert.ok(
  speakingPanel.includes("onTranscriptChange?: (transcript: string) => void"),
  "the shared recognizer must expose the live transcript seam",
);
assert.ok(
  speakingPanel.includes("onScore?.({ score: honestScore, passed, transcript: text })"),
  "the shared scorer must return score, pass verdict and transcript together",
);
assert.ok(
  player.includes("learningV2CourseSessionVoiceResponseV1("),
  "the player must evaluate the shared Oral verdict",
);

process.stdout.write("LEARNING V2 SESSION 1 COMPLETION BLOCKERS GATE: PASS\n");
