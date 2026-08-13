import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackManifest } from '../app/course_pack_manifest';
import { validatePlanContentPackIndex, type PlanContentPackIndex } from '../app/plan_content_pack_index';
import {
  evaluateCoursePackReviewerLocaleIntake,
  type CoursePackReviewerLocaleDecision,
  type CoursePackReviewerLocaleIntakeReport,
  type CoursePackReviewerLocaleRow,
} from '../app/course_pack_reviewer_locale_intake';

type CliOptions = {
  manifestPath?: string;
  indexPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledStorageCloudIsolationPath?: string;
  reviewerLocaleApprovalPath?: string;
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
  serverShadowRowsRead?: number;
  parityReport?: {
    verdict?: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
    reviewerSummary?: {
      reviewedRowCount?: number;
      reviewStatusCounts?: {
        approved?: number;
      };
      localeGateStatusCounts?: {
        passed?: number;
      };
    };
  };
};

type DisabledStorageCloudIsolationEnvelope = EvidenceEnvelope & {
  storageCloud?: {
    status?: 'PASS' | 'HOLD';
    storageCloudIsolationComplete?: boolean;
    activationApproved?: boolean;
    runtimeManifestRegistrationApproved?: boolean;
    runtimeLookupApproved?: boolean;
    remoteLoadingApproved?: boolean;
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheLookupApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    cacheRepairApproved?: boolean;
    storageMigrationApproved?: boolean;
    cloudRestoreMigrationApproved?: boolean;
    cloudRestoreRewriteApproved?: boolean;
    cloudRestoreExecutionApproved?: boolean;
    syncKeyMutationApproved?: boolean;
    studyTargetMutationApproved?: boolean;
    sourceLocaleMutationApproved?: boolean;
    appLanguageMutationApproved?: boolean;
    bundledContentRemovalApproved?: boolean;
    productionActivationApproved?: boolean;
    blockers?: unknown[];
  };
};

type ReviewerLocaleApprovalArtifact = EvidenceEnvelope & {
  schemaVersion?: 'plan-content-reviewer-locale-approval-v1';
  decisions?: CoursePackReviewerLocaleDecision[];
};

type DisabledReviewerLocaleIntakeEnvelope = {
  schemaVersion: 'plan-content-disabled-reviewer-locale-intake-report-v1';
  status: 'PASS' | 'HOLD';
  safetyStatus: 'PASS' | 'HOLD';
  approvalStatus: 'PASS' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  manifestPath: string;
  indexPath: string;
  serverShadowDualReadReportPath: string;
  disabledStorageCloudIsolationPath: string;
  reviewerLocaleApprovalPath?: string;
  reviewerLocale: CoursePackReviewerLocaleIntakeReport;
  evidenceBlockers: string[];
  blockers: string[];
};

type DisabledReviewerLocaleIntakeResult = {
  outputPath: string;
  report: DisabledReviewerLocaleIntakeEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_RUN_ROOT, 'pack', 'manifest.json');
const DEFAULT_DUAL_READ_PATH = path.join(DEFAULT_RUN_ROOT, 'server-shadow-dual-read-report.json');
const DEFAULT_STORAGE_CLOUD_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-storage-cloud-isolation.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-reviewer-locale-intake.json');

export function resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
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

export function writePlanContentDisabledReviewerLocaleIntake(
  repoRoot: string,
  options: CliOptions = {},
): DisabledReviewerLocaleIntakeResult {
  const manifestPath = resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
    repoRoot,
    options.manifestPath,
    DEFAULT_MANIFEST_PATH,
    'Manifest input',
  );
  const manifest = readJsonFile<CoursePackManifest>(manifestPath);
  const indexFallbackPath = path.resolve(path.dirname(manifestPath), manifest.entryIndex || 'index.json');
  const indexPath = resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
    repoRoot,
    options.indexPath,
    indexFallbackPath,
    'Plan-content index input',
  );
  const serverShadowDualReadReportPath = resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
    repoRoot,
    options.serverShadowDualReadReportPath,
    DEFAULT_DUAL_READ_PATH,
    'Server-shadow dual-read report input',
  );
  const disabledStorageCloudIsolationPath = resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
    repoRoot,
    options.disabledStorageCloudIsolationPath,
    DEFAULT_STORAGE_CLOUD_PATH,
    'Disabled storage/cloud isolation input',
  );
  const reviewerLocaleApprovalPath = options.reviewerLocaleApprovalPath
    ? resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
      repoRoot,
      options.reviewerLocaleApprovalPath,
      options.reviewerLocaleApprovalPath,
      'Reviewer/locale approval input',
    )
    : null;
  const outputPath = resolvePlanContentDisabledReviewerLocaleIntakeTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Disabled reviewer/locale intake output',
  );

  const index = readJsonFile<PlanContentPackIndex>(indexPath);
  const serverShadowDualRead = readJsonFile<ServerShadowDualReadReport>(serverShadowDualReadReportPath);
  const disabledStorageCloudIsolation = readJsonFile<DisabledStorageCloudIsolationEnvelope>(disabledStorageCloudIsolationPath);
  const reviewerLocaleApproval = reviewerLocaleApprovalPath
    ? readJsonFile<ReviewerLocaleApprovalArtifact>(reviewerLocaleApprovalPath)
    : null;

  const evidenceBlockers = [
    ...validateEvidenceIdentity(manifest, serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceIdentity(manifest, disabledStorageCloudIsolation, 'disabled storage/cloud isolation'),
    ...validateEvidenceGuards(serverShadowDualRead, 'server-shadow dual-read'),
    ...validateDisabledStorageCloudIsolation(disabledStorageCloudIsolation),
    ...validateIndex(manifest, index),
    ...(reviewerLocaleApproval
      ? [
        ...validateEvidenceIdentity(manifest, reviewerLocaleApproval, 'reviewer/locale approval artifact'),
        ...validateEvidenceGuards(reviewerLocaleApproval, 'reviewer/locale approval artifact'),
        ...validateReviewerLocaleApprovalArtifact(reviewerLocaleApproval),
      ]
      : []),
  ];

  const reviewerSummary = serverShadowDualRead.parityReport?.reviewerSummary;
  const reviewerLocale = evaluateCoursePackReviewerLocaleIntake({
    manifest,
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
    cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    evidence: {
      serverShadowDualReadStatus: serverShadowDualRead.status === 'PASS' ? 'PASS' : 'HOLD',
      serverShadowParityVerdict: serverShadowDualRead.parityReport?.verdict ?? 'hold',
      serverShadowRowsRead: serverShadowDualRead.serverShadowRowsRead ?? reviewerSummary?.reviewedRowCount ?? 0,
      serverShadowReviewerApprovedRows: reviewerSummary?.reviewStatusCounts?.approved ?? 0,
      serverShadowLocalePassedRows: reviewerSummary?.localeGateStatusCounts?.passed ?? 0,
      storageCloudIsolationStatus: disabledStorageCloudIsolation.status === 'PASS' ? 'PASS' : 'HOLD',
      storageCloudIsolationComplete: disabledStorageCloudIsolation.storageCloud?.storageCloudIsolationComplete === true,
      indexRows: Array.isArray(index.entries) ? index.entries as CoursePackReviewerLocaleRow[] : [],
      explicitApprovalArtifactPresent: Boolean(reviewerLocaleApproval),
      explicitDecisions: reviewerLocaleApproval?.decisions ?? [],
    },
  });
  const blockers = [
    ...reviewerLocale.blockers,
    ...evidenceBlockers,
  ];
  const report: DisabledReviewerLocaleIntakeEnvelope = {
    schemaVersion: 'plan-content-disabled-reviewer-locale-intake-report-v1',
    status: evidenceBlockers.length === 0 ? reviewerLocale.status : 'HOLD',
    safetyStatus: evidenceBlockers.length === 0 && reviewerLocale.safetyStatus === 'PASS' ? 'PASS' : 'HOLD',
    approvalStatus: reviewerLocale.approvalStatus,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: 'plan_content',
    contentVersion: manifest.contentVersion,
    manifestPath: relativePath(repoRoot, manifestPath),
    indexPath: relativePath(repoRoot, indexPath),
    serverShadowDualReadReportPath: relativePath(repoRoot, serverShadowDualReadReportPath),
    disabledStorageCloudIsolationPath: relativePath(repoRoot, disabledStorageCloudIsolationPath),
    ...(reviewerLocaleApprovalPath ? {
      reviewerLocaleApprovalPath: relativePath(repoRoot, reviewerLocaleApprovalPath),
    } : {}),
    reviewerLocale,
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (evidenceBlockers.length > 0 || reviewerLocale.safetyStatus !== 'PASS') {
    throw new Error(`Disabled reviewer/locale intake failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateIndex(manifest: CoursePackManifest, index: PlanContentPackIndex): string[] {
  const errors: string[] = [];
  const validation = validatePlanContentPackIndex(index);
  errors.push(...validation.errors.map((error) => `plan-content index: ${error}`));
  if (index.studyTarget !== manifest.studyTarget) {
    errors.push('plan-content index studyTarget must match manifest');
  }
  if (index.sourceLocale !== manifest.sourceLocale) {
    errors.push('plan-content index sourceLocale must match manifest');
  }
  if (index.contentVersion !== manifest.contentVersion) {
    errors.push('plan-content index contentVersion must match manifest');
  }
  return errors;
}

function validateEvidenceIdentity(
  manifest: CoursePackManifest,
  evidence: EvidenceEnvelope,
  label: string,
): string[] {
  const errors: string[] = [];
  if (evidence.packId !== manifest.packId) errors.push(`${label} packId must match manifest`);
  if (evidence.studyTarget !== manifest.studyTarget) errors.push(`${label} studyTarget must match manifest`);
  if (evidence.sourceLocale !== manifest.sourceLocale) errors.push(`${label} sourceLocale must match manifest`);
  if (evidence.surface !== manifest.surface) errors.push(`${label} surface must match manifest`);
  if (evidence.contentVersion !== manifest.contentVersion) errors.push(`${label} contentVersion must match manifest`);
  return errors;
}

function validateEvidenceGuards(evidence: EvidenceEnvelope, label: string): string[] {
  const errors: string[] = [];
  if (evidence.status !== 'PASS') errors.push(`${label} status must be PASS`);
  if (evidence.activationApproved !== false) errors.push(`${label} activationApproved must remain false`);
  if (evidence.runtimeManifestRegistered !== false) errors.push(`${label} runtimeManifestRegistered must remain false`);
  if (evidence.remoteLoadingEnabled !== false) errors.push(`${label} remoteLoadingEnabled must remain false`);
  if (evidence.bundledContentRemoved !== false) errors.push(`${label} bundledContentRemoved must remain false`);
  if (evidence.storageMigrationRan !== false) errors.push(`${label} storageMigrationRan must remain false`);
  if (evidence.productionActivationApproved !== false) errors.push(`${label} productionActivationApproved must remain false`);
  if (Array.isArray(evidence.blockers) && evidence.blockers.length > 0) errors.push(`${label} blockers must be empty`);
  return errors;
}

function validateDisabledStorageCloudIsolation(envelope: DisabledStorageCloudIsolationEnvelope): string[] {
  const errors: string[] = [];
  if (!envelope.storageCloud) {
    errors.push('disabled storage/cloud isolation envelope must contain storageCloud payload');
    return errors;
  }
  if (envelope.storageCloud.status !== 'PASS') errors.push('disabled storage/cloud isolation payload status must be PASS');
  if (envelope.storageCloud.storageCloudIsolationComplete !== true) errors.push('disabled storage/cloud isolation must be complete');
  const falseFields: Array<[string, boolean | undefined]> = [
    ['activationApproved', envelope.storageCloud.activationApproved],
    ['runtimeManifestRegistrationApproved', envelope.storageCloud.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', envelope.storageCloud.runtimeLookupApproved],
    ['remoteLoadingApproved', envelope.storageCloud.remoteLoadingApproved],
    ['manifestFetchApproved', envelope.storageCloud.manifestFetchApproved],
    ['packDownloadApproved', envelope.storageCloud.packDownloadApproved],
    ['cacheLookupApproved', envelope.storageCloud.cacheLookupApproved],
    ['cacheReadApproved', envelope.storageCloud.cacheReadApproved],
    ['cacheWriteApproved', envelope.storageCloud.cacheWriteApproved],
    ['cacheRepairApproved', envelope.storageCloud.cacheRepairApproved],
    ['storageMigrationApproved', envelope.storageCloud.storageMigrationApproved],
    ['cloudRestoreMigrationApproved', envelope.storageCloud.cloudRestoreMigrationApproved],
    ['cloudRestoreRewriteApproved', envelope.storageCloud.cloudRestoreRewriteApproved],
    ['cloudRestoreExecutionApproved', envelope.storageCloud.cloudRestoreExecutionApproved],
    ['syncKeyMutationApproved', envelope.storageCloud.syncKeyMutationApproved],
    ['studyTargetMutationApproved', envelope.storageCloud.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', envelope.storageCloud.sourceLocaleMutationApproved],
    ['appLanguageMutationApproved', envelope.storageCloud.appLanguageMutationApproved],
    ['bundledContentRemovalApproved', envelope.storageCloud.bundledContentRemovalApproved],
    ['productionActivationApproved', envelope.storageCloud.productionActivationApproved],
  ];
  for (const [field, value] of falseFields) {
    if (value !== false) errors.push(`disabled storage/cloud isolation ${field} must remain false`);
  }
  if (Array.isArray(envelope.storageCloud.blockers) && envelope.storageCloud.blockers.length > 0) {
    errors.push('disabled storage/cloud isolation blockers must be empty');
  }
  return errors;
}

function validateReviewerLocaleApprovalArtifact(artifact: ReviewerLocaleApprovalArtifact): string[] {
  const errors: string[] = [];
  if (artifact.schemaVersion !== 'plan-content-reviewer-locale-approval-v1') {
    errors.push('reviewer/locale approval artifact schemaVersion must be plan-content-reviewer-locale-approval-v1');
  }
  if (!Array.isArray(artifact.decisions)) {
    errors.push('reviewer/locale approval artifact decisions must be an array');
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
    } else if (arg === '--index') {
      options.indexPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--server-shadow-dual-read-report') {
      options.serverShadowDualReadReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-storage-cloud-isolation') {
      options.disabledStorageCloudIsolationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--reviewer-locale-approval') {
      options.reviewerLocaleApprovalPath = readValue(argv, index, arg);
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
  const result = writePlanContentDisabledReviewerLocaleIntake(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content disabled reviewer/locale intake: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Safety: ${result.report.safetyStatus}`);
  console.log(`Approval: ${result.report.approvalStatus}`);
  console.log(`Reviewer approved rows: ${result.report.reviewerLocale.reviewerApprovedRows}/${result.report.reviewerLocale.totalRows}`);
  console.log(`Locale passed rows: ${result.report.reviewerLocale.localePassedRows}/${result.report.reviewerLocale.totalRows}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
