import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInteraction,
  projectScriptedRepeatRevealPolicies,
} from "./build_release.mjs";

const perLocale = {
  ru: {},
  uk: {},
  en: {},
  es: {},
  "pt-BR": {},
  vi: {},
  id: {},
  tr: {},
  pl: {},
};

const task = (purpose) => ({
  ordinal: 17,
  title: "Скажите ответ самостоятельно",
  family: "scripted_repeat_compare",
  interactionId: "en:lesson-01:session-16:i17",
  purpose,
  body: "🎙 **I am smart.**",
  options: [],
  speak: "I am smart.",
});

test("build release emits strict after-attempt reveal evidence for independent scripted repeat", () => {
  const interaction = buildInteraction(
    task("independent_check"),
    perLocale,
    "en:lesson-01:session-16",
    16,
    17,
  );

  assert.equal(interaction.purpose, "independent_check");
  assert.deepEqual(interaction.modePayload.scriptedRepeatRevealPolicy, {
    schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
    revealAfter: "first_submitted_attempt",
    answerExposedBeforeAttempt: false,
    targetPhraseVisibleBeforeAttempt: false,
    referenceAudioAvailableBeforeAttempt: false,
    modelPlaybackAvailableBeforeAttempt: false,
  });
});

test("build release preserves guided scripted repeat visible behavior", () => {
  const interaction = buildInteraction(
    task("guided_practice"),
    perLocale,
    "en:lesson-01:session-16",
    16,
    17,
  );

  assert.equal(interaction.purpose, "guided_practice");
  assert.equal(
    Object.hasOwn(interaction.modePayload, "scriptedRepeatRevealPolicy"),
    false,
  );
});

test("atomic-source projection adds the strict policy without changing purpose", () => {
  const guided = buildInteraction(
    task("guided_practice"),
    perLocale,
    "en:lesson-01:session-16",
    16,
    17,
  );
  const independent = {
    ...guided,
    purpose: "independent_check",
  };

  const [projectedGuided, projectedIndependent] =
    projectScriptedRepeatRevealPolicies([guided, independent]);

  assert.equal(projectedGuided, guided);
  assert.equal(projectedGuided.purpose, "guided_practice");
  assert.equal(
    Object.hasOwn(projectedGuided.modePayload, "scriptedRepeatRevealPolicy"),
    false,
  );
  assert.equal(projectedIndependent.purpose, "independent_check");
  assert.deepEqual(
    projectedIndependent.modePayload.scriptedRepeatRevealPolicy,
    {
      schemaVersion: "learning-v2-scripted-repeat-reveal-policy.v1",
      revealAfter: "first_submitted_attempt",
      answerExposedBeforeAttempt: false,
      targetPhraseVisibleBeforeAttempt: false,
      referenceAudioAvailableBeforeAttempt: false,
      modelPlaybackAvailableBeforeAttempt: false,
    },
  );
});
