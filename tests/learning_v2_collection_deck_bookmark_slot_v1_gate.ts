import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  "app/flashcards/CollectionDeckView.tsx",
  "utf8",
);

assert.match(
  source,
  /renderTopCardAction\?: \(card: CardItem\) => React\.ReactNode/,
  "the exact Cards stack must expose an additive top-card action slot",
);
assert.match(
  source,
  /renderTopCardAction\?\.\(card\)/,
  "the action slot must follow the currently visible top card",
);

process.stdout.write("LEARNING V2 COLLECTION DECK BOOKMARK SLOT V1 GATE: PASS\n");
