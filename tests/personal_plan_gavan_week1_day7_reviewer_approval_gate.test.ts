import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day7BlueprintCandidate,
} from '../tools/personal_plan_gavan_week1_day7_blueprint_candidate';
import {
  buildGavanWeek1Day7ReviewerExport,
  type GavanWeek1Day7ReviewerExport,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_export';
import {
  approveGavanWeek1Day7ReviewerExport,
  buildGavanWeek1Day7ReviewerApprovalInput,
  checksumGavanWeek1Day7ReviewerRow,
  GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH,
  validateGavanWeek1Day7ApprovedReviewerExport,
  validateGavanWeek1Day7ReviewerApprovalGate,
  writeGavanWeek1Day7ApprovedReviewerExport,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_approval_gate';

const GENERATED_AT = '2026-06-03T01:45:00.000Z';
const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-03T01:50:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

function reviewExport(): GavanWeek1Day7ReviewerExport {
  const standards = buildGavanWeek1ExpansionStandards({ generatedAt: GENERATED_AT });
  const candidate = buildGavanWeek1Day7BlueprintCandidate(standards, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day7ReviewerExport(candidate, {
    generatedAt: GENERATED_AT,
  });
}

function allRows(exportValue: GavanWeek1Day7ReviewerExport) {
  return [
    ...exportValue.contentUnitRows,
    ...exportValue.explanationRows,
    ...exportValue.exerciseRows,
  ];
}

describe('Gavan week 1 day 7 reviewer approval gate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH)) {
      rmSync(GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day7ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH,
    });
  });

  it('builds explicit approval records for every day 7 reviewer row', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day7ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const rowIds = new Set(allRows(exported).map((row) => row.id));

    expect(input.kind).toBe('gavan_week1_day7_reviewer_approval_input');
    expect(input.dayId).toBe('gavan-week1-day7');
    expect(input.liveIntegration).toBe(false);
    expect(input.approvals).toHaveLength(16);
    expect(input.approvals.every((approval) => rowIds.has(approval.rowId))).toBe(true);
    expect(input.approvals[0]).toEqual(expect.objectContaining({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      rowKind: 'content_unit',
      rowId: 'review:gavan-w1-d7-candidate-p1',
    }));
    expect(input.approvals[0].textChecksum).toBe(
      checksumGavanWeek1Day7ReviewerRow(exported.contentUnitRows[0]),
    );

    const result = validateGavanWeek1Day7ReviewerApprovalGate(exported, input);
    expect(result).toEqual({
      valid: true,
      issues: [],
      summary: {
        contentUnits: 4,
        explanationCards: 8,
        exerciseBlueprints: 4,
        totalApproved: 16,
      },
    });
  });

  it('fails partial approval and invalid approval metadata', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day7ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const partial = validateGavanWeek1Day7ReviewerApprovalGate(exported, {
      ...input,
      approvals: input.approvals.slice(1),
    });
    const invalid = validateGavanWeek1Day7ReviewerApprovalGate(exported, {
      ...input,
      approvals: [
        ...input.approvals,
        {
          ...input.approvals[0],
          reviewerId: '',
          approvedAt: 'not-a-date',
          rowId: 'unknown-row-id',
        },
      ],
    });

    expect(partial.valid).toBe(false);
    expect(partial.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'missing_approval_record',
        rowId: 'review:gavan-w1-d7-candidate-p1',
      }),
    ]));
    expect(invalid.valid).toBe(false);
    expect(invalid.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown_row_id', rowId: 'unknown-row-id' }),
      expect.objectContaining({ code: 'missing_reviewer_id', rowId: 'unknown-row-id' }),
      expect.objectContaining({ code: 'invalid_approved_at', rowId: 'unknown-row-id' }),
    ]));
  });

  it('rejects changed copy fake media readiness forbidden anchors and visible numbers before approval', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day7ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const changedCopy: GavanWeek1Day7ReviewerExport = {
      ...exported,
      explanationRows: exported.explanationRows.map((row, index) =>
        index === 0
          ? { ...row, body: `${row.body} Changed after review.` }
          : row,
      ),
    };
    const fakeMedia = {
      ...exported,
      mediaClaims: {
        ...exported.mediaClaims,
        finalAudioReady: true,
      },
    } as unknown as GavanWeek1Day7ReviewerExport;
    const forbiddenCopy: GavanWeek1Day7ReviewerExport = {
      ...exported,
      forbiddenAnchorCheck: {
        valid: false,
        found: ['email', '\\d'],
      },
    };

    expect(validateGavanWeek1Day7ReviewerApprovalGate(changedCopy, input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'text_checksum_mismatch',
          rowId: 'review:gavan-w1-d7-candidate-p1:explanation-1',
        }),
      ]),
    );
    expect(validateGavanWeek1Day7ReviewerApprovalGate(fakeMedia, input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'reviewer_export_invalid' }),
      ]),
    );
    expect(validateGavanWeek1Day7ReviewerApprovalGate(forbiddenCopy, input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'reviewer_export_invalid' }),
      ]),
    );
  });

  it('builds and validates an approved day 7 export without live integration', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day7ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const result = approveGavanWeek1Day7ReviewerExport(exported, input);

    expect(result.valid).toBe(true);
    expect(result.approvedExport?.kind).toBe('gavan_week1_day7_approved_reviewer_export');
    expect(result.approvedExport?.liveIntegration).toBe(false);
    expect(result.approvedExport?.summary).toEqual({
      contentUnits: 4,
      explanationCards: 8,
      exerciseBlueprints: 4,
      totalApproved: 16,
    });
    expect(result.approvedExport?.contentUnitRows[0]).toEqual(expect.objectContaining({
      reviewStatus: 'approved',
      approval: expect.objectContaining({
        reviewerId: REVIEWER_ID,
        approvedAt: APPROVED_AT,
      }),
    }));
    expect(validateGavanWeek1Day7ApprovedReviewerExport(result.approvedExport!)).toEqual({
      valid: true,
      issues: [],
      summary: {
        contentUnits: 4,
        explanationCards: 8,
        exerciseBlueprints: 4,
        totalApproved: 16,
      },
    });
  });

  it('writes deterministic approved day 7 export JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day7ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day7-approved-reviewer-export.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_DAY7_APPROVED_REVIEWER_EXPORT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_day7_approved_reviewer_export');
    expect(parsed.dayId).toBe('gavan-week1-day7');
    expect(parsed.summary.totalApproved).toBe(16);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day7ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day7-approved-reviewer-export.json'),
    });
    const toolsResult = writeGavanWeek1Day7ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day7-approved-reviewer-export.json'),
    });
    const testsResult = writeGavanWeek1Day7ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day7-approved-reviewer-export.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import live catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day7_reviewer_approval_gate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
