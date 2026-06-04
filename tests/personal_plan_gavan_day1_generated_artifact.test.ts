import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  validateGavanDay1ApprovedExportReport,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import {
  auditGavanDay1ApprovedReportArtifact,
  buildCleanGavanDay1ApprovedReport,
  GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH,
  generateGavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_generated_artifact';
import {
  auditGavanDay1ApprovedArtifactCopy,
} from '../tools/personal_plan_gavan_day1_artifact_copy_audit';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-01T12:30:00.000Z';

function allRows(report: ReturnType<typeof buildCleanGavanDay1ApprovedReport>) {
  return [
    ...report.groups.phraseExplanations,
    ...report.groups.quizPrompts,
    ...report.groups.quizNotes,
  ];
}

describe('Gavan day 1 generated approved report artifact', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH)) {
      rmSync(GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH, { force: true });
    }
  });

  afterAll(() => {
    generateGavanDay1ApprovedReportArtifact({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      generatedAt: GENERATED_AT,
    });
  });

  it('builds the clean approved report from fixture to approval to report', () => {
    const report = buildCleanGavanDay1ApprovedReport({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    expect(report.kind).toBe('gavan_day1_approved_export_report');
    expect(report.dayId).toBe('gavan-week1-day1');
    expect(report.liveIntegration).toBe(false);
    expect(report.groups.phraseExplanations).toHaveLength(5);
    expect(report.groups.quizPrompts).toHaveLength(10);
    expect(report.groups.quizNotes).toHaveLength(30);
    expect(validateGavanDay1ApprovedExportReport(report).valid).toBe(true);
  });

  it('generates the first non-production artifact under .codex-tmp', () => {
    const result = generateGavanDay1ApprovedReportArtifact({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-day1-approved-report.json',
    ));
    expect(result.audit.valid).toBe(true);
    expect(existsSync(GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH, 'utf8'));
    expect(parsed.generatedAt).toBe(GENERATED_AT);
    expect(parsed.report.kind).toBe('gavan_day1_approved_export_report');
    expect(parsed.report.dayId).toBe('gavan-week1-day1');
    expect(parsed.report.liveIntegration).toBe(false);
  });

  it('artifact rows are complete and totals match row counts', () => {
    const result = generateGavanDay1ApprovedReportArtifact({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      generatedAt: GENERATED_AT,
    });
    const report = result.report;
    const rows = allRows(report);

    expect(report.humanReviewTotals).toEqual({
      displayCards: 7,
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      totalApprovedRows: 45,
    });
    expect(rows).toHaveLength(45);
    expect(rows.every((row) => row.exactText.trim().length > 0)).toBe(true);
    expect(rows.every((row) => row.reviewerId === REVIEWER_ID)).toBe(true);
    expect(rows.every((row) => row.approvedAt === APPROVED_AT)).toBe(true);
    expect(rows.every((row) => /^fnv1a:[0-9a-f]{8}$/.test(row.textChecksum))).toBe(true);
  });

  it('can be parsed back and validated as an approved export report', () => {
    generateGavanDay1ApprovedReportArtifact({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      generatedAt: GENERATED_AT,
    });

    const parsed = JSON.parse(readFileSync(GAVAN_DAY1_APPROVED_REPORT_ARTIFACT_PATH, 'utf8'));
    const validation = validateGavanDay1ApprovedExportReport(parsed.report);

    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
  });

  it('artifact audit returns readability and completeness summary', () => {
    const result = generateGavanDay1ApprovedReportArtifact({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      generatedAt: GENERATED_AT,
    });
    const audit = auditGavanDay1ApprovedReportArtifact(result.artifact);

    expect(audit.valid).toBe(true);
    expect(audit.summary).toEqual({
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      totalRows: 45,
      rowsWithExactText: 45,
      rowsWithApprovalMetadata: 45,
      rowsWithChecksum: 45,
    });
  });

  it('passes the product-copy audit before any production bridge draft', () => {
    const result = generateGavanDay1ApprovedReportArtifact({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      generatedAt: GENERATED_AT,
    });
    const copyAudit = auditGavanDay1ApprovedArtifactCopy(result.artifact);

    expect(copyAudit.valid).toBe(true);
    expect(copyAudit.issues).toEqual([]);
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_generated_artifact.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
