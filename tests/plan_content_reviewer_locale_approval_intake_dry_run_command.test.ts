import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import type { CoursePackReviewerLocaleFilledApprovalArtifact } from '../app/course_pack_reviewer_locale_approval_packet';
import { writePlanContentDisabledReviewerLocaleIntake } from '../scripts/plan_content_disabled_reviewer_locale_intake';
import { writePlanContentReviewerLocaleApprovalPacket } from '../scripts/plan_content_reviewer_locale_approval_packet';
import { writePlanContentReviewerLocaleApprovalIntakeDryRun } from '../scripts/plan_content_reviewer_locale_approval_intake_dry_run';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/reviewer-locale-approval-intake-dry-run';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const INDEX_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/index.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const STORAGE_CLOUD_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-storage-cloud-isolation.json`;
const SOURCE_INTAKE_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-reviewer-locale-intake.json`;
const PACKET_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-packet.json`;
const FILLED_ARTIFACT_RELATIVE = `${RUN_ROOT_RELATIVE}/filled-reviewer-locale-approval.json`;
const DRY_RUN_REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-intake-dry-run.json`;
const NESTED_INTAKE_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-intake-dry-run.intake.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.approval-intake-dry-run.command.test';
const CONTENT_VERSION = 'staging.shadow.approval-intake-dry-run.command.test';

type DryRunReport = {
  status: string;
  dryRunStatus: string;
  sourcePacketRows: number;
  sourcePacketReviewerApprovedRows: number;
  sourcePacketLocalePassedRows: number;
  filledArtifactValidation: {
    status: string;
    decisionsValidForIntake: boolean;
    reviewerApprovedRows: number;
    localePassedRows: number;
    blockers: string[];
  };
  intakeDryRun: {
    status: string;
    approvalStatus: string;
    reviewerApprovedRows: number;
    localePassedRows: number;
    totalRows: number;
    reviewerLocaleApprovalComplete: boolean;
    blockers: string[];
  };
  blockers: string[];
  activationApproved: boolean;
  productionActivationApproved: boolean;
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

function writeBaseInputs(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE, 'pack'), { recursive: true });
  const manifest = validManifest();
  const entries = indexEntries();
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
    },
  }, null, 2)}\n`, 'utf8');

  writePlanContentDisabledReviewerLocaleIntake(ROOT, {
    manifestPath: MANIFEST_RELATIVE,
    indexPath: INDEX_RELATIVE,
    serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
    disabledStorageCloudIsolationPath: STORAGE_CLOUD_RELATIVE,
    outputPath: SOURCE_INTAKE_RELATIVE,
    generatedAt: GENERATED_AT,
  });
  writePlanContentReviewerLocaleApprovalPacket(ROOT, {
    disabledReviewerLocaleIntakePath: SOURCE_INTAKE_RELATIVE,
    outputPath: PACKET_RELATIVE,
    generatedAt: GENERATED_AT,
  });
}

function filledArtifact(overrides: Partial<CoursePackReviewerLocaleFilledApprovalArtifact> = {}): CoursePackReviewerLocaleFilledApprovalArtifact {
  const entries = indexEntries();
  return {
    schemaVersion: 'plan-content-reviewer-locale-approval-v1',
    status: 'PASS',
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: CONTENT_VERSION,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
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
    cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    blockers: [],
    decisions: entries.map((entry) => ({
      planId: String(entry.planId),
      dayIndex: Number(entry.dayIndex),
      path: String(entry.path),
      contentHash: String(entry.contentHash),
      studyTarget: String(entry.studyTarget),
      sourceLocale: String(entry.sourceLocale),
      reviewerStatus: 'approved',
      localeGateStatus: 'passed',
      reviewerEvidenceId: `review:${entry.planId}:${entry.dayIndex}`,
      localeEvidenceId: `locale:${entry.planId}:${entry.dayIndex}`,
    })),
    ...overrides,
  };
}

function writeFilledArtifact(artifact: Partial<CoursePackReviewerLocaleFilledApprovalArtifact>): void {
  fs.writeFileSync(path.join(ROOT, FILLED_ARTIFACT_RELATIVE), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

function writeDryRun(options: { filledArtifact?: boolean } = {}) {
  return writePlanContentReviewerLocaleApprovalIntakeDryRun(ROOT, {
    approvalPacketReportPath: PACKET_RELATIVE,
    disabledReviewerLocaleIntakePath: SOURCE_INTAKE_RELATIVE,
    ...(options.filledArtifact ? { filledApprovalArtifactPath: FILLED_ARTIFACT_RELATIVE } : {}),
    outputPath: DRY_RUN_REPORT_RELATIVE,
    intakeDryRunOutputPath: NESTED_INTAKE_RELATIVE,
    generatedAt: GENERATED_AT,
  });
}

describe('plan content reviewer/locale approval intake dry-run command', () => {
  it('writes HOLD without throwing when the filled approval artifact is missing', () => {
    writeBaseInputs();

    const result = writeDryRun();

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-reviewer-locale-approval-intake-dry-run-report-v1',
      status: 'HOLD',
      dryRunStatus: 'MISSING_FILLED_ARTIFACT',
      sourcePacketRows: 2,
      sourcePacketReviewerApprovedRows: 0,
      sourcePacketLocalePassedRows: 0,
      activationApproved: false,
      productionActivationApproved: false,
    });
    expect(result.report.filledArtifactValidation).toMatchObject({
      status: 'missing',
      decisionsValidForIntake: false,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
    });
    expect(result.report.intakeDryRun).toMatchObject({
      status: 'missing',
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      totalRows: 2,
    });
    expect(result.report.blockers).toEqual(['filled reviewer/locale approval artifact is missing']);
  });

  it('passes only when a valid external filled artifact can pass the intake gate', () => {
    writeBaseInputs();
    writeFilledArtifact(filledArtifact());

    const result = writeDryRun({ filledArtifact: true });

    expect(result.report).toMatchObject({
      status: 'PASS',
      dryRunStatus: 'READY_FOR_INTAKE',
      sourcePacketReviewerApprovedRows: 0,
      sourcePacketLocalePassedRows: 0,
      activationApproved: false,
      productionActivationApproved: false,
      blockers: [],
    });
    expect(result.report.filledArtifactValidation).toMatchObject({
      status: 'PASS',
      decisionsValidForIntake: true,
      reviewerApprovedRows: 2,
      localePassedRows: 2,
    });
    expect(result.report.intakeDryRun).toMatchObject({
      status: 'PASS',
      approvalStatus: 'PASS',
      reviewerApprovedRows: 2,
      localePassedRows: 2,
      totalRows: 2,
      reviewerLocaleApprovalComplete: true,
      blockers: [],
    });
    expect(fs.existsSync(path.join(ROOT, NESTED_INTAKE_RELATIVE))).toBe(true);
  });

  it('writes HOLD and throws for a partial filled artifact', () => {
    writeBaseInputs();
    writeFilledArtifact(filledArtifact({
      decisions: filledArtifact().decisions.slice(0, 1),
    }));

    expect(() => writeDryRun({ filledArtifact: true })).toThrow('Reviewer/locale approval intake dry-run failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, DRY_RUN_REPORT_RELATIVE), 'utf8')) as DryRunReport;
    expect(report.status).toBe('HOLD');
    expect(report.dryRunStatus).toBe('HOLD');
    expect(report.filledArtifactValidation.status).toBe('HOLD');
    expect(report.blockers).toEqual(expect.arrayContaining([
      'filled reviewer/locale approval artifact decisions must cover every packet row: 1/2',
      `filled reviewer/locale approval artifact is missing decision en:ru:echo:2:${HASH_B}`,
    ]));
  });

  it('writes HOLD and throws for mismatched source/target/hash evidence', () => {
    writeBaseInputs();
    writeFilledArtifact(filledArtifact({
      studyTarget: 'fr',
      decisions: [
        {
          ...filledArtifact().decisions[0],
          studyTarget: 'fr',
          contentHash: HASH_B,
        },
        filledArtifact().decisions[1],
      ],
    }));

    expect(() => writeDryRun({ filledArtifact: true })).toThrow('Reviewer/locale approval intake dry-run failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, DRY_RUN_REPORT_RELATIVE), 'utf8')) as DryRunReport;
    expect(report.status).toBe('HOLD');
    expect(report.filledArtifactValidation.blockers).toEqual(expect.arrayContaining([
      'filled reviewer/locale approval artifact studyTarget must match approval packet',
      `filled reviewer/locale approval decision fr:ru:echo:1:${HASH_B} is not in packet`,
      `filled reviewer/locale approval artifact is missing decision en:ru:echo:1:${HASH_A}`,
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeBaseInputs();

    expect(() => writePlanContentReviewerLocaleApprovalIntakeDryRun(ROOT, {
      approvalPacketReportPath: PACKET_RELATIVE,
      disabledReviewerLocaleIntakePath: SOURCE_INTAKE_RELATIVE,
      outputPath: 'docs/specs/__plan_content_reviewer_locale_approval_intake_dry_run_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Reviewer/locale approval intake dry-run output must stay under .codex-tmp');
  });

  it('keeps approval intake dry-run tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_reviewer_locale_approval_intake_dry_run.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|storageMigrationApproved: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_reviewer_locale_approval_intake_dry_run|reviewer-locale-approval-intake-dry-run/i);
    }
  });
});
