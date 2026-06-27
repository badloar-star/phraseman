import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  COURSE_PACK_SCHEMA_VERSION,
  validateCoursePackManifest,
  type CoursePackManifest,
} from '../app/course_pack_manifest';
import { validatePlanContentPackIndex, type PlanContentPackIndex } from '../app/plan_content_pack_index';
import { validatePlanContentParityReport, type PlanContentParityReport } from '../app/plan_content_pack_parity';

type CliOptions = {
  packDir?: string;
  parityReportPath?: string;
  outputDir?: string;
  minAppVersion?: string;
  createdAt?: string;
};

type LocalActivationGuard = {
  schemaVersion: 'plan-content-local-activation-guard-v1';
  packId: string;
  manifestPath: string;
  packDir: string;
  entryIndex: string;
  parityReportPath: string;
  activationApproved: false;
  remoteLoadingEnabled: false;
  runtimeConnected: false;
  serverStaged: false;
  parityVerdict: 'shadow_parity_passed';
  requiredBeforeActivation: string[];
  generatedAt: string;
};

type WrapperResult = {
  manifestPath: string;
  guardPath: string;
  manifest: CoursePackManifest;
  guard: LocalActivationGuard;
};

const DEFAULT_PACK_DIR = path.join('.codex-tmp', 'plan-content', 'shadow-pack', 'local.shadow.1');
const DEFAULT_PARITY_REPORT_PATH = path.join('.codex-tmp', 'plan-content', 'shadow-pack-parity-report.json');
const DEFAULT_MIN_APP_VERSION = '1.5.43';
const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');

export function resolvePlanContentManifestTempPath(
  repoRoot: string,
  requestedPath: string | undefined,
  fallbackPath: string,
  label: string,
): string {
  const reportRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);
  const requested = requestedPath
    ? path.resolve(repoRoot, requestedPath)
    : path.resolve(repoRoot, fallbackPath);

  if (requested !== reportRoot && !requested.startsWith(`${reportRoot}${path.sep}`)) {
    throw new Error(`${label} must stay under ${path.relative(repoRoot, reportRoot)}`);
  }

  return requested;
}

export function wrapPlanContentCoursePackManifest(
  repoRoot: string,
  options: CliOptions = {},
): WrapperResult {
  const packDir = resolvePlanContentManifestTempPath(repoRoot, options.packDir, DEFAULT_PACK_DIR, 'Shadow pack input');
  const parityReportPath = resolvePlanContentManifestTempPath(repoRoot, options.parityReportPath, DEFAULT_PARITY_REPORT_PATH, 'Parity report input');
  const outputDir = resolvePlanContentManifestTempPath(repoRoot, options.outputDir, packDir, 'Manifest output');
  const indexPath = path.join(packDir, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as PlanContentPackIndex;
  const parityReport = JSON.parse(fs.readFileSync(parityReportPath, 'utf8')) as PlanContentParityReport;

  assertIndex(index);
  assertParityReport(parityReport);

  const packDigest = hashPackFiles(packDir, index);
  const manifest: CoursePackManifest = {
    packId: `en.${index.sourceLocale}.plan_content.${index.contentVersion}`,
    studyTarget: index.studyTarget,
    sourceLocale: index.sourceLocale,
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: index.contentVersion,
    minAppVersion: options.minAppVersion ?? DEFAULT_MIN_APP_VERSION,
    sha256: packDigest.sha256,
    byteSize: packDigest.byteSize,
    createdAt: options.createdAt ?? new Date().toISOString(),
    dependencies: [],
    entryIndex: 'index.json',
  };
  assertManifest(manifest);

  const manifestPath = path.join(outputDir, 'manifest.json');
  const guardPath = path.join(outputDir, 'activation-guard.json');
  const guard: LocalActivationGuard = {
    schemaVersion: 'plan-content-local-activation-guard-v1',
    packId: manifest.packId,
    manifestPath: path.relative(outputDir, manifestPath).replace(/\\/g, '/'),
    packDir: path.relative(outputDir, packDir).replace(/\\/g, '/') || '.',
    entryIndex: manifest.entryIndex,
    parityReportPath: path.relative(outputDir, parityReportPath).replace(/\\/g, '/'),
    activationApproved: false,
    remoteLoadingEnabled: false,
    runtimeConnected: false,
    serverStaged: false,
    parityVerdict: 'shadow_parity_passed',
    requiredBeforeActivation: [
      'explicit_product_owner_activation_approval',
      'runtime_loader_cache_offline_rollback_gates',
      'storage_cloud_target_scope_gates',
      'server_staging_review',
    ],
    generatedAt: manifest.createdAt,
  };
  assertGuard(guard, manifest);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(guardPath, `${JSON.stringify(guard, null, 2)}\n`, 'utf8');
  assertManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CoursePackManifest);
  assertGuard(JSON.parse(fs.readFileSync(guardPath, 'utf8')) as LocalActivationGuard, manifest);

  return {
    manifestPath,
    guardPath,
    manifest,
    guard,
  };
}

function assertIndex(index: PlanContentPackIndex): void {
  const validation = validatePlanContentPackIndex(index);
  if (!validation.ok) {
    throw new Error(`Plan content index failed validation: ${validation.errors.join('; ')}`);
  }
}

function assertParityReport(report: PlanContentParityReport): void {
  const validation = validatePlanContentParityReport(report);
  if (!validation.ok) {
    throw new Error(`Parity report failed validation: ${validation.errors.join('; ')}`);
  }
  if (report.verdict !== 'shadow_parity_passed') {
    throw new Error(`Parity report must be shadow_parity_passed, got ${report.verdict}`);
  }
  if (
    report.addedShadowOnlyRows.length > 0 ||
    report.missingRows.length > 0 ||
    report.hashMismatches.length > 0 ||
    report.adapterOutputMismatches.length > 0 ||
    report.fallbackDecisionMismatches.length > 0
  ) {
    throw new Error('Parity report must have no blocking mismatches');
  }
}

function assertManifest(manifest: CoursePackManifest): void {
  const validation = validateCoursePackManifest(manifest);
  if (!validation.ok) {
    throw new Error(`CoursePackManifest failed validation: ${validation.errors.join('; ')}`);
  }
}

function assertGuard(guard: LocalActivationGuard, manifest: CoursePackManifest): void {
  const errors: string[] = [];
  if (guard.schemaVersion !== 'plan-content-local-activation-guard-v1') {
    errors.push('guard schemaVersion mismatch');
  }
  if (guard.packId !== manifest.packId) {
    errors.push('guard packId must match manifest packId');
  }
  if (guard.activationApproved !== false) {
    errors.push('activationApproved must be false');
  }
  if (guard.remoteLoadingEnabled !== false) {
    errors.push('remoteLoadingEnabled must be false');
  }
  if (guard.runtimeConnected !== false) {
    errors.push('runtimeConnected must be false');
  }
  if (guard.serverStaged !== false) {
    errors.push('serverStaged must be false');
  }
  if (guard.parityVerdict !== 'shadow_parity_passed') {
    errors.push('parityVerdict must be shadow_parity_passed');
  }
  if (!Array.isArray(guard.requiredBeforeActivation) || guard.requiredBeforeActivation.length < 3) {
    errors.push('requiredBeforeActivation must list remaining activation gates');
  }
  if (Number.isNaN(Date.parse(guard.generatedAt))) {
    errors.push('generatedAt must be ISO-compatible');
  }
  if (errors.length > 0) {
    throw new Error(`Activation guard failed validation: ${errors.join('; ')}`);
  }
}

function hashPackFiles(packDir: string, index: PlanContentPackIndex): { sha256: string; byteSize: number } {
  const files = ['index.json', ...index.entries.map((entry) => entry.path)].sort();
  const hash = createHash('sha256');
  let byteSize = 0;

  for (const relativePath of files) {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const content = fs.readFileSync(path.join(packDir, normalizedPath));
    byteSize += content.byteLength;
    hash.update(normalizedPath);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }

  return {
    sha256: hash.digest('hex'),
    byteSize,
  };
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pack-dir') {
      options.packDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--parity-report') {
      options.parityReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--min-app-version') {
      options.minAppVersion = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--created-at') {
      options.createdAt = readValue(argv, index, arg);
      index += 1;
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

function main(): void {
  const repoRoot = process.cwd();
  const result = wrapPlanContentCoursePackManifest(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content course-pack manifest wrap: PASS');
  console.log(`Manifest: ${path.relative(repoRoot, result.manifestPath)}`);
  console.log(`Activation guard: ${path.relative(repoRoot, result.guardPath)}`);
  console.log(`Pack id: ${result.manifest.packId}`);
  console.log(`Activation approved: ${result.guard.activationApproved}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
