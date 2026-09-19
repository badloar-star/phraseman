import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const result = readFileSync(
  "components/learning-v2/horizons/HorizonSessionResult.tsx",
  "utf8",
);
const sequence = readFileSync(
  "components/feedback/ResultsSequence.tsx",
  "utf8",
);
const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);

assert.match(result, /from "\.\.\/\.\.\/feedback\/ResultsSequence"/);
assert.match(result, /from "\.\.\/\.\.\/FeedbackRatingCard"/);
assert.match(result, /from "\.\.\/\.\.\/RuneBalanceChip"/);
assert.match(result, /layoutVariant="learning-v2-orbit"/);
assert.match(result, /showStars\b/);
assert.doesNotMatch(result, /showStars=\{kind === "session"\}/);
assert.match(result, /testID="learning-v2-completion-feedback"/);
assert.match(result, /testID="learning-v2-completion-header-runes"/);
assert.doesNotMatch(result, /learning-v2-completion-replay|Повторить анимацию/);
assert.match(result, /skipAnimationA11yLabel=\{c\.showResult\}/);

assert.match(sequence, /layoutVariant\?: 'default' \| 'learning-v2-pulse' \| 'learning-v2-orbit'/);
assert.match(sequence, /scrollEnabled=\{!orbitMode\}/);
assert.match(sequence, /testID="results-sequence-pulse-hero"/);
assert.match(sequence, /testID="results-sequence-pulse-ledger"/);
assert.match(sequence, /accessibilityLabel=\{skipAnimationA11yLabel\}/);
assert.match(sequence, /finalXp > 0 \|\| hasRunes/);
assert.match(sequence, /HOME_RUNE_ICON_SOURCE/);
assert.doesNotMatch(
  sequence,
  /level-spin-rewards\/stars_10\.webp/,
  "completion must use the canonical app-wide rune asset",
);

assert.match(player, /sessionOrdinal=\{sessionOrdinal\}/);
assert.match(player, /sessionId=\{`\$\{runSummary\?\.courseSessionId/);
assert.doesNotMatch(
  player,
  /runSummary\.lessonOrdinal === 1 && runSummary\.sessionOrdinal === 1/,
  "every admitted production session must commit its own rune composite",
);
assert.doesNotMatch(
  player,
  /completionSaveFailureTitle|completionFailure|learning-v2-completion-save-error|learning-v2-completion-save-retry/u,
  "local completion must never become a user-visible save-error screen",
);
assert.match(player, /const isSessionRepeat = first\(params\.runKind\) === "repeat"/);
assert.match(player, /const canEarnSessionRunes = !isAuthoringPreview && !isSessionRepeat/);
assert.match(player, /learningV2SessionBaseXpV1/);
assert.match(player, /nextLessonAvailable=/);
assert.match(player, /isPulseLessonAuthored\(lessonOrdinal \+ 1\)/);
assert.match(result, /nextLessonInProgress/);
assert.match(player, /learning_v2_direct_session_player_v1:finish/);
assert.match(player, /lessonOrdinal === 32 \? "final" : "lesson"/);

process.stdout.write("LEARNING V2 PULSE COMPLETION 2026-09-12: PASS\n");
