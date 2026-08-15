import { hashCanonicalBody } from "../policies/decision_registry";

/**
 * Quality dashboard стадии S5 — свод по reference v3.
 *
 * зачем: контракт (§5) требует показывать минимум 15 измерений с confidence,
 * счётчики BLOCKER/ERROR/WARNING, покрытие доказательствами и точный список
 * объектов на перепроверку. Без этого «качество» сводится к одной цифре,
 * а одна цифра прячет блокеры.
 *
 * Здесь намеренно НЕТ общего балла как решения. Средний балл считается только
 * как справочная величина и явно помечен как несамостоятельный: вердикт
 * определяют блокеры и покрытие, а не среднее. Это тот же класс дефекта, что
 * инцидент 2026-08-15 с правилами Firestore — зелёная сводка поверх пустоты.
 *
 * Максимум, который может выдать машина, — `eligible_for_human_review`.
 * Одобрение остаётся за владельцем (контракт §5).
 */
export const LEARNING_V2_QUALITY_DASHBOARD_SCHEMA_V1 =
  "learning-v2-quality-dashboard.v1" as const;

/** Контракт: минимум 15 измерений reference в каждом отчёте. */
export const LEARNING_V2_QUALITY_MIN_DIMENSIONS_V1 = 15 as const;

/**
 * Каталог измерений reference v3. Идентификаторы совпадают с заголовками
 * документа, чтобы находку можно было проследить до первоисточника.
 */
export const LEARNING_V2_QUALITY_DIMENSION_CATALOG_V1 = Object.freeze({
  cefr: Object.freeze([
    "CEFR-Q1", "CEFR-Q2", "CEFR-Q3", "CEFR-Q4", "CEFR-Q5",
  ] as const),
  lesson: Object.freeze([
    "LESSON-Q1", "LESSON-Q2", "LESSON-Q3", "LESSON-Q4", "LESSON-Q5", "LESSON-Q6",
  ] as const),
  session: Object.freeze([
    "SESSION-Q1", "SESSION-Q2", "SESSION-Q3", "SESSION-Q4", "SESSION-Q5",
    "SESSION-Q6", "SESSION-Q7",
  ] as const),
  phrase: Object.freeze([
    "PHRASE-Q1", "PHRASE-Q2", "PHRASE-Q3", "PHRASE-Q4", "PHRASE-Q5",
    "PHRASE-Q6", "PHRASE-Q7",
  ] as const),
  theory: Object.freeze([
    "THEORY-Q1", "THEORY-Q2", "THEORY-Q3", "THEORY-Q4", "THEORY-Q5",
  ] as const),
  task: Object.freeze([
    "TASK-Q1", "TASK-Q2", "TASK-Q3", "TASK-Q4", "TASK-Q5", "TASK-Q6", "TASK-Q7",
  ] as const),
  audio: Object.freeze([
    "AUDIO-Q1", "AUDIO-Q2", "AUDIO-Q3", "AUDIO-Q4", "AUDIO-Q5",
  ] as const),
  memory: Object.freeze([
    "MEMORY-Q1", "MEMORY-Q2", "MEMORY-Q3", "MEMORY-Q4", "MEMORY-Q5",
  ] as const),
  assessment: Object.freeze([
    "ASSESS-Q1", "ASSESS-Q2", "ASSESS-Q3", "ASSESS-Q4", "ASSESS-Q5",
  ] as const),
  consistency: Object.freeze([
    "CONS-Q1", "CONS-Q2", "CONS-Q3", "CONS-Q4", "CONS-Q5", "CONS-Q6",
    "CONS-Q7", "CONS-Q8",
  ] as const),
});

export type LearningV2QualityGroupV1 =
  keyof typeof LEARNING_V2_QUALITY_DIMENSION_CATALOG_V1;

const ALL_DIMENSION_IDS: readonly string[] = Object.freeze(
  Object.values(LEARNING_V2_QUALITY_DIMENSION_CATALOG_V1).flatMap(
    (ids) => [...ids],
  ),
);

export type LearningV2QualitySeverityV1 = "blocker" | "error" | "warning";

export type LearningV2QualityFindingV1 = Readonly<{
  dimensionId: string;
  severity: LearningV2QualitySeverityV1;
  /** Точный объект, который придётся перепроверить после исправления. */
  objectRef: string;
  message: string;
}>;

export type LearningV2QualityDimensionInputV1 = Readonly<{
  dimensionId: string;
  /** 0..100. Справочная величина, вердикт по ней не выносится. */
  score: number;
  /** Насколько машина уверена в своей оценке этого измерения. */
  confidence: "low" | "medium" | "high";
  /**
   * Проверено ли измерение на реальных объектах. Измерение без доказательств
   * не считается проверенным, даже если у него высокий балл.
   */
  evidenceRefs: readonly string[];
  findings: readonly LearningV2QualityFindingV1[];
}>;

export type LearningV2QualityDimensionReportV1 = Readonly<{
  dimensionId: string;
  group: LearningV2QualityGroupV1;
  score: number;
  confidence: "low" | "medium" | "high";
  evidenceCount: number;
  hasEvidence: boolean;
  blockerCount: number;
  errorCount: number;
  warningCount: number;
}>;

export type LearningV2QualityDashboardV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_QUALITY_DASHBOARD_SCHEMA_V1;
  lessonOrdinal: number;
  dimensions: readonly LearningV2QualityDimensionReportV1[];
  dimensionCount: number;
  findings: readonly LearningV2QualityFindingV1[];
  blockerCount: number;
  errorCount: number;
  warningCount: number;
  /** Доля измерений, подтверждённых хотя бы одним объектом, 0..100. */
  evidenceCoveragePercent: number;
  /** Объекты, которые обязаны быть перепроверены после исправления. */
  objectsRequiringRecheck: readonly string[];
  /**
   * Справочно. НЕ является основанием для вердикта: одно измерение с блокером
   * закрывает пакет независимо от среднего.
   */
  averageScoreForReferenceOnly: number;
  averageScoreAuthority: "reference_only_never_a_verdict";
  verdict: "blocked" | "needs_repair" | "eligible_for_human_review";
  approvalAuthority: "owner_only_machine_cannot_approve";
  releaseAuthority: false;
  dashboardFingerprint: string;
}>;

function fail(): never {
  throw new Error("learning_v2_quality_dashboard_invalid");
}

function groupOf(dimensionId: string): LearningV2QualityGroupV1 {
  for (const [group, ids] of Object.entries(
    LEARNING_V2_QUALITY_DIMENSION_CATALOG_V1,
  )) {
    if ((ids as readonly string[]).includes(dimensionId)) {
      return group as LearningV2QualityGroupV1;
    }
  }
  fail();
}

export function buildLearningV2QualityDashboardV1(
  input: Readonly<{
    lessonOrdinal: number;
    dimensions: readonly LearningV2QualityDimensionInputV1[];
  }>,
): LearningV2QualityDashboardV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    !Number.isSafeInteger(input.lessonOrdinal) ||
    input.lessonOrdinal < 1 ||
    input.lessonOrdinal > 32 ||
    !Array.isArray(input.dimensions)
  )
    fail();

  // Контракт: меньше 15 измерений — это не отчёт о качестве.
  if (input.dimensions.length < LEARNING_V2_QUALITY_MIN_DIMENSIONS_V1) fail();

  const seen = new Set<string>();
  const dimensions: LearningV2QualityDimensionReportV1[] = [];
  const findings: LearningV2QualityFindingV1[] = [];
  const recheck = new Set<string>();

  for (const entry of input.dimensions) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !ALL_DIMENSION_IDS.includes(entry.dimensionId) ||
      seen.has(entry.dimensionId) ||
      !Number.isFinite(entry.score) ||
      entry.score < 0 ||
      entry.score > 100 ||
      !["low", "medium", "high"].includes(entry.confidence) ||
      !Array.isArray(entry.evidenceRefs) ||
      !Array.isArray(entry.findings)
    )
      fail();
    seen.add(entry.dimensionId);

    for (const finding of entry.findings) {
      if (
        typeof finding !== "object" ||
        finding === null ||
        finding.dimensionId !== entry.dimensionId ||
        !["blocker", "error", "warning"].includes(finding.severity) ||
        typeof finding.objectRef !== "string" ||
        finding.objectRef.length === 0 ||
        typeof finding.message !== "string" ||
        finding.message.length === 0
      )
        fail();
      findings.push(Object.freeze({ ...finding }));
      // Любая находка означает, что объект придётся смотреть заново.
      recheck.add(finding.objectRef);
    }

    const rows = entry.findings as readonly LearningV2QualityFindingV1[];
    const blockerCount = rows.filter((f) => f.severity === "blocker").length;
    const errorCount = rows.filter((f) => f.severity === "error").length;
    const warningCount = rows.filter((f) => f.severity === "warning").length;

    dimensions.push(
      Object.freeze({
        dimensionId: entry.dimensionId,
        group: groupOf(entry.dimensionId),
        score: entry.score,
        confidence: entry.confidence,
        evidenceCount: entry.evidenceRefs.length,
        hasEvidence: entry.evidenceRefs.length > 0,
        blockerCount,
        errorCount,
        warningCount,
      }),
    );
  }

  const blockerCount = findings.filter((f) => f.severity === "blocker").length;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;

  const withEvidence = dimensions.filter((d) => d.hasEvidence).length;
  const evidenceCoveragePercent = Math.round(
    (withEvidence / dimensions.length) * 100,
  );

  const averageScoreForReferenceOnly =
    Math.round(
      (dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length) * 10,
    ) / 10;

  // зачем: измерение с высоким баллом, но без доказательств и с низкой
  // уверенностью — это догадка. Отмечаем явно, иначе оно молча поднимает среднее.
  for (const dimension of dimensions) {
    if (!dimension.hasEvidence && dimension.score >= 80) {
      findings.push(
        Object.freeze({
          dimensionId: dimension.dimensionId,
          severity: "error" as const,
          objectRef: `dimension:${dimension.dimensionId}`,
          message: `Измерение ${dimension.dimensionId} имеет высокий балл, но не подтверждено ни одним объектом.`,
        }),
      );
      recheck.add(`dimension:${dimension.dimensionId}`);
    }
  }

  const recomputedErrorCount = findings.filter(
    (f) => f.severity === "error",
  ).length;

  const body = {
    schemaVersion: LEARNING_V2_QUALITY_DASHBOARD_SCHEMA_V1,
    lessonOrdinal: input.lessonOrdinal,
    dimensions: Object.freeze(dimensions),
    dimensionCount: dimensions.length,
    findings: Object.freeze(findings),
    blockerCount,
    errorCount: recomputedErrorCount,
    warningCount,
    evidenceCoveragePercent,
    objectsRequiringRecheck: Object.freeze([...recheck].sort()),
    averageScoreForReferenceOnly,
    averageScoreAuthority: "reference_only_never_a_verdict" as const,
    // Блокер закрывает пакет при любом среднем балле.
    verdict:
      blockerCount > 0
        ? ("blocked" as const)
        : recomputedErrorCount > 0
          ? ("needs_repair" as const)
          : ("eligible_for_human_review" as const),
    approvalAuthority: "owner_only_machine_cannot_approve" as const,
    releaseAuthority: false as const,
  };

  return Object.freeze({
    ...body,
    dashboardFingerprint: hashCanonicalBody(body),
  });
}
