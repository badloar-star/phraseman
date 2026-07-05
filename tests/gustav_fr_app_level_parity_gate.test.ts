import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const AUDIT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_app_level_parity_gate_audit_v1.json');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_app_level_parity_gate.mjs');

describe('Gustav French app-level parity gate', () => {
  it('maps French lessons to app A1/A2/B1/B2 and keeps production on HOLD until metadata and advanced coverage are proven', () => {
    const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('FRENCH_LEDGER_APP_LEVEL_METADATA_NOT_MATERIALIZED');
    expect(script).toContain('B1_B2_FRENCH_ADVANCED_COVERAGE_NOT_PROVEN');
    expect(script).toContain('activationApproved: false');

    expect(audit.schemaVersion).toBe('gustav-fr-app-level-parity-gate-audit-v1');
    expect(audit.status).toBe('HOLD');
    expect(audit.studyTarget).toBe('fr');
    expect(audit.activationApproved).toBe(false);
    expect(audit.readyForApply).toBe(false);

    expect(audit.appLevels.levels).toEqual(['A1', 'A2', 'B1', 'B2']);
    expect(audit.appLevels.ranges).toEqual({
      A1: [1, 8],
      A2: [9, 18],
      B1: [19, 28],
      B2: [29, 32],
    });
    expect(audit.summary).toMatchObject({
      lessonCount: 32,
      totalLedgerRows: 1600,
      lessonsWith50Rows: 32,
      appLevelMappingPresent: true,
      lessonsMappedToA1: 8,
      lessonsMappedToA2: 10,
      lessonsMappedToB1: 10,
      lessonsMappedToB2: 4,
      b1B2AppLessons: 14,
      blockers: 0,
      activationApproved: false,
      readyForApply: false,
    });

    expect(audit.summary.lessonsWithLedgerAppMetadata).toBeLessThan(32);
    expect(audit.summary.b1B2InternalBandNotProven).toBeGreaterThan(0);

    expect(audit.lessonMappings.find((row: { lessonId: number }) => row.lessonId === 1)).toMatchObject({
      appCourseLevel: 'A1',
      appLevelRange: [1, 8],
    });
    expect(audit.lessonMappings.find((row: { lessonId: number }) => row.lessonId === 19)).toMatchObject({
      appCourseLevel: 'B1',
      appLevelRange: [19, 28],
      advancedCoverageStatus: 'needs_b1_b2_rebuild_or_evidence',
    });
    expect(audit.lessonMappings.find((row: { lessonId: number }) => row.lessonId === 29)).toMatchObject({
      appCourseLevel: 'B2',
      appLevelRange: [29, 32],
      advancedCoverageStatus: 'needs_b1_b2_rebuild_or_evidence',
    });

    expect(audit.productionBlockers.map((blocker: { blockerId: string }) => blocker.blockerId)).toEqual(expect.arrayContaining([
      'FRENCH_LEDGER_APP_LEVEL_METADATA_NOT_MATERIALIZED',
      'B1_B2_FRENCH_ADVANCED_COVERAGE_NOT_PROVEN',
    ]));
    expect(audit.safety).toMatchObject({
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      productionApplyApproved: false,
    });
  });
});
