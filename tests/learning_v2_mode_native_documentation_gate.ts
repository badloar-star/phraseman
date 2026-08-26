import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const CONTRACT_REF = "MODE_NATIVE_AUTHORING_CONTRACT.ru.md";
const requiredReaders = [
  "docs/v2/СТАРТ В2.md",
  "docs/v2/СТАРТ ES.md",
  "docs/v2/README.md",
  "docs/v2/LESSON_DESIGN_RULES.ru.md",
  "docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md",
  "docs/v2/03-learning-architecture-and-curriculum.md",
  "docs/v2/04-activity-catalog-and-storyboards.md",
  "docs/v2/06-runtime-content-admin-and-release.md",
  "docs/v2/08-admin-content-studio-and-mode-authoring.md",
  "docs/v2/GENERATOR_DELIVERY_CONTRACT.md",
  "docs/v2/QUALITY_REFERENCE_GENERATED_CURRICULUM_V3.md",
  "docs/v2/HANDOVER.md",
  "docs/v2/HANDOVER_ES.md",
  "docs/superpowers/plans/2026-07-14-phraseman-v2-pilot-season.md",
  "docs/superpowers/plans/2026-07-14-phraseman-v2-content-studio.md",
] as const;

for (const path of requiredReaders) {
  assert.match(
    readFileSync(join(ROOT, path), "utf8"),
    /MODE_NATIVE_AUTHORING_CONTRACT\.ru\.md/u,
    `${path} must route future authoring sessions through ${CONTRACT_REF}`,
  );
}

const contract = readFileSync(
  join(ROOT, "docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md"),
  "utf8",
);
for (const family of [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
]) {
  assert.match(contract, new RegExp(`\\b${family}\\b`, "u"));
}
assert.match(contract, /1:1/u);
assert.match(contract, /word-first/u);
assert.match(contract, /число контактов/u);
assert.match(contract, /все существующие English и Spanish/u);

process.stdout.write("LEARNING V2 MODE-NATIVE DOCUMENTATION GATE: PASS\n");
