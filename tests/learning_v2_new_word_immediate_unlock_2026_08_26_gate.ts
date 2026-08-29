import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const player = readFileSync(
  "app/learning_v2_direct_session_player_v1.tsx",
  "utf8",
);
const hook = readFileSync(
  "hooks/use_learning_v2_unlocked_lesson_words_v1.ts",
  "utf8",
);
const map = readFileSync("app/(tabs)/lessons.tsx", "utf8");

assert.match(
  hook,
  /hydrated:/u,
  "the player must know when the scoped unlock registry is hydrated",
);
assert.match(
  player,
  /if \(!unlockedWordsHydrated\) return;/u,
  "word-card decisions must wait for durable unlock hydration",
);
assert.match(
  player,
  /unlockedWordIds\.has\(practiceEncounterId\)/u,
  "a previously seen lexical item must be suppressed on retry",
);
assert.match(
  player,
  /newWordFlow\.kind !== "presenting"\) return;[\s\S]{0,500}markCurrentNewWordPresented/u,
  "the durable unlock must happen when the blocking card is presented",
);

const overlay = player.slice(
  player.indexOf("<LearningV2NewWordEncounterOverlay"),
  player.indexOf("{runeFlight ?"),
);
assert.ok(
  !overlay.includes("await unlockCurrentNewWord()"),
  "Continue must not be the first durable unlock point",
);
assert.match(
  map,
  /includeAuthoringPreview:\s*__DEV__/u,
  "the DEV map dictionary must include the isolated authoring-preview registry",
);

process.stdout.write("LEARNING V2 IMMEDIATE WORD UNLOCK 2026-08-26 GATE: PASS\n");
