import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string =>
  readFileSync(resolve(root, path), "utf8");

const encounterOverlay = read(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
);
assert.match(encounterOverlay, /<ScrollView/u);
assert.match(encounterOverlay, /style=\{styles\.cardScroll\}/u);
assert.match(encounterOverlay, /style=\{styles\.continueRow\}/u);

const pocketOverlay = read(
  "components/learning-v2/LearningV2WordPocketOverlayV1.tsx",
);
assert.match(pocketOverlay, /import \{ triLang \}/u);
assert.match(pocketOverlay, /const copy = \{/u);
assert.doesNotMatch(
  pocketOverlay,
  /accessibilityLabel="Закрыть карман слов"/u,
);

const player = read("app/learning_v2_direct_session_player_v1.tsx");
assert.match(player, /const voiceFooterDisabled =/u);
assert.match(player, /result === "correct"/u);
assert.match(player, /sessionAttempts\.state\.phase !== "active"/u);
assert.match(player, /disabled=\{voiceFooterDisabled\}/u);
assert.match(player, /disabled: voiceFooterDisabled/u);

process.stdout.write("LEARNING V2 SESSION 1 REVIEW REGRESSIONS GATE: PASS\n");
