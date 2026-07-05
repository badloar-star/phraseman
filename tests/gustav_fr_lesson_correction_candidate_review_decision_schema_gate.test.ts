import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_decision_schema_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_validate_fr_lesson_correction_candidate_review_decisions.mjs');

const REQUIRED_PROBES = [
  'valid_correction_accept_all_gates_passes',
  'wrong_request_identity_rejected',
  'wrong_source_locale_rejected',
  'activation_attempt_rejected',
  'accept_with_non_pass_gate_rejected',
  'accept_with_correction_payload_rejected',
  'needs_review_without_correction_rejected',
  'extra_key_rejected',
];

describe('Gustav French correction candidate review decision schema gate', () => {
  it('keeps corrected candidates on HOLD until a complete separate strict decision file exists', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('decision_has_no_matching_correction_request');
    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('generatedFrenchLedgersModifiedByThisScript: false');
    expect(script).toContain('audioGeneratedByThisScript: false');
    expect(script).toContain('activationApproved !== false');
    expect(script).toContain('accept_quality_gates requires all 11 gates to be pass');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-correction-candidate-review-decision-schema-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary).toMatchObject({
      requestRows: 290,
      decisionFilePresent: false,
      decisionRows: 0,
      reviewedRows: 0,
      acceptedRows: 0,
      nonAcceptedRows: 0,
      missingDecisionRows: 290,
      extraDecisionRows: 0,
      duplicateDecisionRows: 0,
      invalidDecisionRows: 0,
      openedImportApplyActivationRows: 0,
      fixtureProbesPassed: 8,
      fixtureProbes: 8,
      blockers: 0,
      readyForAcceptOnlyImportDryRun: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    });
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });
    expect(audit.fixtureProbes.map((probe: any) => probe.id)).toEqual(REQUIRED_PROBES);
    expect(audit.fixtureProbes.every((probe: any) => probe.passed)).toBe(true);
    expect(audit.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'info',
        code: 'decision_file_missing',
      }),
    ]));
    expect(audit.nextRequiredGates).toEqual(expect.arrayContaining([
      'execute_correction_candidate_llm_trusted_source_review',
      'correction_candidate_decision_schema_gate',
      'correction_candidate_accept_only_import_dry_run_gate',
      'rerun_non_accepted_rows_gate',
    ]));
  });
});
