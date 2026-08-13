import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { validateCoursePackManifest, type CoursePackManifest } from '../app/course_pack_manifest';
import { validatePlanContentPackIndex, type PlanContentPackIndex } from '../app/plan_content_pack_index';

type CliOptions = {
  packDir?: string;
  manifestPath?: string;
  guardPath?: string;
  parityReportPath?: string;
  readinessReportPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type ActivationGuard = {
  packId?: string;
  activationApproved?: boolean;
  remoteLoadingEnabled?: boolean;
  runtimeConnected?: boolean;
  serverStaged?: boolean;
  parityVerdict?: string;
};

type ReadinessReport = {
  status?: string;
  packId?: string;
  activationApproved?: boolean;
  runtimeConnected?: boolean;
  serverStaged?: boolean;
  blockers?: unknown[];
};

type StagingObject = {
  role: 'manifest' | 'activation_guard' | 'entry_index' | 'parity_report' | 'readiness_report' | 'day_row';
  localPath: string;
  stagingPath: string;
  sha256: string;
  byteSize: number;
};

type StagingDescriptor = {
  schemaVersion: 'plan-content-server-staging-descriptor-v1';
  status: 'READY_FOR_STAGING_REVIEW' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  activationApproved: false;
  runtimeManifestRegistered: false;
  networkCalls: false;
  localOnly: true;
  objects: StagingObject[];
  blockers: string[];
};

type DescriptorResult = {
  outputPath: string;
  descriptor: StagingDescriptor;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_PACK_DIR = path.join(PLAN_CONTENT_TEMP_ROOT, 'shadow-pack', 'local.shadow.1');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_PACK_DIR, 'manifest.json');
const DEFAULT_GUARD_PATH = path.join(DEFAULT_PACK_DIR, 'activation-guard.json');
const DEFAULT_PARITY_REPORT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'shadow-pack-parity-report.json');
const DEFAULT_READINESS_REPORT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'release-readiness-report.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-descriptor.json');

export function resolvePlanContentStagingTempPath(
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

export function writePlanContentServerStagingDescriptor(
  repoRoot: string,
  options: CliOptions = {},
): DescriptorResult {
  const packDir = resolvePlanContentStagingTempPath(repoRoot, options.packDir, DEFAULT_PACK_DIR, 'Pack input');
  const manifestPath = resolvePlanContentStagingTempPath(repoRoot, options.manifestPath, DEFAULT_MANIFEST_PATH, 'Manifest input');
  const guardPath = resolvePlanContentStagingTempPath(repoRoot, options.guardPath, DEFAULT_GUARD_PATH, 'Activation guard input');
  const parityReportPath = resolvePlanContentStagingTempPath(repoRoot, options.parityReportPath, DEFAULT_PARITY_REPORT_PATH, 'Parity report input');
  const readinessReportPath = resolvePlanContentStagingTempPath(repoRoot, options.readinessReportPath, DEFAULT_READINESS_REPORT_PATH, 'Readiness report input');
  const outputPath = resolvePlanContentStagingTempPath(repoRoot, options.outputPath, DEFAULT_OUTPUT_PATH, 'Staging descriptor output');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as CoursePackManifest;
  const index = JSON.parse(fs.readFileSync(path.join(packDir, 'index.json'), 'utf8')) as PlanContentPackIndex;
  const guard = JSON.parse(fs.readFileSync(guardPath, 'utf8')) as ActivationGuard;
  const readiness = JSON.parse(fs.readFileSync(readinessReportPath, 'utf8')) as ReadinessReport;
  const blockers: string[] = [];

  validateInputs(manifest, index, guard, readiness, blockers);

  const objects: StagingObject[] = [
    objectFor(repoRoot, manifestPath, stagingPath(manifest, 'manifest.json'), 'manifest'),
    objectFor(repoRoot, guardPath, stagingPath(manifest, 'activation-guard.json'), 'activation_guard'),
    objectFor(repoRoot, path.join(packDir, 'index.json'), stagingPath(manifest, 'index.json'), 'entry_index'),
    objectFor(repoRoot, parityReportPath, stagingPath(manifest, 'parity-report.json'), 'parity_report'),
    objectFor(repoRoot, readinessReportPath, stagingPath(manifest, 'readiness-report.json'), 'readiness_report'),
    ...index.entries.map((entry) => objectFor(
      repoRoot,
      path.join(packDir, entry.path),
      stagingPath(manifest, entry.path),
      'day_row',
    )),
  ];

  validateObjects(objects, blockers);

  const descriptor: StagingDescriptor = {
    schemaVersion: 'plan-content-server-staging-descriptor-v1',
    status: blockers.length === 0 ? 'READY_FOR_STAGING_REVIEW' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: 'plan_content',
    contentVersion: manifest.contentVersion,
    activationApproved: false,
    runtimeManifestRegistered: false,
    networkCalls: false,
    localOnly: true,
    objects,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(descriptor, null, 2)}\n`, 'utf8');

  if (descriptor.status !== 'READY_FOR_STAGING_REVIEW') {
    throw new Error(`Server-staging descriptor failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    descriptor,
  };
}

function validateInputs(
  manifest: CoursePackManifest,
  index: PlanContentPackIndex,
  guard: ActivationGuard,
  readiness: ReadinessReport,
  blockers: string[],
): void {
  const manifestValidation = validateCoursePackManifest(manifest);
  if (!manifestValidation.ok) {
    blockers.push(...manifestValidation.errors.map((error) => `manifest: ${error}`));
  }
  const indexValidation = validatePlanContentPackIndex(index);
  if (!indexValidation.ok) {
    blockers.push(...indexValidation.errors.map((error) => `index: ${error}`));
  }
  if (manifest.packId !== guard.packId || manifest.packId !== readiness.packId) {
    blockers.push('packId must match manifest, guard and readiness report');
  }
  if (guard.activationApproved !== false || readiness.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (guard.remoteLoadingEnabled !== false) {
    blockers.push('remoteLoadingEnabled must remain false');
  }
  if (guard.runtimeConnected !== false || readiness.runtimeConnected !== false) {
    blockers.push('runtimeConnected must remain false');
  }
  if (guard.serverStaged !== false || readiness.serverStaged !== false) {
    blockers.push('serverStaged must remain false');
  }
  if (readiness.status !== 'PASS') {
    blockers.push(`readiness status must be PASS, got ${readiness.status}`);
  }
  if (Array.isArray(readiness.blockers) && readiness.blockers.length > 0) {
    blockers.push('readiness blockers must be empty');
  }
}

function validateObjects(objects: readonly StagingObject[], blockers: string[]): void {
  const seenPaths = new Set<string>();
  for (const object of objects) {
    if (!fs.existsSync(object.localPath)) {
      blockers.push(`missing local object: ${object.localPath}`);
    }
    if (seenPaths.has(object.stagingPath)) {
      blockers.push(`duplicate staging path: ${object.stagingPath}`);
    }
    seenPaths.add(object.stagingPath);
    if (object.stagingPath.includes('..') || object.stagingPath.includes('\\') || object.stagingPath.startsWith('/')) {
      blockers.push(`unsafe staging path: ${object.stagingPath}`);
    }
    if (!/^[a-f0-9]{64}$/.test(object.sha256)) {
      blockers.push(`bad object hash: ${object.stagingPath}`);
    }
    if (!Number.isSafeInteger(object.byteSize) || object.byteSize <= 0) {
      blockers.push(`bad object byteSize: ${object.stagingPath}`);
    }
  }
}

function objectFor(
  repoRoot: string,
  absolutePath: string,
  targetPath: string,
  role: StagingObject['role'],
): StagingObject {
  const content = fs.readFileSync(absolutePath);
  return {
    role,
    localPath: path.relative(repoRoot, absolutePath).replace(/\\/g, '/'),
    stagingPath: targetPath,
    sha256: createHash('sha256').update(content).digest('hex'),
    byteSize: content.byteLength,
  };
}

function stagingPath(manifest: CoursePackManifest, relativePath: string): string {
  return [
    'course-packs',
    manifest.surface,
    manifest.studyTarget,
    manifest.sourceLocale,
    manifest.contentVersion,
    relativePath.replace(/\\/g, '/'),
  ].join('/');
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
    } else if (arg === '--readiness-report') {
      options.readinessReportPath = readValue(argv, index, arg);
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
  const result = writePlanContentServerStagingDescriptor(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content server-staging descriptor: PASS');
  console.log(`Descriptor: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.descriptor.packId}`);
  console.log(`Status: ${result.descriptor.status}`);
  console.log(`Activation approved: ${result.descriptor.activationApproved}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
