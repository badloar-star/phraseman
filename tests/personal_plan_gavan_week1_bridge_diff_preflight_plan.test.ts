import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ApprovalReadinessManifest,
} from '../tools/personal_plan_gavan_week1_approval_readiness_manifest';
import {
  buildGavanWeek1BridgeDiffPreflightPlan,
  GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH,
  writeGavanWeek1BridgeDiffPreflightPlan,
  type GavanWeek1ProductionSurfaceMetadata,
} from '../tools/personal_plan_gavan_week1_bridge_diff_preflight_plan';

const GENERATED_AT = '2026-06-03T02:45:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function manifest(): GavanWeek1ApprovalReadinessManifest {
  return JSON.parse(readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-approval-readiness-manifest.json',
    ),
    'utf8',
  ));
}

function blankMetadata(): GavanWeek1ProductionSurfaceMetadata {
  return {
    catalogSource: '',
    quizSource: '',
    uiRouteSources: [],
    audioPipelineReady: false,
    pronunciationScoringReady: false,
    cloudSyncBridgeReady: false,
  };
}

function liveMetadata(): GavanWeek1ProductionSurfaceMetadata {
  return {
    catalogSource: readFileSync(path.join(process.cwd(), 'app', 'personal_plan_catalog.ts'), 'utf8'),
    quizSource: readFileSync(path.join(process.cwd(), 'app', 'personal_plan_quizzes.ts'), 'utf8'),
    uiRouteSources: [],
    audioPipelineReady: false,
    pronunciationScoringReady: false,
    cloudSyncBridgeReady: false,
  };
}

describe('Gavan week 1 bridge diff preflight plan', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH)) {
      rmSync(GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1BridgeDiffPreflightPlan(manifest(), {
      metadata: liveMetadata(),
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH,
    });
  });

  it('builds a bridge plan only artifact and does not apply live integration', () => {
    const result = buildGavanWeek1BridgeDiffPreflightPlan(manifest(), {
      metadata: blankMetadata(),
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.plan).toEqual(expect.objectContaining({
      kind: 'gavan_week1_bridge_diff_preflight_plan',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'bridge_plan_only_not_applied',
      liveIntegration: false,
      applied: false,
      sourceManifestStatus: 'approved_non_live_not_playable',
    }));
    expect(result.plan?.requiredSurfaces.map((surface) => surface.code)).toEqual([
      'catalog_route',
      'quiz_route',
      'ui_route',
      'audio_pipeline',
      'pronunciation_scoring',
      'cloud_sync_bridge',
    ]);
    expect(result.plan?.requiredSurfaces.every((surface) =>
      surface.status === 'missing_or_not_connected'
    )).toBe(true);
  });

  it('preserves release blockers from the approval readiness manifest', () => {
    const sourceManifest = manifest();
    const result = buildGavanWeek1BridgeDiffPreflightPlan(sourceManifest, {
      metadata: blankMetadata(),
      generatedAt: GENERATED_AT,
    });

    expect(result.plan?.preservedReleaseBlockers).toEqual(sourceManifest.releaseBlockers);
    expect(result.plan?.writePolicy).toEqual({
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    });
  });

  it('marks production surfaces connected only when metadata proves a real route exists', () => {
    const sourceManifest = manifest();
    const dayIds = sourceManifest.days.map((day) => day.dayId).join('\n');
    const result = buildGavanWeek1BridgeDiffPreflightPlan(sourceManifest, {
      generatedAt: GENERATED_AT,
      metadata: {
        catalogSource: dayIds,
        quizSource: dayIds,
        uiRouteSources: [dayIds],
        audioPipelineReady: true,
        pronunciationScoringReady: true,
        cloudSyncBridgeReady: true,
      },
    });

    expect(result.plan?.requiredSurfaces.map((surface) => surface.status)).toEqual([
      'connected',
      'connected',
      'connected',
      'connected',
      'connected',
      'connected',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1BridgeDiffPreflightPlan(manifest(), {
      metadata: liveMetadata(),
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-bridge-diff-preflight-plan.json',
    ));
    expect(existsSync(GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_bridge_diff_preflight_plan');
    expect(parsed.status).toBe('bridge_plan_only_not_applied');
    expect(parsed.applied).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1BridgeDiffPreflightPlan(manifest(), {
      metadata: liveMetadata(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-bridge-diff-preflight-plan.json'),
    });
    const toolsResult = writeGavanWeek1BridgeDiffPreflightPlan(manifest(), {
      metadata: liveMetadata(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-bridge-diff-preflight-plan.json'),
    });
    const testsResult = writeGavanWeek1BridgeDiffPreflightPlan(manifest(), {
      metadata: liveMetadata(),
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-bridge-diff-preflight-plan.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_bridge_diff_preflight_plan.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
