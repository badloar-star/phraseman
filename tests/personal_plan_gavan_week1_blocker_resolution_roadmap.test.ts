import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1FutureBridgeGuardReport,
} from '../tools/personal_plan_gavan_week1_future_bridge_guard_report';
import {
  buildGavanWeek1BlockerResolutionRoadmap,
  GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH,
  writeGavanWeek1BlockerResolutionRoadmap,
} from '../tools/personal_plan_gavan_week1_blocker_resolution_roadmap';
import {
  blockedFutureBridgeGuardReport,
} from './personal_plan_gavan_week1_route_chain_fixtures';

const GENERATED_AT = '2026-06-03T04:10:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function guardReport(): GavanWeek1FutureBridgeGuardReport {
  return blockedFutureBridgeGuardReport();
}

describe('Gavan week 1 blocker resolution roadmap', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH)) {
      rmSync(GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH,
    });
  });

  it('builds a non-live roadmap from the blocked guard report', () => {
    const result = buildGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.roadmap).toEqual(expect.objectContaining({
      kind: 'gavan_week1_blocker_resolution_roadmap',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocker_resolution_roadmap_only_not_applied',
      sourceGuardStatus: 'future_bridge_guard_blocked_not_applied',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      implementationTaskAllowed: false,
    }));
    expect(result.roadmap?.sourceBlockerSummary).toEqual({
      missingSignatures: 7,
      missingProductionSurfaces: 6,
      preservedReleaseBlockers: 6,
      totalBlockers: 19,
    });
  });

  it('orders work packages by conservative release dependency', () => {
    const result = buildGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.roadmap?.workPackages.map((workPackage) => workPackage.id)).toEqual([
      'product_copy_review',
      'catalog_route_plan',
      'quiz_route_plan',
      'ui_route_plan',
      'audio_pipeline_plan',
      'pronunciation_policy_plan',
      'cloud_sync_bridge_plan',
      'final_release_approval',
    ]);
    expect(result.roadmap?.workPackages.every((workPackage) => workPackage.state === 'not_started')).toBe(true);
  });

  it('maps blockers into the relevant work packages without losing blocker ids', () => {
    const result = buildGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
    });
    const packagesById = new Map(result.roadmap?.workPackages.map((workPackage) => [
      workPackage.id,
      workPackage.blockerIds,
    ]));

    expect(packagesById.get('product_copy_review')).toEqual([
      'missing_signature:product_copy',
    ]);
    expect(packagesById.get('catalog_route_plan')).toEqual([
      'missing_signature:catalog_route',
      'missing_surface:catalog_route',
      'release_blocker:no_live_catalog_route',
    ]);
    expect(packagesById.get('quiz_route_plan')).toEqual([
      'missing_signature:quiz_route',
      'missing_surface:quiz_route',
      'release_blocker:no_production_quiz_route',
    ]);
    expect(packagesById.get('final_release_approval')).toEqual([
      'release_blocker:no_final_audio',
      'release_blocker:no_final_pronunciation_scoring',
      'release_blocker:no_live_catalog_route',
      'release_blocker:no_production_quiz_route',
      'release_blocker:no_ui_route',
      'release_blocker:no_cloud_sync_bridge',
    ]);
  });

  it('keeps every package non-live and explicitly not started', () => {
    const result = buildGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
    });

    result.roadmap?.workPackages.forEach((workPackage) => {
      expect(workPackage.state).toBe('not_started');
      expect(workPackage.liveEditsAllowed).toBe(false);
      expect(workPackage.acceptanceCriteria.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('rejects guard reports that already allow implementation or use source writes', () => {
    const unsafeGuard = {
      ...guardReport(),
      implementationTaskAllowed: true,
      sourceWritesUsed: true,
      phaseWriteTargets: ['app/personal_plan_catalog.ts'],
    } as unknown as GavanWeek1FutureBridgeGuardReport;

    const result = buildGavanWeek1BlockerResolutionRoadmap(unsafeGuard, {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.roadmap).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'implementation_already_allowed' }),
      expect.objectContaining({ code: 'source_writes_not_allowed' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-blocker-resolution-roadmap.json',
    ));
    expect(existsSync(GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_blocker_resolution_roadmap');
    expect(parsed.status).toBe('blocker_resolution_roadmap_only_not_applied');
    expect(parsed.sourceWritesUsed).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-blocker-resolution-roadmap.json'),
    });
    const toolsResult = writeGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-blocker-resolution-roadmap.json'),
    });
    const testsResult = writeGavanWeek1BlockerResolutionRoadmap(guardReport(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-blocker-resolution-roadmap.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_blocker_resolution_roadmap.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
