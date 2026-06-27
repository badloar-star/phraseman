import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  writerPlanPath?: string;
  approvalPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type WriterPlanObject = {
  operation?: string;
  role?: string;
  localPath?: string;
  stagingPath?: string;
  sha256?: string;
  byteSize?: number;
};

type WriterPlan = {
  schemaVersion?: string;
  status?: string;
  mode?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  approvedForServerWrite?: boolean;
  serverWritePermitted?: boolean;
  actualServerWrites?: boolean;
  runtimeManifestRegistered?: boolean;
  networkCalls?: boolean;
  localOnly?: boolean;
  objects?: WriterPlanObject[];
  blockers?: unknown[];
};

type RealApplyApproval = {
  schemaVersion?: string;
  approvalScope?: string;
  approvalText?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  environment?: string;
  activationApproved?: boolean;
  runtimeManifestRegistrationApproved?: boolean;
  remoteLoadingEnabled?: boolean;
  bundledContentRemovalApproved?: boolean;
  storageMigrationApproved?: boolean;
  productionActivationApproved?: boolean;
  approvedAt?: string;
  approvedBy?: string;
};

type ApplyPreflightObject = {
  operation: 'preflight_verify_object';
  role: string;
  localPath: string;
  stagingPath: string;
  sha256: string;
  byteSize: number;
};

type ApplyPreflightReport = {
  schemaVersion: 'plan-content-server-staging-apply-preflight-v1';
  status: 'APPLY_PREFLIGHT_READY' | 'HOLD';
  mode: 'preflight_only';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  writerPlanPath: string;
  approvalPath: string;
  realApplyApprovalAccepted: boolean;
  applyImplementationAllowed: boolean;
  serverWritePermitted: false;
  actualServerWrites: false;
  activationApproved: false;
  runtimeManifestRegistered: false;
  networkCalls: false;
  localOnly: true;
  objects: ApplyPreflightObject[];
  requiredBeforeRealApply: string[];
  blockers: string[];
};

type ApplyPreflightResult = {
  outputPath: string;
  report: ApplyPreflightReport;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_WRITER_PLAN_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-writer-plan.json');
const DEFAULT_APPROVAL_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-apply-approval.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-apply-preflight.json');
const REQUIRED_APPROVAL_TEXT = 'I approve staging/shadow server writes for plan_content only with activationApproved=false';

export function resolvePlanContentApplyPreflightTempPath(
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

export function writePlanContentServerStagingApplyPreflight(
  repoRoot: string,
  options: CliOptions = {},
): ApplyPreflightResult {
  const writerPlanPath = resolvePlanContentApplyPreflightTempPath(
    repoRoot,
    options.writerPlanPath,
    DEFAULT_WRITER_PLAN_PATH,
    'Writer plan input',
  );
  const approvalPath = resolvePlanContentApplyPreflightTempPath(
    repoRoot,
    options.approvalPath,
    DEFAULT_APPROVAL_PATH,
    'Apply approval input',
  );
  const outputPath = resolvePlanContentApplyPreflightTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Apply preflight output',
  );
  const writerPlan = readJsonFile<WriterPlan>(writerPlanPath);
  const approval = fs.existsSync(approvalPath)
    ? readJsonFile<RealApplyApproval>(approvalPath)
    : undefined;
  const blockers = validateWriterPlan(writerPlan);
  const objects = buildPreflightObjects(repoRoot, writerPlan, blockers);
  validateApproval(writerPlan, approval, blockers);

  const approvalAccepted = blockers.length === 0;
  const report: ApplyPreflightReport = {
    schemaVersion: 'plan-content-server-staging-apply-preflight-v1',
    status: approvalAccepted ? 'APPLY_PREFLIGHT_READY' : 'HOLD',
    mode: 'preflight_only',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: writerPlan.packId ?? 'unknown',
    studyTarget: writerPlan.studyTarget ?? 'unknown',
    sourceLocale: writerPlan.sourceLocale ?? 'unknown',
    surface: 'plan_content',
    contentVersion: writerPlan.contentVersion ?? 'unknown',
    writerPlanPath: path.relative(repoRoot, writerPlanPath).replace(/\\/g, '/'),
    approvalPath: path.relative(repoRoot, approvalPath).replace(/\\/g, '/'),
    realApplyApprovalAccepted: approvalAccepted,
    applyImplementationAllowed: approvalAccepted,
    serverWritePermitted: false,
    actualServerWrites: false,
    activationApproved: false,
    runtimeManifestRegistered: false,
    networkCalls: false,
    localOnly: true,
    objects,
    requiredBeforeRealApply: [
      'separate apply-capable command must be implemented and reviewed',
      'server credentials must be scoped to staging/shadow only',
      'apply command must re-run descriptor, approval, writer and preflight gates',
      'runtime manifest registration must remain disabled',
      'production activation requires a later explicit approval',
    ],
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'APPLY_PREFLIGHT_READY') {
    throw new Error(`Server-staging apply preflight failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateWriterPlan(writerPlan: WriterPlan): string[] {
  const blockers: string[] = [];

  if (writerPlan.schemaVersion !== 'plan-content-server-staging-writer-plan-v1') {
    blockers.push('writer plan schemaVersion mismatch');
  }
  if (writerPlan.status !== 'DRY_RUN_READY') {
    blockers.push(`writer plan status must be DRY_RUN_READY, got ${writerPlan.status}`);
  }
  if (writerPlan.mode !== 'dry_run') {
    blockers.push('writer plan mode must be dry_run');
  }
  if (writerPlan.surface !== 'plan_content') {
    blockers.push('writer plan surface must be plan_content');
  }
  if (writerPlan.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (writerPlan.approvedForServerWrite !== false) {
    blockers.push('approvedForServerWrite must remain false in dry-run plan');
  }
  if (writerPlan.serverWritePermitted !== false) {
    blockers.push('serverWritePermitted must remain false in dry-run plan');
  }
  if (writerPlan.actualServerWrites !== false) {
    blockers.push('actualServerWrites must remain false in dry-run plan');
  }
  if (writerPlan.runtimeManifestRegistered !== false) {
    blockers.push('runtimeManifestRegistered must remain false');
  }
  if (writerPlan.networkCalls !== false) {
    blockers.push('networkCalls must remain false');
  }
  if (writerPlan.localOnly !== true) {
    blockers.push('localOnly must remain true');
  }
  if (Array.isArray(writerPlan.blockers) && writerPlan.blockers.length > 0) {
    blockers.push('writer plan blockers must be empty');
  }
  if (!Array.isArray(writerPlan.objects) || writerPlan.objects.length === 0) {
    blockers.push('writer plan objects must be non-empty');
  }

  return blockers;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function validateApproval(
  writerPlan: WriterPlan,
  approval: RealApplyApproval | undefined,
  blockers: string[],
): void {
  if (!approval) {
    blockers.push('real server-staging approval file is required');
    return;
  }

  if (approval.schemaVersion !== 'plan-content-real-server-staging-approval-v1') {
    blockers.push('approval schemaVersion mismatch');
  }
  if (approval.approvalScope !== 'plan_content_server_staging_apply') {
    blockers.push('approvalScope must be plan_content_server_staging_apply');
  }
  if (approval.approvalText !== REQUIRED_APPROVAL_TEXT) {
    blockers.push('approvalText mismatch');
  }
  if (approval.packId !== writerPlan.packId) {
    blockers.push('approval packId must match writer plan');
  }
  if (approval.studyTarget !== writerPlan.studyTarget) {
    blockers.push('approval studyTarget must match writer plan');
  }
  if (approval.sourceLocale !== writerPlan.sourceLocale) {
    blockers.push('approval sourceLocale must match writer plan');
  }
  if (approval.surface !== 'plan_content') {
    blockers.push('approval surface must be plan_content');
  }
  if (approval.contentVersion !== writerPlan.contentVersion) {
    blockers.push('approval contentVersion must match writer plan');
  }
  if (approval.environment !== 'staging_shadow') {
    blockers.push('approval environment must be staging_shadow');
  }
  if (approval.activationApproved !== false) {
    blockers.push('approval activationApproved must be false');
  }
  if (approval.runtimeManifestRegistrationApproved !== false) {
    blockers.push('approval runtimeManifestRegistrationApproved must be false');
  }
  if (approval.remoteLoadingEnabled !== false) {
    blockers.push('approval remoteLoadingEnabled must be false');
  }
  if (approval.bundledContentRemovalApproved !== false) {
    blockers.push('approval bundledContentRemovalApproved must be false');
  }
  if (approval.storageMigrationApproved !== false) {
    blockers.push('approval storageMigrationApproved must be false');
  }
  if (approval.productionActivationApproved !== false) {
    blockers.push('approval productionActivationApproved must be false');
  }
  if (!approval.approvedAt || Number.isNaN(Date.parse(approval.approvedAt))) {
    blockers.push('approval approvedAt must be an ISO date');
  }
  if (!approval.approvedBy || approval.approvedBy.trim().length < 2) {
    blockers.push('approval approvedBy is required');
  }
}

function buildPreflightObjects(
  repoRoot: string,
  writerPlan: WriterPlan,
  blockers: string[],
): ApplyPreflightObject[] {
  if (!Array.isArray(writerPlan.objects)) {
    return [];
  }

  const objects: ApplyPreflightObject[] = [];
  const seenStagingPaths = new Set<string>();
  const tempRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);

  for (const object of writerPlan.objects) {
    const localPath = object.localPath ?? '';
    const stagingPath = object.stagingPath ?? '';
    const absoluteLocalPath = path.resolve(repoRoot, localPath);

    if (object.operation !== 'would_write_object') {
      blockers.push(`writer object operation must be would_write_object: ${localPath}`);
    }
    if (!localPath.startsWith('.codex-tmp/plan-content/')) {
      blockers.push(`object localPath must stay under .codex-tmp/plan-content: ${localPath}`);
    }
    if (absoluteLocalPath !== tempRoot && !absoluteLocalPath.startsWith(`${tempRoot}${path.sep}`)) {
      blockers.push(`object localPath resolves outside plan-content temp root: ${localPath}`);
    }
    if (!fs.existsSync(absoluteLocalPath)) {
      blockers.push(`missing local object: ${localPath}`);
      continue;
    }
    if (!stagingPath || stagingPath.includes('..') || stagingPath.includes('\\') || stagingPath.startsWith('/')) {
      blockers.push(`unsafe staging path: ${stagingPath}`);
    } else if (seenStagingPaths.has(stagingPath)) {
      blockers.push(`duplicate staging path: ${stagingPath}`);
    } else {
      seenStagingPaths.add(stagingPath);
    }
    if (!object.sha256 || !/^[a-f0-9]{64}$/.test(object.sha256)) {
      blockers.push(`bad object hash: ${stagingPath}`);
    }
    if (!Number.isSafeInteger(object.byteSize) || object.byteSize <= 0) {
      blockers.push(`bad object byteSize: ${stagingPath}`);
    }

    const fileContent = fs.readFileSync(absoluteLocalPath);
    const actualHash = createHash('sha256').update(fileContent).digest('hex');
    if (object.sha256 && actualHash !== object.sha256) {
      blockers.push(`local object hash mismatch: ${localPath}`);
    }
    if (object.byteSize && fileContent.byteLength !== object.byteSize) {
      blockers.push(`local object byteSize mismatch: ${localPath}`);
    }

    objects.push({
      operation: 'preflight_verify_object',
      role: object.role ?? 'unknown',
      localPath,
      stagingPath,
      sha256: object.sha256 ?? actualHash,
      byteSize: object.byteSize ?? fileContent.byteLength,
    });
  }

  return objects;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--writer-plan') {
      options.writerPlanPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--approval') {
      options.approvalPath = readValue(argv, index, arg);
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
  const result = writePlanContentServerStagingApplyPreflight(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content server-staging apply preflight: APPLY_PREFLIGHT_READY');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Actual server writes: ${result.report.actualServerWrites}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
