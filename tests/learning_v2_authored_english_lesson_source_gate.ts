import assert from "node:assert/strict";

import { authoredEnglishLessonSessionSourceV1 } from "../modules/learning-v2/content/source/authored_english_lesson_source_v1";

const lesson1 = authoredEnglishLessonSessionSourceV1(1, 1);
const lesson2 = authoredEnglishLessonSessionSourceV1(2, 1);
const lesson3 = authoredEnglishLessonSessionSourceV1(3, 1);

assert.ok(lesson1, "lesson_1_session_1_source_missing");
assert.ok(lesson2, "lesson_2_session_1_source_missing");
assert.ok(lesson3, "lesson_3_session_1_source_missing");
assert.equal(lesson1.episodeOrdinal, 1, "lesson_1_source_wrong_episode");
assert.equal(lesson2.episodeOrdinal, 2, "lesson_2_source_wrong_episode");
assert.equal(lesson3.episodeOrdinal, 3, "lesson_3_source_wrong_episode");
assert.equal(
  authoredEnglishLessonSessionSourceV1(4, 1),
  null,
  "unregistered_lesson_must_not_fall_back_to_lesson_1",
);

process.stdout.write("LEARNING V2 AUTHORED ENGLISH LESSON SOURCE GATE: PASS\n");
