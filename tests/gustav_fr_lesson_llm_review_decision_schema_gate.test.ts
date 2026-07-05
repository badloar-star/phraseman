import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_validate_fr_lesson_llm_review_decisions.mjs');

const REQUIRED_PROBES = [
  'valid_accept_all_gates_passes',
  'wrong_study_target_rejected',
  'activation_attempt_rejected',
  'accept_with_non_pass_gate_rejected',
  'accept_with_correction_payload_rejected',
  'needs_review_without_correction_rejected',
  'skip_without_source_check_rejected',
  'duplicate_extra_key_rejected',
];

describe('Gustav French lesson LLM review decision schema gate', () => {
  it('keeps French lesson decisions blocked until a complete strict LLM decision file exists', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('generatedFrenchLedgersModifiedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('activationApproved !== false');
    expect(script).toContain('accept_quality_gates requires all 11 gates to be pass');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-llm-review-decision-schema-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.decisionFilePresent).toBe(false);
    expect(audit.summary.decisionRows).toBe(0);
    expect(audit.summary.reviewedRows).toBe(0);
    expect(audit.summary.acceptedRows).toBe(0);
    expect(audit.summary.missingDecisionRows).toBe(1600);
    expect(audit.summary.openedImportApplyActivationRows).toBe(0);
    expect(audit.summary.readyForDecisionImportDryRun).toBe(false);
    expect(audit.summary.readyForContentPromotion).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });

    expect(audit.summary.fixtureProbes).toBe(REQUIRED_PROBES.length);
    expect(audit.summary.fixtureProbesPassed).toBe(REQUIRED_PROBES.length);
    expect(audit.fixtureProbes.map((probe: any) => probe.id)).toEqual(REQUIRED_PROBES);
    expect(audit.fixtureProbes.every((probe: any) => probe.passed)).toBe(true);
    expect(audit.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'info',
        code: 'decision_file_missing',
      }),
    ]));
    expect(audit.nextRequiredGates).toEqual(expect.arrayContaining([
      'execute_llm_official_source_review_requests',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'explicit_activation_approval_gate',
    ]));
  });
});
