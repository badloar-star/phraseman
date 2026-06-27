import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackReviewerLocaleIntakeReport } from '../app/course_pack_reviewer_locale_intake';
import {
  buildCoursePackReviewerLocaleApprovalPacket,
  validateCoursePackFilledReviewerLocaleApprovalArtifact,
  type CoursePackReviewerLocaleApprovalPacketReport,
  type CoursePackReviewerLocaleFilledApprovalArtifact,
  type CoursePackReviewerLocaleFilledApprovalValidationReport,
} from '../app/course_pack_reviewer_locale_approval_packet';

type CliOptions = {
  disabledReviewerLocaleIntakePath?: string;
  filledApprovalArtifactPath?: string;
  outputPath?: string;
  generatedAt?: string;
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
  reviewerLocale?: CoursePackReviewerLocaleIntakeReport;
  evidenceBlockers?: unknown[];
  blockers?: unknown[];
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
  blockers: [];
};

type ApprovalPacketEnvelope = {
  schemaVersion: 'plan-content-reviewer-locale-approval-packet-report-v1';
  status: 'PASS' | 'HOLD';
  generatedAt: string;
  disabledReviewerLocaleIntakePath: string;
  filledApprovalArtifactPath?: string;
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
  packet: CoursePackReviewerLocaleApprovalPacketReport;
  filledArtifactValidation: MissingFilledApprovalValidation | CoursePackReviewerLocaleFilledApprovalValidationReport;
  evidenceBlockers: string[];
  blockers: string[];
};

type ApprovalPacketResult = {
  outputPath: string;
  report: ApprovalPacketEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_INTAKE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-reviewer-locale-intake.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'reviewer-locale-approval-packet.json');

export function resolvePlanContentReviewerLocaleApprovalPacketTempPath(
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

export function writePlanContentReviewerLocaleApprovalPacket(
  repoRoot: string,
  options: CliOptions = {},
): ApprovalPacketResult {
  const disabledReviewerLocaleIntakePath = resolvePlanContentReviewerLocaleApprovalPacketTempPath(
    repoRoot,
    options.disabledReviewerLocaleIntakePath,
    DEFAULT_INTAKE_PATH,
    'Disabled reviewer/locale intake input',
  );
  const filledApprovalArtifactPath = options.filledApprovalArtifactPath
    ? resolvePlanContentReviewerLocaleApprovalPacketTempPath(
      repoRoot,
      options.filledApprovalArtifactPath,
      options.filledApprovalArtifactPath,
      'Filled reviewer/locale approval artifact input',
    )
    : null;
  const outputPath = resolvePlanContentReviewerLocaleApprovalPacketTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Reviewer/locale approval packet output',
  );

  const intakeEnvelope = readJsonFile<DisabledReviewerLocaleIntakeEnvelope>(disabledReviewerLocaleIntakePath);
  const evidenceBlockers = validateIntakeEnvelope(intakeEnvelope);
  const intake = intakeEnvelope.reviewerLocale;
  const packet = intake
    ? buildCoursePackReviewerLocaleApprovalPacket({
      intake,
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
    })
    : emptyPacketFromEnvelope(intakeEnvelope);

  const filledArtifact = filledApprovalArtifactPath
    ? readJsonFile<Partial<CoursePackReviewerLocaleFilledApprovalArtifact>>(filledApprovalArtifactPath)
    : null;
  const filledArtifactValidation = filledArtifact
    ? validateCoursePackFilledReviewerLocaleApprovalArtifact(packet, filledArtifact)
    : missingFilledArtifactValidation(packet);

  const filledArtifactBlockers = filledApprovalArtifactPath && filledArtifactValidation.status !== 'PASS'
    ? filledArtifactValidation.blockers
    : [];
  const blockers = [
    ...evidenceBlockers,
    ...packet.blockers,
    ...filledArtifactBlockers,
  ];
  const report: ApprovalPacketEnvelope = {
    schemaVersion: 'plan-content-reviewer-locale-approval-packet-report-v1',
    status: blockers.length === 0 && packet.status === 'PASS' ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    disabledReviewerLocaleIntakePath: relativePath(repoRoot, disabledReviewerLocaleIntakePath),
    ...(filledApprovalArtifactPath ? {
      filledApprovalArtifactPath: relativePath(repoRoot, filledApprovalArtifactPath),
    } : {}),
    packId: packet.packId,
    studyTarget: packet.studyTarget,
    sourceLocale: packet.sourceLocale,
    surface: packet.surface,
    contentVersion: packet.contentVersion,
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
    packet,
    filledArtifactValidation,
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (evidenceBlockers.length > 0 || packet.status !== 'PASS') {
    throw new Error(`Reviewer/locale approval packet failed: ${blockers.join('; ')}`);
  }
  if (filledApprovalArtifactPath && filledArtifactValidation.status !== 'PASS') {
    throw new Error(`Filled reviewer/locale approval artifact failed: ${filledArtifactValidation.blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateIntakeEnvelope(envelope: DisabledReviewerLocaleIntakeEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.schemaVersion !== 'plan-content-disabled-reviewer-locale-intake-report-v1') {
    errors.push('disabled reviewer/locale intake schemaVersion must be plan-content-disabled-reviewer-locale-intake-report-v1');
  }
  if (envelope.safetyStatus !== 'PASS') {
    errors.push('disabled reviewer/locale intake safetyStatus must be PASS');
  }
  if (!envelope.reviewerLocale) {
    errors.push('disabled reviewer/locale intake must contain reviewerLocale payload');
  } else if (envelope.reviewerLocale.safetyStatus !== 'PASS') {
    errors.push('disabled reviewer/locale intake reviewerLocale safetyStatus must be PASS');
  }
  if (Array.isArray(envelope.evidenceBlockers) && envelope.evidenceBlockers.length > 0) {
    errors.push('disabled reviewer/locale intake evidenceBlockers must be empty');
  }
  return errors;
}

function emptyPacketFromEnvelope(
  envelope: DisabledReviewerLocaleIntakeEnvelope,
): CoursePackReviewerLocaleApprovalPacketReport {
  const blockers = ['disabled reviewer/locale intake reviewerLocale payload is missing'];
  return {
    schemaVersion: 'course-pack-reviewer-locale-approval-packet-v1',
    status: 'HOLD',
    packetStatus: 'HOLD',
    packId: envelope.packId ?? '',
    studyTarget: envelope.studyTarget ?? '',
    sourceLocale: envelope.sourceLocale ?? '',
    surface: envelope.surface ?? '',
    contentVersion: envelope.contentVersion ?? '',
    remoteLoadingEnabled: false,
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
    totalRows: 0,
    sourceIntakeStatus: 'HOLD',
    sourceIntakeSafetyStatus: 'HOLD',
    sourceIntakeApprovalStatus: 'HOLD',
    sourceReviewerApprovedRows: 0,
    sourceLocalePassedRows: 0,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    reviewerLocaleApprovalComplete: false,
    activationApprovalComplete: false,
    packetRows: [],
    blockers,
  };
}

function missingFilledArtifactValidation(
  packet: CoursePackReviewerLocaleApprovalPacketReport,
): MissingFilledApprovalValidation {
  return {
    schemaVersion: 'course-pack-reviewer-locale-filled-approval-validation-v1',
    status: 'missing',
    decisionsValidForIntake: false,
    packId: packet.packId,
    studyTarget: packet.studyTarget,
    sourceLocale: packet.sourceLocale,
    surface: packet.surface,
    contentVersion: packet.contentVersion,
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
    totalRows: packet.totalRows,
    decisionRows: 0,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    reviewerLocaleApprovalComplete: false,
    activationApprovalComplete: false,
    blockers: [],
  };
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
    if (arg === '--disabled-reviewer-locale-intake') {
      options.disabledReviewerLocaleIntakePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--filled-approval-artifact') {
      options.filledApprovalArtifactPath = readValue(argv, index, arg);
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
  const result = writePlanContentReviewerLocaleApprovalPacket(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content reviewer/locale approval packet: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Packet: ${result.report.packet.packetStatus}`);
  console.log(`Rows queued: ${result.report.packet.totalRows}`);
  console.log(`Filled artifact validation: ${result.report.filledArtifactValidation.status}`);
  console.log(`Reviewer approved rows: ${result.report.packet.reviewerApprovedRows}/${result.report.packet.totalRows}`);
  console.log(`Locale passed rows: ${result.report.packet.localePassedRows}/${result.report.packet.totalRows}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
