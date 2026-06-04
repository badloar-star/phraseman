import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type { GavanWeek1CatalogAdapterDesign } from './personal_plan_gavan_week1_catalog_adapter_design';
import type { GavanWeek1QuizAdapterDesign } from './personal_plan_gavan_week1_quiz_adapter_design';
import type {
  GavanWeek1UiRouteSourceInventory,
  GavanWeek1UiSourceSurfaceFinding,
  GavanWeek1UiRouteAbilityFinding,
} from './personal_plan_gavan_week1_ui_route_source_inventory';

export const GAVAN_WEEK1_UI_ROUTE_ADAPTER_DESIGN_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-ui-route-adapter-design.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

type BlockedStatus = 'not_allowed_until_signature';

export type GavanWeek1UiRouteAdapterDesignStatus =
  'ui_route_adapter_design_blocked_not_applied';

export type GavanWeek1UiRouteAdapterDesignIssueCode =
  | 'wrong_ui_inventory_kind'
  | 'wrong_ui_inventory_status'
  | 'wrong_plan_or_week'
  | 'ui_inventory_not_blocked'
  | 'catalog_design_not_blocked'
  | 'quiz_design_not_blocked'
  | 'missing_required_ui_surface'
  | 'missing_required_route_ability'
  | 'target_path_not_allowed';

export type GavanWeek1UiRouteAdapterDesignIssue = {
  code: GavanWeek1UiRouteAdapterDesignIssueCode;
  detail: string;
};

export type GavanWeek1UiRouteAdapterDesignOptions = {
  generatedAt: string;
};

export type GavanWeek1UiRouteAdapterDesignWriteOptions =
  GavanWeek1UiRouteAdapterDesignOptions & {
    targetPath: string;
  };

export type GavanWeek1OpeningTaskFamily =
  | 'lesson'
  | 'plan_phrase'
  | 'quiz'
  | 'plan_renderer'
  | 'lesson_shell';

export type GavanWeek1OpeningContract = {
  id:
    | 'lesson_task_opening'
    | 'plan_phrase_task_opening'
    | 'dedicated_quiz_task_opening'
    | 'plan_renderer_task_opening'
    | 'lesson_shell_task_opening';
  taskFamily: GavanWeek1OpeningTaskFamily;
  requiredSurfaceIds: GavanWeek1UiSourceSurfaceFinding['id'][];
  requiredRouteAbilityIds: GavanWeek1UiRouteAbilityFinding['id'][];
  sourceSurfaceCoverage:
    | 'all_required_surfaces_detected'
    | 'missing_required_surfaces';
  routeAbilityCoverage:
    | 'all_required_abilities_detected'
    | 'missing_required_abilities';
  missingSurfaceIds: GavanWeek1UiSourceSurfaceFinding['id'][];
  missingRouteAbilityIds: GavanWeek1UiRouteAbilityFinding['id'][];
  linkedQuizDesignCount?: number;
  requiredQuestionCount?: number;
  status: BlockedStatus;
  routeRegistered: false;
  playable: false;
  writeActionAllowed: false;
  liveAcceptanceStatus: BlockedStatus;
};

export type GavanWeek1UiRegressionGate = {
  id:
    | 'home_entrypoint_preserved'
    | 'onboarding_flow_preserved'
    | 'premium_flow_preserved'
    | 'self_guided_lessons_preserved'
    | 'self_guided_quizzes_preserved'
    | 'plan_task_carryover_preserved'
    | 'completed_day_state_preserved';
  status: BlockedStatus;
  requiredBeforeLive: true;
  writeActionAllowed: false;
  requiredEvidence: string;
};

export type GavanWeek1UiDependencySummary = {
  catalogDayMappings: number;
  quizRouteDesigns: number;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  allDependenciesBlocked: boolean;
  liveBridgeAllowed: false;
};

export type GavanWeek1UiRouteAdapterDesign = {
  kind: 'gavan_week1_ui_route_adapter_design';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1UiRouteAdapterDesignStatus;
  sourceUiInventoryStatus: GavanWeek1UiRouteSourceInventory['status'];
  sourceCatalogAdapterStatus: GavanWeek1CatalogAdapterDesign['status'];
  sourceQuizAdapterStatus: GavanWeek1QuizAdapterDesign['status'];
  blockingDependency: 'missing_signature:product_copy';
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  uiSourceEdited: false;
  routeRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  liveEditsAllowed: false;
  openingContracts: GavanWeek1OpeningContract[];
  regressionGates: GavanWeek1UiRegressionGate[];
  dependencySummary: GavanWeek1UiDependencySummary;
  futureLiveAcceptanceCriteria: {
    id:
      | 'product_copy_signature_present'
      | 'catalog_route_contract_signed'
      | 'quiz_route_contract_signed'
      | 'ui_route_regression_passes'
      | 'route_opening_verified_on_device';
    status: BlockedStatus;
    requiredEvidence: string;
  }[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1UiRouteAdapterDesignBuildResult = {
  valid: boolean;
  issues: GavanWeek1UiRouteAdapterDesignIssue[];
  design?: GavanWeek1UiRouteAdapterDesign;
};

export type GavanWeek1UiRouteAdapterDesignWriteResult =
  GavanWeek1UiRouteAdapterDesignBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1UiRouteAdapterDesignIssueCode,
  detail: string,
): GavanWeek1UiRouteAdapterDesignIssue {
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

export function isGavanWeek1UiRouteAdapterDesignTargetAllowed(
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

function validateInputs(
  uiInventory: GavanWeek1UiRouteSourceInventory,
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
): GavanWeek1UiRouteAdapterDesignIssue[] {
  const issues: GavanWeek1UiRouteAdapterDesignIssue[] = [];

  if (uiInventory.kind !== 'gavan_week1_ui_route_source_inventory') {
    issues.push(issue(
      'wrong_ui_inventory_kind',
      'UI route adapter design requires the P3.79 UI source inventory.',
    ));
  }

  if (uiInventory.status !== 'ui_route_source_inventory_blocked_not_applied') {
    issues.push(issue(
      'wrong_ui_inventory_status',
      'UI route adapter design must start from a blocked UI source inventory.',
    ));
  }

  if (
    uiInventory.planId !== 'gavan' ||
    uiInventory.weekId !== 'gavan-week1' ||
    catalogDesign.planId !== 'gavan' ||
    catalogDesign.weekId !== 'gavan-week1' ||
    quizDesign.planId !== 'gavan' ||
    quizDesign.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_plan_or_week',
      'UI route adapter design can only combine Gavan week 1 inputs.',
    ));
  }

  if (
    uiInventory.routeRegistrationAllowed !== false ||
    uiInventory.uiRouteRegistrationAllowed !== false ||
    uiInventory.liveEditsAllowed !== false ||
    uiInventory.sourceWritesUsed !== false ||
    uiInventory.phaseWriteTargets.length > 0 ||
    uiInventory.uiSourceEdited !== false ||
    uiInventory.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'ui_inventory_not_blocked',
      'UI source inventory must remain blocked and read-only.',
    ));
  }

  if (
    catalogDesign.status !== 'catalog_adapter_design_blocked_not_applied' ||
    catalogDesign.routeRegistrationAllowed !== false ||
    catalogDesign.liveEditsAllowed !== false ||
    catalogDesign.sourceWritesUsed !== false ||
    catalogDesign.phaseWriteTargets.length > 0 ||
    catalogDesign.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'catalog_design_not_blocked',
      'Catalog adapter design must remain blocked before UI route design.',
    ));
  }

  if (
    quizDesign.status !== 'quiz_adapter_design_blocked_not_applied' ||
    quizDesign.routeRegistrationAllowed !== false ||
    quizDesign.quizRouteRegistrationAllowed !== false ||
    quizDesign.liveEditsAllowed !== false ||
    quizDesign.sourceWritesUsed !== false ||
    quizDesign.phaseWriteTargets.length > 0 ||
    quizDesign.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'quiz_design_not_blocked',
      'Quiz adapter design must remain blocked before UI route design.',
    ));
  }

  return issues;
}

function detectedSurfaceIds(
  uiInventory: GavanWeek1UiRouteSourceInventory,
): Set<GavanWeek1UiSourceSurfaceFinding['id']> {
  return new Set(
    uiInventory.sourceSurfaceFindings
      .filter((finding) => finding.present)
      .map((finding) => finding.id),
  );
}

function detectedAbilityIds(
  uiInventory: GavanWeek1UiRouteSourceInventory,
): Set<GavanWeek1UiRouteAbilityFinding['id']> {
  return new Set(
    uiInventory.routeAbilityFindings
      .filter((finding) => finding.detected)
      .map((finding) => finding.id),
  );
}

function buildOpeningContract(
  input: Pick<GavanWeek1OpeningContract,
    | 'id'
    | 'taskFamily'
    | 'requiredSurfaceIds'
    | 'requiredRouteAbilityIds'
    | 'linkedQuizDesignCount'
    | 'requiredQuestionCount'
  >,
  surfaces: Set<GavanWeek1UiSourceSurfaceFinding['id']>,
  abilities: Set<GavanWeek1UiRouteAbilityFinding['id']>,
): GavanWeek1OpeningContract {
  const missingSurfaceIds = input.requiredSurfaceIds.filter((id) => !surfaces.has(id));
  const missingRouteAbilityIds = input.requiredRouteAbilityIds.filter((id) => !abilities.has(id));

  return {
    ...input,
    sourceSurfaceCoverage: missingSurfaceIds.length === 0
      ? 'all_required_surfaces_detected'
      : 'missing_required_surfaces',
    routeAbilityCoverage: missingRouteAbilityIds.length === 0
      ? 'all_required_abilities_detected'
      : 'missing_required_abilities',
    missingSurfaceIds,
    missingRouteAbilityIds,
    status: 'not_allowed_until_signature',
    routeRegistered: false,
    playable: false,
    writeActionAllowed: false,
    liveAcceptanceStatus: 'not_allowed_until_signature',
  };
}

function openingContracts(
  uiInventory: GavanWeek1UiRouteSourceInventory,
  quizDesign: GavanWeek1QuizAdapterDesign,
): GavanWeek1OpeningContract[] {
  const surfaces = detectedSurfaceIds(uiInventory);
  const abilities = detectedAbilityIds(uiInventory);
  const quizQuestionCounts = quizDesign.perDayQuizRouteDesigns.map((design) =>
    design.requiredQuestionCount,
  );
  const requiredQuestionCount = Math.max(...quizQuestionCounts);

  return [
    buildOpeningContract({
      id: 'lesson_task_opening',
      taskFamily: 'lesson',
      requiredSurfaceIds: ['task_open_helper', 'day_open_actions'],
      requiredRouteAbilityIds: ['open_lesson_menu'],
    }, surfaces, abilities),
    buildOpeningContract({
      id: 'plan_phrase_task_opening',
      taskFamily: 'plan_phrase',
      requiredSurfaceIds: ['task_open_helper', 'task_surface_entrypoint'],
      requiredRouteAbilityIds: ['open_plan_phrase_lesson'],
    }, surfaces, abilities),
    buildOpeningContract({
      id: 'dedicated_quiz_task_opening',
      taskFamily: 'quiz',
      requiredSurfaceIds: ['task_open_helper'],
      requiredRouteAbilityIds: ['open_quiz_screen'],
      linkedQuizDesignCount: quizDesign.perDayQuizRouteDesigns.length,
      requiredQuestionCount,
    }, surfaces, abilities),
    buildOpeningContract({
      id: 'plan_renderer_task_opening',
      taskFamily: 'plan_renderer',
      requiredSurfaceIds: ['day_open_actions', 'task_surface_bundle'],
      requiredRouteAbilityIds: ['open_plan_renderer'],
    }, surfaces, abilities),
    buildOpeningContract({
      id: 'lesson_shell_task_opening',
      taskFamily: 'lesson_shell',
      requiredSurfaceIds: ['day_open_actions', 'task_surface_api'],
      requiredRouteAbilityIds: ['open_lesson_shell'],
    }, surfaces, abilities),
  ];
}

function coverageIssues(
  contracts: GavanWeek1OpeningContract[],
): GavanWeek1UiRouteAdapterDesignIssue[] {
  const issues: GavanWeek1UiRouteAdapterDesignIssue[] = [];

  for (const contract of contracts) {
    for (const surfaceId of contract.missingSurfaceIds) {
      issues.push(issue(
        'missing_required_ui_surface',
        `${contract.id} requires missing UI source surface ${surfaceId}.`,
      ));
    }

    for (const abilityId of contract.missingRouteAbilityIds) {
      issues.push(issue(
        'missing_required_route_ability',
        `${contract.id} requires missing route ability ${abilityId}.`,
      ));
    }
  }

  return issues;
}

function regressionGates(): GavanWeek1UiRegressionGate[] {
  return [
    {
      id: 'home_entrypoint_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Home plan entrypoint layout and existing press behavior must pass regression checks.',
    },
    {
      id: 'onboarding_flow_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Existing onboarding personal-plan and self-guided branches must keep their current screens.',
    },
    {
      id: 'premium_flow_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Premium purchase and plan-flow activation must keep existing behavior.',
    },
    {
      id: 'self_guided_lessons_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Lessons opened outside a plan must keep current progress and completion behavior.',
    },
    {
      id: 'self_guided_quizzes_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Quizzes opened outside a plan must keep current quiz state and scoring behavior.',
    },
    {
      id: 'plan_task_carryover_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Unfinished plan tasks must still carry over instead of advancing the day silently.',
    },
    {
      id: 'completed_day_state_preserved',
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: 'Completed plan day state must stay completed and point the user back tomorrow.',
    },
  ];
}

function dependencySummary(
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
): GavanWeek1UiDependencySummary {
  return {
    catalogDayMappings: catalogDesign.proposedDayMappings.length,
    quizRouteDesigns: quizDesign.perDayQuizRouteDesigns.length,
    catalogRouteRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    allDependenciesBlocked:
      catalogDesign.proposedDayMappings.every((mapping) =>
        mapping.status === 'not_allowed_until_signature' &&
        mapping.productionRouteRegistered === false &&
        mapping.playable === false,
      ) &&
      quizDesign.perDayQuizRouteDesigns.every((design) =>
        design.status === 'not_allowed_until_signature' &&
        design.routeRegistered === false &&
        design.playable === false,
      ),
    liveBridgeAllowed: false,
  };
}

function futureLiveAcceptanceCriteria(): GavanWeek1UiRouteAdapterDesign['futureLiveAcceptanceCriteria'] {
  return [
    {
      id: 'product_copy_signature_present',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'A signed product-copy approval artifact must exist.',
    },
    {
      id: 'catalog_route_contract_signed',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Catalog adapter route contract must be approved for live source work.',
    },
    {
      id: 'quiz_route_contract_signed',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Dedicated quiz route contract must be approved for live source work.',
    },
    {
      id: 'ui_route_regression_passes',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Home, onboarding, Premium, and self-guided regression gates must pass.',
    },
    {
      id: 'route_opening_verified_on_device',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Future live route work must be verified on device or emulator after approval.',
    },
  ];
}

export function buildGavanWeek1UiRouteAdapterDesign(
  uiInventory: GavanWeek1UiRouteSourceInventory,
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
  options: GavanWeek1UiRouteAdapterDesignOptions,
): GavanWeek1UiRouteAdapterDesignBuildResult {
  const inputIssues = validateInputs(uiInventory, catalogDesign, quizDesign);

  if (inputIssues.length > 0) {
    return { valid: false, issues: inputIssues };
  }

  const contracts = openingContracts(uiInventory, quizDesign);
  const issues = coverageIssues(contracts);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    design: {
      kind: 'gavan_week1_ui_route_adapter_design',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'ui_route_adapter_design_blocked_not_applied',
      sourceUiInventoryStatus: uiInventory.status,
      sourceCatalogAdapterStatus: catalogDesign.status,
      sourceQuizAdapterStatus: quizDesign.status,
      blockingDependency: 'missing_signature:product_copy',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      uiSourceEdited: false,
      routeRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      liveEditsAllowed: false,
      openingContracts: contracts,
      regressionGates: regressionGates(),
      dependencySummary: dependencySummary(catalogDesign, quizDesign),
      futureLiveAcceptanceCriteria: futureLiveAcceptanceCriteria(),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1UiRouteAdapterDesign(
  design: GavanWeek1UiRouteAdapterDesign,
): string {
  return `${JSON.stringify(design, null, 2)}\n`;
}

export function writeGavanWeek1UiRouteAdapterDesign(
  uiInventory: GavanWeek1UiRouteSourceInventory,
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
  options: GavanWeek1UiRouteAdapterDesignWriteOptions,
): GavanWeek1UiRouteAdapterDesignWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1UiRouteAdapterDesignTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'UI route adapter design can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1UiRouteAdapterDesign(
    uiInventory,
    catalogDesign,
    quizDesign,
    options,
  );

  if (!buildResult.valid || !buildResult.design) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1UiRouteAdapterDesign(buildResult.design);
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
