import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_storage_cloud_target_map_v2_packet.ts'),
  'utf8',
);

describe('Gustav storage/cloud target map V2 packet', () => {
  it('requires strict French cloud sync namespace evidence before downstream delivery', () => {
    expect(SOURCE).toContain('frenchTargetSyncKeysStrictRuntimeScopeTested');
    expect(SOURCE).toContain('frenchTargetSyncKeysRejectUiLocaleSegmentsTested');
    expect(SOURCE).toContain('frenchTargetSyncKeysRejectLegacyFlatKeysTested');
    expect(SOURCE).toContain('studyTargetSelectionKeysExcludedFromRuntimeSyncTested');
    expect(SOURCE).toContain('syncKeysIncludesFrenchTargetSyncKeys');
  });

  it('keeps storage/cloud work read-only for production state', () => {
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('storageMigrationStarted: false');
    expect(SOURCE).toContain('cloudSyncMigrationStarted: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('productionApplyApproved: false');
  });

  it('fails closed if the new French cloud sync contract evidence is removed', () => {
    expect(SOURCE).toContain('frenchTargetSyncKeysStrictRuntimeScopeTested');
    expect(SOURCE).toContain('frenchTargetSyncKeysRejectUiLocaleSegmentsTested');
    expect(SOURCE).toContain('frenchTargetSyncKeysRejectLegacyFlatKeysTested');
    expect(SOURCE).toContain('studyTargetSelectionKeysExcludedFromRuntimeSyncTested');
    expect(SOURCE).toContain('french_sync_runtime_scope_test_missing_rejected');
    expect(SOURCE).toContain('french_sync_legacy_flat_key_test_missing_rejected');
    expect(SOURCE).toContain('study_target_selection_cloud_exclusion_test_missing_rejected');
  });

  it('does not require retired Daily Tasks cloud snapshots or tests', () => {
    expect(SOURCE).not.toContain('cloudSyncDailyTasksMergeTest');
    expect(SOURCE).not.toContain('dailyTasksProgressKey');
    expect(SOURCE).not.toContain('frenchCloudDailyTaskSnapshotKeysAreTargetScoped');
  });
});
