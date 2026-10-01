import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const overlay = readFileSync(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "utf8",
);
const flashcard = readFileSync(
  "app/flashcards/FlashcardListItem.tsx",
  "utf8",
);

assert.match(overlay, /ref=\{sheetFlightOriginRef\}/);
assert.match(
  overlay,
  /styles\.sheet[\s\S]{0,1300}translateX:\s*pocketFlightX/,
  "the whole sheet must own the pocket flight",
);
assert.doesNotMatch(
  overlay,
  /testID="learning-v2-new-word-compact-card"[\s\S]{0,900}pocketFlight/,
  "the compact card must not fly independently of the modal",
);
assert.match(
  overlay,
  /cardWrap:\s*\{[\s\S]{0,420}overflow:\s*"visible"/,
);
assert.match(
  flashcard,
  /bottom:\s*0,\s*overflow:\s*'visible',\s*borderRadius:\s*20/,
  "the 3D flip host must not clip the reverse-side corners",
);

console.log("LEARNING V2 NEW WORD OVERLAY MOTION CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_new_word_overlay_motion_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
