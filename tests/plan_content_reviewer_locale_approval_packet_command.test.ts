import fs from 'fs';
import path from 'path';

import type { CoursePackReviewerLocaleIntakeReport } from '../app/course_pack_reviewer_locale_intake';
import type { CoursePackReviewerLocaleFilledApprovalArtifact } from '../app/course_pack_reviewer_locale_approval_packet';
import { writePlanContentReviewerLocaleApprovalPacket } from '../scripts/plan_content_reviewer_locale_approval_packet';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/reviewer-locale-approval-packet';
const INTAKE_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-reviewer-locale-intake.json`;
const FILLED_ARTIFACT_RELATIVE = `${RUN_ROOT_RELATIVE}/filled-reviewer-locale-approval.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/reviewer-locale-approval-packet.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.approval-packet.command.test';
const CONTENT_VERSION = 'staging.shadow.approval-packet.command.test';

type ApprovalPacketReport = {
  status: string;
  packet: {
    status: string;
    packetStatus: string;
    totalRows: number;
    reviewerApprovedRows: number;
    localePassedRows: number;
    activationApprovalComplete: boolean;
    packetRows: Array<{
      planId: string;
      dayIndex: number;
      path: string;
      contentHash: string;
      studyTarget: string;
      sourceLocale: string;
    }>;
  };
  filledArtifactValidation: {
    status: string;
    decisionsValidForIntake: boolean;
    reviewerApprovedRows: number;
    localePassedRows: number;
    activationApprovalComplete: boolean;
    blockers: string[];
  };
  evidenceBlockers: string[];
  blockers: string[];
};

function safeHoldIntake(
  overrides: Partial<CoursePackReviewerLocaleIntakeReport> = {},
): CoursePackReviewerLocaleIntakeReport {
  return {
    schemaVersion: 'course-pack-reviewer-locale-intake-v1',
    status: 'HOLD',
    safetyStatus: 'PASS',
    approvalStatus: 'HOLD',
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: CONTENT_VERSION,
    remoteLoadingEnabled: false,
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
    cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    totalRows: 2,
    serverShadowRowsRead: 2,
    explicitApprovalArtifactPresent: false,
    explicitDecisionRows: 0,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    shadowReviewStatusCounts: {
      approved: 0,
      shadow: 2,
      hold: 0,
      rejected: 0,
    },
    shadowLocaleGateStatusCounts: {
      passed: 0,
      hold: 2,
      failed: 0,
    },
    shadowReviewerApprovedRows: 0,
    shadowLocalePassedRows: 0,
    shadowAutoApprovalDetected: false,
    reviewerLocaleApprovalComplete: false,
    missingReviewerApprovalRows: [
      {
        planId: 'echo',
        dayIndex: 1,
        path: 'plans/echo/day-001.json',
        contentHash: HASH_A,
      },
      {
        planId: 'echo',
        dayIndex: 2,
        path: 'plans/echo/day-002.json',
        contentHash: HASH_B,
      },
    ],
    missingLocaleGateRows: [
      {
        planId: 'echo',
        dayIndex: 1,
        path: 'plans/echo/day-001.json',
        contentHash: HASH_A,
      },
      {
        planId: 'echo',
        dayIndex: 2,
        path: 'plans/echo/day-002.json',
        contentHash: HASH_B,
      },
    ],
    safetyBlockers: [],
    approvalBlockers: [
      'reviewer approval required for every row: approved 0/2',
      'locale gate required for every row: passed 0/2',
    ],
    blockers: [
      'reviewer approval required for every row: approved 0/2',
      'locale gate required for every row: passed 0/2',
    ],
    ...overrides,
  };
}

function writeIntake(intake = safeHoldIntake(), envelopeOverrides: Record<string, unknown> = {}): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
  fs.writeFileSync(path.join(ROOT, INTAKE_RELATIVE), `${JSON.stringify({
    schemaVersion: 'plan-content-disabled-reviewer-locale-intake-report-v1',
    status: 'HOLD',
    safetyStatus: 'PASS',
    approvalStatus: 'HOLD',
    generatedAt: GENERATED_AT,
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: CONTENT_VERSION,
    reviewerLocale: intake,
    evidenceBlockers: [],
    blockers: intake.blockers,
    ...envelopeOverrides,
  }, null, 2)}\n`, 'utf8');
}

function filledArtifact(overrides: Partial<CoursePackReviewerLocaleFilledApprovalArtifact> = {}): CoursePackReviewerLocaleFilledApprovalArtifact {
  const intake = safeHoldIntake();
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
    decisions: intake.missingReviewerApprovalRows.map((row) => ({
      planId: row.planId,
      dayIndex: row.dayIndex,
      path: row.path,
      contentHash: row.contentHash,
      studyTarget: 'en',
      sourceLocale: 'ru',
      reviewerStatus: 'approved',
      localeGateStatus: 'passed',
      reviewerEvidenceId: `review:${row.planId}:${row.dayIndex}`,
      localeEvidenceId: `locale:${row.planId}:${row.dayIndex}`,
    })),
    ...overrides,
  };
}

function writeFilledArtifact(artifact: Partial<CoursePackReviewerLocaleFilledApprovalArtifact>): void {
  fs.writeFileSync(path.join(ROOT, FILLED_ARTIFACT_RELATIVE), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
}

function writeReport(options: { filledArtifact?: boolean } = {}) {
  return writePlanContentReviewerLocaleApprovalPacket(ROOT, {
    disabledReviewerLocaleIntakePath: INTAKE_RELATIVE,
    ...(options.filledArtifact ? { filledApprovalArtifactPath: FILLED_ARTIFACT_RELATIVE } : {}),
    outputPath: REPORT_RELATIVE,
    generatedAt: GENERATED_AT,
  });
}

describe('plan content reviewer/locale approval packet command', () => {
  it('writes a PASS packet with queued rows and no generated approvals', () => {
    writeIntake();

    const result = writeReport();

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-reviewer-locale-approval-packet-report-v1',
      status: 'PASS',
      activationApproved: false,
      productionActivationApproved: false,
      evidenceBlockers: [],
      blockers: [],
    });
    expect(result.report.packet).toMatchObject({
      status: 'PASS',
      packetStatus: 'READY_FOR_REVIEW',
      totalRows: 2,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      activationApprovalComplete: false,
    });
    expect(result.report.filledArtifactValidation).toMatchObject({
      status: 'missing',
      decisionsValidForIntake: false,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      activationApprovalComplete: false,
      blockers: [],
    });
    expect(result.report.packet.packetRows).toHaveLength(2);
  });

  it('validates a filled approval artifact without activating runtime flags', () => {
    writeIntake();
    writeFilledArtifact(filledArtifact());

    const result = writeReport({ filledArtifact: true });

    expect(result.report.status).toBe('PASS');
    expect(result.report.packet.reviewerApprovedRows).toBe(0);
    expect(result.report.packet.localePassedRows).toBe(0);
    expect(result.report.filledArtifactValidation).toMatchObject({
      status: 'PASS',
      decisionsValidForIntake: true,
      reviewerApprovedRows: 2,
      localePassedRows: 2,
      activationApprovalComplete: false,
      blockers: [],
    });
    expect(result.report.productionActivationApproved).toBe(false);
  });

  it('writes HOLD and throws for an invalid filled approval artifact', () => {
    writeIntake();
    writeFilledArtifact(filledArtifact({
      decisions: [
        {
          ...filledArtifact().decisions[0],
          reviewerEvidenceId: '',
        },
      ],
    }));

    expect(() => writeReport({ filledArtifact: true })).toThrow('Filled reviewer/locale approval artifact failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as ApprovalPacketReport;
    expect(report.status).toBe('HOLD');
    expect(report.filledArtifactValidation.status).toBe('HOLD');
    expect(report.filledArtifactValidation.blockers).toEqual(expect.arrayContaining([
      'filled reviewer/locale approval artifact decisions must cover every packet row: 1/2',
      `filled reviewer/locale approval decision en:ru:echo:1:${HASH_A} approved reviewerStatus requires reviewerEvidenceId`,
      `filled reviewer/locale approval artifact is missing decision en:ru:echo:2:${HASH_B}`,
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeIntake();

    expect(() => writePlanContentReviewerLocaleApprovalPacket(ROOT, {
      disabledReviewerLocaleIntakePath: INTAKE_RELATIVE,
      outputPath: 'docs/specs/__plan_content_reviewer_locale_approval_packet_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Reviewer/locale approval packet output must stay under .codex-tmp');
  });

  it('keeps approval packet tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_reviewer_locale_approval_packet.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|storageMigrationApproved: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_reviewer_locale_approval_packet|course_pack_reviewer_locale_approval_packet|reviewer-locale-approval-packet/i);
    }
  });
});
