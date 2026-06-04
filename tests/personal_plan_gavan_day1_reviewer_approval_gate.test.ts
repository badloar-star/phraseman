import { readFileSync } from 'fs';
import path from 'path';
import {
  buildGavanDay1ReviewerExportFixture,
  type GavanDay1ReviewerExportFixture,
} from '../app/personal_plan_gavan_day1_reviewer_export_fixture';
import {
  approveGavanDay1ReviewerExportFixture,
  buildGavanDay1ReviewerApprovalInput,
  checksumGavanDay1ReviewerSnippet,
  validateGavanDay1ApprovedReviewerExport,
  validateGavanDay1ReviewerApprovalGate,
} from '../app/personal_plan_gavan_day1_reviewer_approval_gate';

const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-01T12:00:00.000Z';

function allFixtureSnippets(fixture: GavanDay1ReviewerExportFixture) {
  return [
    ...fixture.phraseExplanationSnippets,
    ...fixture.quizPromptSnippets,
    ...fixture.quizNoteSnippets,
  ];
}

describe('Gavan day 1 reviewer approval gate', () => {
  it('builds explicit approval records for every reviewer export snippet', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();
    const input = buildGavanDay1ReviewerApprovalInput(fixture, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const snippetIds = new Set(allFixtureSnippets(fixture).map((snippet) => snippet.id));

    expect(input.kind).toBe('gavan_day1_reviewer_approval_input');
    expect(input.dayId).toBe('gavan-week1-day1');
    expect(input.liveIntegration).toBe(false);
    expect(input.approvals).toHaveLength(45);
    expect(input.approvals.every((approval) => snippetIds.has(approval.snippetId))).toBe(true);
    expect(input.approvals[0]).toEqual(expect.objectContaining({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      snippetKind: 'phrase_explanation',
      snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
    }));
    expect(input.approvals[0].textChecksum).toBe(
      checksumGavanDay1ReviewerSnippet(fixture.phraseExplanationSnippets[0]),
    );

    const result = validateGavanDay1ReviewerApprovalGate(fixture, input);
    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      totalApproved: 45,
    });
  });

  it('fails partial approval', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();
    const input = buildGavanDay1ReviewerApprovalInput(fixture, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const result = validateGavanDay1ReviewerApprovalGate(fixture, {
      ...input,
      approvals: input.approvals.slice(1),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing_approval_record',
        snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      }),
    ]));
  });

  it('fails unknown snippet ids and invalid approval metadata', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();
    const input = buildGavanDay1ReviewerApprovalInput(fixture, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const result = validateGavanDay1ReviewerApprovalGate(fixture, {
      ...input,
      approvals: [
        ...input.approvals,
        {
          ...input.approvals[0],
          reviewerId: '',
          approvedAt: 'not-a-date',
          snippetId: 'unknown-snippet-id',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown_snippet_id', snippetId: 'unknown-snippet-id' }),
      expect.objectContaining({ code: 'missing_reviewer_id', snippetId: 'unknown-snippet-id' }),
      expect.objectContaining({ code: 'invalid_approved_at', snippetId: 'unknown-snippet-id' }),
    ]));
  });

  it('fails when reviewed text changes after approval', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();
    const input = buildGavanDay1ReviewerApprovalInput(fixture, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const changedFixture: GavanDay1ReviewerExportFixture = {
      ...fixture,
      phraseExplanationSnippets: fixture.phraseExplanationSnippets.map((snippet, index) =>
        index === 0
          ? { ...snippet, explanationBody: `${snippet.explanationBody} Changed after review.` }
          : snippet,
      ),
    };

    const result = validateGavanDay1ReviewerApprovalGate(changedFixture, input);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'text_checksum_mismatch',
        snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      }),
    ]));
  });

  it('builds an approved export and rejects pending snippets inside approved output', () => {
    const fixture = buildGavanDay1ReviewerExportFixture();
    const input = buildGavanDay1ReviewerApprovalInput(fixture, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const result = approveGavanDay1ReviewerExportFixture(fixture, input);

    expect(result.valid).toBe(true);
    expect(result.approvedExport?.kind).toBe('gavan_day1_approved_reviewer_export');
    expect(result.approvedExport?.liveIntegration).toBe(false);
    expect(result.approvedExport?.summary).toEqual({
      phraseExplanations: 5,
      quizPrompts: 10,
      quizNotes: 30,
      totalApproved: 45,
    });
    expect(result.approvedExport?.phraseExplanationSnippets[0]).toEqual(expect.objectContaining({
      reviewStatus: 'approved',
      approval: expect.objectContaining({
        reviewerId: REVIEWER_ID,
        approvedAt: APPROVED_AT,
      }),
    }));

    const tampered = {
      ...result.approvedExport!,
      phraseExplanationSnippets: result.approvedExport!.phraseExplanationSnippets.map((snippet, index) =>
        index === 0
          ? { ...snippet, reviewStatus: 'needs_manual_review' as 'approved' }
          : snippet,
      ),
    };

    expect(validateGavanDay1ApprovedReviewerExport(tampered).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'approved_export_contains_pending_snippet',
        snippetId: 'phrase:gavan-day1-final-p1:explanation-1',
      }),
    ]));
  });

  it('stays outside UI storage live catalog and live quiz registries', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'app', 'personal_plan_gavan_day1_reviewer_approval_gate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toContain("from './personal_plan_catalog'");
    expect(source).not.toContain("from './personal_plan_quizzes'");
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
