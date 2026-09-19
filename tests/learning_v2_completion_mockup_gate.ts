import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const html = readFileSync(
  resolve(
    process.cwd(),
    "docs/v2/mockups/2026-09-19-learning-v2-completion-options/index.html",
  ),
  "utf8",
);

assert.equal((html.match(/data-variant/g) ?? []).length >= 2, true);
assert.match(html, /01 · Наградная орбита/u);
assert.match(html, /02 · Премиальная витрина/u);
assert.match(html, /\.phone\s*\{[\s\S]*?overflow:\s*hidden/u);
assert.match(html, /height:\s*calc\(100% - 42px - 56px - 8px\)/u);
assert.match(html, /IntersectionObserver/u, "motion must autoplay once on first reveal");
assert.match(html, /prefers-reduced-motion:\s*reduce/u);
assert.match(html, /class="rating"[\s\S]*?<button aria-label="1 звезда"><svg><use href="#i-star"/u);
assert.match(html, /\.rating button \{[^}]*background:\s*transparent/u);
assert.doesNotMatch(html, /class="rating"[^\n]*<button>[1-5]<\/button>/u);
assert.doesNotMatch(html, /Повторить анимацию|Replay animation|replay-animation/iu);
assert.doesNotMatch(html, /animation-iteration-count:\s*infinite|\binfinite\b/iu);

console.log("LEARNING V2 COMPLETION MOCKUP GATE: PASS");
