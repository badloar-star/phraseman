import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1RoutePrerequisiteArtifactRefresh,
  ensureGavanWeek1RoutePrerequisiteArtifacts,
  GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH,
  writeGavanWeek1RoutePrerequisiteArtifactRefresh,
} from '../tools/personal_plan_gavan_week1_route_prerequisite_artifact_refresh';

const EXPECTED_ARTIFACT_BASENAMES = [
  'gavan-week1-approval-readiness-manifest.json',
  'gavan-week1-bridge-diff-preflight-plan.json',
  'gavan-week1-future-bridge-approval-contract.json',
  'gavan-week1-future-bridge-guard-report.json',
  'gavan-week1-blocker-resolution-roadmap.json',
  'gavan-week1-product-copy-approval-packet.json',
  'gavan-week1-product-copy-signature-request-packet.json',
  'gavan-week1-catalog-route-preflight.json',
  'gavan-week1-catalog-source-inventory.json',
  'gavan-week1-catalog-adapter-design.json',
  'gavan-week1-quiz-source-inventory.json',
  'gavan-week1-quiz-adapter-design.json',
  'gavan-week1-ui-route-source-inventory.json',
  'gavan-week1-ui-route-adapter-design.json',
  'gavan-week1-aggregate-route-readiness-gate.json',
  'gavan-week1-route-signature-request-packet.json',
  'gavan-week1-route-approval-guard.json',
];

function readJson<T>(targetPath: string): T {
  return JSON.parse(readFileSync(targetPath, 'utf8')) as T;
}

describe('Gavan week 1 route prerequisite artifact refresh', () => {
  it('builds a non-live refresh plan for the full route signature prerequisite bundle', () => {
    const result = buildGavanWeek1RoutePrerequisiteArtifactRefresh({
      generatedAt: '2026-06-04T00:00:00.000Z',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.refresh).toMatchObject({
      kind: 'gavan_week1_route_prerequisite_artifact_refresh',
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'route_prerequisites_refreshed_non_live',
      readyForLive: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      audioApprovalMayBeInferred: false,
      routeApprovalMayBeInferred: false,
    });
    expect(result.refresh?.summary).toEqual({
      expectedArtifactCount: EXPECTED_ARTIFACT_BASENAMES.length,
      writtenArtifactCount: EXPECTED_ARTIFACT_BASENAMES.length,
      failedArtifactCount: 0,
      liveArtifactCount: 0,
    });
    expect(result.refresh?.artifacts.map((artifact) => path.basename(artifact.path))).toEqual(
      EXPECTED_ARTIFACT_BASENAMES,
    );
    expect(result.refresh?.artifacts.every((artifact) => artifact.liveEditsAllowed === false)).toBe(true);
  });

  it('writes every prerequisite artifact under .codex-tmp plus a refresh summary', () => {
    const result = writeGavanWeek1RoutePrerequisiteArtifactRefresh({
      generatedAt: '2026-06-04T00:00:00.000Z',
      targetPath: GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(result.targetPath).toBe(GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH);

    for (const basename of EXPECTED_ARTIFACT_BASENAMES) {
      const artifactPath = path.join(process.cwd(), '.codex-tmp', 'personal-plans', basename);
      expect(existsSync(artifactPath)).toBe(true);
    }

    const parsed = readJson<ReturnType<typeof buildGavanWeek1RoutePrerequisiteArtifactRefresh>['refresh']>(
      GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH,
    );
    expect(parsed?.kind).toBe('gavan_week1_route_prerequisite_artifact_refresh');
    expect(parsed?.artifacts).toHaveLength(EXPECTED_ARTIFACT_BASENAMES.length);
  });

  it('bootstraps missing prerequisite artifacts for isolated route-chain suites', () => {
    for (const basename of EXPECTED_ARTIFACT_BASENAMES) {
      rmSync(path.join(process.cwd(), '.codex-tmp', 'personal-plans', basename), { force: true });
    }

    const result = ensureGavanWeek1RoutePrerequisiteArtifacts({
      generatedAt: '2026-06-04T00:00:00.000Z',
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.refreshed).toBe(true);
    expect(result.missingBefore).toEqual(EXPECTED_ARTIFACT_BASENAMES);
    expect(result.refresh?.summary.writtenArtifactCount).toBe(EXPECTED_ARTIFACT_BASENAMES.length);
    for (const basename of EXPECTED_ARTIFACT_BASENAMES) {
      expect(existsSync(path.join(process.cwd(), '.codex-tmp', 'personal-plans', basename))).toBe(true);
    }
  });

  it('rejects source and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'gavan-week1-route-prerequisite-artifact-refresh.json'),
      path.join(process.cwd(), 'tools', 'gavan-week1-route-prerequisite-artifact-refresh.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1RoutePrerequisiteArtifactRefresh({
        generatedAt: '2026-06-04T00:00:00.000Z',
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Route prerequisite artifact refresh can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import runtime navigation storage audio workers or source mutation helpers', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_route_prerequisite_artifact_refresh.ts'),
      'utf8',
    );

    for (const forbidden of [
      'AsyncStorage',
      'react-native',
      'navigation',
      'expo-av',
      'expo-audio',
      'personal_plan_audio_openai_worker',
      'Remove-Item',
      'git checkout',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });
});
