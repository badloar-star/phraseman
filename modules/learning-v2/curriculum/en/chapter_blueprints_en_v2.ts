import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2 } from "./lesson_blueprints_en_v2";

export type LearningV2EnglishChapterBlueprintV2 = Readonly<{
  chapterId: `lesson-${string}:chapter:${string}`;
  lessonOrdinal: number;
  chapterOrdinal: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  majorSystemId: string;
  titleRu: string;
  primaryCanDoStepRu: string;
  newOperationIds: readonly string[];
  reviewOperationIds: readonly string[];
  prohibitedOperationIds: readonly string[];
  transferContextRu: string;
  independentEvidenceRu: string;
  sourceEvidenceRefs: readonly string[];
}>;

const CHAPTER_ROLES = Object.freeze([
  Object.freeze({
    title: "Базовая форма и смысл",
    canDo: "узнать базовую форму и связать её с точным коммуникативным смыслом",
    transfer: "одна новая бытовая ситуация с полной опорой на модель",
    evidence: "точный выбор смысла и первая управляемая сборка формы",
  }),
  Object.freeze({
    title: "Структурное различие",
    canDo: "выбрать форму по подлежащему, числу или другой ключевой структурной подсказке",
    transfer: "знакомая ситуация с изменённым участником или значением слота",
    evidence: "правильная форма после смены одной структурной переменной",
  }),
  Object.freeze({
    title: "Следующая обязательная форма",
    canDo: "построить следующий prerequisite-safe вариант системы без скрытой грамматики",
    transfer: "короткий обмен, где новая форма нужна для достижения той же цели",
    evidence: "самостоятельная сборка целой фразы с новой операцией",
  }),
  Object.freeze({
    title: "Точное чередование",
    canDo: "отличить новую операцию от уже знакомой близкой формы по смыслу контекста",
    transfer: "два похожих контекста, требующих разных уже объяснённых решений",
    evidence: "диагностический выбор с объяснимой причиной и меньшей поддержкой",
  }),
  Object.freeze({
    title: "Применение без готовой модели",
    canDo: "извлечь нужную форму по смысловой подсказке без показа полного ответа",
    transfer: "реалистичная задача с новыми значениями знакомых лексических слотов",
    evidence: "lower-support извлечение и исправление конкретной ошибки",
  }),
  Object.freeze({
    title: "Разговорное применение",
    canDo: "понять систему на слух и применить её в коротком разговорном ходе",
    transfer: "изменённая разговорная ситуация с выбором, уточнением или repair",
    evidence: "аудиопонимание и отдельный spoken response по знакомой грамматике",
  }),
  Object.freeze({
    title: "Перенос и интеграция",
    canDo: "соединить операции текущего урока и перенести их в незнакомую ситуацию",
    transfer: "новая самостоятельная ситуация без копирования тренировочного prompt",
    evidence: "changed-context independent probe с минимальной критической подсказкой",
  }),
] as const);

export const LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2: readonly LearningV2EnglishChapterBlueprintV2[] = Object.freeze(
  LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2.flatMap((lesson) => {
    const ownedOperationIds = lesson.ownedGrammarOperationIds;
    return CHAPTER_ROLES.map((role, chapterIndex) => {
      const chapterOrdinal = (chapterIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const newOperationIds = Object.freeze(
        chapterIndex < ownedOperationIds.length ? [ownedOperationIds[chapterIndex]] : [],
      );
      const currentLessonReviewIds = ownedOperationIds.slice(0, chapterIndex);
      const reviewOperationIds = Object.freeze([
        ...new Set([...lesson.deliberateReviewOperationIds, ...currentLessonReviewIds]),
      ]);
      const prohibitedOperationIds = Object.freeze(
        LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2
          .filter((operation) => {
            if (operation.lessonOrdinal > lesson.lessonOrdinal) return true;
            if (operation.lessonOrdinal < lesson.lessonOrdinal) return false;
            return ownedOperationIds.indexOf(operation.id) > chapterIndex;
          })
          .map((operation) => operation.id),
      );

      return Object.freeze({
        chapterId: `${lesson.lessonId}:chapter:${String(chapterOrdinal).padStart(2, "0")}` as `lesson-${string}:chapter:${string}`,
        lessonOrdinal: lesson.lessonOrdinal,
        chapterOrdinal,
        majorSystemId: lesson.majorSystemId,
        titleRu: `${role.title}: ${lesson.titleRu}`,
        primaryCanDoStepRu: `Ученик может ${role.canDo}, чтобы постепенно выполнить итог: ${lesson.terminalCanDoRu}`,
        newOperationIds,
        reviewOperationIds,
        prohibitedOperationIds,
        transferContextRu: `${role.transfer}; контекст обязан оставаться внутри системы «${lesson.titleRu}».`,
        independentEvidenceRu: `${role.evidence}; правильность не выводится из подсказки, позиции или повторённого training prompt.`,
        sourceEvidenceRefs: lesson.sourceEvidenceRefs,
      });
    });
  }),
);
