import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const speedMatch = read("modules/learning-v2/modes/speed_match_mode_v1.tsx");
const player = read("app/learning_v2_direct_session_player_v1.tsx");
const localVoice = read("hooks/use_learning_v2_local_hold_to_talk_v1.ts");

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
  player.includes("useLearningV2LocalHoldToTalkV1({"),
  "the player must use the lifecycle-owned Learning V2 hold-to-talk hook",
);
assert.ok(
  !player.includes("<SpeakingPanel"),
  "the session player must not mount the heavyweight universal SpeakingPanel",
);
assert.ok(
  player.includes("void startVoiceCapture()"),
  "press-in must start the dedicated local recognizer",
);
assert.ok(
  player.includes("onPressIn={startVoiceHold}"),
  "the center footer microphone must retain press-in capture",
);
assert.ok(
  player.includes("onPressOut={stopVoiceCapture}"),
  "the center footer microphone must retain press-out completion",
);
assert.ok(
  player.includes("<VoiceEqualizer"),
  "the footer must retain the same VoiceEqualizer used by the original lessons",
);
assert.ok(
  localVoice.includes("onFinalTranscript?: (value: string) => void"),
  "the local recognizer must expose a final transcript completion seam",
);
assert.ok(
  localVoice.includes("finalTranscriptDeliveredRef.current"),
  "the final transcript must be delivered at most once",
);
assert.ok(
  player.includes("onFinalTranscript: (heard) =>"),
  "the player must evaluate the final phone transcript",
);

process.stdout.write("LEARNING V2 SESSION 1 COMPLETION BLOCKERS GATE: PASS\n");
