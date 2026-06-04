import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ApprovalReadinessManifest,
  GavanWeek1ReadinessDay,
} from './personal_plan_gavan_week1_approval_readiness_manifest';
import type {
  GavanWeek1ProductCopySignatureRequestPacket,
} from './personal_plan_gavan_week1_product_copy_signature_request_packet';

export const GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-catalog-route-preflight.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1CatalogRoutePreflightStatus =
  'catalog_route_preflight_blocked_by_product_copy_signature_not_applied';

export type GavanWeek1ProposedCatalogRoute = {
  dayId: string;
  dayIndex: number;
  approvedArtifactPath: string;
  approvedExportKind: string;
  contentUnits: number;
  explanationCards: number;
  exerciseBlueprints: number;
  totalApproved: number;
  routeStatus: 'blocked_not_registered';
  productionRouteRegistered: false;
  playable: false;
};

export type GavanWeek1CatalogRoutePreflight = {
  kind: 'gavan_week1_catalog_route_preflight';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1CatalogRoutePreflightStatus;
  sourceSignatureRequestStatus: GavanWeek1ProductCopySignatureRequestPacket['status'];
  sourceManifestStatus: GavanWeek1ApprovalReadinessManifest['weekStatus'];
  signatureStatus: 'missing';
  requiredOwnerRole: 'content_quality_owner';
  catalogRoutePlanningBlocked: true;
  blockingDependency: 'missing_signature:product_copy';
  routeBlockers: ['missing_signature:product_copy'];
  canOpenCatalogRouteTask: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  catalogSourceEdited: false;
  inputSummary: {
    readyToRequestSignature: boolean;
    daysProposed: number;
    totalApprovedRows: number;
  };
  proposedRoutes: GavanWeek1ProposedCatalogRoute[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1CatalogRoutePreflightOptions = {
  generatedAt: string;
};

export type GavanWeek1CatalogRoutePreflightWriteOptions =
  GavanWeek1CatalogRoutePreflightOptions & {
    targetPath: string;
  };

export type GavanWeek1CatalogRoutePreflightIssueCode =
  | 'wrong_request_kind'
  | 'wrong_request_status'
  | 'wrong_manifest_kind'
  | 'wrong_plan_or_week'
  | 'signature_not_missing'
  | 'source_writes_not_allowed'
  | 'manifest_live_not_allowed'
  | 'target_path_not_allowed';

export type GavanWeek1CatalogRoutePreflightIssue = {
  code: GavanWeek1CatalogRoutePreflightIssueCode;
  detail: string;
};

export type GavanWeek1CatalogRoutePreflightBuildResult = {
  valid: boolean;
  issues: GavanWeek1CatalogRoutePreflightIssue[];
  preflight?: GavanWeek1CatalogRoutePreflight;
};

export type GavanWeek1CatalogRoutePreflightWriteResult =
  GavanWeek1CatalogRoutePreflightBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1CatalogRoutePreflightIssueCode,
  detail: string,
): GavanWeek1CatalogRoutePreflightIssue {
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

export function isGavanWeek1CatalogRoutePreflightTargetAllowed(
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

function hasUnsafeSourceWriteFlags(request: GavanWeek1ProductCopySignatureRequestPacket): boolean {
  const unsafe = request as unknown as {
    sourceWritesUsed?: boolean;
    phaseWriteTargets?: unknown[];
  };

  return unsafe.sourceWritesUsed === true ||
    (Array.isArray(unsafe.phaseWriteTargets) && unsafe.phaseWriteTargets.length > 0);
}

function signatureStatus(request: GavanWeek1ProductCopySignatureRequestPacket): string | undefined {
  return (request as unknown as { signatureStatus?: string }).signatureStatus;
}

function proposedRoute(day: GavanWeek1ReadinessDay): GavanWeek1ProposedCatalogRoute {
  return {
    dayId: day.dayId,
    dayIndex: day.dayIndex,
    approvedArtifactPath: day.approvedArtifactPath,
    approvedExportKind: day.approvedExportKind,
    contentUnits: day.contentUnits,
    explanationCards: day.explanationCards,
    exerciseBlueprints: day.exerciseBlueprints,
    totalApproved: day.totalApproved,
    routeStatus: 'blocked_not_registered',
    productionRouteRegistered: false,
    playable: false,
  };
}

export function buildGavanWeek1CatalogRoutePreflight(
  request: GavanWeek1ProductCopySignatureRequestPacket,
  manifest: GavanWeek1ApprovalReadinessManifest,
  options: GavanWeek1CatalogRoutePreflightOptions,
): GavanWeek1CatalogRoutePreflightBuildResult {
  const issues: GavanWeek1CatalogRoutePreflightIssue[] = [];

  if (request.kind !== 'gavan_week1_product_copy_signature_request_packet') {
    issues.push(issue(
      'wrong_request_kind',
      'Catalog route preflight requires the P3.73 product copy signature request packet.',
    ));
  }

  if (request.status !== 'product_copy_signature_request_only_not_signed') {
    issues.push(issue(
      'wrong_request_status',
      'Catalog route preflight requires an unsigned non-live signature request.',
    ));
  }

  if (signatureStatus(request) !== 'missing') {
    issues.push(issue(
      'signature_not_missing',
      'Blocked catalog route preflight must not accept signed or inferred signatures.',
    ));
  }

  if (hasUnsafeSourceWriteFlags(request)) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Catalog route preflight must start from a read-only request with no phase write targets.',
    ));
  }

  if (manifest.kind !== 'gavan_week1_approval_readiness_manifest') {
    issues.push(issue(
      'wrong_manifest_kind',
      'Catalog route preflight requires the Gavan week 1 approval readiness manifest.',
    ));
  }

  if (manifest.planId !== 'gavan' || manifest.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Catalog route preflight can only inspect Gavan week 1.',
    ));
  }

  if (manifest.liveIntegration !== false || manifest.weekStatus !== 'approved_non_live_not_playable') {
    issues.push(issue(
      'manifest_live_not_allowed',
      'Catalog route preflight must start from approved non-live content.',
    ));
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const routes = manifest.days
    .map(proposedRoute)
    .sort((left, right) => left.dayIndex - right.dayIndex);

  return {
    valid: true,
    issues: [],
    preflight: {
      kind: 'gavan_week1_catalog_route_preflight',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'catalog_route_preflight_blocked_by_product_copy_signature_not_applied',
      sourceSignatureRequestStatus: request.status,
      sourceManifestStatus: manifest.weekStatus,
      signatureStatus: 'missing',
      requiredOwnerRole: 'content_quality_owner',
      catalogRoutePlanningBlocked: true,
      blockingDependency: 'missing_signature:product_copy',
      routeBlockers: ['missing_signature:product_copy'],
      canOpenCatalogRouteTask: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      catalogSourceEdited: false,
      inputSummary: {
        readyToRequestSignature: request.readyToRequestSignature,
        daysProposed: routes.length,
        totalApprovedRows: manifest.totals.totalApproved,
      },
      proposedRoutes: routes,
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1CatalogRoutePreflight(
  preflight: GavanWeek1CatalogRoutePreflight,
): string {
  return `${JSON.stringify(preflight, null, 2)}\n`;
}

export function writeGavanWeek1CatalogRoutePreflight(
  request: GavanWeek1ProductCopySignatureRequestPacket,
  manifest: GavanWeek1ApprovalReadinessManifest,
  options: GavanWeek1CatalogRoutePreflightWriteOptions,
): GavanWeek1CatalogRoutePreflightWriteResult {
  const buildResult = buildGavanWeek1CatalogRoutePreflight(request, manifest, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.preflight) {
    return buildResult;
  }

  if (!isGavanWeek1CatalogRoutePreflightTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Catalog route preflight can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanWeek1CatalogRoutePreflight(buildResult.preflight);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    preflight: buildResult.preflight,
  };
}
