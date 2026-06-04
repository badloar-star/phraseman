import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1CatalogRoutePreflight,
  GavanWeek1CatalogRoutePreflightStatus,
  GavanWeek1ProposedCatalogRoute,
} from './personal_plan_gavan_week1_catalog_route_preflight';

export const GAVAN_WEEK1_CATALOG_SOURCE_INVENTORY_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-catalog-source-inventory.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const EXPECTED_PREFLIGHT_STATUS: GavanWeek1CatalogRoutePreflightStatus =
  'catalog_route_preflight_blocked_by_product_copy_signature_not_applied';

const BROKEN_ENCODING_MARKER_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

export type GavanWeek1CatalogSourceInventoryStatus =
  'catalog_source_inventory_blocked_not_applied';

export type GavanWeek1CatalogSourceInventoryIssueCode =
  | 'wrong_preflight_kind'
  | 'wrong_preflight_status'
  | 'wrong_plan_or_week'
  | 'source_writes_not_allowed'
  | 'catalog_preflight_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1CatalogSourceInventoryIssue = {
  code: GavanWeek1CatalogSourceInventoryIssueCode;
  detail: string;
};

export type GavanWeek1CatalogSourceInventoryOptions = {
  generatedAt: string;
  sourcePath: string;
};

export type GavanWeek1CatalogSourceInventoryWriteOptions =
  GavanWeek1CatalogSourceInventoryOptions & {
    targetPath: string;
  };

export type GavanWeek1CatalogSourceFinding = {
  sourcePath: string;
  sourceLineCount: number;
  sourceByteLength: number;
  proposedDayIds: string[];
  existingProposedDayIds: string[];
  missingProposedDayIds: string[];
  containsPlanIdGavan: boolean;
  containsGeneratedDayFactory: boolean;
  containsTasksForMinutes: boolean;
  containsCatalogExport: boolean;
  containsGavanGenerateDaysCall: boolean;
  containsPlanDayModel: boolean;
  containsTaskDestinationModel: boolean;
  containsBrokenEncoding: boolean;
};

export type GavanWeek1CatalogDescriptiveFinding = {
  code:
    | 'catalog_has_generated_scaffold'
    | 'catalog_has_broken_encoding_markers'
    | 'proposed_day_ids_missing'
    | 'catalog_models_detected'
    | 'catalog_export_detected';
  severity: 'info' | 'warning' | 'blocked';
  detail: string;
};

export type GavanWeek1CatalogAdapterSurfaceFinding = {
  id:
    | 'catalog_export'
    | 'gavan_plan_definition'
    | 'generate_days_call'
    | 'plan_day_model'
    | 'task_destination_model'
    | 'tasks_for_minutes';
  label: string;
  present: boolean;
  writeActionAllowed: false;
  note: string;
};

export type GavanWeek1CatalogSourceInventoryProposedRoute = Pick<
  GavanWeek1ProposedCatalogRoute,
  | 'dayId'
  | 'dayIndex'
  | 'approvedArtifactPath'
  | 'routeStatus'
  | 'productionRouteRegistered'
  | 'playable'
>;

export type GavanWeek1CatalogSourceInventory = {
  kind: 'gavan_week1_catalog_source_inventory';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1CatalogSourceInventoryStatus;
  sourcePreflightStatus: GavanWeek1CatalogRoutePreflightStatus;
  catalogRoutePlanningBlocked: true;
  blockingDependency: 'missing_signature:product_copy';
  canOpenCatalogRouteTask: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  catalogSourceEdited: false;
  sourceFindings: GavanWeek1CatalogSourceFinding;
  descriptiveFindings: GavanWeek1CatalogDescriptiveFinding[];
  adapterSurfaceFindings: GavanWeek1CatalogAdapterSurfaceFinding[];
  proposedRoutes: GavanWeek1CatalogSourceInventoryProposedRoute[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1CatalogSourceInventoryBuildResult = {
  valid: boolean;
  issues: GavanWeek1CatalogSourceInventoryIssue[];
  inventory?: GavanWeek1CatalogSourceInventory;
};

export type GavanWeek1CatalogSourceInventoryWriteResult =
  GavanWeek1CatalogSourceInventoryBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1CatalogSourceInventoryIssueCode,
  detail: string,
): GavanWeek1CatalogSourceInventoryIssue {
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

export function isGavanWeek1CatalogSourceInventoryTargetAllowed(
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

function validatePreflight(
  preflight: GavanWeek1CatalogRoutePreflight,
): GavanWeek1CatalogSourceInventoryIssue[] {
  const issues: GavanWeek1CatalogSourceInventoryIssue[] = [];

  if (preflight.kind !== 'gavan_week1_catalog_route_preflight') {
    issues.push(issue(
      'wrong_preflight_kind',
      'Catalog source inventory requires the P3.74 catalog route preflight.',
    ));
  }

  if (preflight.status !== EXPECTED_PREFLIGHT_STATUS) {
    issues.push(issue(
      'wrong_preflight_status',
      'Catalog source inventory must stay attached to the blocked P3.74 preflight.',
    ));
  }

  if (preflight.planId !== 'gavan' || preflight.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Catalog source inventory can only inspect Gavan week 1.',
    ));
  }

  if (preflight.sourceWritesUsed !== false || preflight.phaseWriteTargets.length > 0) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Catalog source inventory must start from a read-only preflight with no write targets.',
    ));
  }

  if (
    preflight.catalogRoutePlanningBlocked !== true ||
    preflight.canOpenCatalogRouteTask !== false ||
    preflight.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'catalog_preflight_not_blocked',
      'Catalog source inventory must not open route work while product-copy signature is missing.',
    ));
  }

  return issues;
}

function lineCount(source: string): number {
  if (source.length === 0) {
    return 0;
  }

  return source.split(/\r?\n/).length;
}

function sourceFindings(
  preflight: GavanWeek1CatalogRoutePreflight,
  catalogSource: string,
  sourcePath: string,
): GavanWeek1CatalogSourceFinding {
  const proposedDayIds = preflight.proposedRoutes.map((route) => route.dayId);
  const existingProposedDayIds = proposedDayIds.filter((dayId) => catalogSource.includes(dayId));
  const missingProposedDayIds = proposedDayIds.filter((dayId) => !catalogSource.includes(dayId));
  const catalogNamePattern = ['PERSONAL', 'PLAN', 'CATALOG'].join('_');

  return {
    sourcePath,
    sourceLineCount: lineCount(catalogSource),
    sourceByteLength: Buffer.byteLength(catalogSource, 'utf8'),
    proposedDayIds,
    existingProposedDayIds,
    missingProposedDayIds,
    containsPlanIdGavan: /\bid:\s*'gavan'/.test(catalogSource),
    containsGeneratedDayFactory:
      /function\s+makeGeneratedDay/.test(catalogSource) &&
      /function\s+generateDays/.test(catalogSource),
    containsTasksForMinutes: /function\s+tasksForMinutes/.test(catalogSource),
    containsCatalogExport: new RegExp(`export\\s+const\\s+${catalogNamePattern}`).test(catalogSource),
    containsGavanGenerateDaysCall: /generateDays\('gavan'/.test(catalogSource),
    containsPlanDayModel: /export\s+type\s+PlanDay\b/.test(catalogSource),
    containsTaskDestinationModel: /export\s+type\s+PlanTaskDestination\b/.test(catalogSource),
    containsBrokenEncoding: BROKEN_ENCODING_MARKER_RE.test(catalogSource),
  };
}

function descriptiveFindings(
  findings: GavanWeek1CatalogSourceFinding,
): GavanWeek1CatalogDescriptiveFinding[] {
  const result: GavanWeek1CatalogDescriptiveFinding[] = [];

  if (findings.containsGeneratedDayFactory && findings.containsGavanGenerateDaysCall) {
    result.push({
      code: 'catalog_has_generated_scaffold',
      severity: 'info',
      detail: 'The current Gavan catalog is scaffolded through a generated day factory.',
    });
  }

  if (findings.containsBrokenEncoding) {
    result.push({
      code: 'catalog_has_broken_encoding_markers',
      severity: 'warning',
      detail: 'The catalog source contains visible encoding markers and needs a separate cleanup pass.',
    });
  }

  if (findings.missingProposedDayIds.length > 0) {
    result.push({
      code: 'proposed_day_ids_missing',
      severity: 'blocked',
      detail: 'Approved week 1 day ids are not registered in the current catalog source.',
    });
  }

  if (findings.containsPlanDayModel && findings.containsTaskDestinationModel) {
    result.push({
      code: 'catalog_models_detected',
      severity: 'info',
      detail: 'Catalog day and task destination models are present for future adapter planning.',
    });
  }

  if (findings.containsCatalogExport) {
    result.push({
      code: 'catalog_export_detected',
      severity: 'info',
      detail: 'The catalog export surface is present and can be inspected later after approval.',
    });
  }

  return result;
}

function adapterSurfaceFindings(
  findings: GavanWeek1CatalogSourceFinding,
): GavanWeek1CatalogAdapterSurfaceFinding[] {
  return [
    {
      id: 'catalog_export',
      label: 'Catalog export',
      present: findings.containsCatalogExport,
      writeActionAllowed: false,
      note: 'Future route registration surface; inventory step is read-only.',
    },
    {
      id: 'gavan_plan_definition',
      label: 'Gavan plan definition',
      present: findings.containsPlanIdGavan,
      writeActionAllowed: false,
      note: 'Future week 1 route would attach to this plan only after signature approval.',
    },
    {
      id: 'generate_days_call',
      label: 'Generated days call',
      present: findings.containsGavanGenerateDaysCall,
      writeActionAllowed: false,
      note: 'Current scaffold source; no replacement is allowed in this step.',
    },
    {
      id: 'plan_day_model',
      label: 'Plan day model',
      present: findings.containsPlanDayModel,
      writeActionAllowed: false,
      note: 'Model surface for a later signed adapter plan.',
    },
    {
      id: 'task_destination_model',
      label: 'Task destination model',
      present: findings.containsTaskDestinationModel,
      writeActionAllowed: false,
      note: 'Destination contract surface for future task routing.',
    },
    {
      id: 'tasks_for_minutes',
      label: 'Minute load helper',
      present: findings.containsTasksForMinutes,
      writeActionAllowed: false,
      note: 'Existing time-load helper can be assessed later without changing it now.',
    },
  ];
}

function proposedRoutes(
  preflight: GavanWeek1CatalogRoutePreflight,
): GavanWeek1CatalogSourceInventoryProposedRoute[] {
  return preflight.proposedRoutes.map((route) => ({
    dayId: route.dayId,
    dayIndex: route.dayIndex,
    approvedArtifactPath: route.approvedArtifactPath,
    routeStatus: route.routeStatus,
    productionRouteRegistered: route.productionRouteRegistered,
    playable: route.playable,
  }));
}

export function buildGavanWeek1CatalogSourceInventory(
  preflight: GavanWeek1CatalogRoutePreflight,
  catalogSource: string,
  options: GavanWeek1CatalogSourceInventoryOptions,
): GavanWeek1CatalogSourceInventoryBuildResult {
  const issues = validatePreflight(preflight);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const findings = sourceFindings(preflight, catalogSource, options.sourcePath);

  return {
    valid: true,
    issues: [],
    inventory: {
      kind: 'gavan_week1_catalog_source_inventory',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'catalog_source_inventory_blocked_not_applied',
      sourcePreflightStatus: preflight.status,
      catalogRoutePlanningBlocked: true,
      blockingDependency: 'missing_signature:product_copy',
      canOpenCatalogRouteTask: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      catalogSourceEdited: false,
      sourceFindings: findings,
      descriptiveFindings: descriptiveFindings(findings),
      adapterSurfaceFindings: adapterSurfaceFindings(findings),
      proposedRoutes: proposedRoutes(preflight),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1CatalogSourceInventory(
  inventory: GavanWeek1CatalogSourceInventory,
): string {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

export function writeGavanWeek1CatalogSourceInventory(
  preflight: GavanWeek1CatalogRoutePreflight,
  catalogSource: string,
  options: GavanWeek1CatalogSourceInventoryWriteOptions,
): GavanWeek1CatalogSourceInventoryWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1CatalogSourceInventoryTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Catalog source inventory can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1CatalogSourceInventory(preflight, catalogSource, options);

  if (!buildResult.valid || !buildResult.inventory) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1CatalogSourceInventory(buildResult.inventory);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    inventory: buildResult.inventory,
  };
}
