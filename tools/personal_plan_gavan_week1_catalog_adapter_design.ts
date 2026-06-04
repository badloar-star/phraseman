import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1CatalogSourceInventory,
  GavanWeek1CatalogSourceInventoryStatus,
} from './personal_plan_gavan_week1_catalog_source_inventory';

export const GAVAN_WEEK1_CATALOG_ADAPTER_DESIGN_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-catalog-adapter-design.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const EXPECTED_INVENTORY_STATUS: GavanWeek1CatalogSourceInventoryStatus =
  'catalog_source_inventory_blocked_not_applied';

export type GavanWeek1CatalogAdapterDesignStatus =
  'catalog_adapter_design_blocked_not_applied';

export type GavanWeek1CatalogAdapterDesignIssueCode =
  | 'wrong_inventory_kind'
  | 'wrong_inventory_status'
  | 'wrong_plan_or_week'
  | 'source_writes_not_allowed'
  | 'inventory_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1CatalogAdapterDesignIssue = {
  code: GavanWeek1CatalogAdapterDesignIssueCode;
  detail: string;
};

export type GavanWeek1CatalogAdapterDesignOptions = {
  generatedAt: string;
};

export type GavanWeek1CatalogAdapterDesignWriteOptions =
  GavanWeek1CatalogAdapterDesignOptions & {
    targetPath: string;
  };

export type GavanWeek1CatalogAdapterMappingStatus =
  'not_allowed_until_signature';

export type GavanWeek1CatalogAdapterDayMapping = {
  dayId: string;
  dayIndex: number;
  approvedArtifactPath: string;
  currentCatalogPresence: 'missing' | 'already_present';
  futureRouteAction:
    | 'replace_scaffold_day_after_signature'
    | 'preserve_existing_route_after_signature_review';
  status: GavanWeek1CatalogAdapterMappingStatus;
  productionRouteRegistered: false;
  playable: false;
};

export type GavanWeek1CatalogCompatibilityFinding = {
  id:
    | 'current_scaffold_days'
    | 'minute_load_behavior'
    | 'task_destination_behavior'
    | 'legacy_catalog_preservation';
  status:
    | 'requires_preservation_plan'
    | 'requires_adapter_contract'
    | 'requires_regression_tests';
  sourceEvidence: string;
  releaseRisk:
    | 'old_generated_days_must_not_disappear_silently'
    | 'time_choice_must_keep_5_10_15_20_minute_behavior'
    | 'tasks_must_open_existing_lessons_quizzes_or_plan_exercises_correctly'
    | 'self-guided_and_existing_plan_paths_must_not_change';
  writeActionAllowed: false;
};

export type GavanWeek1CatalogLiveRouteAcceptanceCriterion = {
  id:
    | 'content_quality_signature_present'
    | 'approved_day_ids_registered'
    | 'minute_choices_preserved'
    | 'legacy_catalog_regression_passes'
    | 'route_playability_verified';
  status: 'not_allowed_until_signature';
  requiredEvidence: string;
};

export type GavanWeek1CatalogAdapterDesign = {
  kind: 'gavan_week1_catalog_adapter_design';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1CatalogAdapterDesignStatus;
  sourceInventoryStatus: GavanWeek1CatalogSourceInventoryStatus;
  catalogRoutePlanningBlocked: true;
  blockingDependency: 'missing_signature:product_copy';
  canOpenCatalogRouteTask: false;
  routeRegistrationAllowed: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  catalogSourceEdited: false;
  proposedDayMappings: GavanWeek1CatalogAdapterDayMapping[];
  compatibilityFindings: GavanWeek1CatalogCompatibilityFinding[];
  futureLiveRouteAcceptanceCriteria: GavanWeek1CatalogLiveRouteAcceptanceCriterion[];
  preservationPolicy: {
    replaceGeneratedScaffoldOnlyAfterSignature: true;
    preserveSelfGuidedPath: true;
    preserveExistingPlanIds: true;
    preserveMinuteChoices: [5, 10, 15, 20];
    liveBridgeAllowed: false;
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1CatalogAdapterDesignBuildResult = {
  valid: boolean;
  issues: GavanWeek1CatalogAdapterDesignIssue[];
  design?: GavanWeek1CatalogAdapterDesign;
};

export type GavanWeek1CatalogAdapterDesignWriteResult =
  GavanWeek1CatalogAdapterDesignBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1CatalogAdapterDesignIssueCode,
  detail: string,
): GavanWeek1CatalogAdapterDesignIssue {
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

export function isGavanWeek1CatalogAdapterDesignTargetAllowed(
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

function validateInventory(
  inventory: GavanWeek1CatalogSourceInventory,
): GavanWeek1CatalogAdapterDesignIssue[] {
  const issues: GavanWeek1CatalogAdapterDesignIssue[] = [];

  if (inventory.kind !== 'gavan_week1_catalog_source_inventory') {
    issues.push(issue(
      'wrong_inventory_kind',
      'Catalog adapter design requires the P3.75 catalog source inventory.',
    ));
  }

  if (inventory.status !== EXPECTED_INVENTORY_STATUS) {
    issues.push(issue(
      'wrong_inventory_status',
      'Catalog adapter design must start from the blocked P3.75 inventory.',
    ));
  }

  if (inventory.planId !== 'gavan' || inventory.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Catalog adapter design can only inspect Gavan week 1.',
    ));
  }

  if (inventory.sourceWritesUsed !== false || inventory.phaseWriteTargets.length > 0) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Catalog adapter design must start from a read-only inventory with no write targets.',
    ));
  }

  if (
    inventory.catalogRoutePlanningBlocked !== true ||
    inventory.canOpenCatalogRouteTask !== false ||
    inventory.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'inventory_not_blocked',
      'Catalog adapter design must not open route work while product-copy signature is missing.',
    ));
  }

  return issues;
}

function proposedDayMappings(
  inventory: GavanWeek1CatalogSourceInventory,
): GavanWeek1CatalogAdapterDayMapping[] {
  const existingIds = new Set(inventory.sourceFindings.existingProposedDayIds);

  return inventory.proposedRoutes.map((route) => {
    const currentCatalogPresence = existingIds.has(route.dayId) ? 'already_present' : 'missing';

    return {
      dayId: route.dayId,
      dayIndex: route.dayIndex,
      approvedArtifactPath: route.approvedArtifactPath,
      currentCatalogPresence,
      futureRouteAction: currentCatalogPresence === 'missing'
        ? 'replace_scaffold_day_after_signature'
        : 'preserve_existing_route_after_signature_review',
      status: 'not_allowed_until_signature',
      productionRouteRegistered: false,
      playable: false,
    };
  });
}

function compatibilityFindings(
  inventory: GavanWeek1CatalogSourceInventory,
): GavanWeek1CatalogCompatibilityFinding[] {
  return [
    {
      id: 'current_scaffold_days',
      status: 'requires_preservation_plan',
      sourceEvidence: inventory.sourceFindings.containsGeneratedDayFactory
        ? 'Generated day factory detected for current Gavan catalog days.'
        : 'Generated day factory was not detected; manual source review is required.',
      releaseRisk: 'old_generated_days_must_not_disappear_silently',
      writeActionAllowed: false,
    },
    {
      id: 'minute_load_behavior',
      status: 'requires_adapter_contract',
      sourceEvidence: inventory.sourceFindings.containsTasksForMinutes
        ? 'Minute-load helper detected in catalog source inventory.'
        : 'Minute-load helper missing from source inventory.',
      releaseRisk: 'time_choice_must_keep_5_10_15_20_minute_behavior',
      writeActionAllowed: false,
    },
    {
      id: 'task_destination_behavior',
      status: 'requires_adapter_contract',
      sourceEvidence: inventory.sourceFindings.containsTaskDestinationModel
        ? 'Task destination model detected in catalog source inventory.'
        : 'Task destination model missing from source inventory.',
      releaseRisk: 'tasks_must_open_existing_lessons_quizzes_or_plan_exercises_correctly',
      writeActionAllowed: false,
    },
    {
      id: 'legacy_catalog_preservation',
      status: 'requires_regression_tests',
      sourceEvidence: inventory.sourceFindings.containsCatalogExport
        ? 'Catalog export surface detected in source inventory.'
        : 'Catalog export surface missing from source inventory.',
      releaseRisk: 'self-guided_and_existing_plan_paths_must_not_change',
      writeActionAllowed: false,
    },
  ];
}

function futureLiveRouteAcceptanceCriteria(): GavanWeek1CatalogLiveRouteAcceptanceCriterion[] {
  return [
    {
      id: 'content_quality_signature_present',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'A signed content-quality artifact or approved exception must exist.',
    },
    {
      id: 'approved_day_ids_registered',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Approved week 1 day ids must be registered by a separate live route task.',
    },
    {
      id: 'minute_choices_preserved',
      status: 'not_allowed_until_signature',
      requiredEvidence: '5, 10, 15, and 20 minute task loads must keep working.',
    },
    {
      id: 'legacy_catalog_regression_passes',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Existing self-guided and generated catalog paths must pass regression checks.',
    },
    {
      id: 'route_playability_verified',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Future route must be verified as playable only after registration is allowed.',
    },
  ];
}

export function buildGavanWeek1CatalogAdapterDesign(
  inventory: GavanWeek1CatalogSourceInventory,
  options: GavanWeek1CatalogAdapterDesignOptions,
): GavanWeek1CatalogAdapterDesignBuildResult {
  const issues = validateInventory(inventory);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    design: {
      kind: 'gavan_week1_catalog_adapter_design',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'catalog_adapter_design_blocked_not_applied',
      sourceInventoryStatus: inventory.status,
      catalogRoutePlanningBlocked: true,
      blockingDependency: 'missing_signature:product_copy',
      canOpenCatalogRouteTask: false,
      routeRegistrationAllowed: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      catalogSourceEdited: false,
      proposedDayMappings: proposedDayMappings(inventory),
      compatibilityFindings: compatibilityFindings(inventory),
      futureLiveRouteAcceptanceCriteria: futureLiveRouteAcceptanceCriteria(),
      preservationPolicy: {
        replaceGeneratedScaffoldOnlyAfterSignature: true,
        preserveSelfGuidedPath: true,
        preserveExistingPlanIds: true,
        preserveMinuteChoices: [5, 10, 15, 20],
        liveBridgeAllowed: false,
      },
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1CatalogAdapterDesign(
  design: GavanWeek1CatalogAdapterDesign,
): string {
  return `${JSON.stringify(design, null, 2)}\n`;
}

export function writeGavanWeek1CatalogAdapterDesign(
  inventory: GavanWeek1CatalogSourceInventory,
  options: GavanWeek1CatalogAdapterDesignWriteOptions,
): GavanWeek1CatalogAdapterDesignWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1CatalogAdapterDesignTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Catalog adapter design can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1CatalogAdapterDesign(inventory, options);

  if (!buildResult.valid || !buildResult.design) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1CatalogAdapterDesign(buildResult.design);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    design: buildResult.design,
  };
}
