import fs from 'node:fs';
import path from 'node:path';

type HeisenbergLocale = 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';

type CliOptions = {
  releaseEvidencePath?: string;
  outputPath?: string;
  generatedAt?: string;
  strict?: boolean;
};

type JsonRecord = Record<string, unknown>;

type ValidationReport = {
  schemaVersion: 'heisenberg-production-release-evidence-validation-v1';
  status: 'PASS' | 'HOLD';
  validationStatus: 'PRODUCTION_RELEASE_EVIDENCE_READY' | 'MISSING_RELEASE_EVIDENCE' | 'HOLD';
  generatedAt: string;
  releaseEvidencePath: string;
  generatedApprovals: boolean;
  generatedDecisionsOrEvidence: boolean;
  runtimeSourceMutation: boolean;
  activationApproved: boolean;
  remoteLoadingEnabled: boolean;
  runtimeManifestRegistered: boolean;
  packHashesRebuiltFromCurrentContent: boolean;
  locales: Record<HeisenbergLocale, {
    packArtifactReady: boolean;
    approvalsReady: boolean;
    runtimeGatesReady: boolean;
    blockers: string[];
  }>;
  blockers: string[];
};

type WriteResult = {
  report: ValidationReport;
  outputPath: string;
};

const HEISENBERG_LOCALES: HeisenbergLocale[] = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const RELEASE_SCHEMA_VERSION = 'heisenberg-production-release-evidence-v1';
const TEMPLATE_SCHEMA_VERSION = 'heisenberg-production-release-evidence-template-v1';
const DEFAULT_OUTPUT_NAME = 'release_evidence_validation.json';
const PLACEHOLDER_PATTERN = /^(?:todo|tbd|pending|blank|example|sample|fill[_ -]?me|replace[_ -]?me|n\/a|na|none|null)$/i;
const SHA256_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const SOURCE_PATH_FIELDS = [
  'batchManifestPath',
  'uiAuditPath',
  'semanticAuditPath',
  'quizValidationPath',
  'productionReadinessGatePath',
  'sourceApplyCandidatePath',
] as const;

export function writeHeisenbergProductionReleaseEvidenceValidation(
  repoRoot: string,
  options: CliOptions = {},
): WriteResult {
  const releaseEvidencePath = resolveAllowedPath(
    repoRoot,
    options.releaseEvidencePath,
    findLatestReleaseEvidencePath(repoRoot),
    'Heisenberg production release evidence input',
  );
  const outputPath = resolveAllowedPath(
    repoRoot,
    options.outputPath,
    path.join(path.dirname(releaseEvidencePath), DEFAULT_OUTPUT_NAME),
    'Heisenberg production release evidence validation output',
  );

  const report = buildValidationReport(repoRoot, releaseEvidencePath, options.generatedAt ?? new Date().toISOString());

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (options.strict && report.status !== 'PASS') {
    throw new Error(`Heisenberg production release evidence validation failed: ${report.blockers.join('; ')}`);
  }

  return { report, outputPath };
}

function buildValidationReport(repoRoot: string, releaseEvidencePath: string, generatedAt: string): ValidationReport {
  const releaseEvidence = fs.existsSync(releaseEvidencePath)
    ? readJsonFile<JsonRecord>(releaseEvidencePath)
    : null;
  const blockers: string[] = [];

  if (!releaseEvidence) {
    blockers.push('production release evidence artifact is missing');
  } else {
    blockers.push(...validateEnvelope(repoRoot, releaseEvidence));
  }

  const localeReports = Object.fromEntries(HEISENBERG_LOCALES.map((locale) => {
    const localeBlockers = releaseEvidence ? validateLocaleEvidence(releaseEvidence, locale) : [
      'production release evidence artifact is missing',
    ];
    return [
      locale,
      {
        packArtifactReady: !localeBlockers.some((blocker) => blocker.includes('pack artifact')),
        approvalsReady: !localeBlockers.some((blocker) => blocker.includes('approval evidence')),
        runtimeGatesReady: !localeBlockers.some((blocker) => blocker.includes('runtime gate evidence')),
        blockers: localeBlockers,
      },
    ];
  })) as ValidationReport['locales'];

  blockers.push(...Object.entries(localeReports).flatMap(([locale, report]) =>
    report.blockers.map((blocker) => `${locale}: ${blocker}`),
  ));

  const uniqueBlockers = uniqueStrings(blockers);
  return {
    schemaVersion: 'heisenberg-production-release-evidence-validation-v1',
    status: uniqueBlockers.length === 0 ? 'PASS' : 'HOLD',
    validationStatus: uniqueBlockers.length === 0
      ? 'PRODUCTION_RELEASE_EVIDENCE_READY'
      : releaseEvidence
        ? 'HOLD'
        : 'MISSING_RELEASE_EVIDENCE',
    generatedAt,
    releaseEvidencePath: relativePath(repoRoot, releaseEvidencePath),
    generatedApprovals: valueAt(releaseEvidence, 'generatedApprovals') === true,
    generatedDecisionsOrEvidence: valueAt(releaseEvidence, 'generatedDecisionsOrEvidence') === true,
    runtimeSourceMutation: valueAt(releaseEvidence, 'runtimeSourceMutation') === true,
    activationApproved: valueAt(releaseEvidence, 'activationApproved') === true,
    remoteLoadingEnabled: valueAt(releaseEvidence, 'remoteLoadingEnabled') === true,
    runtimeManifestRegistered: valueAt(releaseEvidence, 'runtimeManifestRegistered') === true,
    packHashesRebuiltFromCurrentContent: valueAt(releaseEvidence, 'packHashesRebuiltFromCurrentContent') === true,
    locales: localeReports,
    blockers: uniqueBlockers,
  };
}

function validateEnvelope(repoRoot: string, releaseEvidence: JsonRecord): string[] {
  const blockers: string[] = [];
  const schemaVersion = valueAt(releaseEvidence, 'schemaVersion');
  if (schemaVersion === TEMPLATE_SCHEMA_VERSION || valueAt(releaseEvidence, 'templateOnly') === true) {
    blockers.push('release evidence template cannot be submitted as production release evidence');
  }
  if (schemaVersion !== RELEASE_SCHEMA_VERSION) {
    blockers.push(`schemaVersion must be ${RELEASE_SCHEMA_VERSION}`);
  }
  if (valueAt(releaseEvidence, 'generatedApprovals') !== false) {
    blockers.push('generatedApprovals must be false');
  }
  if (valueAt(releaseEvidence, 'generatedDecisionsOrEvidence') === true) {
    blockers.push('generatedDecisionsOrEvidence must not be true');
  }
  if (valueAt(releaseEvidence, 'runtimeSourceMutation') !== false) {
    blockers.push('runtimeSourceMutation must be false');
  }
  for (const [field, expected] of [
    ['activationApproved', true],
    ['remoteLoadingEnabled', true],
    ['runtimeManifestRegistered', true],
    ['packHashesRebuiltFromCurrentContent', true],
  ] as const) {
    if (valueAt(releaseEvidence, field) !== expected) blockers.push(`${field} must be ${expected}`);
  }
  const requiredLocales = arrayAt(releaseEvidence, 'requiredLocales').map(String);
  if (requiredLocales.length > 0 && HEISENBERG_LOCALES.some((locale) => !requiredLocales.includes(locale))) {
    blockers.push(`requiredLocales must include ${HEISENBERG_LOCALES.join(', ')}`);
  }

  const sourceEvidence = recordAt(releaseEvidence, 'sourceEvidence');
  for (const field of SOURCE_PATH_FIELDS) {
    const value = sourceEvidence ? valueAt(sourceEvidence, field) : undefined;
    if (!filledString(value)) {
      blockers.push(`sourceEvidence.${field} is required`);
      continue;
    }
    const resolved = resolveEvidenceFilePath(repoRoot, value);
    if (!resolved) {
      blockers.push(`sourceEvidence.${field} must stay under docs/heisenberg or .codex-tmp`);
    } else if (!fs.existsSync(resolved)) {
      blockers.push(`sourceEvidence.${field} file does not exist`);
    }
  }
  if (!filledString(sourceEvidence ? valueAt(sourceEvidence, 'contentRevisionId') : undefined)) {
    blockers.push('sourceEvidence.contentRevisionId is required');
  }
  return blockers;
}

function validateLocaleEvidence(releaseEvidence: JsonRecord, locale: HeisenbergLocale): string[] {
  const blockers: string[] = [];
  const packArtifacts = recordAt(releaseEvidence, 'packArtifacts');
  const localePack = packArtifacts ? recordAt(packArtifacts, locale) : null;
  for (const field of ['contentHash', 'packHash'] as const) {
    const value = localePack ? valueAt(localePack, field) : undefined;
    if (!filledString(value)) {
      blockers.push(`pack artifact ${field} is required`);
    } else if (!SHA256_HASH_PATTERN.test(value)) {
      blockers.push(`pack artifact ${field} must be sha256:<64 hex>`);
    }
  }
  if (!filledString(localePack ? valueAt(localePack, 'serverArtifactId') : undefined)) {
    blockers.push('pack artifact serverArtifactId is required');
  }
  const deployedAt = localePack ? valueAt(localePack, 'deployedAt') : undefined;
  if (!filledString(deployedAt)) {
    blockers.push('pack artifact deployedAt is required');
  } else if (Number.isNaN(Date.parse(deployedAt))) {
    blockers.push('pack artifact deployedAt must be a valid timestamp');
  }

  const approvals = recordAt(releaseEvidence, 'approvals');
  const localeApprovals = approvals ? recordAt(approvals, locale) : null;
  for (const field of ['reviewerEvidenceId', 'localeOwnerEvidenceId', 'productOwnerEvidenceId']) {
    if (!filledString(localeApprovals ? valueAt(localeApprovals, field) : undefined)) {
      blockers.push(`approval evidence ${field} is required`);
    }
  }

  const runtimeGates = recordAt(releaseEvidence, 'runtimeGates');
  const localeRuntime = runtimeGates ? recordAt(runtimeGates, locale) : null;
  for (const field of ['offlineCacheEvidenceId', 'rollbackEvidenceId', 'storageRulesEvidenceId']) {
    if (!filledString(localeRuntime ? valueAt(localeRuntime, field) : undefined)) {
      blockers.push(`runtime gate evidence ${field} is required`);
    }
  }
  return blockers;
}

function findLatestReleaseEvidencePath(repoRoot: string): string {
  const root = path.join(repoRoot, 'docs', 'heisenberg', 'production-release-evidence');
  if (!fs.existsSync(root)) return path.join(root, 'missing', 'release_evidence.json');
  const latestDir = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()[0];
  return path.join(root, latestDir ?? 'missing', 'release_evidence.json');
}

function resolveAllowedPath(repoRoot: string, requestedPath: string | undefined, fallbackPath: string, label: string): string {
  const requested = path.resolve(repoRoot, requestedPath ?? fallbackPath);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => requested === root || requested.startsWith(`${root}${path.sep}`))) {
    throw new Error(`${label} must stay under .codex-tmp or docs/heisenberg`);
  }
  return requested;
}

function resolveEvidenceFilePath(repoRoot: string, requestedPath: unknown): string | null {
  if (typeof requestedPath !== 'string') return null;
  const resolved = path.resolve(repoRoot, requestedPath);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))
    ? resolved
    : null;
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--release-evidence') {
      options.releaseEvidencePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--strict') {
      options.strict = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function valueAt(record: unknown, key: string): unknown {
  return isRecord(record) ? record[key] : undefined;
}

function recordAt(record: unknown, key: string): JsonRecord | null {
  const value = valueAt(record, key);
  return isRecord(value) ? value : null;
}

function arrayAt(record: unknown, key: string): unknown[] {
  const value = valueAt(record, key);
  return Array.isArray(value) ? value : [];
}

function filledString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !PLACEHOLDER_PATTERN.test(trimmed);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

if (require.main === module) {
  try {
    const result = writeHeisenbergProductionReleaseEvidenceValidation(process.cwd(), parseCli(process.argv.slice(2)));
    console.log(`Heisenberg production release evidence validation: ${result.report.status}`);
    console.log(`Validation: ${result.report.validationStatus}`);
    console.log(`Report: ${relativePath(process.cwd(), result.outputPath)}`);
    if (result.report.blockers.length) console.log(`Blockers: ${result.report.blockers.length}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
