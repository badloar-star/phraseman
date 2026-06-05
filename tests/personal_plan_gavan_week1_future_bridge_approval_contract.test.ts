import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1BridgeDiffPreflightPlan,
} from '../tools/personal_plan_gavan_week1_bridge_diff_preflight_plan';
import {
  buildGavanWeek1FutureBridgeApprovalContract,
  GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH,
  writeGavanWeek1FutureBridgeApprovalContract,
  type GavanWeek1FutureBridgeApprovalRecord,
} from '../tools/personal_plan_gavan_week1_future_bridge_approval_contract';
import { ensureGavanWeek1RoutePrerequisiteArtifacts } from '../tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh';

const GENERATED_AT = '2026-06-03T03:15:00.000Z';
const APPROVED_AT = '2026-06-03T03:20:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function preflight(): GavanWeek1BridgeDiffPreflightPlan {
  return JSON.parse(readFileSync(
    path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-bridge-diff-preflight-plan.json',
    ),
    'utf8',
  ));
}

function connectedPreflight(): GavanWeek1BridgeDiffPreflightPlan {
  const source = preflight();
  return {
    ...source,
    requiredSurfaces: source.requiredSurfaces.map((surface) => ({
      ...surface,
      status: 'connected',
      reason: `${surface.code} is connected in test metadata.`,
    })),
  };
}

function fullApprovals(): GavanWeek1FutureBridgeApprovalRecord[] {
  return [
    ['catalog_route', 'engineering_release_owner'],
    ['quiz_route', 'learning_engine_owner'],
    ['ui_route', 'product_design_owner'],
    ['audio_pipeline', 'audio_pipeline_owner'],
    ['pronunciation_scoring', 'pronunciation_owner'],
    ['cloud_sync_bridge', 'sync_owner'],
    ['product_copy', 'content_quality_owner'],
  ].map(([areaId, role]) => ({
    areaId,
    role,
    approvedBy: `${role}-1`,
    approvedAt: APPROVED_AT,
    reason: `Approved ${areaId} for future bridge planning.`,
  })) as GavanWeek1FutureBridgeApprovalRecord[];
}

describe('Gavan week 1 future live bridge approval contract', () => {
  beforeAll(() => {
    ensureGavanWeek1RoutePrerequisiteArtifacts({ generatedAt: GENERATED_AT });
  });

  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH)) {
      rmSync(GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH,
    });
  });

  it('builds a non-live contract that blocks source edits until explicit approval exists', () => {
    const result = buildGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.contract).toEqual(expect.objectContaining({
      kind: 'gavan_week1_future_bridge_approval_contract',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'future_bridge_contract_only_not_applied',
      sourcePreflightStatus: 'bridge_plan_only_not_applied',
      liveIntegration: false,
      applied: false,
      approvalRequiredBeforeApply: true,
      sourceWritesUsed: false,
      canOpenLiveBridgeImplementationTask: false,
    }));
    expect(result.contract?.approvalAreas.map((area) => area.areaId)).toEqual([
      'catalog_route',
      'quiz_route',
      'ui_route',
      'audio_pipeline',
      'pronunciation_scoring',
      'cloud_sync_bridge',
      'product_copy',
    ]);
    expect(result.contract?.approvalAreas.every((area) => area.signatureStatus === 'missing')).toBe(true);
  });

  it('preserves missing surfaces and release blockers from the preflight plan', () => {
    const sourcePreflight = preflight();
    const result = buildGavanWeek1FutureBridgeApprovalContract(sourcePreflight, {
      generatedAt: GENERATED_AT,
    });

    expect(result.contract?.preservedMissingSurfaces).toEqual(sourcePreflight.requiredSurfaces);
    expect(result.contract?.preservedReleaseBlockers).toEqual(sourcePreflight.preservedReleaseBlockers);
  });

  it('lists concrete acceptance criteria for each production surface and product copy', () => {
    const result = buildGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
    });

    result.contract?.approvalAreas.forEach((area) => {
      expect(area.acceptanceCriteria.length).toBeGreaterThanOrEqual(3);
      expect(area.acceptanceCriteria.every((criterion) => criterion.trim().length > 20)).toBe(true);
      expect(area.state).toBe('blocked_until_signature');
    });
  });

  it('can mark the future implementation task open only when surfaces and signatures are complete', () => {
    const result = buildGavanWeek1FutureBridgeApprovalContract(connectedPreflight(), {
      generatedAt: GENERATED_AT,
      approvalRecords: fullApprovals(),
    });

    expect(result.valid).toBe(true);
    expect(result.contract?.canOpenLiveBridgeImplementationTask).toBe(true);
    expect(result.contract?.allProductionSurfacesConnected).toBe(true);
    expect(result.contract?.allRequiredSignaturesPresent).toBe(true);
    expect(result.contract?.liveIntegration).toBe(false);
    expect(result.contract?.applied).toBe(false);
  });

  it('rejects invalid or mismatched approval metadata', () => {
    const [approval] = fullApprovals();
    const result = buildGavanWeek1FutureBridgeApprovalContract(connectedPreflight(), {
      generatedAt: GENERATED_AT,
      approvalRecords: [
        {
          ...approval,
          role: 'wrong_owner',
          approvedAt: 'not-a-date',
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.contract).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'invalid_approval_role' }),
      expect.objectContaining({ code: 'invalid_approval_timestamp' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-future-bridge-approval-contract.json',
    ));
    expect(existsSync(GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH)).toBe(true);

    const serialized = readFileSync(GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);

    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_future_bridge_approval_contract');
    expect(parsed.status).toBe('future_bridge_contract_only_not_applied');
    expect(parsed.sourceWritesUsed).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-future-bridge-approval-contract.json'),
    });
    const toolsResult = writeGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-future-bridge-approval-contract.json'),
    });
    const testsResult = writeGavanWeek1FutureBridgeApprovalContract(preflight(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-future-bridge-approval-contract.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_future_bridge_approval_contract.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
