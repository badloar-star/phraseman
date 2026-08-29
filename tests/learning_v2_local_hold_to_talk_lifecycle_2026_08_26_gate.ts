import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hook = readFileSync(
  "hooks/use_learning_v2_local_hold_to_talk_v1.ts",
  "utf8",
);
const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);

assert.match(hook, /const onTranscriptRef = useRef\(onTranscript\)/u);
assert.match(hook, /const onFinalTranscriptRef = useRef\(onFinalTranscript\)/u);
assert.match(hook, /onTranscriptRef\.current\(transcriptRef\.current\)/u);
assert.match(hook, /onFinalTranscriptRef\.current\?\.\(value\)/u);

const startBlock = hook.slice(
  hook.indexOf("const start = useCallback"),
  hook.indexOf("const stop = useCallback"),
);
assert.ok(
  !/\n\s+onTranscript,?\n/u.test(startBlock),
  "inline transcript callbacks must not change the active press handler",
);

assert.match(player, /start:\s*startVoiceCapture/u);
assert.match(player, /stop:\s*stopVoiceCapture/u);
assert.match(player, /onPressIn=\{startVoiceHold\}/u);
assert.match(player, /onPressOut=\{stopVoiceCapture\}/u);
assert.match(
  player,
  /pressRetentionOffset=\{\{\s*top:\s*\d+,\s*right:\s*\d+,\s*bottom:\s*\d+,\s*left:\s*\d+\s*\}\}/u,
);

assert.match(hook, /isHoldRecordingSupported/u);
assert.match(hook, /ensureNeuralModel/u);
assert.match(hook, /pcmRecorderSupported/u);
assert.doesNotMatch(
  hook,
  /isHoldRecordingSupported\(\)\s*&&\s*isNeuralJudgeSupported\(\)/u,
);
assert.match(hook, /startHoldRecording/u);
assert.match(hook, /judgeWithNeuralEngine/u);
assert.match(hook, /Platform\.OS === ["']android["']/u);

process.stdout.write(
  "LEARNING V2 HOLD-TO-TALK LIFECYCLE 2026-08-26 GATE: PASS\n",
);
