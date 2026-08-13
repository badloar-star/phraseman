import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_storage_cloud_isolation_gate.mjs');

describe('Gustav French storage/cloud isolation gate', () => {
  it('proves French storage and cloud sync are scoped without opening migration, runtime or apply', () => {
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('FRENCH_TARGET_SYNC_KEYS');
    expect(script).toContain('study_target_v1');
    expect(script).toContain('dev_study_target_lang');
    expect(script).toContain('legacy_cloud_to_en_only_restore_gate');
    expect(script).toContain('targetKeyFactoryPresent');
    expect(script).toContain('sourceTargetKeyFactoryPresent');
    expect(script).toContain('assertRawTargetFirewallPresent');
    expect(script).toContain('strictFrenchSyncKeyTestPresent');
    expect(script).toContain('legacyFlatFrenchKeyTestPresent');
    expect(script).toContain('productionAppFilesModifiedByThisScript: false');
    expect(script).toContain('asyncStorageMigrationStarted: false');
    expect(script).toContain('cloudSyncMigrationStarted: false');
    expect(script).toContain('firebaseOrServerUploadStarted: false');
    expect(script).toContain('runtimeDownloadsEnabled: false');
    expect(script).toContain('productionApplyApproved: false');
    expect(script).not.toContain('cloudSyncDailyTasksTest');
    expect(script).not.toContain('dailyTasksRerollKey');
  });
});
