import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_materialized_integrity_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_review_materialized_integrity_gate.mjs');

describe('Gustav French lesson review materialized integrity gate', () => {
  it('keeps materialized artifacts absent and audio/server/runtime closed until route materialization is allowed', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('materializedArtifactsWrittenByThisScript: false');
    expect(script).toContain('serverPackManifestModifiedByThisScript: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('audioGeneratedByThisScript: false');

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-review-materialized-integrity-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.materializationAllowedNow).toBe(false);
    expect(audit.summary.outcomeRoutingStatus).toBe('HOLD');
    expect(audit.summary.decisionRows).toBe(0);
    expect(audit.summary.outcomes).toMatchObject({
      accepted: 0,
      regeneration: 0,
      rejected: 0,
      skipped: 0,
    });
    expect(audit.summary.materializedFiles).toBe(0);
    expect(audit.summary.unexpectedMaterializedFiles).toBe(0);
    expect(audit.summary.missingRequiredFiles).toBe(0);
    expect(audit.summary.forbiddenPathHits).toBe(0);
    expect(audit.summary.bucketCount).toBe(4);
    expect(audit.summary.acceptedOnly).toBe(false);
    expect(audit.summary.readyForAudioManifestGate).toBe(false);
    expect(audit.summary.readyForServerPackManifestGate).toBe(false);
    expect(audit.summary.readyForRuntimeDeliveryGate).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'MATERIALIZATION_NOT_ALLOWED_NOW',
    ]));
    expect(audit.buckets).toHaveLength(4);
    expect(audit.buckets.every((bucket: any) => bucket.root.startsWith('docs/gustav/generated/fr/reviewer/'))).toBe(true);
    expect(audit.buckets.every((bucket: any) => bucket.fileCount === 0)).toBe(true);
    expect(audit.unexpectedMaterializedFiles).toEqual([]);
    expect(audit.missingRequiredFiles).toEqual([]);
    expect(audit.forbiddenPathHits).toEqual([]);
    expect(audit.safety).toMatchObject({
      dryRunOnly: true,
      materializedArtifactsWrittenByThisScript: false,
      acceptedLedgersWrittenByThisScript: false,
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
