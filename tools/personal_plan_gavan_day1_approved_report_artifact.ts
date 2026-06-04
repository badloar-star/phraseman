import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import {
  validateGavanDay1ApprovedExportReport,
  type GavanDay1ApprovedExportReport,
  type GavanDay1ApprovedExportReportIssue,
} from '../app/personal_plan_gavan_day1_approved_export_report';

export type GavanDay1ApprovedReportArtifact = {
  artifactKind: 'gavan_day1_approved_report_artifact';
  generatedAt: string;
  report: GavanDay1ApprovedExportReport;
};

export type GavanDay1ApprovedReportArtifactOptions = {
  generatedAt: string;
};

export type GavanDay1ApprovedReportArtifactWriteOptions =
  GavanDay1ApprovedReportArtifactOptions & {
    targetPath: string;
  };

export type GavanDay1ApprovedReportArtifactIssueCode =
  | 'target_path_not_allowed'
  | 'invalid_report';

export type GavanDay1ApprovedReportArtifactIssue = {
  code: GavanDay1ApprovedReportArtifactIssueCode;
  detail: string;
  reportIssues?: GavanDay1ApprovedExportReportIssue[];
};

export type GavanDay1ApprovedReportArtifactWriteResult = {
  valid: boolean;
  issues: GavanDay1ApprovedReportArtifactIssue[];
  targetPath?: string;
  bytesWritten?: number;
};

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

function issue(
  code: GavanDay1ApprovedReportArtifactIssueCode,
  detail: string,
  reportIssues?: GavanDay1ApprovedExportReportIssue[],
): GavanDay1ApprovedReportArtifactIssue {
  return { code, detail, reportIssues };
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

export function isGavanDay1ApprovedReportArtifactTargetAllowed(
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

export function buildGavanDay1ApprovedReportArtifact(
  report: GavanDay1ApprovedExportReport,
  options: GavanDay1ApprovedReportArtifactOptions,
): GavanDay1ApprovedReportArtifact {
  return {
    artifactKind: 'gavan_day1_approved_report_artifact',
    generatedAt: options.generatedAt,
    report,
  };
}

export function serializeGavanDay1ApprovedReportArtifact(
  report: GavanDay1ApprovedExportReport,
  options: GavanDay1ApprovedReportArtifactOptions,
): string {
  return `${JSON.stringify(
    buildGavanDay1ApprovedReportArtifact(report, options),
    null,
    2,
  )}\n`;
}

export function writeGavanDay1ApprovedReportArtifact(
  report: GavanDay1ApprovedExportReport,
  options: GavanDay1ApprovedReportArtifactWriteOptions,
): GavanDay1ApprovedReportArtifactWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);
  const reportValidation = validateGavanDay1ApprovedExportReport(report);

  if (!reportValidation.valid) {
    return {
      valid: false,
      issues: [
        issue(
          'invalid_report',
          'Approved report artifact writer requires a valid approved export report.',
          reportValidation.issues,
        ),
      ],
    };
  }

  if (!isGavanDay1ApprovedReportArtifactTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Approved report artifact writer can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const serialized = serializeGavanDay1ApprovedReportArtifact(report, options);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
