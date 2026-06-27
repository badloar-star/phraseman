import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateDisabledCoursePackOfflineCacheIntegrity,
  type CoursePackDisabledOfflineCacheIntegrityReport,
} from '../app/course_pack_offline_cache_integrity';

type CliOptions = {
  manifestPath?: string;
  remoteVerifyReportPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledManifestPreflightPath?: string;
  disabledRuntimeCandidatePath?: string;
  activationReadinessPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type EvidenceEnvelope = {
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

type RemoteVerifyReport = EvidenceEnvelope & {
  expectedObjectCount?: number;
  foundObjectCount?: number;
  hashCheckedCount?: number;
  missingObjects?: unknown[];
  sizeMismatches?: unknown[];
  hashMismatches?: unknown[];
};

type ServerShadowDualReadReport = EvidenceEnvelope & {
  parityReport?: {
    verdict?: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  };
};

type DisabledManifestRegistryPreflightEnvelope = EvidenceEnvelope & {
  preflight?: {
    status?: 'PASS' | 'HOLD';
    cacheKey?: string;
    expectedCacheKey?: string | null;
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    cacheRepairApproved?: boolean;
    registryEntryAllowed?: boolean;
    cacheMetadataReadableByRuntime?: boolean;
    cacheMetadataWritableByRuntime?: boolean;
    startupBlockingAllowed?: boolean;
    blockers?: unknown[];
  };
};

type DisabledRuntimeManifestCandidateEnvelope = EvidenceEnvelope & {
  candidate?: {
    status?: 'PASS' | 'HOLD';
    evidenceBundleComplete?: boolean;
    runtimeManifestRegistrable?: boolean;
    runtimeManifestRegistered?: boolean;
    runtimeLookupAllowed?: boolean;
    cacheLookupAllowed?: boolean;
    cacheReadAllowed?: boolean;
    cacheWriteAllowed?: boolean;
    cacheRepairApproved?: boolean;
    startupBlockingAllowed?: boolean;
    blockers?: unknown[];
  };
};

type ActivationReadinessEnvelope = EvidenceEnvelope & {
  activationReadiness?: {
    status?: 'PASS' | 'HOLD';
    activationApproved?: boolean;
    remoteLoadingEnabled?: boolean;
    runtimeManifestRegistrable?: boolean;
    bundledContentRemoved?: boolean;
  };
  startupNoFetchGuard?: {
    status?: 'PASS' | 'HOLD';
  };
};

type DisabledOfflineCacheIntegrityEnvelope = {
  schemaVersion: 'plan-content-disabled-offline-cache-integrity-report-v1';
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
  disabledRuntimeCandidatePath: string;
  activationReadinessPath: string;
  integrity: CoursePackDisabledOfflineCacheIntegrityReport;
  evidenceBlockers: string[];
  blockers: string[];
};

type DisabledOfflineCacheIntegrityResult = {
  outputPath: string;
  report: DisabledOfflineCacheIntegrityEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_RUN_ROOT, 'pack', 'manifest.json');
const DEFAULT_REMOTE_VERIFY_PATH = path.join(DEFAULT_RUN_ROOT, 'server-staging-remote-verify.json');
const DEFAULT_DUAL_READ_PATH = path.join(DEFAULT_RUN_ROOT, 'server-shadow-dual-read-report.json');
const DEFAULT_DISABLED_PREFLIGHT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-manifest-registry-preflight.json');
const DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-runtime-manifest-candidate.json');
const DEFAULT_ACTIVATION_READINESS_PATH = path.join(DEFAULT_RUN_ROOT, 'activation-readiness-blocker-report.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-offline-cache-integrity.json');

export function resolvePlanContentDisabledOfflineCacheIntegrityTempPath(
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

export function writePlanContentDisabledOfflineCacheIntegrity(
  repoRoot: string,
  options: CliOptions = {},
): DisabledOfflineCacheIntegrityResult {
  const manifestPath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.manifestPath, DEFAULT_MANIFEST_PATH, 'Manifest input');
  const remoteVerifyReportPath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.remoteVerifyReportPath, DEFAULT_REMOTE_VERIFY_PATH, 'Remote verify report input');
  const serverShadowDualReadReportPath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.serverShadowDualReadReportPath, DEFAULT_DUAL_READ_PATH, 'Server-shadow dual-read report input');
  const disabledManifestPreflightPath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.disabledManifestPreflightPath, DEFAULT_DISABLED_PREFLIGHT_PATH, 'Disabled manifest preflight input');
  const disabledRuntimeCandidatePath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.disabledRuntimeCandidatePath, DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH, 'Disabled runtime manifest candidate input');
  const activationReadinessPath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.activationReadinessPath, DEFAULT_ACTIVATION_READINESS_PATH, 'Activation readiness input');
  const outputPath = resolvePlanContentDisabledOfflineCacheIntegrityTempPath(repoRoot, options.outputPath, DEFAULT_OUTPUT_PATH, 'Disabled offline cache integrity output');
  const manifest = readJsonFile<CoursePackManifest>(manifestPath);
  const remoteVerify = readJsonFile<RemoteVerifyReport>(remoteVerifyReportPath);
  const serverShadowDualRead = readJsonFile<ServerShadowDualReadReport>(serverShadowDualReadReportPath);
  const disabledPreflight = readJsonFile<DisabledManifestRegistryPreflightEnvelope>(disabledManifestPreflightPath);
  const disabledRuntimeCandidate = readJsonFile<DisabledRuntimeManifestCandidateEnvelope>(disabledRuntimeCandidatePath);
  const activationReadiness = readJsonFile<ActivationReadinessEnvelope>(activationReadinessPath);

  if (!disabledPreflight.preflight) {
    throw new Error('Disabled manifest preflight report must contain preflight payload');
  }

  const integrity = evaluateDisabledCoursePackOfflineCacheIntegrity({
    manifest,
    cacheKey: disabledPreflight.preflight.cacheKey ?? '',
    activationApproved: false,
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
      disabledManifestPreflightStatus: disabledPreflight.status === 'PASS' ? 'PASS' : 'HOLD',
      disabledRuntimeCandidateStatus: disabledRuntimeCandidate.status === 'PASS' ? 'PASS' : 'HOLD',
      runtimeManifestRegistrable: disabledRuntimeCandidate.candidate?.runtimeManifestRegistrable === true,
      expectedObjectCount: remoteVerify.expectedObjectCount ?? 0,
      foundObjectCount: remoteVerify.foundObjectCount ?? 0,
      hashCheckedCount: remoteVerify.hashCheckedCount ?? 0,
      missingObjectCount: arrayLength(remoteVerify.missingObjects),
      sizeMismatchCount: arrayLength(remoteVerify.sizeMismatches),
      sha256MismatchCount: arrayLength(remoteVerify.hashMismatches),
    },
  });
  const evidenceBlockers = [
    ...validateEvidenceIdentity(manifest, remoteVerify, 'remote verify'),
    ...validateEvidenceIdentity(manifest, serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceIdentity(manifest, disabledPreflight, 'disabled manifest preflight'),
    ...validateEvidenceIdentity(manifest, disabledRuntimeCandidate, 'disabled runtime manifest candidate'),
    ...validateEvidenceIdentity(manifest, activationReadiness, 'activation readiness'),
    ...validateEvidenceGuards(remoteVerify, 'remote verify'),
    ...validateEvidenceGuards(serverShadowDualRead, 'server-shadow dual-read'),
    ...validateDisabledPreflight(disabledPreflight),
    ...validateDisabledRuntimeCandidate(disabledRuntimeCandidate),
    ...validateActivationReadiness(activationReadiness),
  ];
  const blockers = [
    ...integrity.blockers,
    ...evidenceBlockers,
  ];
  const report: DisabledOfflineCacheIntegrityEnvelope = {
    schemaVersion: 'plan-content-disabled-offline-cache-integrity-report-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: 'plan_content',
    contentVersion: manifest.contentVersion,
    manifestPath: relativePath(repoRoot, manifestPath),
    remoteVerifyReportPath: relativePath(repoRoot, remoteVerifyReportPath),
    serverShadowDualReadReportPath: relativePath(repoRoot, serverShadowDualReadReportPath),
    disabledManifestPreflightPath: relativePath(repoRoot, disabledManifestPreflightPath),
    disabledRuntimeCandidatePath: relativePath(repoRoot, disabledRuntimeCandidatePath),
    activationReadinessPath: relativePath(repoRoot, activationReadinessPath),
    integrity: {
      ...integrity,
      blockers,
      status: blockers.length === 0 ? 'PASS' : 'HOLD',
      cacheIntegrityEvidenceComplete: blockers.length === 0,
    },
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Disabled offline cache integrity failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateEvidenceIdentity(
  manifest: CoursePackManifest,
  evidence: EvidenceEnvelope,
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

function validateEvidenceGuards(evidence: EvidenceEnvelope, label: string): string[] {
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

function validateDisabledPreflight(envelope: DisabledManifestRegistryPreflightEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled manifest preflight envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled manifest preflight envelope blockers must be empty');
  }
  if (!envelope.preflight) {
    errors.push('disabled manifest preflight envelope must contain preflight payload');
    return errors;
  }
  if (envelope.preflight.status !== 'PASS') {
    errors.push('disabled manifest preflight payload status must be PASS');
  }
  if (envelope.preflight.cacheKey !== envelope.preflight.expectedCacheKey) {
    errors.push('disabled manifest preflight cacheKey must match expectedCacheKey');
  }
  if (envelope.preflight.manifestFetchApproved !== false) {
    errors.push('disabled manifest preflight manifestFetchApproved must remain false');
  }
  if (envelope.preflight.packDownloadApproved !== false) {
    errors.push('disabled manifest preflight packDownloadApproved must remain false');
  }
  if (envelope.preflight.cacheReadApproved !== false) {
    errors.push('disabled manifest preflight cacheReadApproved must remain false');
  }
  if (envelope.preflight.cacheWriteApproved !== false) {
    errors.push('disabled manifest preflight cacheWriteApproved must remain false');
  }
  if (envelope.preflight.cacheRepairApproved !== false) {
    errors.push('disabled manifest preflight cacheRepairApproved must remain false');
  }
  if (envelope.preflight.registryEntryAllowed !== false) {
    errors.push('disabled manifest preflight registryEntryAllowed must remain false');
  }
  if (envelope.preflight.cacheMetadataReadableByRuntime !== false) {
    errors.push('disabled manifest preflight cacheMetadataReadableByRuntime must remain false');
  }
  if (envelope.preflight.cacheMetadataWritableByRuntime !== false) {
    errors.push('disabled manifest preflight cacheMetadataWritableByRuntime must remain false');
  }
  if (envelope.preflight.startupBlockingAllowed !== false) {
    errors.push('disabled manifest preflight startupBlockingAllowed must remain false');
  }
  if (Array.isArray(envelope.preflight.blockers) && envelope.preflight.blockers.length > 0) {
    errors.push('disabled manifest preflight payload blockers must be empty');
  }
  return errors;
}

function validateDisabledRuntimeCandidate(envelope: DisabledRuntimeManifestCandidateEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled runtime manifest candidate envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled runtime manifest candidate envelope blockers must be empty');
  }
  if (!envelope.candidate) {
    errors.push('disabled runtime manifest candidate envelope must contain candidate payload');
    return errors;
  }
  if (envelope.candidate.status !== 'PASS') {
    errors.push('disabled runtime manifest candidate payload status must be PASS');
  }
  if (envelope.candidate.evidenceBundleComplete !== true) {
    errors.push('disabled runtime manifest candidate evidenceBundleComplete must be true');
  }
  if (envelope.candidate.runtimeManifestRegistrable !== false) {
    errors.push('disabled runtime manifest candidate runtimeManifestRegistrable must remain false');
  }
  if (envelope.candidate.runtimeManifestRegistered !== false) {
    errors.push('disabled runtime manifest candidate runtimeManifestRegistered must remain false');
  }
  if (envelope.candidate.runtimeLookupAllowed !== false) {
    errors.push('disabled runtime manifest candidate runtimeLookupAllowed must remain false');
  }
  if (envelope.candidate.cacheLookupAllowed !== false) {
    errors.push('disabled runtime manifest candidate cacheLookupAllowed must remain false');
  }
  if (envelope.candidate.cacheReadAllowed !== false) {
    errors.push('disabled runtime manifest candidate cacheReadAllowed must remain false');
  }
  if (envelope.candidate.cacheWriteAllowed !== false) {
    errors.push('disabled runtime manifest candidate cacheWriteAllowed must remain false');
  }
  if (envelope.candidate.startupBlockingAllowed !== false) {
    errors.push('disabled runtime manifest candidate startupBlockingAllowed must remain false');
  }
  if (Array.isArray(envelope.candidate.blockers) && envelope.candidate.blockers.length > 0) {
    errors.push('disabled runtime manifest candidate blockers must be empty');
  }
  return errors;
}

function validateActivationReadiness(envelope: ActivationReadinessEnvelope): string[] {
  const errors: string[] = [];
  if (!envelope.activationReadiness) {
    errors.push('activation readiness envelope must contain activationReadiness payload');
    return errors;
  }
  if (envelope.activationReadiness.activationApproved !== false) {
    errors.push('activation readiness activationApproved must remain false');
  }
  if (envelope.activationReadiness.remoteLoadingEnabled !== false) {
    errors.push('activation readiness remoteLoadingEnabled must remain false');
  }
  if (envelope.activationReadiness.runtimeManifestRegistrable !== false) {
    errors.push('activation readiness runtimeManifestRegistrable must remain false');
  }
  if (envelope.activationReadiness.bundledContentRemoved !== false) {
    errors.push('activation readiness bundledContentRemoved must remain false');
  }
  if (envelope.startupNoFetchGuard?.status !== 'PASS') {
    errors.push('activation readiness startup no-fetch guard must be PASS');
  }
  return errors;
}

function arrayLength(value: unknown[] | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
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
    } else if (arg === '--disabled-runtime-candidate') {
      options.disabledRuntimeCandidatePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--activation-readiness') {
      options.activationReadinessPath = readValue(argv, index, arg);
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
  const result = writePlanContentDisabledOfflineCacheIntegrity(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content disabled offline cache integrity: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Cache key: ${result.report.integrity.cacheKey}`);
  console.log(`Runtime cache usable: ${result.report.integrity.offlineCacheUsableByRuntime}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
