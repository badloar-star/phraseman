import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'work_orders', 'fr_lesson_correction_candidate_review_import_dry_run_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_fr_lesson_correction_candidate_review_import_dry_run.mjs');

describe('Gustav French correction candidate review import dry-run', () => {
  it('waits for schema-valid correction decisions before staging accepted repairs', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('acceptedCorrectionsStagedByThisScript: false');
    expect(script).toContain('generatedFrenchLedgersModifiedByThisScript: false');
    expect(script).toContain('audioGeneratedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('Stage accepted corrections only as reviewed repair candidates, not active lesson rows.');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-correction-candidate-review-import-dry-run-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary).toMatchObject({
      schemaGateReady: false,
      requestRows: 290,
      candidateRows: 290,
      decisionRows: 0,
      acceptedCorrectionRows: 0,
      nonAcceptedCorrectionRows: 0,
      acceptedRowsWithCandidate: 0,
      openedProductionRows: 0,
      wouldStageAcceptedCorrections: false,
      wouldRouteNonAcceptedCorrections: false,
      wouldWriteLessonLedgers: false,
      wouldGenerateAudio: false,
      allCorrectionRowsAccepted: false,
      readyForNonAcceptedRowsRerun: false,
      readyForAudioManifestGate: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers: 0,
    });
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      acceptedCorrectionsStagedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });
    expect(audit.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'info',
        code: 'schema_gate_not_ready',
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
