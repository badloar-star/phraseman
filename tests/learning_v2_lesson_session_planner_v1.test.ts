import { planLearningV2LessonSessionsV1 } from "../modules/learning-v2/content/lesson_session_planner_v1";
import {
  LEARNING_V2_COURSE_PLAN_V1,
  type LearningV2LessonPlanV1,
} from "../modules/learning-v2/content/course_plan_v1";
import { buildLearningV2ObjectiveCoverageMatrixV1 } from "../modules/learning-v2/content/objective_coverage_matrix_v1";
import {
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "../modules/learning-v2/content/course_topology_v1";
import { LEARNING_V2_PRODUCTION_FAMILIES_V1 } from "../modules/learning-v2/content/lesson_session_planner_v1";

/**
 * зачем: планировщик легко может «построиться» и при этом выдать курс, который
 * ничему не учит. Поэтому главная проверка здесь — не структура, а то, что его
 * выход ПРОХОДИТ независимый гейт coverage matrix. Планировщик не верит сам
 * себе; его судит другой модуль.
 */

const PRODUCTION = new Set<string>(LEARNING_V2_PRODUCTION_FAMILIES_V1);

function planFor(lesson: LearningV2LessonPlanV1) {
  return planLearningV2LessonSessionsV1(lesson);
}

describe("Learning V2 lesson session planner", () => {
  test("expands a lesson into exactly 56 sessions, 7 chapters of 8", () => {
    const plan = planFor(LEARNING_V2_COURSE_PLAN_V1[0]!);
    expect(plan.sessionCount).toBe(LEARNING_V2_LESSON_SESSION_COUNT_V1);

    for (let chapter = 1; chapter <= 7; chapter += 1) {
      const inChapter = plan.sessions.filter(
        (session) => session.chapterOrdinal === chapter,
      );
      expect(inChapter).toHaveLength(8);
      expect(inChapter.map((s) => s.positionInChapter)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);
    }
  });

  test("checkpoints and the final exam land exactly where the topology says", () => {
    const plan = planFor(LEARNING_V2_COURSE_PLAN_V1[0]!);
    for (const ordinal of LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1) {
      expect(plan.sessions[ordinal - 1]!.role).toBe("chapter_checkpoint");
    }
    expect(plan.sessions[55]!.role).toBe("final_exam");
    expect(plan.sessions[55]!.sessionOrdinal).toBe(56);
  });

  test("R1 holds: every single session contains a production family", () => {
    // Это ядро «лучше Duolingo». Сессия без производства учит узнаванию.
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      const plan = planFor(lesson);
      for (const session of plan.sessions) {
        const hasProduction = session.families.some((family) =>
          PRODUCTION.has(family),
        );
        expect(hasProduction).toBe(true);
      }
    }
  });

  test("checkpoints and the exam always carry an independent check", () => {
    const plan = planFor(LEARNING_V2_COURSE_PLAN_V1[0]!);
    const gated = [
      ...LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
      LEARNING_V2_LESSON_SESSION_COUNT_V1,
    ];
    for (const ordinal of gated) {
      expect(plan.sessions[ordinal - 1]!.purposes).toContain(
        "independent_check",
      );
    }
  });

  test("EVERY lesson of the course passes the independent coverage gate", () => {
    // Самая важная проверка файла: судит не планировщик, а другой модуль.
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      const plan = planFor(lesson);
      const matrix = buildLearningV2ObjectiveCoverageMatrixV1({
        lessonOrdinal: lesson.lessonOrdinal,
        objectiveComponentIds: lesson.objectiveComponents,
        sessions: plan.sessions.map((session) => ({
          sessionOrdinal: session.sessionOrdinal,
          objectiveComponentIds: session.objectiveComponentIds,
          purposes: session.purposes,
          families: session.families,
          hasIntro: session.hasIntro,
        })),
      });

      expect(matrix.blockerCount).toBe(0);
      expect(matrix.errorCount).toBe(0);
      // Ни одна цель не осталась без введения, тренировки, извлечения,
      // переноса и независимой проверки.
      expect(matrix.cells.every((cell) => cell.covered)).toBe(true);
      expect(matrix.verdict).toBe("ready_for_human_review");
    }
  });

  test("no fake diversity: components meet more than one task family", () => {
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      const plan = planFor(lesson);
      const matrix = buildLearningV2ObjectiveCoverageMatrixV1({
        lessonOrdinal: lesson.lessonOrdinal,
        objectiveComponentIds: lesson.objectiveComponents,
        sessions: plan.sessions.map((session) => ({
          sessionOrdinal: session.sessionOrdinal,
          objectiveComponentIds: session.objectiveComponentIds,
          purposes: session.purposes,
          families: session.families,
          hasIntro: session.hasIntro,
        })),
      });
      expect(
        matrix.findings.filter(
          (f) => f.code === "fake_diversity_single_family",
        ),
      ).toHaveLength(0);
    }
  });

  test("intro appears where new material starts, not on measuring sessions", () => {
    const plan = planFor(LEARNING_V2_COURSE_PLAN_V1[0]!);
    for (const session of plan.sessions) {
      if (session.role !== "guided_learning") {
        expect(session.hasIntro).toBe(false);
      }
    }
    // Первая сессия урока обязательно вводит.
    expect(plan.sessions[0]!.hasIntro).toBe(true);
  });

  test("support fades across chapters instead of staying constant", () => {
    const plan = planFor(LEARNING_V2_COURSE_PLAN_V1[0]!);
    const early = plan.sessions.filter((s) => s.chapterOrdinal <= 2);
    const late = plan.sessions.filter((s) => s.chapterOrdinal >= 6);

    const supportedEarly = early.filter((s) =>
      s.purposes.includes("supported_practice"),
    ).length;
    const independentLate = late.filter(
      (s) =>
        s.purposes.includes("independent_check") ||
        s.purposes.includes("near_transfer"),
    ).length;

    expect(supportedEarly).toBeGreaterThan(0);
    expect(independentLate).toBeGreaterThan(0);
    // Поддержка не тянется до конца урока.
    expect(
      late.filter((s) => s.purposes.includes("supported_practice")),
    ).toHaveLength(0);
  });

  test("planning is deterministic — the same lesson yields the same plan", () => {
    const lesson = LEARNING_V2_COURSE_PLAN_V1[4]!;
    expect(planFor(lesson).planFingerprint).toBe(planFor(lesson).planFingerprint);
  });

  test("different lessons produce different plans", () => {
    expect(planFor(LEARNING_V2_COURSE_PLAN_V1[0]!).planFingerprint).not.toBe(
      planFor(LEARNING_V2_COURSE_PLAN_V1[1]!).planFingerprint,
    );
  });
});
