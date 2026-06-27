import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackManifest } from '../app/course_pack_manifest';
import type { CoursePackDisabledManifestPreflightReport } from '../app/course_pack_manifest_registry_preflight';
import {
  evaluateDisabledCoursePackRuntimeManifestCandidate,
  type CoursePackDisabledRuntimeManifestCandidateReport,
} from '../app/course_pack_runtime_manifest_candidate';

type CliOptions = {
  manifestPath?: string;
  remoteVerifyReportPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledManifestPreflightPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type RemoteVerifyReport = {
  status?: 'PASS' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  remoteLoadingEnabled?: boolean;
  bundledContentRemoved?: boolean;
  storageMigrationRan?: boolean;
  productionActivationApproved?: boolean;
  blockers?: unknown[];
};

type ServerShadowDualReadReport = {
  status?: 'PASS' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  remoteLoadingEnabled?: boolean;
  bundledContentRemoved?: boolean;
  storageMigrationRan?: boolean;
  productionActivationApproved?: boolean;
  parityReport?: {
    verdict?: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  };
  blockers?: unknown[];
};

type DisabledManifestRegistryPreflightEnvelope = {
  status?: 'PASS' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  preflight?: CoursePackDisabledManifestPreflightReport;
  blockers?: unknown[];
};

type DisabledRuntimeManifestCandidateEnvelope = {
  schemaVersion: 'plan-content-disabled-runtime-manifest-candidate-report-v1';
  status: 'PASS' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  manifestPath: string;
  remoteVerifyReportPath: string;
  serverShadowDualReadReportPath: string;
  disabledManifestPreflightPath: string;
  candidate: CoursePackDisabledRuntimeManifestCandidateReport;
  blockers: string[];
};

type DisabledRuntimeManifestCandidateResult = {
  outputPath: string;
  report: DisabledRuntimeManifestCandidateEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_RUN_ROOT, 'pack', 'manifest.json');
const DEFAULT_REMOTE_VERIFY_PATH = path.join(DEFAULT_RUN_ROOT, 'server-staging-remote-verify.json');
const DEFAULT_DUAL_READ_PATH = path.join(DEFAULT_RUN_ROOT, 'server-shadow-dual-read-report.json');
const DEFAULT_DISABLED_PREFLIGHT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-manifest-registry-preflight.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-runtime-manifest-candidate.json');

export function resolvePlanContentDisabledRuntimeCandidateTempPath(
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

export function writePlanContentDisabledRuntimeManifestCandidate(
  repoRoot: string,
  options: CliOptions = {},
): DisabledRuntimeManifestCandidateResult {
  const manifestPath = resolvePlanContentDisabledRuntimeCandidateTempPath(repoRoot, options.manifestPath, DEFAULT_MANIFEST_PATH, 'Manifest input');
  const remoteVerifyReportPath = resolvePlanContentDisabledRuntimeCandidateTempPath(repoRoot, options.remoteVerifyReportPath, DEFAULT_REMOTE_VERIFY_PATH, 'Remote verify report input');
  const serverShadowDualReadReportPath = resolvePlanContentDisabledRuntimeCandidateTempPath(repoRoot, options.serverShadowDualReadReportPath, DEFAULT_DUAL_READ_PATH, 'Server-shadow dual-read report input');
  const disabledManifestPreflightPath = resolvePlanContentDisabledRuntimeCandidateTempPath(repoRoot, options.disabledManifestPreflightPath, DEFAULT_DISABLED_PREFLIGHT_PATH, 'Disabled manifest preflight input');
  const outputPath = resolvePlanContentDisabledRuntimeCandidateTempPath(repoRoot, options.outputPath, DEFAULT_OUTPUT_PATH, 'Disabled runtime manifest candidate output');
  const manifest = readJsonFile<CoursePackManifest>(manifestPath);
  const remoteVerify = readJsonFile<RemoteVerifyReport>(remoteVerifyReportPath);
  const serverShadowDualRead = readJsonFile<ServerShadowDualReadReport>(serverShadowDualReadReportPath);
  const disabledPreflightEnvelope = readJsonFile<DisabledManifestRegistryPreflightEnvelope>(disabledManifestPreflightPath);
  const disabledPreflight = disabledPreflightEnvelope.preflight;
  if (!disabledPreflight) {
    throw new Error('Disabled manifest preflight report must contain preflight payload');
  }

  const candidate = evaluateDisabledCoursePackRuntimeManifestCandidate({
    manifest,
    disabledManifestPreflight: disabledPreflight,
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
    cacheLookupApproved: false,
    cacheReadApproved: false,
    cacheWriteApproved: false,
    cacheRepairApproved: false,
    storageMigrationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    evidence: {
      remoteVerifyStatus: remoteVerify.status === 'PASS' ? 'PASS' : 'HOLD',
      serverShadowDualReadStatus: serverShadowDualRead.status === 'PASS' ? 'PASS' : 'HOLD',
      serverShadowParityVerdict: serverShadowDualRead.parityReport?.verdict ?? 'hold',
      disabledManifestPreflightStatus: disabledPreflightEnvelope.status === 'PASS' ? 'PASS' : 'HOLD',
    },
  });
  const blockers = [
    ...candidate.blockers,
    ...validateEvidenceIdentity(manifest, remoteVerify, 'remote verify'),
    ...validateEvidenceIdentity(manifest, serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceIdentity(manifest, disabledPreflightEnvelope, 'disabled manifest preflight'),
    ...validateEvidenceGuards(remoteVerify, 'remote verify'),
    ...validateEvidenceGuards(serverShadowDualRead, 'server-shadow dual-read'),
    ...validateDisabledPreflightEnvelope(disabledPreflightEnvelope),
  ];
  const report: DisabledRuntimeManifestCandidateEnvelope = {
    schemaVersion: 'plan-content-disabled-runtime-manifest-candidate-report-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: 'plan_content',
    contentVersion: manifest.contentVersion,
    manifestPath: path.relative(repoRoot, manifestPath).replace(/\\/g, '/'),
    remoteVerifyReportPath: path.relative(repoRoot, remoteVerifyReportPath).replace(/\\/g, '/'),
    serverShadowDualReadReportPath: path.relative(repoRoot, serverShadowDualReadReportPath).replace(/\\/g, '/'),
    disabledManifestPreflightPath: path.relative(repoRoot, disabledManifestPreflightPath).replace(/\\/g, '/'),
    candidate: {
      ...candidate,
      blockers,
      status: blockers.length === 0 ? 'PASS' : 'HOLD',
      evidenceBundleComplete: blockers.length === 0,
    },
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Disabled runtime manifest candidate failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateEvidenceIdentity(
  manifest: CoursePackManifest,
  evidence: RemoteVerifyReport | ServerShadowDualReadReport | DisabledManifestRegistryPreflightEnvelope,
  label: string,
): string[] {
  const errors: string[] = [];
  if (evidence.packId !== manifest.packId) {
    errors.push(`${label} packId must match manifest`);
  }
  if (evidence.studyTarget !== manifest.studyTarget) {
    errors.push(`${label} studyTarget must match manifest`);
  }
  if (evidence.sourceLocale !== manifest.sourceLocale) {
    errors.push(`${label} sourceLocale must match manifest`);
  }
  if (evidence.surface !== manifest.surface) {
    errors.push(`${label} surface must match manifest`);
  }
  if (evidence.contentVersion !== manifest.contentVersion) {
    errors.push(`${label} contentVersion must match manifest`);
  }
  return errors;
}

function validateEvidenceGuards(
  evidence: RemoteVerifyReport | ServerShadowDualReadReport,
  label: string,
): string[] {
  const errors: string[] = [];
  if (evidence.status !== 'PASS') {
    errors.push(`${label} status must be PASS`);
  }
  if (evidence.activationApproved !== false) {
    errors.push(`${label} activationApproved must remain false`);
  }
  if (evidence.runtimeManifestRegistered !== false) {
    errors.push(`${label} runtimeManifestRegistered must remain false`);
  }
  if (evidence.remoteLoadingEnabled !== false) {
    errors.push(`${label} remoteLoadingEnabled must remain false`);
  }
  if (evidence.bundledContentRemoved !== false) {
    errors.push(`${label} bundledContentRemoved must remain false`);
  }
  if (evidence.storageMigrationRan !== false) {
    errors.push(`${label} storageMigrationRan must remain false`);
  }
  if (evidence.productionActivationApproved !== false) {
    errors.push(`${label} productionActivationApproved must remain false`);
  }
  if (Array.isArray(evidence.blockers) && evidence.blockers.length > 0) {
    errors.push(`${label} blockers must be empty`);
  }
  return errors;
}

function validateDisabledPreflightEnvelope(envelope: DisabledManifestRegistryPreflightEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled manifest preflight envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled manifest preflight envelope blockers must be empty');
  }
  return errors;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      options.manifestPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--remote-verify-report') {
      options.remoteVerifyReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--server-shadow-dual-read-report') {
      options.serverShadowDualReadReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-manifest-preflight') {
      options.disabledManifestPreflightPath = readValue(argv, index, arg);
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
  const result = writePlanContentDisabledRuntimeManifestCandidate(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content disabled runtime manifest candidate: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Runtime manifest registrable: ${result.report.candidate.runtimeManifestRegistrable}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
