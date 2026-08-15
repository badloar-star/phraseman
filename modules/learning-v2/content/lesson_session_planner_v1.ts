import { hashCanonicalBody } from "../policies/decision_registry";
import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "./course_topology_v1";
import type { LearningV2LessonPlanV1 } from "./course_plan_v1";
import type { LearningV2CoveragePurposeV1 } from "./objective_coverage_matrix_v1";

/**
 * Планировщик 56 сессий одного урока.
 *
 * зачем: между «урок про то, как представиться» и «56 готовых сессий» лежит
 * решение, КАК распределить материал во времени. Именно здесь курс становится
 * лучше или хуже Duolingo, и именно здесь легче всего смошенничать — насыпать
 * 56 одинаковых упражнений и назвать это уроком.
 *
 * Планировщик обязан соблюдать одновременно:
 *  - 7 глав по 8 сессий, проверки на 8/16/24/32/40/48, экзамен на 56;
 *  - introduce-before-use: компонент цели не проверяется раньше, чем введён;
 *  - R1 из ресёрча: у каждой сессии есть производство, а не только узнавание;
 *  - разнообразие семей заданий внутри компонента (против fake diversity);
 *  - интервальные возвраты к раннему материалу, а не «прошёл и забыл».
 *
 * Результат — план, который затем проверяется coverage matrix (S2) и панелью
 * качества (S5). Планировщик не доверяет сам себе: его выход обязан пройти
 * те же гейты, что и любой другой.
 */
export const LEARNING_V2_LESSON_SESSION_PLAN_SCHEMA_V1 =
  "learning-v2-lesson-session-plan.v1" as const;

export type LearningV2SessionRoleV1 =
  | "guided_learning"
  | "chapter_checkpoint"
  | "final_exam";

/**
 * Семь семей заданий. Разделены по тому, требуют ли они производства:
 * это прямое следствие R1 — набор из одних «узнавательных» семей не учит речи.
 */
export const LEARNING_V2_RECOGNITION_FAMILIES_V1 = Object.freeze([
  "listen_choose",
  "sound_contrast",
  "context_gap_grammar",
  "speed_match",
] as const);

export const LEARNING_V2_PRODUCTION_FAMILIES_V1 = Object.freeze([
  "phrase_builder",
  "listen_build_dictation",
  "scripted_repeat_compare",
] as const);

export type LearningV2FamilyV1 =
  | (typeof LEARNING_V2_RECOGNITION_FAMILIES_V1)[number]
  | (typeof LEARNING_V2_PRODUCTION_FAMILIES_V1)[number];

/**
 * Семь глав ведут от знакомства к самостоятельности. Названия описывают, что
 * происходит с учеником, а не техническую фазу.
 */
export const LEARNING_V2_CHAPTER_ARC_V1 = Object.freeze([
  { chapter: 1, focus: "Первое знакомство с формой", supportLevel: "model" },
  { chapter: 2, focus: "Уверенное узнавание", supportLevel: "full_text" },
  { chapter: 3, focus: "Первое самостоятельное составление", supportLevel: "partial_cue" },
  { chapter: 4, focus: "Применение без подсказки", supportLevel: "partial_cue" },
  { chapter: 5, focus: "Перенос в соседний контекст", supportLevel: "visual_only" },
  { chapter: 6, focus: "Скорость и автоматизм", supportLevel: "visual_only" },
  { chapter: 7, focus: "Свободное применение", supportLevel: "none" },
] as const);

export type LearningV2PlannedSessionV1 = Readonly<{
  sessionOrdinal: number;
  chapterOrdinal: number;
  positionInChapter: number;
  role: LearningV2SessionRoleV1;
  /** Что делает эта сессия — формулировка для модалки. */
  sessionOutcome: string;
  /** Компоненты цели урока, затронутые здесь. */
  objectiveComponentIds: readonly string[];
  purposes: readonly LearningV2CoveragePurposeV1[];
  families: readonly LearningV2FamilyV1[];
  /** Интро есть только там, где вводится что-то новое. */
  hasIntro: boolean;
  interactionProfile: "standard" | "rapid" | "voice_heavy";
}>;

export type LearningV2LessonSessionPlanV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_LESSON_SESSION_PLAN_SCHEMA_V1;
  lessonOrdinal: number;
  canDo: string;
  sessions: readonly LearningV2PlannedSessionV1[];
  sessionCount: number;
  planFingerprint: string;
}>;

function fail(): never {
  throw new Error("learning_v2_lesson_session_plan_invalid");
}

const CHECKPOINTS = new Set<number>(
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
);

/**
 * зачем: детерминированный выбор без Math.random. Одинаковый вход обязан давать
 * одинаковый план, иначе fingerprint бессмыслен, а перегенерация урока каждый
 * раз давала бы другой курс.
 */
function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length]!;
}

function roleFor(sessionOrdinal: number): LearningV2SessionRoleV1 {
  if (sessionOrdinal === LEARNING_V2_LESSON_SESSION_COUNT_V1) return "final_exam";
  if (CHECKPOINTS.has(sessionOrdinal)) return "chapter_checkpoint";
  return "guided_learning";
}

/**
 * Назначение сессии зависит от главы: ранние главы вводят и поддерживают,
 * поздние требуют извлечения и самостоятельности. Проверки главы и экзамен
 * всегда несут независимую проверку — этого требует coverage matrix.
 */
function purposesFor(
  chapter: number,
  role: LearningV2SessionRoleV1,
  positionInChapter: number,
): readonly LearningV2CoveragePurposeV1[] {
  if (role === "final_exam") {
    return ["independent_check", "near_transfer", "retrieval_practice"];
  }
  if (role === "chapter_checkpoint") {
    return ["independent_check", "retrieval_practice"];
  }
  if (chapter <= 2) {
    // Введение и поддержанная тренировка, но с возвратом к прошлому материалу.
    return positionInChapter % 4 === 0
      ? ["supported_practice", "retrieval_practice"]
      : ["supported_practice", "guided_practice"];
  }
  if (chapter <= 4) {
    return positionInChapter % 3 === 0
      ? ["guided_practice", "interleaved_review"]
      : ["guided_practice", "retrieval_practice"];
  }
  if (chapter <= 6) {
    return positionInChapter % 3 === 0
      ? ["retrieval_practice", "interleaved_review"]
      : ["retrieval_practice", "near_transfer"];
  }
  return ["near_transfer", "independent_check"];
}

/**
 * R1: в каждой сессии обязана быть хотя бы одна производящая семья. Плюс
 * разнообразие: узнавание тоже нужно, но не может быть единственным.
 */
function familiesFor(
  chapter: number,
  sessionOrdinal: number,
  role: LearningV2SessionRoleV1,
): readonly LearningV2FamilyV1[] {
  const production = pick(LEARNING_V2_PRODUCTION_FAMILIES_V1, sessionOrdinal);
  const recognition = pick(
    LEARNING_V2_RECOGNITION_FAMILIES_V1,
    sessionOrdinal + chapter,
  );
  if (role === "final_exam") {
    // Экзамен проверяет производство и понимание одновременно.
    return Object.freeze([
      "scripted_repeat_compare",
      "phrase_builder",
      "listen_build_dictation",
    ] as const);
  }
  if (chapter >= 6) {
    // Поздние главы смещены в сторону самостоятельного производства.
    const second = pick(
      LEARNING_V2_PRODUCTION_FAMILIES_V1,
      sessionOrdinal + 1,
    );
    return Object.freeze(
      second === production
        ? [production, recognition]
        : [production, second, recognition],
    );
  }
  return Object.freeze([production, recognition]);
}

/**
 * Компоненты цели распределяются так, чтобы каждый был введён рано и потом
 * возвращался. Ранние главы идут по одному компоненту, поздние смешивают —
 * это и есть interleaving из ресёрча.
 */
function componentsFor(
  components: readonly string[],
  chapter: number,
  sessionOrdinal: number,
): readonly string[] {
  if (chapter === 1) {
    // В первой главе вводим по очереди, чтобы не перегрузить.
    return [pick(components, sessionOrdinal - 1)];
  }
  if (chapter >= 5) {
    // Поздние главы держат все компоненты вместе: так проверяется связка.
    return components;
  }
  const first = pick(components, sessionOrdinal);
  const second = pick(components, sessionOrdinal + 1);
  return first === second ? [first] : [first, second];
}

export function planLearningV2LessonSessionsV1(
  lesson: LearningV2LessonPlanV1,
): LearningV2LessonSessionPlanV1 {
  if (
    typeof lesson !== "object" ||
    lesson === null ||
    !Number.isSafeInteger(lesson.lessonOrdinal) ||
    lesson.lessonOrdinal < 1 ||
    lesson.lessonOrdinal > 32 ||
    !Array.isArray(lesson.objectiveComponents) ||
    lesson.objectiveComponents.length === 0
  )
    fail();

  const components = lesson.objectiveComponents;
  const sessions: LearningV2PlannedSessionV1[] = [];

  for (
    let sessionOrdinal = 1;
    sessionOrdinal <= LEARNING_V2_LESSON_SESSION_COUNT_V1;
    sessionOrdinal += 1
  ) {
    const chapterOrdinal = Math.ceil(
      sessionOrdinal / LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
    );
    const positionInChapter =
      ((sessionOrdinal - 1) % LEARNING_V2_CHAPTER_SESSION_COUNT_V1) + 1;
    const role = roleFor(sessionOrdinal);
    const arc = LEARNING_V2_CHAPTER_ARC_V1[chapterOrdinal - 1]!;

    // зачем: интро вводит материал, и до первой проверки главы (сессия 8)
    // КАЖДЫЙ компонент цели обязан быть введён. Иначе проверка экзаменует то,
    // чего не показывали — coverage matrix ловит это как blocker
    // `assessment_before_introduction` (поймано на прогоне 2026-08-15).
    // Поэтому в первой главе интро идёт на каждой сессии, пока компоненты не
    // закончатся; дальше — по одному на главу, где начинается новый уровень.
    const introSessionsNeeded = Math.min(
      components.length,
      LEARNING_V2_CHAPTER_SESSION_COUNT_V1 - 1,
    );
    const hasIntro =
      role === "guided_learning" &&
      (chapterOrdinal === 1
        ? positionInChapter <= introSessionsNeeded
        : positionInChapter === 1);

    sessions.push(
      Object.freeze({
        sessionOrdinal,
        chapterOrdinal,
        positionInChapter,
        role,
        sessionOutcome:
          role === "final_exam"
            ? `Проверка урока: ${lesson.canDo.toLowerCase()} без подсказок`
            : role === "chapter_checkpoint"
              ? `Проверка главы ${chapterOrdinal}: ${arc.focus.toLowerCase()}`
              : `${arc.focus}: ${lesson.canDo.toLowerCase()}`,
        objectiveComponentIds: Object.freeze(
          componentsFor(components, chapterOrdinal, sessionOrdinal),
        ),
        purposes: purposesFor(chapterOrdinal, role, positionInChapter),
        families: familiesFor(chapterOrdinal, sessionOrdinal, role),
        hasIntro,
        // Голосовые сессии реже: они короче по числу взаимодействий.
        interactionProfile:
          role === "final_exam"
            ? "standard"
            : chapterOrdinal >= 6 && positionInChapter % 4 === 0
              ? "voice_heavy"
              : chapterOrdinal <= 2 && positionInChapter % 4 === 0
                ? "rapid"
                : "standard",
      }),
    );
  }

  if (sessions.length !== LEARNING_V2_LESSON_SESSION_COUNT_V1) fail();
  if (
    new Set(sessions.map((s) => s.chapterOrdinal)).size !==
    LEARNING_V2_LESSON_CHAPTER_COUNT_V1
  )
    fail();

  const body = {
    schemaVersion: LEARNING_V2_LESSON_SESSION_PLAN_SCHEMA_V1,
    lessonOrdinal: lesson.lessonOrdinal,
    canDo: lesson.canDo,
    sessions: Object.freeze(sessions),
    sessionCount: sessions.length,
  };

  return Object.freeze({
    ...body,
    planFingerprint: hashCanonicalBody(body),
  });
}
