import { hashCanonicalBody } from "../policies/decision_registry";
import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "./course_topology_v1";

/**
 * Coverage matrix `lesson objective component × session` — стадия S2.
 *
 * зачем: контракт (§5) требует, чтобы для каждого урока было ВИДНО, где цель
 * вводится, где тренируется, где извлекается по памяти, где переносится и где
 * проверяется независимо. Без этой таблицы «урок из 56 сессий» может состоять
 * из 56 одинаковых упражнений и выглядеть полным.
 *
 * Документ отдельно требует, чтобы пробелы и fake diversity становились
 * ОТДЕЛЬНЫМИ findings, а высокий средний балл их не заслонял. Поэтому здесь нет
 * общего score: есть список findings и явный вердикт. Класс дефекта, которого
 * мы избегаем, тот же, что в инциденте 2026-08-15 с правилами Firestore —
 * зелёная сводка поверх непроверенной пустоты.
 *
 * Модуль ничего не генерирует и не утверждает: он только измеряет уже
 * разложенный по сессиям авторский материал.
 */
export const LEARNING_V2_OBJECTIVE_COVERAGE_MATRIX_SCHEMA_V1 =
  "learning-v2-objective-coverage-matrix.v1" as const;

/** Пять ролей из контракта: понятие → тренировка → перенос → проверка. */
export const LEARNING_V2_COVERAGE_ROLES_V1 = Object.freeze([
  "introduction",
  "practice",
  "retrieval",
  "transfer",
  "assessment",
] as const);

export type LearningV2CoverageRoleV1 =
  (typeof LEARNING_V2_COVERAGE_ROLES_V1)[number];

/**
 * Роль выводится из назначения взаимодействия, а не назначается вручную:
 * иначе достаточно проставить нужные метки, чтобы «покрытие» стало полным.
 */
const ROLE_BY_PURPOSE = Object.freeze({
  supported_practice: "practice",
  guided_practice: "practice",
  retrieval_practice: "retrieval",
  interleaved_review: "retrieval",
  near_transfer: "transfer",
  independent_check: "assessment",
} as const);

export type LearningV2CoveragePurposeV1 = keyof typeof ROLE_BY_PURPOSE;

export type LearningV2CoverageSessionInputV1 = Readonly<{
  sessionOrdinal: number;
  /** Компоненты цели урока, затронутые этой сессией. */
  objectiveComponentIds: readonly string[];
  /** Назначения практических взаимодействий сессии. */
  purposes: readonly LearningV2CoveragePurposeV1[];
  /** Семейства заданий — нужны для проверки на fake diversity. */
  families: readonly string[];
  /** Интро вводит материал: даёт роль introduction. */
  hasIntro: boolean;
}>;

export type LearningV2CoverageFindingV1 = Readonly<{
  severity: "blocker" | "error" | "warning";
  code: string;
  objectiveComponentId: string | null;
  sessionOrdinal: number | null;
  message: string;
}>;

export type LearningV2CoverageCellV1 = Readonly<{
  objectiveComponentId: string;
  role: LearningV2CoverageRoleV1;
  sessionOrdinals: readonly number[];
  covered: boolean;
}>;

export type LearningV2ObjectiveCoverageMatrixV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_OBJECTIVE_COVERAGE_MATRIX_SCHEMA_V1;
  lessonOrdinal: number;
  objectiveComponentIds: readonly string[];
  cells: readonly LearningV2CoverageCellV1[];
  findings: readonly LearningV2CoverageFindingV1[];
  blockerCount: number;
  errorCount: number;
  warningCount: number;
  /**
   * Вердикт, а не балл. `ready_for_human_review` — максимум, который может
   * выдать машина; одобрение остаётся за владельцем.
   */
  verdict: "blocked" | "needs_repair" | "ready_for_human_review";
  coverageAuthority: "measurement_only_not_approval";
  masteryAuthority: "none";
  releaseAuthority: false;
  matrixFingerprint: string;
}>;

function fail(): never {
  throw new Error("learning_v2_objective_coverage_matrix_invalid");
}

/**
 * зачем: одна и та же семья заданий, повторённая во всех сессиях компонента,
 * создаёт видимость разнообразия. Порог мягкий: сигналим, когда компонент
 * покрыт тремя и более сессиями, но семья всего одна.
 */
const FAKE_DIVERSITY_MIN_SESSIONS = 3;

export function buildLearningV2ObjectiveCoverageMatrixV1(
  input: Readonly<{
    lessonOrdinal: number;
    objectiveComponentIds: readonly string[];
    sessions: readonly LearningV2CoverageSessionInputV1[];
  }>,
): LearningV2ObjectiveCoverageMatrixV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    !Number.isSafeInteger(input.lessonOrdinal) ||
    input.lessonOrdinal < 1 ||
    input.lessonOrdinal > 32 ||
    !Array.isArray(input.objectiveComponentIds) ||
    input.objectiveComponentIds.length === 0 ||
    !Array.isArray(input.sessions) ||
    input.sessions.length !== LEARNING_V2_LESSON_SESSION_COUNT_V1
  )
    fail();

  const componentIds = Object.freeze([...input.objectiveComponentIds]);
  if (new Set(componentIds).size !== componentIds.length) fail();

  const seenOrdinals = new Set<number>();
  for (const session of input.sessions) {
    if (
      !Number.isSafeInteger(session.sessionOrdinal) ||
      session.sessionOrdinal < 1 ||
      session.sessionOrdinal > LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
      seenOrdinals.has(session.sessionOrdinal) ||
      session.objectiveComponentIds.some(
        (id: string) => !componentIds.includes(id),
      )
    )
      fail();
    seenOrdinals.add(session.sessionOrdinal);
  }

  const findings: LearningV2CoverageFindingV1[] = [];
  const cells: LearningV2CoverageCellV1[] = [];

  for (const componentId of componentIds) {
    const touching = input.sessions.filter((session) =>
      session.objectiveComponentIds.includes(componentId),
    );

    const byRole = new Map<LearningV2CoverageRoleV1, number[]>(
      LEARNING_V2_COVERAGE_ROLES_V1.map((role) => [role, []]),
    );

    for (const session of touching) {
      if (session.hasIntro) {
        byRole.get("introduction")!.push(session.sessionOrdinal);
      }
      for (const purpose of session.purposes as readonly LearningV2CoveragePurposeV1[]) {
        const role: LearningV2CoverageRoleV1 | undefined =
          ROLE_BY_PURPOSE[purpose];
        if (!role) continue;
        const bucket = byRole.get(role)!;
        if (!bucket.includes(session.sessionOrdinal)) {
          bucket.push(session.sessionOrdinal);
        }
      }
    }

    for (const role of LEARNING_V2_COVERAGE_ROLES_V1) {
      const ordinals = Object.freeze([...byRole.get(role)!].sort((a, b) => a - b));
      const covered = ordinals.length > 0;
      cells.push(
        Object.freeze({
          objectiveComponentId: componentId,
          role,
          sessionOrdinals: ordinals,
          covered,
        }),
      );
      if (!covered) {
        // Отсутствие независимой проверки или введения — блокер: без них
        // «урок» не учит, а имитирует обучение.
        const blocking = role === "assessment" || role === "introduction";
        findings.push(
          Object.freeze({
            severity: blocking ? ("blocker" as const) : ("error" as const),
            code: `coverage_gap_${role}`,
            objectiveComponentId: componentId,
            sessionOrdinal: null,
            message: `Цель «${componentId}» не покрыта ролью «${role}».`,
          }),
        );
      }
    }

    // introduce-before-use: первое введение обязано идти раньше проверки.
    const firstIntro = byRole.get("introduction")![0];
    const firstAssessment = byRole.get("assessment")![0];
    if (
      firstIntro !== undefined &&
      firstAssessment !== undefined &&
      firstAssessment < firstIntro
    ) {
      findings.push(
        Object.freeze({
          severity: "blocker" as const,
          code: "assessment_before_introduction",
          objectiveComponentId: componentId,
          sessionOrdinal: firstAssessment,
          message: `Цель «${componentId}» проверяется в сессии ${firstAssessment} раньше, чем вводится в ${firstIntro}.`,
        }),
      );
    }

    // fake diversity: много сессий, но одно и то же задание.
    const families = new Set(touching.flatMap((session) => session.families));
    if (touching.length >= FAKE_DIVERSITY_MIN_SESSIONS && families.size <= 1) {
      findings.push(
        Object.freeze({
          severity: "warning" as const,
          code: "fake_diversity_single_family",
          objectiveComponentId: componentId,
          sessionOrdinal: null,
          message: `Цель «${componentId}» покрыта ${touching.length} сессиями, но всего одним типом задания — это видимость разнообразия.`,
        }),
      );
    }
  }

  // Проверки глав и экзамен обязаны нести независимую проверку.
  const assessmentOrdinals = new Set(
    input.sessions
      .filter((session) => session.purposes.includes("independent_check"))
      .map((session) => session.sessionOrdinal),
  );
  for (const checkpoint of [
    ...LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
    LEARNING_V2_LESSON_SESSION_COUNT_V1,
  ]) {
    if (!assessmentOrdinals.has(checkpoint)) {
      findings.push(
        Object.freeze({
          severity: "blocker" as const,
          code: "checkpoint_without_independent_check",
          objectiveComponentId: null,
          sessionOrdinal: checkpoint,
          message: `Сессия ${checkpoint} — проверка, но в ней нет независимой проверки без подсказки.`,
        }),
      );
    }
  }

  // Ни одна глава не должна остаться без извлечения по памяти.
  const chapterCount =
    LEARNING_V2_LESSON_SESSION_COUNT_V1 / LEARNING_V2_CHAPTER_SESSION_COUNT_V1;
  for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
    const from = (chapter - 1) * LEARNING_V2_CHAPTER_SESSION_COUNT_V1 + 1;
    const to = chapter * LEARNING_V2_CHAPTER_SESSION_COUNT_V1;
    const hasRetrieval = input.sessions.some(
      (session) =>
        session.sessionOrdinal >= from &&
        session.sessionOrdinal <= to &&
        (session.purposes as readonly LearningV2CoveragePurposeV1[]).some(
          (purpose) => ROLE_BY_PURPOSE[purpose] === "retrieval",
        ),
    );
    if (!hasRetrieval) {
      findings.push(
        Object.freeze({
          severity: "error" as const,
          code: "chapter_without_retrieval",
          objectiveComponentId: null,
          sessionOrdinal: from,
          message: `В главе ${chapter} (сессии ${from}–${to}) нет извлечения по памяти.`,
        }),
      );
    }
  }

  const blockerCount = findings.filter((f) => f.severity === "blocker").length;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  const body = {
    schemaVersion: LEARNING_V2_OBJECTIVE_COVERAGE_MATRIX_SCHEMA_V1,
    lessonOrdinal: input.lessonOrdinal,
    objectiveComponentIds: componentIds,
    cells: Object.freeze(cells),
    findings: Object.freeze(findings),
    blockerCount,
    errorCount,
    warningCount,
    // Один блокер закрывает стадию независимо от того, сколько всего зелёного.
    verdict:
      blockerCount > 0
        ? ("blocked" as const)
        : errorCount > 0
          ? ("needs_repair" as const)
          : ("ready_for_human_review" as const),
    coverageAuthority: "measurement_only_not_approval" as const,
    masteryAuthority: "none" as const,
    releaseAuthority: false as const,
  };

  return Object.freeze({
    ...body,
    matrixFingerprint: hashCanonicalBody(body),
  });
}
