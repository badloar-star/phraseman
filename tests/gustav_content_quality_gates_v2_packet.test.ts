import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(
  ROOT,
  'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/content_quality_gates_v2_packet.json',
);
const GATES_PATH = path.join(
  ROOT,
  'docs/gustav/runs/2026-05-19_fr_inventory_v0a1/research/fr_content_quality_gates_v2.json',
);
const SCRIPT_PATH = path.join(ROOT, 'scripts/gustav_content_quality_gates_v2_packet.ts');

const REQUIRED_GATE_IDS = [
  'language_field_isolation_gate',
  'research_evidence_gate',
  'pedagogy_blueprint_gate',
  'generation_schema_v2_gate',
  'anti_calque_gate',
  'grammar_cluster_gate',
  'naturalness_register_gate',
  'source_meaning_parity_gate',
  'quiz_one_correct_answer_gate',
  'false_friend_gate',
  'ai_wrong_language_gate',
  'ai_cache_language_key_gate',
  'reviewer_decision_gate',
];

describe('Gustav Content Quality Gates V2 packet', () => {
  it('keeps all French rows and AI outputs quality-gated without opening generation or apply', () => {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const gates = JSON.parse(fs.readFileSync(GATES_PATH, 'utf8'));
    const source = fs.readFileSync(SCRIPT_PATH, 'utf8');
    const expectedRows = report.summary.rowQualityGateRequirements;
    const expectedAi = report.summary.aiQualityGateRequirements;

    expect(report.status).toBe('PASS');
    expect(report.summary.targetLocale).toBe('fr');
    expect(report.summary.generationSchemaV2Ready).toBe(true);
    expect(report.summary.aiPromptContractV2Ready).toBe(true);
    expect(expectedRows).toBe(1600);
    expect(expectedAi).toBeGreaterThanOrEqual(164);
    expect(report.summary.rowsWithRequiredGateSet).toBe(expectedRows);
    expect(report.summary.rowsWithLanguageIsolationGate).toBe(expectedRows);
    expect(report.summary.rowsWithResearchEvidenceGate).toBe(expectedRows);
    expect(report.summary.rowsWithPedagogyBlueprintGate).toBe(expectedRows);
    expect(report.summary.rowsWithGenerationSchemaGate).toBe(expectedRows);
    expect(report.summary.rowsWithAntiCalqueGate).toBe(expectedRows);
    expect(report.summary.rowsWithGrammarGate).toBe(expectedRows);
    expect(report.summary.rowsWithNaturalnessGate).toBe(expectedRows);
    expect(report.summary.rowsWithSourceMeaningParityGate).toBe(expectedRows);
    expect(report.summary.rowsWithQuizGate).toBe(expectedRows);
    expect(report.summary.rowsTargetOutputBlocked).toBe(expectedRows);
    expect(report.summary.rowsActivationBlocked).toBe(expectedRows);
    expect(report.summary.aiWithWrongLanguageGate).toBe(expectedAi);
    expect(report.summary.aiWithCacheLanguageKeyGate).toBe(expectedAi);
    expect(report.summary.aiRejectBeforeReturn).toBe(expectedAi);
    expect(report.summary.aiRejectBeforeCache).toBe(expectedAi);
    expect(report.summary.aiTargetOutputBlocked).toBe(expectedAi);
    expect(report.summary.aiActivationBlocked).toBe(expectedAi);
    expect(report.summary.fixtureProbesPassed).toBe(report.summary.fixtureProbes);
    expect(report.summary.readyForReviewerWorkflowV2).toBe(true);
    expect(report.summary.readyForGenerationV2).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.mayModifyProductionAppFiles).toBe(false);

    expect(gates.rowQualityGateRequirements).toHaveLength(expectedRows);
    expect(gates.aiQualityGateRequirements).toHaveLength(expectedAi);
    expect(report.gateIds).toEqual(expect.arrayContaining(REQUIRED_GATE_IDS));
    for (const gateId of REQUIRED_GATE_IDS) {
      expect(gates.qualityGateCatalog.some((gate: any) => gate.gateId === gateId)).toBe(true);
    }

    expect(source).toContain('ai_wrong_language_gate_missing');
    expect(source).toContain('ai_cache_language_key_gate_missing');
    expect(source).toContain('ai_rejected_output_cache_open');
    expect(source).toContain('quality_activation_policy_opened_generation_or_apply');
  });
});
