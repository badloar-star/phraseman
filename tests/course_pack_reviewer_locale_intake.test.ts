import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateCoursePackReviewerLocaleIntake,
  type CoursePackReviewerLocaleDecision,
  type CoursePackReviewerLocaleIntakeInput,
  type CoursePackReviewerLocaleRow,
} from '../app/course_pack_reviewer_locale_intake';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.reviewer-locale.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.reviewer-locale.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function rows(overrides: Partial<CoursePackReviewerLocaleRow>[] = []): CoursePackReviewerLocaleRow[] {
  const baseRows: CoursePackReviewerLocaleRow[] = [
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
    },
  ];
  return baseRows.map((row, index) => ({
    ...row,
    ...(overrides[index] ?? {}),
  }));
}

function approvalDecisions(indexRows = rows()): CoursePackReviewerLocaleDecision[] {
  return indexRows.map((row) => ({
    planId: row.planId,
    dayIndex: row.dayIndex,
    contentHash: row.contentHash,
    studyTarget: row.studyTarget,
    sourceLocale: row.sourceLocale,
    reviewerStatus: 'approved',
    localeGateStatus: 'passed',
    reviewerEvidenceId: `review:${row.planId}:${row.dayIndex}`,
    localeEvidenceId: `locale:${row.planId}:${row.dayIndex}`,
  }));
}

function validInput(overrides: Partial<CoursePackReviewerLocaleIntakeInput> = {}): CoursePackReviewerLocaleIntakeInput {
  const indexRows = rows();
  return {
    manifest: overrides.manifest ?? validManifest(),
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
    evidence: {
      serverShadowDualReadStatus: 'PASS',
      serverShadowParityVerdict: 'shadow_parity_passed',
      serverShadowRowsRead: indexRows.length,
      serverShadowReviewerApprovedRows: 0,
      serverShadowLocalePassedRows: 0,
      storageCloudIsolationStatus: 'PASS',
      storageCloudIsolationComplete: true,
      indexRows,
      explicitApprovalArtifactPresent: false,
      explicitDecisions: [],
    },
    ...overrides,
  };
}

describe('course pack reviewer/locale intake', () => {
  it('holds without auto-approving shadow parity rows', () => {
    const report = evaluateCoursePackReviewerLocaleIntake(validInput());

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-reviewer-locale-intake-v1',
      status: 'HOLD',
      safetyStatus: 'PASS',
      approvalStatus: 'HOLD',
      totalRows: 2,
      explicitApprovalArtifactPresent: false,
      explicitDecisionRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      shadowReviewerApprovedRows: 0,
      shadowLocalePassedRows: 0,
      shadowAutoApprovalDetected: false,
      reviewerLocaleApprovalComplete: false,
      safetyBlockers: [],
    });
    expect(report.missingReviewerApprovalRows).toHaveLength(2);
    expect(report.missingLocaleGateRows).toHaveLength(2);
    expect(report.approvalBlockers).toEqual([
      'reviewer approval required for every row: approved 0/2',
      'locale gate required for every row: passed 0/2',
    ]);
  });

  it('passes only when every row has explicit reviewer and locale evidence', () => {
    const indexRows = rows();
    const report = evaluateCoursePackReviewerLocaleIntake(validInput({
      evidence: {
        ...validInput().evidence,
        indexRows,
        explicitApprovalArtifactPresent: true,
        explicitDecisions: approvalDecisions(indexRows),
      },
    }));

    expect(report).toMatchObject({
      status: 'PASS',
      safetyStatus: 'PASS',
      approvalStatus: 'PASS',
      totalRows: 2,
      explicitApprovalArtifactPresent: true,
      explicitDecisionRows: 2,
      reviewerApprovedRows: 2,
      localePassedRows: 2,
      reviewerLocaleApprovalComplete: true,
      safetyBlockers: [],
      approvalBlockers: [],
      blockers: [],
    });
    expect(report.missingReviewerApprovalRows).toEqual([]);
    expect(report.missingLocaleGateRows).toEqual([]);
  });

  it('keeps partial explicit evidence as HOLD without treating it as unsafe', () => {
    const indexRows = rows();
    const report = evaluateCoursePackReviewerLocaleIntake(validInput({
      evidence: {
        ...validInput().evidence,
        indexRows,
        explicitApprovalArtifactPresent: true,
        explicitDecisions: approvalDecisions(indexRows).slice(0, 1),
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.safetyStatus).toBe('PASS');
    expect(report.approvalStatus).toBe('HOLD');
    expect(report.reviewerApprovedRows).toBe(1);
    expect(report.localePassedRows).toBe(1);
    expect(report.missingReviewerApprovalRows).toEqual([
      {
        planId: 'echo',
        dayIndex: 2,
        path: 'plans/echo/day-002.json',
        contentHash: HASH_B,
      },
    ]);
  });

  it('fails safety for shadow auto-approval and mismatched explicit evidence', () => {
    const unsafeRows = rows([{ reviewStatus: 'approved', localeGateStatus: 'passed' }]);
    const report = evaluateCoursePackReviewerLocaleIntake(validInput({
      activationApproved: true,
      storageMigrationApproved: true,
      evidence: {
        ...validInput().evidence,
        serverShadowReviewerApprovedRows: 1,
        serverShadowLocalePassedRows: 1,
        indexRows: unsafeRows,
        explicitApprovalArtifactPresent: true,
        explicitDecisions: [{
          ...approvalDecisions(unsafeRows)[0],
          contentHash: HASH_B,
          reviewerEvidenceId: '',
          localeEvidenceId: '',
        }],
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.safetyStatus).toBe('HOLD');
    expect(report.shadowAutoApprovalDetected).toBe(true);
    expect(report.safetyBlockers).toEqual(expect.arrayContaining([
      'activationApproved must remain false',
      'storageMigrationApproved must remain false',
      'server-shadow reviewer summary must not be used as explicit reviewer approval',
      'server-shadow locale summary must not be used as explicit locale approval',
      'explicit reviewer/locale decision echo:1 contentHash must match index',
      'explicit reviewer/locale decision echo:1 approved reviewerStatus requires reviewerEvidenceId',
      'explicit reviewer/locale decision echo:1 passed localeGateStatus requires localeEvidenceId',
      'echo:1 has approved shadow review status; approvals must come from explicit reviewer artifact',
      'echo:1 has passed shadow locale status; locale passes must come from explicit locale artifact',
    ]));
  });

  it('does not connect intake evidence to startup, network, storage, or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_reviewer_locale_intake.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/\b(writeFile|mkdir|Remove-Item|unlink|rmdir)\b|fs\.rm|delete\s*\(/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_reviewer_locale_intake|CoursePackReviewerLocaleIntake|evaluateCoursePackReviewerLocaleIntake/i);
    }
  });
});
