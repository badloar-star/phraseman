import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateDisabledCoursePackRollbackKillSwitch,
  type CoursePackDisabledRollbackKillSwitchReport,
} from '../app/course_pack_rollback_kill_switch';

type CliOptions = {
  manifestPath?: string;
  remoteVerifyReportPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledManifestPreflightPath?: string;
  disabledRuntimeCandidatePath?: string;
  disabledOfflineCacheIntegrityPath?: string;
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

type ServerShadowDualReadReport = EvidenceEnvelope & {
  parityReport?: {
    verdict?: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  };
};

type DisabledManifestRegistryPreflightEnvelope = EvidenceEnvelope & {
  preflight?: {
    status?: 'PASS' | 'HOLD';
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    cacheRepairApproved?: boolean;
    storageMigrationApproved?: boolean;
    bundledContentRemovalApproved?: boolean;
    productionActivationApproved?: boolean;
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
    startupBlockingAllowed?: boolean;
    blockers?: unknown[];
  };
};

type DisabledOfflineCacheIntegrityEnvelope = EvidenceEnvelope & {
  integrity?: {
    status?: 'PASS' | 'HOLD';
    cacheIntegrityEvidenceComplete?: boolean;
    offlineCacheUsableByRuntime?: boolean;
    activationApproved?: boolean;
    remoteLoadingEnabled?: boolean;
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheLookupApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    cacheRepairApproved?: boolean;
    storageMigrationApproved?: boolean;
    bundledContentRemovalApproved?: boolean;
    productionActivationApproved?: boolean;
    cacheLookupAllowed?: boolean;
    cacheReadAllowed?: boolean;
    cacheWriteAllowed?: boolean;
    cacheRepairAllowed?: boolean;
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

type DisabledRollbackKillSwitchEnvelope = {
  schemaVersion: 'plan-content-disabled-rollback-kill-switch-report-v1';
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
  disabledOfflineCacheIntegrityPath: string;
  activationReadinessPath: string;
  rollback: CoursePackDisabledRollbackKillSwitchReport;
  evidenceBlockers: string[];
  blockers: string[];
};

type DisabledRollbackKillSwitchResult = {
  outputPath: string;
  report: DisabledRollbackKillSwitchEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_RUN_ROOT, 'pack', 'manifest.json');
const DEFAULT_REMOTE_VERIFY_PATH = path.join(DEFAULT_RUN_ROOT, 'server-staging-remote-verify.json');
const DEFAULT_DUAL_READ_PATH = path.join(DEFAULT_RUN_ROOT, 'server-shadow-dual-read-report.json');
const DEFAULT_DISABLED_PREFLIGHT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-manifest-registry-preflight.json');
const DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-runtime-manifest-candidate.json');
const DEFAULT_DISABLED_OFFLINE_CACHE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-offline-cache-integrity.json');
const DEFAULT_ACTIVATION_READINESS_PATH = path.join(DEFAULT_RUN_ROOT, 'activation-readiness-blocker-report.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-rollback-kill-switch.json');

export function resolvePlanContentDisabledRollbackKillSwitchTempPath(
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

export function writePlanContentDisabledRollbackKillSwitch(
  repoRoot: string,
  options: CliOptions = {},
): DisabledRollbackKillSwitchResult {
  const manifestPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.manifestPath, DEFAULT_MANIFEST_PATH, 'Manifest input');
  const remoteVerifyReportPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.remoteVerifyReportPath, DEFAULT_REMOTE_VERIFY_PATH, 'Remote verify report input');
  const serverShadowDualReadReportPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.serverShadowDualReadReportPath, DEFAULT_DUAL_READ_PATH, 'Server-shadow dual-read report input');
  const disabledManifestPreflightPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.disabledManifestPreflightPath, DEFAULT_DISABLED_PREFLIGHT_PATH, 'Disabled manifest preflight input');
  const disabledRuntimeCandidatePath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.disabledRuntimeCandidatePath, DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH, 'Disabled runtime manifest candidate input');
  const disabledOfflineCacheIntegrityPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.disabledOfflineCacheIntegrityPath, DEFAULT_DISABLED_OFFLINE_CACHE_PATH, 'Disabled offline cache integrity input');
  const activationReadinessPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.activationReadinessPath, DEFAULT_ACTIVATION_READINESS_PATH, 'Activation readiness input');
  const outputPath = resolvePlanContentDisabledRollbackKillSwitchTempPath(repoRoot, options.outputPath, DEFAULT_OUTPUT_PATH, 'Disabled rollback kill-switch output');
  const manifest = readJsonFile<CoursePackManifest>(manifestPath);
  const remoteVerify = readJsonFile<EvidenceEnvelope>(remoteVerifyReportPath);
  const serverShadowDualRead = readJsonFile<ServerShadowDualReadReport>(serverShadowDualReadReportPath);
  const disabledPreflight = readJsonFile<DisabledManifestRegistryPreflightEnvelope>(disabledManifestPreflightPath);
  const disabledRuntimeCandidate = readJsonFile<DisabledRuntimeManifestCandidateEnvelope>(disabledRuntimeCandidatePath);
  const disabledOfflineCacheIntegrity = readJsonFile<DisabledOfflineCacheIntegrityEnvelope>(disabledOfflineCacheIntegrityPath);
  const activationReadiness = readJsonFile<ActivationReadinessEnvelope>(activationReadinessPath);
  const rollback = evaluateDisabledCoursePackRollbackKillSwitch({
    manifest,
    rollbackMode: 'bundled_compatibility',
    rollbackForcesBundledCompatibility: true,
    rollbackRequiresAppUpdate: false,
    rollbackDeletesUserProgress: false,
    rollbackMutatesStorageOrCloud: false,
    rollbackDownloadsPack: false,
    rollbackReadsCache: false,
    rollbackWritesCache: false,
    rollbackRepairsCache: false,
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
    remoteLoadingApproved: false,
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
      disabledOfflineCacheIntegrityStatus: disabledOfflineCacheIntegrity.status === 'PASS' ? 'PASS' : 'HOLD',
      offlineCacheUsableByRuntime: disabledOfflineCacheIntegrity.integrity?.offlineCacheUsableByRuntime === true,
      runtimeManifestRegistrable: disabledRuntimeCandidate.candidate?.runtimeManifestRegistrable === true,
      activationReadinessStatus: activationReadiness.status === 'PASS' ? 'PASS' : 'HOLD',
    },
  });
  const evidenceBlockers = [
    ...validateEvidenceIdentity(manifest, remoteVerify, 'remote verify'),
    ...validateEvidenceIdentity(manifest, serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceIdentity(manifest, disabledPreflight, 'disabled manifest preflight'),
    ...validateEvidenceIdentity(manifest, disabledRuntimeCandidate, 'disabled runtime manifest candidate'),
    ...validateEvidenceIdentity(manifest, disabledOfflineCacheIntegrity, 'disabled offline cache integrity'),
    ...validateEvidenceIdentity(manifest, activationReadiness, 'activation readiness'),
    ...validateEvidenceGuards(remoteVerify, 'remote verify'),
    ...validateEvidenceGuards(serverShadowDualRead, 'server-shadow dual-read'),
    ...validateDisabledPreflight(disabledPreflight),
    ...validateDisabledRuntimeCandidate(disabledRuntimeCandidate),
    ...validateDisabledOfflineCacheIntegrity(disabledOfflineCacheIntegrity),
    ...validateActivationReadiness(activationReadiness),
  ];
  const blockers = [
    ...rollback.blockers,
    ...evidenceBlockers,
  ];
  const report: DisabledRollbackKillSwitchEnvelope = {
    schemaVersion: 'plan-content-disabled-rollback-kill-switch-report-v1',
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
    disabledOfflineCacheIntegrityPath: relativePath(repoRoot, disabledOfflineCacheIntegrityPath),
    activationReadinessPath: relativePath(repoRoot, activationReadinessPath),
    rollback: {
      ...rollback,
      blockers,
      status: blockers.length === 0 ? 'PASS' : 'HOLD',
      rollbackEvidenceComplete: blockers.length === 0,
    },
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Disabled rollback kill-switch failed: ${blockers.join('; ')}`);
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
  if (!envelope.preflight) {
    errors.push('disabled manifest preflight envelope must contain preflight payload');
    return errors;
  }
  if (envelope.preflight.status !== 'PASS') {
    errors.push('disabled manifest preflight payload status must be PASS');
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
  if (envelope.preflight.storageMigrationApproved === true) {
    errors.push('disabled manifest preflight storageMigrationApproved must remain false');
  }
  if (envelope.preflight.bundledContentRemovalApproved === true) {
    errors.push('disabled manifest preflight bundledContentRemovalApproved must remain false');
  }
  if (envelope.preflight.productionActivationApproved === true) {
    errors.push('disabled manifest preflight productionActivationApproved must remain false');
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

function validateDisabledOfflineCacheIntegrity(envelope: DisabledOfflineCacheIntegrityEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled offline cache integrity envelope status must be PASS');
  }
  if (!envelope.integrity) {
    errors.push('disabled offline cache integrity envelope must contain integrity payload');
    return errors;
  }
  if (envelope.integrity.status !== 'PASS') {
    errors.push('disabled offline cache integrity payload status must be PASS');
  }
  if (envelope.integrity.cacheIntegrityEvidenceComplete !== true) {
    errors.push('disabled offline cache integrity evidence must be complete');
  }
  if (envelope.integrity.offlineCacheUsableByRuntime !== false) {
    errors.push('disabled offline cache integrity offlineCacheUsableByRuntime must remain false');
  }
  if (envelope.integrity.activationApproved !== false) {
    errors.push('disabled offline cache integrity activationApproved must remain false');
  }
  if (envelope.integrity.remoteLoadingEnabled !== false) {
    errors.push('disabled offline cache integrity remoteLoadingEnabled must remain false');
  }
  if (envelope.integrity.manifestFetchApproved !== false) {
    errors.push('disabled offline cache integrity manifestFetchApproved must remain false');
  }
  if (envelope.integrity.packDownloadApproved !== false) {
    errors.push('disabled offline cache integrity packDownloadApproved must remain false');
  }
  if (envelope.integrity.cacheLookupApproved !== false) {
    errors.push('disabled offline cache integrity cacheLookupApproved must remain false');
  }
  if (envelope.integrity.cacheReadApproved !== false) {
    errors.push('disabled offline cache integrity cacheReadApproved must remain false');
  }
  if (envelope.integrity.cacheWriteApproved !== false) {
    errors.push('disabled offline cache integrity cacheWriteApproved must remain false');
  }
  if (envelope.integrity.cacheRepairApproved !== false) {
    errors.push('disabled offline cache integrity cacheRepairApproved must remain false');
  }
  if (envelope.integrity.storageMigrationApproved !== false) {
    errors.push('disabled offline cache integrity storageMigrationApproved must remain false');
  }
  if (envelope.integrity.bundledContentRemovalApproved !== false) {
    errors.push('disabled offline cache integrity bundledContentRemovalApproved must remain false');
  }
  if (envelope.integrity.productionActivationApproved !== false) {
    errors.push('disabled offline cache integrity productionActivationApproved must remain false');
  }
  if (envelope.integrity.cacheLookupAllowed !== false) {
    errors.push('disabled offline cache integrity cacheLookupAllowed must remain false');
  }
  if (envelope.integrity.cacheReadAllowed !== false) {
    errors.push('disabled offline cache integrity cacheReadAllowed must remain false');
  }
  if (envelope.integrity.cacheWriteAllowed !== false) {
    errors.push('disabled offline cache integrity cacheWriteAllowed must remain false');
  }
  if (envelope.integrity.cacheRepairAllowed !== false) {
    errors.push('disabled offline cache integrity cacheRepairAllowed must remain false');
  }
  if (envelope.integrity.startupBlockingAllowed !== false) {
    errors.push('disabled offline cache integrity startupBlockingAllowed must remain false');
  }
  if (Array.isArray(envelope.integrity.blockers) && envelope.integrity.blockers.length > 0) {
    errors.push('disabled offline cache integrity blockers must be empty');
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
    } else if (arg === '--disabled-offline-cache-integrity') {
      options.disabledOfflineCacheIntegrityPath = readValue(argv, index, arg);
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
  const result = writePlanContentDisabledRollbackKillSwitch(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content disabled rollback kill-switch: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Rollback mode: ${result.report.rollback.rollbackMode}`);
  console.log(`Deletes progress: ${result.report.rollback.rollbackDeletesUserProgress}`);
  console.log(`Mutates storage/cloud: ${result.report.rollback.rollbackMutatesStorageOrCloud}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
