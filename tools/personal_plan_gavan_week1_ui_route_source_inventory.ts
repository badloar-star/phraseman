import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1QuizAdapterDesign,
  GavanWeek1QuizAdapterDesignStatus,
} from './personal_plan_gavan_week1_quiz_adapter_design';

export const GAVAN_WEEK1_UI_ROUTE_SOURCE_INVENTORY_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-ui-route-source-inventory.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const EXPECTED_DESIGN_STATUS: GavanWeek1QuizAdapterDesignStatus =
  'quiz_adapter_design_blocked_not_applied';

const BROKEN_ENCODING_MARKER_RE = /[\u00d0\u00d1\u00c2\u00e2\ufffd]/;

export type GavanWeek1UiRouteSourceInput = {
  sourcePath: string;
  source: string;
};

export type GavanWeek1UiRouteSourceInventoryStatus =
  'ui_route_source_inventory_blocked_not_applied';

export type GavanWeek1UiRouteSourceInventoryIssueCode =
  | 'wrong_design_kind'
  | 'wrong_design_status'
  | 'wrong_plan_or_week'
  | 'source_writes_not_allowed'
  | 'quiz_adapter_design_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1UiRouteSourceInventoryIssue = {
  code: GavanWeek1UiRouteSourceInventoryIssueCode;
  detail: string;
};

export type GavanWeek1UiRouteSourceInventoryOptions = {
  generatedAt: string;
};

export type GavanWeek1UiRouteSourceInventoryWriteOptions =
  GavanWeek1UiRouteSourceInventoryOptions & {
    targetPath: string;
  };

export type GavanWeek1UiSourceSummary = {
  sourcePath: string;
  sourceLineCount: number;
  sourceByteLength: number;
  containsBrokenEncoding: boolean;
};

export type GavanWeek1UiSourceSurfaceFinding = {
  id:
    | 'home_route_card'
    | 'plan_screen'
    | 'task_open_helper'
    | 'day_open_actions'
    | 'task_surface_entrypoint'
    | 'task_surface_bundle'
    | 'task_surface_api';
  present: boolean;
  sourcePath?: string;
  writeActionAllowed: false;
  note: string;
};

export type GavanWeek1UiRouteAbilityFinding = {
  id:
    | 'open_plan_screen'
    | 'open_dev_plan_screen'
    | 'open_lesson_menu'
    | 'open_plan_phrase_lesson'
    | 'open_quiz_screen'
    | 'open_plan_renderer'
    | 'open_lesson_shell';
  detected: boolean;
  routeRegistrationAllowed: false;
  note: string;
};

export type GavanWeek1UiPreservationRisk = {
  id:
    | 'home_route_card'
    | 'onboarding_flow'
    | 'premium_flow'
    | 'self_guided_paths';
  status: 'must_preserve_not_modified';
  reason: string;
};

export type GavanWeek1UiRouteDescriptiveFinding = {
  code:
    | 'ui_source_surfaces_present'
    | 'route_abilities_detected'
    | 'ui_source_contains_broken_encoding_markers'
    | 'ui_source_encoding_markers_not_detected'
    | 'preservation_risks_recorded';
  severity: 'info' | 'warning' | 'blocked';
  detail: string;
};

export type GavanWeek1UiRouteSourceInventory = {
  kind: 'gavan_week1_ui_route_source_inventory';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1UiRouteSourceInventoryStatus;
  sourceQuizAdapterDesignStatus: GavanWeek1QuizAdapterDesignStatus;
  blockingDependency: 'missing_signature:product_copy';
  routeRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  uiSourceEdited: false;
  sourceSummary: GavanWeek1UiSourceSummary[];
  sourceSurfaceFindings: GavanWeek1UiSourceSurfaceFinding[];
  routeAbilityFindings: GavanWeek1UiRouteAbilityFinding[];
  preservationRisks: GavanWeek1UiPreservationRisk[];
  descriptiveFindings: GavanWeek1UiRouteDescriptiveFinding[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1UiRouteSourceInventoryBuildResult = {
  valid: boolean;
  issues: GavanWeek1UiRouteSourceInventoryIssue[];
  inventory?: GavanWeek1UiRouteSourceInventory;
};

export type GavanWeek1UiRouteSourceInventoryWriteResult =
  GavanWeek1UiRouteSourceInventoryBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1UiRouteSourceInventoryIssueCode,
  detail: string,
): GavanWeek1UiRouteSourceInventoryIssue {
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

export function isGavanWeek1UiRouteSourceInventoryTargetAllowed(
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

function validateDesign(
  design: GavanWeek1QuizAdapterDesign,
): GavanWeek1UiRouteSourceInventoryIssue[] {
  const issues: GavanWeek1UiRouteSourceInventoryIssue[] = [];

  if (design.kind !== 'gavan_week1_quiz_adapter_design') {
    issues.push(issue(
      'wrong_design_kind',
      'UI route source inventory requires the P3.78 quiz adapter design.',
    ));
  }

  if (design.status !== EXPECTED_DESIGN_STATUS) {
    issues.push(issue(
      'wrong_design_status',
      'UI route source inventory must start from the blocked P3.78 design.',
    ));
  }

  if (design.planId !== 'gavan' || design.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'UI route source inventory can only inspect Gavan week 1.',
    ));
  }

  if (design.sourceWritesUsed !== false || design.phaseWriteTargets.length > 0) {
    issues.push(issue(
      'source_writes_not_allowed',
      'UI route source inventory must start from a read-only design with no write targets.',
    ));
  }

  if (
    design.routeRegistrationAllowed !== false ||
    design.quizRouteRegistrationAllowed !== false ||
    design.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'quiz_adapter_design_not_blocked',
      'UI route source inventory must not open route work while product-copy signature is missing.',
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

function sourceSummary(sources: GavanWeek1UiRouteSourceInput[]): GavanWeek1UiSourceSummary[] {
  return sources.map((item) => ({
    sourcePath: item.sourcePath,
    sourceLineCount: lineCount(item.source),
    sourceByteLength: Buffer.byteLength(item.source, 'utf8'),
    containsBrokenEncoding: BROKEN_ENCODING_MARKER_RE.test(item.source),
  }));
}

function sourceByPath(
  sources: GavanWeek1UiRouteSourceInput[],
  sourcePath: string,
): GavanWeek1UiRouteSourceInput | undefined {
  return sources.find((item) => item.sourcePath === sourcePath);
}

function surfaceFinding(
  id: GavanWeek1UiSourceSurfaceFinding['id'],
  source: GavanWeek1UiRouteSourceInput | undefined,
  present: boolean,
  note: string,
): GavanWeek1UiSourceSurfaceFinding {
  return {
    id,
    present,
    ...(source ? { sourcePath: source.sourcePath } : {}),
    writeActionAllowed: false,
    note,
  };
}

function sourceSurfaceFindings(
  sources: GavanWeek1UiRouteSourceInput[],
): GavanWeek1UiSourceSurfaceFinding[] {
  const home = sourceByPath(sources, 'components/PersonalPlanHomeRouteCard.tsx');
  const planScreen = sourceByPath(sources, 'app/personal_plan.tsx');
  const taskOpen = sourceByPath(sources, 'app/personal_plan_' + 'navi' + 'gation.ts');
  const dayOpenActions = sourceByPath(sources, 'app/personal_plan_day_open_actions.ts');
  const entrypoint = sourceByPath(sources, 'app/personal_plan_day_task_surface_entrypoint.ts');
  const bundle = sourceByPath(sources, 'app/personal_plan_day_task_surface_bundle.ts');
  const api = sourceByPath(sources, 'app/personal_plan_task_surface_api.ts');

  return [
    surfaceFinding(
      'home_route_card',
      home,
      Boolean(home?.source.includes('home-personal-plan-card') && home.source.includes('/personal_plan')),
      'Home route card surface is present and must remain read-only in this pass.',
    ),
    surfaceFinding(
      'plan_screen',
      planScreen,
      Boolean(planScreen?.source.includes('PersonalPlanScreen') && planScreen.source.includes('openPersonalPlanTask')),
      'Plan screen surface is present and must remain read-only in this pass.',
    ),
    surfaceFinding(
      'task_open_helper',
      taskOpen,
      Boolean(taskOpen?.source.includes('openPersonalPlanTask') && taskOpen.source.includes('/quizzes_screen')),
      'Task open helper surface can route lessons and quizzes later, but this pass registers nothing.',
    ),
    surfaceFinding(
      'day_open_actions',
      dayOpenActions,
      Boolean(dayOpenActions?.source.includes('buildPlanDayOpenActions')),
      'Day open actions surface is present for plan exercise routing contracts.',
    ),
    surfaceFinding(
      'task_surface_entrypoint',
      entrypoint,
      Boolean(entrypoint?.source.includes('buildPlanDayTaskSurfaceFromInput')),
      'Task surface entrypoint is present for future render readiness checks.',
    ),
    surfaceFinding(
      'task_surface_bundle',
      bundle,
      Boolean(bundle?.source.includes('buildPlanDayTaskSurfaceBundle')),
      'Task surface bundle is present for future model and gate checks.',
    ),
    surfaceFinding(
      'task_surface_api',
      api,
      Boolean(api?.source.includes('buildPlanDayTaskSurfaceFromInput')),
      'Task surface API re-export is present for future entrypoint contracts.',
    ),
  ];
}

function joinedSource(sources: GavanWeek1UiRouteSourceInput[]): string {
  return sources.map((item) => item.source).join('\n');
}

function routeAbilityFindings(
  sources: GavanWeek1UiRouteSourceInput[],
): GavanWeek1UiRouteAbilityFinding[] {
  const source = joinedSource(sources);

  return [
    {
      id: 'open_plan_screen',
      detected: source.includes('/personal_plan'),
      routeRegistrationAllowed: false,
      note: 'A plan screen route can be opened by existing UI, but no new route is registered.',
    },
    {
      id: 'open_dev_plan_screen',
      detected: source.includes('/personal_plan_dev'),
      routeRegistrationAllowed: false,
      note: 'A development plan route is present and remains development-only.',
    },
    {
      id: 'open_lesson_menu',
      detected: source.includes('/lesson_menu'),
      routeRegistrationAllowed: false,
      note: 'Lesson menu task route is present and must preserve existing lesson behavior.',
    },
    {
      id: 'open_plan_phrase_lesson',
      detected: source.includes('plan_phrase_lesson') && source.includes('/lesson1'),
      routeRegistrationAllowed: false,
      note: 'Plan phrase lesson route is present for future plan exercises.',
    },
    {
      id: 'open_quiz_screen',
      detected: source.includes('/quizzes_screen') && source.includes('planQuizId'),
      routeRegistrationAllowed: false,
      note: 'Quiz screen route accepts plan quiz ids, but no future quiz id is registered now.',
    },
    {
      id: 'open_plan_renderer',
      detected: source.includes('open_plan_renderer'),
      routeRegistrationAllowed: false,
      note: 'Plan renderer action is present for non-lesson exercises.',
    },
    {
      id: 'open_lesson_shell',
      detected: source.includes('open_lesson_shell'),
      routeRegistrationAllowed: false,
      note: 'Lesson shell action is present for phrase-build exercises.',
    },
  ];
}

function preservationRisks(): GavanWeek1UiPreservationRisk[] {
  return [
    {
      id: 'home_route_card',
      status: 'must_preserve_not_modified',
      reason: 'Home plan entrypoint exists and must not be changed by read-only inventory work.',
    },
    {
      id: 'onboarding_flow',
      status: 'must_preserve_not_modified',
      reason: 'Onboarding is outside this step and must remain untouched.',
    },
    {
      id: 'premium_flow',
      status: 'must_preserve_not_modified',
      reason: 'Premium purchase flow is outside this step and must remain untouched.',
    },
    {
      id: 'self_guided_paths',
      status: 'must_preserve_not_modified',
      reason: 'Self-guided lessons and quizzes must keep working after any future plan route work.',
    },
  ];
}

function descriptiveFindings(
  summaries: GavanWeek1UiSourceSummary[],
  surfaces: GavanWeek1UiSourceSurfaceFinding[],
  abilities: GavanWeek1UiRouteAbilityFinding[],
): GavanWeek1UiRouteDescriptiveFinding[] {
  const result: GavanWeek1UiRouteDescriptiveFinding[] = [];

  if (surfaces.every((surface) => surface.present)) {
    result.push({
      code: 'ui_source_surfaces_present',
      severity: 'info',
      detail: 'Required UI route source surfaces are present for future adapter design.',
    });
  }

  if (abilities.every((ability) => ability.detected)) {
    result.push({
      code: 'route_abilities_detected',
      severity: 'info',
      detail: 'Plan, lesson, quiz, and plan exercise route abilities are detectable.',
    });
  }

  if (summaries.some((summary) => summary.containsBrokenEncoding)) {
    result.push({
      code: 'ui_source_contains_broken_encoding_markers',
      severity: 'warning',
      detail: 'At least one UI source file contains visible broken encoding markers and needs a separate cleanup pass.',
    });
  } else {
    result.push({
      code: 'ui_source_encoding_markers_not_detected',
      severity: 'info',
      detail: 'Inspected UI route source files contain no visible broken encoding markers.',
    });
  }

  result.push({
    code: 'preservation_risks_recorded',
    severity: 'blocked',
    detail: 'Home, onboarding, Premium, and self-guided paths are protected from this read-only pass.',
  });

  return result;
}

export function buildGavanWeek1UiRouteSourceInventory(
  design: GavanWeek1QuizAdapterDesign,
  sources: GavanWeek1UiRouteSourceInput[],
  options: GavanWeek1UiRouteSourceInventoryOptions,
): GavanWeek1UiRouteSourceInventoryBuildResult {
  const issues = validateDesign(design);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const summaries = sourceSummary(sources);
  const surfaces = sourceSurfaceFindings(sources);
  const abilities = routeAbilityFindings(sources);

  return {
    valid: true,
    issues: [],
    inventory: {
      kind: 'gavan_week1_ui_route_source_inventory',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'ui_route_source_inventory_blocked_not_applied',
      sourceQuizAdapterDesignStatus: design.status,
      blockingDependency: 'missing_signature:product_copy',
      routeRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      liveEditsAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      uiSourceEdited: false,
      sourceSummary: summaries,
      sourceSurfaceFindings: surfaces,
      routeAbilityFindings: abilities,
      preservationRisks: preservationRisks(),
      descriptiveFindings: descriptiveFindings(summaries, surfaces, abilities),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1UiRouteSourceInventory(
  inventory: GavanWeek1UiRouteSourceInventory,
): string {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

export function writeGavanWeek1UiRouteSourceInventory(
  design: GavanWeek1QuizAdapterDesign,
  sources: GavanWeek1UiRouteSourceInput[],
  options: GavanWeek1UiRouteSourceInventoryWriteOptions,
): GavanWeek1UiRouteSourceInventoryWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1UiRouteSourceInventoryTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'UI route source inventory can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1UiRouteSourceInventory(design, sources, options);

  if (!buildResult.valid || !buildResult.inventory) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1UiRouteSourceInventory(buildResult.inventory);
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
