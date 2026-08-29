import assert from "node:assert/strict";

import { LEARNING_V2_COURSE_SESSION_COUNT_V1 } from "../modules/learning-v2/content/course_topology_v1";
import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "../modules/learning-v2/curriculum/en/chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1 } from "../modules/learning-v2/curriculum/en/lexical_senses_en_v1";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v1";
import { validateLearningV2CourseBlueprintV1 } from "../modules/learning-v2/curriculum/validation/course_blueprint_validation_v1";

const packets = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1;
const lexicalIds = new Set(LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1.map((sense) => sense.id));

assert.equal(packets.length, LEARNING_V2_COURSE_SESSION_COUNT_V1);
assert.equal(new Set(packets.map((packet) => packet.sessionId)).size, packets.length);

for (const packet of packets) {
  assert.ok(packet.primaryCanDoStep.length >= 30, `${packet.sessionId} needs an exact can-do`);
  assert.ok(packet.canonicalEnglishExamples.length >= 2 && packet.canonicalEnglishExamples.length <= 4);
  assert.ok(packet.requiredModeFamilies.length >= 1);
  assert.ok(!packet.requiredModeFamilies.includes("sound_contrast"), `${packet.sessionId} uses the removed sound-contrast mode`);
  assert.ok(!packet.requiredModeFamilies.includes("letter_builder"), `${packet.sessionId} uses forbidden letter assembly`);
  for (const senseId of [...packet.newLexicalSenseIds, ...packet.retrievalLexicalSenseIds]) {
    assert.ok(lexicalIds.has(senseId), `${packet.sessionId} references unknown lexical sense ${senseId}`);
  }
}

for (const chapter of LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1) {
  const chapterPackets = packets.filter(
    (packet) => packet.lessonOrdinal === chapter.lessonOrdinal && packet.chapterOrdinal === chapter.chapterOrdinal,
  );
  assert.equal(chapterPackets.length, 8, `${chapter.chapterId} needs eight exact packets`);
  assert.ok(chapterPackets.some((packet) => packet.role === "voice"), `${chapter.chapterId} needs voice transfer`);
  assert.ok(
    chapterPackets.some((packet) => packet.role === "checkpoint" || packet.role === "final_exam"),
    `${chapter.chapterId} needs independent checkpoint evidence`,
  );
}

const grouped = Array.from({ length: 32 }, (_, index) => Object.freeze({
  lessonOrdinal: index + 1,
  sessions: packets.filter((packet) => packet.lessonOrdinal === index + 1),
}));
const findings = validateLearningV2CourseBlueprintV1({
  lessons: grouped,
  forbiddenSurfaceFormsById: Object.freeze({}),
});
assert.deepEqual(findings, [], findings.map((finding) => `${finding.code}:${finding.lessonOrdinal}:${finding.sessionOrdinal}`).join("\n"));

console.log("learning_v2_exact_session_packets_gate: PASS");
