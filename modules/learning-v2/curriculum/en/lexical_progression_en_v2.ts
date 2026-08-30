import { LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1 } from "./lexical_senses_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";

export type LearningV2EnglishPlannedLexicalSenseV2 = Readonly<{
  id: string;
  english: string;
  glossRu: string;
  partOfSpeech: string;
  lessonOrdinal: number;
  groundingOperationId: string;
  introductionAbsoluteSessionOrdinal: number;
  neededBySessionIds: readonly string[];
  localizationStatus: "REQUIRES_MANUAL_AUTHORING";
  definitionByLocale: null;
  sourceEvidenceRefs: readonly string[];
}>;

export type LearningV2EnglishPlannedLexicalRetrievalEdgeV2 = Readonly<{
  senseId: string;
  sourceAbsoluteSessionOrdinal: number;
  targetAbsoluteSessionOrdinal: number;
  changedContextRequired: true;
  samePromptForbidden: true;
}>;

const sessionId = (absoluteOrdinal: number): string => {
  const lessonOrdinal = Math.floor((absoluteOrdinal - 1) / 56) + 1;
  const sessionOrdinal = ((absoluteOrdinal - 1) % 56) + 1;
  return `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;
};

const senseSlug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const normalizedExamplesByOperation = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => ({
  operation,
  text: ` ${operation.positiveExamples.join(" ").toLowerCase().replace(/[^a-z]+/g, " ")} `,
}));

// V1 is only a bounded glossary candidate pool. Its scenario-first lesson
// order is never inherited: every accepted form must be independently grounded
// in an approved V2 grammar-operation example and is re-timed by that operation.
const candidates = LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1
  .filter((sense) => !["hello", "name"].includes(sense.english.toLowerCase()))
  .flatMap((sense) => {
    const grounding = normalizedExamplesByOperation.find(({ text }) =>
      text.includes(` ${sense.english.toLowerCase()} `),
    );
    return grounding ? [{ sense, operation: grounding.operation }] : [];
  });

const candidateIndexWithinOperation = new Map<string, number>();

export const LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2: readonly LearningV2EnglishPlannedLexicalSenseV2[] = Object.freeze(
  candidates.map(({ sense, operation }) => {
    const operationIndexWithinLesson = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2
      .filter((candidate) => candidate.lessonOrdinal === operation.lessonOrdinal)
      .findIndex((candidate) => candidate.id === operation.id);
    if (operationIndexWithinLesson < 0 || operationIndexWithinLesson > 6) {
      throw new Error(`learning_v2_lexical_grounding_operation_slot_invalid:${operation.id}`);
    }
    const candidateIndex = candidateIndexWithinOperation.get(operation.id) ?? 0;
    candidateIndexWithinOperation.set(operation.id, candidateIndex + 1);
    const sessionOffsetWithinChapter = Math.floor(candidateIndex / 2);
    if (sessionOffsetWithinChapter > 7) {
      throw new Error(`learning_v2_lexical_grounding_capacity_exceeded:${operation.id}`);
    }
    const introductionAbsoluteSessionOrdinal =
      ((operation.lessonOrdinal - 1) * 56) +
      (operationIndexWithinLesson * 8) +
      sessionOffsetWithinChapter +
      1;
    const retrievalOrdinals = [...new Set([8, 56, 112, 224]
      .map((distance) => Math.min(1_792, introductionAbsoluteSessionOrdinal + distance)))]
      .filter((ordinal) => ordinal > introductionAbsoluteSessionOrdinal);
    return Object.freeze({
      id: `en.${senseSlug(sense.english)}.${senseSlug(sense.partOfSpeech)}.01`,
      english: sense.english,
      glossRu: sense.glossRu,
      partOfSpeech: sense.partOfSpeech,
      lessonOrdinal: operation.lessonOrdinal,
      groundingOperationId: operation.id,
      introductionAbsoluteSessionOrdinal,
      neededBySessionIds: Object.freeze([
        sessionId(introductionAbsoluteSessionOrdinal),
        ...retrievalOrdinals.map(sessionId),
      ]),
      localizationStatus: "REQUIRES_MANUAL_AUTHORING" as const,
      definitionByLocale: null,
      sourceEvidenceRefs: Object.freeze([
        ...operation.sourceEvidenceRefs,
        "PH-VOCAB-01",
        "OC-FULL-B1-SCOPE-01",
      ]),
    });
  }),
);

export const LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2: readonly LearningV2EnglishPlannedLexicalRetrievalEdgeV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.flatMap((sense) =>
    sense.neededBySessionIds.slice(1).map((targetSessionId) => {
      const [lessonPart, sessionPart] = targetSessionId.split(":session:");
      const targetLessonOrdinal = Number(lessonPart.replace("lesson-", ""));
      const targetSessionOrdinal = Number(sessionPart);
      return Object.freeze({
        senseId: sense.id,
        sourceAbsoluteSessionOrdinal: sense.introductionAbsoluteSessionOrdinal,
        targetAbsoluteSessionOrdinal: ((targetLessonOrdinal - 1) * 56) + targetSessionOrdinal,
        changedContextRequired: true as const,
        samePromptForbidden: true as const,
      });
    }),
  ),
);
