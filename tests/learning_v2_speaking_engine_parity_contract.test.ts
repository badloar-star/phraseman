import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");
const panel = readFileSync("components/SpeakingPanel.tsx", "utf8");

assert.doesNotMatch(
  player,
  /useLearningV2LocalHoldToTalkV1/,
  "Learning V2 must not keep a separate microphone engine",
);
assert.match(player, /<SpeakingPanel/);
assert.match(player, /presentation="inline"/);
assert.doesNotMatch(player, /renderInlineSurface=\{false\}/);
assert.match(player, /<SpeakHoldButton/);
assert.match(player, /testID="learning-v2-inline-hold-to-talk"/);
assert.match(player, /holdActive=\{voiceHoldActive\}/);
assert.doesNotMatch(
  player,
  /onTranscriptChange=\{setTranscript\}/,
  "interim hypotheses must stay inside SpeakingPanel instead of rerendering the whole session player",
);
assert.match(
  player,
  /onScore=\{\(\{[\s\S]{0,100}transcript[\s\S]{0,500}learningV2CourseSessionVoiceResponseV1/,
  "the shared speaking verdict must feed the native Learning V2 evaluator",
);
assert.match(
  player,
  /onScore=\{\(\{ score, passed, transcript: heard \}\)[\s\S]{0,800}forcePedagogicalWrong:\s*!passed/,
  "a failed shared pronunciation verdict must be registered as a pedagogical error",
);
assert.match(panel, /onTranscriptChange\?: \(transcript: string\) => void/);
assert.match(
  panel,
  /onScore\?: \(result: \{ score: number; passed: boolean; transcript: string \}\) => void/,
);

console.log("LEARNING V2 SPEAKING ENGINE PARITY CONTRACT: PASS");
