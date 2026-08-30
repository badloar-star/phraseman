export type LearningV2EnglishSessionLexicalSenseAssignmentV2 = Readonly<{
  id: string;
  english: string;
  glossRu: string;
  partOfSpeech: "adjective" | "adverb";
}>;

export type LearningV2EnglishSessionLexicalAssignmentV2 = Readonly<{
  sessionId: `lesson-${string}:session:${string}`;
  absoluteSessionOrdinal: number;
  grammarOperationId: string;
  newSenses: readonly LearningV2EnglishSessionLexicalSenseAssignmentV2[];
  retrievalSenseIds: readonly string[];
  canonicalExamples: readonly string[];
}>;

const I_AM_OPERATION_ID = "en.grammar.present_be_affirmative.i_am";

const sense = (
  english: string,
  glossRu: string,
  partOfSpeech: "adjective" | "adverb" = "adjective",
): LearningV2EnglishSessionLexicalSenseAssignmentV2 => Object.freeze({
  id: `en.${english}.${partOfSpeech}.01`,
  english,
  glossRu,
  partOfSpeech,
});

const assignment = (
  sessionOrdinal: number,
  newSenses: readonly LearningV2EnglishSessionLexicalSenseAssignmentV2[],
  retrievalSenseIds: readonly string[],
  canonicalExamples: readonly string[],
): LearningV2EnglishSessionLexicalAssignmentV2 => Object.freeze({
  sessionId: `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`,
  absoluteSessionOrdinal: sessionOrdinal,
  grammarOperationId: I_AM_OPERATION_ID,
  newSenses: Object.freeze([...newSenses]),
  retrievalSenseIds: Object.freeze([...retrievalSenseIds]),
  canonicalExamples: Object.freeze([...canonicalExamples]),
});

// Chapter 1 keeps one atomic grammar operation (I + am) while expanding the
// useful vocabulary available inside that operation. Session 8 is a pure
// checkpoint and therefore deliberately has no lexical assignment.
export const LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2:
readonly LearningV2EnglishSessionLexicalAssignmentV2[] = Object.freeze([
  assignment(
    1,
    [
      sense("here", "здесь", "adverb"),
      sense("ready", "готов"),
      sense("fine", "в порядке"),
    ],
    [],
    ["I am here.", "I am ready.", "I am fine."],
  ),
  assignment(
    2,
    [
      sense("happy", "счастлив"),
      sense("sad", "грустен"),
      sense("tired", "устал"),
    ],
    ["en.here.adverb.01", "en.ready.adjective.01", "en.fine.adjective.01"],
    ["I am happy.", "I am sad.", "I am tired."],
  ),
  assignment(
    3,
    [
      sense("busy", "занят"),
      sense("free", "свободен"),
      sense("late", "опоздал"),
    ],
    ["en.happy.adjective.01", "en.sad.adjective.01", "en.tired.adjective.01"],
    ["I am busy.", "I am free.", "I am late."],
  ),
  assignment(
    4,
    [
      sense("hungry", "голоден"),
      sense("thirsty", "хочу пить"),
      sense("sick", "болен"),
    ],
    ["en.busy.adjective.01", "en.free.adjective.01", "en.late.adjective.01"],
    ["I am hungry.", "I am thirsty.", "I am sick."],
  ),
  assignment(
    5,
    [
      sense("cold", "мне холодно"),
      sense("hot", "мне жарко"),
      sense("warm", "мне тепло"),
    ],
    ["en.hungry.adjective.01", "en.thirsty.adjective.01", "en.sick.adjective.01"],
    ["I am cold.", "I am hot.", "I am warm."],
  ),
  assignment(
    6,
    [
      sense("calm", "спокоен"),
      sense("nervous", "нервничаю"),
      sense("excited", "взволнован"),
    ],
    ["en.cold.adjective.01", "en.hot.adjective.01", "en.warm.adjective.01"],
    ["I am calm.", "I am nervous.", "I am excited."],
  ),
  assignment(
    7,
    [
      sense("angry", "зол"),
      sense("scared", "мне страшно"),
    ],
    ["en.calm.adjective.01", "en.nervous.adjective.01", "en.excited.adjective.01"],
    ["I am angry.", "I am scared.", "I am calm."],
  ),
]);

const assignmentSessionIds = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2
  .map((item) => item.sessionId);
if (new Set(assignmentSessionIds).size !== assignmentSessionIds.length) {
  throw new Error("learning_v2_session_lexical_assignment_session_ids_not_unique");
}

const assignedSenseIds = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2
  .flatMap((item) => item.newSenses.map((itemSense) => itemSense.id));
if (new Set(assignedSenseIds).size !== assignedSenseIds.length) {
  throw new Error("learning_v2_session_lexical_assignment_sense_ids_not_unique");
}
