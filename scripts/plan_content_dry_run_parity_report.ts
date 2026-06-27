import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  validateBundledPlanContentDryRunParityReport,
  type PlanContentDryRunParityVerdict,
} from '../app/plan_content_pack_dry_run';
import {
  validatePlanContentParityReport,
  type PlanContentParityReport,
} from '../app/plan_content_pack_parity';

type CliOptions = {
  outputPath?: string;
  manifestId?: string;
  sourceSnapshotId?: string;
  generatedAt?: string;
  verdict?: PlanContentDryRunParityVerdict;
};

type CommandResult = {
  outputPath: string;
  report: PlanContentParityReport;
  blockingErrors: string[];
};

const DEFAULT_REPORT_DIR = path.join('.codex-tmp', 'plan-content');
const DEFAULT_REPORT_FILE = 'plan-content-parity-dry-run-report.json';
const DEFAULT_MANIFEST_ID = 'local.plan_content.dry_run.1';
const DEFAULT_SOURCE_SNAPSHOT_ID = 'local:bundled';

export function resolvePlanContentDryRunReportOutputPath(
  repoRoot: string,
  outputPath?: string,
): string {
  const reportRoot = path.resolve(repoRoot, DEFAULT_REPORT_DIR);
  const requested = outputPath
    ? path.resolve(repoRoot, outputPath)
    : path.join(reportRoot, DEFAULT_REPORT_FILE);

  if (requested !== reportRoot && !requested.startsWith(`${reportRoot}${path.sep}`)) {
    throw new Error(`Dry-run report output must stay under ${path.relative(repoRoot, reportRoot)}`);
  }

  return requested;
}

export function buildDryRunManifestHash(options: {
  manifestId: string;
  sourceSnapshotId: string;
}): string {
  return createHash('sha256')
    .update(JSON.stringify({
      kind: 'plan_content_local_dry_run_manifest',
      manifestId: options.manifestId,
      sourceSnapshotId: options.sourceSnapshotId,
    }))
    .digest('hex');
}

export async function writePlanContentDryRunParityReport(
  repoRoot: string,
  options: CliOptions = {},
): Promise<CommandResult> {
  const manifestId = options.manifestId ?? DEFAULT_MANIFEST_ID;
  const sourceSnapshotId = options.sourceSnapshotId ?? DEFAULT_SOURCE_SNAPSHOT_ID;
  const outputPath = resolvePlanContentDryRunReportOutputPath(repoRoot, options.outputPath);
  const { report, validation } = validateBundledPlanContentDryRunParityReport({
    manifestId,
    sourceSnapshotId,
    manifestHash: buildDryRunManifestHash({ manifestId, sourceSnapshotId }),
    generatedAt: options.generatedAt,
    verdict: options.verdict,
  });

  if (!validation.ok) {
    throw new Error(`Dry-run report failed schema validation before write: ${validation.errors.join('; ')}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const persisted = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as unknown;
  const persistedValidation = validatePlanContentParityReport(persisted);
  if (!persistedValidation.ok) {
    throw new Error(`Dry-run report failed validation after write: ${persistedValidation.errors.join('; ')}`);
  }

  const blockingErrors = collectBlockingDryRunErrors(persisted as PlanContentParityReport);
  if (blockingErrors.length > 0) {
    throw new Error(`Dry-run report has blocking mismatches: ${blockingErrors.join('; ')}`);
  }

  return {
    outputPath,
    report: persisted as PlanContentParityReport,
    blockingErrors,
  };
}

function collectBlockingDryRunErrors(report: PlanContentParityReport): string[] {
  const errors: string[] = [];
  if (report.verdict === 'activation_candidate') {
    errors.push('dry-run command must never emit activation_candidate');
  }
  addMismatchError(errors, 'added shadow-only rows', report.addedShadowOnlyRows.length);
  addMismatchError(errors, 'missing rows', report.missingRows.length);
  addMismatchError(errors, 'hash mismatches', report.hashMismatches.length);
  addMismatchError(errors, 'adapter output mismatches', report.adapterOutputMismatches.length);
  addMismatchError(errors, 'fallback decision mismatches', report.fallbackDecisionMismatches.length);
  return errors;
}

function addMismatchError(errors: string[], label: string, count: number): void {
  if (count > 0) {
    errors.push(`${label}: ${count}`);
  }
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--manifest-id') {
      options.manifestId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--source-snapshot-id') {
      options.sourceSnapshotId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--shadow-passed') {
      options.verdict = 'shadow_parity_passed';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const options = parseCli(process.argv.slice(2));
  const result = await writePlanContentDryRunParityReport(repoRoot, options);

  console.log('Plan content dry-run parity report: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Compared days: ${result.report.comparedPlanDayCount}`);
  console.log(`Verdict: ${result.report.verdict}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
