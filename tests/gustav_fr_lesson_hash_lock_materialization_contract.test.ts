import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_hash_lock_materialization_contract_v1.json');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_hash_lock_materialization_contract_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_hash_lock_materialization_contract.mjs');

describe('Gustav French lesson hash-lock materialization contract', () => {
  it('requires source-locale rollback hash locks before manifest rewrite or upload can proceed', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('fr_lesson_server_manifest_hash_lock_v1.json');
    expect(script).toContain("const ALLOWED_ROLLBACK_SCOPES = ['course-packs/fr/ru/', 'course-packs/fr/uk/']");
    expect(script).toContain("'course-packs/fr/'");
    expect(script).toContain("'course-packs/en/'");
    expect(script).toContain('hashLockManifestWrittenByThisScript: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');
    expect(script).toContain('hashLockMaterializationExecutionAllowed: false');

    expect(contract.schemaVersion).toBe('gustav-fr-lesson-hash-lock-materialization-contract-v1');
    expect(contract.status).toBe('HOLD_HASH_LOCK_MATERIALIZATION_CLOSED');
    expect(contract.studyTarget).toBe('fr');
    expect(contract.targetContentLang).toBe('fr');
    expect(contract.sourceLocales).toEqual(['ru', 'uk']);
    expect(contract.activationApproved).toBe(false);
    expect(contract.materializationRules).toMatchObject({
      expectedHashLockManifest: 'docs/gustav/generated/fr/server/fr_lesson_server_manifest_hash_lock_v1.json',
      hashLockManifestWrittenByThisScript: false,
      appBundleWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      allowedRollbackScopes: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      requiresActivationApprovedFalse: true,
      requiresPayloadSha256: true,
      requiresPayloadByteSize: true,
      requiresPreUploadServerManifestSha256: true,
      requiresPayloadMaterializationAuditSha256: true,
      requiresUploadPolicyAuditSha256: true,
      requiresManifestRewriteGateAuditSha256: true,
    });
    expect(contract.materializationRules.deniedRollbackScopes).toEqual(expect.arrayContaining([
      'course-packs/fr/',
      'course-packs/en/',
      'course-packs/fr/uiLocale/',
      'course-packs/fr/sourceLocale/',
      'card_packs/',
      'community_packs/',
    ]));

    expect(contract.expectedLocks).toHaveLength(4);
    for (const lock of contract.expectedLocks) {
      expect(lock.studyTarget).toBe('fr');
      expect(['ru', 'uk']).toContain(lock.sourceLocale);
      expect(lock.requiredRollbackScope).toBe(`course-packs/fr/${lock.sourceLocale}/`);
      expect(lock.requiredServerPathPrefix).toBe(`course-packs/fr/${lock.sourceLocale}/${lock.surface}/`);
      expect(lock.requiredActivationApproved).toBe(false);
      expect(lock.requiredServerManifestSha256BeforeUpload).toMatch(/^[a-f0-9]{64}$/);
      expect(lock.requiredPayloadMaterializationAuditSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(lock.requiredUploadPolicyAuditSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(lock.requiredManifestRewriteGateAuditSha256).toMatch(/^[a-f0-9]{64}$/);
    }

    expect(contract.lockInspections).toHaveLength(4);
    for (const inspection of contract.lockInspections) {
      expect(inspection.exists).toBe(false);
      expect(inspection.accepted).toBe(false);
      expect(inspection.errors).toContain('hash lock entry missing');
    }

    expect(audit.schemaVersion).toBe('gustav-fr-lesson-hash-lock-materialization-contract-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.activationApproved).toBe(false);
    expect(audit.summary.expectedLocks).toBe(4);
    expect(audit.summary.hashLockManifestExists).toBe(false);
    expect(audit.summary.hashLockManifestSchemaValid).toBe(false);
    expect(audit.summary.existingLocks).toBe(0);
    expect(audit.summary.allExpectedLocksPresent).toBe(false);
    expect(audit.summary.acceptedLocks).toBe(0);
    expect(audit.summary.rejectedLocks).toBe(0);
    expect(audit.summary.missingLocks).toBe(4);
    expect(audit.summary.allowedRollbackScopes).toEqual(['course-packs/fr/ru/', 'course-packs/fr/uk/']);
    expect(audit.summary.deniedRollbackScopes).toEqual(expect.arrayContaining(['course-packs/fr/', 'course-packs/en/']));
    expect(audit.summary.materializationReady).toBe(false);
    expect(audit.summary.rewriteGateReady).toBe(false);
    expect(audit.summary.activationHashLockReady).toBe(false);
    expect(audit.summary.hashLockMaterializationReady).toBe(false);
    expect(audit.summary.hashLockMaterializationExecutionAllowed).toBe(false);
    expect(audit.summary.firebaseUploadAllowed).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.activationApproved).toBe(false);
    expect(audit.summary.readyForManifestRewrite).toBe(false);
    expect(audit.summary.readyForServerUpload).toBe(false);
    expect(audit.summary.readyForRuntimeDelivery).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.structuralBlockers).toBe(0);
    expect(audit.productionBlockers).toEqual(expect.arrayContaining([
      'HASH_LOCK_MANIFEST_FILE_MISSING',
      'EXPECTED_HASH_LOCKS_MISSING',
      'EXPECTED_HASH_LOCKS_NOT_ACCEPTED',
      'PAYLOAD_MATERIALIZATION_GATE_NOT_READY',
      'MANIFEST_REWRITE_GATE_NOT_READY',
      'ACTIVATION_HASH_LOCK_NOT_READY',
      'HASH_LOCK_MATERIALIZATION_EXECUTION_CLOSED',
    ]));
    expect(audit.safety).toMatchObject({
      readOnly: true,
      hashLockManifestWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      payloadFilesWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
