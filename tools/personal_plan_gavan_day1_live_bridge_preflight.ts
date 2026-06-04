import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanDay1BridgeDiffPlan,
  GavanDay1BridgeDiffPlanFutureEdit,
} from './personal_plan_gavan_day1_bridge_diff_plan';
import type {
  GavanDay1FutureBridgeGuardReport,
} from './personal_plan_gavan_day1_future_bridge_guard';

export const GAVAN_DAY1_LIVE_BRIDGE_PREFLIGHT_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-day1-live-bridge-preflight-report.json',
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

export type GavanDay1LiveBridgePreflightReadOnlyFile =
  | 'app/personal_plan_catalog.ts'
  | 'app/personal_plan_quizzes.ts';

export type GavanDay1LiveBridgePreflightBlockedReason =
  | 'approval_metadata_missing'
  | 'live_source_edit_not_requested';

export type GavanDay1LiveBridgePreflightReport = {
  kind: 'gavan_day1_live_bridge_preflight_report';
  generatedAt: string;
  dayId: 'gavan-week1-day1';
  status: 'waiting_for_explicit_approval';
  liveBridgeCanApplyNow: false;
  approvalMetadataPresent: boolean;
  applyBlockedReasons: GavanDay1LiveBridgePreflightBlockedReason[];
  liveFilesContainCertifiedIds: false;
  futureDiffStable: true;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  readOnlyFilesChecked: GavanDay1LiveBridgePreflightReadOnlyFile[];
  certifiedIdsChecked: string[];
  requiredQuizId: typeof REQUIRED_QUIZ_ID;
};

export type GavanDay1LiveBridgePreflightOptions = {
  generatedAt: string;
  catalogSource: string;
  quizSource: string;
};

export type GavanDay1LiveBridgePreflightWriteOptions =
  GavanDay1LiveBridgePreflightOptions & {
    targetPath: string;
  };

export type GavanDay1LiveBridgePreflightIssueCode =
  | 'certified_ids_already_in_live_source'
  | 'future_diff_changed'
  | 'dry_guard_policy_broken'
  | 'target_path_not_allowed';

export type GavanDay1LiveBridgePreflightIssue = {
  code: GavanDay1LiveBridgePreflightIssueCode;
  detail: string;
  found?: string[];
  missing?: string[];
};

export type GavanDay1LiveBridgePreflightBuildResult = {
  valid: boolean;
  issues: GavanDay1LiveBridgePreflightIssue[];
  report?: GavanDay1LiveBridgePreflightReport;
};

export type GavanDay1LiveBridgePreflightWriteResult = {
  valid: boolean;
  issues: GavanDay1LiveBridgePreflightIssue[];
  targetPath?: string;
  bytesWritten?: number;
  report?: GavanDay1LiveBridgePreflightReport;
};

function issue(
  code: GavanDay1LiveBridgePreflightIssueCode,
  detail: string,
  extra?: Pick<GavanDay1LiveBridgePreflightIssue, 'found' | 'missing'>,
): GavanDay1LiveBridgePreflightIssue {
  return { code, detail, ...extra };
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

export function isGavanDay1LiveBridgePreflightReportTargetAllowed(
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

function foundCertifiedIds(catalogSource: string, quizSource: string): string[] {
  const combinedSource = `${catalogSource}\n${quizSource}`;
  return [...REQUIRED_CATALOG_UNIT_IDS, REQUIRED_QUIZ_ID].filter((id) =>
    combinedSource.includes(id),
  );
}

function missingCatalogIds(plan: GavanDay1BridgeDiffPlan): string[] {
  const proposed = new Set(catalogEdit(plan)?.proposedIds ?? []);
  return REQUIRED_CATALOG_UNIT_IDS.filter((id) => !proposed.has(id));
}

function missingQuizTargets(plan: GavanDay1BridgeDiffPlan): string[] {
  const quiz = quizEdit(plan);
  const missing: string[] = [];

  if (!quiz?.proposedIds.includes(REQUIRED_QUIZ_ID)) {
    missing.push(REQUIRED_QUIZ_ID);
  }

  const insertionPoint = quiz?.insertionPoint ?? '';
  REQUIRED_QUIZ_REGISTRY_PARTS.forEach((target) => {
    if (!insertionPoint.includes(target)) {
      missing.push(target);
    }
  });

  return missing;
}

function guardPolicyBroken(report: GavanDay1FutureBridgeGuardReport): boolean {
  const sourceWritesUsed = (report as unknown as { sourceWritesUsed?: boolean }).sourceWritesUsed;
  const phaseWriteTargets = (report as unknown as { phaseWriteTargets?: unknown[] }).phaseWriteTargets;
  return sourceWritesUsed === true || (phaseWriteTargets?.length ?? 0) > 0;
}

function guardDiffMismatch(
  plan: GavanDay1BridgeDiffPlan,
  report: GavanDay1FutureBridgeGuardReport,
): string[] {
  const missingFromGuard = REQUIRED_CATALOG_UNIT_IDS.filter((id) =>
    !report.requiredCatalogUnitIds.includes(id),
  );
  const quizMissingFromGuard = report.requiredQuizId === REQUIRED_QUIZ_ID ? [] : [REQUIRED_QUIZ_ID];
  const missingFromPlan = [...missingCatalogIds(plan), ...missingQuizTargets(plan)];

  return Array.from(new Set([...missingFromGuard, ...quizMissingFromGuard, ...missingFromPlan]));
}

export function buildGavanDay1LiveBridgePreflightReport(
  plan: GavanDay1BridgeDiffPlan,
  guardReport: GavanDay1FutureBridgeGuardReport,
  options: GavanDay1LiveBridgePreflightOptions,
): GavanDay1LiveBridgePreflightBuildResult {
  const issues: GavanDay1LiveBridgePreflightIssue[] = [];
  const foundIds = foundCertifiedIds(options.catalogSource, options.quizSource);

  if (foundIds.length > 0) {
    issues.push(issue(
      'certified_ids_already_in_live_source',
      'Current live source already contains one or more certified Gavan day 1 ids.',
      { found: foundIds },
    ));
  }

  const diffMissing = guardDiffMismatch(plan, guardReport);
  if (diffMissing.length > 0) {
    issues.push(issue(
      'future_diff_changed',
      'The future bridge diff no longer matches the certified Gavan day 1 guard report.',
      { missing: diffMissing },
    ));
  }

  if (guardPolicyBroken(guardReport)) {
    issues.push(issue(
      'dry_guard_policy_broken',
      'The guard report must not claim source writes or phase write targets in dry preflight mode.',
    ));
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  const approvalMetadataPresent = Boolean(guardReport.explicitApproval);
  const applyBlockedReasons: GavanDay1LiveBridgePreflightBlockedReason[] = [
    ...(approvalMetadataPresent ? [] : ['approval_metadata_missing' as const]),
    'live_source_edit_not_requested',
  ];

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_day1_live_bridge_preflight_report',
      generatedAt: options.generatedAt,
      dayId: plan.dayId,
      status: 'waiting_for_explicit_approval',
      liveBridgeCanApplyNow: false,
      approvalMetadataPresent,
      applyBlockedReasons,
      liveFilesContainCertifiedIds: false,
      futureDiffStable: true,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      readOnlyFilesChecked: [
        'app/personal_plan_catalog.ts',
        'app/personal_plan_quizzes.ts',
      ],
      certifiedIdsChecked: [...REQUIRED_CATALOG_UNIT_IDS, REQUIRED_QUIZ_ID],
      requiredQuizId: REQUIRED_QUIZ_ID,
    },
  };
}

export function serializeGavanDay1LiveBridgePreflightReport(
  report: GavanDay1LiveBridgePreflightReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function writeGavanDay1LiveBridgePreflightReport(
  plan: GavanDay1BridgeDiffPlan,
  guardReport: GavanDay1FutureBridgeGuardReport,
  options: GavanDay1LiveBridgePreflightWriteOptions,
): GavanDay1LiveBridgePreflightWriteResult {
  const buildResult = buildGavanDay1LiveBridgePreflightReport(plan, guardReport, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.report) {
    return {
      valid: false,
      issues: buildResult.issues,
    };
  }

  if (!isGavanDay1LiveBridgePreflightReportTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Live bridge preflight report can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanDay1LiveBridgePreflightReport(buildResult.report);
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
