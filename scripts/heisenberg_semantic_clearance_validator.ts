import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  semanticAuditPath?: string;
  clearancePath?: string;
  outputPath?: string;
  generatedAt?: string;
  strict?: boolean;
};

type JsonRecord = Record<string, unknown>;

type SemanticWarningTask = {
  taskId: string;
  code: string;
  surface: string;
  difficulty?: string;
  ordinal?: number;
  id?: number | string;
  locale?: string;
  field?: string;
  message: string;
  sample?: string;
};

type ClearanceRow = {
  taskId?: unknown;
  decision?: unknown;
  reviewerEvidenceId?: unknown;
  localeEvidenceId?: unknown;
  notes?: unknown;
};

type ValidationReport = {
  schemaVersion: 'heisenberg-semantic-clearance-validation-v1';
  status: 'PASS' | 'HOLD';
  validationStatus: 'SEMANTIC_WARNINGS_CLEARED' | 'MISSING_SEMANTIC_CLEARANCE' | 'HOLD';
  generatedAt: string;
  semanticAuditPath: string;
  clearancePath: string;
  generatedClearanceArtifact: boolean;
  generatedDecisionsOrEvidence: boolean;
  semanticBlockersRemaining: number;
  semanticWarnings: number;
  expectedClearanceTasks: number;
  filledClearanceTasks: number;
  missingTaskIds: string[];
  duplicateTaskIds: string[];
  unknownTaskIds: string[];
  locales: Record<string, {
    warnings: number;
    cleared: number;
    blockers: string[];
  }>;
  blockers: string[];
};

type WriteResult = {
  report: ValidationReport;
  outputPath: string;
};

const CLEARANCE_SCHEMA_VERSION = 'heisenberg-semantic-clearance-v1';
const TEMPLATE_SCHEMA_VERSION = 'heisenberg-semantic-clearance-template-v1';
const DEFAULT_OUTPUT_NAME = 'semantic_clearance_validation.json';
const PLACEHOLDER_PATTERN = /^(?:todo|tbd|pending|blank|example|sample|fill[_ -]?me|replace[_ -]?me|n\/a|na|none|null)$/i;

export function writeHeisenbergSemanticClearanceValidation(repoRoot: string, options: CliOptions = {}): WriteResult {
  const semanticAuditPath = resolveAllowedPath(
    repoRoot,
    options.semanticAuditPath,
    findLatestSemanticAudit(repoRoot),
    'Heisenberg semantic audit input',
  );
  const clearancePath = resolveAllowedPath(
    repoRoot,
    options.clearancePath,
    findLatestSemanticClearance(repoRoot),
    'Heisenberg semantic clearance input',
  );
  const outputPath = resolveAllowedPath(
    repoRoot,
    options.outputPath,
    path.join(path.dirname(clearancePath), DEFAULT_OUTPUT_NAME),
    'Heisenberg semantic clearance validation output',
  );

  const semanticAudit = readJsonFile<JsonRecord>(semanticAuditPath);
  const clearance = fs.existsSync(clearancePath) ? readJsonFile<JsonRecord>(clearancePath) : null;
  const report = buildValidationReport(
    repoRoot,
    semanticAuditPath,
    semanticAudit,
    clearancePath,
    clearance,
    options.generatedAt ?? new Date().toISOString(),
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (options.strict && report.status !== 'PASS') {
    throw new Error(`Heisenberg semantic clearance validation failed: ${report.blockers.join('; ')}`);
  }

  return { report, outputPath };
}

function buildValidationReport(
  repoRoot: string,
  semanticAuditPath: string,
  semanticAudit: JsonRecord,
  clearancePath: string,
  clearance: JsonRecord | null,
  generatedAt: string,
): ValidationReport {
  const warningTasks = semanticWarningTasks(semanticAudit);
  const expectedByTaskId = new Map(warningTasks.map((task) => [task.taskId, task]));
  const semanticBlockersRemaining = arrayAt(semanticAudit, 'findings')
    .filter(isRecord)
    .filter((finding) => valueAt(finding, 'severity') === 'blocker').length;
  const blockers: string[] = [];

  if (!clearance) {
    blockers.push('external semantic clearance artifact is missing');
  } else {
    blockers.push(...validateEnvelope(clearance));
  }

  const rows = clearanceRows(clearance);
  const duplicateTaskIds = duplicateIds(rows);
  const rowsByTaskId = new Map<string, ClearanceRow>();
  for (const row of rows) {
    if (typeof row.taskId === 'string' && !rowsByTaskId.has(row.taskId)) rowsByTaskId.set(row.taskId, row);
  }
  const missingTaskIds = warningTasks.map((task) => task.taskId).filter((taskId) => !rowsByTaskId.has(taskId));
  const unknownTaskIds = [...rowsByTaskId.keys()].filter((taskId) => !expectedByTaskId.has(taskId));

  for (const taskId of duplicateTaskIds) blockers.push(`semantic clearance contains duplicate task ${taskId}`);
  for (const taskId of missingTaskIds) blockers.push(`semantic clearance is missing task ${taskId}`);
  for (const taskId of unknownTaskIds) blockers.push(`semantic clearance contains stale or unknown task ${taskId}`);

  for (const task of warningTasks) {
    const row = rowsByTaskId.get(task.taskId);
    if (!row) continue;
    validateClearanceRow(task, row, blockers);
  }

  const localeReports = buildLocaleReports(warningTasks, rowsByTaskId, blockers);
  const uniqueBlockers = uniqueStrings(blockers);

  return {
    schemaVersion: 'heisenberg-semantic-clearance-validation-v1',
    status: uniqueBlockers.length === 0 ? 'PASS' : 'HOLD',
    validationStatus: uniqueBlockers.length === 0
      ? 'SEMANTIC_WARNINGS_CLEARED'
      : clearance
        ? 'HOLD'
        : 'MISSING_SEMANTIC_CLEARANCE',
    generatedAt,
    semanticAuditPath: relativePath(repoRoot, semanticAuditPath),
    clearancePath: relativePath(repoRoot, clearancePath),
    generatedClearanceArtifact: valueAt(clearance, 'generatedClearanceArtifact') === true,
    generatedDecisionsOrEvidence: valueAt(clearance, 'generatedDecisionsOrEvidence') === true,
    semanticBlockersRemaining,
    semanticWarnings: warningTasks.length,
    expectedClearanceTasks: warningTasks.length,
    filledClearanceTasks: rowsByTaskId.size,
    missingTaskIds,
    duplicateTaskIds,
    unknownTaskIds,
    locales: localeReports,
    blockers: uniqueBlockers,
  };
}

function validateEnvelope(clearance: JsonRecord): string[] {
  const blockers: string[] = [];
  const schemaVersion = valueAt(clearance, 'schemaVersion');
  if (schemaVersion === TEMPLATE_SCHEMA_VERSION || valueAt(clearance, 'templateOnly') === true) {
    blockers.push('semantic clearance template cannot be submitted as clearance evidence');
  }
  if (schemaVersion !== CLEARANCE_SCHEMA_VERSION) {
    blockers.push(`schemaVersion must be ${CLEARANCE_SCHEMA_VERSION}`);
  }
  if (valueAt(clearance, 'generatedClearanceArtifact') !== false) {
    blockers.push('generatedClearanceArtifact must be false');
  }
  if (valueAt(clearance, 'generatedDecisionsOrEvidence') !== false) {
    blockers.push('generatedDecisionsOrEvidence must be false');
  }
  if (!filledString(valueAt(clearance, 'reviewBatchEvidenceId'))) {
    blockers.push('reviewBatchEvidenceId is required');
  }
  return blockers;
}

function validateClearanceRow(task: SemanticWarningTask, row: ClearanceRow, blockers: string[]): void {
  if (row.decision !== 'reviewer-cleared') {
    blockers.push(`${task.taskId} decision must be reviewer-cleared for an active semantic warning`);
  }
  if (!filledString(row.reviewerEvidenceId)) {
    blockers.push(`${task.taskId} reviewerEvidenceId is required`);
  }
  if (task.locale && !filledString(row.localeEvidenceId)) {
    blockers.push(`${task.taskId} localeEvidenceId is required`);
  }
  if (!filledString(row.notes)) {
    blockers.push(`${task.taskId} notes are required`);
  }
}

function clearanceRows(clearance: JsonRecord | null): ClearanceRow[] {
  const rows = arrayAt(clearance, 'clearances').filter(isRecord) as ClearanceRow[];
  const alternateRows = arrayAt(clearance, 'warningClearances').filter(isRecord) as ClearanceRow[];
  return rows.length ? rows : alternateRows;
}

function buildLocaleReports(
  warningTasks: SemanticWarningTask[],
  rowsByTaskId: Map<string, ClearanceRow>,
  blockers: string[],
): ValidationReport['locales'] {
  const locales = new Set(warningTasks.map((task) => task.locale ?? 'shared'));
  const reports: ValidationReport['locales'] = {};
  for (const locale of [...locales].sort()) {
    const tasks = warningTasks.filter((task) => (task.locale ?? 'shared') === locale);
    const localeBlockers = blockers.filter((blocker) => tasks.some((task) => blocker.includes(task.taskId)));
    reports[locale] = {
      warnings: tasks.length,
      cleared: tasks.filter((task) => rowsByTaskId.has(task.taskId)).length,
      blockers: uniqueStrings(localeBlockers),
    };
  }
  return reports;
}

function semanticWarningTasks(semanticAudit: JsonRecord): SemanticWarningTask[] {
  return arrayAt(semanticAudit, 'findings')
    .filter(isRecord)
    .filter((finding) => valueAt(finding, 'severity') === 'warning')
    .map((finding, index) => {
      const code = String(valueAt(finding, 'code') ?? 'unknown');
      const surface = String(valueAt(finding, 'surface') ?? 'unknown');
      const difficulty = stringValue(valueAt(finding, 'difficulty'));
      const ordinal = numberValue(valueAt(finding, 'ordinal'));
      const idValue = valueAt(finding, 'id');
      const locale = stringValue(valueAt(finding, 'locale'));
      const field = stringValue(valueAt(finding, 'field'));
      const message = String(valueAt(finding, 'message') ?? '');
      return {
        taskId: warningTaskId(index, {
          code,
          surface,
          difficulty,
          ordinal,
          id: typeof idValue === 'string' || typeof idValue === 'number' ? idValue : undefined,
          locale,
          field,
          message,
        }),
        code,
        surface,
        ...(difficulty ? { difficulty } : {}),
        ...(ordinal ? { ordinal } : {}),
        ...(typeof idValue === 'string' || typeof idValue === 'number' ? { id: idValue } : {}),
        ...(locale ? { locale } : {}),
        ...(field ? { field } : {}),
        message,
        ...(stringValue(valueAt(finding, 'sample')) ? { sample: stringValue(valueAt(finding, 'sample')) } : {}),
      };
    });
}

function warningTaskId(index: number, task: Omit<SemanticWarningTask, 'taskId'>): string {
  const parts = [
    index + 1,
    task.code,
    task.surface,
    task.difficulty ?? 'any',
    task.ordinal ?? task.id ?? 'any',
    task.locale ?? 'shared',
    task.field ?? 'field',
  ].map((part) => String(part).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  return `semantic-warning:${parts.join(':')}`;
}

function findLatestSemanticAudit(repoRoot: string): string {
  const root = path.join(repoRoot, 'docs', 'heisenberg', 'semantic');
  if (!fs.existsSync(root)) return path.join(root, 'missing', 'semantic_audit.json');
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((entry) => fs.existsSync(path.join(root, entry, 'semantic_audit.json')));
  return path.join(root, latest ?? 'missing', 'semantic_audit.json');
}

function findLatestSemanticClearance(repoRoot: string): string {
  const root = path.join(repoRoot, 'docs', 'heisenberg', 'semantic-clearance');
  if (!fs.existsSync(root)) return path.join(root, 'missing', 'semantic_clearance.json');
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()[0];
  return path.join(root, latest ?? 'missing', 'semantic_clearance.json');
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

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--semantic-audit') {
      options.semanticAuditPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--clearance') {
      options.clearancePath = readValue(argv, index, arg);
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

function duplicateIds(rows: ClearanceRow[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    if (typeof row.taskId !== 'string') continue;
    if (seen.has(row.taskId)) duplicates.add(row.taskId);
    seen.add(row.taskId);
  }
  return [...duplicates].sort();
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

function arrayAt(record: unknown, key: string): unknown[] {
  const value = valueAt(record, key);
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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
    const result = writeHeisenbergSemanticClearanceValidation(process.cwd(), parseCli(process.argv.slice(2)));
    console.log(`Heisenberg semantic clearance validation: ${result.report.status}`);
    console.log(`Validation: ${result.report.validationStatus}`);
    console.log(`Expected clearance tasks: ${result.report.expectedClearanceTasks}`);
    console.log(`Report: ${relativePath(process.cwd(), result.outputPath)}`);
    if (result.report.blockers.length) console.log(`Blockers: ${result.report.blockers.length}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
