import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  validatePlanContentPackIndex,
  type PlanContentLocaleGateStatus,
  type PlanContentPackIndex,
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
import type { PlanContentDay } from '../app/plan_content_schema';

type CliOptions = {
  packDir?: string;
  outputPath?: string;
  manifestId?: string;
  sourceSnapshotId?: string;
  generatedAt?: string;
};

type ShadowDayArtifact = {
  contentHash?: string;
  reviewStatus?: PlanContentReviewStatus;
  localeGateStatus?: PlanContentLocaleGateStatus;
  content?: PlanContentDay;
};

type ComparatorResult = {
  outputPath: string;
  report: PlanContentParityReport;
  blockingErrors: string[];
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_PACK_DIR = path.join(PLAN_CONTENT_TEMP_ROOT, 'shadow-pack', 'local.shadow.1');
const DEFAULT_REPORT_PATH = path.join(PLAN_CONTENT_TEMP_ROOT, 'shadow-pack-parity-report.json');
const DEFAULT_MANIFEST_ID = 'local.plan_content.shadow_pack.1';
const DEFAULT_SOURCE_SNAPSHOT_ID = 'local:shadow-pack';

export function resolvePlanContentTempPath(
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

export function comparePlanContentShadowPack(
  repoRoot: string,
  options: CliOptions = {},
): ComparatorResult {
  const packDir = resolvePlanContentTempPath(repoRoot, options.packDir, DEFAULT_PACK_DIR, 'Shadow pack input');
  const outputPath = resolvePlanContentTempPath(repoRoot, options.outputPath, DEFAULT_REPORT_PATH, 'Parity report output');
  const indexPath = path.join(packDir, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as PlanContentPackIndex;
  const indexValidation = validatePlanContentPackIndex(index);
  if (!indexValidation.ok) {
    throw new Error(`Shadow pack index failed validation: ${indexValidation.errors.join('; ')}`);
  }

  const bundledDays = [...listAuthoredPlanContentDays()].sort(compareDays);
  const bundledByKey = new Map(bundledDays.map((day) => [dayKey(day.planId, day.dayIndex), day]));
  const entriesByKey = new Map(index.entries.map((entry) => [dayKey(entry.planId, entry.dayIndex), entry]));
  const addedShadowOnlyRows = collectAddedRows(index, bundledByKey);
  const missingRows = collectMissingRows(bundledDays, entriesByKey);
  const hashMismatches: PlanContentHashMismatch[] = [];
  const adapterOutputMismatches: PlanContentAdapterMismatch[] = [];

  for (const entry of index.entries) {
    const bundledDay = bundledByKey.get(dayKey(entry.planId, entry.dayIndex));
    if (!bundledDay) continue;

    const artifactPath = path.join(packDir, entry.path);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as ShadowDayArtifact;
    const shadowDay = artifact.content;
    if (!shadowDay) {
      hashMismatches.push({
        planId: entry.planId,
        dayIndex: entry.dayIndex,
        detail: 'shadow row has no content',
        expectedHash: hashPlanContentDay(bundledDay),
        actualHash: entry.contentHash,
      });
      continue;
    }

    compareHashes(entry.planId, entry.dayIndex, bundledDay, shadowDay, entry.contentHash, artifact.contentHash, hashMismatches);
    compareAdapterOutput(entry.planId, entry.dayIndex, bundledDay, shadowDay, adapterOutputMismatches);
  }

  const report: PlanContentParityReport = {
    schemaVersion: PLAN_CONTENT_PARITY_REPORT_SCHEMA_VERSION,
    manifestId: options.manifestId ?? DEFAULT_MANIFEST_ID,
    manifestHash: hashJson(index),
    sourceSnapshotId: options.sourceSnapshotId ?? DEFAULT_SOURCE_SNAPSHOT_ID,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    comparedPlanDayCount: bundledDays.length,
    addedShadowOnlyRows,
    missingRows,
    hashMismatches,
    adapterOutputMismatches,
    fallbackDecisionMismatches: [],
    reviewerSummary: summarizeReview(index),
    verdict: hasBlockingIssues({ addedShadowOnlyRows, missingRows, hashMismatches, adapterOutputMismatches })
      ? 'hold'
      : 'shadow_parity_passed',
  };

  const validation = validatePlanContentParityReport(report);
  if (!validation.ok) {
    throw new Error(`Parity report failed validation before write: ${validation.errors.join('; ')}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const persisted = JSON.parse(fs.readFileSync(outputPath, 'utf8')) as PlanContentParityReport;
  const persistedValidation = validatePlanContentParityReport(persisted);
  if (!persistedValidation.ok) {
    throw new Error(`Persisted parity report failed validation: ${persistedValidation.errors.join('; ')}`);
  }

  const blockingErrors = collectBlockingErrors(persisted);
  if (blockingErrors.length > 0) {
    throw new Error(`Shadow pack parity failed: ${blockingErrors.join('; ')}`);
  }

  return {
    outputPath,
    report: persisted,
    blockingErrors,
  };
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
      detail: 'shadow content hash differs from bundled content',
      expectedHash,
      actualHash,
    });
  }
  if (entryHash !== actualHash) {
    mismatches.push({
      planId,
      dayIndex,
      detail: 'index contentHash differs from shadow content',
      expectedHash: actualHash,
      actualHash: entryHash,
    });
  }
  if (artifactHash && artifactHash !== actualHash) {
    mismatches.push({
      planId,
      dayIndex,
      detail: 'artifact contentHash differs from shadow content',
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
      detail: 'shadow row has no bundled compatibility match',
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
      detail: 'bundled compatibility row is missing from shadow pack',
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

function collectBlockingErrors(report: PlanContentParityReport): string[] {
  const errors: string[] = [];
  addCountError(errors, 'added shadow-only rows', report.addedShadowOnlyRows.length);
  addCountError(errors, 'missing rows', report.missingRows.length);
  addCountError(errors, 'hash mismatches', report.hashMismatches.length);
  addCountError(errors, 'adapter output mismatches', report.adapterOutputMismatches.length);
  addCountError(errors, 'fallback decision mismatches', report.fallbackDecisionMismatches.length);
  if (report.verdict !== 'shadow_parity_passed') {
    errors.push(`verdict: ${report.verdict}`);
  }
  return errors;
}

function hasBlockingIssues(report: {
  addedShadowOnlyRows: readonly unknown[];
  missingRows: readonly unknown[];
  hashMismatches: readonly unknown[];
  adapterOutputMismatches: readonly unknown[];
}): boolean {
  return (
    report.addedShadowOnlyRows.length > 0 ||
    report.missingRows.length > 0 ||
    report.hashMismatches.length > 0 ||
    report.adapterOutputMismatches.length > 0
  );
}

function addCountError(errors: string[], label: string, count: number): void {
  if (count > 0) {
    errors.push(`${label}: ${count}`);
  }
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

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pack-dir') {
      options.packDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--manifest-id') {
      options.manifestId = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--source-snapshot-id') {
      options.sourceSnapshotId = readValue(argv, index, arg);
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
  const result = comparePlanContentShadowPack(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content shadow pack parity compare: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Compared days: ${result.report.comparedPlanDayCount}`);
  console.log(`Verdict: ${result.report.verdict}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
