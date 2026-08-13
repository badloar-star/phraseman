import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { validateCoursePackManifest, type CoursePackManifest } from '../app/course_pack_manifest';
import { validatePlanContentPackIndex, type PlanContentPackIndex } from '../app/plan_content_pack_index';
import { validatePlanContentParityReport, type PlanContentParityReport } from '../app/plan_content_pack_parity';
import { validatePlanContentDay, type PlanContentDay } from '../app/plan_content_schema';

type CliOptions = {
  packDir?: string;
  manifestPath?: string;
  guardPath?: string;
  parityReportPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type LocalActivationGuard = {
  schemaVersion?: string;
  packId?: string;
  manifestPath?: string;
  packDir?: string;
  entryIndex?: string;
  parityReportPath?: string;
  activationApproved?: boolean;
  remoteLoadingEnabled?: boolean;
  runtimeConnected?: boolean;
  serverStaged?: boolean;
  parityVerdict?: string;
  requiredBeforeActivation?: string[];
  generatedAt?: string;
};

type ShadowDayArtifact = {
  contentHash?: string;
  content?: PlanContentDay;
};

type ReadinessReport = {
  schemaVersion: 'plan-content-local-release-readiness-v1';
  status: 'PASS' | 'HOLD';
  generatedAt: string;
  packId: string;
  activationApproved: false;
  runtimeConnected: false;
  serverStaged: false;
  manifestPath: string;
  guardPath: string;
  parityReportPath: string;
  entryIndex: string;
  rowCount: number;
  parityVerdict: string;
  manifestSha256: string;
  manifestByteSize: number;
  blockers: string[];
  checks: {
    manifestValid: boolean;
    guardNonActivating: boolean;
    indexValid: boolean;
    rowsValid: boolean;
    parityPassed: boolean;
    manifestMatchesPack: boolean;
  };
};

type VerifyResult = {
  outputPath: string;
  report: ReadinessReport;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_PACK_DIR = path.join(PLAN_CONTENT_TEMP_ROOT, 'shadow-pack', 'local.shadow.1');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_PACK_DIR, 'manifest.json');
const DEFAULT_GUARD_PATH = path.join(DEFAULT_PACK_DIR, 'activation-guard.json');
const DEFAULT_PARITY_REPORT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'shadow-pack-parity-report.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'release-readiness-report.json');

export function resolvePlanContentReleaseTempPath(
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

export function verifyPlanContentLocalReleaseBundle(
  repoRoot: string,
  options: CliOptions = {},
): VerifyResult {
  const packDir = resolvePlanContentReleaseTempPath(repoRoot, options.packDir, DEFAULT_PACK_DIR, 'Pack input');
  const manifestPath = resolvePlanContentReleaseTempPath(repoRoot, options.manifestPath, DEFAULT_MANIFEST_PATH, 'Manifest input');
  const guardPath = resolvePlanContentReleaseTempPath(repoRoot, options.guardPath, DEFAULT_GUARD_PATH, 'Activation guard input');
  const parityReportPath = resolvePlanContentReleaseTempPath(repoRoot, options.parityReportPath, DEFAULT_PARITY_REPORT_PATH, 'Parity report input');
  const outputPath = resolvePlanContentReleaseTempPath(repoRoot, options.outputPath, DEFAULT_OUTPUT_PATH, 'Readiness report output');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CoursePackManifest;
  const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8')) as LocalActivationGuard;
  const parityReport = JSON.parse(fs.readFileSync(parityReportPath, 'utf8')) as PlanContentParityReport;
  const index = JSON.parse(fs.readFileSync(path.join(packDir, 'index.json'), 'utf8')) as PlanContentPackIndex;

  const blockers: string[] = [];
  const manifestValid = validateManifest(manifest, blockers);
  const guardNonActivating = validateGuard(guard, manifest, blockers);
  const indexValid = validateIndex(index, blockers);
  const rowsValid = validateRows(packDir, index, blockers);
  const parityPassed = validateParity(parityReport, index, blockers);
  const digest = hashPackFiles(packDir, index);
  const manifestMatchesPack = validateManifestMatchesPack(manifest, index, digest, blockers);

  const report: ReadinessReport = {
    schemaVersion: 'plan-content-local-release-readiness-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: manifest.packId ?? 'unknown',
    activationApproved: false,
    runtimeConnected: false,
    serverStaged: false,
    manifestPath: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
    guardPath: path.relative(repoRoot, guardPath).replace(/\\/g, '/'),
    parityReportPath: path.relative(repoRoot, parityReportPath).replace(/\\/g, '/'),
    entryIndex: manifest.entryIndex ?? 'index.json',
    rowCount: index.entries?.length ?? 0,
    parityVerdict: parityReport.verdict ?? 'unknown',
    manifestSha256: manifest.sha256 ?? '',
    manifestByteSize: manifest.byteSize ?? 0,
    blockers,
    checks: {
      manifestValid,
      guardNonActivating,
      indexValid,
      rowsValid,
      parityPassed,
      manifestMatchesPack,
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Release bundle verification failed: ${blockers.join('; ')}`);
  }

  return { outputPath, report };
}

function validateManifest(manifest: CoursePackManifest, blockers: string[]): boolean {
  const validation = validateCoursePackManifest(manifest);
  if (!validation.ok) {
    blockers.push(...validation.errors.map((error) => `manifest: ${error}`));
  }
  return validation.ok;
}

function validateGuard(guard: LocalActivationGuard, manifest: CoursePackManifest, blockers: string[]): boolean {
  const before = blockers.length;
  if (guard.schemaVersion !== 'plan-content-local-activation-guard-v1') {
    blockers.push('guard: schemaVersion mismatch');
  }
  if (guard.packId !== manifest.packId) {
    blockers.push('guard: packId must match manifest packId');
  }
  if (guard.activationApproved !== false) {
    blockers.push('guard: activationApproved must be false');
  }
  if (guard.remoteLoadingEnabled !== false) {
    blockers.push('guard: remoteLoadingEnabled must be false');
  }
  if (guard.runtimeConnected !== false) {
    blockers.push('guard: runtimeConnected must be false');
  }
  if (guard.serverStaged !== false) {
    blockers.push('guard: serverStaged must be false');
  }
  if (guard.parityVerdict !== 'shadow_parity_passed') {
    blockers.push('guard: parityVerdict must be shadow_parity_passed');
  }
  if (!Array.isArray(guard.requiredBeforeActivation) || guard.requiredBeforeActivation.length < 3) {
    blockers.push('guard: requiredBeforeActivation must list remaining gates');
  }
  return blockers.length === before;
}

function validateIndex(index: PlanContentPackIndex, blockers: string[]): boolean {
  const validation = validatePlanContentPackIndex(index);
  if (!validation.ok) {
    blockers.push(...validation.errors.map((error) => `index: ${error}`));
  }
  return validation.ok;
}

function validateRows(packDir: string, index: PlanContentPackIndex, blockers: string[]): boolean {
  const before = blockers.length;
  for (const entry of index.entries) {
    const rowPath = path.join(packDir, entry.path);
    if (!fs.existsSync(rowPath)) {
      blockers.push(`row ${entry.path}: missing`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(rowPath, 'utf8')) as ShadowDayArtifact;
    if (!artifact.content) {
      blockers.push(`row ${entry.path}: missing content`);
      continue;
    }
    const contentHash = hashJson(artifact.content);
    if (artifact.contentHash !== contentHash || entry.contentHash !== contentHash) {
      blockers.push(`row ${entry.path}: content hash mismatch`);
    }
    const contentIssues = validatePlanContentDay(artifact.content);
    if (contentIssues.length > 0) {
      blockers.push(`row ${entry.path}: ${contentIssues[0].code}: ${contentIssues[0].detail}`);
    }
  }
  return blockers.length === before;
}

function validateParity(
  report: PlanContentParityReport,
  index: PlanContentPackIndex,
  blockers: string[],
): boolean {
  const before = blockers.length;
  const validation = validatePlanContentParityReport(report);
  if (!validation.ok) {
    blockers.push(...validation.errors.map((error) => `parity: ${error}`));
  }
  if (report.verdict !== 'shadow_parity_passed') {
    blockers.push(`parity: verdict must be shadow_parity_passed, got ${report.verdict}`);
  }
  if (report.comparedPlanDayCount !== index.entries.length) {
    blockers.push('parity: comparedPlanDayCount must equal index entry count');
  }
  if (
    report.addedShadowOnlyRows.length > 0 ||
    report.missingRows.length > 0 ||
    report.hashMismatches.length > 0 ||
    report.adapterOutputMismatches.length > 0 ||
    report.fallbackDecisionMismatches.length > 0
  ) {
    blockers.push('parity: blocking mismatch lists must be empty');
  }
  return blockers.length === before;
}

function validateManifestMatchesPack(
  manifest: CoursePackManifest,
  index: PlanContentPackIndex,
  digest: { sha256: string; byteSize: number },
  blockers: string[],
): boolean {
  const before = blockers.length;
  if (manifest.studyTarget !== index.studyTarget) {
    blockers.push('manifest: studyTarget must match index');
  }
  if (manifest.sourceLocale !== index.sourceLocale) {
    blockers.push('manifest: sourceLocale must match index');
  }
  if (manifest.contentVersion !== index.contentVersion) {
    blockers.push('manifest: contentVersion must match index');
  }
  if (manifest.surface !== 'plan_content') {
    blockers.push('manifest: surface must be plan_content');
  }
  if (manifest.entryIndex !== 'index.json') {
    blockers.push('manifest: entryIndex must be index.json');
  }
  if (manifest.sha256 !== digest.sha256) {
    blockers.push('manifest: sha256 must match local pack digest');
  }
  if (manifest.byteSize !== digest.byteSize) {
    blockers.push('manifest: byteSize must match local pack bytes');
  }
  return blockers.length === before;
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

function hashJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJson(entryValue)]),
    );
  }
  return value;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pack-dir') {
      options.packDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--manifest') {
      options.manifestPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--guard') {
      options.guardPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--parity-report') {
      options.parityReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
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
  const result = verifyPlanContentLocalReleaseBundle(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content local release bundle verify: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Status: ${result.report.status}`);
  console.log(`Activation approved: ${result.report.activationApproved}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
