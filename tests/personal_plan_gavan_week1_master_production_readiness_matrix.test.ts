import { readFileSync } from 'fs';
import path from 'path';

import {
  GAVAN_WEEK1_MASTER_PRODUCTION_READINESS_MATRIX_PATH,
  buildGavanWeek1MasterProductionReadinessMatrix,
  writeGavanWeek1MasterProductionReadinessMatrix,
} from '../tools/personal_plan_gavan_week1_master_production_readiness_matrix';

const OPTIONS = {
  generatedAt: '2026-06-04T19:15:00.000Z',
  matrixOwnerId: 'master-production-readiness-owner',
  audio: {
    ownerId: 'audio-handoff-owner',
    intakeOwnerId: 'audio-intake-owner',
    approvalOwnerId: 'audio-approval-owner',
    registrationOwnerId: 'audio-registration-owner',
    recordPacketOwnerId: 'audio-record-packet-owner',
    readinessOwnerId: 'audio-production-readiness-owner',
    workflowOwnerId: 'audio-final-approval-workflow-owner',
    outputRoot: 'assets/audio/personal-plans',
  },
  pronunciation: {
    evidenceOwnerId: 'pronunciation-evidence-owner',
    readinessOwnerId: 'pronunciation-production-readiness-owner',
    workflowOwnerId: 'pronunciation-approval-workflow-owner',
  },
  route: {
    workflowOwnerId: 'route-live-release-workflow-owner',
  },
};

describe('Gavan week 1 master production readiness matrix', () => {
  it('holds production until audio, pronunciation, and route live-release evidence are all real and approved', () => {
    const result = buildGavanWeek1MasterProductionReadinessMatrix(OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.matrix).toMatchObject({
      kind: 'gavan_week1_master_production_readiness_matrix',
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
    });

    expect(result.matrix.summary).toEqual({
      layerCount: 3,
      holdLayerCount: 3,
      productionReadyLayerCount: 0,
      totalBlockerCount: 18,
      audioExpectedMp3Count: 10,
      audioApprovedFinalCount: 0,
      pronunciationReferenceCount: 4,
      pronunciationApprovedReferenceCount: 0,
      routeWorkflowStageCount: 8,
      routeBlockedWorkflowStageCount: 8,
      liveArtifactCount: 0,
    });

    expect(result.matrix.layers.map((layer) => layer.id)).toEqual([
      'audio',
      'pronunciation',
      'route',
    ]);
    expect(result.matrix.layers.every((layer) =>
      layer.releaseDecision === 'hold' &&
      layer.productionReady === false &&
      layer.readyForLive === false &&
      layer.liveWriteAllowed === false,
    )).toBe(true);
    expect(result.matrix.layers.map((layer) => layer.status)).toEqual([
      'blocked_before_reviewer_signoff',
      'blocked_before_scorer_provider_contract',
      'blocked_before_product_copy_signature',
    ]);
    expect(result.matrix.blockers.map((blocker) => blocker.code)).toEqual([
      'audio_reviewer_signoff_blocked',
      'audio_final_audio_promotion_blocked',
      'audio_live_audio_registry_blocked',
      'pronunciation_missing_scorer_provider',
      'pronunciation_missing_recording_evidence',
      'pronunciation_missing_scored_attempt_evidence',
      'pronunciation_reviewer_signoff_blocked',
      'pronunciation_final_scorer_promotion_blocked',
      'pronunciation_live_adapter_blocked',
      'pronunciation_progress_penalty_blocked',
      'route_missing_product_copy_signature',
      'route_route_signature_not_signed',
      'route_route_approval_guard_unsigned',
      'route_catalog_routes_not_registered',
      'route_quiz_routes_not_registered',
      'route_ui_routes_not_registered',
      'route_live_route_regression_not_run',
      'route_device_route_opening_not_verified',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-master-production-readiness-matrix.test.json',
    );

    const result = writeGavanWeek1MasterProductionReadinessMatrix({
      ...OPTIONS,
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.matrix);
    expect(stored.status).toBe('hold_audio_pronunciation_route_blocked');
    expect(stored.summary.totalBlockerCount).toBe(18);
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1MasterProductionReadinessMatrix({
      ...OPTIONS,
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Master production readiness matrix can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_master_production_readiness_matrix.ts'),
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
});
