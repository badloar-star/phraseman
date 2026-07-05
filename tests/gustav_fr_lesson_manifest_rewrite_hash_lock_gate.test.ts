import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_manifest_rewrite_hash_lock_gate_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_manifest_rewrite_hash_lock_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_manifest_rewrite_hash_lock_gate.mjs');

describe('Gustav French lesson manifest rewrite/hash-lock gate', () => {
  it('blocks server manifest rewrite until payload hashes, byte sizes, and rollback hash locks are real', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('fr_lesson_server_manifest_hash_lock_v1.json');
    expect(script).toContain('serverManifestModifiedByThisScript: false');
    expect(script).toContain('hashLockManifestWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');
    expect(script).toContain('manifestRewriteExecutionAllowed: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson-manifest-rewrite-hash-lock-gate-v1');
    expect(contract.status).toBe('HOLD_REWRITE_AND_HASH_LOCK_CLOSED');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.activationApproved).toBe(false);
    expect(contract.rewriteRules).toMatchObject({
      serverManifestModifiedByThisScript: false,
      expectedHashLockManifest: 'docs/gustav/generated/fr/server/fr_lesson_server_manifest_hash_lock_v1.json',
      manifestRewriteExecutionAllowed: false,
      appBundleWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      requiresRealPayloadSha256: true,
      requiresPayloadByteSize: true,
      requiresServerPathToContainPayloadSha: true,
      requiresPayloadMaterializationGatePass: true,
      requiresUploadPolicyGatePass: true,
      requiresHashLockManifest: true,
    });

    expect(contract.entryRewriteChecks).toHaveLength(4);
    for (const entry of contract.entryRewriteChecks) {
      expect(entry.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(entry.sourceLocale);
      expect(entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`)).toBe(true);
      expect(entry.sourceLocaleScoped).toBe(true);
      expect(entry.shaIsPlaceholder).toBe(true);
      expect(entry.shaIsReal).toBe(false);
      expect(entry.byteSizeIsReal).toBe(false);
      expect(entry.serverPathUsesManifestSha).toBe(false);
      expect(entry.payloadExpected).toBe(true);
      expect(entry.payloadExists).toBe(false);
      expect(entry.payloadShaMatches).toBe(false);
      expect(entry.payloadBytesMatch).toBe(false);
      expect(entry.rewriteReady).toBe(false);
    }

    expect(contract.expectedHashLocks).toHaveLength(4);
    for (const lock of contract.expectedHashLocks) {
      expect(lock.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(lock.sourceLocale);
      expect(lock.requiredServerPathPrefix).toBe(`course-packs/fr/${lock.sourceLocale}/${lock.surface}/`);
      expect(lock.requiredRollbackScope).toBe(`course-packs/fr/${lock.sourceLocale}/`);
      expect(lock.requiredFields).toEqual(expect.arrayContaining([
        'payloadSha256',
        'payloadByteSize',
        'serverManifestSha256BeforeUpload',
        'activationApproved:false',
      ]));
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-manifest-rewrite-hash-lock-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.serverManifestEntries).toBe(4);
    expect(audit.summary.expectedPayloads).toBe(4);
    expect(audit.summary.sourceLocaleScopedEntries).toBe(4);
    expect(audit.summary.placeholderShaEntries).toBe(4);
    expect(audit.summary.realShaEntries).toBe(0);
    expect(audit.summary.realByteSizeEntries).toBe(0);
    expect(audit.summary.serverPathUsesManifestShaEntries).toBe(0);
    expect(audit.summary.payloadExistsEntries).toBe(0);
    expect(audit.summary.payloadShaMatchEntries).toBe(0);
    expect(audit.summary.payloadByteSizeMatchEntries).toBe(0);
    expect(audit.summary.rewriteReadyEntries).toBe(0);
    expect(audit.summary.expectedHashLocks).toBe(4);
    expect(audit.summary.hashLockManifestExists).toBe(false);
    expect(audit.summary.hashLockManifestReady).toBe(false);
    expect(audit.summary.payloadMaterializationReady).toBe(false);
    expect(audit.summary.uploadPolicyReady).toBe(false);
    expect(audit.summary.manifestRewriteReady).toBe(false);
    expect(audit.summary.manifestRewriteExecutionAllowed).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'PAYLOAD_MATERIALIZATION_GATE_NOT_READY',
      'SERVER_MANIFEST_STILL_HAS_PLACEHOLDER_SHA_OR_BYTES',
      'HASH_LOCK_MANIFEST_NOT_READY',
      'UPLOAD_POLICY_NOT_READY_FOR_EXECUTION',
      'MANIFEST_REWRITE_EXECUTION_CLOSED',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      serverManifestModifiedByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      payloadFilesWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
