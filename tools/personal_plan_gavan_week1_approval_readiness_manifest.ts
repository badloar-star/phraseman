import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export const GAVAN_WEEK1_APPROVAL_READINESS_MANIFEST_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-approval-readiness-manifest.json',
);

const REQUIRED_DAY_INDEXES = [2, 3, 4, 5, 6, 7] as const;
const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1ApprovedDayIndex = typeof REQUIRED_DAY_INDEXES[number];

export type GavanWeek1ApprovedReviewerExportLike = {
  kind: string;
  planId: string;
  weekId: string;
  dayId: string;
  dayIndex: number;
  liveIntegration: boolean;
  mediaClaims?: {
    audioAssetStatus?: string;
    pronunciationScoringStatus?: string;
    finalAudioReady?: boolean;
    finalPronunciationScoringReady?: boolean;
  };
  exerciseCoverage?: {
    valid?: boolean;
  };
  summary?: {
    contentUnits?: number;
    explanationCards?: number;
    exerciseBlueprints?: number;
    totalApproved?: number;
  };
};

export type GavanWeek1ApprovedArtifactInput = {
  artifactPath: string;
  approvedExport: GavanWeek1ApprovedReviewerExportLike;
};

export type GavanWeek1ReadinessDay = {
  dayId: `gavan-week1-day${GavanWeek1ApprovedDayIndex}`;
  dayIndex: GavanWeek1ApprovedDayIndex;
  approvedArtifactPath: string;
  approvedExportKind: string;
  liveIntegration: boolean;
  contentUnits: number;
  explanationCards: number;
  exerciseBlueprints: number;
  totalApproved: number;
  mediaClaims: GavanWeek1ApprovedReviewerExportLike['mediaClaims'];
  playable: false;
  productionRouteRegistered: false;
};

export type GavanWeek1ReleaseBlockerCode =
  | 'no_final_audio'
  | 'no_final_pronunciation_scoring'
  | 'no_live_catalog_route'
  | 'no_production_quiz_route'
  | 'no_ui_route'
  | 'no_cloud_sync_bridge';

export type GavanWeek1ReleaseBlocker = {
  code: GavanWeek1ReleaseBlockerCode;
  blocksLiveRelease: true;
  detail: string;
};

export type GavanWeek1ApprovalReadinessManifest = {
  kind: 'gavan_week1_approval_readiness_manifest';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  weekStatus: 'approved_non_live_not_playable';
  liveIntegration: false;
  days: GavanWeek1ReadinessDay[];
  totals: {
    daysApproved: number;
    contentUnits: number;
    explanationCards: number;
    exerciseBlueprints: number;
    totalApproved: number;
  };
  releaseBlockers: GavanWeek1ReleaseBlocker[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1ApprovalReadinessManifestOptions = {
  generatedAt: string;
};

export type GavanWeek1ApprovalReadinessManifestWriteOptions =
  GavanWeek1ApprovalReadinessManifestOptions & {
    targetPath: string;
  };

export type GavanWeek1ApprovalReadinessManifestIssueCode =
  | 'wrong_manifest_kind'
  | 'wrong_plan_or_week'
  | 'live_integration_enabled'
  | 'missing_approved_day'
  | 'unexpected_day'
  | 'day_live_integration_enabled'
  | 'day_not_approved_non_live'
  | 'fake_final_audio_claim'
  | 'fake_final_pronunciation_claim'
  | 'release_blocker_missing'
  | 'target_path_not_allowed';

export type GavanWeek1ApprovalReadinessManifestIssue = {
  code: GavanWeek1ApprovalReadinessManifestIssueCode;
  detail: string;
  dayId?: string;
};

export type GavanWeek1ApprovalReadinessManifestValidationResult = {
  valid: boolean;
  issues: GavanWeek1ApprovalReadinessManifestIssue[];
};

export type GavanWeek1ApprovalReadinessManifestWriteResult =
  GavanWeek1ApprovalReadinessManifestValidationResult & {
    targetPath?: string;
    bytesWritten?: number;
    manifest?: GavanWeek1ApprovalReadinessManifest;
  };

function issue(
  code: GavanWeek1ApprovalReadinessManifestIssueCode,
  detail: string,
  dayId?: string,
): GavanWeek1ApprovalReadinessManifestIssue {
  return { code, detail, dayId };
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

export function isGavanWeek1ApprovalReadinessManifestTargetAllowed(
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

function releaseBlockers(): GavanWeek1ReleaseBlocker[] {
  return [
    {
      code: 'no_final_audio',
      blocksLiveRelease: true,
      detail: 'Final generated audio assets have not been produced for the week.',
    },
    {
      code: 'no_final_pronunciation_scoring',
      blocksLiveRelease: true,
      detail: 'Pronunciation scoring is still not built for the week.',
    },
    {
      code: 'no_live_catalog_route',
      blocksLiveRelease: true,
      detail: 'The approved artifacts are not registered in the live plan catalog.',
    },
    {
      code: 'no_production_quiz_route',
      blocksLiveRelease: true,
      detail: 'No production quiz route has been connected for these days.',
    },
    {
      code: 'no_ui_route',
      blocksLiveRelease: true,
      detail: 'No user-facing UI route has been connected for the week.',
    },
    {
      code: 'no_cloud_sync_bridge',
      blocksLiveRelease: true,
      detail: 'Cloud sync has not been bridged for week-level plan progress.',
    },
  ];
}

function dayIdFor(dayIndex: GavanWeek1ApprovedDayIndex): GavanWeek1ReadinessDay['dayId'] {
  return `gavan-week1-day${dayIndex}`;
}

function isRequiredDayIndex(value: number): value is GavanWeek1ApprovedDayIndex {
  return REQUIRED_DAY_INDEXES.includes(value as GavanWeek1ApprovedDayIndex);
}

function readinessDay(input: GavanWeek1ApprovedArtifactInput): GavanWeek1ReadinessDay | undefined {
  const approvedExport = input.approvedExport;
  if (!isRequiredDayIndex(approvedExport.dayIndex)) {
    return undefined;
  }

  const summary = approvedExport.summary ?? {};
  return {
    dayId: dayIdFor(approvedExport.dayIndex),
    dayIndex: approvedExport.dayIndex,
    approvedArtifactPath: path.resolve(input.artifactPath),
    approvedExportKind: approvedExport.kind,
    liveIntegration: approvedExport.liveIntegration,
    contentUnits: summary.contentUnits ?? 0,
    explanationCards: summary.explanationCards ?? 0,
    exerciseBlueprints: summary.exerciseBlueprints ?? 0,
    totalApproved: summary.totalApproved ?? 0,
    mediaClaims: approvedExport.mediaClaims,
    playable: false,
    productionRouteRegistered: false,
  };
}

function totals(days: GavanWeek1ReadinessDay[]): GavanWeek1ApprovalReadinessManifest['totals'] {
  return {
    daysApproved: days.length,
    contentUnits: days.reduce((sum, day) => sum + day.contentUnits, 0),
    explanationCards: days.reduce((sum, day) => sum + day.explanationCards, 0),
    exerciseBlueprints: days.reduce((sum, day) => sum + day.exerciseBlueprints, 0),
    totalApproved: days.reduce((sum, day) => sum + day.totalApproved, 0),
  };
}

export function buildGavanWeek1ApprovalReadinessManifest(
  approvedArtifacts: GavanWeek1ApprovedArtifactInput[],
  options: GavanWeek1ApprovalReadinessManifestOptions,
): GavanWeek1ApprovalReadinessManifest {
  const days = approvedArtifacts
    .map(readinessDay)
    .filter((day): day is GavanWeek1ReadinessDay => Boolean(day))
    .sort((left, right) => left.dayIndex - right.dayIndex);

  return {
    kind: 'gavan_week1_approval_readiness_manifest',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    weekStatus: 'approved_non_live_not_playable',
    liveIntegration: false,
    days,
    totals: totals(days),
    releaseBlockers: releaseBlockers(),
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

export function validateGavanWeek1ApprovalReadinessManifest(
  manifest: unknown,
): GavanWeek1ApprovalReadinessManifestValidationResult {
  const value = manifest as GavanWeek1ApprovalReadinessManifest;
  const issues: GavanWeek1ApprovalReadinessManifestIssue[] = [];

  if (value.kind !== 'gavan_week1_approval_readiness_manifest') {
    issues.push(issue('wrong_manifest_kind', 'Manifest must use the expected kind.'));
  }

  if (value.planId !== 'gavan' || value.weekId !== 'gavan-week1') {
    issues.push(issue('wrong_plan_or_week', 'Manifest must describe Gavan week 1.'));
  }

  if (value.liveIntegration !== false || value.weekStatus !== 'approved_non_live_not_playable') {
    issues.push(issue('live_integration_enabled', 'Manifest must stay approved non-live and not playable.'));
  }

  const days = value.days ?? [];
  const dayById = new Map(days.map((day) => [day.dayId, day]));

  for (const dayIndex of REQUIRED_DAY_INDEXES) {
    const dayId = dayIdFor(dayIndex);
    const day = dayById.get(dayId);
    if (!day) {
      issues.push(issue('missing_approved_day', 'Manifest must include every approved day from 2 to 7.', dayId));
      continue;
    }

    if (day.liveIntegration !== false) {
      issues.push(issue('day_live_integration_enabled', 'Approved day must remain non-live.', dayId));
    }

    if (day.playable !== false || day.productionRouteRegistered !== false) {
      issues.push(issue('day_not_approved_non_live', 'Approved day cannot be marked playable or routed.', dayId));
    }
  }

  for (const day of days) {
    if (!REQUIRED_DAY_INDEXES.includes(day.dayIndex)) {
      issues.push(issue('unexpected_day', 'Manifest can only include Gavan week 1 days 2-7.', day.dayId));
    }

    if (day.approvedExportKind !== `gavan_week1_day${day.dayIndex}_approved_reviewer_export`) {
      issues.push(issue('day_not_approved_non_live', 'Day must point to an approved reviewer export kind.', day.dayId));
    }

    if (day.approvedArtifactPath.endsWith(`gavan-week1-day${day.dayIndex}-approved-reviewer-export.json`) !== true) {
      issues.push(issue('day_not_approved_non_live', 'Day must point to its approved reviewer export artifact.', day.dayId));
    }
  }

  const blockerCodes = new Set((value.releaseBlockers ?? []).map((blocker) => blocker.code));
  for (const blocker of releaseBlockers()) {
    if (!blockerCodes.has(blocker.code)) {
      issues.push(issue('release_blocker_missing', `Missing release blocker: ${blocker.code}.`));
    }
  }

  for (const day of days) {
    if (day.mediaClaims?.finalAudioReady === true) {
      issues.push(issue('fake_final_audio_claim', 'Approved day cannot claim final audio readiness.', day.dayId));
    }
    if (day.mediaClaims?.finalPronunciationScoringReady === true) {
      issues.push(issue(
        'fake_final_pronunciation_claim',
        'Approved day cannot claim final pronunciation scoring readiness.',
        day.dayId,
      ));
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function serializeGavanWeek1ApprovalReadinessManifest(
  manifest: GavanWeek1ApprovalReadinessManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function writeGavanWeek1ApprovalReadinessManifest(
  approvedArtifacts: GavanWeek1ApprovedArtifactInput[],
  options: GavanWeek1ApprovalReadinessManifestWriteOptions,
): GavanWeek1ApprovalReadinessManifestWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1ApprovalReadinessManifestTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Gavan week 1 approval readiness manifest can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const manifest = buildGavanWeek1ApprovalReadinessManifest(approvedArtifacts, options);
  const validation = validateGavanWeek1ApprovalReadinessManifest(manifest);
  if (!validation.valid) {
    return validation;
  }

  const serialized = serializeGavanWeek1ApprovalReadinessManifest(manifest);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    ...validation,
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    manifest,
  };
}
