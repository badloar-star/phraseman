import {
  buildLearningV2QualityDashboardV1,
  LEARNING_V2_QUALITY_DIMENSION_CATALOG_V1,
  LEARNING_V2_QUALITY_MIN_DIMENSIONS_V1,
  type LearningV2QualityDimensionInputV1,
} from "../modules/learning-v2/content/quality_dashboard_v1";

/**
 * зачем: dashboard нужен не чтобы показать «92%», а чтобы блокер нельзя было
 * спрятать за высоким средним. Поэтому тест бьёт именно в это.
 */

const ALL_IDS = Object.values(LEARNING_V2_QUALITY_DIMENSION_CATALOG_V1).flatMap(
  (ids) => [...ids],
);

function dimension(
  dimensionId: string,
  over: Partial<LearningV2QualityDimensionInputV1> = {},
): LearningV2QualityDimensionInputV1 {
  return {
    dimensionId,
    score: 90,
    confidence: "high",
    evidenceRefs: [`session:${dimensionId}`],
    findings: [],
    ...over,
  };
}

/** Двадцать измерений — выше контрактного минимума в 15. */
function healthy(): LearningV2QualityDimensionInputV1[] {
  return ALL_IDS.slice(0, 20).map((id) => dimension(id));
}

function build(dimensions: LearningV2QualityDimensionInputV1[]) {
  return buildLearningV2QualityDashboardV1({ lessonOrdinal: 1, dimensions });
}

describe("Learning V2 quality dashboard", () => {
  test("reports at least 15 dimensions with confidence and evidence coverage", () => {
    const dash = build(healthy());
    expect(dash.dimensionCount).toBeGreaterThanOrEqual(
      LEARNING_V2_QUALITY_MIN_DIMENSIONS_V1,
    );
    expect(dash.evidenceCoveragePercent).toBe(100);
    expect(dash.dimensions.every((d) => d.confidence === "high")).toBe(true);
    // Каждое измерение отнесено к своей группе reference.
    expect(new Set(dash.dimensions.map((d) => d.group)).size).toBeGreaterThan(1);
  });

  test("a report with fewer than 15 dimensions is refused outright", () => {
    expect(() => build(ALL_IDS.slice(0, 14).map((id) => dimension(id)))).toThrow();
  });

  test("the machine never approves — best verdict is eligible_for_human_review", () => {
    const dash = build(healthy());
    expect(dash.verdict).toBe("eligible_for_human_review");
    expect(dash.approvalAuthority).toBe("owner_only_machine_cannot_approve");
    expect(dash.releaseAuthority).toBe(false);
  });

  test("one blocker outranks a near-perfect average", () => {
    const dimensions = healthy();
    dimensions[0] = dimension(ALL_IDS[0]!, {
      score: 99,
      findings: [
        {
          dimensionId: ALL_IDS[0]!,
          severity: "blocker",
          objectRef: "session:qa-neutral-lesson:session:56",
          message: "Экзамен переиспользует тренировочный ответ.",
        },
      ],
    });
    const dash = build(dimensions);

    // Средний балл остаётся высоким...
    expect(dash.averageScoreForReferenceOnly).toBeGreaterThan(85);
    expect(dash.averageScoreAuthority).toBe("reference_only_never_a_verdict");
    // ...и всё равно пакет закрыт.
    expect(dash.blockerCount).toBe(1);
    expect(dash.verdict).toBe("blocked");
  });

  test("a high score without evidence is called out, not counted as proven", () => {
    const dimensions = healthy();
    dimensions[3] = dimension(ALL_IDS[3]!, { score: 95, evidenceRefs: [] });
    const dash = build(dimensions);

    expect(dash.evidenceCoveragePercent).toBeLessThan(100);
    const finding = dash.findings.find(
      (f) => f.objectRef === `dimension:${ALL_IDS[3]}`,
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("error");
    expect(dash.verdict).toBe("needs_repair");
  });

  test("every finding puts its object on the recheck list", () => {
    const dimensions = healthy();
    dimensions[1] = dimension(ALL_IDS[1]!, {
      findings: [
        {
          dimensionId: ALL_IDS[1]!,
          severity: "warning",
          objectRef: "phrase:qa-neutral-7",
          message: "Фраза почти дублирует соседнюю.",
        },
      ],
    });
    const dash = build(dimensions);
    expect(dash.objectsRequiringRecheck).toContain("phrase:qa-neutral-7");
    expect(dash.warningCount).toBe(1);
    // Предупреждение само по себе не закрывает стадию.
    expect(dash.verdict).toBe("eligible_for_human_review");
  });

  test("rejects an unknown dimension id and a duplicated one", () => {
    const unknown = healthy();
    unknown[0] = dimension("NOT-A-REFERENCE-DIMENSION");
    expect(() => build(unknown)).toThrow();

    const duplicated = healthy();
    duplicated[1] = dimension(ALL_IDS[0]!);
    expect(() => build(duplicated)).toThrow();
  });

  test("rejects a finding whose dimensionId does not match its row", () => {
    const dimensions = healthy();
    dimensions[2] = dimension(ALL_IDS[2]!, {
      findings: [
        {
          dimensionId: ALL_IDS[9]!,
          severity: "error",
          objectRef: "task:1",
          message: "Подложено под чужое измерение.",
        },
      ],
    });
    expect(() => build(dimensions)).toThrow();
  });

  test("same input yields the same fingerprint", () => {
    expect(build(healthy()).dashboardFingerprint).toBe(
      build(healthy()).dashboardFingerprint,
    );
  });
});
