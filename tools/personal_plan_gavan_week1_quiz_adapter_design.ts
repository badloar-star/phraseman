import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1QuizSourceInventory,
  GavanWeek1QuizSourceInventoryStatus,
} from './personal_plan_gavan_week1_quiz_source_inventory';

export const GAVAN_WEEK1_QUIZ_ADAPTER_DESIGN_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-quiz-adapter-design.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const EXPECTED_INVENTORY_STATUS: GavanWeek1QuizSourceInventoryStatus =
  'quiz_source_inventory_blocked_not_applied';

export type GavanWeek1QuizAdapterDesignStatus =
  'quiz_adapter_design_blocked_not_applied';

export type GavanWeek1QuizAdapterDesignIssueCode =
  | 'wrong_inventory_kind'
  | 'wrong_inventory_status'
  | 'wrong_plan_or_week'
  | 'source_writes_not_allowed'
  | 'quiz_inventory_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1QuizAdapterDesignIssue = {
  code: GavanWeek1QuizAdapterDesignIssueCode;
  detail: string;
};

export type GavanWeek1QuizAdapterDesignOptions = {
  generatedAt: string;
};

export type GavanWeek1QuizAdapterDesignWriteOptions =
  GavanWeek1QuizAdapterDesignOptions & {
    targetPath: string;
  };

export type GavanWeek1QuizCoverageRequirement = {
  required: true;
  source: 'approved_day_phrase_coverage';
  minimumCoveredPlanPhrases: 5;
  status: 'not_allowed_until_signature';
};

export type GavanWeek1QuizTaskCopyRequirement = {
  required: true;
  modes: ['choice', 'typing'];
  languages: ['ru', 'uk', 'es'];
  status: 'not_allowed_until_signature';
};

export type GavanWeek1QuizLegacyExceptionIsolation = {
  legacyIds: ['gavan_day1_identity', 'gavan_day2_address'];
  mustNotReuse: true;
  status: 'not_allowed_until_signature';
};

export type GavanWeek1PerDayQuizRouteDesign = {
  quizId: string;
  dayId: string;
  dayIndex: number;
  requiredQuestionCount: 10;
  coverageRequirement: GavanWeek1QuizCoverageRequirement;
  taskCopyRequirement: GavanWeek1QuizTaskCopyRequirement;
  legacyExceptionIsolation: GavanWeek1QuizLegacyExceptionIsolation;
  status: 'not_allowed_until_signature';
  routeRegistered: false;
  playable: false;
};

export type GavanWeek1QuizLiveAcceptanceCriterion = {
  id:
    | 'content_quality_signature_present'
    | 'quiz_ids_registered'
    | 'each_day_has_10_questions'
    | 'coverage_links_approved_phrases'
    | 'choice_and_typing_copy_present'
    | 'legacy_exceptions_isolated'
    | 'quiz_route_regression_passes';
  status: 'not_allowed_until_signature';
  requiredEvidence: string;
};

export type GavanWeek1QuizAdapterDesign = {
  kind: 'gavan_week1_quiz_adapter_design';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1QuizAdapterDesignStatus;
  sourceInventoryStatus: GavanWeek1QuizSourceInventoryStatus;
  blockingDependency: 'missing_signature:product_copy';
  routeRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  quizSourceEdited: false;
  perDayQuizRouteDesigns: GavanWeek1PerDayQuizRouteDesign[];
  futureLiveQuizAcceptanceCriteria: GavanWeek1QuizLiveAcceptanceCriterion[];
  quizAdapterPolicy: {
    dedicatedQuizPerDay: true;
    requiredQuestionCount: 10;
    requireChoiceAndTypingCopy: true;
    requireCoverageForApprovedDayPhrases: true;
    isolateLegacyGavanExceptions: true;
    liveBridgeAllowed: false;
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1QuizAdapterDesignBuildResult = {
  valid: boolean;
  issues: GavanWeek1QuizAdapterDesignIssue[];
  design?: GavanWeek1QuizAdapterDesign;
};

export type GavanWeek1QuizAdapterDesignWriteResult =
  GavanWeek1QuizAdapterDesignBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1QuizAdapterDesignIssueCode,
  detail: string,
): GavanWeek1QuizAdapterDesignIssue {
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

export function isGavanWeek1QuizAdapterDesignTargetAllowed(
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
  inventory: GavanWeek1QuizSourceInventory,
): GavanWeek1QuizAdapterDesignIssue[] {
  const issues: GavanWeek1QuizAdapterDesignIssue[] = [];

  if (inventory.kind !== 'gavan_week1_quiz_source_inventory') {
    issues.push(issue(
      'wrong_inventory_kind',
      'Quiz adapter design requires the P3.77 quiz source inventory.',
    ));
  }

  if (inventory.status !== EXPECTED_INVENTORY_STATUS) {
    issues.push(issue(
      'wrong_inventory_status',
      'Quiz adapter design must start from the blocked P3.77 inventory.',
    ));
  }

  if (inventory.planId !== 'gavan' || inventory.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Quiz adapter design can only inspect Gavan week 1.',
    ));
  }

  if (inventory.sourceWritesUsed !== false || inventory.phaseWriteTargets.length > 0) {
    issues.push(issue(
      'source_writes_not_allowed',
      'Quiz adapter design must start from a read-only inventory with no write targets.',
    ));
  }

  if (
    inventory.routeRegistrationAllowed !== false ||
    inventory.quizRouteRegistrationAllowed !== false ||
    inventory.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'quiz_inventory_not_blocked',
      'Quiz adapter design must not open quiz route work while product-copy signature is missing.',
    ));
  }

  return issues;
}

function coverageRequirement(): GavanWeek1QuizCoverageRequirement {
  return {
    required: true,
    source: 'approved_day_phrase_coverage',
    minimumCoveredPlanPhrases: 5,
    status: 'not_allowed_until_signature',
  };
}

function taskCopyRequirement(): GavanWeek1QuizTaskCopyRequirement {
  return {
    required: true,
    modes: ['choice', 'typing'],
    languages: ['ru', 'uk', 'es'],
    status: 'not_allowed_until_signature',
  };
}

function legacyExceptionIsolation(): GavanWeek1QuizLegacyExceptionIsolation {
  return {
    legacyIds: ['gavan_day1_identity', 'gavan_day2_address'],
    mustNotReuse: true,
    status: 'not_allowed_until_signature',
  };
}

function perDayQuizRouteDesigns(
  inventory: GavanWeek1QuizSourceInventory,
): GavanWeek1PerDayQuizRouteDesign[] {
  return inventory.proposedQuizRoutes.map((route) => ({
    quizId: route.quizId,
    dayId: route.dayId,
    dayIndex: route.dayIndex,
    requiredQuestionCount: 10,
    coverageRequirement: coverageRequirement(),
    taskCopyRequirement: taskCopyRequirement(),
    legacyExceptionIsolation: legacyExceptionIsolation(),
    status: 'not_allowed_until_signature',
    routeRegistered: false,
    playable: false,
  }));
}

function futureLiveQuizAcceptanceCriteria(): GavanWeek1QuizLiveAcceptanceCriterion[] {
  return [
    {
      id: 'content_quality_signature_present',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'A signed content-quality artifact or approved exception must exist.',
    },
    {
      id: 'quiz_ids_registered',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Future week 1 quiz ids must be registered by a separate live route task.',
    },
    {
      id: 'each_day_has_10_questions',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Every future day quiz must contain exactly 10 approved questions.',
    },
    {
      id: 'coverage_links_approved_phrases',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Coverage must link to approved day phrases, not generic leftovers.',
    },
    {
      id: 'choice_and_typing_copy_present',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Task copy must exist for both choice and typing modes.',
    },
    {
      id: 'legacy_exceptions_isolated',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Old Gavan exceptions must remain isolated from the new week 1 route.',
    },
    {
      id: 'quiz_route_regression_passes',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Existing quiz flows must pass regression checks after any future route registration.',
    },
  ];
}

export function buildGavanWeek1QuizAdapterDesign(
  inventory: GavanWeek1QuizSourceInventory,
  options: GavanWeek1QuizAdapterDesignOptions,
): GavanWeek1QuizAdapterDesignBuildResult {
  const issues = validateInventory(inventory);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    design: {
      kind: 'gavan_week1_quiz_adapter_design',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'quiz_adapter_design_blocked_not_applied',
      sourceInventoryStatus: inventory.status,
      blockingDependency: 'missing_signature:product_copy',
      routeRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      quizSourceEdited: false,
      perDayQuizRouteDesigns: perDayQuizRouteDesigns(inventory),
      futureLiveQuizAcceptanceCriteria: futureLiveQuizAcceptanceCriteria(),
      quizAdapterPolicy: {
        dedicatedQuizPerDay: true,
        requiredQuestionCount: 10,
        requireChoiceAndTypingCopy: true,
        requireCoverageForApprovedDayPhrases: true,
        isolateLegacyGavanExceptions: true,
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

export function serializeGavanWeek1QuizAdapterDesign(
  design: GavanWeek1QuizAdapterDesign,
): string {
  return `${JSON.stringify(design, null, 2)}\n`;
}

export function writeGavanWeek1QuizAdapterDesign(
  inventory: GavanWeek1QuizSourceInventory,
  options: GavanWeek1QuizAdapterDesignWriteOptions,
): GavanWeek1QuizAdapterDesignWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1QuizAdapterDesignTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Quiz adapter design can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1QuizAdapterDesign(inventory, options);

  if (!buildResult.valid || !buildResult.design) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1QuizAdapterDesign(buildResult.design);
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
