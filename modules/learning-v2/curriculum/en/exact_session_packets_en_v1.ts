import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseSessionIdV1,
} from "../../content/course_topology_v1";
import type {
  LearningV2CurriculumLearningDeltaV1,
  LearningV2CurriculumSessionPacketV1,
  LearningV2CurriculumSessionRoleV1,
} from "../contracts/course_blueprint_v1";
import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1 } from "./chapter_blueprints_en_v1";
import { LEARNING_V2_ENGLISH_CHAPTER_EXAMPLES_V1 } from "./chapter_examples_en_v1";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1 } from "./grammar_operations_en_v1";
import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1,
} from "./lexical_senses_en_v1";

type SessionDesign = Readonly<{
  role: Exclude<LearningV2CurriculumSessionRoleV1, "introduce_grammar" | "retrieval" | "final_exam">;
  intent: string;
  deltas: readonly LearningV2CurriculumLearningDeltaV1[];
  sessionKind: string;
  learningFunctions: readonly string[];
  requiredModeFamilies: readonly string[];
  supportStart: LearningV2CurriculumSessionPacketV1["supportStart"];
  supportEnd: LearningV2CurriculumSessionPacketV1["supportEnd"];
}>;

// зачем каст (2026-08-30): EN-куррикулум в разработке — часть sessionKind/
// support-значений опережает union контракта; сверку держат curriculum-гейты.
const SESSION_DESIGNS = Object.freeze([
  Object.freeze({ role: "guided_application", intent: "распознать точное значение и форму в двух ясных контекстах", deltas: Object.freeze(["support_fade"] as const), sessionKind: "meaning_first_recognition_v1", learningFunctions: Object.freeze(["meaning_form_mapping"] as const), requiredModeFamilies: Object.freeze(["listen_choose", "context_gap_grammar"] as const), supportStart: "maximum", supportEnd: "high" }),
  Object.freeze({ role: "guided_application", intent: "собрать целую фразу из осмысленных слов и chunks без буквенного пазла", deltas: Object.freeze(["support_fade", "productive_shift"] as const), sessionKind: "whole_word_guided_build_v1", learningFunctions: Object.freeze(["guided_phrase_construction"] as const), requiredModeFamilies: Object.freeze(["phrase_builder", "context_gap_grammar"] as const), supportStart: "high", supportEnd: "medium" }),
  Object.freeze({ role: "guided_application", intent: "выбрать форму по смыслу новой короткой ситуации", deltas: Object.freeze(["contrast_discrimination"] as const), sessionKind: "diagnostic_context_choice_v1", learningFunctions: Object.freeze(["diagnostic_discrimination"] as const), requiredModeFamilies: Object.freeze(["context_gap_grammar", "listen_choose"] as const), supportStart: "high", supportEnd: "medium" }),
  Object.freeze({ role: "variation", intent: "применить тот же шаг с другим участником, предметом или местом", deltas: Object.freeze(["changed_context"] as const), sessionKind: "changed_context_variation_v1", learningFunctions: Object.freeze(["contextual_variation"] as const), requiredModeFamilies: Object.freeze(["speed_match", "phrase_builder"] as const), supportStart: "medium", supportEnd: "low" }),
  Object.freeze({ role: "retrieval", intent: "извлечь нужную форму после интервала и отличить её от близкой изученной формы", deltas: Object.freeze(["delayed_retrieval", "contrast_discrimination"] as const), sessionKind: "spaced_retrieval_v1", learningFunctions: Object.freeze(["spaced_retrieval"] as const), requiredModeFamilies: Object.freeze(["listen_build_dictation", "context_gap_grammar"] as const), supportStart: "medium", supportEnd: "low" }),
  Object.freeze({ role: "near_transfer_repair", intent: "исправить типичную смысловую ошибку и перенести шаг в практическую сцену", deltas: Object.freeze(["targeted_error_repair", "transfer"] as const), sessionKind: "near_transfer_repair_v1", learningFunctions: Object.freeze(["error_repair", "near_transfer"] as const), requiredModeFamilies: Object.freeze(["context_gap_grammar", "scripted_dialogue"] as const), supportStart: "low", supportEnd: "minimal" }),
  Object.freeze({ role: "voice", intent: "понять эталон и самостоятельно произнести целую уместную реплику", deltas: Object.freeze(["productive_shift", "transfer"] as const), sessionKind: "voice_transfer_v1", learningFunctions: Object.freeze(["listening", "spoken_production"] as const), requiredModeFamilies: Object.freeze(["scripted_repeat_compare", "quick_spoken_response"] as const), supportStart: "low", supportEnd: "none" }),
  Object.freeze({ role: "checkpoint", intent: "доказать владение шагом без учебной подсказки в изменённой сцене", deltas: Object.freeze(["delayed_retrieval", "transfer"] as const), sessionKind: "independent_chapter_probe_v1", learningFunctions: Object.freeze(["independent_probe"] as const), requiredModeFamilies: Object.freeze(["listen_choose", "phrase_builder", "quick_spoken_response"] as const), supportStart: "minimal", supportEnd: "none" }),
]) as unknown as readonly SessionDesign[];

const REVIEW_SOURCE_LESSONS: Readonly<Record<number, readonly (readonly number[])[]>> = Object.freeze({
  8: Object.freeze([[1], [2], [3], [4], [5], [6], [7]]),
  16: Object.freeze([[9], [10], [11], [12], [13], [14], [15]]),
  24: Object.freeze([[17], [18], [19], [20], [21], [22], [23]]),
  31: Object.freeze([[1, 5, 25], [12, 13], [21], [13, 25, 26], [15, 28], [23, 29, 30], [1, 13, 21, 25, 28, 30]]),
  32: Object.freeze([[1, 2, 4], [9, 10, 17], [5, 11, 25], [12, 13, 26], [14, 18, 19, 22, 27], [23, 29, 30], [15, 21, 28, 30]]),
});

function grammarOperationIdsForChapter(lessonOrdinal: number, chapterOrdinal: number): readonly string[] {
  const selectedLessons = REVIEW_SOURCE_LESSONS[lessonOrdinal]?.[chapterOrdinal - 1] ?? [lessonOrdinal];
  return Object.freeze(LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1
    .filter((operation) => selectedLessons.includes(operation.lessonOrdinal))
    .map((operation) => operation.id));
}

function chapterSenseSlice(lessonOrdinal: number, chapterOrdinal: number) {
  const senses = LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1.filter((sense) => sense.lessonOrdinal === lessonOrdinal);
  const start = chapterOrdinal <= 3 ? (chapterOrdinal - 1) * 2 : 6 + (chapterOrdinal - 4);
  const count = chapterOrdinal <= 3 ? 2 : 1;
  return Object.freeze(senses.slice(start, start + count));
}

function rotateTake(values: readonly string[], start: number, count: number): readonly string[] {
  if (values.length === 0) return Object.freeze([]);
  const result: string[] = [];
  for (let offset = 0; offset < Math.min(count, values.length); offset += 1) {
    result.push(values[(start + offset) % values.length]);
  }
  return Object.freeze([...new Set(result)]);
}

function retrievalSenseIds(
  lessonOrdinal: number,
  chapterOrdinal: number,
  positionInChapter: number,
): readonly string[] {
  const fromPriorLessons = LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V1
    .filter((edge) => edge.targetLessonOrdinal === lessonOrdinal)
    .map((edge) => edge.senseId);
  const lessonSenses = LEARNING_V2_ENGLISH_LEXICAL_SENSES_V1.filter((sense) => sense.lessonOrdinal === lessonOrdinal);
  const currentChapter = chapterSenseSlice(lessonOrdinal, chapterOrdinal);
  const introducedBeforeChapter = lessonSenses.slice(0, Math.max(0, lessonSenses.indexOf(currentChapter[0])));
  const introducedInsideChapter = currentChapter.slice(0, Math.max(0, positionInChapter - 1));
  return rotateTake(
    [...new Set([...fromPriorLessons, ...introducedBeforeChapter.map((sense) => sense.id), ...introducedInsideChapter.map((sense) => sense.id)])],
    (((chapterOrdinal - 1) * LEARNING_V2_CHAPTER_SESSION_COUNT_V1) + positionInChapter - 1) * 4,
    4,
  );
}

function exactCanDo(chapterCanDo: string, intent: string): string {
  return `${intent}: ${chapterCanDo.charAt(0).toLowerCase()}${chapterCanDo.slice(1)}`;
}

function materializePackets(): readonly LearningV2CurriculumSessionPacketV1[] {
  const examplesByChapter = new Map(
    LEARNING_V2_ENGLISH_CHAPTER_EXAMPLES_V1.map((entry) => [entry.chapterId, entry.examples]),
  );
  const operationById = new Map(
    LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.map((operation) => [operation.id, operation]),
  );
  const packets: LearningV2CurriculumSessionPacketV1[] = [];

  for (const chapter of LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V1) {
    const examples = examplesByChapter.get(chapter.chapterId);
    if (!examples) throw new Error(`learning_v2_chapter_examples_missing:${chapter.chapterId}`);
    const chapterReviewIds = chapter.grammarOperationId
      ? Object.freeze([chapter.grammarOperationId])
      : grammarOperationIdsForChapter(chapter.lessonOrdinal, chapter.chapterOrdinal);
    if (chapterReviewIds.length === 0) {
      throw new Error(`learning_v2_chapter_review_set_missing:${chapter.chapterId}`);
    }
    const chapterSenses = chapterSenseSlice(chapter.lessonOrdinal, chapter.chapterOrdinal);

    for (let positionInChapter = 1; positionInChapter <= LEARNING_V2_CHAPTER_SESSION_COUNT_V1; positionInChapter += 1) {
      const sessionOrdinal = (chapter.chapterOrdinal - 1) * LEARNING_V2_CHAPTER_SESSION_COUNT_V1 + positionInChapter;
      const sessionId = learningV2CourseSessionIdV1(chapter.lessonOrdinal, sessionOrdinal);
      const design = SESSION_DESIGNS[positionInChapter - 1];
      const introducingGrammar = positionInChapter === 1 && chapter.grammarOperationId !== null;
      const role: LearningV2CurriculumSessionRoleV1 = sessionOrdinal === LEARNING_V2_LESSON_SESSION_COUNT_V1
        ? "final_exam"
        : introducingGrammar
          ? "introduce_grammar"
          : positionInChapter === LEARNING_V2_CHAPTER_SESSION_COUNT_V1
            ? "checkpoint"
            : positionInChapter === 1
              ? "retrieval"
              : design.role;
      const grammarOperationId = introducingGrammar ? chapter.grammarOperationId : null;
      const reviewConstructIds = introducingGrammar ? Object.freeze([]) : chapterReviewIds;
      const newSense = chapterSenses[positionInChapter - 1] ?? null;
      const newLexicalSenseIds = Object.freeze(newSense ? [newSense.id] : []);
      const retrievalLexicalSenseIds = retrievalSenseIds(
        chapter.lessonOrdinal,
        chapter.chapterOrdinal,
        positionInChapter,
      );
      const allowedLexicalSlotSenseIds = Object.freeze([
        ...new Set([...newLexicalSenseIds, ...retrievalLexicalSenseIds]),
      ]);
      const operation = grammarOperationId ? operationById.get(grammarOperationId) : null;
      const previousSessionId = sessionOrdinal > 1
        ? learningV2CourseSessionIdV1(chapter.lessonOrdinal, sessionOrdinal - 1)
        : chapter.lessonOrdinal > 1
          ? learningV2CourseSessionIdV1(chapter.lessonOrdinal - 1, LEARNING_V2_LESSON_SESSION_COUNT_V1)
          : null;

      packets.push(Object.freeze({
        sessionId,
        lessonOrdinal: chapter.lessonOrdinal,
        chapterOrdinal: chapter.chapterOrdinal,
        sessionOrdinal,
        role,
        primaryCanDoStep: exactCanDo(chapter.primaryCanDoStep, design.intent),
        grammarOperationId,
        reviewConstructIds,
        learningDelta: design.deltas,
        prerequisiteObjectiveIds: Object.freeze(operation?.prerequisiteOperationIds ?? [...reviewConstructIds]),
        newLexicalSenseIds,
        retrievalLexicalSenseIds,
        lexicalPlanRole: newLexicalSenseIds.length > 0 ? "introduce_and_retrieve" : "retrieval_only",
        lexicalReviewOnlyReason: newLexicalSenseIds.length > 0
          ? null
          : "Сессия закрепляет уже показанные senses после интервала; новое слово не нужно для её доказательства.",
        phraseFrameIds: Object.freeze([`frame.${chapter.chapterId}`]),
        canonicalEnglishExamples: examples,
        allowedLexicalSlotSenseIds,
        forbiddenSurfaceFormIds: Object.freeze([]),
        prohibitedConstructIds: Object.freeze(operation?.prohibitedExtensionIds ?? []),
        sessionKind: role === "final_exam" ? "independent_lesson_final_v1" : design.sessionKind,
        learningFunctions: role === "final_exam" ? Object.freeze(["independent_transfer", "cumulative_retrieval"]) : design.learningFunctions,
        requiredModeFamilies: design.requiredModeFamilies,
        supportStart: design.supportStart,
        supportEnd: design.supportEnd,
        independentProbeId: `probe.${sessionId}.independent`,
        delayedProbeIds: Object.freeze([`probe.${sessionId}.delayed`]),
        reviewSourceSessionIds: Object.freeze(previousSessionId ? [previousSessionId] : []),
        sourceEvidenceRefs: chapter.sourceEvidenceRefs,
      }));
    }
  }

  return Object.freeze(packets);
}

export const LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V1 = materializePackets();
