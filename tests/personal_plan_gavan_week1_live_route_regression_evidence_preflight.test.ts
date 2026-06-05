import { readFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1RouteRegistrationImplementationPreflightV2,
} from '../tools/personal_plan_gavan_week1_route_registration_implementation_preflight_v2';
import {
  GAVAN_WEEK1_LIVE_ROUTE_REGRESSION_EVIDENCE_PREFLIGHT_PATH,
  buildGavanWeek1LiveRouteRegressionEvidencePreflight,
  writeGavanWeek1LiveRouteRegressionEvidencePreflight,
} from '../tools/personal_plan_gavan_week1_live_route_regression_evidence_preflight';

const GENERATED_AT = '2026-06-04T22:20:00.000Z';

function registrationPreflight(
  overrides: Partial<GavanWeek1RouteRegistrationImplementationPreflightV2> = {},
): GavanWeek1RouteRegistrationImplementationPreflightV2 {
  const base: GavanWeek1RouteRegistrationImplementationPreflightV2 = {
    kind: 'gavan_week1_route_registration_implementation_preflight_v2',
    generatedAt: GENERATED_AT,
    registrationOwnerId: 'route-registration-implementation-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceArtifactGateStatus: 'blocked_before_signed_payload_acceptance',
    status: 'blocked_before_signed_approval_artifact_candidate',
    releaseDecision: 'hold',
    signedApprovalArtifactReady: false,
    sourceRegistrationPlanReady: false,
    routeRegistrationAllowed: false,
    catalogRouteRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    uiRouteRegistrationAllowed: false,
    liveRegressionAllowed: false,
    deviceVerificationAllowed: false,
    readyForLive: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    registrationPlan: [
      {
        id: 'catalog_route_registration',
        status: 'blocked_waiting_for_source_registration_pass',
        plannedRouteCount: 7,
        sourceWritesAllowed: false,
        liveRegistrationAllowed: false,
        requiredApprovalState: 'separate_signed_approval_artifact_created',
      },
      {
        id: 'quiz_route_registration',
        status: 'blocked_waiting_for_source_registration_pass',
        plannedRouteCount: 7,
        sourceWritesAllowed: false,
        liveRegistrationAllowed: false,
        requiredApprovalState: 'separate_signed_approval_artifact_created',
      },
      {
        id: 'ui_route_registration',
        status: 'blocked_waiting_for_source_registration_pass',
        plannedRouteCount: 5,
        sourceWritesAllowed: false,
        liveRegistrationAllowed: false,
        requiredApprovalState: 'separate_signed_approval_artifact_created',
      },
    ],
    summary: {
      routeFamilyCount: 3,
      blockedRouteFamilyCount: 3,
      plannedCatalogRouteCount: 7,
      plannedQuizRouteCount: 7,
      plannedUiOpeningContractCount: 5,
      signedApprovalArtifactReady: false,
      sourceRegistrationPlanReady: false,
      inheritedArtifactBlockerCount: 6,
      implementationBlockerCount: 7,
    },
    blockers: [
      {
        code: 'signed_approval_artifact_not_ready',
        blocksProduction: true,
        detail: 'Signed approval artifact candidate is not ready.',
      },
      {
        code: 'source_registration_pass_not_started',
        blocksProduction: true,
        detail: 'The separate source-registration implementation pass has not started.',
      },
    ],
    requiredNextActions: [
      'Accept a complete signed route approval payload and prepare a non-live signed approval artifact candidate first.',
      'Keep route source registration blocked until a separate source-registration pass exists.',
    ],
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };

  return { ...base, ...overrides };
}

function planReadyPreflight(): GavanWeek1RouteRegistrationImplementationPreflightV2 {
  return registrationPreflight({
    sourceArtifactGateStatus: 'signed_approval_artifact_candidate_ready_non_live',
    status: 'source_registration_plan_ready_non_live',
    signedApprovalArtifactReady: true,
    sourceRegistrationPlanReady: true,
    summary: {
      routeFamilyCount: 3,
      blockedRouteFamilyCount: 3,
      plannedCatalogRouteCount: 7,
      plannedQuizRouteCount: 7,
      plannedUiOpeningContractCount: 5,
      signedApprovalArtifactReady: true,
      sourceRegistrationPlanReady: true,
      inheritedArtifactBlockerCount: 5,
      implementationBlockerCount: 6,
    },
    blockers: [
      {
        code: 'source_registration_pass_not_started',
        blocksProduction: true,
        detail: 'The separate source-registration implementation pass has not started.',
      },
      {
        code: 'live_regression_required',
        blocksProduction: true,
        detail: 'Live route regression evidence is still required.',
      },
      {
        code: 'device_verification_required',
        blocksProduction: true,
        detail: 'Device route opening verification is still required.',
      },
    ],
  });
}

describe('Gavan week 1 live route regression evidence preflight', () => {
  it('blocks regression and device evidence before source-registration planning is ready', () => {
    const result = buildGavanWeek1LiveRouteRegressionEvidencePreflight(registrationPreflight(), {
      generatedAt: GENERATED_AT,
      evidenceOwnerId: 'route-regression-evidence-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.preflight).toMatchObject({
      kind: 'gavan_week1_live_route_regression_evidence_preflight',
      status: 'blocked_before_source_registration_plan',
      releaseDecision: 'hold',
      regressionEvidenceReady: false,
      deviceEvidenceReady: false,
      sourceRegistrationPlanReady: false,
      routeRegistrationComplete: false,
      readyForLive: false,
      productionReady: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.preflight.summary).toEqual({
      regressionSuiteCount: 7,
      blockedRegressionSuiteCount: 7,
      deviceCheckCount: 5,
      blockedDeviceCheckCount: 5,
      routeFamilyCount: 3,
      routeRegistrationComplete: false,
      inheritedImplementationBlockerCount: 7,
      evidenceBlockerCount: 6,
    });
    expect(result.preflight.blockers.map((blocker) => blocker.code)).toEqual([
      'source_registration_plan_not_ready',
      'route_registration_not_complete',
      'home_onboarding_premium_regression_not_run',
      'catalog_quiz_ui_route_regression_not_run',
      'device_route_opening_not_verified',
      'audio_pronunciation_master_blockers_still_open',
    ]);
  });

  it('prepares only non-live regression and device evidence checklists when source-registration plan is ready', () => {
    const result = buildGavanWeek1LiveRouteRegressionEvidencePreflight(planReadyPreflight(), {
      generatedAt: GENERATED_AT,
      evidenceOwnerId: 'route-regression-evidence-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.preflight).toMatchObject({
      status: 'regression_evidence_plan_ready_non_live',
      releaseDecision: 'hold',
      regressionEvidenceReady: false,
      deviceEvidenceReady: false,
      sourceRegistrationPlanReady: true,
      routeRegistrationComplete: false,
      readyForLive: false,
      productionReady: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.preflight.regressionSuites).toHaveLength(7);
    expect(result.preflight.deviceChecks).toHaveLength(5);
    expect(result.preflight.regressionSuites.every((suite) =>
      suite.status === 'blocked_not_run' &&
      suite.requiredAfterSourceRegistration === true,
    )).toBe(true);
    expect(result.preflight.deviceChecks.every((check) =>
      check.status === 'blocked_not_verified' &&
      check.requiredAfterSourceRegistration === true,
    )).toBe(true);
  });

  it('rejects unsafe registration preflights that already claim live registration or readiness', () => {
    const result = buildGavanWeek1LiveRouteRegressionEvidencePreflight(registrationPreflight({
      routeRegistrationAllowed: true as false,
      liveRegressionAllowed: true as false,
      readyForLive: true as false,
    }), {
      generatedAt: GENERATED_AT,
      evidenceOwnerId: 'route-regression-evidence-owner',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'registration_preflight_not_non_live',
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-live-route-regression-evidence-preflight.test.json',
    );

    const result = writeGavanWeek1LiveRouteRegressionEvidencePreflight(registrationPreflight(), {
      generatedAt: GENERATED_AT,
      evidenceOwnerId: 'route-regression-evidence-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.preflight);
    expect(stored.status).toBe('blocked_before_source_registration_plan');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1LiveRouteRegressionEvidencePreflight(registrationPreflight(), {
      generatedAt: GENERATED_AT,
      evidenceOwnerId: 'route-regression-evidence-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Live route regression evidence preflight can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_live_route_regression_evidence_preflight.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'personal_plan_catalog',
      'personal_plan_day_open_actions',
      'personal_plan_audio_openai_worker',
      'approvePlanAudioAssets',
      'registerPlanAudioAssetsForRuntime',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('uses the canonical preflight path', () => {
    expect(GAVAN_WEEK1_LIVE_ROUTE_REGRESSION_EVIDENCE_PREFLIGHT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-live-route-regression-evidence-preflight.json',
    ));
  });
});
