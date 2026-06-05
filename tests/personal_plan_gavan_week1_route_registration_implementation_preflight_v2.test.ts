import { readFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedRouteApprovalArtifactGate,
} from '../tools/personal_plan_gavan_week1_signed_route_approval_artifact_gate';
import {
  GAVAN_WEEK1_ROUTE_REGISTRATION_IMPLEMENTATION_PREFLIGHT_V2_PATH,
  buildGavanWeek1RouteRegistrationImplementationPreflightV2,
  writeGavanWeek1RouteRegistrationImplementationPreflightV2,
} from '../tools/personal_plan_gavan_week1_route_registration_implementation_preflight_v2';

const GENERATED_AT = '2026-06-04T21:35:00.000Z';

function artifactGate(
  overrides: Partial<GavanWeek1SignedRouteApprovalArtifactGate> = {},
): GavanWeek1SignedRouteApprovalArtifactGate {
  const base: GavanWeek1SignedRouteApprovalArtifactGate = {
    kind: 'gavan_week1_signed_route_approval_artifact_gate',
    generatedAt: GENERATED_AT,
    artifactOwnerId: 'route-signed-approval-artifact-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceIntakeStatus: 'blocked_missing_signed_payload',
    status: 'blocked_before_signed_payload_acceptance',
    releaseDecision: 'hold',
    signedApprovalArtifactReady: false,
    signedApprovalArtifactCreated: false,
    routeApprovalAccepted: false,
    approved: false,
    readyForLive: false,
    routeRegistrationAllowed: false,
    liveRegressionAllowed: false,
    deviceVerificationAllowed: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    summary: {
      intakeRequiredFieldCount: 7,
      intakeValidFieldCount: 0,
      intakeAcceptedEvidencePathCount: 0,
      intakeMissingEvidencePathCount: 13,
      carriedBlockerCount: 8,
      artifactBlockerCount: 6,
    },
    blockers: [
      {
        code: 'signed_payload_not_accepted',
        blocksProduction: true,
        detail: 'Signed route approval payload has not been accepted by the intake report.',
      },
      {
        code: 'signed_approval_artifact_not_created',
        blocksProduction: true,
        detail: 'A separate signed approval artifact has not been created.',
      },
      {
        code: 'route_registration_pass_required',
        blocksProduction: true,
        detail: 'Catalog, quiz, and UI route registration require a separate source-editing pass.',
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
      {
        code: 'audio_pronunciation_master_blockers_still_open',
        blocksProduction: true,
        detail: 'Audio and pronunciation blockers remain open in the master readiness matrix.',
      },
    ],
    requiredNextActions: [
      'Supply and accept a complete signed route approval payload in the intake report.',
      'Keep catalog, quiz, and UI route registration blocked until a separate signed approval artifact exists.',
    ],
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };

  return { ...base, ...overrides };
}

function candidateGate(): GavanWeek1SignedRouteApprovalArtifactGate {
  return artifactGate({
    sourceIntakeStatus: 'signed_payload_ready_for_separate_route_approval_review',
    status: 'signed_approval_artifact_candidate_ready_non_live',
    signedApprovalArtifactReady: true,
    summary: {
      intakeRequiredFieldCount: 7,
      intakeValidFieldCount: 7,
      intakeAcceptedEvidencePathCount: 13,
      intakeMissingEvidencePathCount: 0,
      carriedBlockerCount: 5,
      artifactBlockerCount: 5,
    },
    blockers: [
      {
        code: 'signed_approval_artifact_not_created',
        blocksProduction: true,
        detail: 'A separate signed approval artifact has not been created.',
      },
      {
        code: 'route_registration_pass_required',
        blocksProduction: true,
        detail: 'Catalog, quiz, and UI route registration require a separate source-editing pass.',
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
      {
        code: 'audio_pronunciation_master_blockers_still_open',
        blocksProduction: true,
        detail: 'Audio and pronunciation blockers remain open in the master readiness matrix.',
      },
    ],
  });
}

describe('Gavan week 1 route registration implementation preflight v2', () => {
  it('blocks source registration while signed approval artifact gate is not ready', () => {
    const result = buildGavanWeek1RouteRegistrationImplementationPreflightV2(artifactGate(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'route-registration-implementation-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.preflight).toMatchObject({
      kind: 'gavan_week1_route_registration_implementation_preflight_v2',
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
    });
    expect(result.preflight.summary).toEqual({
      routeFamilyCount: 3,
      blockedRouteFamilyCount: 3,
      plannedCatalogRouteCount: 7,
      plannedQuizRouteCount: 7,
      plannedUiOpeningContractCount: 5,
      signedApprovalArtifactReady: false,
      sourceRegistrationPlanReady: false,
      inheritedArtifactBlockerCount: 6,
      implementationBlockerCount: 7,
    });
    expect(result.preflight.blockers.map((blocker) => blocker.code)).toEqual([
      'signed_approval_artifact_not_ready',
      'source_registration_pass_not_started',
      'catalog_route_registration_blocked',
      'quiz_route_registration_blocked',
      'ui_route_registration_blocked',
      'live_regression_required',
      'device_verification_required',
    ]);
  });

  it('prepares only a separate non-live source-registration plan when artifact candidate is ready', () => {
    const result = buildGavanWeek1RouteRegistrationImplementationPreflightV2(candidateGate(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'route-registration-implementation-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.preflight).toMatchObject({
      status: 'source_registration_plan_ready_non_live',
      releaseDecision: 'hold',
      signedApprovalArtifactReady: true,
      sourceRegistrationPlanReady: true,
      routeRegistrationAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      readyForLive: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.preflight.summary).toEqual({
      routeFamilyCount: 3,
      blockedRouteFamilyCount: 3,
      plannedCatalogRouteCount: 7,
      plannedQuizRouteCount: 7,
      plannedUiOpeningContractCount: 5,
      signedApprovalArtifactReady: true,
      sourceRegistrationPlanReady: true,
      inheritedArtifactBlockerCount: 5,
      implementationBlockerCount: 6,
    });
    expect(result.preflight.registrationPlan.map((item) => item.id)).toEqual([
      'catalog_route_registration',
      'quiz_route_registration',
      'ui_route_registration',
    ]);
    expect(result.preflight.registrationPlan.every((item) =>
      item.status === 'blocked_waiting_for_source_registration_pass' &&
      item.sourceWritesAllowed === false &&
      item.liveRegistrationAllowed === false,
    )).toBe(true);
  });

  it('rejects unsafe artifact gates that already claim approval or live readiness', () => {
    const result = buildGavanWeek1RouteRegistrationImplementationPreflightV2(artifactGate({
      approved: true as false,
      readyForLive: true as false,
      routeRegistrationAllowed: true as false,
    }), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'route-registration-implementation-owner',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'artifact_gate_already_approved',
      'artifact_gate_not_non_live',
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-registration-implementation-preflight-v2.test.json',
    );

    const result = writeGavanWeek1RouteRegistrationImplementationPreflightV2(artifactGate(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'route-registration-implementation-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.preflight);
    expect(stored.status).toBe('blocked_before_signed_approval_artifact_candidate');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1RouteRegistrationImplementationPreflightV2(artifactGate(), {
      generatedAt: GENERATED_AT,
      registrationOwnerId: 'route-registration-implementation-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Route registration implementation preflight v2 can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_route_registration_implementation_preflight_v2.ts'),
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
    expect(GAVAN_WEEK1_ROUTE_REGISTRATION_IMPLEMENTATION_PREFLIGHT_V2_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-registration-implementation-preflight-v2.json',
    ));
  });
});
