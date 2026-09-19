import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);
const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const xpManager = readFileSync("app/xp_manager.ts", "utf8");

assert.match(
  player,
  /const isSessionRepeat = first\(params\.runKind\) === "repeat"/,
  "the direct player must distinguish repeat navigation from first completion",
);
assert.match(
  player,
  /const canEarnSessionRunes = !isAuthoringPreview && !isSessionRepeat/,
  "preview and repeat runs must not accrue a learner wallet reward",
);
assert.match(
  player,
  /if \(!run \|\| finishing \|\| finishingRef\.current \|\| !runSummary\) return/,
  "the completion barrier must close synchronously before React state settles",
);
assert.match(
  player,
  /await import\("\.\/xp_manager"\)/,
  "the heavy XP owner must stay lazy and off the initial Learning V2 graph",
);
assert.match(player, /"learning_v2_session"/);
assert.match(player, /xp:\s*creditedSessionXpRef\.current/);
assert.match(
  player,
  /eventId: learningV2SessionXpEventIdV1\(runSummary\.courseSessionId\)/,
  "XP must have one stable idempotency identity per first session completion",
);
assert.match(xpManager, /\| 'learning_v2_session'/);
assert.match(xpManager, /case 'learning_v2_session':[\s\S]{0,180}return 'lesson_answer'/);
assert.match(xpManager, /'plan_task_complete', 'learning_v2_session'\]\.includes\(source\)/);
assert.match(xpManager, /const usesConsumableXpBoosts = source !== 'learning_v2_session'/);
assert.match(xpManager, /const giftState = usesConsumableXpBoosts/);
assert.match(xpManager, /const leagueChestM = !usesConsumableXpBoosts/);
assert.doesNotMatch(
  player,
  /runSummary\.lessonOrdinal === 1\s*&&\s*runSummary\.sessionOrdinal === 1/,
  "production rune composites must not be restricted to en/L1/S1",
);
assert.doesNotMatch(
  player,
  /completionSaveFailureTitle|completionFailure|learning-v2-completion-save-error|learning-v2-completion-save-retry/u,
  "completion is local-first; synchronization failures must remain background-only",
);
assert.match(
  player,
  /kind=\{sessionRole === "final_exam"\s*\? lessonOrdinal === 32\s*\? "final"\s*:\s*"lesson"/,
  "S56 completes its lesson; only lesson 32 completes the whole course",
);

assert.doesNotMatch(
  lessons,
  /<LearningV2RuneFlight[\s\S]{0,160}count=\{1\}/,
  "a current→completed map transition must not invent a one-rune receipt",
);

console.log("Learning V2 production reward + completion gate: PASS");
