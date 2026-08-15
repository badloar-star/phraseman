import {
  buildLearningV2ObjectiveCoverageMatrixV1,
  LEARNING_V2_COVERAGE_ROLES_V1,
  type LearningV2CoveragePurposeV1,
  type LearningV2CoverageSessionInputV1,
} from "../modules/learning-v2/content/objective_coverage_matrix_v1";
import {
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "../modules/learning-v2/content/course_topology_v1";

/**
 * зачем: матрица покрытия существует, чтобы ловить «56 сессий одного и того же».
 * Поэтому тест проверяет не то, что она рисует таблицу, а то, что она КРАСНЕЕТ
 * на реальных дефектах учебного плана.
 */

const CHECKPOINTS = new Set<number>([
  ...LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
]);

const COMPONENTS = ["place-phrase", "preposition-at"] as const;

/** Здоровый план: вводит, тренирует, извлекает, переносит и проверяет. */
function healthySessions(): LearningV2CoverageSessionInputV1[] {
  return Array.from(
    { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
    (_, index) => {
      const sessionOrdinal = index + 1;
      const isCheckpoint = CHECKPOINTS.has(sessionOrdinal);
      const purposes: LearningV2CoveragePurposeV1[] = isCheckpoint
        ? ["independent_check", "retrieval_practice"]
        : sessionOrdinal % 4 === 0
          ? ["retrieval_practice", "near_transfer"]
          : sessionOrdinal % 3 === 0
            ? ["retrieval_practice"]
            : ["supported_practice", "guided_practice"];
      return {
        sessionOrdinal,
        objectiveComponentIds: [...COMPONENTS],
        purposes,
        families:
          sessionOrdinal % 2 === 0
            ? ["phrase_builder", "listen_choose"]
            : ["context_gap_grammar"],
        hasIntro: sessionOrdinal === 1,
      };
    },
  );
}

function build(sessions: LearningV2CoverageSessionInputV1[]) {
  return buildLearningV2ObjectiveCoverageMatrixV1({
    lessonOrdinal: 1,
    objectiveComponentIds: [...COMPONENTS],
    sessions,
  });
}

describe("Learning V2 objective coverage matrix", () => {
  test("a healthy plan reaches ready_for_human_review and never claims more", () => {
    const matrix = build(healthySessions());
    expect(matrix.blockerCount).toBe(0);
    expect(matrix.errorCount).toBe(0);
    expect(matrix.verdict).toBe("ready_for_human_review");

    // Машина не одобряет: максимум — «можно показать человеку».
    expect(matrix.coverageAuthority).toBe("measurement_only_not_approval");
    expect(matrix.masteryAuthority).toBe("none");
    expect(matrix.releaseAuthority).toBe(false);

    // Таблица заполнена по всем ролям на каждый компонент.
    expect(matrix.cells).toHaveLength(
      COMPONENTS.length * LEARNING_V2_COVERAGE_ROLES_V1.length,
    );
    expect(matrix.cells.every((cell) => cell.covered)).toBe(true);
  });

  test("a missing independent check is a blocker, not a warning", () => {
    const sessions = healthySessions().map((session) => ({
      ...session,
      purposes: session.purposes.filter(
        (purpose) => purpose !== "independent_check",
      ) as LearningV2CoveragePurposeV1[],
    }));
    const matrix = build(sessions);
    expect(matrix.verdict).toBe("blocked");
    expect(
      matrix.findings.some((f) => f.code === "coverage_gap_assessment"),
    ).toBe(true);
    expect(
      matrix.findings.some(
        (f) => f.code === "checkpoint_without_independent_check",
      ),
    ).toBe(true);
  });

  test("assessment before introduction is caught", () => {
    const sessions = healthySessions().map((session) =>
      session.sessionOrdinal === 1
        ? { ...session, hasIntro: false }
        : session.sessionOrdinal === 40
          ? { ...session, hasIntro: true }
          : session,
    );
    const matrix = build(sessions);
    const finding = matrix.findings.find(
      (f) => f.code === "assessment_before_introduction",
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("blocker");
    expect(matrix.verdict).toBe("blocked");
  });

  test("fake diversity surfaces even when every role is covered", () => {
    // Все роли покрыты, но задание всегда одно и то же.
    const sessions = healthySessions().map((session) => ({
      ...session,
      families: ["phrase_builder"],
    }));
    const matrix = build(sessions);

    // Формально покрытие полное...
    expect(matrix.cells.every((cell) => cell.covered)).toBe(true);
    expect(matrix.blockerCount).toBe(0);

    // ...но однообразие названо прямо, а не спрятано за «всё зелено».
    const fake = matrix.findings.filter(
      (f) => f.code === "fake_diversity_single_family",
    );
    expect(fake).toHaveLength(COMPONENTS.length);
    expect(fake[0]!.severity).toBe("warning");
  });

  test("a chapter without retrieval is reported per chapter", () => {
    const sessions = healthySessions().map((session) =>
      session.sessionOrdinal >= 9 && session.sessionOrdinal <= 16
        ? {
            ...session,
            purposes: session.purposes.filter(
              (purpose) =>
                purpose !== "retrieval_practice" &&
                purpose !== "interleaved_review",
            ) as LearningV2CoveragePurposeV1[],
          }
        : session,
    );
    const matrix = build(sessions);
    const chapterFindings = matrix.findings.filter(
      (f) => f.code === "chapter_without_retrieval",
    );
    expect(chapterFindings).toHaveLength(1);
    expect(chapterFindings[0]!.sessionOrdinal).toBe(9);
  });

  test("one blocker outranks any amount of green", () => {
    const sessions = healthySessions().map((session) =>
      session.sessionOrdinal === 56
        ? {
            ...session,
            purposes: ["supported_practice"] as LearningV2CoveragePurposeV1[],
          }
        : session,
    );
    const matrix = build(sessions);
    // Подавляющее большинство ячеек по-прежнему покрыто...
    expect(matrix.cells.filter((cell) => cell.covered).length).toBeGreaterThan(
      matrix.cells.length - 3,
    );
    // ...но экзамен без независимой проверки закрывает стадию.
    expect(matrix.blockerCount).toBeGreaterThan(0);
    expect(matrix.verdict).toBe("blocked");
  });

  test("rejects a plan that is not exactly 56 sessions", () => {
    expect(() => build(healthySessions().slice(0, 12))).toThrow();
  });

  test("rejects a session pointing at an unknown objective component", () => {
    const sessions = healthySessions();
    sessions[0] = {
      ...sessions[0]!,
      objectiveComponentIds: ["not-a-declared-component"],
    };
    expect(() => build(sessions)).toThrow();
  });

  test("same input yields the same fingerprint", () => {
    expect(build(healthySessions()).matrixFingerprint).toBe(
      build(healthySessions()).matrixFingerprint,
    );
  });
});
