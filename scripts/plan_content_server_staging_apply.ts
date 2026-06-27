import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  preflightPath?: string;
  writerPlanPath?: string;
  approvalPath?: string;
  outputPath?: string;
  generatedAt?: string;
  applyRequested?: boolean;
};

type ApplyPreflightObject = {
  operation?: string;
  role?: string;
  localPath?: string;
  stagingPath?: string;
  sha256?: string;
  byteSize?: number;
};

type ApplyPreflightReport = {
  schemaVersion?: string;
  status?: string;
  mode?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  realApplyApprovalAccepted?: boolean;
  applyImplementationAllowed?: boolean;
  serverWritePermitted?: boolean;
  actualServerWrites?: boolean;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  networkCalls?: boolean;
  localOnly?: boolean;
  objects?: ApplyPreflightObject[];
  blockers?: unknown[];
};

type WriterPlan = {
  schemaVersion?: string;
  status?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  objects?: unknown[];
  blockers?: unknown[];
};

type RealApplyApproval = {
  schemaVersion?: string;
  approvalScope?: string;
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
};

type ApplyOperation = {
  operation: 'would_upload_object' | 'uploaded_object';
  role: string;
  localPath: string;
  stagingPath: string;
  sha256: string;
  byteSize: number;
};

type ApplyReport = {
  schemaVersion: 'plan-content-server-staging-apply-report-v1';
  status: 'DRY_RUN_READY' | 'APPLY_COMPLETE' | 'APPLY_BLOCKED' | 'APPLY_FAILED';
  mode: 'dry_run' | 'apply';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  preflightPath: string;
  writerPlanPath: string;
  approvalPath: string;
  bucket: string | null;
  applyRequested: boolean;
  applyEnvConfirmed: boolean;
  activationApproved: false;
  runtimeManifestRegistered: false;
  remoteLoadingEnabled: false;
  bundledContentRemoved: false;
  storageMigrationRan: false;
  productionActivationApproved: false;
  serverWritePermitted: boolean;
  actualServerWrites: boolean;
  operations: ApplyOperation[];
  blockers: string[];
};

type ApplyResult = {
  outputPath: string;
  report: ApplyReport;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_PREFLIGHT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-apply-preflight.json');
const DEFAULT_WRITER_PLAN_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-writer-plan.json');
const DEFAULT_APPROVAL_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-apply-approval.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-apply-report.json');
const APPLY_CONFIRMATION = 'staging_shadow_only';

export function resolvePlanContentApplyTempPath(
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

export async function runPlanContentServerStagingApply(
  repoRoot: string,
  options: CliOptions = {},
): Promise<ApplyResult> {
  const preflightPath = resolvePlanContentApplyTempPath(
    repoRoot,
    options.preflightPath,
    DEFAULT_PREFLIGHT_PATH,
    'Apply preflight input',
  );
  const writerPlanPath = resolvePlanContentApplyTempPath(
    repoRoot,
    options.writerPlanPath,
    DEFAULT_WRITER_PLAN_PATH,
    'Writer plan input',
  );
  const approvalPath = resolvePlanContentApplyTempPath(
    repoRoot,
    options.approvalPath,
    DEFAULT_APPROVAL_PATH,
    'Apply approval input',
  );
  const outputPath = resolvePlanContentApplyTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Apply report output',
  );
  const preflight = readJsonFile<ApplyPreflightReport>(preflightPath);
  const writerPlan = readJsonFile<WriterPlan>(writerPlanPath);
  const approval = readJsonFile<RealApplyApproval>(approvalPath);
  const applyRequested = options.applyRequested === true;
  const blockers = validateInputs(preflight, writerPlan, approval, applyRequested);
  const operations = buildOperations(repoRoot, preflight, blockers);
  const bucket = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET ?? null;
  const applyEnvConfirmed = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_APPLY === APPLY_CONFIRMATION;
  const token = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN ?? '';

  if (applyRequested) {
    if (!applyEnvConfirmed) {
      blockers.push(`PHRASEMAN_PLAN_CONTENT_STAGING_APPLY must equal ${APPLY_CONFIRMATION}`);
    }
    if (!bucket) {
      blockers.push('PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET is required for apply mode');
    }
    if (!token) {
      blockers.push('PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN is required for apply mode');
    }
  }

  const report: ApplyReport = {
    schemaVersion: 'plan-content-server-staging-apply-report-v1',
    status: determineInitialStatus(applyRequested, blockers),
    mode: applyRequested ? 'apply' : 'dry_run',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: preflight.packId ?? 'unknown',
    studyTarget: preflight.studyTarget ?? 'unknown',
    sourceLocale: preflight.sourceLocale ?? 'unknown',
    surface: 'plan_content',
    contentVersion: preflight.contentVersion ?? 'unknown',
    preflightPath: path.relative(repoRoot, preflightPath).replace(/\\/g, '/'),
    writerPlanPath: path.relative(repoRoot, writerPlanPath).replace(/\\/g, '/'),
    approvalPath: path.relative(repoRoot, approvalPath).replace(/\\/g, '/'),
    bucket,
    applyRequested,
    applyEnvConfirmed,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    serverWritePermitted: applyRequested && blockers.length === 0,
    actualServerWrites: false,
    operations,
    blockers,
  };

  if (applyRequested && blockers.length === 0) {
    try {
      await uploadOperations(repoRoot, operations, bucket!, token);
      report.actualServerWrites = true;
      report.status = 'APPLY_COMPLETE';
      report.operations = operations.map((operation) => ({
        ...operation,
        operation: 'uploaded_object',
      }));
    } catch (error) {
      report.actualServerWrites = false;
      report.serverWritePermitted = false;
      report.status = 'APPLY_FAILED';
      report.blockers.push(error instanceof Error ? error.message : String(error));
    }
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'DRY_RUN_READY' && report.status !== 'APPLY_COMPLETE') {
    throw new Error(`Server-staging apply failed: ${report.blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateInputs(
  preflight: ApplyPreflightReport,
  writerPlan: WriterPlan,
  approval: RealApplyApproval,
  applyRequested: boolean,
): string[] {
  const blockers: string[] = [];

  if (preflight.schemaVersion !== 'plan-content-server-staging-apply-preflight-v1') {
    blockers.push('preflight schemaVersion mismatch');
  }
  if (preflight.status !== 'APPLY_PREFLIGHT_READY') {
    blockers.push(`preflight status must be APPLY_PREFLIGHT_READY, got ${preflight.status}`);
  }
  if (preflight.mode !== 'preflight_only') {
    blockers.push('preflight mode must be preflight_only');
  }
  if (writerPlan.schemaVersion !== 'plan-content-server-staging-writer-plan-v1') {
    blockers.push('writer plan schemaVersion mismatch');
  }
  if (writerPlan.status !== 'DRY_RUN_READY') {
    blockers.push(`writer plan status must be DRY_RUN_READY, got ${writerPlan.status}`);
  }
  if (approval.schemaVersion !== 'plan-content-real-server-staging-approval-v1') {
    blockers.push('approval schemaVersion mismatch');
  }
  if (approval.approvalScope !== 'plan_content_server_staging_apply') {
    blockers.push('approvalScope must be plan_content_server_staging_apply');
  }
  if (approval.environment !== 'staging_shadow') {
    blockers.push('approval environment must be staging_shadow');
  }
  if (preflight.packId !== writerPlan.packId || preflight.packId !== approval.packId) {
    blockers.push('packId must match preflight, writer plan and approval');
  }
  if (preflight.studyTarget !== writerPlan.studyTarget || preflight.studyTarget !== approval.studyTarget) {
    blockers.push('studyTarget must match preflight, writer plan and approval');
  }
  if (preflight.sourceLocale !== writerPlan.sourceLocale || preflight.sourceLocale !== approval.sourceLocale) {
    blockers.push('sourceLocale must match preflight, writer plan and approval');
  }
  if (preflight.surface !== 'plan_content' || writerPlan.surface !== 'plan_content' || approval.surface !== 'plan_content') {
    blockers.push('surface must be plan_content');
  }
  if (preflight.contentVersion !== writerPlan.contentVersion || preflight.contentVersion !== approval.contentVersion) {
    blockers.push('contentVersion must match preflight, writer plan and approval');
  }
  if (preflight.realApplyApprovalAccepted !== true || preflight.applyImplementationAllowed !== true) {
    blockers.push('preflight approval must be accepted before apply command can run');
  }
  if (preflight.serverWritePermitted !== false || preflight.actualServerWrites !== false) {
    blockers.push('preflight must not permit or perform server writes');
  }
  if (preflight.activationApproved !== false || approval.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (preflight.runtimeManifestRegistered !== false || approval.runtimeManifestRegistrationApproved !== false) {
    blockers.push('runtimeManifestRegistered must remain false');
  }
  if (approval.remoteLoadingEnabled !== false) {
    blockers.push('remoteLoadingEnabled must remain false');
  }
  if (approval.bundledContentRemovalApproved !== false) {
    blockers.push('bundledContentRemovalApproved must remain false');
  }
  if (approval.storageMigrationApproved !== false) {
    blockers.push('storageMigrationApproved must remain false');
  }
  if (approval.productionActivationApproved !== false) {
    blockers.push('productionActivationApproved must remain false');
  }
  if (preflight.networkCalls !== false && !applyRequested) {
    blockers.push('preflight networkCalls must remain false for dry run');
  }
  if (!Array.isArray(preflight.objects) || preflight.objects.length === 0) {
    blockers.push('preflight objects must be non-empty');
  }
  if (Array.isArray(preflight.blockers) && preflight.blockers.length > 0) {
    blockers.push('preflight blockers must be empty');
  }
  if (Array.isArray(writerPlan.blockers) && writerPlan.blockers.length > 0) {
    blockers.push('writer plan blockers must be empty');
  }

  return blockers;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function buildOperations(
  repoRoot: string,
  preflight: ApplyPreflightReport,
  blockers: string[],
): ApplyOperation[] {
  if (!Array.isArray(preflight.objects)) {
    return [];
  }

  const operations: ApplyOperation[] = [];
  const seenStagingPaths = new Set<string>();
  const tempRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);

  for (const object of preflight.objects) {
    const localPath = object.localPath ?? '';
    const stagingPath = object.stagingPath ?? '';
    const absoluteLocalPath = path.resolve(repoRoot, localPath);

    if (object.operation !== 'preflight_verify_object') {
      blockers.push(`preflight object operation must be preflight_verify_object: ${localPath}`);
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

    operations.push({
      operation: 'would_upload_object',
      role: object.role ?? 'unknown',
      localPath,
      stagingPath,
      sha256: object.sha256 ?? actualHash,
      byteSize: object.byteSize ?? fileContent.byteLength,
    });
  }

  return operations;
}

function determineInitialStatus(applyRequested: boolean, blockers: readonly string[]): ApplyReport['status'] {
  if (blockers.length > 0) {
    return 'APPLY_BLOCKED';
  }
  return applyRequested ? 'APPLY_BLOCKED' : 'DRY_RUN_READY';
}

async function uploadOperations(
  repoRoot: string,
  operations: readonly ApplyOperation[],
  bucket: string,
  token: string,
): Promise<void> {
  for (const operation of operations) {
    const localPath = path.resolve(repoRoot, operation.localPath);
    const content = fs.readFileSync(localPath);
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(operation.stagingPath)}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'x-goog-meta-phraseman-pack-hash': operation.sha256,
        'x-goog-meta-phraseman-staging-shadow': 'true',
      },
      body: content,
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`upload failed for ${operation.stagingPath}: ${response.status} ${body.slice(0, 200)}`);
    }
  }
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--preflight') {
      options.preflightPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--writer-plan') {
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
    } else if (arg === '--dry-run') {
      options.applyRequested = false;
    } else if (arg === '--apply') {
      options.applyRequested = true;
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

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const result = await runPlanContentServerStagingApply(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content server-staging apply: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Mode: ${result.report.mode}`);
  console.log(`Actual server writes: ${result.report.actualServerWrites}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
