import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_route_materialization_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_route_materialization_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_review_route_materialization_gate.mjs');

describe('Gustav French lesson review route materialization gate', () => {
  it('allowlists only isolated reviewer outputs and keeps app/server/runtime materialization closed', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('materializedLedgersWrittenByThisScript: false');
    expect(script).toContain('serverPackManifestModifiedByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('audioGeneratedByThisScript: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson-review-route-materialization-gate-v1');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.activationApproved).toBe(false);
    expect(contract.materializationAllowedNow).toBe(false);
    expect(contract.allowedOutputPrefixes).toEqual(expect.arrayContaining([
      'docs/gustav/generated/fr/reviewer/materialized/',
      'docs/gustav/generated/fr/reviewer/regeneration/',
      'docs/gustav/generated/fr/reviewer/rejected/',
      'docs/gustav/generated/fr/reviewer/skipped/',
    ]));
    expect(contract.forbiddenOutputPrefixes).toEqual(expect.arrayContaining([
      'app/',
      'admin/',
      'functions/',
      'docs/gustav/generated/fr/server/',
      'docs/gustav/generated/fr/runtime/',
      'docs/gustav/generated/fr/audio/',
    ]));
    expect(contract.routeOutputs).toHaveLength(4);
    expect(contract.routeOutputs.every((entry: any) => entry.outputAllowedByPrefix)).toBe(true);
    expect(contract.routeOutputs.every((entry: any) => entry.outputHitsForbiddenPrefix === false)).toBe(true);

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-review-route-materialization-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.routeOutputsChecked).toBe(4);
    expect(audit.summary.allowedOutputs).toBe(4);
    expect(audit.summary.forbiddenOutputHits).toBe(0);
    expect(audit.summary.notAllowlistedOutputs).toBe(0);
    expect(audit.summary.outcomeRoutingReady).toBe(false);
    expect(audit.summary.materializationAllowedNow).toBe(false);
    expect(audit.summary.acceptedLedgerMaterializationAllowed).toBe(false);
    expect(audit.summary.regenerationQueueAllowed).toBe(false);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'OUTCOME_ROUTING_NOT_READY',
      'MATERIALIZATION_NOT_ALLOWED_NOW',
    ]));
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      materializedLedgersWrittenByThisScript: false,
      regenerationQueueWrittenByThisScript: false,
      rejectedRowsWrittenByThisScript: false,
      skippedRowsWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      functionsModifiedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      productionApplyApproved: false,
    });
  });
});
