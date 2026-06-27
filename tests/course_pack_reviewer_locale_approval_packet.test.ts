import fs from 'fs';
import path from 'path';

import {
  buildCoursePackReviewerLocaleApprovalPacket,
  validateCoursePackFilledReviewerLocaleApprovalArtifact,
  type CoursePackReviewerLocaleApprovalPacketInput,
  type CoursePackReviewerLocaleApprovalPacketReport,
  type CoursePackReviewerLocaleFilledApprovalArtifact,
} from '../app/course_pack_reviewer_locale_approval_packet';
import type { CoursePackReviewerLocaleIntakeReport } from '../app/course_pack_reviewer_locale_intake';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function safeHoldIntake(
  overrides: Partial<CoursePackReviewerLocaleIntakeReport> = {},
): CoursePackReviewerLocaleIntakeReport {
  return {
    schemaVersion: 'course-pack-reviewer-locale-intake-v1',
    status: 'HOLD',
    safetyStatus: 'PASS',
    approvalStatus: 'HOLD',
    packId: 'en.ru.plan_content.staging.shadow.approval-packet.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    contentVersion: 'staging.shadow.approval-packet.test',
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

function validInput(
  overrides: Partial<CoursePackReviewerLocaleApprovalPacketInput> = {},
): CoursePackReviewerLocaleApprovalPacketInput {
  return {
    intake: safeHoldIntake(),
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
    ...overrides,
  };
}

function validPacket(): CoursePackReviewerLocaleApprovalPacketReport {
  return buildCoursePackReviewerLocaleApprovalPacket(validInput());
}

function filledArtifact(
  packet = validPacket(),
  overrides: Partial<CoursePackReviewerLocaleFilledApprovalArtifact> = {},
): CoursePackReviewerLocaleFilledApprovalArtifact {
  return {
    schemaVersion: 'plan-content-reviewer-locale-approval-v1',
    status: 'PASS',
    packId: packet.packId,
    studyTarget: packet.studyTarget,
    sourceLocale: packet.sourceLocale,
    surface: packet.surface,
    contentVersion: packet.contentVersion,
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
    decisions: packet.packetRows.map((row) => ({
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
    })),
    ...overrides,
  };
}

describe('course pack reviewer/locale approval packet', () => {
  it('builds a ready-for-review packet from safe HOLD intake without approvals', () => {
    const packet = buildCoursePackReviewerLocaleApprovalPacket(validInput());

    expect(packet).toMatchObject({
      schemaVersion: 'course-pack-reviewer-locale-approval-packet-v1',
      status: 'PASS',
      packetStatus: 'READY_FOR_REVIEW',
      sourceIntakeStatus: 'HOLD',
      sourceIntakeSafetyStatus: 'PASS',
      sourceIntakeApprovalStatus: 'HOLD',
      totalRows: 2,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      reviewerLocaleApprovalComplete: false,
      activationApprovalComplete: false,
      blockers: [],
    });
    expect(packet.packetRows).toHaveLength(2);
    expect(packet.packetRows[0]).toMatchObject({
      studyTarget: 'en',
      sourceLocale: 'ru',
      reviewerStatus: 'unreviewed',
      localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '',
      localeEvidenceId: '',
      requiredReviewerStatus: 'approved',
      requiredLocaleGateStatus: 'passed',
    });
  });

  it('does not let a generated packet validate itself as a filled approval artifact', () => {
    const packet = validPacket();
    const validation = validateCoursePackFilledReviewerLocaleApprovalArtifact(packet, undefined);

    expect(validation).toMatchObject({
      schemaVersion: 'course-pack-reviewer-locale-filled-approval-validation-v1',
      status: 'HOLD',
      decisionsValidForIntake: false,
      decisionRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      reviewerLocaleApprovalComplete: false,
      activationApprovalComplete: false,
    });
    expect(validation.blockers).toEqual(expect.arrayContaining([
      'filled reviewer/locale approval artifact must be provided',
      'filled reviewer/locale approval artifact decisions must be an array',
      'filled reviewer/locale approval artifact decisions must cover every packet row: 0/2',
    ]));
  });

  it('accepts a filled artifact only when every packet row has matching explicit evidence', () => {
    const packet = validPacket();
    const validation = validateCoursePackFilledReviewerLocaleApprovalArtifact(packet, filledArtifact(packet));

    expect(validation).toMatchObject({
      status: 'PASS',
      decisionsValidForIntake: true,
      totalRows: 2,
      decisionRows: 2,
      reviewerApprovedRows: 2,
      localePassedRows: 2,
      reviewerLocaleApprovalComplete: true,
      activationApprovalComplete: false,
      blockers: [],
    });
  });

  it('holds partial or mismatched filled artifacts with concrete blockers', () => {
    const packet = validPacket();
    const artifact = filledArtifact(packet, {
      sourceLocale: 'uk',
      decisions: [
        {
          ...filledArtifact(packet).decisions[0],
          sourceLocale: 'uk',
          reviewerEvidenceId: '',
        },
      ],
    });

    const validation = validateCoursePackFilledReviewerLocaleApprovalArtifact(packet, artifact);

    expect(validation.status).toBe('HOLD');
    expect(validation.decisionsValidForIntake).toBe(false);
    expect(validation.blockers).toEqual(expect.arrayContaining([
      'filled reviewer/locale approval artifact sourceLocale must match approval packet',
      `filled reviewer/locale approval decision en:uk:echo:1:${HASH_A} is not in packet`,
      'filled reviewer/locale approval artifact decisions must cover every packet row: 1/2',
      `filled reviewer/locale approval artifact is missing decision en:ru:echo:1:${HASH_A}`,
      `filled reviewer/locale approval artifact is missing decision en:ru:echo:2:${HASH_B}`,
    ]));
  });

  it('does not connect approval packet logic to startup, network, storage, or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_reviewer_locale_approval_packet.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/\b(writeFile|mkdir|Remove-Item|unlink|rmdir)\b|fs\.rm|delete\s*\(/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_reviewer_locale_approval_packet|CoursePackReviewerLocaleApprovalPacket|reviewer-locale-approval-packet/i);
    }
  });
});
