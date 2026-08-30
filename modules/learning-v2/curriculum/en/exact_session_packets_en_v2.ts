import {
  LEARNING_V2_ACTIVE_MODE_FAMILIES_V2,
  type LearningV2ModeFamilyV2,
  type LearningV2SessionRoleV2,
  type LearningV2SupportV2,
} from "../contracts/course_blueprint_v2";
import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2 } from "./chapter_blueprints_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";
import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2,
} from "./lexical_senses_en_v2";

export type LearningV2EnglishIntroPlanItemV2 = Readonly<{
  slot: 1 | 2 | 3;
  purpose: "concept" | "formula" | "trap";
  operationIds: readonly string[];
  testedDimension: "meaning" | "form" | "diagnostic_error";
  learnerCopyStatus: "REQUIRES_MANUAL_AUTHORING";
}>;

export type LearningV2EnglishActivityPlanItemV2 = Readonly<{
  slot: number;
  modeFamily: LearningV2ModeFamilyV2;
  operationIds: readonly string[];
  canonicalExample: string;
  support: LearningV2SupportV2;
  independentEvidence: boolean;
  learnerPayloadStatus: "REQUIRES_MANUAL_AUTHORING";
}>;

export type LearningV2EnglishExactSessionPacketV2 = Readonly<{
  sessionId: `lesson-${string}:session:${string}`;
  absoluteSessionOrdinal: number;
  lessonOrdinal: number;
  chapterOrdinal: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  sessionOrdinal: number;
  sessionWithinChapter: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  role: LearningV2SessionRoleV2;
  grammarOperationIds: readonly string[];
  reviewOperationIds: readonly string[];
  prerequisiteSessionIds: readonly string[];
  learningDeltaRu: string;
  phraseFrames: readonly string[];
  forbiddenOperationIds: readonly string[];
  newLexicalSenseIds: readonly string[];
  retrievalLexicalSenseIds: readonly string[];
  lexicalPlanRu: string;
  canonicalExamples: readonly string[];
  introPlan: readonly LearningV2EnglishIntroPlanItemV2[];
  activityPlan: readonly LearningV2EnglishActivityPlanItemV2[];
  independentProbe: Readonly<{
    changedContextRequired: true;
    copiedTrainingPromptForbidden: true;
    support: "minimal" | "none";
  }>;
  sourceEvidenceRefs: readonly string[];
  learnerFacingAuthoringStatus: "PLANNED_NOT_AUTHORED";
}>;

const SESSION_ROLES = Object.freeze([
  "introduce_grammar",
  "introduce_or_guided_extension",
  "introduce_or_diagnostic_contrast",
  "guided_application",
  "diagnostic_repair",
  "listening_retrieval",
  "spoken_production",
  "checkpoint",
] as const satisfies readonly LearningV2SessionRoleV2[]);

const LEARNING_DELTAS_RU = Object.freeze([
  "Впервые связать точный смысл с одной prerequisite-safe грамматической операцией.",
  "Применить уже объяснённую операцию с меньшей опорой и изменённым лексическим слотом.",
  "Отличить целевую операцию от ближайшей уже знакомой формы по одной диагностической подсказке.",
  "Самостоятельно выбрать и построить форму в новом бытовом контексте.",
  "Распознать типичную ошибку, исправить её и объяснить решающий признак.",
  "Извлечь знакомую грамматику на слух без показа готового target-текста.",
  "Произнести собственный короткий ответ по знакомой операции без единственного блокирующего score.",
  "Доказать перенос изученного review-набора в изменённой ситуации без новой грамматики.",
] as const);

const MODE_SEQUENCE: readonly LearningV2ModeFamilyV2[] = Object.freeze([
  "phrase_builder",
  "listen_choose",
  "context_gap_grammar",
  "speed_match",
  "listen_build_dictation",
  "phrase_builder",
  "scripted_repeat_compare",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "listen_build_dictation",
  "phrase_builder",
  "scripted_repeat_compare",
  "context_gap_grammar",
  "listen_choose",
  "speed_match",
  "scripted_repeat_compare",
]);

const SUPPORT_SEQUENCE: readonly LearningV2SupportV2[] = Object.freeze([
  "maximum",
  "high",
  "high",
  "medium",
  "medium",
  "medium",
  "medium",
  "low",
  "low",
  "low",
  "low",
  "minimal",
  "minimal",
  "minimal",
  "minimal",
  "none",
  "none",
]);

if (new Set(MODE_SEQUENCE).size !== LEARNING_V2_ACTIVE_MODE_FAMILIES_V2.length) {
  throw new Error("learning_v2_exact_packets_mode_sequence_incomplete");
}

const operationById = new Map(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2.map((operation) => [operation.id, operation]),
);

const sessionId = (lessonOrdinal: number, sessionOrdinal: number): `lesson-${string}:session:${string}` =>
  `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;

const unique = (values: readonly string[]): readonly string[] => Object.freeze([...new Set(values)]);

const introductionSessionByOperationId = new Map<string, string>();
for (const chapter of LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2) {
  const chapterFirstSessionOrdinal = ((chapter.chapterOrdinal - 1) * 8) + 1;
  for (const operationId of chapter.newOperationIds) {
    introductionSessionByOperationId.set(
      operationId,
      sessionId(chapter.lessonOrdinal, chapterFirstSessionOrdinal),
    );
  }
}

function canonicalExamples(operationIds: readonly string[]): readonly string[] {
  return unique(operationIds.flatMap((operationId) => operationById.get(operationId)?.positiveExamples ?? []))
    .slice(0, 4);
}

function phraseFrames(operationIds: readonly string[]): readonly string[] {
  return unique(operationIds.flatMap((operationId) => operationById.get(operationId)?.formBoundary ?? []))
    .slice(0, 4);
}

function sourceEvidenceRefs(operationIds: readonly string[], chapterRefs: readonly string[]): readonly string[] {
  return unique([
    ...chapterRefs,
    ...operationIds.flatMap((operationId) => operationById.get(operationId)?.sourceEvidenceRefs ?? []),
  ]);
}

function introPlan(operationIds: readonly string[]): readonly LearningV2EnglishIntroPlanItemV2[] {
  return Object.freeze([
    Object.freeze({
      slot: 1 as const,
      purpose: "concept" as const,
      operationIds,
      testedDimension: "meaning" as const,
      learnerCopyStatus: "REQUIRES_MANUAL_AUTHORING" as const,
    }),
    Object.freeze({
      slot: 2 as const,
      purpose: "formula" as const,
      operationIds,
      testedDimension: "form" as const,
      learnerCopyStatus: "REQUIRES_MANUAL_AUTHORING" as const,
    }),
    Object.freeze({
      slot: 3 as const,
      purpose: "trap" as const,
      operationIds,
      testedDimension: "diagnostic_error" as const,
      learnerCopyStatus: "REQUIRES_MANUAL_AUTHORING" as const,
    }),
  ]);
}

function activityPlan(
  operationIds: readonly string[],
  examples: readonly string[],
): readonly LearningV2EnglishActivityPlanItemV2[] {
  return Object.freeze(MODE_SEQUENCE.map((modeFamily, index) => Object.freeze({
    slot: index + 4,
    modeFamily,
    operationIds,
    canonicalExample: examples[index % examples.length] ?? "[MANUAL EXAMPLE REQUIRED]",
    support: SUPPORT_SEQUENCE[index],
    independentEvidence: index >= 15,
    learnerPayloadStatus: "REQUIRES_MANUAL_AUTHORING" as const,
  })));
}

function lexicalSenseIdsAt(
  absoluteSessionOrdinal: number,
  kind: "new" | "retrieval",
): readonly string[] {
  if (kind === "new") {
    return Object.freeze(
      LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2
        .filter((sense) => sense.introductionAbsoluteSessionOrdinal === absoluteSessionOrdinal)
        .map((sense) => sense.id),
    );
  }
  return unique(
    LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2
      .filter((edge) => edge.targetAbsoluteSessionOrdinal === absoluteSessionOrdinal)
      .map((edge) => edge.senseId),
  );
}

export const LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2: readonly LearningV2EnglishExactSessionPacketV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2.flatMap((chapter) =>
    SESSION_ROLES.map((defaultRole, sessionIndex) => {
      const sessionWithinChapter = (sessionIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      const sessionOrdinal = ((chapter.chapterOrdinal - 1) * 8) + sessionWithinChapter;
      const absoluteSessionOrdinal = ((chapter.lessonOrdinal - 1) * 56) + sessionOrdinal;
      const introducesGrammar = sessionWithinChapter === 1 && chapter.newOperationIds.length > 0;
      const role: LearningV2SessionRoleV2 =
        sessionWithinChapter === 1 && !introducesGrammar ? "guided_application" : defaultRole;
      const grammarOperationIds = introducesGrammar
        ? Object.freeze([...chapter.newOperationIds])
        : Object.freeze([]);
      const reviewOperationIds = introducesGrammar
        ? Object.freeze([])
        : unique([...chapter.reviewOperationIds, ...chapter.newOperationIds]);
      const focusOperationIds = grammarOperationIds.length > 0
        ? grammarOperationIds
        : reviewOperationIds;
      const examples = canonicalExamples(focusOperationIds);
      const newLexicalSenseIds = role === "checkpoint"
        ? Object.freeze([])
        : lexicalSenseIdsAt(absoluteSessionOrdinal, "new");
      const retrievalLexicalSenseIds = lexicalSenseIdsAt(absoluteSessionOrdinal, "retrieval");
      const prerequisiteSessionIds = unique(
        focusOperationIds.flatMap((operationId) =>
          (operationById.get(operationId)?.prerequisiteOperationIds ?? [])
            .map((prerequisiteId) => introductionSessionByOperationId.get(prerequisiteId))
            .filter((value): value is string => value !== undefined),
        ),
      );

      return Object.freeze({
        sessionId: sessionId(chapter.lessonOrdinal, sessionOrdinal),
        absoluteSessionOrdinal,
        lessonOrdinal: chapter.lessonOrdinal,
        chapterOrdinal: chapter.chapterOrdinal,
        sessionOrdinal,
        sessionWithinChapter,
        role,
        grammarOperationIds,
        reviewOperationIds,
        prerequisiteSessionIds,
        learningDeltaRu: LEARNING_DELTAS_RU[sessionIndex],
        phraseFrames: phraseFrames(focusOperationIds),
        forbiddenOperationIds: chapter.prohibitedOperationIds,
        newLexicalSenseIds,
        retrievalLexicalSenseIds,
        lexicalPlanRu: newLexicalSenseIds.length > 0
          ? "Новые senses вводятся только внутри канонических примеров текущей грамматики; затем планируются changed-context retrieval edges."
          : retrievalLexicalSenseIds.length > 0
            ? "Новых senses нет: знакомая лексика извлекается в изменённом контексте."
            : "Новых senses нет: используются только уже известные слова, необходимые для чистой проверки грамматики.",
        canonicalExamples: examples,
        introPlan: introPlan(focusOperationIds),
        activityPlan: activityPlan(focusOperationIds, examples),
        independentProbe: Object.freeze({
          changedContextRequired: true as const,
          copiedTrainingPromptForbidden: true as const,
          support: role === "checkpoint" ? "none" as const : "minimal" as const,
        }),
        sourceEvidenceRefs: sourceEvidenceRefs(focusOperationIds, chapter.sourceEvidenceRefs),
        learnerFacingAuthoringStatus: "PLANNED_NOT_AUTHORED" as const,
      });
    }),
  ),
);
