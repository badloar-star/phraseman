import { readFileSync } from 'fs';
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
  validateGavanDay1ApprovedExportReport,
} from '../app/personal_plan_gavan_day1_approved_export_report';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';

function buildReport() {
  const fixture = buildGavanDay1ReviewerExportFixture();
  const approvalInput = buildGavanDay1ReviewerApprovalInput(fixture, {
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
  });
  const approvalResult = approveGavanDay1ReviewerExportFixture(fixture, approvalInput);
  if (!approvalResult.approvedExport) {
    throw new Error('Expected approved export in report test setup.');
  }

  return buildGavanDay1ApprovedExportReport(approvalResult.approvedExport);
}

describe('Gavan day 1 approved export report', () => {
  it('builds a reviewer-facing report without live integration', () => {
    const report = buildReport();

    expect(report.kind).toBe('gavan_day1_approved_export_report');
    expect(report.dayId).toBe('gavan-week1-day1');
    expect(report.liveIntegration).toBe(false);
    expect(report.releaseDecision).toEqual({
      canRelease: true,
      blockedSections: [],
    });
    expect(report.displayCardSummary).toEqual(expect.objectContaining({
      total: 7,
      ready: 5,
      planned: 2,
      blocked: 0,
    }));
    expect(report.displayCardSummary.cards.map((card) => card.id)).toEqual([
      'content',
      'package',
      'quiz',
      'explanations',
      'listening',
      'pronunciation',
      'release',
    ]);
    expect(validateGavanDay1ApprovedExportReport(report).valid).toBe(true);
  });

  it('groups approved snippet rows with exact text and approval metadata', () => {
    const report = buildReport();

    expect(report.groups.phraseExplanations).toHaveLength(5);
    expect(report.groups.quizPrompts).toHaveLength(10);
    expect(report.groups.quizNotes).toHaveLength(30);
    expect(report.groups.phraseExplanations[0]).toEqual(expect.objectContaining({
      snippetKind: 'phrase_explanation',
      snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      reviewStatus: 'approved',
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      exactText: expect.stringContaining("I'm here."),
      coveredTargets: ['here', "I'm"],
      textChecksum: expect.stringMatching(/^fnv1a:[0-9a-f]{8}$/),
    }));
    expect(report.groups.phraseExplanations[0].exactText).not.toMatch(/\shere I'm$/);
    expect(report.groups.phraseExplanations[0].exactText.trim()).toMatch(/[.!?]$/);
    expect(report.groups.quizPrompts[0]).toEqual(expect.objectContaining({
      snippetKind: 'quiz_prompt',
      reviewStatus: 'approved',
      reviewerId: REVIEWER_ID,
    }));
    expect(report.groups.quizNotes[0]).toEqual(expect.objectContaining({
      snippetKind: 'quiz_note',
      reviewStatus: 'approved',
      reviewerId: REVIEWER_ID,
    }));
  });

  it('exposes human-review totals', () => {
    const report = buildReport();

    expect(report.humanReviewTotals).toEqual({
      displayCards: 7,
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      totalApprovedRows: 45,
    });
  });

  it('fails validation when approval metadata is missing', () => {
    const report = buildReport();
    const tampered = {
      ...report,
      groups: {
        ...report.groups,
        phraseExplanations: report.groups.phraseExplanations.map((row, index) =>
          index === 0 ? { ...row, reviewerId: '' } : row,
        ),
      },
    };

    expect(validateGavanDay1ApprovedExportReport(tampered).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing_approval_metadata',
        snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      }),
    ]));
  });

  it('fails validation when checksum does not match exact text', () => {
    const report = buildReport();
    const tampered = {
      ...report,
      groups: {
        ...report.groups,
        quizPrompts: report.groups.quizPrompts.map((row, index) =>
          index === 0 ? { ...row, textChecksum: 'fnv1a:00000000' } : row,
        ),
      },
    };

    expect(validateGavanDay1ApprovedExportReport(tampered).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'checksum_mismatch',
        snippetId: 'quiz:gavan-week1-day1-quiz:item-1:prompt',
      }),
    ]));
  });

  it('fails validation when learner-facing phrase explanation exact text changes', () => {
    const report = buildReport();
    const tampered = {
      ...report,
      groups: {
        ...report.groups,
        phraseExplanations: report.groups.phraseExplanations.map((row, index) =>
          index === 0 ? { ...row, exactText: `${row.exactText} Changed.` } : row,
        ),
      },
    };

    expect(validateGavanDay1ApprovedExportReport(tampered).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'checksum_mismatch',
        snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      }),
    ]));
  });

  it('fails validation when a pending snippet appears in the approved report', () => {
    const report = buildReport();
    const tampered = {
      ...report,
      groups: {
        ...report.groups,
        quizNotes: report.groups.quizNotes.map((row, index) =>
          index === 0 ? { ...row, reviewStatus: 'needs_manual_review' as 'approved' } : row,
        ),
      },
    };

    expect(validateGavanDay1ApprovedExportReport(tampered).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'pending_snippet_in_approved_report',
        snippetId: expect.stringContaining(':note'),
      }),
    ]));
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_approved_export_report.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
