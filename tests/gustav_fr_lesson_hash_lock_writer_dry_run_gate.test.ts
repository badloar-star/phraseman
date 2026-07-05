import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const DRY_RUN_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_hash_lock_writer_dry_run_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_hash_lock_writer_dry_run_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_hash_lock_writer_dry_run_gate.mjs');
const REAL_HASH_LOCK_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_manifest_hash_lock_v1.json');

describe('Gustav French lesson hash-lock writer dry-run gate', () => {
  it('previews the future hash-lock manifest while keeping the real writer closed', () => {
    const dryRun = JSON.parse(fs.readFileSync(DRY_RUN_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('fr_lesson_hash_lock_writer_dry_run_v1.json');
    expect(script).toContain('fr_lesson_server_manifest_hash_lock_v1.json');
    expect(script).toContain('wouldWriteHashLockManifest: false');
    expect(script).toContain('writerExecutionAllowed');
    expect(script).toContain('false;');
    expect(script).toContain('hashLockManifestWrittenByThisScript: false');
    expect(script).toContain('dryRunPreviewWrittenByThisScript: true');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');

    expect(fs.existsSync(REAL_HASH_LOCK_PATH)).toBe(false);

    expect(dryRun.schemaVersion).toBe('gustav-fr-lesson-hash-lock-writer-dry-run-v1');
    expect(dryRun.status).toBe('HOLD_WRITER_CLOSED');
    expect(dryRun.studyTarget).toBe('fr');
    expect(dryRun.targetContentLang).toBe('fr');
    expect(dryRun.sourceLocales).toEqual(['ru', 'uk']);
    expect(dryRun.activationApproved).toBe(false);
    expect(dryRun.wouldWritePath).toBe('docs/gustav/generated/fr/server/fr_lesson_server_manifest_hash_lock_v1.json');
    expect(dryRun.wouldWriteHashLockManifest).toBe(false);
    expect(dryRun.previewManifest).toMatchObject({
      schemaVersion: 'gustav-fr-lesson-server-manifest-hash-lock-v1',
      studyTarget: 'fr',
      targetContentLang: 'fr',
      sourceLocales: ['ru', 'uk'],
      activationApproved: false,
    });
    expect(dryRun.previewManifest.locks).toHaveLength(4);
    for (const lock of dryRun.previewManifest.locks) {
      expect(lock.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(lock.sourceLocale);
      expect(lock.rollbackScope).toBe(`course-packs/fr/${lock.sourceLocale}/`);
      expect(lock.serverPath.startsWith(`course-packs/fr/${lock.sourceLocale}/${lock.surface}/`)).toBe(true);
      expect(lock.activationApproved).toBe(false);
      expect(lock.serverPathScoped).toBe(true);
      expect(lock.payloadShaReal).toBe(false);
      expect(lock.payloadByteSizeReal).toBe(false);
      expect(lock.serverPathUsesPayloadSha).toBe(false);
      expect(lock.lockWritable).toBe(false);
      expect(lock.errors).toEqual(expect.arrayContaining([
        'payload sha is still placeholder or invalid',
        'payload byteSize is not real',
        'server path does not contain real payload sha',
      ]));
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-hash-lock-writer-dry-run-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.expectedLocks).toBe(4);
    expect(audit.summary.previewLocksWritable).toBe(0);
    expect(audit.summary.previewLocksBlocked).toBe(4);
    expect(audit.summary.payloadShaRealLocks).toBe(0);
    expect(audit.summary.payloadByteSizeRealLocks).toBe(0);
    expect(audit.summary.sourceLocaleScopedLocks).toBe(4);
    expect(audit.summary.serverPathUsesPayloadShaLocks).toBe(0);
    expect(audit.summary.existingHashLockManifestExists).toBe(false);
    expect(audit.summary.payloadMaterializationReady).toBe(false);
    expect(audit.summary.manifestRewriteReady).toBe(false);
    expect(audit.summary.hashLockContractReady).toBe(false);
    expect(audit.summary.allPreviewLocksWritable).toBe(false);
    expect(audit.summary.writerExecutionAllowed).toBe(false);
    expect(audit.summary.hashLockManifestWrittenByThisScript).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'PAYLOAD_MATERIALIZATION_GATE_NOT_READY',
      'MANIFEST_REWRITE_GATE_NOT_READY',
      'HASH_LOCK_CONTRACT_NOT_READY',
      'PREVIEW_LOCKS_NOT_WRITABLE',
      'HASH_LOCK_WRITER_EXECUTION_CLOSED',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      hashLockManifestWrittenByThisScript: false,
      dryRunPreviewWrittenByThisScript: true,
      serverManifestModifiedByThisScript: false,
      payloadFilesWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
