import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1ReviewerExportFixture,
} from '../app/personal_plan_gavan_day1_reviewer_export_fixture';
import {
  approveGavanDay1ReviewerExportFixture,
  buildGavanDay1ReviewerApprovalInput,
} from '../app/personal_plan_gavan_day1_reviewer_approval_gate';
import {
  buildGavanDay1ApprovedExportReport,
  type GavanDay1ApprovedExportReport,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import {
  isGavanDay1ApprovedReportArtifactTargetAllowed,
  serializeGavanDay1ApprovedReportArtifact,
  writeGavanDay1ApprovedReportArtifact,
} from '../tools/personal_plan_gavan_day1_approved_report_artifact';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';
const GENERATED_AT = '2026-06-01T12:30:00.000Z';
const ARTIFACT_DIR = path.join(process.cwd(), '.codex-tmp', 'personal-plans-p339-test');

function buildReport(): GavanDay1ApprovedExportReport {
  const fixture = buildGavanDay1ReviewerExportFixture();
  const approvalInput = buildGavanDay1ReviewerApprovalInput(fixture, {
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
  });
  const approvalResult = approveGavanDay1ReviewerExportFixture(fixture, approvalInput);
  if (!approvalResult.approvedExport) {
    throw new Error('Expected approved export in artifact test setup.');
  }

  return buildGavanDay1ApprovedExportReport(approvalResult.approvedExport);
}

describe('Gavan day 1 approved report artifact writer', () => {
  beforeEach(() => {
    if (existsSync(ARTIFACT_DIR)) {
      rmSync(ARTIFACT_DIR, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(ARTIFACT_DIR)) {
      rmSync(ARTIFACT_DIR, { recursive: true, force: true });
    }
  });

  it('serializes deterministic pretty JSON for human inspection', () => {
    const report = buildReport();
    const first = serializeGavanDay1ApprovedReportArtifact(report, { generatedAt: GENERATED_AT });
    const second = serializeGavanDay1ApprovedReportArtifact(report, { generatedAt: GENERATED_AT });
    const parsed = JSON.parse(first);

    expect(first).toBe(second);
    expect(first).toContain('\n  "artifactKind"');
    expect(first.endsWith('\n')).toBe(true);
    expect(parsed).toEqual(expect.objectContaining({
      artifactKind: 'gavan_day1_approved_report_artifact',
      generatedAt: GENERATED_AT,
    }));
    expect(parsed.report).toEqual(expect.objectContaining({
      kind: 'gavan_day1_approved_export_report',
      dayId: 'gavan-week1-day1',
      liveIntegration: false,
    }));
    expect(parsed.report.humanReviewTotals).toEqual({
      displayCards: 7,
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      totalApprovedRows: 45,
    });
    expect(parsed.report.groups.phraseExplanations).toHaveLength(5);
    expect(parsed.report.groups.quizPrompts).toHaveLength(10);
    expect(parsed.report.groups.quizNotes).toHaveLength(30);
  });

  it('writes only to an allowed non-production target', () => {
    const report = buildReport();
    const targetPath = path.join(ARTIFACT_DIR, 'approved-report.json');
    const result = writeGavanDay1ApprovedReportArtifact(report, {
      targetPath,
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(targetPath));
    expect(result.bytesWritten).toBeGreaterThan(500);
    expect(existsSync(targetPath)).toBe(true);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.generatedAt).toBe(GENERATED_AT);
    expect(parsed.report.dayId).toBe('gavan-week1-day1');
    expect(parsed.report.liveIntegration).toBe(false);
  });

  it('allows only .codex-tmp and docs/reports targets', () => {
    expect(isGavanDay1ApprovedReportArtifactTargetAllowed(
      path.join(process.cwd(), '.codex-tmp', 'report.json'),
    )).toBe(true);
    expect(isGavanDay1ApprovedReportArtifactTargetAllowed(
      path.join(process.cwd(), 'docs', 'reports', 'report.json'),
    )).toBe(true);
    expect(isGavanDay1ApprovedReportArtifactTargetAllowed(
      path.join(process.cwd(), 'app', 'report.json'),
    )).toBe(false);
    expect(isGavanDay1ApprovedReportArtifactTargetAllowed(
      path.join(process.cwd(), 'tools', 'report.json'),
    )).toBe(false);
    expect(isGavanDay1ApprovedReportArtifactTargetAllowed(
      path.join(process.cwd(), 'tests', 'report.json'),
    )).toBe(false);
    expect(isGavanDay1ApprovedReportArtifactTargetAllowed(
      path.join(process.cwd(), 'package.json'),
    )).toBe(false);
  });

  it('fails invalid report before writing', () => {
    const report = buildReport();
    const targetPath = path.join(ARTIFACT_DIR, 'invalid-report.json');
    const invalidReport: GavanDay1ApprovedExportReport = {
      ...report,
      groups: {
        ...report.groups,
        quizNotes: report.groups.quizNotes.map((row, index) =>
          index === 0 ? { ...row, reviewStatus: 'needs_manual_review' as 'approved' } : row,
        ),
      },
    };

    const result = writeGavanDay1ApprovedReportArtifact(invalidReport, {
      targetPath,
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_report' }),
    ]));
    expect(existsSync(targetPath)).toBe(false);
  });

  it('rejects source and tooling targets before writing', () => {
    const report = buildReport();
    const targetPath = path.join(process.cwd(), 'tools', 'bad-approved-report.json');
    const result = writeGavanDay1ApprovedReportArtifact(report, {
      targetPath,
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'target_path_not_allowed' }),
    ]));
    expect(existsSync(targetPath)).toBe(false);
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_day1_approved_report_artifact.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from '../app/personal_plan_catalog'");
    expect(source).not.toContain("from '../app/personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
