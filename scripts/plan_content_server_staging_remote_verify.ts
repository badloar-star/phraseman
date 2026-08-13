import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  applyReportPath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type ApplyOperation = {
  operation?: string;
  role?: string;
  localPath?: string;
  stagingPath?: string;
  sha256?: string;
  byteSize?: number;
};

type ApplyReport = {
  schemaVersion?: string;
  status?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  bucket?: string | null;
  applyRequested?: boolean;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  remoteLoadingEnabled?: boolean;
  bundledContentRemoved?: boolean;
  storageMigrationRan?: boolean;
  productionActivationApproved?: boolean;
  actualServerWrites?: boolean;
  operations?: ApplyOperation[];
  blockers?: unknown[];
};

type RemoteVerifyReport = {
  schemaVersion: 'plan-content-server-staging-remote-verify-v1';
  status: 'PASS' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  bucket: string | null;
  prefix: string;
  applyReportPath: string;
  expectedObjectCount: number;
  foundObjectCount: number;
  hashCheckedCount: number;
  activationApproved: false;
  runtimeManifestRegistered: false;
  remoteLoadingEnabled: false;
  bundledContentRemoved: false;
  storageMigrationRan: false;
  productionActivationApproved: false;
  missingObjects: string[];
  sizeMismatches: string[];
  hashMismatches: string[];
  blockers: string[];
};

type RemoteVerifyResult = {
  outputPath: string;
  report: RemoteVerifyReport;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type FetchLike = (url: string | URL, init?: { headers?: Record<string, string> }) => Promise<FetchLikeResponse>;

type GcsListPage = {
  items?: Array<{ name?: string; size?: string | number }>;
  nextPageToken?: string;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_APPLY_REPORT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-apply-report.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-remote-verify.json');
const REMOTE_HASH_CONCURRENCY = 16;

export function resolvePlanContentRemoteVerifyTempPath(
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

export async function verifyPlanContentServerStagingRemote(
  repoRoot: string,
  options: CliOptions = {},
  fetchImpl: FetchLike = fetch as FetchLike,
): Promise<RemoteVerifyResult> {
  const applyReportPath = resolvePlanContentRemoteVerifyTempPath(
    repoRoot,
    options.applyReportPath,
    DEFAULT_APPLY_REPORT_PATH,
    'Apply report input',
  );
  const outputPath = resolvePlanContentRemoteVerifyTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Remote verify output',
  );
  const applyReport = readJsonFile<ApplyReport>(applyReportPath);
  const blockers = validateApplyReport(applyReport);
  const expectedOps = Array.isArray(applyReport.operations) ? applyReport.operations : [];
  const bucket = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET || applyReport.bucket || null;
  const token = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN || '';
  const prefix = buildPrefix(applyReport);

  if (!bucket) {
    blockers.push('PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET is required for remote verify');
  }
  if (!token) {
    blockers.push('PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN is required for remote verify');
  }
  if (applyReport.bucket && bucket && applyReport.bucket !== bucket) {
    blockers.push('remote verify bucket must match apply report bucket');
  }

  let found = new Map<string, number>();
  const missingObjects: string[] = [];
  const sizeMismatches: string[] = [];
  const hashMismatches: string[] = [];
  let hashCheckedCount = 0;

  if (blockers.length === 0 && bucket && token) {
    try {
      found = await listObjects(bucket, token, prefix, fetchImpl);
      for (const operation of expectedOps) {
        const stagingPath = operation.stagingPath ?? '';
        if (!found.has(stagingPath)) {
          missingObjects.push(stagingPath);
          continue;
        }
        if (found.get(stagingPath) !== operation.byteSize) {
          sizeMismatches.push(stagingPath);
        }
      }
      const missingSet = new Set(missingObjects);
      const hashOps = expectedOps.filter((operation) => (
        Boolean(operation.stagingPath && operation.sha256) && !missingSet.has(operation.stagingPath ?? '')
      ));
      const mismatches = await mapWithConcurrency(hashOps, REMOTE_HASH_CONCURRENCY, async (operation) => {
        const stagingPath = operation.stagingPath as string;
        const content = await readObject(bucket, token, stagingPath, fetchImpl);
        const hash = createHash('sha256').update(content).digest('hex');
        return hash === operation.sha256 ? null : stagingPath;
      });
      hashCheckedCount = hashOps.length;
      for (const mismatch of mismatches) {
        if (mismatch) {
          hashMismatches.push(mismatch);
        }
      }
    } catch (error) {
      blockers.push(`remote verification request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (missingObjects.length > 0) {
    blockers.push('remote objects are missing');
  }
  if (sizeMismatches.length > 0) {
    blockers.push('remote object sizes do not match apply report');
  }
  if (hashMismatches.length > 0) {
    blockers.push('remote object hashes do not match apply report');
  }
  if (blockers.length === 0 && found.size < expectedOps.length) {
    blockers.push('remote object count is lower than expected');
  }

  const report: RemoteVerifyReport = {
    schemaVersion: 'plan-content-server-staging-remote-verify-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: applyReport.packId ?? 'unknown',
    studyTarget: applyReport.studyTarget ?? 'unknown',
    sourceLocale: applyReport.sourceLocale ?? 'unknown',
    surface: 'plan_content',
    contentVersion: applyReport.contentVersion ?? 'unknown',
    bucket,
    prefix,
    applyReportPath: path.relative(repoRoot, applyReportPath).replace(/\\/g, '/'),
    expectedObjectCount: expectedOps.length,
    foundObjectCount: found.size,
    hashCheckedCount,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    missingObjects,
    sizeMismatches,
    hashMismatches,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Server-staging remote verify failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function validateApplyReport(applyReport: ApplyReport): string[] {
  const blockers: string[] = [];

  if (applyReport.schemaVersion !== 'plan-content-server-staging-apply-report-v1') {
    blockers.push('apply report schemaVersion mismatch');
  }
  if (applyReport.status !== 'APPLY_COMPLETE') {
    blockers.push(`apply report status must be APPLY_COMPLETE, got ${applyReport.status}`);
  }
  if (applyReport.surface !== 'plan_content') {
    blockers.push('apply report surface must be plan_content');
  }
  if (applyReport.applyRequested !== true) {
    blockers.push('apply report applyRequested must be true');
  }
  if (applyReport.actualServerWrites !== true) {
    blockers.push('apply report actualServerWrites must be true');
  }
  if (applyReport.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (applyReport.runtimeManifestRegistered !== false) {
    blockers.push('runtimeManifestRegistered must remain false');
  }
  if (applyReport.remoteLoadingEnabled !== false) {
    blockers.push('remoteLoadingEnabled must remain false');
  }
  if (applyReport.bundledContentRemoved !== false) {
    blockers.push('bundledContentRemoved must remain false');
  }
  if (applyReport.storageMigrationRan !== false) {
    blockers.push('storageMigrationRan must remain false');
  }
  if (applyReport.productionActivationApproved !== false) {
    blockers.push('productionActivationApproved must remain false');
  }
  if (Array.isArray(applyReport.blockers) && applyReport.blockers.length > 0) {
    blockers.push('apply report blockers must be empty');
  }
  if (!Array.isArray(applyReport.operations) || applyReport.operations.length === 0) {
    blockers.push('apply report operations must be non-empty');
  } else {
    for (const operation of applyReport.operations) {
      if (operation.operation !== 'uploaded_object') {
        blockers.push(`apply operation must be uploaded_object: ${operation.stagingPath}`);
      }
    }
  }

  return blockers;
}

function buildPrefix(applyReport: ApplyReport): string {
  return [
    'course-packs',
    applyReport.surface ?? 'unknown',
    applyReport.studyTarget ?? 'unknown',
    applyReport.sourceLocale ?? 'unknown',
    applyReport.contentVersion ?? 'unknown',
    '',
  ].join('/');
}

async function listObjects(
  bucket: string,
  token: string,
  prefix: string,
  fetchImpl: FetchLike,
): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  let pageToken = '';

  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o`);
    url.searchParams.set('prefix', prefix);
    url.searchParams.set('fields', 'items(name,size),nextPageToken');
    url.searchParams.set('maxResults', '1000');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }
    const page = await fetchJson<GcsListPage>(url, token, fetchImpl);
    for (const item of page.items ?? []) {
      if (item.name) {
        found.set(item.name, Number(item.size ?? 0));
      }
    }
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);

  return found;
}

async function readObject(
  bucket: string,
  token: string,
  objectPath: string,
  fetchImpl: FetchLike,
): Promise<Buffer> {
  const url = new URL(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}`);
  url.searchParams.set('alt', 'media');
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`GCS media ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function fetchJson<T>(url: URL, token: string, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`GCS ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return await response.json() as T;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }));

  return results;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply-report') {
      options.applyReportPath = readValue(argv, index, arg);
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

async function main(): Promise<void> {
  const repoRoot = process.cwd();
  const result = await verifyPlanContentServerStagingRemote(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content server-staging remote verify: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Expected objects: ${result.report.expectedObjectCount}`);
  console.log(`Found objects: ${result.report.foundObjectCount}`);
  console.log(`Hash checked: ${result.report.hashCheckedCount}`);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
