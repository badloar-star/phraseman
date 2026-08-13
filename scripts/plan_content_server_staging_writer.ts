import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  descriptorPath?: string;
  approvalReviewPath?: string;
  outputPath?: string;
  generatedAt?: string;
  applyRequested?: boolean;
};

type StagingDescriptorObject = {
  role?: string;
  localPath?: string;
  stagingPath?: string;
  sha256?: string;
  byteSize?: number;
};

type StagingDescriptor = {
  schemaVersion?: string;
  status?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  networkCalls?: boolean;
  localOnly?: boolean;
  objects?: StagingDescriptorObject[];
  blockers?: unknown[];
};

type ApprovalReview = {
  schemaVersion?: string;
  status?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  approvedForServerWrite?: boolean;
  serverWritePermitted?: boolean;
  stagingWriterAllowed?: boolean;
  runtimeManifestRegistered?: boolean;
  networkCalls?: boolean;
  localOnly?: boolean;
  blockers?: unknown[];
};

type StagingWritePlanObject = {
  operation: 'would_write_object';
  role: string;
  localPath: string;
  stagingPath: string;
  sha256: string;
  byteSize: number;
};

type StagingWritePlan = {
  schemaVersion: 'plan-content-server-staging-writer-plan-v1';
  status: 'DRY_RUN_READY' | 'HOLD';
  mode: 'dry_run';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  descriptorPath: string;
  approvalReviewPath: string;
  activationApproved: false;
  approvedForServerWrite: false;
  serverWritePermitted: false;
  applyRequested: boolean;
  actualServerWrites: false;
  runtimeManifestRegistered: false;
  networkCalls: false;
  localOnly: true;
  objects: StagingWritePlanObject[];
  requiredBeforeApply: string[];
  blockers: string[];
};

type StagingWriterResult = {
  outputPath: string;
  plan: StagingWritePlan;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_DESCRIPTOR_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-descriptor.json');
const DEFAULT_APPROVAL_REVIEW_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-approval-review.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-writer-plan.json');

export function resolvePlanContentWriterTempPath(
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

export function writePlanContentServerStagingWriterPlan(
  repoRoot: string,
  options: CliOptions = {},
): StagingWriterResult {
  const descriptorPath = resolvePlanContentWriterTempPath(
    repoRoot,
    options.descriptorPath,
    DEFAULT_DESCRIPTOR_PATH,
    'Staging descriptor input',
  );
  const approvalReviewPath = resolvePlanContentWriterTempPath(
    repoRoot,
    options.approvalReviewPath,
    DEFAULT_APPROVAL_REVIEW_PATH,
    'Approval review input',
  );
  const outputPath = resolvePlanContentWriterTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Staging writer output',
  );
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8')) as StagingDescriptor;
  const approvalReview = JSON.parse(fs.readFileSync(approvalReviewPath, 'utf8')) as ApprovalReview;
  const blockers = validateInputs(repoRoot, descriptor, approvalReview, options.applyRequested === true);
  const objects = buildPlanObjects(repoRoot, descriptor, blockers);

  const plan: StagingWritePlan = {
    schemaVersion: 'plan-content-server-staging-writer-plan-v1',
    status: blockers.length === 0 ? 'DRY_RUN_READY' : 'HOLD',
    mode: 'dry_run',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: descriptor.packId ?? 'unknown',
    studyTarget: descriptor.studyTarget ?? 'unknown',
    sourceLocale: descriptor.sourceLocale ?? 'unknown',
    surface: 'plan_content',
    contentVersion: descriptor.contentVersion ?? 'unknown',
    descriptorPath: path.relative(repoRoot, descriptorPath).replace(/\\/g, '/'),
    approvalReviewPath: path.relative(repoRoot, approvalReviewPath).replace(/\\/g, '/'),
    activationApproved: false,
    approvedForServerWrite: false,
    serverWritePermitted: false,
    applyRequested: options.applyRequested === true,
    actualServerWrites: false,
    runtimeManifestRegistered: false,
    networkCalls: false,
    localOnly: true,
    objects,
    requiredBeforeApply: [
      'explicit user approval for real server-side staging writes',
      'separate apply-capable writer implementation',
      'server-side credentials and target environment review',
      'activationApproved must remain false until runtime activation gates pass',
      'runtime manifest registration must remain disabled',
    ],
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');

  if (plan.status !== 'DRY_RUN_READY') {
    throw new Error(`Server-staging writer dry-run failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    plan,
  };
}

function validateInputs(
  repoRoot: string,
  descriptor: StagingDescriptor,
  approvalReview: ApprovalReview,
  applyRequested: boolean,
): string[] {
  const blockers: string[] = [];

  if (applyRequested) {
    blockers.push('apply mode is disabled in Phase 3U-A dry-run writer');
  }
  if (descriptor.schemaVersion !== 'plan-content-server-staging-descriptor-v1') {
    blockers.push('descriptor schemaVersion mismatch');
  }
  if (descriptor.status !== 'READY_FOR_STAGING_REVIEW') {
    blockers.push(`descriptor status must be READY_FOR_STAGING_REVIEW, got ${descriptor.status}`);
  }
  if (approvalReview.schemaVersion !== 'plan-content-server-staging-approval-review-v1') {
    blockers.push('approval review schemaVersion mismatch');
  }
  if (approvalReview.status !== 'AWAITING_EXPLICIT_APPROVAL') {
    blockers.push(`approval review status must be AWAITING_EXPLICIT_APPROVAL, got ${approvalReview.status}`);
  }
  if (descriptor.packId !== approvalReview.packId) {
    blockers.push('packId must match descriptor and approval review');
  }
  if (descriptor.studyTarget !== approvalReview.studyTarget) {
    blockers.push('studyTarget must match descriptor and approval review');
  }
  if (descriptor.sourceLocale !== approvalReview.sourceLocale) {
    blockers.push('sourceLocale must match descriptor and approval review');
  }
  if (descriptor.surface !== 'plan_content' || approvalReview.surface !== 'plan_content') {
    blockers.push('surface must be plan_content');
  }
  if (descriptor.contentVersion !== approvalReview.contentVersion) {
    blockers.push('contentVersion must match descriptor and approval review');
  }
  if (descriptor.activationApproved !== false || approvalReview.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (approvalReview.approvedForServerWrite !== false) {
    blockers.push('approvedForServerWrite must remain false for dry-run writer');
  }
  if (approvalReview.serverWritePermitted !== false) {
    blockers.push('serverWritePermitted must remain false for dry-run writer');
  }
  if (approvalReview.stagingWriterAllowed !== false) {
    blockers.push('stagingWriterAllowed must remain false for dry-run writer');
  }
  if (descriptor.runtimeManifestRegistered !== false || approvalReview.runtimeManifestRegistered !== false) {
    blockers.push('runtimeManifestRegistered must remain false');
  }
  if (descriptor.networkCalls !== false || approvalReview.networkCalls !== false) {
    blockers.push('networkCalls must remain false');
  }
  if (descriptor.localOnly !== true || approvalReview.localOnly !== true) {
    blockers.push('localOnly must remain true');
  }
  if (Array.isArray(descriptor.blockers) && descriptor.blockers.length > 0) {
    blockers.push('descriptor blockers must be empty');
  }
  if (Array.isArray(approvalReview.blockers) && approvalReview.blockers.length > 0) {
    blockers.push('approval review blockers must be empty');
  }
  if (!Array.isArray(descriptor.objects) || descriptor.objects.length === 0) {
    blockers.push('descriptor objects must be non-empty');
  }

  const tempRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);
  if (!tempRoot.endsWith(`${path.sep}plan-content`)) {
    blockers.push('plan-content temp root mismatch');
  }

  return blockers;
}

function buildPlanObjects(
  repoRoot: string,
  descriptor: StagingDescriptor,
  blockers: string[],
): StagingWritePlanObject[] {
  if (!Array.isArray(descriptor.objects)) {
    return [];
  }

  const seenStagingPaths = new Set<string>();
  const objects: StagingWritePlanObject[] = [];
  const tempRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);

  for (const object of descriptor.objects) {
    const localPath = object.localPath ?? '';
    const stagingPath = object.stagingPath ?? '';
    const absoluteLocalPath = path.resolve(repoRoot, localPath);

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
    const byteSize = object.byteSize;
    if (!Number.isSafeInteger(byteSize) || byteSize === undefined || byteSize <= 0) {
      blockers.push(`bad object byteSize: ${stagingPath}`);
    }

    const fileContent = fs.readFileSync(absoluteLocalPath);
    const actualHash = createHash('sha256').update(fileContent).digest('hex');
    if (object.sha256 && actualHash !== object.sha256) {
      blockers.push(`local object hash mismatch: ${localPath}`);
    }
    if (byteSize !== undefined && fileContent.byteLength !== byteSize) {
      blockers.push(`local object byteSize mismatch: ${localPath}`);
    }

    objects.push({
      operation: 'would_write_object',
      role: object.role ?? 'unknown',
      localPath,
      stagingPath,
      sha256: object.sha256 ?? actualHash,
      byteSize: byteSize ?? fileContent.byteLength,
    });
  }

  return objects;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--descriptor') {
      options.descriptorPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--approval-review') {
      options.approvalReviewPath = readValue(argv, index, arg);
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

function main(): void {
  const repoRoot = process.cwd();
  const result = writePlanContentServerStagingWriterPlan(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content server-staging writer: DRY_RUN_READY');
  console.log(`Plan: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.plan.packId}`);
  console.log(`Mode: ${result.plan.mode}`);
  console.log(`Actual server writes: ${result.plan.actualServerWrites}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
