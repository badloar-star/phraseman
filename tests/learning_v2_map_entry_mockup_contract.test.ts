import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mockup = readFileSync(
  "docs/v2/mockups/2026-09-19-learning-v2-map-entry/index.html",
  "utf8",
);

const variants = mockup.match(/<article class="variant[^>]+data-variant="[123]"/g) ?? [];
const mapReplayButtons = mockup.match(/<button[^>]+data-action="replay-map"/g) ?? [];
const modalReplayButtons = mockup.match(/<button[^>]+data-action="replay-modal"/g) ?? [];

assert.equal(variants.length, 3, "the review must contain exactly three motion variants");
assert.equal(mapReplayButtons.length, 3, "every variant needs its own map replay button");
assert.equal(modalReplayButtons.length, 3, "every variant needs its own session-modal replay button");

assert.match(mockup, /class="route-path"[^>]+d="[^"]+C[^"]+C[^"]+"/);
assert.doesNotMatch(mockup, /class="path"|height:\s*610px/);
assert.match(mockup, /--node-size:\s*101px/);
assert.match(mockup, /--map-step:\s*128px/);

assert.match(mockup, /data-ui="dictionary"/);
assert.match(mockup, /data-ui="rune-balance"/);
assert.match(mockup, /data-ui="energy"/);
assert.match(mockup, /data-ui="session-modal"/);
assert.match(mockup, /--modal-node-size:\s*92px/);
assert.match(mockup, /--modal-radius:\s*19px/);

assert.match(mockup, /prefers-reduced-motion:\s*reduce/);

console.log("LEARNING V2 MAP ENTRY MOCKUP CONTRACT: PASS");
