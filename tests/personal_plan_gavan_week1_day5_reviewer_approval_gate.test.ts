import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day5BlueprintCandidate,
} from '../tools/personal_plan_gavan_week1_day5_blueprint_candidate';
import {
  buildGavanWeek1Day5ReviewerExport,
  type GavanWeek1Day5ReviewerExport,
} from '../tools/personal_plan_gavan_week1_day5_reviewer_export';
import {
  approveGavanWeek1Day5ReviewerExport,
  buildGavanWeek1Day5ReviewerApprovalInput,
  checksumGavanWeek1Day5ReviewerRow,
  GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH,
  validateGavanWeek1Day5ApprovedReviewerExport,
  validateGavanWeek1Day5ReviewerApprovalGate,
  writeGavanWeek1Day5ApprovedReviewerExport,
} from '../tools/personal_plan_gavan_week1_day5_reviewer_approval_gate';

const GENERATED_AT = '2026-06-02T23:45:00.000Z';
const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-02T23:50:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

function reviewExport(): GavanWeek1Day5ReviewerExport {
  const standards = buildGavanWeek1ExpansionStandards({ generatedAt: GENERATED_AT });
  const candidate = buildGavanWeek1Day5BlueprintCandidate(standards, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day5ReviewerExport(candidate, {
    generatedAt: GENERATED_AT,
  });
}

function allRows(exportValue: GavanWeek1Day5ReviewerExport) {
  return [
    ...exportValue.contentUnitRows,
    ...exportValue.explanationRows,
    ...exportValue.exerciseRows,
  ];
}

describe('Gavan week 1 day 5 reviewer approval gate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH)) {
      rmSync(GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day5ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH,
    });
  });

  it('builds explicit approval records for every day 5 reviewer row', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day5ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const rowIds = new Set(allRows(exported).map((row) => row.id));

    expect(input.kind).toBe('gavan_week1_day5_reviewer_approval_input');
    expect(input.dayId).toBe('gavan-week1-day5');
    expect(input.liveIntegration).toBe(false);
    expect(input.approvals).toHaveLength(16);
    expect(input.approvals.every((approval) => rowIds.has(approval.rowId))).toBe(true);
    expect(input.approvals[0]).toEqual(expect.objectContaining({
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      rowKind: 'content_unit',
      rowId: 'review:gavan-w1-d5-candidate-p1',
    }));
    expect(input.approvals[0].textChecksum).toBe(
      checksumGavanWeek1Day5ReviewerRow(exported.contentUnitRows[0]),
    );

    const result = validateGavanWeek1Day5ReviewerApprovalGate(exported, input);
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
    const input = buildGavanWeek1Day5ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const partial = validateGavanWeek1Day5ReviewerApprovalGate(exported, {
      ...input,
      approvals: input.approvals.slice(1),
    });
    const invalid = validateGavanWeek1Day5ReviewerApprovalGate(exported, {
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
        rowId: 'review:gavan-w1-d5-candidate-p1',
      }),
    ]));
    expect(invalid.valid).toBe(false);
    expect(invalid.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unknown_row_id', rowId: 'unknown-row-id' }),
      expect.objectContaining({ code: 'missing_reviewer_id', rowId: 'unknown-row-id' }),
      expect.objectContaining({ code: 'invalid_approved_at', rowId: 'unknown-row-id' }),
    ]));
  });

  it('rejects changed copy fake media readiness and forbidden anchors before approval', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day5ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });
    const changedCopy: GavanWeek1Day5ReviewerExport = {
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
    } as unknown as GavanWeek1Day5ReviewerExport;
    const forbiddenCopy: GavanWeek1Day5ReviewerExport = {
      ...exported,
      forbiddenAnchorCheck: {
        valid: false,
        found: ['email'],
      },
    };

    expect(validateGavanWeek1Day5ReviewerApprovalGate(changedCopy, input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'text_checksum_mismatch',
          rowId: 'review:gavan-w1-d5-candidate-p1:explanation-1',
        }),
      ]),
    );
    expect(validateGavanWeek1Day5ReviewerApprovalGate(fakeMedia, input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'reviewer_export_invalid' }),
      ]),
    );
    expect(validateGavanWeek1Day5ReviewerApprovalGate(forbiddenCopy, input).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'reviewer_export_invalid' }),
      ]),
    );
  });

  it('builds and validates an approved day 5 export without live integration', () => {
    const exported = reviewExport();
    const input = buildGavanWeek1Day5ReviewerApprovalInput(exported, {
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
    });

    const result = approveGavanWeek1Day5ReviewerExport(exported, input);

    expect(result.valid).toBe(true);
    expect(result.approvedExport?.kind).toBe('gavan_week1_day5_approved_reviewer_export');
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
    expect(validateGavanWeek1Day5ApprovedReviewerExport(result.approvedExport!)).toEqual({
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

  it('writes deterministic approved day 5 export JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day5ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day5-approved-reviewer-export.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_DAY5_APPROVED_REVIEWER_EXPORT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_day5_approved_reviewer_export');
    expect(parsed.dayId).toBe('gavan-week1-day5');
    expect(parsed.summary.totalApproved).toBe(16);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day5ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day5-approved-reviewer-export.json'),
    });
    const toolsResult = writeGavanWeek1Day5ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day5-approved-reviewer-export.json'),
    });
    const testsResult = writeGavanWeek1Day5ApprovedReviewerExport(reviewExport(), {
      generatedAt: GENERATED_AT,
      reviewerId: REVIEWER_ID,
      approvedAt: APPROVED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day5-approved-reviewer-export.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day5_reviewer_approval_gate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
