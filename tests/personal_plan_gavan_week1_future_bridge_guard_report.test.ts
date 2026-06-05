import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1FutureBridgeApprovalContract,
} from '../tools/personal_plan_gavan_week1_future_bridge_approval_contract';
import {
  buildGavanWeek1FutureBridgeGuardReport,
  GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
  writeGavanWeek1FutureBridgeGuardReport,
} from '../tools/personal_plan_gavan_week1_future_bridge_guard_report';
import { ensureGavanWeek1RoutePrerequisiteArtifacts } from '../tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh';

const GENERATED_AT = '2026-06-03T03:45:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function contract(): GavanWeek1FutureBridgeApprovalContract {
  return JSON.parse(readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-future-bridge-approval-contract.json',
    ),
    'utf8',
  ));
}

describe('Gavan week 1 future bridge guard report', () => {
  beforeAll(() => {
    ensureGavanWeek1RoutePrerequisiteArtifacts({ generatedAt: GENERATED_AT });
  });

  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH)) {
      rmSync(GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
    });
  });

  it('turns the approval contract into a blocked non-live guard report', () => {
    const result = buildGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.report).toEqual(expect.objectContaining({
      kind: 'gavan_week1_future_bridge_guard_report',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'future_bridge_guard_blocked_not_applied',
      sourceContractStatus: 'future_bridge_contract_only_not_applied',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      implementationTaskAllowed: false,
    }));
    expect(result.report?.blockerSummary).toEqual({
      missingSignatures: 7,
      missingProductionSurfaces: 6,
      preservedReleaseBlockers: 6,
      totalBlockers: 19,
    });
  });

  it('explains every missing signature as its own blocker', () => {
    const result = buildGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
    });

    const missingSignatureBlockers = result.report?.blockers.filter((blocker) =>
      blocker.category === 'missing_signature',
    ) ?? [];

    expect(missingSignatureBlockers.map((blocker) => blocker.areaId)).toEqual([
      'catalog_route',
      'quiz_route',
      'ui_route',
      'audio_pipeline',
      'pronunciation_scoring',
      'cloud_sync_bridge',
      'product_copy',
    ]);
    expect(missingSignatureBlockers.every((blocker) => blocker.blocksLiveBridge === true)).toBe(true);
  });

  it('explains every missing production surface as its own blocker', () => {
    const result = buildGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
    });

    const missingSurfaceBlockers = result.report?.blockers.filter((blocker) =>
      blocker.category === 'missing_production_surface',
    ) ?? [];

    expect(missingSurfaceBlockers.map((blocker) => blocker.surfaceCode)).toEqual([
      'catalog_route',
      'quiz_route',
      'ui_route',
      'audio_pipeline',
      'pronunciation_scoring',
      'cloud_sync_bridge',
    ]);
    expect(missingSurfaceBlockers.every((blocker) => blocker.blocksLiveBridge === true)).toBe(true);
  });

  it('preserves release blocker details instead of flattening them into a note', () => {
    const sourceContract = contract();
    const result = buildGavanWeek1FutureBridgeGuardReport(sourceContract, {
      generatedAt: GENERATED_AT,
    });

    const preservedBlockers = result.report?.blockers.filter((blocker) =>
      blocker.category === 'preserved_release_blocker',
    ) ?? [];

    expect(preservedBlockers.map((blocker) => blocker.releaseBlockerCode)).toEqual(
      sourceContract.preservedReleaseBlockers.map((blocker) => blocker.code),
    );
    expect(result.report?.preservedReleaseBlockers).toEqual(sourceContract.preservedReleaseBlockers);
  });

  it('refuses an applied or live contract while signatures and surfaces are incomplete', () => {
    const unsafeContract = {
      ...contract(),
      applied: true,
      liveIntegration: true,
    } as unknown as GavanWeek1FutureBridgeApprovalContract;

    const result = buildGavanWeek1FutureBridgeGuardReport(unsafeContract, {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.report).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'applied_live_contract_not_allowed' }),
      expect.objectContaining({ code: 'incomplete_contract_cannot_apply' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-future-bridge-guard-report.json',
    ));
    expect(existsSync(GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_future_bridge_guard_report');
    expect(parsed.status).toBe('future_bridge_guard_blocked_not_applied');
    expect(parsed.sourceWritesUsed).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-future-bridge-guard-report.json'),
    });
    const toolsResult = writeGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-future-bridge-guard-report.json'),
    });
    const testsResult = writeGavanWeek1FutureBridgeGuardReport(contract(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-future-bridge-guard-report.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_future_bridge_guard_report.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
