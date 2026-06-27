import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackReviewerLocaleIntakeReport } from '../app/course_pack_reviewer_locale_intake';
import {
  validateCoursePackFilledReviewerLocaleApprovalArtifact,
  type CoursePackReviewerLocaleApprovalPacketReport,
  type CoursePackReviewerLocaleFilledApprovalArtifact,
  type CoursePackReviewerLocaleFilledApprovalValidationReport,
} from '../app/course_pack_reviewer_locale_approval_packet';
import { writePlanContentDisabledReviewerLocaleIntake } from './plan_content_disabled_reviewer_locale_intake';

type CliOptions = {
  approvalPacketReportPath?: string;
  disabledReviewerLocaleIntakePath?: string;
  filledApprovalArtifactPath?: string;
  outputPath?: string;
  intakeDryRunOutputPath?: string;
  generatedAt?: string;
};

type MissingFilledApprovalValidation = {
  schemaVersion: 'course-pack-reviewer-locale-filled-approval-validation-v1';
  status: 'missing';
  decisionsValidForIntake: false;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  runtimeLookupApproved: false;
  remoteLoadingApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  cloudRestoreRewriteApproved: false;
  studyTargetMutationApproved: false;
  sourceLocaleMutationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  totalRows: number;
  decisionRows: 0;
  reviewerApprovedRows: 0;
  localePassedRows: 0;
  reviewerLocaleApprovalComplete: false;
  activationApprovalComplete: false;
  blockers: string[];
};

type ApprovalPacketEnvelope = {
  schemaVersion?: string;
  status?: 'PASS' | 'HOLD';
  disabledReviewerLocaleIntakePath?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
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
  cloudRestoreRewriteApproved?: boolean;
  studyTargetMutationApproved?: boolean;
  sourceLocaleMutationApproved?: boolean;
  bundledContentRemovalApproved?: boolean;
  productionActivationApproved?: boolean;
  packet?: CoursePackReviewerLocaleApprovalPacketReport;
  blockers?: unknown[];
};

type DisabledReviewerLocaleIntakeEnvelope = {
  schemaVersion?: string;
  status?: 'PASS' | 'HOLD';
  safetyStatus?: 'PASS' | 'HOLD';
  approvalStatus?: 'PASS' | 'HOLD';
  generatedAt?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  manifestPath?: string;
  indexPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledStorageCloudIsolationPath?: string;
  reviewerLocale?: CoursePackReviewerLocaleIntakeReport;
  evidenceBlockers?: unknown[];
  blockers?: unknown[];
};

type IntakeDryRunSummary = {
  status: 'PASS' | 'HOLD' | 'missing' | 'skipped';
  path?: string;
  safetyStatus: 'PASS' | 'HOLD' | 'missing' | 'skipped';
  approvalStatus: 'PASS' | 'HOLD' | 'missing' | 'skipped';
  reviewerApprovedRows: number;
  localePassedRows: number;
  totalRows: number;
  reviewerLocaleApprovalComplete: boolean;
  blockers: string[];
};

type ApprovalIntakeDryRunEnvelope = {
  schemaVersion: 'plan-content-reviewer-locale-approval-intake-dry-run-report-v1';
  status: 'PASS' | 'HOLD';
  dryRunStatus: 'READY_FOR_INTAKE' | 'MISSING_FILLED_ARTIFACT' | 'HOLD';
  generatedAt: string;
  approvalPacketReportPath: string;
  disabledReviewerLocaleIntakePath: string;
  filledApprovalArtifactPath?: string;
  intakeDryRunOutputPath?: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  runtimeLookupApproved: false;
  remoteLoadingApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  cloudRestoreRewriteApproved: false;
  studyTargetMutationApproved: false;
  sourceLocaleMutationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  sourcePacketStatus: 'PASS' | 'HOLD';
  sourcePacketRows: number;
  sourcePacketReviewerApprovedRows: number;
  sourcePacketLocalePassedRows: number;
  filledArtifactValidation: MissingFilledApprovalValidation | CoursePackReviewerLocaleFilledApprovalValidationReport;
  intakeDryRun: IntakeDryRunSummary;
  evidenceBlockers: string[];
  blockers: string[];
};

type ApprovalIntakeDryRunResult = {
  outputPath: string;
  report: ApprovalIntakeDryRunEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_PACKET_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-packet.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-intake-dry-run.json');
const DEFAULT_INTAKE_DRY_RUN_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-intake-dry-run.intake.json');

export function resolvePlanContentReviewerLocaleApprovalIntakeDryRunTempPath(
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

export function writePlanContentReviewerLocaleApprovalIntakeDryRun(
  repoRoot: string,
  options: CliOptions = {},
): ApprovalIntakeDryRunResult {
  const approvalPacketReportPath = resolvePlanContentReviewerLocaleApprovalIntakeDryRunTempPath(
    repoRoot,
    options.approvalPacketReportPath,
    DEFAULT_PACKET_PATH,
    'Reviewer/locale approval packet report input',
  );
  const outputPath = resolvePlanContentReviewerLocaleApprovalIntakeDryRunTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Reviewer/locale approval intake dry-run output',
  );
  const intakeDryRunOutputPath = resolvePlanContentReviewerLocaleApprovalIntakeDryRunTempPath(
    repoRoot,
    options.intakeDryRunOutputPath,
    DEFAULT_INTAKE_DRY_RUN_OUTPUT_PATH,
    'Reviewer/locale approval intake dry-run nested output',
  );

  const packetEnvelope = readJsonFile<ApprovalPacketEnvelope>(approvalPacketReportPath);
  const packet = packetEnvelope.packet;
  const evidenceBlockers = validatePacketEnvelope(packetEnvelope);
  const disabledReviewerLocaleIntakePath = resolvePlanContentReviewerLocaleApprovalIntakeDryRunTempPath(
    repoRoot,
    options.disabledReviewerLocaleIntakePath ?? packetEnvelope.disabledReviewerLocaleIntakePath,
    packetEnvelope.disabledReviewerLocaleIntakePath ?? path.join(DEFAULT_RUN_ROOT, 'disabled-reviewer-locale-intake.json'),
    'Disabled reviewer/locale intake input',
  );
  const sourceIntakeEnvelope = readJsonFile<DisabledReviewerLocaleIntakeEnvelope>(disabledReviewerLocaleIntakePath);
  evidenceBlockers.push(...validateSourceIntakeEnvelope(packetEnvelope, sourceIntakeEnvelope));

  const filledApprovalArtifactPath = options.filledApprovalArtifactPath
    ? resolvePlanContentReviewerLocaleApprovalIntakeDryRunTempPath(
      repoRoot,
      options.filledApprovalArtifactPath,
      options.filledApprovalArtifactPath,
      'Filled reviewer/locale approval artifact input',
    )
    : null;
  const filledArtifact = filledApprovalArtifactPath
    ? readJsonFile<Partial<CoursePackReviewerLocaleFilledApprovalArtifact>>(filledApprovalArtifactPath)
    : null;
  const filledArtifactValidation = packet && filledArtifact
    ? validateCoursePackFilledReviewerLocaleApprovalArtifact(packet, filledArtifact)
    : missingFilledArtifactValidation(packetEnvelope);

  let intakeDryRun = missingOrSkippedIntakeDryRun(
    filledApprovalArtifactPath ? 'skipped' : 'missing',
    packet?.totalRows ?? 0,
    filledArtifactValidation.status === 'missing'
      ? ['filled reviewer/locale approval artifact is missing']
      : ['filled reviewer/locale approval artifact validation must pass before intake dry-run'],
  );

  if (packet && filledApprovalArtifactPath && filledArtifactValidation.status === 'PASS') {
    const nested = writePlanContentDisabledReviewerLocaleIntake(repoRoot, {
      manifestPath: requiredRelativePath(sourceIntakeEnvelope.manifestPath, 'source intake manifestPath'),
      indexPath: requiredRelativePath(sourceIntakeEnvelope.indexPath, 'source intake indexPath'),
      serverShadowDualReadReportPath: requiredRelativePath(
        sourceIntakeEnvelope.serverShadowDualReadReportPath,
        'source intake serverShadowDualReadReportPath',
      ),
      disabledStorageCloudIsolationPath: requiredRelativePath(
        sourceIntakeEnvelope.disabledStorageCloudIsolationPath,
        'source intake disabledStorageCloudIsolationPath',
      ),
      reviewerLocaleApprovalPath: relativePath(repoRoot, filledApprovalArtifactPath),
      outputPath: relativePath(repoRoot, intakeDryRunOutputPath),
      generatedAt: options.generatedAt,
    });
    intakeDryRun = {
      status: nested.report.status,
      path: relativePath(repoRoot, intakeDryRunOutputPath),
      safetyStatus: nested.report.safetyStatus,
      approvalStatus: nested.report.approvalStatus,
      reviewerApprovedRows: nested.report.reviewerLocale.reviewerApprovedRows,
      localePassedRows: nested.report.reviewerLocale.localePassedRows,
      totalRows: nested.report.reviewerLocale.totalRows,
      reviewerLocaleApprovalComplete: nested.report.reviewerLocale.reviewerLocaleApprovalComplete,
      blockers: nested.report.blockers,
    };
  }

  const filledArtifactBlockers = filledApprovalArtifactPath && filledArtifactValidation.status !== 'PASS'
    ? filledArtifactValidation.blockers
    : [];
  const missingArtifactBlockers = filledApprovalArtifactPath
    ? []
    : ['filled reviewer/locale approval artifact is missing'];
  const intakeBlockers = intakeDryRun.status === 'PASS'
    ? []
    : intakeDryRun.blockers;
  const blockers = uniqueStrings([
    ...evidenceBlockers,
    ...filledArtifactBlockers,
    ...missingArtifactBlockers,
    ...intakeBlockers,
  ]);
  const readyForIntake = evidenceBlockers.length === 0
    && filledArtifactValidation.status === 'PASS'
    && intakeDryRun.status === 'PASS'
    && intakeDryRun.approvalStatus === 'PASS'
    && intakeDryRun.reviewerApprovedRows === intakeDryRun.totalRows
    && intakeDryRun.localePassedRows === intakeDryRun.totalRows
    && intakeDryRun.totalRows > 0;

  const report: ApprovalIntakeDryRunEnvelope = {
    schemaVersion: 'plan-content-reviewer-locale-approval-intake-dry-run-report-v1',
    status: readyForIntake ? 'PASS' : 'HOLD',
    dryRunStatus: readyForIntake
      ? 'READY_FOR_INTAKE'
      : filledApprovalArtifactPath
        ? 'HOLD'
        : 'MISSING_FILLED_ARTIFACT',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    approvalPacketReportPath: relativePath(repoRoot, approvalPacketReportPath),
    disabledReviewerLocaleIntakePath: relativePath(repoRoot, disabledReviewerLocaleIntakePath),
    ...(filledApprovalArtifactPath ? {
      filledApprovalArtifactPath: relativePath(repoRoot, filledApprovalArtifactPath),
      intakeDryRunOutputPath: relativePath(repoRoot, intakeDryRunOutputPath),
    } : {}),
    packId: packetEnvelope.packId ?? packet?.packId ?? '',
    studyTarget: packetEnvelope.studyTarget ?? packet?.studyTarget ?? '',
    sourceLocale: packetEnvelope.sourceLocale ?? packet?.sourceLocale ?? '',
    surface: packetEnvelope.surface ?? packet?.surface ?? '',
    contentVersion: packetEnvelope.contentVersion ?? packet?.contentVersion ?? '',
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
    sourcePacketStatus: packet?.status ?? 'HOLD',
    sourcePacketRows: packet?.totalRows ?? 0,
    sourcePacketReviewerApprovedRows: packet?.reviewerApprovedRows ?? 0,
    sourcePacketLocalePassedRows: packet?.localePassedRows ?? 0,
    filledArtifactValidation,
    intakeDryRun,
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (filledApprovalArtifactPath && report.status !== 'PASS') {
    throw new Error(`Reviewer/locale approval intake dry-run failed: ${blockers.join('; ')}`);
  }
  if (evidenceBlockers.length > 0) {
    throw new Error(`Reviewer/locale approval intake dry-run evidence failed: ${evidenceBlockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validatePacketEnvelope(envelope: ApprovalPacketEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.schemaVersion !== 'plan-content-reviewer-locale-approval-packet-report-v1') {
    errors.push('reviewer/locale approval packet report schemaVersion must be plan-content-reviewer-locale-approval-packet-report-v1');
  }
  if (envelope.status !== 'PASS') {
    errors.push('reviewer/locale approval packet report status must be PASS');
  }
  if (!envelope.packet) {
    errors.push('reviewer/locale approval packet report must contain packet payload');
  } else if (envelope.packet.status !== 'PASS') {
    errors.push('reviewer/locale approval packet payload status must be PASS');
  } else if (envelope.packet.packetStatus !== 'READY_FOR_REVIEW') {
    errors.push('reviewer/locale approval packet payload must be READY_FOR_REVIEW');
  }
  for (const [label, value] of packetFalseFlags(envelope)) {
    if (value !== false) errors.push(`reviewer/locale approval packet report ${label} must remain false`);
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('reviewer/locale approval packet report blockers must be empty');
  }
  return errors;
}

function validateSourceIntakeEnvelope(
  packetEnvelope: ApprovalPacketEnvelope,
  intakeEnvelope: DisabledReviewerLocaleIntakeEnvelope,
): string[] {
  const errors: string[] = [];
  if (intakeEnvelope.schemaVersion !== 'plan-content-disabled-reviewer-locale-intake-report-v1') {
    errors.push('source disabled reviewer/locale intake schemaVersion must be plan-content-disabled-reviewer-locale-intake-report-v1');
  }
  if (intakeEnvelope.safetyStatus !== 'PASS') {
    errors.push('source disabled reviewer/locale intake safetyStatus must be PASS');
  }
  if (!intakeEnvelope.reviewerLocale) {
    errors.push('source disabled reviewer/locale intake must contain reviewerLocale payload');
  }
  for (const field of ['packId', 'studyTarget', 'sourceLocale', 'surface', 'contentVersion'] as const) {
    const packetValue = packetEnvelope[field] ?? packetEnvelope.packet?.[field];
    if (intakeEnvelope[field] !== packetValue) {
      errors.push(`source disabled reviewer/locale intake ${field} must match approval packet report`);
    }
  }
  if (Array.isArray(intakeEnvelope.evidenceBlockers) && intakeEnvelope.evidenceBlockers.length > 0) {
    errors.push('source disabled reviewer/locale intake evidenceBlockers must be empty');
  }
  return errors;
}

function missingFilledArtifactValidation(
  packetEnvelope: ApprovalPacketEnvelope,
): MissingFilledApprovalValidation {
  const packet = packetEnvelope.packet;
  return {
    schemaVersion: 'course-pack-reviewer-locale-filled-approval-validation-v1',
    status: 'missing',
    decisionsValidForIntake: false,
    packId: packetEnvelope.packId ?? packet?.packId ?? '',
    studyTarget: packetEnvelope.studyTarget ?? packet?.studyTarget ?? '',
    sourceLocale: packetEnvelope.sourceLocale ?? packet?.sourceLocale ?? '',
    surface: packetEnvelope.surface ?? packet?.surface ?? '',
    contentVersion: packetEnvelope.contentVersion ?? packet?.contentVersion ?? '',
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
    totalRows: packet?.totalRows ?? 0,
    decisionRows: 0,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    reviewerLocaleApprovalComplete: false,
    activationApprovalComplete: false,
    blockers: ['filled reviewer/locale approval artifact is missing'],
  };
}

function missingOrSkippedIntakeDryRun(
  status: 'missing' | 'skipped',
  totalRows: number,
  blockers: string[],
): IntakeDryRunSummary {
  return {
    status,
    safetyStatus: status,
    approvalStatus: status,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    totalRows,
    reviewerLocaleApprovalComplete: false,
    blockers,
  };
}

function packetFalseFlags(envelope: ApprovalPacketEnvelope): Array<[string, boolean | undefined]> {
  return [
    ['activationApproved', envelope.activationApproved],
    ['runtimeManifestRegistrationApproved', envelope.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', envelope.runtimeLookupApproved],
    ['remoteLoadingApproved', envelope.remoteLoadingApproved],
    ['manifestFetchApproved', envelope.manifestFetchApproved],
    ['packDownloadApproved', envelope.packDownloadApproved],
    ['cacheLookupApproved', envelope.cacheLookupApproved],
    ['cacheReadApproved', envelope.cacheReadApproved],
    ['cacheWriteApproved', envelope.cacheWriteApproved],
    ['cacheRepairApproved', envelope.cacheRepairApproved],
    ['storageMigrationApproved', envelope.storageMigrationApproved],
    ['cloudRestoreRewriteApproved', envelope.cloudRestoreRewriteApproved],
    ['studyTargetMutationApproved', envelope.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', envelope.sourceLocaleMutationApproved],
    ['bundledContentRemovalApproved', envelope.bundledContentRemovalApproved],
    ['productionActivationApproved', envelope.productionActivationApproved],
  ];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function requiredRelativePath(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
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
    if (arg === '--approval-packet-report') {
      options.approvalPacketReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-reviewer-locale-intake') {
      options.disabledReviewerLocaleIntakePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--filled-approval-artifact') {
      options.filledApprovalArtifactPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--intake-dry-run-out') {
      options.intakeDryRunOutputPath = readValue(argv, index, arg);
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
  const result = writePlanContentReviewerLocaleApprovalIntakeDryRun(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content reviewer/locale approval intake dry-run: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Dry-run: ${result.report.dryRunStatus}`);
  console.log(`Filled artifact validation: ${result.report.filledArtifactValidation.status}`);
  console.log(`Intake approval: ${result.report.intakeDryRun.approvalStatus}`);
  console.log(`Reviewer approved rows: ${result.report.intakeDryRun.reviewerApprovedRows}/${result.report.intakeDryRun.totalRows}`);
  console.log(`Locale passed rows: ${result.report.intakeDryRun.localePassedRows}/${result.report.intakeDryRun.totalRows}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
