import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanDay1BridgeDiffPlan,
  GavanDay1BridgeDiffPlanFutureEdit,
} from './personal_plan_gavan_day1_bridge_diff_plan';

export const GAVAN_DAY1_FUTURE_BRIDGE_GUARD_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-day1-future-bridge-guard-report.json',
);

const REQUIRED_CATALOG_UNIT_IDS = [
  'gavan-day1-final-p1',
  'gavan-day1-final-p2',
  'gavan-day1-final-p3',
  'gavan-day1-final-p4',
  'gavan-day1-final-p5',
] as const;

const REQUIRED_QUIZ_ID = 'gavan-week1-day1-quiz';
const REQUIRED_QUIZ_REGISTRY_PARTS = [
  'PLAN_QUIZZES',
  'PLAN_QUIZ_COVERAGE',
  'PLAN_QUIZ_TASK_COPY',
] as const;

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanDay1FutureBridgeGuardApproval = {
  approvedBy: string;
  approvedAt: string;
  reason: string;
};

export type GavanDay1FutureBridgeGuardChecklistItem = {
  id:
    | 'catalog_units_ready'
    | 'quiz_registry_ready'
    | 'approval_required'
    | 'source_writes_blocked';
  targetFile?: GavanDay1BridgeDiffPlanFutureEdit['targetFile'];
  state: 'blocked_until_approval';
  evidence: string;
};

export type GavanDay1FutureBridgeGuardReport = {
  kind: 'gavan_day1_future_bridge_guard_report';
  generatedAt: string;
  dayId: 'gavan-week1-day1';
  status: 'guarded_not_applied';
  sourceDiffPlanGeneratedAt: string;
  approvalRequiredBeforeApply: true;
  explicitApproval?: GavanDay1FutureBridgeGuardApproval;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  readOnlyFutureTargets: GavanDay1BridgeDiffPlanFutureEdit['targetFile'][];
  requiredCatalogUnitIds: string[];
  requiredQuizId: typeof REQUIRED_QUIZ_ID;
  checklist: GavanDay1FutureBridgeGuardChecklistItem[];
};

export type GavanDay1FutureBridgeGuardOptions = {
  generatedAt: string;
  explicitApproval?: GavanDay1FutureBridgeGuardApproval;
};

export type GavanDay1FutureBridgeGuardWriteOptions =
  GavanDay1FutureBridgeGuardOptions & {
    targetPath: string;
  };

export type GavanDay1FutureBridgeGuardIssueCode =
  | 'applied_without_explicit_approval'
  | 'missing_catalog_unit_ids'
  | 'missing_quiz_id'
  | 'missing_quiz_registry_target'
  | 'target_path_not_allowed';

export type GavanDay1FutureBridgeGuardIssue = {
  code: GavanDay1FutureBridgeGuardIssueCode;
  detail: string;
  missing?: string[];
};

export type GavanDay1FutureBridgeGuardBuildResult = {
  valid: boolean;
  issues: GavanDay1FutureBridgeGuardIssue[];
  report?: GavanDay1FutureBridgeGuardReport;
};

export type GavanDay1FutureBridgeGuardWriteResult = {
  valid: boolean;
  issues: GavanDay1FutureBridgeGuardIssue[];
  targetPath?: string;
  bytesWritten?: number;
  report?: GavanDay1FutureBridgeGuardReport;
};

function issue(
  code: GavanDay1FutureBridgeGuardIssueCode,
  detail: string,
  missing?: string[],
): GavanDay1FutureBridgeGuardIssue {
  return { code, detail, missing };
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

export function isGavanDay1FutureBridgeGuardReportTargetAllowed(
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

function catalogEdit(plan: GavanDay1BridgeDiffPlan): GavanDay1BridgeDiffPlanFutureEdit | undefined {
  return plan.futureEdits.find((edit) => edit.targetFile === 'app/personal_plan_catalog.ts');
}

function quizEdit(plan: GavanDay1BridgeDiffPlan): GavanDay1BridgeDiffPlanFutureEdit | undefined {
  return plan.futureEdits.find((edit) => edit.targetFile === 'app/personal_plan_quizzes.ts');
}

function missingCatalogIds(edit: GavanDay1BridgeDiffPlanFutureEdit | undefined): string[] {
  const proposed = new Set(edit?.proposedIds ?? []);
  return REQUIRED_CATALOG_UNIT_IDS.filter((id) => !proposed.has(id));
}

function missingQuizRegistryTargets(edit: GavanDay1BridgeDiffPlanFutureEdit | undefined): string[] {
  const insertionPoint = edit?.insertionPoint ?? '';
  return REQUIRED_QUIZ_REGISTRY_PARTS.filter((part) => !insertionPoint.includes(part));
}

function readOnlyTargets(plan: GavanDay1BridgeDiffPlan): GavanDay1BridgeDiffPlanFutureEdit['targetFile'][] {
  return Array.from(new Set(plan.futureEdits.map((edit) => edit.targetFile)));
}

function checklist(
  plan: GavanDay1BridgeDiffPlan,
): GavanDay1FutureBridgeGuardChecklistItem[] {
  return [
    {
      id: 'catalog_units_ready',
      targetFile: 'app/personal_plan_catalog.ts',
      state: 'blocked_until_approval',
      evidence: `${catalogEdit(plan)?.proposedIds.length ?? 0} catalog unit ids are present in the diff plan.`,
    },
    {
      id: 'quiz_registry_ready',
      targetFile: 'app/personal_plan_quizzes.ts',
      state: 'blocked_until_approval',
      evidence: `${quizEdit(plan)?.proposedIds.length ?? 0} quiz id is present in the diff plan.`,
    },
    {
      id: 'approval_required',
      state: 'blocked_until_approval',
      evidence: 'Live source edits require explicit approval metadata in a later phase.',
    },
    {
      id: 'source_writes_blocked',
      state: 'blocked_until_approval',
      evidence: 'This phase produces a dry guard report and uses no source write targets.',
    },
  ];
}

export function buildGavanDay1FutureBridgeGuardReport(
  plan: GavanDay1BridgeDiffPlan,
  options: GavanDay1FutureBridgeGuardOptions,
): GavanDay1FutureBridgeGuardBuildResult {
  const issues: GavanDay1FutureBridgeGuardIssue[] = [];
  const applied = (plan as unknown as { applied?: boolean }).applied === true;

  if (applied && !options.explicitApproval) {
    issues.push(issue(
      'applied_without_explicit_approval',
      'A future bridge cannot be marked applied without explicit approval metadata.',
    ));
  }

  const missingCatalog = missingCatalogIds(catalogEdit(plan));
  if (missingCatalog.length > 0) {
    issues.push(issue(
      'missing_catalog_unit_ids',
      'The future bridge diff plan is missing required Gavan day 1 catalog unit ids.',
      missingCatalog,
    ));
  }

  const quiz = quizEdit(plan);
  if (!quiz?.proposedIds.includes(REQUIRED_QUIZ_ID)) {
    issues.push(issue(
      'missing_quiz_id',
      'The future bridge diff plan is missing the required Gavan day 1 quiz id.',
      [REQUIRED_QUIZ_ID],
    ));
  }

  const missingRegistryTargets = missingQuizRegistryTargets(quiz);
  if (missingRegistryTargets.length > 0) {
    issues.push(issue(
      'missing_quiz_registry_target',
      'The future bridge diff plan is missing one or more quiz registry insertion targets.',
      missingRegistryTargets,
    ));
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_day1_future_bridge_guard_report',
      generatedAt: options.generatedAt,
      dayId: plan.dayId,
      status: 'guarded_not_applied',
      sourceDiffPlanGeneratedAt: plan.generatedAt,
      approvalRequiredBeforeApply: true,
      explicitApproval: options.explicitApproval,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      readOnlyFutureTargets: readOnlyTargets(plan),
      requiredCatalogUnitIds: [...REQUIRED_CATALOG_UNIT_IDS],
      requiredQuizId: REQUIRED_QUIZ_ID,
      checklist: checklist(plan),
    },
  };
}

export function serializeGavanDay1FutureBridgeGuardReport(
  report: GavanDay1FutureBridgeGuardReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function writeGavanDay1FutureBridgeGuardReport(
  plan: GavanDay1BridgeDiffPlan,
  options: GavanDay1FutureBridgeGuardWriteOptions,
): GavanDay1FutureBridgeGuardWriteResult {
  const buildResult = buildGavanDay1FutureBridgeGuardReport(plan, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.report) {
    return {
      valid: false,
      issues: buildResult.issues,
    };
  }

  if (!isGavanDay1FutureBridgeGuardReportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Future bridge guard report can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanDay1FutureBridgeGuardReport(buildResult.report);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    report: buildResult.report,
  };
}
