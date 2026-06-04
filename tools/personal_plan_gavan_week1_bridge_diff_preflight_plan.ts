import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ApprovalReadinessManifest,
  GavanWeek1ReleaseBlocker,
} from './personal_plan_gavan_week1_approval_readiness_manifest';

export const GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-bridge-diff-preflight-plan.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1BridgeSurfaceCode =
  | 'catalog_route'
  | 'quiz_route'
  | 'ui_route'
  | 'audio_pipeline'
  | 'pronunciation_scoring'
  | 'cloud_sync_bridge';

export type GavanWeek1BridgeSurfaceStatus = 'connected' | 'missing_or_not_connected';

export type GavanWeek1ProductionSurfaceMetadata = {
  catalogSource: string;
  quizSource: string;
  uiRouteSources: string[];
  audioPipelineReady: boolean;
  pronunciationScoringReady: boolean;
  cloudSyncBridgeReady: boolean;
};

export type GavanWeek1BridgeRequiredSurface = {
  code: GavanWeek1BridgeSurfaceCode;
  status: GavanWeek1BridgeSurfaceStatus;
  reason: string;
  requiredForLiveRelease: true;
};

export type GavanWeek1BridgeDiffPreflightPlan = {
  kind: 'gavan_week1_bridge_diff_preflight_plan';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceManifestStatus: GavanWeek1ApprovalReadinessManifest['weekStatus'];
  status: 'bridge_plan_only_not_applied';
  liveIntegration: false;
  applied: false;
  inputSummary: {
    approvedDays: number;
    dayIds: string[];
    totalApprovedRows: number;
  };
  requiredSurfaces: GavanWeek1BridgeRequiredSurface[];
  preservedReleaseBlockers: GavanWeek1ReleaseBlocker[];
  sourceFindings: {
    catalogContainsWeekDayIds: boolean;
    quizContainsWeekDayIds: boolean;
    uiContainsWeekRoute: boolean;
    catalogContainsBrokenEncoding: boolean;
    legacyPlanQuizIdsDisabled: boolean;
  };
  nextLiveBridgeSteps: string[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1BridgeDiffPreflightPlanOptions = {
  generatedAt: string;
  metadata: GavanWeek1ProductionSurfaceMetadata;
};

export type GavanWeek1BridgeDiffPreflightPlanWriteOptions =
  GavanWeek1BridgeDiffPreflightPlanOptions & {
    targetPath: string;
  };

export type GavanWeek1BridgeDiffPreflightPlanIssueCode =
  | 'wrong_manifest_kind'
  | 'wrong_plan_or_week'
  | 'live_manifest_not_allowed'
  | 'missing_surface'
  | 'release_blockers_not_preserved'
  | 'target_path_not_allowed';

export type GavanWeek1BridgeDiffPreflightPlanIssue = {
  code: GavanWeek1BridgeDiffPreflightPlanIssueCode;
  detail: string;
  surfaceCode?: GavanWeek1BridgeSurfaceCode;
};

export type GavanWeek1BridgeDiffPreflightPlanBuildResult = {
  valid: boolean;
  issues: GavanWeek1BridgeDiffPreflightPlanIssue[];
  plan?: GavanWeek1BridgeDiffPreflightPlan;
};

export type GavanWeek1BridgeDiffPreflightPlanWriteResult =
  GavanWeek1BridgeDiffPreflightPlanBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1BridgeDiffPreflightPlanIssueCode,
  detail: string,
  surfaceCode?: GavanWeek1BridgeSurfaceCode,
): GavanWeek1BridgeDiffPreflightPlanIssue {
  return { code, detail, surfaceCode };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1BridgeDiffPreflightPlanTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function sourceContainsEveryDayId(source: string, dayIds: string[]): boolean {
  return dayIds.length > 0 && dayIds.every((dayId) => source.includes(dayId));
}

function uiContainsWeekRoute(uiRouteSources: string[]): boolean {
  return uiRouteSources.some((source) =>
    source.includes('gavan-week1') || source.includes('gavan_week1'),
  );
}

function brokenEncoding(source: string): boolean {
  return /[\u00d0\u00c2\u00e2\ufffd]/.test(source);
}

function statusFor(condition: boolean): GavanWeek1BridgeSurfaceStatus {
  return condition ? 'connected' : 'missing_or_not_connected';
}

function requiredSurface(
  code: GavanWeek1BridgeSurfaceCode,
  status: GavanWeek1BridgeSurfaceStatus,
  reason: string,
): GavanWeek1BridgeRequiredSurface {
  return {
    code,
    status,
    reason,
    requiredForLiveRelease: true,
  };
}

function requiredSurfaces(
  dayIds: string[],
  metadata: GavanWeek1ProductionSurfaceMetadata,
): GavanWeek1BridgeRequiredSurface[] {
  const catalogConnected = sourceContainsEveryDayId(metadata.catalogSource, dayIds);
  const quizConnected = sourceContainsEveryDayId(metadata.quizSource, dayIds);
  const uiConnected = uiContainsWeekRoute(metadata.uiRouteSources);

  return [
    requiredSurface(
      'catalog_route',
      statusFor(catalogConnected),
      catalogConnected
        ? 'Approved week day ids are visible in the current plan catalog source.'
        : 'Approved week day ids are not connected to the current plan catalog source.',
    ),
    requiredSurface(
      'quiz_route',
      statusFor(quizConnected),
      quizConnected
        ? 'Approved week day ids are visible in the current plan quiz source.'
        : 'Approved week day ids are not connected to the current plan quiz source.',
    ),
    requiredSurface(
      'ui_route',
      statusFor(uiConnected),
      uiConnected
        ? 'A week route marker is visible in the inspected UI route sources.'
        : 'No inspected UI source exposes a week route for this approved content.',
    ),
    requiredSurface(
      'audio_pipeline',
      statusFor(metadata.audioPipelineReady),
      metadata.audioPipelineReady
        ? 'Final audio pipeline is explicitly marked ready in the metadata.'
        : 'Final audio pipeline is not ready; no fake audio may be claimed.',
    ),
    requiredSurface(
      'pronunciation_scoring',
      statusFor(metadata.pronunciationScoringReady),
      metadata.pronunciationScoringReady
        ? 'Pronunciation scoring is explicitly marked ready in the metadata.'
        : 'Pronunciation scoring is not ready; no fake scoring may be claimed.',
    ),
    requiredSurface(
      'cloud_sync_bridge',
      statusFor(metadata.cloudSyncBridgeReady),
      metadata.cloudSyncBridgeReady
        ? 'Week progress sync bridge is explicitly marked ready in the metadata.'
        : 'Week progress sync bridge is not connected yet.',
    ),
  ];
}

function nextLiveBridgeSteps(surfaces: GavanWeek1BridgeRequiredSurface[]): string[] {
  return surfaces
    .filter((surface) => surface.status === 'missing_or_not_connected')
    .map((surface) => `Connect and verify ${surface.code} before applying any live bridge.`);
}

export function buildGavanWeek1BridgeDiffPreflightPlan(
  manifest: GavanWeek1ApprovalReadinessManifest,
  options: GavanWeek1BridgeDiffPreflightPlanOptions,
): GavanWeek1BridgeDiffPreflightPlanBuildResult {
  const issues: GavanWeek1BridgeDiffPreflightPlanIssue[] = [];

  if (manifest.kind !== 'gavan_week1_approval_readiness_manifest') {
    issues.push(issue('wrong_manifest_kind', 'Expected the Gavan week 1 approval readiness manifest.'));
  }

  if (manifest.planId !== 'gavan' || manifest.weekId !== 'gavan-week1') {
    issues.push(issue('wrong_plan_or_week', 'Bridge preflight can only inspect Gavan week 1.'));
  }

  if (manifest.liveIntegration !== false || manifest.weekStatus !== 'approved_non_live_not_playable') {
    issues.push(issue(
      'live_manifest_not_allowed',
      'Bridge preflight must start from approved non-live content, not from live content.',
    ));
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const dayIds = manifest.days.map((day) => day.dayId);
  const surfaces = requiredSurfaces(dayIds, options.metadata);

  return {
    valid: true,
    issues: [],
    plan: {
      kind: 'gavan_week1_bridge_diff_preflight_plan',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceManifestStatus: manifest.weekStatus,
      status: 'bridge_plan_only_not_applied',
      liveIntegration: false,
      applied: false,
      inputSummary: {
        approvedDays: manifest.days.length,
        dayIds,
        totalApprovedRows: manifest.totals.totalApproved,
      },
      requiredSurfaces: surfaces,
      preservedReleaseBlockers: manifest.releaseBlockers,
      sourceFindings: {
        catalogContainsWeekDayIds: sourceContainsEveryDayId(options.metadata.catalogSource, dayIds),
        quizContainsWeekDayIds: sourceContainsEveryDayId(options.metadata.quizSource, dayIds),
        uiContainsWeekRoute: uiContainsWeekRoute(options.metadata.uiRouteSources),
        catalogContainsBrokenEncoding: brokenEncoding(options.metadata.catalogSource),
        legacyPlanQuizIdsDisabled:
          options.metadata.quizSource.includes('gavan_day1_identity') &&
          options.metadata.quizSource.includes('gavan_day2_address'),
      },
      nextLiveBridgeSteps: nextLiveBridgeSteps(surfaces),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function validateGavanWeek1BridgeDiffPreflightPlan(
  plan: GavanWeek1BridgeDiffPreflightPlan,
): GavanWeek1BridgeDiffPreflightPlanBuildResult {
  const issues: GavanWeek1BridgeDiffPreflightPlanIssue[] = [];
  const requiredCodes: GavanWeek1BridgeSurfaceCode[] = [
    'catalog_route',
    'quiz_route',
    'ui_route',
    'audio_pipeline',
    'pronunciation_scoring',
    'cloud_sync_bridge',
  ];

  if (plan.kind !== 'gavan_week1_bridge_diff_preflight_plan' || plan.status !== 'bridge_plan_only_not_applied') {
    issues.push(issue('wrong_manifest_kind', 'Expected a non-applied Gavan week 1 bridge preflight plan.'));
  }

  if (plan.liveIntegration !== false || plan.applied !== false) {
    issues.push(issue('live_manifest_not_allowed', 'Preflight plan must not claim live integration.'));
  }

  requiredCodes.forEach((code) => {
    if (!plan.requiredSurfaces.some((surface) => surface.code === code)) {
      issues.push(issue('missing_surface', `Missing required production surface: ${code}.`, code));
    }
  });

  if (plan.preservedReleaseBlockers.length === 0) {
    issues.push(issue(
      'release_blockers_not_preserved',
      'Approval readiness release blockers must remain visible in the bridge plan.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
    plan: issues.length === 0 ? plan : undefined,
  };
}

export function serializeGavanWeek1BridgeDiffPreflightPlan(
  plan: GavanWeek1BridgeDiffPreflightPlan,
): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function writeGavanWeek1BridgeDiffPreflightPlan(
  manifest: GavanWeek1ApprovalReadinessManifest,
  options: GavanWeek1BridgeDiffPreflightPlanWriteOptions,
): GavanWeek1BridgeDiffPreflightPlanWriteResult {
  const buildResult = buildGavanWeek1BridgeDiffPreflightPlan(manifest, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.plan) {
    return buildResult;
  }

  if (!isGavanWeek1BridgeDiffPreflightPlanTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Bridge diff preflight plan can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const validation = validateGavanWeek1BridgeDiffPreflightPlan(buildResult.plan);
  if (!validation.valid) {
    return validation;
  }

  const serialized = serializeGavanWeek1BridgeDiffPreflightPlan(buildResult.plan);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    plan: buildResult.plan,
  };
}
