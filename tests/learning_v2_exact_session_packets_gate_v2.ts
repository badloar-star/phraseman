import assert from "node:assert/strict";

import { LEARNING_V2_ACTIVE_MODE_FAMILIES_V2 } from "../modules/learning-v2/curriculum/contracts/course_blueprint_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";

const packets = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2;
const operationById = new Map(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => [operation.id, operation]),
);

assert.equal(packets.length, 1_792, "exact_packet_count");
assert.equal(new Set(packets.map((packet) => packet.sessionId)).size, 1_792, "session_ids_unique");

const introductionOrdinalByOperationId = new Map<string, number>();
for (const packet of packets) {
  for (const operationId of packet.grammarOperationIds) {
    assert.equal(
      introductionOrdinalByOperationId.has(operationId),
      false,
      `operation_introduced_twice:${operationId}`,
    );
    introductionOrdinalByOperationId.set(operationId, packet.absoluteSessionOrdinal);
  }
}
assert.equal(
  introductionOrdinalByOperationId.size,
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.length,
  "every_operation_has_one_full_session_introduction",
);

for (const packet of packets) {
  const prefix = packet.sessionId;
  assert.equal(packet.sessionOrdinal, ((packet.absoluteSessionOrdinal - 1) % 56) + 1, `${prefix}:absolute_ordinal`);
  assert.equal(packet.chapterOrdinal, Math.ceil(packet.sessionOrdinal / 8), `${prefix}:chapter_ordinal`);
  assert.equal(packet.sessionWithinChapter, ((packet.sessionOrdinal - 1) % 8) + 1, `${prefix}:session_within_chapter`);
  assert.equal(packet.grammarOperationIds.length <= 1, true, `${prefix}:one_new_operation_max`);
  assert.equal(
    packet.grammarOperationIds.length > 0 && packet.reviewOperationIds.length > 0,
    false,
    `${prefix}:new_and_review_must_not_mix`,
  );
  assert.equal(
    packet.grammarOperationIds.length + packet.reviewOperationIds.length > 0,
    true,
    `${prefix}:grammar_or_review_required`,
  );
  assert.equal(packet.newLexicalSenseIds.length <= 2, true, `${prefix}:new_lexicon_max_two`);
  assert.equal(packet.canonicalExamples.length >= 2 && packet.canonicalExamples.length <= 4, true, `${prefix}:canonical_example_count`);
  assert.equal(
    packet.canonicalExamples.some((example) => example.includes("MANUAL") || example.includes("[")),
    false,
    `${prefix}:canonical_placeholder_forbidden`,
  );
  assert.equal(packet.phraseFrames.length > 0, true, `${prefix}:phrase_frames_required`);
  assert.equal(packet.learnerFacingAuthoringStatus, "PLANNED_NOT_AUTHORED", `${prefix}:honest_authoring_status`);
  assert.deepEqual(packet.introPlan.map((item) => item.slot), [1, 2, 3], `${prefix}:intro_slots`);
  assert.deepEqual(
    packet.introPlan.map((item) => item.purpose),
    ["concept", "formula", "trap"],
    `${prefix}:intro_progression`,
  );
  assert.deepEqual(
    packet.activityPlan.map((item) => item.slot),
    Array.from({ length: 17 }, (_, index) => index + 4),
    `${prefix}:practice_slots`,
  );
  assert.equal(
    new Set(packet.activityPlan.map((item) => item.modeFamily)).size,
    LEARNING_V2_ACTIVE_MODE_FAMILIES_V2.length,
    `${prefix}:six_mode_coverage`,
  );
  assert.equal(
    packet.activityPlan.some((item, index, all) => index > 0 && item.modeFamily === all[index - 1]?.modeFamily),
    false,
    `${prefix}:adjacent_mode_duplicate`,
  );

  const focusOperationIds = [...packet.grammarOperationIds, ...packet.reviewOperationIds];
  const allowedExamples = new Set(
    focusOperationIds.flatMap((operationId) => operationById.get(operationId)?.positiveExamples ?? []),
  );
  assert.equal(
    packet.canonicalExamples.every((example) => allowedExamples.has(example)),
    true,
    `${prefix}:canonical_example_not_owned_by_focus`,
  );
  assert.equal(
    packet.introPlan.every((item) => item.learnerCopyStatus === "REQUIRES_MANUAL_AUTHORING"),
    true,
    `${prefix}:intro_must_not_claim_authored`,
  );
  assert.equal(
    packet.activityPlan.every((item) => item.learnerPayloadStatus === "REQUIRES_MANUAL_AUTHORING"),
    true,
    `${prefix}:activity_must_not_claim_authored`,
  );
  for (const operationId of focusOperationIds) {
    const operation = operationById.get(operationId);
    assert.ok(operation, `${prefix}:unknown_operation:${operationId}`);
    const introducedAt = introductionOrdinalByOperationId.get(operationId);
    assert.ok(introducedAt !== undefined, `${prefix}:unintroduced_operation:${operationId}`);
    assert.equal(introducedAt <= packet.absoluteSessionOrdinal, true, `${prefix}:future_operation:${operationId}`);
    for (const prerequisiteId of operation.prerequisiteOperationIds) {
      const prerequisiteIntroduction = introductionOrdinalByOperationId.get(prerequisiteId);
      assert.ok(prerequisiteIntroduction !== undefined, `${prefix}:unknown_prerequisite:${prerequisiteId}`);
      assert.equal(
        prerequisiteIntroduction < packet.absoluteSessionOrdinal,
        true,
        `${prefix}:prerequisite_not_earlier:${prerequisiteId}`,
      );
    }
  }

  if (packet.role === "checkpoint") {
    assert.equal(packet.grammarOperationIds.length, 0, `${prefix}:checkpoint_new_grammar_forbidden`);
    assert.equal(packet.newLexicalSenseIds.length, 0, `${prefix}:checkpoint_new_lexicon_forbidden`);
    assert.equal(packet.independentProbe.changedContextRequired, true, `${prefix}:checkpoint_changed_context`);
  }
}

for (const lessonOrdinal of Array.from({ length: 32 }, (_, index) => index + 1)) {
  const lessonPackets = packets.filter((packet) => packet.lessonOrdinal === lessonOrdinal);
  assert.equal(lessonPackets.length, 56, `lesson_${lessonOrdinal}:packet_count`);
  assert.equal(
    lessonPackets.some((packet) => packet.grammarOperationIds.length > 0),
    true,
    `lesson_${lessonOrdinal}:must_teach_new_grammar`,
  );
}

process.stdout.write(
  `LEARNING V2 EXACT SESSION PACKETS GATE V2: PASS packets=${packets.length} intros=${packets.length * 3} practices=${packets.length * 17} checkpoints=${packets.filter((packet) => packet.role === "checkpoint").length}\n`,
);
