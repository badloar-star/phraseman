import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanDay1ApprovedExportReportRow,
} from '../app/personal_plan_gavan_day1_approved_export_report';
import type {
  GavanDay1ApprovedReportArtifact,
} from './personal_plan_gavan_day1_approved_report_artifact';
import {
  buildGavanDay1ProductionBridgeReadiness,
  type GavanDay1ProductionBridgeReadinessResult,
  type GavanDay1ProductionBridgeReadinessStageId,
} from './personal_plan_gavan_day1_production_bridge_readiness';

export const GAVAN_DAY1_DRY_RUN_BRIDGE_MANIFEST_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-day1-dry-run-bridge-manifest.json',
);

export type GavanDay1DryRunBridgeManifestProposedFile = {
  path: 'app/personal_plan_catalog.ts' | 'app/personal_plan_quizzes.ts';
  purpose: 'future_add_personal_plan_content_units' | 'future_add_personal_plan_quiz';
  editMode: 'not_applied';
};

export type GavanDay1DryRunBridgeManifestCatalogUnit = {
  id: string;
  sourceSnippetId: string;
  exactText: string;
  coveredTargets: string[];
  reviewStatus: 'approved';
  textChecksum: string;
};

export type GavanDay1DryRunBridgeManifestQuiz = {
  id: string;
  itemIds: string[];
  promptSnippetIds: string[];
  noteSnippetIds: string[];
};

export type GavanDay1DryRunBridgeManifest = {
  kind: 'gavan_day1_dry_run_bridge_manifest';
  manifestVersion: 1;
  generatedAt: string;
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  readiness: GavanDay1ProductionBridgeReadinessResult;
  proposedFiles: GavanDay1DryRunBridgeManifestProposedFile[];
  proposedCatalogUnits: GavanDay1DryRunBridgeManifestCatalogUnit[];
  proposedQuiz: GavanDay1DryRunBridgeManifestQuiz;
  writePolicy: {
    dryRunOnly: true;
    liveFilesEdited: false;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
  };
};

export type GavanDay1DryRunBridgeManifestOptions = {
  generatedAt: string;
};

export type GavanDay1DryRunBridgeManifestWriteOptions =
  GavanDay1DryRunBridgeManifestOptions & {
    targetPath: string;
  };

export type GavanDay1DryRunBridgeManifestIssueCode =
  | 'readiness_blocked'
  | 'target_path_not_allowed';

export type GavanDay1DryRunBridgeManifestIssue = {
  code: GavanDay1DryRunBridgeManifestIssueCode;
  detail: string;
  blocker?: GavanDay1ProductionBridgeReadinessStageId;
};

export type GavanDay1DryRunBridgeManifestBuildResult = {
  valid: boolean;
  issues: GavanDay1DryRunBridgeManifestIssue[];
  readiness: GavanDay1ProductionBridgeReadinessResult;
  manifest?: GavanDay1DryRunBridgeManifest;
};

export type GavanDay1DryRunBridgeManifestWriteResult = {
  valid: boolean;
  issues: GavanDay1DryRunBridgeManifestIssue[];
  targetPath?: string;
  bytesWritten?: number;
  manifest?: GavanDay1DryRunBridgeManifest;
};

const PROPOSED_FILES: GavanDay1DryRunBridgeManifestProposedFile[] = [
  {
    path: 'app/personal_plan_catalog.ts',
    purpose: 'future_add_personal_plan_content_units',
    editMode: 'not_applied',
  },
  {
    path: 'app/personal_plan_quizzes.ts',
    purpose: 'future_add_personal_plan_quiz',
    editMode: 'not_applied',
  },
];

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

function issue(
  code: GavanDay1DryRunBridgeManifestIssueCode,
  detail: string,
  blocker?: GavanDay1ProductionBridgeReadinessStageId,
): GavanDay1DryRunBridgeManifestIssue {
  return { code, detail, blocker };
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

export function isGavanDay1DryRunBridgeManifestTargetAllowed(
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

function contentUnitIdFromPhraseSnippetId(snippetId: string): string {
  const match = /^phrase:(.+):explanation-\d+$/.exec(snippetId);
  return match?.[1] ?? snippetId;
}

function quizPartsFromPromptSnippetId(snippetId: string): { quizId: string; itemId: string } {
  const match = /^quiz:([^:]+):(item-\d+):prompt$/.exec(snippetId);
  return {
    quizId: match?.[1] ?? 'gavan-week1-day1-quiz',
    itemId: match?.[2] ?? snippetId,
  };
}

function catalogUnit(
  row: GavanDay1ApprovedExportReportRow,
): GavanDay1DryRunBridgeManifestCatalogUnit {
  return {
    id: contentUnitIdFromPhraseSnippetId(row.snippetId),
    sourceSnippetId: row.snippetId,
    exactText: row.exactText,
    coveredTargets: [...(row.coveredTargets ?? [])],
    reviewStatus: row.reviewStatus,
    textChecksum: row.textChecksum,
  };
}

function proposedQuiz(
  promptRows: GavanDay1ApprovedExportReportRow[],
  noteRows: GavanDay1ApprovedExportReportRow[],
): GavanDay1DryRunBridgeManifestQuiz {
  const promptParts = promptRows.map((row) => quizPartsFromPromptSnippetId(row.snippetId));

  return {
    id: promptParts[0]?.quizId ?? 'gavan-week1-day1-quiz',
    itemIds: promptParts.map((part) => part.itemId),
    promptSnippetIds: promptRows.map((row) => row.snippetId),
    noteSnippetIds: noteRows.map((row) => row.snippetId),
  };
}

export function buildGavanDay1DryRunBridgeManifest(
  artifact: GavanDay1ApprovedReportArtifact,
  options: GavanDay1DryRunBridgeManifestOptions,
): GavanDay1DryRunBridgeManifestBuildResult {
  const readiness = buildGavanDay1ProductionBridgeReadiness(artifact);

  if (!readiness.canDraftProductionBridge) {
    return {
      valid: false,
      issues: readiness.blockers.map((blocker) => issue(
        'readiness_blocked',
        'Dry-run bridge manifest requires all readiness stages to pass.',
        blocker,
      )),
      readiness,
    };
  }

  const manifest: GavanDay1DryRunBridgeManifest = {
    kind: 'gavan_day1_dry_run_bridge_manifest',
    manifestVersion: 1,
    generatedAt: options.generatedAt,
    dayId: artifact.report.dayId,
    liveIntegration: false,
    readiness,
    proposedFiles: [...PROPOSED_FILES],
    proposedCatalogUnits: artifact.report.groups.phraseExplanations.map(catalogUnit),
    proposedQuiz: proposedQuiz(
      artifact.report.groups.quizPrompts,
      artifact.report.groups.quizNotes,
    ),
    writePolicy: {
      dryRunOnly: true,
      liveFilesEdited: false,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
    },
  };

  return {
    valid: true,
    issues: [],
    readiness,
    manifest,
  };
}

export function serializeGavanDay1DryRunBridgeManifest(
  manifest: GavanDay1DryRunBridgeManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function writeGavanDay1DryRunBridgeManifest(
  artifact: GavanDay1ApprovedReportArtifact,
  options: GavanDay1DryRunBridgeManifestWriteOptions,
): GavanDay1DryRunBridgeManifestWriteResult {
  const buildResult = buildGavanDay1DryRunBridgeManifest(artifact, options);
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!buildResult.valid || !buildResult.manifest) {
    return {
      valid: false,
      issues: buildResult.issues,
    };
  }

  if (!isGavanDay1DryRunBridgeManifestTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Dry-run bridge manifest can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanDay1DryRunBridgeManifest(buildResult.manifest);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    manifest: buildResult.manifest,
  };
}
