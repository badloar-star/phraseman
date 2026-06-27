import fs from 'fs';
import path from 'path';

import { writePlanContentReviewerLocaleWorkOrderBatches } from '../scripts/plan_content_reviewer_locale_work_order_batches';
import {
  validateCoursePackFilledReviewerLocaleApprovalArtifact,
  type CoursePackReviewerLocaleApprovalPacketReport,
  type CoursePackReviewerLocaleFilledApprovalArtifact,
} from '../app/course_pack_reviewer_locale_approval_packet';
import { writePlanContentReviewerLocaleFilledWorkOrderValidation } from '../scripts/plan_content_reviewer_locale_filled_work_order_validator';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/reviewer-locale-filled-work-order-validator';
const PACKET_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-packet.json`;
const DRY_RUN_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-intake-dry-run.json`;
const WORK_ORDER_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-decision-work-order-batches.json`;
const FILLED_DIR_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-filled-work-order-batches`;
const FILLED_LIST_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-filled-work-order-list.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-filled-work-order-validation.json`;
const CANDIDATE_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-candidate.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const HASH_C = 'c'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.filled-work-order.command.test';
const CONTENT_VERSION = 'staging.shadow.filled-work-order.command.test';

type FilledRow = {
  rowId: string;
  planId: string;
  dayIndex: number;
  path: string;
  contentHash: string;
  studyTarget: string;
  sourceLocale: string;
  reviewerStatus: string;
  localeGateStatus: string;
  reviewerEvidenceId: string;
  localeEvidenceId: string;
};

type ValidationReport = {
  status: string;
  validationStatus: string;
  candidateGenerated: boolean;
  generatedDecisionsOrEvidence: boolean;
  activationApproved: boolean;
  productionActivationApproved: boolean;
  workOrderRows: number;
  filledDecisionRows: number;
  reviewerApprovedRows: number;
  localePassedRows: number;
  duplicateFilledRowIds: string[];
  unknownFilledRowIds: string[];
  missingWorkOrderRowIds: string[];
  candidateArtifactPath?: string;
  evidenceBlockers: string[];
  blockers: string[];
};

function packetRows(): Array<Record<string, unknown>> {
  return [
    {
      planId: 'echo', dayIndex: 1, path: 'plans/echo/day-001.json', contentHash: HASH_A,
      studyTarget: 'en', sourceLocale: 'ru', reviewerStatus: 'unreviewed', localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '', localeEvidenceId: '', requiredReviewerStatus: 'approved', requiredLocaleGateStatus: 'passed',
    },
    {
      planId: 'echo', dayIndex: 2, path: 'plans/echo/day-002.json', contentHash: HASH_B,
      studyTarget: 'en', sourceLocale: 'ru', reviewerStatus: 'unreviewed', localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '', localeEvidenceId: '', requiredReviewerStatus: 'approved', requiredLocaleGateStatus: 'passed',
    },
    {
      planId: 'gavan', dayIndex: 1, path: 'plans/gavan/day-001.json', contentHash: HASH_C,
      studyTarget: 'en', sourceLocale: 'ru', reviewerStatus: 'unreviewed', localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '', localeEvidenceId: '', requiredReviewerStatus: 'approved', requiredLocaleGateStatus: 'passed',
    },
  ];
}

function writeWorkOrder(): { rows: FilledRow[] } {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
  const rows = packetRows();
  const baseIdentity = {
    packId: PACK_ID, studyTarget: 'en', sourceLocale: 'ru', surface: 'plan_content',
    contentVersion: CONTENT_VERSION, activationApproved: false, productionActivationApproved: false,
  };
  fs.writeFileSync(path.join(ROOT, PACKET_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-reviewer-locale-approval-packet-report-v1',
    status: 'PASS', generatedAt: GENERATED_AT, ...baseIdentity,
    runtimeManifestRegistrationApproved: false, runtimeLookupApproved: false, remoteLoadingApproved: false,
    manifestFetchApproved: false, packDownloadApproved: false, cacheLookupApproved: false, cacheReadApproved: false,
    cacheWriteApproved: false, cacheRepairApproved: false, storageMigrationApproved: false, cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false, sourceLocaleMutationApproved: false, bundledContentRemovalApproved: false,
    packet: {
      schemaVersion: 'course-pack-reviewer-locale-approval-packet-v1', status: 'PASS',
      packetStatus: 'READY_FOR_REVIEW', ...baseIdentity, remoteLoadingEnabled: false,
      runtimeManifestRegistrationApproved: false, runtimeLookupApproved: false, remoteLoadingApproved: false,
      manifestFetchApproved: false, packDownloadApproved: false, cacheLookupApproved: false, cacheReadApproved: false,
      cacheWriteApproved: false, cacheRepairApproved: false, storageMigrationApproved: false, cloudRestoreRewriteApproved: false,
      studyTargetMutationApproved: false, sourceLocaleMutationApproved: false, bundledContentRemovalApproved: false,
      totalRows: rows.length, sourceIntakeStatus: 'HOLD', sourceIntakeSafetyStatus: 'PASS', sourceIntakeApprovalStatus: 'HOLD',
      sourceReviewerApprovedRows: 0, sourceLocalePassedRows: 0, reviewerApprovedRows: 0, localePassedRows: 0,
      reviewerLocaleApprovalComplete: false, activationApprovalComplete: false, packetRows: rows, blockers: [],
    },
    evidenceBlockers: [], blockers: [],
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DRY_RUN_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-reviewer-locale-approval-intake-dry-run-report-v1',
    status: 'HOLD', dryRunStatus: 'MISSING_FILLED_ARTIFACT', generatedAt: GENERATED_AT, ...baseIdentity,
    filledArtifactValidation: {
      schemaVersion: 'course-pack-reviewer-locale-filled-approval-validation-v1', status: 'missing',
    },
    intakeDryRun: { reviewerApprovedRows: 0, localePassedRows: 0, totalRows: rows.length },
    blockers: ['filled reviewer/locale approval artifact is missing'],
  }, null, 2)}\n`, 'utf8');

  const workOrder = writePlanContentReviewerLocaleWorkOrderBatches(ROOT, {
    approvalPacketReportPath: PACKET_RELATIVE,
    approvalIntakeDryRunPath: DRY_RUN_RELATIVE,
    outputPath: WORK_ORDER_RELATIVE,
    generatedAt: GENERATED_AT,
    batchSize: 2,
  });

  const filledRows: FilledRow[] = workOrder.report.batches.flatMap((batch) => batch.rows.map((row) => ({
    rowId: row.rowId,
    planId: row.planId,
    dayIndex: row.dayIndex,
    path: row.path,
    contentHash: row.contentHash,
    studyTarget: row.studyTarget,
    sourceLocale: row.sourceLocale,
    reviewerStatus: 'approved',
    localeGateStatus: 'passed',
    reviewerEvidenceId: `review:${row.planId}:${row.dayIndex}`,
    localeEvidenceId: `locale:${row.planId}:${row.dayIndex}`,
  })));
  return { rows: filledRows };
}

function writeFilledBatches(rows: FilledRow[], options: { batchSize?: number } = {}): void {
  const batchSize = options.batchSize ?? 2;
  fs.mkdirSync(path.join(ROOT, FILLED_DIR_RELATIVE), { recursive: true });
  let batchIndex = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    batchIndex += 1;
    const batchRows = rows.slice(index, index + batchSize);
    fs.writeFileSync(
      path.join(ROOT, FILLED_DIR_RELATIVE, `reviewer-locale-batch-${String(batchIndex).padStart(3, '0')}.filled.json`),
      `${JSON.stringify({ batchId: `reviewer-locale-batch-${String(batchIndex).padStart(3, '0')}`, rows: batchRows }, null, 2)}\n`,
      'utf8',
    );
  }
}

function runValidator(options: { useList?: boolean } = {}) {
  return writePlanContentReviewerLocaleFilledWorkOrderValidation(ROOT, {
    workOrderReportPath: WORK_ORDER_RELATIVE,
    ...(options.useList ? { filledBatchesListPath: FILLED_LIST_RELATIVE } : { filledBatchesDir: FILLED_DIR_RELATIVE }),
    outputPath: REPORT_RELATIVE,
    candidateOutputPath: CANDIDATE_RELATIVE,
    generatedAt: GENERATED_AT,
  });
}

function readReport(): ValidationReport {
  return JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as ValidationReport;
}

describe('plan content reviewer/locale filled work-order validator command', () => {
  it('writes HOLD without throwing when external filled batches are missing', () => {
    writeWorkOrder();

    const result = runValidator();

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-reviewer-locale-filled-work-order-validation-v1',
      status: 'HOLD',
      validationStatus: 'MISSING_FILLED_BATCHES',
      candidateGenerated: false,
      generatedDecisionsOrEvidence: false,
      activationApproved: false,
      productionActivationApproved: false,
      workOrderRows: 3,
      filledDecisionRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
    });
    expect(result.report.blockers).toEqual(['external filled reviewer/locale work-order batches are missing']);
    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(false);
  });

  it('assembles a candidate approval artifact when every row is explicitly approved', () => {
    const { rows } = writeWorkOrder();
    writeFilledBatches(rows);

    const result = runValidator();

    expect(result.report).toMatchObject({
      status: 'PASS',
      validationStatus: 'CANDIDATE_ASSEMBLED',
      candidateGenerated: true,
      generatedDecisionsOrEvidence: false,
      activationApproved: false,
      productionActivationApproved: false,
      workOrderRows: 3,
      filledDecisionRows: 3,
      reviewerApprovedRows: 3,
      localePassedRows: 3,
      duplicateFilledRowIds: [],
      unknownFilledRowIds: [],
      missingWorkOrderRowIds: [],
      blockers: [],
    });

    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(true);
    const candidate = JSON.parse(
      fs.readFileSync(path.join(ROOT, CANDIDATE_RELATIVE), 'utf8'),
    ) as CoursePackReviewerLocaleFilledApprovalArtifact;

    // The candidate must be a valid plan-content-reviewer-locale-approval-v1 artifact that the
    // Phase 4F packet validator accepts against the same packet identity.
    expect(candidate.schemaVersion).toBe('plan-content-reviewer-locale-approval-v1');
    expect(candidate.status).toBe('PASS');
    expect(candidate.activationApproved).toBe(false);
    expect(candidate.productionActivationApproved).toBe(false);
    expect(candidate.decisions).toHaveLength(3);
    for (const decision of candidate.decisions) {
      expect(decision.reviewerStatus).toBe('approved');
      expect(decision.localeGateStatus).toBe('passed');
      expect(decision.reviewerEvidenceId.length).toBeGreaterThan(0);
      expect(decision.localeEvidenceId.length).toBeGreaterThan(0);
    }

    const packet = (JSON.parse(fs.readFileSync(path.join(ROOT, PACKET_RELATIVE), 'utf8')) as {
      packet: CoursePackReviewerLocaleApprovalPacketReport;
    }).packet;
    const packetValidation = validateCoursePackFilledReviewerLocaleApprovalArtifact(packet, candidate);
    expect(packetValidation.status).toBe('PASS');
    expect(packetValidation.decisionsValidForIntake).toBe(true);
    expect(packetValidation.reviewerApprovedRows).toBe(3);
    expect(packetValidation.localePassedRows).toBe(3);
  });

  it('accepts a single JSON list artifact instead of a directory of batch files', () => {
    const { rows } = writeWorkOrder();
    fs.writeFileSync(path.join(ROOT, FILLED_LIST_RELATIVE), `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    const result = runValidator({ useList: true });

    expect(result.report.status).toBe('PASS');
    expect(result.report.validationStatus).toBe('CANDIDATE_ASSEMBLED');
    expect(result.report.candidateGenerated).toBe(true);
    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(true);
  });

  it('holds and throws for partial filled batches', () => {
    const { rows } = writeWorkOrder();
    writeFilledBatches(rows.slice(0, 2));

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.validationStatus).toBe('HOLD');
    expect(report.candidateGenerated).toBe(false);
    expect(report.missingWorkOrderRowIds).toEqual([rows[2].rowId]);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `filled reviewer/locale work-order is missing decision ${rows[2].rowId}`,
    ]));
    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(false);
  });

  it('holds and throws for duplicate filled rows', () => {
    const { rows } = writeWorkOrder();
    writeFilledBatches([...rows, rows[0]]);

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.duplicateFilledRowIds).toEqual([rows[0].rowId]);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `duplicate filled reviewer/locale decision ${rows[0].rowId}`,
    ]));
    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(false);
  });

  it('holds and throws for wrong studyTarget, sourceLocale, hash or path', () => {
    const { rows } = writeWorkOrder();
    const tampered = rows.map((row, index) => {
      if (index === 0) return { ...row, studyTarget: 'fr' };
      if (index === 1) return { ...row, contentHash: 'd'.repeat(64) };
      return { ...row, sourceLocale: 'uk', path: 'plans/gavan/day-999.json' };
    });
    writeFilledBatches(tampered);

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.candidateGenerated).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `filled reviewer/locale decision ${rows[0].rowId} studyTarget must match the work-order`,
      `filled reviewer/locale decision ${rows[1].rowId} contentHash must match the work-order`,
      `filled reviewer/locale decision ${rows[2].rowId} sourceLocale must match the work-order`,
      `filled reviewer/locale decision ${rows[2].rowId} path must match the work-order`,
    ]));
  });

  it('holds and throws for non-approved reviewer or non-passed locale decisions', () => {
    const { rows } = writeWorkOrder();
    const tampered = rows.map((row, index) => {
      if (index === 0) return { ...row, reviewerStatus: 'hold' };
      if (index === 1) return { ...row, localeGateStatus: 'failed' };
      return row;
    });
    writeFilledBatches(tampered);

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.candidateGenerated).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `filled reviewer/locale decision ${rows[0].rowId} reviewerStatus must be approved`,
      `filled reviewer/locale decision ${rows[1].rowId} localeGateStatus must be passed`,
    ]));
  });

  it('holds and throws for empty reviewer or locale evidence ids', () => {
    const { rows } = writeWorkOrder();
    const tampered = rows.map((row, index) => {
      if (index === 0) return { ...row, reviewerEvidenceId: '' };
      if (index === 1) return { ...row, localeEvidenceId: '   ' };
      return row;
    });
    writeFilledBatches(tampered);

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.candidateGenerated).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `filled reviewer/locale decision ${rows[0].rowId} approved reviewerStatus requires a non-empty reviewerEvidenceId`,
      `filled reviewer/locale decision ${rows[1].rowId} passed localeGateStatus requires a non-empty localeEvidenceId`,
    ]));
  });

  it('holds and throws for unknown filled rows that are not in the work-order', () => {
    const { rows } = writeWorkOrder();
    const extra: FilledRow = {
      rowId: 'en:ru:ghost:1:f'.padEnd('en:ru:ghost:1:'.length + 64, 'f'),
      planId: 'ghost', dayIndex: 1, path: 'plans/ghost/day-001.json', contentHash: 'f'.repeat(64),
      studyTarget: 'en', sourceLocale: 'ru', reviewerStatus: 'approved', localeGateStatus: 'passed',
      reviewerEvidenceId: 'review:ghost:1', localeEvidenceId: 'locale:ghost:1',
    };
    writeFilledBatches([...rows, extra]);

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.unknownFilledRowIds).toEqual([extra.rowId]);
    expect(report.blockers).toEqual(expect.arrayContaining([
      `filled reviewer/locale decision ${extra.rowId} is not in the work-order`,
    ]));
  });

  it('fails closed when the upstream work-order report is not a clean PASS', () => {
    writeWorkOrder();
    const tampered = JSON.parse(fs.readFileSync(path.join(ROOT, WORK_ORDER_RELATIVE), 'utf8'));
    tampered.reviewerApprovedRows = 3;
    fs.writeFileSync(path.join(ROOT, WORK_ORDER_RELATIVE), `${JSON.stringify(tampered, null, 2)}\n`, 'utf8');

    expect(() => runValidator()).toThrow('Reviewer/locale filled work-order validation evidence failed');

    const report = readReport();
    expect(report.status).toBe('HOLD');
    expect(report.evidenceBlockers).toEqual(expect.arrayContaining([
      'work-order report reviewerApprovedRows must remain 0',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeWorkOrder();

    expect(() => writePlanContentReviewerLocaleFilledWorkOrderValidation(ROOT, {
      workOrderReportPath: WORK_ORDER_RELATIVE,
      filledBatchesDir: FILLED_DIR_RELATIVE,
      outputPath: 'docs/specs/__plan_content_filled_work_order_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Reviewer/locale filled work-order validation output must stay under .codex-tmp');
  });

  it('keeps filled work-order validator tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(
      path.join(ROOT, 'scripts', 'plan_content_reviewer_locale_filled_work_order_validator.ts'),
      'utf8',
    );
    expect(scriptSource).not.toMatch(/firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|storageMigrationApproved: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_reviewer_locale_filled_work_order_validator|reviewer-locale-filled-work-order-validation|reviewer-locale-approval-candidate/i);
    }
  });
});
