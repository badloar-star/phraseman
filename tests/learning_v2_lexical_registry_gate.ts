import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1,
} from "../modules/learning-v2/curriculum/en/lexical_senses_en_v1";

const senses = LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1;
const edges = LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1;
const senseIds = new Set(senses.map((sense) => sense.id));

assert.ok(senses.length >= 250, "course needs a substantial human-authored lexical spine");
assert.equal(senseIds.size, senses.length, "lexical sense ids must be unique");

for (const sense of senses) {
  assert.match(sense.id, /^en\.[a-z0-9_]+\.sense\.l\d{2}$/);
  assert.ok(sense.english.trim().length > 0);
  assert.ok(sense.glossRu.trim().length > 0);
  assert.ok(sense.partOfSpeech.trim().length > 0);
  assert.ok(sense.lessonOrdinal >= 1 && sense.lessonOrdinal <= 31);
  assert.ok(![8, 16, 24].includes(sense.lessonOrdinal), "checkpoint lessons must not introduce scored lexicon");
  assert.ok(
    edges.some((edge) => edge.senseId === sense.id),
    `${sense.id} needs at least one future retrieval edge`,
  );
}

for (const edge of edges) {
  const sense = senses.find((candidate) => candidate.id === edge.senseId);
  assert.ok(sense, `${edge.senseId} retrieval edge references an unknown sense`);
  assert.ok(edge.targetLessonOrdinal > sense.lessonOrdinal, `${edge.senseId} retrieval must occur after introduction`);
  assert.ok(edge.targetLessonOrdinal <= 32, `${edge.senseId} retrieval leaves the course`);
  assert.ok(edge.reason.trim().length >= 12, `${edge.senseId} retrieval edge needs a reason`);
}

for (const lessonOrdinal of Array.from({ length: 31 }, (_, index) => index + 1).filter(
  (lesson) => ![8, 16, 24].includes(lesson),
)) {
  assert.ok(
    senses.filter((sense) => sense.lessonOrdinal === lessonOrdinal).length >= 10,
    `lesson ${lessonOrdinal} needs regular lexical growth`,
  );
}

console.log("learning_v2_lexical_registry_gate: PASS");
