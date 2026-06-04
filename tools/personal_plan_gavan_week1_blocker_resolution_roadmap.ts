import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1FutureBridgeGuardReport,
} from './personal_plan_gavan_week1_future_bridge_guard_report';

export const GAVAN_WEEK1_BLOCKER_RESOLUTION_ROADMAP_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-blocker-resolution-roadmap.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1BlockerResolutionWorkPackageId =
  | 'product_copy_review'
  | 'catalog_route_plan'
  | 'quiz_route_plan'
  | 'ui_route_plan'
  | 'audio_pipeline_plan'
  | 'pronunciation_policy_plan'
  | 'cloud_sync_bridge_plan'
  | 'final_release_approval';

export type GavanWeek1BlockerResolutionWorkPackage = {
  id: GavanWeek1BlockerResolutionWorkPackageId;
  order: number;
  title: string;
  state: 'not_started';
  liveEditsAllowed: false;
  dependsOn: GavanWeek1BlockerResolutionWorkPackageId[];
  blockerIds: string[];
  acceptanceCriteria: string[];
};

export type GavanWeek1BlockerResolutionRoadmap = {
  kind: 'gavan_week1_blocker_resolution_roadmap';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: 'blocker_resolution_roadmap_only_not_applied';
  sourceGuardStatus: GavanWeek1FutureBridgeGuardReport['status'];
  sourceGuardGeneratedAt: string;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  implementationTaskAllowed: false;
  sourceBlockerSummary: GavanWeek1FutureBridgeGuardReport['blockerSummary'];
  workPackages: GavanWeek1BlockerResolutionWorkPackage[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1BlockerResolutionRoadmapOptions = {
  generatedAt: string;
};

export type GavanWeek1BlockerResolutionRoadmapWriteOptions =
  GavanWeek1BlockerResolutionRoadmapOptions & {
    targetPath: string;
  };

export type GavanWeek1BlockerResolutionRoadmapIssueCode =
  | 'wrong_guard_kind'
  | 'wrong_guard_status'
  | 'implementation_already_allowed'
  | 'source_writes_not_allowed'
  | 'target_path_not_allowed';

export type GavanWeek1BlockerResolutionRoadmapIssue = {
  code: GavanWeek1BlockerResolutionRoadmapIssueCode;
  detail: string;
};

export type GavanWeek1BlockerResolutionRoadmapBuildResult = {
  valid: boolean;
  issues: GavanWeek1BlockerResolutionRoadmapIssue[];
  roadmap?: GavanWeek1BlockerResolutionRoadmap;
};

export type GavanWeek1BlockerResolutionRoadmapWriteResult =
  GavanWeek1BlockerResolutionRoadmapBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1BlockerResolutionRoadmapIssueCode,
  detail: string,
): GavanWeek1BlockerResolutionRoadmapIssue {
  return { code, detail };
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

export function isGavanWeek1BlockerResolutionRoadmapTargetAllowed(
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

function existingBlockerIds(
  guard: GavanWeek1FutureBridgeGuardReport,
  ids: string[],
): string[] {
  const existing = new Set(guard.blockers.map((blocker) => blocker.id));
  return ids.filter((id) => existing.has(id));
}

function workPackage(
  guard: GavanWeek1FutureBridgeGuardReport,
  order: number,
  id: GavanWeek1BlockerResolutionWorkPackageId,
  title: string,
  dependsOn: GavanWeek1BlockerResolutionWorkPackageId[],
  blockerIds: string[],
  acceptanceCriteria: string[],
): GavanWeek1BlockerResolutionWorkPackage {
  return {
    id,
    order,
    title,
    state: 'not_started',
    liveEditsAllowed: false,
    dependsOn,
    blockerIds: existingBlockerIds(guard, blockerIds),
    acceptanceCriteria,
  };
}

function buildWorkPackages(
  guard: GavanWeek1FutureBridgeGuardReport,
): GavanWeek1BlockerResolutionWorkPackage[] {
  return [
    workPackage(
      guard,
      1,
      'product_copy_review',
      'Product copy approval packet',
      [],
      ['missing_signature:product_copy'],
      [
        'Approved copy packet confirms no developer draft wording remains.',
        'Approval packet keeps all week 1 phrases broad, social, and product-safe.',
      ],
    ),
    workPackage(
      guard,
      2,
      'catalog_route_plan',
      'Catalog route dry-run plan',
      ['product_copy_review'],
      [
        'missing_signature:catalog_route',
        'missing_surface:catalog_route',
        'release_blocker:no_live_catalog_route',
      ],
      [
        'Dry-run route maps approved day ids without editing the live catalog.',
        'Route plan preserves existing catalog behavior and defines a rollback-free gate.',
      ],
    ),
    workPackage(
      guard,
      3,
      'quiz_route_plan',
      'Quiz route dry-run plan',
      ['catalog_route_plan'],
      [
        'missing_signature:quiz_route',
        'missing_surface:quiz_route',
        'release_blocker:no_production_quiz_route',
      ],
      [
        'Dry-run route maps each approved day quiz to exactly 10 questions.',
        'Quiz plan rejects unintroduced grammar and keeps clear user instructions.',
      ],
    ),
    workPackage(
      guard,
      4,
      'ui_route_plan',
      'Plan UI route contract',
      ['product_copy_review', 'catalog_route_plan', 'quiz_route_plan'],
      [
        'missing_signature:ui_route',
        'missing_surface:ui_route',
        'release_blocker:no_ui_route',
      ],
      [
        'UI contract defines where the approved week appears without editing Home or onboarding.',
        'UI contract keeps user-facing mode separate from developer-only diagnostics.',
      ],
    ),
    workPackage(
      guard,
      5,
      'audio_pipeline_plan',
      'Final audio asset pipeline',
      ['product_copy_review'],
      [
        'missing_signature:audio_pipeline',
        'missing_surface:audio_pipeline',
        'release_blocker:no_final_audio',
      ],
      [
        'Audio plan requires real generated assets and forbids placeholder audio.',
        'Audio plan defines asset ids, locale, speaker intent, and verification rules.',
      ],
    ),
    workPackage(
      guard,
      6,
      'pronunciation_policy_plan',
      'Pronunciation scoring policy',
      ['audio_pipeline_plan'],
      [
        'missing_signature:pronunciation_scoring',
        'missing_surface:pronunciation_scoring',
        'release_blocker:no_final_pronunciation_scoring',
      ],
      [
        'Pronunciation policy defines what MVP can score and what it must not claim.',
        'Policy routes failed pronunciation attempts into analytics without fake certainty.',
      ],
    ),
    workPackage(
      guard,
      7,
      'cloud_sync_bridge_plan',
      'Cloud sync bridge plan',
      ['catalog_route_plan', 'quiz_route_plan'],
      [
        'missing_signature:cloud_sync_bridge',
        'missing_surface:cloud_sync_bridge',
        'release_blocker:no_cloud_sync_bridge',
      ],
      [
        'Sync plan defines plan instance identity before writing remote progress.',
        'Sync plan preserves local progress and completed task semantics during migration.',
      ],
    ),
    workPackage(
      guard,
      8,
      'final_release_approval',
      'Final live bridge approval gate',
      [
        'product_copy_review',
        'catalog_route_plan',
        'quiz_route_plan',
        'ui_route_plan',
        'audio_pipeline_plan',
        'pronunciation_policy_plan',
        'cloud_sync_bridge_plan',
      ],
      [
        'release_blocker:no_final_audio',
        'release_blocker:no_final_pronunciation_scoring',
        'release_blocker:no_live_catalog_route',
        'release_blocker:no_production_quiz_route',
        'release_blocker:no_ui_route',
        'release_blocker:no_cloud_sync_bridge',
      ],
      [
        'Final approval can open live implementation only after all packages pass.',
        'Final approval must prove no onboarding, premium, Home, or old self-guided path regressed.',
      ],
    ),
  ];
}

function hasUnsafeSourceWriteFlags(guard: GavanWeek1FutureBridgeGuardReport): boolean {
  const unsafe = guard as unknown as {
    sourceWritesUsed?: boolean;
    phaseWriteTargets?: unknown[];
  };

  return unsafe.sourceWritesUsed === true ||
    (Array.isArray(unsafe.phaseWriteTargets) && unsafe.phaseWriteTargets.length > 0);
}

export function buildGavanWeek1BlockerResolutionRoadmap(
  guard: GavanWeek1FutureBridgeGuardReport,
  options: GavanWeek1BlockerResolutionRoadmapOptions,
): GavanWeek1BlockerResolutionRoadmapBuildResult {
  const issues: GavanWeek1BlockerResolutionRoadmapIssue[] = [];

  if (guard.kind !== 'gavan_week1_future_bridge_guard_report') {
    issues.push(issue(
      'wrong_guard_kind',
      'Expected a Gavan week 1 future bridge guard report.',
    ));
  }

  if (guard.status !== 'future_bridge_guard_blocked_not_applied') {
    issues.push(issue(
      'wrong_guard_status',
      'Blocker resolution roadmap requires a blocked non-applied guard report.',
    ));
  }

  if (guard.implementationTaskAllowed) {
    issues.push(issue(
      'implementation_already_allowed',
      'Blocker resolution roadmap cannot start from a guard that already allows implementation.',
    ));
  }

  if (hasUnsafeSourceWriteFlags(guard)) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Blocker resolution roadmap must start from a read-only guard with no phase write targets.',
    ));
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    roadmap: {
      kind: 'gavan_week1_blocker_resolution_roadmap',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'blocker_resolution_roadmap_only_not_applied',
      sourceGuardStatus: guard.status,
      sourceGuardGeneratedAt: guard.generatedAt,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      implementationTaskAllowed: false,
      sourceBlockerSummary: guard.blockerSummary,
      workPackages: buildWorkPackages(guard),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1BlockerResolutionRoadmap(
  roadmap: GavanWeek1BlockerResolutionRoadmap,
): string {
  return `${JSON.stringify(roadmap, null, 2)}\n`;
}

export function writeGavanWeek1BlockerResolutionRoadmap(
  guard: GavanWeek1FutureBridgeGuardReport,
  options: GavanWeek1BlockerResolutionRoadmapWriteOptions,
): GavanWeek1BlockerResolutionRoadmapWriteResult {
  const buildResult = buildGavanWeek1BlockerResolutionRoadmap(guard, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.roadmap) {
    return buildResult;
  }

  if (!isGavanWeek1BlockerResolutionRoadmapTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Blocker resolution roadmap can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1BlockerResolutionRoadmap(buildResult.roadmap);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    roadmap: buildResult.roadmap,
  };
}
