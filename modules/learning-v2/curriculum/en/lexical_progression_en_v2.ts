import { LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1 } from "./lexical_senses_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2 } from "./session_lexical_assignments_en_v2";

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

// A chapter checkpoint is an independent retrieval event, not a lexical
// introduction. Every introduced sense therefore has a forward edge to the
// first checkpoint after its introduction in addition to its spaced review
// edges. Keeping this calculation here makes the exact packet projection and
// the lexical ledger share one source of truth.
const firstCheckpointAfter = (absoluteOrdinal: number): number | null => {
  const chapterStart = Math.floor((absoluteOrdinal - 1) / 8) * 8 + 1;
  const checkpoint = chapterStart + 7;
  if (checkpoint > absoluteOrdinal) return checkpoint;
  const nextCheckpoint = checkpoint + 8;
  return nextCheckpoint <= 1_792 ? nextCheckpoint : null;
};

const senseSlug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const normalizedExamplesByOperation = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => ({
  operation,
  text: ` ${operation.positiveExamples.join(" ").toLowerCase().replace(/[^a-z]+/g, " ")} `,
}));

const explicitIntroductions = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.flatMap(
  (assignment) => assignment.newSenses.map((sense) => ({ assignment, sense })),
);
const explicitIntroductionBySenseId = new Map(
  explicitIntroductions.map(({ assignment, sense }) => [sense.id, assignment]),
);
const explicitlyAssignedEnglish = new Set(
  explicitIntroductions.map(({ sense }) => sense.english.toLowerCase()),
);
const explicitlyAssignedOperationIds = new Set(
  LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.map(
    (assignment) => assignment.grammarOperationId,
  ),
);
const explicitCandidates = explicitIntroductions.map(({ assignment, sense }) => {
  const operation = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.find(
    (candidate) => candidate.id === assignment.grammarOperationId,
  );
  if (!operation) {
    throw new Error(`learning_v2_lexical_assignment_operation_missing:${assignment.grammarOperationId}`);
  }
  return Object.freeze({ sense, operation });
});

// V1 is only a bounded glossary candidate pool. Its scenario-first lesson
// order is never inherited: every accepted form must be independently grounded
// in an approved V2 grammar-operation example and is re-timed by that operation.
const candidates = Object.freeze([
  ...explicitCandidates,
  ...LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1
    .filter((sense) =>
      !["hello", "name"].includes(sense.english.toLowerCase()) &&
      !explicitlyAssignedEnglish.has(sense.english.toLowerCase())
    )
    .flatMap((sense) => {
      const grounding = normalizedExamplesByOperation.find(({ text }) =>
        text.includes(` ${sense.english.toLowerCase()} `),
      );
      // Once an operation has its exact manual lexical plan, an old V1
      // scenario candidate must not silently compete for its introduction
      // slots or create an orphan sense. Unplanned operations may still use
      // the bounded candidate pool while their exact plan is being authored.
      return grounding && !explicitlyAssignedOperationIds.has(grounding.operation.id)
        ? [{ sense, operation: grounding.operation }]
        : [];
    }),
]);

const candidateIndexWithinOperation = new Map<string, number>();

export const LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2: readonly LearningV2EnglishPlannedLexicalSenseV2[] = Object.freeze(
  candidates.map(({ sense, operation }) => {
    const senseId = `en.${senseSlug(sense.english)}.${senseSlug(sense.partOfSpeech)}.01`;
    const explicitIntroduction = explicitIntroductionBySenseId.get(senseId);
    const operationIndexWithinLesson = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2
      .filter((candidate) => candidate.lessonOrdinal === operation.lessonOrdinal)
      .findIndex((candidate) => candidate.id === operation.id);
    if (operationIndexWithinLesson < 0 || operationIndexWithinLesson > 6) {
      throw new Error(`learning_v2_lexical_grounding_operation_slot_invalid:${operation.id}`);
    }
    const candidateIndex = candidateIndexWithinOperation.get(operation.id) ?? 0;
    candidateIndexWithinOperation.set(operation.id, candidateIndex + 1);
    const sessionOffsetWithinChapter = Math.floor(candidateIndex / 2);
    if (!explicitIntroduction && sessionOffsetWithinChapter > 7) {
      throw new Error(`learning_v2_lexical_grounding_capacity_exceeded:${operation.id}`);
    }
    const introductionAbsoluteSessionOrdinal = explicitIntroduction?.absoluteSessionOrdinal ??
      (((operation.lessonOrdinal - 1) * 56) +
        (operationIndexWithinLesson * 8) +
        sessionOffsetWithinChapter +
        1);
    const checkpointOrdinal = firstCheckpointAfter(introductionAbsoluteSessionOrdinal);
    const retrievalOrdinals = [...new Set([
      checkpointOrdinal,
      ...[8, 56, 112, 224]
        .map((distance) => Math.min(1_792, introductionAbsoluteSessionOrdinal + distance)),
    ].filter((ordinal): ordinal is number => ordinal !== null))]
      .filter((ordinal) => ordinal > introductionAbsoluteSessionOrdinal);
    return Object.freeze({
      id: senseId,
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

const scheduledRetrievalEdges = LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.flatMap((sense) =>
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
);

const plannedSenseById = new Map(
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.map((sense) => [sense.id, sense]),
);
const assignedRetrievalEdges = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2.flatMap(
  (assignment) => assignment.retrievalSenseIds.map((senseId) => {
    const sense = plannedSenseById.get(senseId);
    if (!sense) {
      throw new Error(`learning_v2_assigned_retrieval_sense_missing:${assignment.sessionId}:${senseId}`);
    }
    if (sense.introductionAbsoluteSessionOrdinal >= assignment.absoluteSessionOrdinal) {
      throw new Error(`learning_v2_assigned_retrieval_not_after_introduction:${assignment.sessionId}:${senseId}`);
    }
    return Object.freeze({
      senseId,
      sourceAbsoluteSessionOrdinal: sense.introductionAbsoluteSessionOrdinal,
      targetAbsoluteSessionOrdinal: assignment.absoluteSessionOrdinal,
      changedContextRequired: true as const,
      samePromptForbidden: true as const,
    });
  }),
);

export const LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2: readonly LearningV2EnglishPlannedLexicalRetrievalEdgeV2[] = Object.freeze([
  ...assignedRetrievalEdges,
  ...scheduledRetrievalEdges,
]);
