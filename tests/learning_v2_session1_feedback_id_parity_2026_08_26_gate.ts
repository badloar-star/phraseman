import assert from "node:assert/strict";

import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { buildSessionChildBodiesFromShard } from "../modules/learning-v2/content/source/session_package_from_shard_v1";
import { buildSessionShardFromSource } from "../modules/learning-v2/content/source/session_shard_from_source_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";

const shard = buildSessionShardFromSource(EPISODE_01_SESSION_01_SOURCE);

for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
  const children = buildSessionChildBodiesFromShard(
    shard,
    locale,
    "en:lesson-01:session:01",
  );
  const learner = children.learner.interactions;
  const auxiliaryById = new Map(
    children.auxiliary.entries.map((entry) => [entry.interactionId, entry]),
  );

  for (const interaction of learner) {
    if (
      interaction.family !== "phrase_builder" &&
      interaction.family !== "listen_build_dictation"
    ) {
      continue;
    }
    const auxiliary = auxiliaryById.get(interaction.interactionId);
    assert.ok(auxiliary, `${locale}:${interaction.interactionId}:auxiliary missing`);
    const feedback = auxiliary.responseFeedbackById ?? {};
    const trapIds = interaction.responseOptions
      .filter((option) => option.responseId.includes(":trap:"))
      .map((option) => option.responseId);
    assert.ok(trapIds.length >= 3, `${locale}:${interaction.interactionId}:traps missing`);
    for (const trapId of trapIds) {
      assert.ok(
        feedback[trapId]?.[locale]?.trim(),
        `${locale}:${interaction.interactionId}:${trapId}:feedback missing`,
      );
    }
  }
}

process.stdout.write("LEARNING V2 SESSION 1 FEEDBACK ID PARITY GATE: PASS\n");
