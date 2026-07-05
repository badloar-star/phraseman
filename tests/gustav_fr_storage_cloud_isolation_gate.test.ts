import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_storage_cloud_isolation_gate.mjs');

describe('Gustav French storage/cloud isolation gate', () => {
  it('proves French storage and cloud sync are scoped without opening migration, runtime or apply', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('FRENCH_TARGET_SYNC_KEYS');
    expect(script).toContain('study_target_v1');
    expect(script).toContain('dev_study_target_lang');
    expect(script).toContain('legacy_cloud_to_en_only_restore_gate');

    expect(audit.schemaVersion).toBe('gustav-fr-storage-cloud-isolation-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.sourceLocales).toEqual(['ru', 'uk']);
    expect(audit.activationApproved).toBe(false);

    expect(audit.summary.runtimeGateStatus).toBe('HOLD');
    expect(audit.summary.runtimeGateReadyForApply).toBe(false);
    expect(audit.summary.exportedStorageKeyFactories).toBeGreaterThanOrEqual(90);
    expect(audit.summary.requiredFrenchFactoryRefs).toBe(21);
    expect(audit.summary.frenchFactoryRefs).toBe(21);
    expect(audit.summary.missingFrenchFactoryRefs).toBe(0);
    expect(audit.summary.syncStudyTargets).toEqual(['en', 'fr']);
    expect(audit.summary.frenchSyncSourceLocales).toEqual(['ru', 'uk']);
    expect(audit.summary.productionStudyTargets).toEqual(['en']);
    expect(audit.summary.internalStudyTargets).toEqual(['en', 'fr']);
    expect(audit.summary.forbiddenRuntimeSyncKeyMentions).toEqual([]);
    expect(audit.summary.checksPassed).toBe(audit.summary.checksTotal);
    expect(audit.summary.blockers).toBe(0);

    expect(audit.checks.targetKeyFactoryPresent).toBe(true);
    expect(audit.checks.sourceTargetKeyFactoryPresent).toBe(true);
    expect(audit.checks.assertRawTargetFirewallPresent).toBe(true);
    expect(audit.checks.unknownStudyTargetDefaultsToEnglish).toBe(true);
    expect(audit.checks.unknownSourceLocaleDefaultsToRussian).toBe(true);
    expect(audit.checks.frenchTargetSyncKeysDeclared).toBe(true);
    expect(audit.checks.syncKeysIncludesFrenchTargetSyncKeys).toBe(true);
    expect(audit.checks.selectionKeysExcludedFromRuntimeSync).toBe(true);
    expect(audit.checks.strictFrenchSyncKeyTestPresent).toBe(true);
    expect(audit.checks.uiLocaleLeakTestPresent).toBe(true);
    expect(audit.checks.legacyFlatFrenchKeyTestPresent).toBe(true);
    expect(audit.checks.frenchDailyTasksRestoreTestPresent).toBe(true);

    expect(audit.summary.storageMigrationAllowed).toBe(false);
    expect(audit.summary.cloudSyncMigrationAllowed).toBe(false);
    expect(audit.summary.firebaseWritesOpenedByThisGate).toBe(false);
    expect(audit.summary.runtimeDownloadsEnabled).toBe(false);
    expect(audit.summary.readyForApply).toBe(false);
    expect(audit.summary.mayModifyProductionAppFiles).toBe(false);

    expect(audit.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      asyncStorageMigrationStarted: false,
      cloudSyncMigrationStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    });
  });
});
