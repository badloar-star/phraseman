import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ApprovalReadinessManifest,
  GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH,
  validateGavanWeek1ApprovalReadinessManifest,
  writeGavanWeek1ApprovalReadinessManifest,
} from '../tools/personal_plan_gavan_week1_approval_readiness_manifest';

const GENERATED_AT = '2026-06-03T02:10:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

function artifactPath(dayIndex: number): string {
  return path.join(
    process.cwd(),
    '.codex-tmp',
    'personal-plans',
    `gavan-week1-day${dayIndex}-approved-reviewer-export.json`,
  );
}

function approvedExport(dayIndex: number, totalApproved = 16) {
  return {
    kind: `gavan_week1_day${dayIndex}_approved_reviewer_export`,
    generatedAt: GENERATED_AT,
    sourceReviewerExportGeneratedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: `gavan-week1-day${dayIndex}`,
    dayIndex,
    liveIntegration: false,
    contentUnitRows: Array.from({ length: 4 }, (_, index) => ({
      id: `approved:day${dayIndex}:content:${index}`,
      reviewStatus: 'approved',
    })),
    explanationRows: Array.from({ length: 8 }, (_, index) => ({
      id: `approved:day${dayIndex}:explanation:${index}`,
      reviewStatus: 'approved',
    })),
    exerciseRows: Array.from({ length: totalApproved - 12 }, (_, index) => ({
      id: `approved:day${dayIndex}:exercise:${index}`,
      reviewStatus: 'approved',
    })),
    mediaClaims: {
      audioAssetStatus: 'not_generated',
      pronunciationScoringStatus: 'not_built',
      finalAudioReady: false,
      finalPronunciationScoringReady: false,
    },
    exerciseCoverage: {
      valid: true,
    },
    summary: {
      contentUnits: 4,
      explanationCards: 8,
      exerciseBlueprints: totalApproved - 12,
      totalApproved,
    },
  };
}

function approvedExports() {
  return [2, 3, 4, 5, 6, 7].map((dayIndex) => ({
    artifactPath: artifactPath(dayIndex),
    approvedExport: approvedExport(dayIndex, dayIndex === 4 ? 18 : 16),
  }));
}

describe('Gavan week 1 approval readiness manifest', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH)) {
      rmSync(GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH,
    });
  });

  it('builds a non-live manifest for approved Gavan week 1 days 2-7', () => {
    const manifest = buildGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
    });

    expect(manifest).toEqual(expect.objectContaining({
      kind: 'gavan_week1_approval_readiness_manifest',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      weekStatus: 'approved_non_live_not_playable',
      liveIntegration: false,
    }));
    expect(manifest.days.map((day) => day.dayIndex)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(manifest.days.every((day) => day.liveIntegration === false)).toBe(true);
    expect(manifest.days.every((day) => day.approvedArtifactPath.endsWith(
      `gavan-week1-day${day.dayIndex}-approved-reviewer-export.json`,
    ))).toBe(true);
  });

  it('summarizes every approved day without making it playable', () => {
    const manifest = buildGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
    });

    expect(manifest.days[0]).toEqual(expect.objectContaining({
      dayId: 'gavan-week1-day2',
      contentUnits: 4,
      explanationCards: 8,
      exerciseBlueprints: 4,
      totalApproved: 16,
      playable: false,
      productionRouteRegistered: false,
    }));
    expect(manifest.days.find((day) => day.dayIndex === 4)?.totalApproved).toBe(18);
    expect(manifest.totals).toEqual({
      daysApproved: 6,
      contentUnits: 24,
      explanationCards: 48,
      exerciseBlueprints: 26,
      totalApproved: 98,
    });
  });

  it('lists release blockers instead of pretending week 1 is live-ready', () => {
    const manifest = buildGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
    });

    expect(manifest.releaseBlockers.map((blocker) => blocker.code)).toEqual([
      'no_final_audio',
      'no_final_pronunciation_scoring',
      'no_live_catalog_route',
      'no_production_quiz_route',
      'no_ui_route',
      'no_cloud_sync_bridge',
    ]);
    expect(manifest.releaseBlockers.every((blocker) => blocker.blocksLiveRelease === true)).toBe(true);
  });

  it('passes its own quality gate and catches missing or unsafe approved exports', () => {
    const manifest = buildGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
    });
    const missingDay = buildGavanWeek1ApprovalReadinessManifest(approvedExports().slice(1), {
      generatedAt: GENERATED_AT,
    });
    const unsafe = buildGavanWeek1ApprovalReadinessManifest([
      ...approvedExports().slice(0, 5),
      {
        artifactPath: artifactPath(7),
        approvedExport: {
          ...approvedExport(7),
          liveIntegration: true,
          mediaClaims: {
            ...approvedExport(7).mediaClaims,
            finalAudioReady: true,
          },
        },
      },
    ], {
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1ApprovalReadinessManifest(manifest)).toEqual({
      valid: true,
      issues: [],
    });
    expect(validateGavanWeek1ApprovalReadinessManifest(missingDay).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'missing_approved_day', dayId: 'gavan-week1-day2' }),
      ]),
    );
    expect(validateGavanWeek1ApprovalReadinessManifest(unsafe).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'day_live_integration_enabled', dayId: 'gavan-week1-day7' }),
        expect.objectContaining({ code: 'fake_final_audio_claim', dayId: 'gavan-week1-day7' }),
      ]),
    );
  });

  it('writes deterministic manifest JSON only under temp or report roots', () => {
    const result = writeGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-approval-readiness-manifest.json',
    ));
    expect(existsSync(GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_approval_readiness_manifest');
    expect(parsed.weekStatus).toBe('approved_non_live_not_playable');
    expect(parsed.days).toHaveLength(6);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-approval-readiness-manifest.json'),
    });
    const toolsResult = writeGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-approval-readiness-manifest.json'),
    });
    const testsResult = writeGavanWeek1ApprovalReadinessManifest(approvedExports(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-approval-readiness-manifest.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_approval_readiness_manifest.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
