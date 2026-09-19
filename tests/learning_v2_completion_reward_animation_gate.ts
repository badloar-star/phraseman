import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const player = read("app/learning_v2_direct_session_player_v1.tsx");
assert.match(
  player,
  /const \[finaleFacts, setFinaleFacts\] = useState<HorizonResultFacts>/u,
  "completion facts must be reactive so late local receipts reach the mounted finale",
);
assert.match(player, /setFinaleFacts\(nextFacts\)/u);
assert.match(player, /facts=\{finaleFacts\}/u);

const horizon = read(
  "components/learning-v2/horizons/HorizonSessionResult.tsx",
);
const sequence = read("components/feedback/ResultsSequence.tsx");
assert.match(horizon, /animateLateRewards/u);
assert.match(sequence, /animateLateRewards\?: boolean/u);
assert.match(sequence, /lateXpAnimatedRef/u);
assert.match(sequence, /lateRunesAnimatedRef/u);
assert.match(sequence, /timelineRewardSnapshotRef/u);

console.log("learning_v2_completion_reward_animation_gate: PASS");
