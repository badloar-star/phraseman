import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "../modules/learning-v2/curriculum/en/grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2 } from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";
import {
  validateLearningV2CourseBlueprintV2,
  type LearningV2CurriculumFindingV2,
} from "../modules/learning-v2/curriculum/validation/course_blueprint_validation_v2";

const basePacket = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2[0];
assert.ok(basePacket, "base_packet_required");
const lexicalPacket = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
  (packet) => packet.newLexicalSenseIds.length > 0,
);
assert.ok(lexicalPacket, "new_lexical_packet_required");

function validate(packet: typeof basePacket): readonly LearningV2CurriculumFindingV2[] {
  return validateLearningV2CourseBlueprintV2({
    grammarOperations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2,
    lexicalSenses: LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2,
    sessionPackets: [packet],
  });
}

function expectCode(packet: typeof basePacket, code: string): void {
  const codes = validate(packet).map((finding) => finding.code);
  assert.equal(codes.includes(code), true, `${code}: ${codes.join(", ")}`);
}

assert.deepEqual(validate(basePacket), []);
assert.deepEqual(
  validateLearningV2CourseBlueprintV2({
    grammarOperations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2,
    lexicalSenses: LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2,
    sessionPackets: LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2,
  }),
  [],
  "full_blueprint_semantic_alignment",
);

expectCode({
  ...basePacket,
  introPlan: basePacket.introPlan.map((intro, index) =>
    index === 0 ? { ...intro, operationIds: ["en.future.unexplained"] } : intro,
  ),
}, "intro_operation_outside_packet");

expectCode({
  ...basePacket,
  activityPlan: basePacket.activityPlan.map((activity, index) =>
    index === 0 ? { ...activity, operationIds: ["en.future.unexplained"] } : activity,
  ),
}, "practice_operation_outside_intro_or_review");

expectCode({
  ...basePacket,
  canonicalExamples: ["Hello.", ...basePacket.canonicalExamples.slice(1)],
}, "canonical_example_missing_operation_form");

const futureExample = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.find(
  (operation) => operation.lessonOrdinal > basePacket.lessonOrdinal,
)?.positiveExamples[0];
assert.ok(futureExample, "future_example_required");
expectCode({
  ...basePacket,
  canonicalExamples: [futureExample, ...basePacket.canonicalExamples.slice(1)],
}, "canonical_example_future_grammar");

expectCode({
  ...lexicalPacket,
  activityPlan: lexicalPacket.activityPlan.map((activity) => ({
    ...activity,
    targetLexicalSenseIds: [],
  })),
}, "new_lexeme_absent_from_grounded_contacts");

expectCode({
  ...basePacket,
  role: "checkpoint",
}, "checkpoint_new_grammar_forbidden");

expectCode({
  ...basePacket,
  independentProbe: {
    ...basePacket.independentProbe,
    probePromptSignature: basePacket.independentProbe.trainingPromptSignature,
  },
}, "independent_probe_not_changed_context");

process.stdout.write(
  "LEARNING V2 SEMANTIC ALIGNMENT GATE V2: PASS future_grammar=0 ungrounded_lexicon=0 copied_probes=0\n",
);
