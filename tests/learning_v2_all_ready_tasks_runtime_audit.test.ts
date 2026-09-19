import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type RuntimeInteraction = Readonly<{
  interactionId?: unknown;
  family?: unknown;
  inputMode?: unknown;
  responseOptions?: unknown;
  audioTargetIds?: unknown;
  modePayload?: Readonly<Record<string, unknown>> | null;
}>;

const RELEASE_ROOT = "modules/learning-v2/content/factory_native/generated_release";

const learnerFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return learnerFiles(path);
    return entry.name === "learner.json" ? [path] : [];
  });

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const expectedInputModeByFamily: Readonly<Record<string, string>> = Object.freeze({
  phrase_builder: "ordered_tokens",
  listen_choose: "single_choice",
  sound_contrast: "single_choice",
  listen_build_dictation: "ordered_tokens",
  context_gap_grammar: "single_choice",
  speed_match: "pair_grid",
  scripted_repeat_compare: "tap_record_compare",
});

const files = learnerFiles(RELEASE_ROOT);
assert.ok(files.length > 0, "the ready-session release must contain learner packages");

let interactionCount = 0;
let voiceInteractionCount = 0;
let legacySoundContrastCount = 0;

for (const file of files) {
  const material = JSON.parse(readFileSync(file, "utf8")) as {
    interactions?: RuntimeInteraction[];
  };
  assert.ok(Array.isArray(material.interactions), `${file}: interactions are missing`);

  for (const interaction of material.interactions) {
    interactionCount += 1;
    const id = nonEmpty(interaction.interactionId)
      ? interaction.interactionId
      : `${file}:unknown-interaction`;
    assert.ok(nonEmpty(interaction.family), `${id}: family is missing`);
    assert.equal(
      interaction.inputMode,
      expectedInputModeByFamily[interaction.family],
      `${id}: runtime input mode does not match its task family`,
    );
    assert.equal(
      interaction.modePayload?.family,
      interaction.family,
      `${id}: runtime family and native payload family diverge`,
    );

    if (interaction.family === "sound_contrast") {
      legacySoundContrastCount += 1;
    }

    if (interaction.inputMode === "tap_record_compare") {
      voiceInteractionCount += 1;
      assert.equal(interaction.family, "scripted_repeat_compare", `${id}: wrong voice family`);
      const target = interaction.modePayload?.targetPhrase
        ?? (interaction.modePayload?.referenceAudio as { transcript?: unknown } | undefined)?.transcript;
      assert.ok(nonEmpty(target), `${id}: voice target is empty`);
      assert.ok(
        Array.isArray(interaction.audioTargetIds) && interaction.audioTargetIds.some(nonEmpty),
        `${id}: voice reference audio is missing`,
      );
    }
  }
}

assert.ok(interactionCount > 0, "the ready-session release must contain tasks");
assert.ok(voiceInteractionCount > 0, "the ready-session release must contain voice tasks");
assert.equal(
  legacySoundContrastCount,
  39,
  "the admitted release's historical sound_contrast inventory changed; authoring eligibility requires explicit review",
);

console.log(
  `LEARNING V2 ALL READY TASKS RUNTIME AUDIT: PASS (${files.length} sessions, ${interactionCount} tasks, ${voiceInteractionCount} voice tasks, ${legacySoundContrastCount} legacy sound_contrast tasks)`,
);
