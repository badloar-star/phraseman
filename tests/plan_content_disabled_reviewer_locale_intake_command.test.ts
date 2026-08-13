import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import type { CoursePackReviewerLocaleDecision } from '../app/course_pack_reviewer_locale_intake';
import { writePlanContentDisabledReviewerLocaleIntake } from '../scripts/plan_content_disabled_reviewer_locale_intake';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/disabled-reviewer-locale-intake';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const INDEX_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/index.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const STORAGE_CLOUD_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-storage-cloud-isolation.json`;
const REVIEWER_LOCALE_APPROVAL_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-reviewer-locale-intake.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.reviewer-locale.command.test';
const CONTENT_VERSION = 'staging.shadow.reviewer-locale.command.test';

type DisabledReviewerLocaleIntakeReport = {
  status: string;
  safetyStatus: string;
  approvalStatus: string;
  reviewerLocale: {
    status: string;
    safetyStatus: string;
    approvalStatus: string;
    totalRows: number;
    explicitApprovalArtifactPresent: boolean;
    explicitDecisionRows: number;
    reviewerApprovedRows: number;
    localePassedRows: number;
    missingReviewerApprovalRows: unknown[];
    missingLocaleGateRows: unknown[];
    safetyBlockers: string[];
    approvalBlockers: string[];
  };
  evidenceBlockers: string[];
  blockers: string[];
};

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: GENERATED_AT,
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function indexEntries(overrides: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  return [
    {
      planId: 'echo',
      dayIndex: 1,
      path: 'plans/echo/day-001.json',
      contentHash: HASH_A,
      sourceLocale: 'ru',
      studyTarget: 'en',
      reviewStatus: 'shadow',
      localeGateStatus: 'hold',
      schemaVersion: 'plan-content-day-v1',
      ...(overrides[0] ?? {}),
    },
    {
      planId: 'echo',
      dayIndex: 2,
      path: 'plans/echo/day-002.json',
      contentHash: HASH_B,
      sourceLocale: 'ru',
      studyTarget: 'en',
      reviewStatus: 'shadow',
      localeGateStatus: 'hold',
      schemaVersion: 'plan-content-day-v1',
      ...(overrides[1] ?? {}),
    },
  ];
}

function approvalDecisions(entries = indexEntries()): CoursePackReviewerLocaleDecision[] {
  return entries.map((entry) => ({
    planId: String(entry.planId),
    dayIndex: Number(entry.dayIndex),
    contentHash: String(entry.contentHash),
    studyTarget: String(entry.studyTarget),
    sourceLocale: String(entry.sourceLocale),
    reviewerStatus: 'approved',
    localeGateStatus: 'passed',
    reviewerEvidenceId: `review:${entry.planId}:${entry.dayIndex}`,
    localeEvidenceId: `locale:${entry.planId}:${entry.dayIndex}`,
  }));
}

function writeInputs(overrides: {
  manifest?: CoursePackManifest;
  entries?: Array<Record<string, unknown>>;
  dualRead?: Record<string, unknown>;
  storageCloudEnvelope?: Record<string, unknown>;
  storageCloud?: Record<string, unknown>;
  approvalArtifact?: Record<string, unknown> | null;
} = {}): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE, 'pack'), { recursive: true });
  const manifest = overrides.manifest ?? validManifest();
  const entries = overrides.entries ?? indexEntries();
  const baseEvidence = {
    status: 'PASS',
    generatedAt: GENERATED_AT,
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: manifest.surface,
    contentVersion: manifest.contentVersion,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    blockers: [],
  };

  fs.writeFileSync(path.join(ROOT, MANIFEST_RELATIVE), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, INDEX_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-index-v1',
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    contentVersion: manifest.contentVersion,
    entries,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DUAL_READ_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-server-shadow-dual-read-report-v1',
    serverShadowRowsRead: entries.length,
    parityReport: {
      verdict: 'shadow_parity_passed',
      reviewerSummary: {
        reviewedRowCount: entries.length,
        reviewStatusCounts: {
          approved: 0,
          shadow: entries.length,
          hold: 0,
          rejected: 0,
        },
        localeGateStatusCounts: {
          passed: 0,
          hold: entries.length,
          failed: 0,
        },
      },
    },
    ...overrides.dualRead,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, STORAGE_CLOUD_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-storage-cloud-isolation-report-v1',
    storageCloud: {
      status: 'PASS',
      storageCloudIsolationComplete: true,
      activationApproved: false,
      runtimeManifestRegistrationApproved: false,
      runtimeLookupApproved: false,
      remoteLoadingApproved: false,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheLookupApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      cacheRepairApproved: false,
      storageMigrationApproved: false,
      cloudRestoreMigrationApproved: false,
      cloudRestoreRewriteApproved: false,
      cloudRestoreExecutionApproved: false,
      syncKeyMutationApproved: false,
      studyTargetMutationApproved: false,
      sourceLocaleMutationApproved: false,
      appLanguageMutationApproved: false,
      bundledContentRemovalApproved: false,
      productionActivationApproved: false,
      blockers: [],
      ...overrides.storageCloud,
    },
    ...overrides.storageCloudEnvelope,
  }, null, 2)}\n`, 'utf8');

  if (overrides.approvalArtifact !== undefined) {
    fs.writeFileSync(path.join(ROOT, REVIEWER_LOCALE_APPROVAL_RELATIVE), `${JSON.stringify({
      ...baseEvidence,
      schemaVersion: 'plan-content-reviewer-locale-approval-v1',
      decisions: approvalDecisions(entries),
      ...overrides.approvalArtifact,
    }, null, 2)}\n`, 'utf8');
  }
}

function writeReport(options: { approval?: boolean } = {}) {
  return writePlanContentDisabledReviewerLocaleIntake(ROOT, {
    manifestPath: MANIFEST_RELATIVE,
    indexPath: INDEX_RELATIVE,
    serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
    disabledStorageCloudIsolationPath: STORAGE_CLOUD_RELATIVE,
    ...(options.approval ? { reviewerLocaleApprovalPath: REVIEWER_LOCALE_APPROVAL_RELATIVE } : {}),
    outputPath: REPORT_RELATIVE,
    generatedAt: GENERATED_AT,
  });
}

describe('plan content disabled reviewer/locale intake command', () => {
  it('writes HOLD with a complete missing-review queue and no auto-approval', () => {
    writeInputs();

    const result = writeReport();

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-disabled-reviewer-locale-intake-report-v1',
      status: 'HOLD',
      safetyStatus: 'PASS',
      approvalStatus: 'HOLD',
      packId: PACK_ID,
      evidenceBlockers: [],
    });
    expect(result.report.reviewerLocale).toMatchObject({
      status: 'HOLD',
      safetyStatus: 'PASS',
      approvalStatus: 'HOLD',
      totalRows: 2,
      explicitApprovalArtifactPresent: false,
      explicitDecisionRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      safetyBlockers: [],
    });
    expect(result.report.reviewerLocale.missingReviewerApprovalRows).toHaveLength(2);
    expect(result.report.reviewerLocale.missingLocaleGateRows).toHaveLength(2);
  });

  it('passes only with explicit approval evidence for every row', () => {
    writeInputs({ approvalArtifact: {} });

    const result = writeReport({ approval: true });

    expect(result.report).toMatchObject({
      status: 'PASS',
      safetyStatus: 'PASS',
      approvalStatus: 'PASS',
      evidenceBlockers: [],
      blockers: [],
    });
    expect(result.report.reviewerLocale).toMatchObject({
      reviewerApprovedRows: 2,
      localePassedRows: 2,
      reviewerLocaleApprovalComplete: true,
      missingReviewerApprovalRows: [],
      missingLocaleGateRows: [],
    });
  });

  it('keeps partial explicit approval as HOLD without throwing', () => {
    const entries = indexEntries();
    writeInputs({
      entries,
      approvalArtifact: {
        decisions: approvalDecisions(entries).slice(0, 1),
      },
    });

    const result = writeReport({ approval: true });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.safetyStatus).toBe('PASS');
    expect(result.report.approvalStatus).toBe('HOLD');
    expect(result.report.reviewerLocale.reviewerApprovedRows).toBe(1);
    expect(result.report.reviewerLocale.localePassedRows).toBe(1);
    expect(result.report.reviewerLocale.missingReviewerApprovalRows).toHaveLength(1);
  });

  it('writes HOLD and throws when shadow metadata tries to approve rows', () => {
    writeInputs({
      entries: indexEntries([{ reviewStatus: 'approved', localeGateStatus: 'passed' }]),
      dualRead: {
        parityReport: {
          verdict: 'shadow_parity_passed',
          reviewerSummary: {
            reviewedRowCount: 2,
            reviewStatusCounts: { approved: 1, shadow: 1, hold: 0, rejected: 0 },
            localeGateStatusCounts: { passed: 1, hold: 1, failed: 0 },
          },
        },
      },
    });

    expect(() => writeReport()).toThrow('Disabled reviewer/locale intake failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as DisabledReviewerLocaleIntakeReport;
    expect(report.status).toBe('HOLD');
    expect(report.safetyStatus).toBe('HOLD');
    expect(report.reviewerLocale.safetyBlockers).toEqual(expect.arrayContaining([
      'server-shadow reviewer summary must not be used as explicit reviewer approval',
      'server-shadow locale summary must not be used as explicit locale approval',
      'echo:1 has approved shadow review status; approvals must come from explicit reviewer artifact',
      'echo:1 has passed shadow locale status; locale passes must come from explicit locale artifact',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentDisabledReviewerLocaleIntake(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      indexPath: INDEX_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledStorageCloudIsolationPath: STORAGE_CLOUD_RELATIVE,
      outputPath: 'docs/specs/__plan_content_disabled_reviewer_locale_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled reviewer/locale intake output must stay under .codex-tmp');
  });

  it('keeps disabled reviewer/locale tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_disabled_reviewer_locale_intake.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|storageMigrationApproved: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_disabled_reviewer_locale_intake|course_pack_reviewer_locale_intake|disabled-reviewer-locale-intake/i);
    }
  });
});
