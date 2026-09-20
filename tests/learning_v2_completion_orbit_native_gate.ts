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
const feedback = readFileSync("components/FeedbackRatingCard.tsx", "utf8");
const player = readFileSync("app/learning_v2_direct_session_player_v1.tsx", "utf8");

assert.match(result, /layoutVariant="learning-v2-orbit"/u);
assert.match(result, /presentation="compact-stars"/u);
assert.match(result, /reducedMotion=\{reducedMotion\}/u);
assert.match(result, /bottomInset=\{insets\.bottom\}/u);
assert.match(result, /rewardsSettled=\{rewardsSettled\}/u);
assert.match(player, /const \[finaleRewardsSettled, setFinaleRewardsSettled\] = useState\(false\)/u);
assert.match(player, /setFinaleRewardsSettled\(true\)/u);
assert.match(player, /rewardsSettled=\{finaleRewardsSettled\}/u);
assert.match(player, /if \(finaleStars !== null\)/u);
assert.doesNotMatch(player, /finaleStars !== null && \(!reducedMotion \|\| finaleRewardsSettled\)/u);
assert.match(sequence, /'learning-v2-orbit'/u);
assert.match(sequence, /reducedMotion\?: boolean/u);
assert.match(sequence, /bottomInset\?: number/u);
assert.match(sequence, /rewardsSettled\?: boolean/u);
assert.match(sequence, /const effectiveReducedMotion = reducedMotion \?\? systemReduceMotion/u);
assert.match(sequence, /scrollEnabled=\{!orbitMode\}/u);
assert.match(sequence, /bounces=\{!orbitMode\}/u);
assert.match(sequence, /styles\.orbitRoot/u);
assert.match(sequence, /Math\.max\(10, bottomInset \+ 8\)/u);
assert.doesNotMatch(
  sequence,
  /styles\.orbitRings|orbitRingStyle/u,
  "the completion hero must not render decorative ellipse rings",
);
assert.match(
  sequence,
  /!orbitMode \? \([\s\S]*styles\.pulseGlow/u,
  "the orbit completion must also suppress the decorative oval glow",
);
assert.doesNotMatch(
  result,
  /badge=\{|name="trophy"|styles\.badgeHalo/u,
  "the completion hero must not render the trophy tile",
);
assert.match(sequence, /const detailsSV = useSharedValue\(initiallySettled \? 1 : 0\)/u);
assert.match(sequence, /const orbitDetailsStyle = useAnimatedStyle/u);
assert.match(sequence, /rewardSequenceCursorEndsAtRef/u);
assert.match(sequence, /lateDetailsTimeoutRef/u);
assert.match(sequence, /styles\.orbitDetails/u);
assert.match(sequence, /pointerEvents=\{detailsReady \? 'auto' : 'none'\}/u);
assert.match(sequence, /accessibilityElementsHidden=\{!detailsReady\}/u);
assert.match(sequence, /importantForAccessibility=\{detailsReady \? 'auto' : 'no-hide-descendants'\}/u);
assert.match(sequence, /const \[detailsReady, setDetailsReady\] = useState\(initiallySettled\)/u);
assert.match(sequence, /getResultsSequenceFinalRevealPlan\(/u);
assert.match(sequence, /revealPlan\.mode === 'hard-settle'/u);
assert.match(sequence, /const LATE_REWARD_COUNT_DURATION_MS = 460/u);
assert.match(sequence, /const presentationFinaleAtMs = useMemo/u);

assert.match(feedback, /presentation\?: 'default' \| 'compact-stars'/u);
assert.match(feedback, /name=\{rating >= star \? 'star' : 'star-outline'\}/u);
assert.match(feedback, /styles\.compactStarButton/u);
assert.match(feedback, /compactStarButton:\s*\{\s*width:\s*44,\s*height:\s*44/u);
assert.doesNotMatch(
  feedback,
  /compactStarButton:[^}]*backgroundColor/su,
  "rating touch targets may be large, but the visible controls must be stars without square fills",
);

console.log("LEARNING V2 COMPLETION ORBIT NATIVE GATE: PASS");
