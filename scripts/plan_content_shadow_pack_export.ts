import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { canonicalPlanContentString } from '../app/plan_content_canonical_hash';

import {
  PLAN_CONTENT_DAY_SCHEMA_VERSION,
  PLAN_CONTENT_INDEX_SCHEMA_VERSION,
  validatePlanContentPackIndex,
  type PlanContentPackIndex,
} from '../app/plan_content_pack_index';
import { listAuthoredPlanContentDays } from '../app/plan_content_registry';
import {
  validatePlanContentDay,
  type PlanContentDay,
  type PlanContentIssue,
} from '../app/plan_content_schema';
import { normalizeSourceLocale, type SourceLocale } from '../app/source_locales';

type CliOptions = {
  outputDir?: string;
  sourceLocale?: SourceLocale;
  contentVersion?: string;
  generatedAt?: string;
};

type PlanContentShadowDayArtifact = {
  schemaVersion: typeof PLAN_CONTENT_DAY_SCHEMA_VERSION;
  studyTarget: 'en';
  sourceLocale: SourceLocale;
  contentVersion: string;
  contentHash: string;
  reviewStatus: 'shadow';
  localeGateStatus: 'hold';
  generatedBy: 'plan_content_shadow_pack_export';
  generatedAt: string;
  sourceGraphHash: string;
  pedagogyContractVersion: 'bundled-compatibility-v1';
  adapterContractVersion: 'plan-content-runtime-adapter-v1';
  content: PlanContentDay;
};

type ShadowPackRow = {
  relativePath: string;
  artifact: PlanContentShadowDayArtifact;
};

type ShadowPackBuild = {
  index: PlanContentPackIndex;
  rows: ShadowPackRow[];
};

type ExportResult = {
  outputDir: string;
  indexPath: string;
  rowCount: number;
  index: PlanContentPackIndex;
};

const DEFAULT_OUTPUT_DIR = path.join('.codex-tmp', 'plan-content', 'shadow-pack', 'local.shadow.1');
const DEFAULT_SOURCE_LOCALE: SourceLocale = 'ru';
const DEFAULT_CONTENT_VERSION = 'local.shadow.1';

export function resolvePlanContentShadowPackOutputDir(
  repoRoot: string,
  outputDir?: string,
): string {
  const reportRoot = path.resolve(repoRoot, '.codex-tmp', 'plan-content');
  const requested = outputDir
    ? path.resolve(repoRoot, outputDir)
    : path.resolve(repoRoot, DEFAULT_OUTPUT_DIR);

  if (requested !== reportRoot && !requested.startsWith(`${reportRoot}${path.sep}`)) {
    throw new Error(`Shadow pack output must stay under ${path.relative(repoRoot, reportRoot)}`);
  }

  return requested;
}

export function buildPlanContentShadowPack(options: Required<Omit<CliOptions, 'outputDir'>>): ShadowPackBuild {
  const days = [...listAuthoredPlanContentDays()].sort((left, right) =>
    left.planId.localeCompare(right.planId) || left.dayIndex - right.dayIndex,
  );
  const sourceGraphHash = hashJson(days.map((day) => ({
    planId: day.planId,
    dayIndex: day.dayIndex,
    contentHash: hashPlanContentDay(day),
  })));

  const rows = days.map<ShadowPackRow>((day) => {
    const contentHash = hashPlanContentDay(day);
    const relativePath = rowPath(day);
    return {
      relativePath,
      artifact: {
        schemaVersion: PLAN_CONTENT_DAY_SCHEMA_VERSION,
        studyTarget: 'en',
        sourceLocale: options.sourceLocale,
        contentVersion: options.contentVersion,
        contentHash,
        reviewStatus: 'shadow',
        localeGateStatus: 'hold',
        generatedBy: 'plan_content_shadow_pack_export',
        generatedAt: options.generatedAt,
        sourceGraphHash,
        pedagogyContractVersion: 'bundled-compatibility-v1',
        adapterContractVersion: 'plan-content-runtime-adapter-v1',
        content: day,
      },
    };
  });

  const index: PlanContentPackIndex = {
    schemaVersion: PLAN_CONTENT_INDEX_SCHEMA_VERSION,
    studyTarget: 'en',
    sourceLocale: options.sourceLocale,
    contentVersion: options.contentVersion,
    entries: rows.map((row) => ({
      planId: row.artifact.content.planId,
      dayIndex: row.artifact.content.dayIndex,
      path: row.relativePath,
      contentHash: row.artifact.contentHash,
      sourceLocale: row.artifact.sourceLocale,
      studyTarget: row.artifact.studyTarget,
      reviewStatus: row.artifact.reviewStatus,
      localeGateStatus: row.artifact.localeGateStatus,
      schemaVersion: row.artifact.schemaVersion,
    })),
  };

  return { index, rows };
}

export function validatePlanContentShadowPack(build: ShadowPackBuild): string[] {
  const errors = validatePlanContentPackIndex(build.index).errors.map((error) => `index: ${error}`);

  for (const row of build.rows) {
    errors.push(...validateShadowDayArtifact(row.artifact).map((error) => `${row.relativePath}: ${error}`));
  }

  return errors;
}

export function exportPlanContentShadowPack(
  repoRoot: string,
  options: CliOptions = {},
): ExportResult {
  const sourceLocale = resolveSourceLocale(options.sourceLocale);
  const contentVersion = options.contentVersion ?? DEFAULT_CONTENT_VERSION;
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const outputDir = resolvePlanContentShadowPackOutputDir(repoRoot, options.outputDir);
  const build = buildPlanContentShadowPack({ sourceLocale, contentVersion, generatedAt });
  const preWriteErrors = validatePlanContentShadowPack(build);
  if (preWriteErrors.length > 0) {
    throw new Error(`Shadow pack failed validation before write: ${preWriteErrors.join('; ')}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  for (const row of build.rows) {
    const absoluteRowPath = path.join(outputDir, row.relativePath);
    fs.mkdirSync(path.dirname(absoluteRowPath), { recursive: true });
    fs.writeFileSync(absoluteRowPath, `${JSON.stringify(row.artifact, null, 2)}\n`, 'utf8');
  }

  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, `${JSON.stringify(build.index, null, 2)}\n`, 'utf8');
  validatePersistedShadowPack(outputDir, build.index);

  return {
    outputDir,
    indexPath,
    rowCount: build.rows.length,
    index: build.index,
  };
}

function validatePersistedShadowPack(outputDir: string, expectedIndex: PlanContentPackIndex): void {
  const indexPath = path.join(outputDir, 'index.json');
  const persistedIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as PlanContentPackIndex;
  const indexValidation = validatePlanContentPackIndex(persistedIndex);
  if (!indexValidation.ok) {
    throw new Error(`Persisted index failed validation: ${indexValidation.errors.join('; ')}`);
  }

  if (persistedIndex.entries.length !== expectedIndex.entries.length) {
    throw new Error('Persisted index entry count changed after write');
  }

  for (const entry of persistedIndex.entries) {
    const artifactPath = path.join(outputDir, entry.path);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as PlanContentShadowDayArtifact;
    const artifactErrors = validateShadowDayArtifact(artifact);
    if (artifactErrors.length > 0) {
      throw new Error(`Persisted row failed validation at ${entry.path}: ${artifactErrors.join('; ')}`);
    }
    if (artifact.contentHash !== entry.contentHash) {
      throw new Error(`Persisted row hash differs from index at ${entry.path}`);
    }
  }
}

function validateShadowDayArtifact(artifact: PlanContentShadowDayArtifact): string[] {
  const errors: string[] = [];
  if (artifact.schemaVersion !== PLAN_CONTENT_DAY_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${PLAN_CONTENT_DAY_SCHEMA_VERSION}`);
  }
  if (artifact.studyTarget !== 'en') {
    errors.push('studyTarget must be en');
  }
  if (normalizeSourceLocale(artifact.sourceLocale) !== artifact.sourceLocale) {
    errors.push('sourceLocale must be normalized');
  }
  if (artifact.reviewStatus !== 'shadow') {
    errors.push('reviewStatus must be shadow for local exporter');
  }
  if (artifact.localeGateStatus !== 'hold') {
    errors.push('localeGateStatus must be hold for local exporter');
  }
  if (artifact.contentHash !== hashPlanContentDay(artifact.content)) {
    errors.push('contentHash must match canonical content hash');
  }
  if (artifact.content.planId.trim().length === 0) {
    errors.push('content.planId must be present');
  }
  if (!Number.isSafeInteger(artifact.content.dayIndex) || artifact.content.dayIndex <= 0) {
    errors.push('content.dayIndex must be positive');
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

function renderIssue(issue: PlanContentIssue): string {
  return `${issue.code}: ${issue.detail}`;
}

function rowPath(day: PlanContentDay): string {
  return `plans/${day.planId}/day-${String(day.dayIndex).padStart(3, '0')}.json`;
}

function hashPlanContentDay(day: PlanContentDay): string {
  return hashJson(day);
}

function hashJson(value: unknown): string {
  // Single canonical serialization shared with the runtime integrity verifier
  // (app/plan_content_canonical_hash.ts) so server days hash identically in both.
  return createHash('sha256').update(canonicalPlanContentString(value)).digest('hex');
}

function resolveSourceLocale(value: SourceLocale | undefined): SourceLocale {
  const resolved = normalizeSourceLocale(value ?? DEFAULT_SOURCE_LOCALE);
  if (!resolved) {
    throw new Error('sourceLocale must be a supported normalized SourceLocale');
  }
  return resolved;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--source-locale') {
      const sourceLocale = normalizeSourceLocale(readValue(argv, index, arg));
      if (!sourceLocale) {
        throw new Error('--source-locale must be a supported SourceLocale');
      }
      options.sourceLocale = sourceLocale;
      index += 1;
    } else if (arg === '--content-version') {
      options.contentVersion = readValue(argv, index, arg);
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
  const result = exportPlanContentShadowPack(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content shadow pack export: PASS');
  console.log(`Output: ${path.relative(repoRoot, result.outputDir)}`);
  console.log(`Index: ${path.relative(repoRoot, result.indexPath)}`);
  console.log(`Rows: ${result.rowCount}`);
  console.log(`Study target: ${result.index.studyTarget}`);
  console.log(`Source locale: ${result.index.sourceLocale}`);
  console.log(`Content version: ${result.index.contentVersion}`);
}

void Promise.resolve().then(main).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
