import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "components/learning-v2/LearningV2WordPocketOverlayV1.tsx",
  "utf8",
);

assert.match(source, /CollectionDeckView/, "must reuse the exact Cards stack");
assert.match(source, /renderTopCardAction/, "bookmark must live on the visible card");
assert.match(source, /<AddToFlashcard/, "bookmark must reuse the real save control");
assert.doesNotMatch(source, /heart/, "heart or like semantics are forbidden");

process.stdout.write("LEARNING V2 WORD POCKET OVERLAY V1 GATE: PASS\n");
