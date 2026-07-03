import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const REPORT_PATH = path.join(RUN_DIR, 'audits', 'storage_cloud_target_map_v2_packet.json');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_storage_cloud_target_map_v2_packet.ts'),
  'utf8',
);

type StorageCloudReport = {
  status: string;
  summary: {
    blockers: number;
    frenchTargetSyncKeysDeclared: boolean;
    frenchTargetSyncKeyFactoryRefs: number;
    frenchTargetSyncKeysRejectEnglishRefs: boolean;
    frenchTargetSyncKeysRejectSpanishRefs: boolean;
    frenchTargetSyncKeysRejectUiLocaleRefs: boolean;
    frenchTargetSyncKeysStrictRuntimeScopeTested: boolean;
    frenchTargetSyncKeysRejectUiLocaleSegmentsTested: boolean;
    frenchTargetSyncKeysRejectLegacyFlatKeysTested: boolean;
    studyTargetSelectionKeysExcludedFromRuntimeSyncTested: boolean;
    frenchTargetSyncKeysRejectEnglishLegacyDuplicatesTested: boolean;
    syncKeysIncludesFrenchTargetSyncKeys: boolean;
    readyForAdminPackDeliverySurfaceV2: boolean;
    readyForApply: boolean;
  };
  safety: {
    firebaseOrServerUploadStarted: boolean;
    storageMigrationStarted: boolean;
    cloudSyncMigrationStarted: boolean;
    runtimeDownloadsEnabled: boolean;
    productionApplyApproved: boolean;
  };
};

function readReport(): StorageCloudReport {
  return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as StorageCloudReport;
}

describe('Gustav storage/cloud target map V2 packet', () => {
  it('requires strict French cloud sync namespace evidence before downstream delivery', () => {
    const report = readReport();

    expect(report.status).toBe('PASS');
    expect(report.summary.blockers).toBe(0);
    expect(report.summary.frenchTargetSyncKeysDeclared).toBe(true);
    expect(report.summary.frenchTargetSyncKeyFactoryRefs).toBeGreaterThanOrEqual(70);
    expect(report.summary.frenchTargetSyncKeysRejectEnglishRefs).toBe(true);
    expect(report.summary.frenchTargetSyncKeysRejectSpanishRefs).toBe(true);
    expect(report.summary.frenchTargetSyncKeysRejectUiLocaleRefs).toBe(true);
    expect(report.summary.frenchTargetSyncKeysStrictRuntimeScopeTested).toBe(true);
    expect(report.summary.frenchTargetSyncKeysRejectUiLocaleSegmentsTested).toBe(true);
    expect(report.summary.frenchTargetSyncKeysRejectLegacyFlatKeysTested).toBe(true);
    expect(report.summary.studyTargetSelectionKeysExcludedFromRuntimeSyncTested).toBe(true);
    expect(report.summary.frenchTargetSyncKeysRejectEnglishLegacyDuplicatesTested).toBe(true);
    expect(report.summary.syncKeysIncludesFrenchTargetSyncKeys).toBe(true);
    expect(report.summary.readyForAdminPackDeliverySurfaceV2).toBe(true);
    expect(report.summary.readyForApply).toBe(false);
  });

  it('keeps storage/cloud work read-only for production state', () => {
    const report = readReport();

    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.storageMigrationStarted).toBe(false);
    expect(report.safety.cloudSyncMigrationStarted).toBe(false);
    expect(report.safety.runtimeDownloadsEnabled).toBe(false);
    expect(report.safety.productionApplyApproved).toBe(false);
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
});
