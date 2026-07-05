import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_fr_lesson_review_decision_import_dry_run.mjs');

describe('Gustav French lesson review decision import dry-run', () => {
  it('waits for schema-valid LLM decisions before any reviewed ledger materialization or production gate opens', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('reviewerDecisionsImportedByThisScript: false');
    expect(script).toContain('acceptedLedgersMaterializedByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('Open audio manifest gate only when all 1600 rows are accepted.');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-review-decision-import-dry-run-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.schemaGateReady).toBe(false);
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.decisionRows).toBe(1263);
    expect(audit.summary.acceptedRows).toBe(870);
    expect(audit.summary.regenerationRows).toBe(303);
    expect(audit.summary.skippedRows).toBe(90);
    expect(audit.summary.openedProductionRows).toBe(0);
    expect(audit.summary.wouldImportReviewedStatuses).toBe(false);
    expect(audit.summary.wouldMaterializeAcceptedLedger).toBe(false);
    expect(audit.summary.wouldCreateRegenerationQueue).toBe(false);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      acceptedLedgersMaterializedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
    expect(audit.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        severity: 'info',
        code: 'schema_gate_not_ready',
      }),
    ]));
    expect(audit.nextRequiredGates).toEqual(expect.arrayContaining([
      'execute_llm_official_source_review_requests',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'regenerate_or_reject_non_accepted_rows_gate',
      'explicit_activation_approval_gate',
    ]));
  });
});
