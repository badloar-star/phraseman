import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  descriptorPath?: string;
  outputPath?: string;
  generatedAt?: string;
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
  schemaVersion: 'plan-content-server-staging-approval-review-v1';
  status: 'AWAITING_EXPLICIT_APPROVAL' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  descriptorPath: string;
  descriptorStatus: string;
  activationApproved: false;
  approvedForServerWrite: false;
  serverWritePermitted: false;
  stagingWriterAllowed: false;
  runtimeManifestRegistered: false;
  networkCalls: false;
  localOnly: true;
  requiredApproval: string[];
  blockers: string[];
};

type ApprovalReviewResult = {
  outputPath: string;
  review: ApprovalReview;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_DESCRIPTOR_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-descriptor.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-approval-review.json');

export function resolvePlanContentApprovalTempPath(
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

export function writePlanContentServerStagingApprovalReview(
  repoRoot: string,
  options: CliOptions = {},
): ApprovalReviewResult {
  const descriptorPath = resolvePlanContentApprovalTempPath(
    repoRoot,
    options.descriptorPath,
    DEFAULT_DESCRIPTOR_PATH,
    'Staging descriptor input',
  );
  const outputPath = resolvePlanContentApprovalTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Approval review output',
  );
  const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8')) as StagingDescriptor;
  const blockers = validateDescriptor(descriptor);

  const review: ApprovalReview = {
    schemaVersion: 'plan-content-server-staging-approval-review-v1',
    status: blockers.length === 0 ? 'AWAITING_EXPLICIT_APPROVAL' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: descriptor.packId ?? 'unknown',
    studyTarget: descriptor.studyTarget ?? 'unknown',
    sourceLocale: descriptor.sourceLocale ?? 'unknown',
    surface: 'plan_content',
    contentVersion: descriptor.contentVersion ?? 'unknown',
    descriptorPath: path.relative(repoRoot, descriptorPath).replace(/\\/g, '/'),
    descriptorStatus: descriptor.status ?? 'unknown',
    activationApproved: false,
    approvedForServerWrite: false,
    serverWritePermitted: false,
    stagingWriterAllowed: false,
    runtimeManifestRegistered: false,
    networkCalls: false,
    localOnly: true,
    requiredApproval: [
      'explicit user approval for server-side staging writes',
      'staging writer must default to dry-run/off',
      'server copies must remain staging/shadow with activationApproved=false',
      'runtime manifest registration must remain disabled',
    ],
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(review, null, 2)}\n`, 'utf8');

  if (review.status !== 'AWAITING_EXPLICIT_APPROVAL') {
    throw new Error(`Server-staging approval review failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    review,
  };
}

function validateDescriptor(descriptor: StagingDescriptor): string[] {
  const blockers: string[] = [];

  if (descriptor.schemaVersion !== 'plan-content-server-staging-descriptor-v1') {
    blockers.push('descriptor schemaVersion mismatch');
  }
  if (descriptor.status !== 'READY_FOR_STAGING_REVIEW') {
    blockers.push(`descriptor status must be READY_FOR_STAGING_REVIEW, got ${descriptor.status}`);
  }
  if (descriptor.surface !== 'plan_content') {
    blockers.push('descriptor surface must be plan_content');
  }
  if (descriptor.activationApproved !== false) {
    blockers.push('descriptor activationApproved must remain false');
  }
  if (descriptor.runtimeManifestRegistered !== false) {
    blockers.push('descriptor runtimeManifestRegistered must remain false');
  }
  if (descriptor.networkCalls !== false) {
    blockers.push('descriptor networkCalls must remain false');
  }
  if (descriptor.localOnly !== true) {
    blockers.push('descriptor localOnly must remain true');
  }
  if (Array.isArray(descriptor.blockers) && descriptor.blockers.length > 0) {
    blockers.push('descriptor blockers must be empty');
  }
  if (!Array.isArray(descriptor.objects) || descriptor.objects.length === 0) {
    blockers.push('descriptor objects must be non-empty');
    return blockers;
  }

  const stagingPaths = new Set<string>();
  for (const object of descriptor.objects) {
    if (!object.localPath?.startsWith('.codex-tmp/plan-content/')) {
      blockers.push(`object localPath must stay under .codex-tmp/plan-content: ${object.localPath}`);
    }
    if (!object.stagingPath || object.stagingPath.includes('..') || object.stagingPath.includes('\\') || object.stagingPath.startsWith('/')) {
      blockers.push(`unsafe staging path: ${object.stagingPath}`);
    } else if (stagingPaths.has(object.stagingPath)) {
      blockers.push(`duplicate staging path: ${object.stagingPath}`);
    } else {
      stagingPaths.add(object.stagingPath);
    }
    if (!object.sha256 || !/^[a-f0-9]{64}$/.test(object.sha256)) {
      blockers.push(`bad object hash: ${object.stagingPath}`);
    }
    if (!Number.isSafeInteger(object.byteSize) || object.byteSize <= 0) {
      blockers.push(`bad object byteSize: ${object.stagingPath}`);
    }
  }

  return blockers;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--descriptor') {
      options.descriptorPath = readValue(argv, index, arg);
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
  const result = writePlanContentServerStagingApprovalReview(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content server-staging approval review: AWAITING_EXPLICIT_APPROVAL');
  console.log(`Review: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.review.packId}`);
  console.log(`Approved for server write: ${result.review.approvedForServerWrite}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
