import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const BOUNDARY_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_manifest_writer_apply_boundary_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_manifest_writer_apply_boundary_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_manifest_writer_apply_boundary_gate.mjs');

describe('Gustav French lesson manifest writer/apply boundary gate', () => {
  it('prevents one-step promotion from manifest rewrite to upload, runtime, or activation', () => {
    const boundary = JSON.parse(fs.readFileSync(BOUNDARY_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('oneStepProductionPromotionAllowed: false');
    expect(script).toContain('serverManifestRewriteAllowed: false');
    expect(script).toContain('hashLockWriteAllowed: false');
    expect(script).toContain('serverUploadAllowed: false');
    expect(script).toContain('runtimeIndexMutationAllowed: false');
    expect(script).toContain('activationApproved: false');
    expect(script).toContain('server_upload_evidence_gate');

    expect(boundary.schemaVersion).toBe('gustav-fr-lesson-manifest-writer-apply-boundary-gate-v1');
    expect(boundary.status).toBe('HOLD_BOUNDARY_CLOSED');
    expect(boundary.studyTarget).toBe('fr');
    expect(boundary.targetContentLang).toBe('fr');
    expect(boundary.sourceLocales).toEqual(['ru', 'uk']);
    expect(boundary.activationApproved).toBe(false);
    expect(boundary.boundaryRules).toMatchObject({
      oneStepProductionPromotionAllowed: false,
      serverManifestRewriteAllowed: false,
      hashLockWriteAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeIndexMutationAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });
    expect(boundary.boundaryRules.requiredTransitionOrder).toEqual([
      'review_import_all_1600_rows_accepted',
      'audio_checksum_all_1600_slots_ready',
      'server_payloads_materialized_with_real_sha_and_bytes',
      'server_manifest_rewrite_with_real_sha_and_bytes',
      'server_manifest_hash_lock_written_and_validated',
      'server_upload_policy_passes',
      'server_upload_evidence_passes',
      'runtime_delivery_index_and_cache_keys_pass',
      'admin_activation_rollback_receipt_and_hash_locks_pass',
      'explicit_activation_approval_sets_activationApproved_true',
    ]);

    expect(boundary.transitionMatrix).toHaveLength(10);
    for (const transition of boundary.transitionMatrix) {
      expect(transition.allowedNow).toBe(false);
    }

    expect(boundary.illegalOneStepTransitionProbes).toHaveLength(4);
    for (const probe of boundary.illegalOneStepTransitionProbes) {
      expect(probe.accepted).toBe(false);
    }
    expect(boundary.illegalOneStepTransitionProbes.map((probe: { id: string }) => probe.id)).toEqual(expect.arrayContaining([
      'rewrite_manifest_and_upload_same_step_rejected',
      'hash_lock_write_and_runtime_index_same_step_rejected',
      'upload_and_activation_same_step_rejected',
      'runtime_downloads_before_upload_evidence_rejected',
    ]));

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-manifest-writer-apply-boundary-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.transitionSteps).toBe(10);
    expect(audit.summary.transitionsAllowedNow).toBe(0);
    expect(audit.summary.transitionsClosed).toBe(10);
    expect(audit.summary.illegalOneStepTransitionProbes).toBe(4);
    expect(audit.summary.illegalOneStepTransitionProbesRejected).toBe(4);
    expect(audit.summary.allTransitionsClosed).toBe(true);
    expect(audit.summary.noProductionFlagsOpen).toBe(true);
    expect(audit.summary.serverManifestRewriteAllowed).toBe(false);
    expect(audit.summary.hashLockWriteAllowed).toBe(false);
    expect(audit.summary.serverUploadAllowed).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeIndexMutationAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.productionApplyApproved).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'REVIEW_DECISIONS_NOT_COMPLETE',
      'AUDIO_CHECKSUM_GATE_NOT_READY',
      'PAYLOAD_MATERIALIZATION_GATE_NOT_READY',
      'MANIFEST_REWRITE_GATE_NOT_READY',
      'HASH_LOCK_WRITER_NOT_READY',
      'SERVER_UPLOAD_EVIDENCE_GATE_MISSING',
      'RUNTIME_DELIVERY_GATE_NOT_READY',
      'EXPLICIT_ACTIVATION_APPROVAL_MISSING',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      serverManifestModifiedByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
