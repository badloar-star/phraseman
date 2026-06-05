import { readFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1LiveRouteRegressionEvidencePreflight,
} from '../tools/personal_plan_gavan_week1_live_route_regression_evidence_preflight';
import {
  GAVAN_WEEK1_MASTER_FINAL_RELEASE_READINESS_V2_PATH,
  buildGavanWeek1MasterFinalReleaseReadinessV2,
  writeGavanWeek1MasterFinalReleaseReadinessV2,
  type GavanWeek1MasterProductionReadinessMatrixInput,
} from '../tools/personal_plan_gavan_week1_master_final_release_readiness_v2';

const GENERATED_AT = '2026-06-04T23:05:00.000Z';

function masterMatrix(): GavanWeek1MasterProductionReadinessMatrixInput {
  return {
    kind: 'gavan_week1_master_production_readiness_matrix',
    generatedAt: GENERATED_AT,
    matrixOwnerId: 'master-production-readiness-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'hold_audio_pronunciation_route_blocked',
    releaseDecision: 'hold',
    productionReady: false,
    readyForLive: false,
    audioProductionReady: false,
    pronunciationProductionReady: false,
    routeProductionReady: false,
    allExplicitApprovalsPresent: false,
    liveAssetRegistrationAllowed: false,
    liveRouteRegistrationAllowed: false,
    liveRuntimeChangesAllowed: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    summary: {
      layerCount: 3,
      holdLayerCount: 3,
      productionReadyLayerCount: 0,
      totalBlockerCount: 20,
      audioExpectedMp3Count: 10,
      audioApprovedFinalCount: 0,
      pronunciationReferenceCount: 4,
      pronunciationApprovedReferenceCount: 0,
      routeWorkflowStageCount: 8,
      routeBlockedWorkflowStageCount: 8,
      liveArtifactCount: 0,
    },
    layers: [
      {
        id: 'audio',
        status: 'blocked_before_generated_file_validation',
        releaseDecision: 'hold',
        productionReady: false,
        readyForLive: false,
        liveWriteAllowed: false,
        blockerCount: 5,
        requiredNextAction: 'Validate the 10 real MP3 files.',
      },
      {
        id: 'pronunciation',
        status: 'blocked_before_scorer_provider_contract',
        releaseDecision: 'hold',
        productionReady: false,
        readyForLive: false,
        liveWriteAllowed: false,
        blockerCount: 7,
        requiredNextAction: 'Attach a real scorer provider.',
      },
      {
        id: 'route',
        status: 'blocked_before_product_copy_signature',
        releaseDecision: 'hold',
        productionReady: false,
        readyForLive: false,
        liveWriteAllowed: false,
        blockerCount: 8,
        requiredNextAction: 'Collect route approval.',
      },
    ],
    blockers: [
      ...Array.from({ length: 5 }, (_, index) => ({
        code: `audio_blocker_${index + 1}`,
        layer: 'audio' as const,
        blocksProduction: true as const,
        detail: 'Audio blocker.',
      })),
      ...Array.from({ length: 7 }, (_, index) => ({
        code: `pronunciation_blocker_${index + 1}`,
        layer: 'pronunciation' as const,
        blocksProduction: true as const,
        detail: 'Pronunciation blocker.',
      })),
      ...Array.from({ length: 8 }, (_, index) => ({
        code: `route_blocker_${index + 1}`,
        layer: 'route' as const,
        blocksProduction: true as const,
        detail: 'Route blocker.',
      })),
    ],
    artifactPaths: {
      finalAudioApprovalWorkflowAudit: '.codex-tmp/personal-plans/gavan-week1-final-audio-approval-workflow-audit.json',
      pronunciationApprovalWorkflowAudit: '.codex-tmp/personal-plans/gavan-week1-pronunciation-approval-workflow-audit.json',
      routeLiveReleaseWorkflowAudit: '.codex-tmp/personal-plans/gavan-week1-route-live-release-workflow-audit.json',
      masterProductionReadinessMatrix: '.codex-tmp/personal-plans/gavan-week1-master-production-readiness-matrix.json',
    },
    requiredNextActions: [],
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };
}

function regressionPreflight(): GavanWeek1LiveRouteRegressionEvidencePreflight {
  return {
    kind: 'gavan_week1_live_route_regression_evidence_preflight',
    generatedAt: GENERATED_AT,
    evidenceOwnerId: 'route-regression-evidence-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceRegistrationPreflightStatus: 'blocked_before_signed_approval_artifact_candidate',
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
    regressionSuites: Array.from({ length: 7 }, (_, index) => ({
      id: `regression_${index + 1}` as GavanWeek1LiveRouteRegressionEvidencePreflight['regressionSuites'][number]['id'],
      status: 'blocked_not_run',
      requiredAfterSourceRegistration: true,
    })),
    deviceChecks: Array.from({ length: 5 }, (_, index) => ({
      id: `device_${index + 1}` as GavanWeek1LiveRouteRegressionEvidencePreflight['deviceChecks'][number]['id'],
      status: 'blocked_not_verified',
      requiredAfterSourceRegistration: true,
    })),
    summary: {
      regressionSuiteCount: 7,
      blockedRegressionSuiteCount: 7,
      deviceCheckCount: 5,
      blockedDeviceCheckCount: 5,
      routeFamilyCount: 3,
      routeRegistrationComplete: false,
      inheritedImplementationBlockerCount: 7,
      evidenceBlockerCount: 6,
    },
    blockers: [
      'source_registration_plan_not_ready',
      'route_registration_not_complete',
      'home_onboarding_premium_regression_not_run',
      'catalog_quiz_ui_route_regression_not_run',
      'device_route_opening_not_verified',
      'audio_pronunciation_master_blockers_still_open',
    ].map((code) => ({
      code,
      blocksProduction: true,
      detail: 'Regression evidence blocker.',
    })),
    requiredNextActions: [],
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };
}

describe('Gavan week 1 master final release readiness v2', () => {
  it('holds final release across audio pronunciation and extended route evidence blockers', () => {
    const result = buildGavanWeek1MasterFinalReleaseReadinessV2(masterMatrix(), regressionPreflight(), {
      generatedAt: GENERATED_AT,
      releaseOwnerId: 'master-final-release-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.readiness).toMatchObject({
      kind: 'gavan_week1_master_final_release_readiness_v2',
      status: 'hold_audio_pronunciation_route_evidence_blocked',
      releaseDecision: 'hold',
      finalReleaseReady: false,
      productionReady: false,
      readyForLive: false,
      audioReady: false,
      pronunciationReady: false,
      routeReady: false,
      regressionEvidenceReady: false,
      deviceEvidenceReady: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.readiness.summary).toEqual({
      sourceLayerCount: 2,
      finalLayerCount: 3,
      productionReadyLayerCount: 0,
      masterBlockerCount: 20,
      routeEvidenceBlockerCount: 6,
      totalBlockerCount: 26,
      audioExpectedMp3Count: 10,
      pronunciationReferenceCount: 4,
      routeWorkflowStageCount: 8,
      routeRegressionSuiteCount: 7,
      routeDeviceCheckCount: 5,
    });
    expect(result.readiness.layers.map((layer) => layer.id)).toEqual([
      'audio',
      'pronunciation',
      'route',
    ]);
    expect(result.readiness.layers.map((layer) => layer.blockerCount)).toEqual([5, 7, 14]);
  });

  it('carries route regression and device blockers as final release blockers', () => {
    const result = buildGavanWeek1MasterFinalReleaseReadinessV2(masterMatrix(), regressionPreflight(), {
      generatedAt: GENERATED_AT,
      releaseOwnerId: 'master-final-release-owner',
    });

    expect(result.readiness.blockers).toHaveLength(26);
    expect(result.readiness.blockers.slice(-6).map((blocker) => blocker.code)).toEqual([
      'route_evidence_source_registration_plan_not_ready',
      'route_evidence_route_registration_not_complete',
      'route_evidence_home_onboarding_premium_regression_not_run',
      'route_evidence_catalog_quiz_ui_route_regression_not_run',
      'route_evidence_device_route_opening_not_verified',
      'route_evidence_audio_pronunciation_master_blockers_still_open',
    ]);
  });

  it('rejects unsafe source artifacts that already claim production readiness', () => {
    const result = buildGavanWeek1MasterFinalReleaseReadinessV2(
      { ...masterMatrix(), productionReady: true as false },
      { ...regressionPreflight(), readyForLive: true as false },
      {
        generatedAt: GENERATED_AT,
        releaseOwnerId: 'master-final-release-owner',
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'master_matrix_not_non_live',
      'route_evidence_not_non_live',
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-master-final-release-readiness-v2.test.json',
    );

    const result = writeGavanWeek1MasterFinalReleaseReadinessV2(masterMatrix(), regressionPreflight(), {
      generatedAt: GENERATED_AT,
      releaseOwnerId: 'master-final-release-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.readiness);
    expect(stored.status).toBe('hold_audio_pronunciation_route_evidence_blocked');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1MasterFinalReleaseReadinessV2(masterMatrix(), regressionPreflight(), {
      generatedAt: GENERATED_AT,
      releaseOwnerId: 'master-final-release-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Master final release readiness v2 can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_master_final_release_readiness_v2.ts'),
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

  it('uses the canonical readiness path', () => {
    expect(GAVAN_WEEK1_MASTER_FINAL_RELEASE_READINESS_V2_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-master-final-release-readiness-v2.json',
    ));
  });
});
