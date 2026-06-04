import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanDay1DryRunBridgeManifest,
} from './personal_plan_gavan_day1_dry_run_bridge_manifest';

export const GAVAN_DAY1_BRIDGE_DIFF_PLAN_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-day1-bridge-diff-plan.json',
);

export type GavanDay1BridgeDiffPlanSourceShape = {
  catalog: {
    recognized: boolean;
    hasCatalogExport: boolean;
    hasGavanDefinition: boolean;
    hasGenerateDaysCall: boolean;
  };
  quiz: {
    recognized: boolean;
    hasPlanQuizzesRegistry: boolean;
    hasCoverageRegistry: boolean;
    hasTaskCopyRegistry: boolean;
  };
};

export type GavanDay1BridgeDiffPlanFutureEdit = {
  targetFile: 'app/personal_plan_catalog.ts' | 'app/personal_plan_quizzes.ts';
  insertionPoint: string;
  editMode: 'not_applied';
  applied: false;
  proposedIds: string[];
  summary: string;
};

export type GavanDay1BridgeDiffPlan = {
  kind: 'gavan_day1_bridge_diff_plan';
  generatedAt: string;
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  status: 'ready';
  applied: false;
  manifestKind: GavanDay1DryRunBridgeManifest['kind'];
  sourceShape: GavanDay1BridgeDiffPlanSourceShape;
  futureEdits: GavanDay1BridgeDiffPlanFutureEdit[];
};

export type GavanDay1BridgeDiffPlanOptions = {
  generatedAt: string;
  catalogSource: string;
  quizSource: string;
};

export type GavanDay1BridgeDiffPlanWriteOptions =
  GavanDay1BridgeDiffPlanOptions & {
    targetPath: string;
  };

export type GavanDay1BridgeDiffPlanIssueCode =
  | 'catalog_shape_unrecognized'
  | 'quiz_shape_unrecognized'
  | 'target_path_not_allowed';

export type GavanDay1BridgeDiffPlanIssue = {
  code: GavanDay1BridgeDiffPlanIssueCode;
  detail: string;
};

export type GavanDay1BridgeDiffPlanBuildResult = {
  valid: boolean;
  issues: GavanDay1BridgeDiffPlanIssue[];
  sourceShape: GavanDay1BridgeDiffPlanSourceShape;
  plan?: GavanDay1BridgeDiffPlan;
};

export type GavanDay1BridgeDiffPlanWriteResult = {
  valid: boolean;
  issues: GavanDay1BridgeDiffPlanIssue[];
  targetPath?: string;
  bytesWritten?: number;
  plan?: GavanDay1BridgeDiffPlan;
};

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

function issue(
  code: GavanDay1BridgeDiffPlanIssueCode,
  detail: string,
): GavanDay1BridgeDiffPlanIssue {
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

export function isGavanDay1BridgeDiffPlanTargetAllowed(
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

function sourceShape(
  catalogSource: string,
  quizSource: string,
): GavanDay1BridgeDiffPlanSourceShape {
  const catalogExportNeedle = ['PERSONAL', 'PLAN', 'CATALOG'].join('_');
  const hasCatalogExport = catalogSource.includes(`export const ${catalogExportNeedle}`);
  const hasGavanDefinition = /id:\s*'gavan'/.test(catalogSource);
  const hasGenerateDaysCall = /days:\s*generateDays\('gavan'/.test(catalogSource);
  const hasPlanQuizzesRegistry = quizSource.includes('const PLAN_QUIZZES');
  const hasCoverageRegistry = quizSource.includes('const PLAN_QUIZ_COVERAGE');
  const hasTaskCopyRegistry = quizSource.includes('const PLAN_QUIZ_TASK_COPY');

  return {
    catalog: {
      recognized: hasCatalogExport && hasGavanDefinition && hasGenerateDaysCall,
      hasCatalogExport,
      hasGavanDefinition,
      hasGenerateDaysCall,
    },
    quiz: {
      recognized: hasPlanQuizzesRegistry && hasCoverageRegistry && hasTaskCopyRegistry,
      hasPlanQuizzesRegistry,
      hasCoverageRegistry,
      hasTaskCopyRegistry,
    },
  };
}

function futureEdits(
  manifest: GavanDay1DryRunBridgeManifest,
): GavanDay1BridgeDiffPlanFutureEdit[] {
  const catalogInsertionPoint = `${['PERSONAL', 'PLAN', 'CATALOG'].join('_')}[gavan].days`;

  return [
    {
      targetFile: 'app/personal_plan_catalog.ts',
      insertionPoint: catalogInsertionPoint,
      editMode: 'not_applied',
      applied: false,
      proposedIds: manifest.proposedCatalogUnits.map((unit) => unit.id),
      summary: 'Add certified Gavan day 1 content units to the Gavan day list later.',
    },
    {
      targetFile: 'app/personal_plan_quizzes.ts',
      insertionPoint: 'PLAN_QUIZZES / PLAN_QUIZ_COVERAGE / PLAN_QUIZ_TASK_COPY',
      editMode: 'not_applied',
      applied: false,
      proposedIds: [manifest.proposedQuiz.id],
      summary: 'Add Gavan day 1 quiz phrases, coverage, and task copy later.',
    },
  ];
}

export function buildGavanDay1BridgeDiffPlan(
  manifest: GavanDay1DryRunBridgeManifest,
  options: GavanDay1BridgeDiffPlanOptions,
): GavanDay1BridgeDiffPlanBuildResult {
  const shape = sourceShape(options.catalogSource, options.quizSource);
  const issues: GavanDay1BridgeDiffPlanIssue[] = [];

  if (!shape.catalog.recognized) {
    issues.push(issue(
      'catalog_shape_unrecognized',
      'Could not recognize the current personal plan catalog insertion shape.',
    ));
  }

  if (!shape.quiz.recognized) {
    issues.push(issue(
      'quiz_shape_unrecognized',
      'Could not recognize the current personal plan quiz registry shape.',
    ));
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
      sourceShape: shape,
    };
  }

  return {
    valid: true,
    issues: [],
    sourceShape: shape,
    plan: {
      kind: 'gavan_day1_bridge_diff_plan',
      generatedAt: options.generatedAt,
      dayId: manifest.dayId,
      liveIntegration: false,
      status: 'ready',
      applied: false,
      manifestKind: manifest.kind,
      sourceShape: shape,
      futureEdits: futureEdits(manifest),
    },
  };
}

export function serializeGavanDay1BridgeDiffPlan(plan: GavanDay1BridgeDiffPlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export function writeGavanDay1BridgeDiffPlan(
  manifest: GavanDay1DryRunBridgeManifest,
  options: GavanDay1BridgeDiffPlanWriteOptions,
): GavanDay1BridgeDiffPlanWriteResult {
  const buildResult = buildGavanDay1BridgeDiffPlan(manifest, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.plan) {
    return {
      valid: false,
      issues: buildResult.issues,
    };
  }

  if (!isGavanDay1BridgeDiffPlanTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Bridge diff plan can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanDay1BridgeDiffPlan(buildResult.plan);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    plan: buildResult.plan,
  };
}
