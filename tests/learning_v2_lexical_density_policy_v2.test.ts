import assert from "node:assert/strict";

import { learningV2EnglishLexicalDensityFindingsForPacketV2 } from "../modules/learning-v2/curriculum/en/lexical_density_policy_en_v2";

const packet = ({
  sessionId = "lesson-04:session:08",
  lessonOrdinal = 4,
  sessionWithinChapter = 8,
  newLexicalSenseIds = ["en.neighbourhood.noun.01"],
  retrievalLexicalSenseIds = ["en.pharmacy.noun.01"],
} = {}) => ({
  sessionId,
  lessonOrdinal,
  sessionWithinChapter,
  newLexicalSenseIds,
  retrievalLexicalSenseIds,
});

assert.deepEqual(
  learningV2EnglishLexicalDensityFindingsForPacketV2(packet()),
  [],
  "lesson_four_checkpoint_requires_and_accepts_new_lexicon",
);

assert.deepEqual(
  learningV2EnglishLexicalDensityFindingsForPacketV2(packet({ newLexicalSenseIds: [] })),
  ["lesson_four_new_lexicon_required:lesson-04:session:08"],
  "lesson_four_checkpoint_cannot_drop_its_approved_delta",
);

assert.deepEqual(
  learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
    sessionId: "lesson-03:session:08",
    lessonOrdinal: 3,
  })),
  ["checkpoint_new_lexicon_forbidden:lesson-03:session:08"],
  "earlier_lesson_checkpoint_semantics_remain_unchanged",
);

assert.deepEqual(
  learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
    sessionId: "lesson-05:session:02",
    lessonOrdinal: 5,
    sessionWithinChapter: 2,
    newLexicalSenseIds: [],
  })),
  [],
  "explicit_retrieval_only_noncheckpoint_is_lexical_work",
);

assert.deepEqual(
  learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
    sessionId: "lesson-05:session:03",
    lessonOrdinal: 5,
    sessionWithinChapter: 3,
    newLexicalSenseIds: [],
    retrievalLexicalSenseIds: [],
  })),
  ["noncheckpoint_lexical_work_missing:lesson-05:session:03"],
  "empty_noncheckpoint_still_fails_closed",
);

assert.deepEqual(
  learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
    sessionId: "lesson-04:session:01",
    sessionWithinChapter: 1,
    newLexicalSenseIds: ["1", "2", "3", "4", "5", "6"],
  })),
  ["new_lexicon_above_five:lesson-04:session:01"],
  "constitutional_five_sense_cap",
);

process.stdout.write("LEARNING V2 LEXICAL DENSITY POLICY V2: PASS\n");
