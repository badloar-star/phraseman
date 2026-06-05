import { readFileSync } from 'fs';
import path from 'path';

import {
  GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH,
  buildGavanWeek1RouteLiveReleaseWorkflowAudit,
  writeGavanWeek1RouteLiveReleaseWorkflowAudit,
} from '../tools/personal_plan_gavan_week1_route_live_release_workflow_audit';

const OPTIONS = {
  generatedAt: '2026-06-04T18:30:00.000Z',
  workflowOwnerId: 'route-live-release-workflow-owner',
};

describe('Gavan week 1 route live-release workflow audit', () => {
  it('blocks live route release before product-copy signature and route approval exist', () => {
    const result = buildGavanWeek1RouteLiveReleaseWorkflowAudit(OPTIONS);

    expect(result.valid).toBe(true);
    expect(result.audit).toMatchObject({
      kind: 'gavan_week1_route_live_release_workflow_audit',
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceRefreshStatus: 'route_prerequisites_refreshed_non_live',
      status: 'blocked_before_product_copy_signature',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      routeLiveReleaseReady: false,
      productCopySignatureReady: false,
      routeSignatureReady: false,
      routeApprovalReady: false,
      liveImplementationAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      liveRegressionReady: false,
      deviceVerificationReady: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.audit.summary).toEqual({
      prerequisiteArtifactCount: 17,
      nonLiveArtifactCount: 17,
      liveArtifactCount: 0,
      routeBlockerCount: 5,
      liveAcceptanceCriterionCount: 4,
      workflowStageCount: 8,
      blockedWorkflowStageCount: 8,
      blockerCount: 8,
    });
    expect(result.audit.workflowStages.map((stage) => stage.id)).toEqual([
      'product_copy_signature',
      'route_signature_request',
      'route_approval_guard',
      'catalog_route_registration',
      'quiz_route_registration',
      'ui_route_registration',
      'live_route_regression',
      'device_route_opening_verification',
    ]);
    expect(result.audit.workflowStages.every((stage) =>
      stage.status === 'blocked' &&
      stage.productionReady === false &&
      stage.liveWriteAllowed === false,
    )).toBe(true);
    expect(result.audit.blockers.map((blocker) => blocker.code)).toEqual([
      'missing_product_copy_signature',
      'route_signature_not_signed',
      'route_approval_guard_unsigned',
      'catalog_routes_not_registered',
      'quiz_routes_not_registered',
      'ui_routes_not_registered',
      'live_route_regression_not_run',
      'device_route_opening_not_verified',
    ]);
  });

  it('writes deterministic JSON and restores prerequisite artifacts only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-live-release-workflow-audit.test.json',
    );
    const result = writeGavanWeek1RouteLiveReleaseWorkflowAudit({
      ...OPTIONS,
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(0);

    const parsed = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_route_live_release_workflow_audit');
    expect(parsed.status).toBe('blocked_before_product_copy_signature');
    expect(parsed.summary.blockedWorkflowStageCount).toBe(8);
  });

  it('rejects runtime, route source, storage, audio, and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_catalog.ts'),
      path.join(process.cwd(), 'app', 'personal_plan_day_open_actions.ts'),
      path.join(process.cwd(), 'app', 'personal_plan_navigation.ts'),
      path.join(process.cwd(), 'assets', 'audio', 'personal-plans', 'gavan-week1-route-release.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1RouteLiveReleaseWorkflowAudit({
        ...OPTIONS,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Route live-release workflow audit can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate runtime UI storage navigation audio or approval writers', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_route_live_release_workflow_audit.ts'),
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

  it('exposes the canonical audit path', () => {
    expect(GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-route-live-release-workflow-audit.json',
    ));
  });
});
