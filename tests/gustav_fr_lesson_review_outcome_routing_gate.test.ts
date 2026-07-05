import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_outcome_routing_plan_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_outcome_routing_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_review_outcome_routing_gate.mjs');

describe('Gustav French lesson review outcome routing gate', () => {
  it('keeps accepted/regeneration/rejected/skipped routes closed until complete schema-valid decisions exist', () => {
    const plan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('acceptedLedgersMaterializedByThisScript: false');
    expect(script).toContain('regenerationQueueWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');

    expect(plan.schemaVersion).toBe('gustav-fr-lesson-review-outcome-routing-plan-v1');
    expect(plan.studyTarget).toBe('fr');
    expect(plan.sourceLocales).toEqual(['ru', 'uk']);
    expect(plan.activationApproved).toBe(false);
    expect(plan.rule).toContain('Partial decisions never unlock audio, server packs, runtime downloads or apply.');
    expect(plan.routes.acceptedLedgerMaterialization.allowed).toBe(false);
    expect(plan.routes.regenerationQueue.allowed).toBe(false);
    expect(plan.routes.rejectedRowsLedger.allowed).toBe(false);
    expect(plan.routes.skippedRowsLedger.allowed).toBe(false);

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-review-outcome-routing-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.requestRows).toBe(1600);
    expect(audit.summary.decisionFilePresent).toBe(false);
    expect(audit.summary.decisionRows).toBe(0);
    expect(audit.summary.matchedDecisionRows).toBe(0);
    expect(audit.summary.missingDecisionRows).toBe(1600);
    expect(audit.summary.progressGateStatus).toBe('HOLD_PARTIAL_OR_EMPTY');
    expect(audit.summary.schemaGateReady).toBe(false);
    expect(audit.summary.importDryRunReady).toBe(false);
    expect(audit.summary.allRowsReviewed).toBe(false);
    expect(audit.summary.allRowsAccepted).toBe(false);
    expect(audit.summary.allRowsRouted).toBe(false);
    expect(audit.summary.outcomes).toMatchObject({
      accepted: 0,
      regeneration: 0,
      rejected: 0,
      skipped: 0,
      unknown: 0,
    });
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'DECISIONS_FILE_MISSING',
      'DECISIONS_NOT_COMPLETE',
      'SCHEMA_GATE_NOT_READY',
      'IMPORT_DRY_RUN_NOT_READY',
    ]));
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      acceptedLedgersMaterializedByThisScript: false,
      regenerationQueueWrittenByThisScript: false,
      rejectedRowsWrittenByThisScript: false,
      skippedRowsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
