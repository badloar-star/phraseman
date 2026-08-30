import { LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2 } from "./full_b1_scope_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";

export type LearningV2EnglishLessonBlueprintV2 = Readonly<{
  lessonId: `lesson-${string}`;
  lessonOrdinal: number;
  titleRu: string;
  majorSystemId: string;
  terminalCanDoRu: string;
  ownedGrammarOperationIds: readonly string[];
  deliberateReviewOperationIds: readonly string[];
  chapterCount: 7;
  sessionCount: 56;
  checkpointOnly: false;
  sourceEvidenceRefs: readonly string[];
}>;

const operationIdsByLesson = new Map<number, readonly string[]>(
  LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons.map((lesson) => [
    lesson.lessonOrdinal,
    Object.freeze(
      LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2
        .filter((operation) => operation.lessonOrdinal === lesson.lessonOrdinal)
        .map((operation) => operation.id),
    ),
  ]),
);

const reviewOperationIdsForLesson = (lessonOrdinal: number): readonly string[] => {
  const sourceLessonOrdinals = [lessonOrdinal - 1, lessonOrdinal - 3]
    .filter((ordinal, index, values) => ordinal >= 1 && values.indexOf(ordinal) === index);
  return Object.freeze(sourceLessonOrdinals.flatMap((sourceLessonOrdinal) => {
    const operationIds = operationIdsByLesson.get(sourceLessonOrdinal) ?? [];
    const lastOperationId = operationIds.at(-1);
    return lastOperationId ? [lastOperationId] : [];
  }));
};

export const LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2: readonly LearningV2EnglishLessonBlueprintV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons.map((scope) => Object.freeze({
    lessonId: `lesson-${String(scope.lessonOrdinal).padStart(2, "0")}` as `lesson-${string}`,
    lessonOrdinal: scope.lessonOrdinal,
    titleRu: scope.titleRu,
    majorSystemId: scope.majorSystemId,
    terminalCanDoRu: scope.terminalCanDoRu,
    ownedGrammarOperationIds: operationIdsByLesson.get(scope.lessonOrdinal) ?? Object.freeze([]),
    deliberateReviewOperationIds: reviewOperationIdsForLesson(scope.lessonOrdinal),
    chapterCount: 7 as const,
    sessionCount: 56 as const,
    checkpointOnly: false as const,
    sourceEvidenceRefs: scope.sourceEvidenceRefs,
  })),
);
