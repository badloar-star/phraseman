import { learningV2EnglishLexicalDensityFindingsForPacketV2 } from "../modules/learning-v2/curriculum/en/lexical_density_policy_en_v2";

// зачем (разбор красных 18.10, Ревизор 3.81): набор состоял из голых assert на верхнем уровне без единого test — jest отвечал «must contain at least one test».
// Проверки те же слово в слово, обёрнуты в test(), чтобы обычный прогон их исполнял.
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

describe("english lexical density policy v2", () => {
  test("lesson_four_checkpoint_requires_and_accepts_new_lexicon", () => {
    expect(learningV2EnglishLexicalDensityFindingsForPacketV2(packet())).toEqual([]);
  });

  test("lesson_four_checkpoint_cannot_drop_its_approved_delta", () => {
    expect(learningV2EnglishLexicalDensityFindingsForPacketV2(packet({ newLexicalSenseIds: [] })))
      .toEqual(["lesson_four_new_lexicon_required:lesson-04:session:08"]);
  });

  test("earlier_lesson_checkpoint_semantics_remain_unchanged", () => {
    expect(learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
      sessionId: "lesson-03:session:08",
      lessonOrdinal: 3,
    }))).toEqual(["checkpoint_new_lexicon_forbidden:lesson-03:session:08"]);
  });

  test("explicit_retrieval_only_noncheckpoint_is_lexical_work", () => {
    expect(learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
      sessionId: "lesson-05:session:02",
      lessonOrdinal: 5,
      sessionWithinChapter: 2,
      newLexicalSenseIds: [],
    }))).toEqual([]);
  });

  test("empty_noncheckpoint_still_fails_closed", () => {
    expect(learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
      sessionId: "lesson-05:session:03",
      lessonOrdinal: 5,
      sessionWithinChapter: 3,
      newLexicalSenseIds: [],
      retrievalLexicalSenseIds: [],
    }))).toEqual(["noncheckpoint_lexical_work_missing:lesson-05:session:03"]);
  });

  test("constitutional_five_sense_cap", () => {
    expect(learningV2EnglishLexicalDensityFindingsForPacketV2(packet({
      sessionId: "lesson-04:session:01",
      sessionWithinChapter: 1,
      newLexicalSenseIds: ["1", "2", "3", "4", "5", "6"],
    }))).toEqual(["new_lexicon_above_five:lesson-04:session:01"]);
  });
});
