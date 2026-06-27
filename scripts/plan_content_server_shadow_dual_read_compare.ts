import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  PLAN_CONTENT_DAY_SCHEMA_VERSION,
  validatePlanContentPackIndex,
  type PlanContentLocaleGateStatus,
  type PlanContentPackIndex,
  type PlanContentPackIndexEntry,
  type PlanContentReviewStatus,
} from '../app/plan_content_pack_index';
import {
  PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
  validatePlanContentParityReport,
  type PlanContentAdapterMismatch,
  type PlanContentHashMismatch,
  type PlanContentParityReport,
  type PlanContentParityRowRef,
} from '../app/plan_content_pack_parity';
import { listAuthoredPlanContentDays } from '../app/plan_content_registry';
import {
  contentDayToLessonIntroScreens,
  contentDayToLessonPhrases,
  contentVocabularyToRuntimeCards,
} from '../app/plan_content_runtime_adapter';
import { validatePlanContentDay, type PlanContentDay, type PlanContentIssue } from '../app/plan_content_schema';
import type { SourceLocale } from '../app/source_locales';

type CliOptions = {
  remoteVerifyReportPath?: string;
  outputPath?: string;
  generatedAt?: string;
  sourceSnapshotId?: string;
};

type RemoteVerifyReport = {
  schemaVersion?: string;
  status?: string;
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  bucket?: string | null;
  prefix?: string;
  expectedObjectCount?: number;
  foundObjectCount?: number;
  hashCheckedCount?: number;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  remoteLoadingEnabled?: boolean;
  bundledContentRemoved?: boolean;
  storageMigrationRan?: boolean;
  productionActivationApproved?: boolean;
  blockers?: unknown[];
};

type ShadowDayArtifact = {
  schemaVersion?: string;
  studyTarget?: string;
  sourceLocale?: SourceLocale;
  contentVersion?: string;
  contentHash?: string;
  reviewStatus?: PlanContentReviewStatus;
  localeGateStatus?: PlanContentLocaleGateStatus;
  content?: PlanContentDay;
};

type ServerShadowDualReadReport = {
  schemaVersion: 'plan-content-server-shadow-dual-read-report-v1';
  status: 'PASS' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  bucket: string | null;
  prefix: string;
  remoteVerifyReportPath: string;
  remoteExpectedObjectCount: number;
  remoteFoundObjectCount: number;
  remoteHashCheckedCount: number;
  remoteIndexEntryCount: number;
  serverShadowRowsRead: number;
  activationApproved: false;
  runtimeManifestRegistered: false;
  remoteLoadingEnabled: false;
  bundledContentRemoved: false;
  storageMigrationRan: false;
  productionActivationApproved: false;
  parityReport: PlanContentParityReport;
  artifactMismatches: PlanContentParityRowRef[];
  blockers: string[];
};

type ServerShadowDualReadResult = {
  outputPath: string;
  report: ServerShadowDualReadReport;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
  arrayBuffer(): Promise<ArrayBuffer>;
};

type FetchLike = (url: string | URL, init?: { headers?: Record<string, string> }) => Promise<FetchLikeResponse>;

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_REMOTE_VERIFY_REPORT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-staging-remote-verify.json');
const DEFAULT_OUTPUT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'server-shadow-dual-read-report.json');
const REMOTE_ROW_CONCURRENCY = 16;

export function resolvePlanContentServerShadowTempPath(
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

export async function comparePlanContentServerShadowDualRead(
  repoRoot: string,
  options: CliOptions = {},
  fetchImpl: FetchLike = fetch as FetchLike,
): Promise<ServerShadowDualReadResult> {
  const remoteVerifyReportPath = resolvePlanContentServerShadowTempPath(
    repoRoot,
    options.remoteVerifyReportPath,
    DEFAULT_REMOTE_VERIFY_REPORT_PATH,
    'Remote verify report input',
  );
  const outputPath = resolvePlanContentServerShadowTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Server-shadow dual-read output',
  );
  const remoteVerify = readJsonFile<RemoteVerifyReport>(remoteVerifyReportPath);
  const blockers = validateRemoteVerifyReport(remoteVerify);
  const bucket = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET || remoteVerify.bucket || null;
  const token = process.env.PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN || '';
  const prefix = remoteVerify.prefix ?? '';
  const bundledDays = [...listAuthoredPlanContentDays()].sort(compareDays);
  const bundledByKey = new Map(bundledDays.map((day) => [dayKey(day.planId, day.dayIndex), day]));
  let remoteIndex: PlanContentPackIndex | null = null;
  let remoteIndexEntryCount = 0;
  let serverShadowRowsRead = 0;
  let addedShadowOnlyRows: PlanContentParityRowRef[] = [];
  let missingRows: PlanContentParityRowRef[] = [];
  const hashMismatches: PlanContentHashMismatch[] = [];
  const adapterOutputMismatches: PlanContentAdapterMismatch[] = [];
  const artifactMismatches: PlanContentParityRowRef[] = [];

  if (!bucket) {
    blockers.push('PHRASEMAN_PLAN_CONTENT_STAGING_BUCKET is required for server-shadow dual-read compare');
  }
  if (!token) {
    blockers.push('PHRASEMAN_PLAN_CONTENT_STAGING_ACCESS_TOKEN is required for server-shadow dual-read compare');
  }

  if (blockers.length === 0 && bucket && token) {
    try {
      remoteIndex = await readRemoteJson<PlanContentPackIndex>(bucket, token, `${prefix}index.json`, fetchImpl);
      const indexValidation = validatePlanContentPackIndex(remoteIndex);
      if (!indexValidation.ok) {
        blockers.push(`remote index failed validation: ${indexValidation.errors.join('; ')}`);
      } else {
        remoteIndexEntryCount = remoteIndex.entries.length;
        const entriesByKey = new Map(remoteIndex.entries.map((entry) => [dayKey(entry.planId, entry.dayIndex), entry]));
        addedShadowOnlyRows = collectAddedRows(remoteIndex, bundledByKey);
        missingRows = collectMissingRows(bundledDays, entriesByKey);
        const comparableEntries = remoteIndex.entries.filter((entry) => bundledByKey.has(dayKey(entry.planId, entry.dayIndex)));
        const rowResults = await mapWithConcurrency(comparableEntries, REMOTE_ROW_CONCURRENCY, async (entry) => {
          const artifact = await readRemoteJson<ShadowDayArtifact>(bucket, token, `${prefix}${entry.path}`, fetchImpl);
          return { entry, artifact };
        });
        serverShadowRowsRead = rowResults.length;

        for (const { entry, artifact } of rowResults) {
          const bundledDay = bundledByKey.get(dayKey(entry.planId, entry.dayIndex));
          if (!bundledDay) continue;
          const artifactErrors = validateRemoteShadowDayArtifact(artifact, entry, remoteIndex);
          artifactMismatches.push(...artifactErrors.map((detail) => ({
            planId: entry.planId,
            dayIndex: entry.dayIndex,
            detail,
          })));
          if (!artifact.content) {
            continue;
          }
          compareHashes(entry.planId, entry.dayIndex, bundledDay, artifact.content, entry.contentHash, artifact.contentHash, hashMismatches);
          compareAdapterOutput(entry.planId, entry.dayIndex, bundledDay, artifact.content, adapterOutputMismatches);
        }
      }
    } catch (error) {
      blockers.push(`server-shadow dual-read request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (artifactMismatches.length > 0) {
    blockers.push('remote shadow row artifacts have metadata/schema mismatches');
  }

  const parityReport: PlanContentParityReport = {
    schemaVersion: PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
    manifestId: sanitizeToken(remoteVerify.packId ?? 'unknown-pack'),
    manifestHash: remoteIndex ? hashJson(remoteIndex) : EMPTY_SHA256,
    sourceSnapshotId: options.sourceSnapshotId ?? 'server-shadow:remote-verify',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    comparedPlanDayCount: bundledDays.length,
    addedShadowOnlyRows,
    missingRows,
    hashMismatches,
    adapterOutputMismatches,
    fallbackDecisionMismatches: [],
    reviewerSummary: remoteIndex ? summarizeReview(remoteIndex) : emptyReviewerSummary(),
    verdict: hasBlockingIssues({ addedShadowOnlyRows, missingRows, hashMismatches, adapterOutputMismatches, artifactMismatches, blockers })
      ? 'hold'
      : 'shadow_parity_passed',
  };

  const parityValidation = validatePlanContentParityReport(parityReport);
  if (!parityValidation.ok) {
    blockers.push(`server-shadow parity report failed validation: ${parityValidation.errors.join('; ')}`);
  }
  if (parityReport.verdict !== 'shadow_parity_passed') {
    blockers.push(`server-shadow parity verdict: ${parityReport.verdict}`);
  }

  const report: ServerShadowDualReadReport = {
    schemaVersion: 'plan-content-server-shadow-dual-read-report-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: remoteVerify.packId ?? 'unknown',
    studyTarget: remoteVerify.studyTarget ?? 'unknown',
    sourceLocale: remoteVerify.sourceLocale ?? 'unknown',
    surface: 'plan_content',
    contentVersion: remoteVerify.contentVersion ?? 'unknown',
    bucket,
    prefix,
    remoteVerifyReportPath: path.relative(repoRoot, remoteVerifyReportPath).replace(/\\/g, '/'),
    remoteExpectedObjectCount: remoteVerify.expectedObjectCount ?? 0,
    remoteFoundObjectCount: remoteVerify.foundObjectCount ?? 0,
    remoteHashCheckedCount: remoteVerify.hashCheckedCount ?? 0,
    remoteIndexEntryCount,
    serverShadowRowsRead,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    parityReport,
    artifactMismatches,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Server-shadow dual-read compare failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

const EMPTY_SHA256 = createHash('sha256').update('').digest('hex');

function validateRemoteVerifyReport(report: RemoteVerifyReport): string[] {
  const blockers: string[] = [];
  if (report.schemaVersion !== 'plan-content-server-staging-remote-verify-v1') {
    blockers.push('remote verify schemaVersion mismatch');
  }
  if (report.status !== 'PASS') {
    blockers.push(`remote verify status must be PASS, got ${report.status}`);
  }
  if (report.surface !== 'plan_content') {
    blockers.push('remote verify surface must be plan_content');
  }
  if (report.studyTarget !== 'en') {
    blockers.push('remote verify studyTarget must be en');
  }
  if (!report.prefix || !report.prefix.startsWith('course-packs/plan_content/') || !report.prefix.endsWith('/')) {
    blockers.push('remote verify prefix must be a plan_content staging prefix');
  }
  if ((report.expectedObjectCount ?? 0) <= 0) {
    blockers.push('remote verify expectedObjectCount must be positive');
  }
  if (report.expectedObjectCount !== report.foundObjectCount) {
    blockers.push('remote verify foundObjectCount must equal expectedObjectCount');
  }
  if (report.hashCheckedCount !== report.expectedObjectCount) {
    blockers.push('remote verify hashCheckedCount must equal expectedObjectCount');
  }
  if (report.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (report.runtimeManifestRegistered !== false) {
    blockers.push('runtimeManifestRegistered must remain false');
  }
  if (report.remoteLoadingEnabled !== false) {
    blockers.push('remoteLoadingEnabled must remain false');
  }
  if (report.bundledContentRemoved !== false) {
    blockers.push('bundledContentRemoved must remain false');
  }
  if (report.storageMigrationRan !== false) {
    blockers.push('storageMigrationRan must remain false');
  }
  if (report.productionActivationApproved !== false) {
    blockers.push('productionActivationApproved must remain false');
  }
  if (Array.isArray(report.blockers) && report.blockers.length > 0) {
    blockers.push('remote verify blockers must be empty');
  }
  return blockers;
}

function validateRemoteShadowDayArtifact(
  artifact: ShadowDayArtifact,
  entry: PlanContentPackIndexEntry,
  index: PlanContentPackIndex,
): string[] {
  const errors: string[] = [];
  if (!artifact || typeof artifact !== 'object') {
    return ['remote row artifact must be an object'];
  }
  if (artifact.schemaVersion !== PLAN_CONTENT_DAY_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLAN_CONTENT_DAY_SCHEMA_VERSION}`);
  }
  if (artifact.studyTarget !== entry.studyTarget || artifact.studyTarget !== index.studyTarget) {
    errors.push('studyTarget must match index and entry');
  }
  if (artifact.sourceLocale !== entry.sourceLocale || artifact.sourceLocale !== index.sourceLocale) {
    errors.push('sourceLocale must match index and entry');
  }
  if (artifact.contentVersion !== index.contentVersion) {
    errors.push('contentVersion must match index');
  }
  if (artifact.reviewStatus !== entry.reviewStatus) {
    errors.push('reviewStatus must match entry');
  }
  if (artifact.localeGateStatus !== entry.localeGateStatus) {
    errors.push('localeGateStatus must match entry');
  }
  if (artifact.contentHash !== entry.contentHash) {
    errors.push('artifact contentHash must match entry');
  }
  if (!artifact.content) {
    errors.push('artifact content must be present');
    return errors;
  }
  if (artifact.content.planId !== entry.planId) {
    errors.push('content.planId must match entry');
  }
  if (artifact.content.dayIndex !== entry.dayIndex) {
    errors.push('content.dayIndex must match entry');
  }
  const actualContentHash = hashPlanContentDay(artifact.content);
  if (artifact.contentHash !== actualContentHash) {
    errors.push('artifact contentHash must match canonical content hash');
  }
  const contentIssues = validatePlanContentDay(artifact.content);
  if (contentIssues.length > 0) {
    errors.push(...contentIssues.slice(0, 10).map(renderIssue));
    if (contentIssues.length > 10) {
      errors.push(`and ${contentIssues.length - 10} more content issues`);
    }
  }
  return errors;
}

function compareHashes(
  planId: string,
  dayIndex: number,
  bundledDay: PlanContentDay,
  shadowDay: PlanContentDay,
  entryHash: string,
  artifactHash: string | undefined,
  mismatches: PlanContentHashMismatch[],
): void {
  const expectedHash = hashPlanContentDay(bundledDay);
  const actualHash = hashPlanContentDay(shadowDay);
  if (actualHash !== expectedHash) {
    mismatches.push({
      planId,
      dayIndex,
      detail: 'server shadow content hash differs from bundled content',
      expectedHash,
      actualHash,
    });
  }
  if (entryHash !== actualHash) {
    mismatches.push({
      planId,
      dayIndex,
      detail: 'remote index contentHash differs from server shadow content',
      expectedHash: actualHash,
      actualHash: entryHash,
    });
  }
  if (artifactHash && artifactHash !== actualHash) {
    mismatches.push({
      planId,
      dayIndex,
      detail: 'remote artifact contentHash differs from server shadow content',
      expectedHash: actualHash,
      actualHash: artifactHash,
    });
  }
}

function compareAdapterOutput(
  planId: string,
  dayIndex: number,
  bundledDay: PlanContentDay,
  shadowDay: PlanContentDay,
  mismatches: PlanContentAdapterMismatch[],
): void {
  compareAdapterSurface(planId, dayIndex, 'intro_screens', () => contentDayToLessonIntroScreens(bundledDay), () => contentDayToLessonIntroScreens(shadowDay), mismatches);
  compareAdapterSurface(planId, dayIndex, 'phrases', () => contentDayToLessonPhrases(bundledDay), () => contentDayToLessonPhrases(shadowDay), mismatches);
  compareAdapterSurface(planId, dayIndex, 'vocabulary_cards', () => contentVocabularyToRuntimeCards(bundledDay), () => contentVocabularyToRuntimeCards(shadowDay), mismatches);
}

function compareAdapterSurface(
  planId: string,
  dayIndex: number,
  adapter: PlanContentAdapterMismatch['adapter'],
  expectedOutput: () => unknown,
  actualOutput: () => unknown,
  mismatches: PlanContentAdapterMismatch[],
): void {
  try {
    if (hashJson(expectedOutput()) === hashJson(actualOutput())) return;
    mismatches.push({
      planId,
      dayIndex,
      detail: `${adapter} adapter output differs`,
      adapter,
    });
  } catch (error) {
    mismatches.push({
      planId,
      dayIndex,
      detail: `${adapter} adapter threw: ${error instanceof Error ? error.message : String(error)}`,
      adapter,
    });
  }
}

function collectAddedRows(
  index: PlanContentPackIndex,
  bundledByKey: ReadonlyMap<string, PlanContentDay>,
): PlanContentParityRowRef[] {
  return index.entries
    .filter((entry) => !bundledByKey.has(dayKey(entry.planId, entry.dayIndex)))
    .map((entry) => ({
      planId: entry.planId,
      dayIndex: entry.dayIndex,
      detail: 'server shadow row has no bundled compatibility match',
    }));
}

function collectMissingRows(
  bundledDays: readonly PlanContentDay[],
  entriesByKey: ReadonlyMap<string, unknown>,
): PlanContentParityRowRef[] {
  return bundledDays
    .filter((day) => !entriesByKey.has(dayKey(day.planId, day.dayIndex)))
    .map((day) => ({
      planId: day.planId,
      dayIndex: day.dayIndex,
      detail: 'bundled compatibility row is missing from server shadow pack',
    }));
}

function summarizeReview(index: PlanContentPackIndex): PlanContentParityReport['reviewerSummary'] {
  const reviewStatusCounts: Record<PlanContentReviewStatus, number> = {
    approved: 0,
    shadow: 0,
    hold: 0,
    rejected: 0,
  };
  const localeGateStatusCounts: Record<PlanContentLocaleGateStatus, number> = {
    passed: 0,
    hold: 0,
    failed: 0,
  };

  for (const entry of index.entries) {
    reviewStatusCounts[entry.reviewStatus] += 1;
    localeGateStatusCounts[entry.localeGateStatus] += 1;
  }

  return {
    reviewedRowCount: index.entries.length,
    reviewStatusCounts,
    localeGateStatusCounts,
  };
}

function emptyReviewerSummary(): PlanContentParityReport['reviewerSummary'] {
  return {
    reviewedRowCount: 0,
    reviewStatusCounts: {
      approved: 0,
      shadow: 0,
      hold: 0,
      rejected: 0,
    },
    localeGateStatusCounts: {
      passed: 0,
      hold: 0,
      failed: 0,
    },
  };
}

function hasBlockingIssues(report: {
  addedShadowOnlyRows: readonly unknown[];
  missingRows: readonly unknown[];
  hashMismatches: readonly unknown[];
  adapterOutputMismatches: readonly unknown[];
  artifactMismatches: readonly unknown[];
  blockers: readonly unknown[];
}): boolean {
  return (
    report.addedShadowOnlyRows.length > 0 ||
    report.missingRows.length > 0 ||
    report.hashMismatches.length > 0 ||
    report.adapterOutputMismatches.length > 0 ||
    report.artifactMismatches.length > 0 ||
    report.blockers.length > 0
  );
}

async function readRemoteJson<T>(
  bucket: string,
  token: string,
  objectPath: string,
  fetchImpl: FetchLike,
): Promise<T> {
  const response = await readObject(bucket, token, objectPath, fetchImpl);
  return JSON.parse(response.toString('utf8')) as T;
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

function renderIssue(issue: PlanContentIssue): string {
  return `${issue.code}: ${issue.detail}`;
}

function compareDays(left: PlanContentDay, right: PlanContentDay): number {
  return left.planId.localeCompare(right.planId) || left.dayIndex - right.dayIndex;
}

function dayKey(planId: string, dayIndex: number): string {
  return `${planId}:${dayIndex}`;
}

function hashPlanContentDay(day: PlanContentDay): string {
  return hashJson(day);
}

function hashJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJson(entryValue)]),
    );
  }
  return value;
}

function sanitizeToken(value: string): string {
  return value.replace(/[^A-Za-z0-9._:-]/g, '_') || 'unknown';
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--remote-verify-report') {
      options.remoteVerifyReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--source-snapshot-id') {
      options.sourceSnapshotId = readValue(argv, index, arg);
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
  const result = await comparePlanContentServerShadowDualRead(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content server-shadow dual-read compare: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Compared days: ${result.report.parityReport.comparedPlanDayCount}`);
  console.log(`Server shadow rows read: ${result.report.serverShadowRowsRead}`);
  console.log(`Verdict: ${result.report.parityReport.verdict}`);
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
