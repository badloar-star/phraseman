import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

const player = read("app/learning_v2_direct_session_player_v1.tsx");
const intro = read("app/learning_v2_session_intro.tsx");
const pocket = read(
  "components/learning-v2/LearningV2WordPocketOverlayV1.tsx",
);


// Owner rule: the Learning V2 dock uses the same quiet icon + caption rhythm as
// the original lesson footer. Individual actions must not become round cards or
// a wide CTA pill.
for (const icon of [
  'name="arrow-undo-outline"',
  'name="mic-outline"',
  'name="albums-outline"',
  'name="play-forward"',
]) {
  assert.ok(player.includes(icon), `original lesson footer icon missing: ${icon}`);
}
assert.ok(player.includes("styles.footerAction"));
assert.ok(player.includes("styles.footerActionLabel"));
assert.ok(!player.includes("styles.footerRoundButton"));
assert.ok(!player.includes("styles.footerNextButton"));

// Attempts belong to header layout. An absolute overlay can cover the intro
// progress number or report control on narrow phones.
assert.ok(player.includes("headerAccessory={"));
assert.ok(intro.includes("headerAccessory?: React.ReactNode"));
assert.ok(intro.includes("{headerAccessory}"));
assert.ok(!player.includes("introAttemptsOverlay"));

// Only the three answer choices remain card surfaces; there is no outer card
// wrapping the entire embedded question.
assert.ok(!intro.includes("{ backgroundColor: t.bgCard },\n                  ]}"));
assert.doesNotMatch(
  intro,
  /questionPanel:\s*\{[\s\S]{0,160}(?:borderRadius|padding):/u,
);
assert.doesNotMatch(
  intro,
  /answerList:\s*\{[\s\S]{0,100}marginHorizontal:\s*-/u,
);

// Full-screen word pocket must reserve the actual device status-bar inset.
assert.ok(pocket.includes("useStableSafeAreaInsets"));
assert.ok(pocket.includes("paddingTop: insets.top + 12"));
assert.ok(pocket.includes("minHeight: insets.top + 78"));

process.stdout.write(
  "LEARNING V2 ORIGINAL LESSON FOOTER + SAFE LAYOUT GATE: PASS\n",
);
