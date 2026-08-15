import {
  evaluateLearningV2EvidenceRulesV1,
  LEARNING_V2_HIGH_FREQUENCY_BAND_V1,
  type LearningV2PhraseEvidenceInputV1,
} from "../modules/learning-v2/content/evidence_based_quality_rules_v1";

/**
 * зачем: «лучше Duolingo» должно быть проверяемым, а не лозунгом. Ресёрч
 * 2026-08-15 дал конкретные механизмы провала; здесь проверяется, что гейт
 * действительно их ловит, а не пропускает с зелёной галочкой.
 */

function phrase(
  over: Partial<LearningV2PhraseEvidenceInputV1> = {},
): LearningV2PhraseEvidenceInputV1 {
  return {
    phraseId: "p1",
    text: "Could you help me?",
    rarestWordFrequencyRank: 400,
    isFormulaicChunk: true,
    communicativeFunction: "попросить о помощи",
    contexts: ["магазин", "вокзал"],
    interactionModes: ["recognition", "production"],
    ...over,
  };
}

function many(
  count: number,
  over: (index: number) => Partial<LearningV2PhraseEvidenceInputV1> = () => ({}),
): LearningV2PhraseEvidenceInputV1[] {
  return Array.from({ length: count }, (_, index) =>
    phrase({ phraseId: `p${index + 1}`, ...over(index) }),
  );
}

describe("Learning V2 evidence-based quality rules", () => {
  test("a well-built phrase set is eligible for human review", () => {
    const report = evaluateLearningV2EvidenceRulesV1({ phrases: many(10) });
    expect(report.blockerCount).toBe(0);
    expect(report.errorCount).toBe(0);
    expect(report.productionCoveragePercent).toBe(100);
    expect(report.verdict).toBe("eligible_for_human_review");
  });

  test("R1: recognition-only practice is a blocker, not a note", () => {
    // Это главный механизм «прошёл дерево, говорить не могу».
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, (index) =>
        index === 0 ? { interactionModes: ["recognition"] } : {},
      ),
    });
    const finding = report.findings.find(
      (f) => f.ruleId === "R1_recognition_without_production",
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("blocker");
    expect(finding!.evidence).toContain("Swain");
    expect(report.verdict).toBe("blocked");
  });

  test("R1: a whole set built on recognition collapses production coverage", () => {
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, () => ({ interactionModes: ["recognition"] })),
    });
    expect(report.productionCoveragePercent).toBe(0);
    expect(report.blockerCount).toBe(10);
    expect(report.verdict).toBe("blocked");
  });

  test("R2: a course drilling rare vocabulary is called out", () => {
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, (index) =>
        index < 5
          ? { rarestWordFrequencyRank: LEARNING_V2_HIGH_FREQUENCY_BAND_V1 + 5000 }
          : {},
      ),
    });
    expect(report.highFrequencySharePercent).toBe(50);
    const finding = report.findings.find(
      (f) => f.ruleId === "R2_low_frequency_vocabulary",
    );
    expect(finding).toBeDefined();
    expect(finding!.evidence).toContain("Nation 2006");
    expect(report.verdict).toBe("needs_repair");
  });

  test("R4: a phrase that exists only to show grammar is an error", () => {
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, (index) =>
        index === 3 ? { communicativeFunction: "   " } : {},
      ),
    });
    const finding = report.findings.find(
      (f) => f.ruleId === "R4_no_communicative_function",
    );
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("error");
  });

  test("R5: single-context practice is flagged as non-transferable", () => {
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, (index) =>
        index === 2 ? { contexts: ["только магазин"] } : {},
      ),
    });
    const finding = report.findings.find((f) => f.ruleId === "R5_context_bound");
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe("warning");
    // Предупреждение не закрывает пакет само по себе.
    expect(report.verdict).toBe("eligible_for_human_review");
  });

  test("formulaic chunks are measured, since they transfer faster", () => {
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, (index) => ({ isFormulaicChunk: index < 7 })),
    });
    expect(report.formulaicSharePercent).toBe(70);
  });

  test("every finding carries its evidence so it can be argued on merit", () => {
    const report = evaluateLearningV2EvidenceRulesV1({
      phrases: many(10, (index) =>
        index === 0
          ? { interactionModes: ["recognition"], contexts: ["one"] }
          : {},
      ),
    });
    expect(report.findings.length).toBeGreaterThan(0);
    for (const finding of report.findings) {
      expect(finding.evidence.length).toBeGreaterThan(20);
    }
  });

  test("rejects malformed input instead of scoring it", () => {
    expect(() =>
      evaluateLearningV2EvidenceRulesV1({ phrases: [] }),
    ).toThrow();
    expect(() =>
      evaluateLearningV2EvidenceRulesV1({
        phrases: [phrase(), phrase()], // одинаковый phraseId
      }),
    ).toThrow();
  });

  test("same input yields the same fingerprint", () => {
    expect(
      evaluateLearningV2EvidenceRulesV1({ phrases: many(10) }).reportFingerprint,
    ).toBe(
      evaluateLearningV2EvidenceRulesV1({ phrases: many(10) }).reportFingerprint,
    );
  });
});
