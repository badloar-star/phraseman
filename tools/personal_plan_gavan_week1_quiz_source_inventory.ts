import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1CatalogAdapterDesign,
  GavanWeek1CatalogAdapterDesignStatus,
} from './personal_plan_gavan_week1_catalog_adapter_design';

export const GAVAN_WEEK1_QUIZ_SOURCE_INVENTORY_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-quiz-source-inventory.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const EXPECTED_ADAPTER_DESIGN_STATUS: GavanWeek1CatalogAdapterDesignStatus =
  'catalog_adapter_design_blocked_not_applied';

export type GavanWeek1QuizSourceInventoryStatus =
  'quiz_source_inventory_blocked_not_applied';

export type GavanWeek1QuizSourceInventoryIssueCode =
  | 'wrong_adapter_design_kind'
  | 'wrong_adapter_design_status'
  | 'wrong_plan_or_week'
  | 'source_writes_not_allowed'
  | 'adapter_design_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1QuizSourceInventoryIssue = {
  code: GavanWeek1QuizSourceInventoryIssueCode;
  detail: string;
};

export type GavanWeek1QuizSourceInventoryOptions = {
  generatedAt: string;
  sourcePath: string;
};

export type GavanWeek1QuizSourceInventoryWriteOptions =
  GavanWeek1QuizSourceInventoryOptions & {
    targetPath: string;
  };

export type GavanWeek1QuizFindings = {
  sourcePath: string;
  sourceLineCount: number;
  sourceByteLength: number;
  proposedQuizIds: string[];
  existingProposedQuizIds: string[];
  missingProposedQuizIds: string[];
  containsQuizFactory: boolean;
  containsQuizRegistry: boolean;
  containsCoverageRegistry: boolean;
  containsTaskCopyRegistry: boolean;
  containsPhraseGetter: boolean;
  containsCoverageGetter: boolean;
  containsTaskCopyGetter: boolean;
  containsLegacyGavanExceptions: boolean;
};

export type GavanWeek1QuizDescriptiveFinding = {
  code:
    | 'quiz_source_surfaces_present'
    | 'legacy_gavan_quiz_exceptions_present'
    | 'proposed_quiz_ids_missing'
    | 'dedicated_ten_question_quizzes_required';
  severity: 'info' | 'warning' | 'blocked';
  detail: string;
};

export type GavanWeek1QuizSourceSurfaceFinding = {
  id:
    | 'quiz_factory'
    | 'quiz_registry'
    | 'coverage_registry'
    | 'task_copy_registry'
    | 'phrase_getter'
    | 'coverage_getter'
    | 'task_copy_getter'
    | 'legacy_gavan_exceptions';
  present: boolean;
  writeActionAllowed: false;
  note: string;
};

export type GavanWeek1ProposedQuizRoute = {
  quizId: string;
  dayId: string;
  dayIndex: number;
  requiredQuestionCount: 10;
  currentQuizPresence: 'missing' | 'already_present';
  status: 'not_allowed_until_signature';
  routeRegistered: false;
  playable: false;
};

export type GavanWeek1DedicatedQuizRequirement = {
  perDayDedicatedQuizRequired: true;
  requiredQuestionCount: 10;
  source: 'plan_day_quiz_requirement';
  status: 'not_allowed_until_signature';
  writeActionAllowed: false;
};

export type GavanWeek1QuizSourceInventory = {
  kind: 'gavan_week1_quiz_source_inventory';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1QuizSourceInventoryStatus;
  sourceAdapterDesignStatus: GavanWeek1CatalogAdapterDesignStatus;
  blockingDependency: 'missing_signature:product_copy';
  catalogRoutePlanningBlocked: true;
  routeRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  canOpenCatalogRouteTask: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  quizSourceEdited: false;
  quizFindings: GavanWeek1QuizFindings;
  sourceSurfaceFindings: GavanWeek1QuizSourceSurfaceFinding[];
  descriptiveFindings: GavanWeek1QuizDescriptiveFinding[];
  dedicatedQuizRequirement: GavanWeek1DedicatedQuizRequirement;
  proposedQuizRoutes: GavanWeek1ProposedQuizRoute[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1QuizSourceInventoryBuildResult = {
  valid: boolean;
  issues: GavanWeek1QuizSourceInventoryIssue[];
  inventory?: GavanWeek1QuizSourceInventory;
};

export type GavanWeek1QuizSourceInventoryWriteResult =
  GavanWeek1QuizSourceInventoryBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1QuizSourceInventoryIssueCode,
  detail: string,
): GavanWeek1QuizSourceInventoryIssue {
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

export function isGavanWeek1QuizSourceInventoryTargetAllowed(
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

function validateAdapterDesign(
  design: GavanWeek1CatalogAdapterDesign,
): GavanWeek1QuizSourceInventoryIssue[] {
  const issues: GavanWeek1QuizSourceInventoryIssue[] = [];

  if (design.kind !== 'gavan_week1_catalog_adapter_design') {
    issues.push(issue(
      'wrong_adapter_design_kind',
      'Quiz source inventory requires the P3.76 catalog adapter design.',
    ));
  }

  if (design.status !== EXPECTED_ADAPTER_DESIGN_STATUS) {
    issues.push(issue(
      'wrong_adapter_design_status',
      'Quiz source inventory must start from the blocked P3.76 adapter design.',
    ));
  }

  if (design.planId !== 'gavan' || design.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Quiz source inventory can only inspect Gavan week 1.',
    ));
  }

  if (design.sourceWritesUsed !== false || design.phaseWriteTargets.length > 0) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Quiz source inventory must start from a read-only adapter design with no write targets.',
    ));
  }

  if (
    design.routeRegistrationAllowed !== false ||
    design.canOpenCatalogRouteTask !== false ||
    design.catalogRoutePlanningBlocked !== true ||
    design.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'adapter_design_not_blocked',
      'Quiz source inventory must not open quiz route work while product-copy signature is missing.',
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

function quizGetterName(suffix: 'Phrases' | 'Coverage' | 'TaskCopy'): string {
  return ['get', 'Personal', 'Plan', 'Quiz', suffix].join('');
}

function proposedQuizId(dayId: string): string {
  return `${dayId}-quiz`;
}

function quizFindings(
  design: GavanWeek1CatalogAdapterDesign,
  quizSource: string,
  sourcePath: string,
): GavanWeek1QuizFindings {
  const proposedQuizIds = design.proposedDayMappings.map((mapping) => proposedQuizId(mapping.dayId));
  const existingProposedQuizIds = proposedQuizIds.filter((quizId) => quizSource.includes(quizId));
  const missingProposedQuizIds = proposedQuizIds.filter((quizId) => !quizSource.includes(quizId));

  return {
    sourcePath,
    sourceLineCount: lineCount(quizSource),
    sourceByteLength: Buffer.byteLength(quizSource, 'utf8'),
    proposedQuizIds,
    existingProposedQuizIds,
    missingProposedQuizIds,
    containsQuizFactory: /function\s+q\s*\(/.test(quizSource),
    containsQuizRegistry: /const\s+PLAN_QUIZZES\b/.test(quizSource),
    containsCoverageRegistry: /const\s+PLAN_QUIZ_COVERAGE\b/.test(quizSource),
    containsTaskCopyRegistry: /const\s+PLAN_QUIZ_TASK_COPY\b/.test(quizSource),
    containsPhraseGetter: quizSource.includes(quizGetterName('Phrases')),
    containsCoverageGetter: quizSource.includes(quizGetterName('Coverage')),
    containsTaskCopyGetter: quizSource.includes(quizGetterName('TaskCopy')),
    containsLegacyGavanExceptions:
      quizSource.includes('gavan_day1_identity') &&
      quizSource.includes('gavan_day2_address'),
  };
}

function sourceSurfaceFindings(
  findings: GavanWeek1QuizFindings,
): GavanWeek1QuizSourceSurfaceFinding[] {
  return [
    {
      id: 'quiz_factory',
      present: findings.containsQuizFactory,
      writeActionAllowed: false,
      note: 'Quiz item factory can be inspected later for dedicated day quizzes.',
    },
    {
      id: 'quiz_registry',
      present: findings.containsQuizRegistry,
      writeActionAllowed: false,
      note: 'Quiz registry surface is present; no route registration is allowed now.',
    },
    {
      id: 'coverage_registry',
      present: findings.containsCoverageRegistry,
      writeActionAllowed: false,
      note: 'Coverage registry surface is present for future source coverage checks.',
    },
    {
      id: 'task_copy_registry',
      present: findings.containsTaskCopyRegistry,
      writeActionAllowed: false,
      note: 'Task copy registry surface is present for future user-facing quiz instructions.',
    },
    {
      id: 'phrase_getter',
      present: findings.containsPhraseGetter,
      writeActionAllowed: false,
      note: 'Phrase getter surface is present; no production quiz route is registered now.',
    },
    {
      id: 'coverage_getter',
      present: findings.containsCoverageGetter,
      writeActionAllowed: false,
      note: 'Coverage getter surface is present for later quality gates.',
    },
    {
      id: 'task_copy_getter',
      present: findings.containsTaskCopyGetter,
      writeActionAllowed: false,
      note: 'Task copy getter surface is present for later copy quality gates.',
    },
    {
      id: 'legacy_gavan_exceptions',
      present: findings.containsLegacyGavanExceptions,
      writeActionAllowed: false,
      note: 'Old Gavan quiz exceptions are detected and must not be reused as week 1 routes.',
    },
  ];
}

function descriptiveFindings(
  findings: GavanWeek1QuizFindings,
): GavanWeek1QuizDescriptiveFinding[] {
  const result: GavanWeek1QuizDescriptiveFinding[] = [];

  if (
    findings.containsQuizFactory &&
    findings.containsQuizRegistry &&
    findings.containsCoverageRegistry &&
    findings.containsTaskCopyRegistry &&
    findings.containsPhraseGetter &&
    findings.containsCoverageGetter &&
    findings.containsTaskCopyGetter
  ) {
    result.push({
      code: 'quiz_source_surfaces_present',
      severity: 'info',
      detail: 'Quiz source exposes factory, registry, coverage, task copy, and getter surfaces.',
    });
  }

  if (findings.containsLegacyGavanExceptions) {
    result.push({
      code: 'legacy_gavan_quiz_exceptions_present',
      severity: 'warning',
      detail: 'Legacy Gavan quiz exceptions are present and should not become the new week 1 route.',
    });
  }

  if (findings.missingProposedQuizIds.length > 0) {
    result.push({
      code: 'proposed_quiz_ids_missing',
      severity: 'blocked',
      detail: 'Future Gavan week 1 dedicated quiz ids are not registered in the current quiz source.',
    });
  }

  result.push({
    code: 'dedicated_ten_question_quizzes_required',
    severity: 'blocked',
    detail: 'Each future day quiz must be a dedicated 10-question quiz after approval.',
  });

  return result;
}

function proposedQuizRoutes(
  design: GavanWeek1CatalogAdapterDesign,
  findings: GavanWeek1QuizFindings,
): GavanWeek1ProposedQuizRoute[] {
  const existingIds = new Set(findings.existingProposedQuizIds);

  return design.proposedDayMappings.map((mapping) => {
    const quizId = proposedQuizId(mapping.dayId);

    return {
      quizId,
      dayId: mapping.dayId,
      dayIndex: mapping.dayIndex,
      requiredQuestionCount: 10,
      currentQuizPresence: existingIds.has(quizId) ? 'already_present' : 'missing',
      status: 'not_allowed_until_signature',
      routeRegistered: false,
      playable: false,
    };
  });
}

function dedicatedQuizRequirement(): GavanWeek1DedicatedQuizRequirement {
  return {
    perDayDedicatedQuizRequired: true,
    requiredQuestionCount: 10,
    source: 'plan_day_quiz_requirement',
    status: 'not_allowed_until_signature',
    writeActionAllowed: false,
  };
}

export function buildGavanWeek1QuizSourceInventory(
  design: GavanWeek1CatalogAdapterDesign,
  quizSource: string,
  options: GavanWeek1QuizSourceInventoryOptions,
): GavanWeek1QuizSourceInventoryBuildResult {
  const issues = validateAdapterDesign(design);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const findings = quizFindings(design, quizSource, options.sourcePath);

  return {
    valid: true,
    issues: [],
    inventory: {
      kind: 'gavan_week1_quiz_source_inventory',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'quiz_source_inventory_blocked_not_applied',
      sourceAdapterDesignStatus: design.status,
      blockingDependency: 'missing_signature:product_copy',
      catalogRoutePlanningBlocked: true,
      routeRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      canOpenCatalogRouteTask: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      quizSourceEdited: false,
      quizFindings: findings,
      sourceSurfaceFindings: sourceSurfaceFindings(findings),
      descriptiveFindings: descriptiveFindings(findings),
      dedicatedQuizRequirement: dedicatedQuizRequirement(),
      proposedQuizRoutes: proposedQuizRoutes(design, findings),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1QuizSourceInventory(
  inventory: GavanWeek1QuizSourceInventory,
): string {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

export function writeGavanWeek1QuizSourceInventory(
  design: GavanWeek1CatalogAdapterDesign,
  quizSource: string,
  options: GavanWeek1QuizSourceInventoryWriteOptions,
): GavanWeek1QuizSourceInventoryWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1QuizSourceInventoryTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Quiz source inventory can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1QuizSourceInventory(design, quizSource, options);

  if (!buildResult.valid || !buildResult.inventory) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1QuizSourceInventory(buildResult.inventory);
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
