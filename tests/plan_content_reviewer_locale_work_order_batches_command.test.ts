import fs from 'fs';
import path from 'path';

import { writePlanContentReviewerLocaleWorkOrderBatches } from '../scripts/plan_content_reviewer_locale_work_order_batches';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/reviewer-locale-work-order-batches';
const PACKET_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-packet.json`;
const DRY_RUN_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-intake-dry-run.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-decision-work-order-batches.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.work-order.command.test';
const CONTENT_VERSION = 'staging.shadow.work-order.command.test';

type WorkOrderReport = {
  status: string;
  workOrderStatus: string;
  totalRows: number;
  batchSize: number;
  batchCount: number;
  reviewerApprovedRows: number;
  localePassedRows: number;
  generatedFilledApprovalArtifact: boolean;
  duplicateRowIds: string[];
  missingPacketRows: unknown[];
  batches: Array<{
    batchId: string;
    rowCount: number;
    rows: Array<{
      rowId: string;
      reviewerStatus: string;
      localeGateStatus: string;
      reviewerEvidenceId: string;
      localeEvidenceId: string;
    }>;
  }>;
  blockers: string[];
};

function packetRows(overrides: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  return [
    {
      planId: 'echo',
      dayIndex: 1,
      path: 'plans/echo/day-001.json',
      contentHash: HASH_A,
      studyTarget: 'en',
      sourceLocale: 'ru',
      reviewerStatus: 'unreviewed',
      localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '',
      localeEvidenceId: '',
      requiredReviewerStatus: 'approved',
      requiredLocaleGateStatus: 'passed',
      ...(overrides[0] ?? {}),
    },
    {
      planId: 'echo',
      dayIndex: 2,
      path: 'plans/echo/day-002.json',
      contentHash: HASH_B,
      studyTarget: 'en',
      sourceLocale: 'ru',
      reviewerStatus: 'unreviewed',
      localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '',
      localeEvidenceId: '',
      requiredReviewerStatus: 'approved',
      requiredLocaleGateStatus: 'passed',
      ...(overrides[1] ?? {}),
    },
    {
      planId: 'gavan',
      dayIndex: 1,
      path: 'plans/gavan/day-001.json',
      contentHash: HASH_C,
      studyTarget: 'en',
      sourceLocale: 'ru',
      reviewerStatus: 'unreviewed',
      localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '',
      localeEvidenceId: '',
      requiredReviewerStatus: 'approved',
      requiredLocaleGateStatus: 'passed',
      ...(overrides[2] ?? {}),
    },
  ];
}

function writeInputs(overrides: {
  rows?: Array<Record<string, unknown>>;
  packet?: Record<string, unknown>;
  dryRun?: Record<string, unknown>;
} = {}): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
  const rows = overrides.rows ?? packetRows();
  const baseIdentity = {
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: CONTENT_VERSION,
    activationApproved: false,
    productionActivationApproved: false,
  };
  fs.writeFileSync(path.join(ROOT, PACKET_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-reviewer-locale-approval-packet-report-v1',
    status: 'PASS',
    generatedAt: GENERATED_AT,
    ...baseIdentity,
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
    packet: {
      schemaVersion: 'course-pack-reviewer-locale-approval-packet-v1',
      status: 'PASS',
      packetStatus: 'READY_FOR_REVIEW',
      ...baseIdentity,
      remoteLoadingEnabled: false,
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
      totalRows: rows.length,
      sourceIntakeStatus: 'HOLD',
      sourceIntakeSafetyStatus: 'PASS',
      sourceIntakeApprovalStatus: 'HOLD',
      sourceReviewerApprovedRows: 0,
      sourceLocalePassedRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      reviewerLocaleApprovalComplete: false,
      activationApprovalComplete: false,
      packetRows: rows,
      blockers: [],
    },
    evidenceBlockers: [],
    blockers: [],
    ...overrides.packet,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DRY_RUN_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-reviewer-locale-approval-intake-dry-run-report-v1',
    status: 'HOLD',
    dryRunStatus: 'MISSING_FILLED_ARTIFACT',
    generatedAt: GENERATED_AT,
    ...baseIdentity,
    filledArtifactValidation: {
      schemaVersion: 'course-pack-reviewer-locale-filled-approval-validation-v1',
      status: 'missing',
    },
    intakeDryRun: {
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      totalRows: rows.length,
    },
    blockers: ['filled reviewer/locale approval artifact is missing'],
    ...overrides.dryRun,
  }, null, 2)}\n`, 'utf8');
}

function writeReport(options: { batchSize?: number } = {}) {
  return writePlanContentReviewerLocaleWorkOrderBatches(ROOT, {
    approvalPacketReportPath: PACKET_RELATIVE,
    approvalIntakeDryRunPath: DRY_RUN_RELATIVE,
    outputPath: REPORT_RELATIVE,
    generatedAt: GENERATED_AT,
    batchSize: options.batchSize,
  });
}

describe('plan content reviewer/locale work-order batches command', () => {
  it('writes deterministic unfilled reviewer/locale work-order batches', () => {
    writeInputs();

    const result = writeReport({ batchSize: 2 });

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-reviewer-locale-work-order-batches-v1',
      status: 'PASS',
      workOrderStatus: 'READY_FOR_REVIEW',
      totalRows: 3,
      batchSize: 2,
      batchCount: 2,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      generatedFilledApprovalArtifact: false,
      duplicateRowIds: [],
      missingPacketRows: [],
      blockers: [],
    });
    expect(result.report.batches.map((batch) => batch.rowCount)).toEqual([2, 1]);
    for (const row of result.report.batches.flatMap((batch) => batch.rows)) {
      expect(row.reviewerStatus).toBe('unreviewed');
      expect(row.localeGateStatus).toBe('unreviewed');
      expect(row.reviewerEvidenceId).toBe('');
      expect(row.localeEvidenceId).toBe('');
    }
  });

  it('fails closed when approval intake dry-run is already ready or inconsistent', () => {
    writeInputs({
      dryRun: {
        status: 'PASS',
        dryRunStatus: 'READY_FOR_INTAKE',
        filledArtifactValidation: { status: 'PASS' },
        intakeDryRun: {
          reviewerApprovedRows: 3,
          localePassedRows: 3,
          totalRows: 3,
        },
      },
    });

    expect(() => writeReport()).toThrow('Reviewer/locale work-order batches failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as WorkOrderReport;
    expect(report.status).toBe('HOLD');
    expect(report.blockers).toEqual(expect.arrayContaining([
      'approval intake dry-run must be MISSING_FILLED_ARTIFACT before work-order batching',
      'approval intake dry-run filledArtifactValidation must be missing before work-order batching',
      'approval intake dry-run reviewerApprovedRows must remain 0',
      'approval intake dry-run localePassedRows must remain 0',
    ]));
  });

  it('detects duplicate packet rows before writing a ready work-order', () => {
    writeInputs({
      rows: packetRows([{ dayIndex: 1, contentHash: HASH_A }, { dayIndex: 1, contentHash: HASH_A }]),
    });

    expect(() => writeReport()).toThrow('Reviewer/locale work-order batches failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as WorkOrderReport;
    expect(report.status).toBe('HOLD');
    expect(report.duplicateRowIds).toHaveLength(1);
    expect(report.blockers[0]).toMatch(/duplicate work-order row ids/);
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentReviewerLocaleWorkOrderBatches(ROOT, {
      approvalPacketReportPath: PACKET_RELATIVE,
      approvalIntakeDryRunPath: DRY_RUN_RELATIVE,
      outputPath: 'docs/specs/__plan_content_reviewer_locale_work_order_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Reviewer/locale work-order output must stay under .codex-tmp');
  });

  it('keeps work-order tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_reviewer_locale_work_order_batches.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|storageMigrationApproved: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_reviewer_locale_work_order_batches|reviewer-locale-decision-work-order-batches/i);
    }
  });
});
