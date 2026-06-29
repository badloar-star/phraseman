import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  uiAuditPath?: string;
  outputDir?: string;
  generatedAt?: string;
  strict?: boolean;
};

type JsonRecord = Record<string, unknown>;

type UiMojibakeTask = {
  taskId: string;
  file: string;
  line: number | null;
  column: number | null;
  locale: string;
  code: string;
  severity: string;
  sample: string;
  message: string;
  requiredAction: string;
};

type UiMojibakeRepairDashboard = {
  schemaVersion: 'heisenberg-ui-mojibake-repair-dashboard-v1';
  mode: 'ui-mojibake-repair-dashboard';
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  uiAuditPath: string;
  activationReady: boolean;
  readOnly: true;
  sourceMutationApplied: false;
  summary: {
    findings: number;
    blockers: number;
    files: number;
    locales: number;
    byFile: Record<string, number>;
    byLocale: Record<string, number>;
    byCode: Record<string, number>;
  };
  requiredArtifacts: {
    repairedSourceFiles: string[];
    validationCommand: 'npm run heisenberg:ui-audit';
    productionReadinessCommand: 'npm run heisenberg:production-readiness';
  };
  blockers: string[];
  tasks: UiMojibakeTask[];
};

type WriteResult = {
  dashboard: UiMojibakeRepairDashboard;
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
};

export function writeHeisenbergUiMojibakeRepairDashboard(
  repoRoot: string,
  options: CliOptions = {},
): WriteResult {
  const uiAuditPath = resolveAllowedPath(
    repoRoot,
    options.uiAuditPath,
    findLatestUiAudit(repoRoot),
    'Heisenberg UI audit input',
  );
  const uiAudit = readJsonFile<JsonRecord>(uiAuditPath);
  const dashboard = buildHeisenbergUiMojibakeRepairDashboard(
    repoRoot,
    uiAuditPath,
    uiAudit,
    options.generatedAt ?? new Date().toISOString(),
  );
  const outputDir = resolveAllowedPath(
    repoRoot,
    options.outputDir,
    path.join('docs', 'heisenberg', 'ui-mojibake-repair', timestampSlug(dashboard.generatedAt)),
    'Heisenberg UI mojibake repair dashboard output',
  );
  const jsonPath = path.join(outputDir, 'ui_mojibake_repair_dashboard.json');
  const markdownPath = path.join(outputDir, 'ui_mojibake_repair_dashboard.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(dashboard)}\n`, 'utf8');

  if (options.strict && dashboard.status !== 'PASS') {
    throw new Error(`Heisenberg UI mojibake repair dashboard is HOLD: ${dashboard.blockers.join('; ')}`);
  }

  return { dashboard, outputDir, jsonPath, markdownPath };
}

export function buildHeisenbergUiMojibakeRepairDashboard(
  repoRoot: string,
  uiAuditPath: string,
  uiAudit: JsonRecord,
  generatedAt: string,
): UiMojibakeRepairDashboard {
  const tasks = arrayAt(uiAudit, 'findings')
    .filter(isRecord)
    .filter((finding) => valueAt(finding, 'code') === 'locale-string-mojibake')
    .map((finding, index) => uiFindingTask(index, finding));
  const blockers = tasks.map((task) => `${task.file}:${task.line ?? '?'} ${task.locale} ${task.code}`);
  const byFile = countBy(tasks.map((task) => task.file));
  const byLocale = countBy(tasks.map((task) => task.locale));
  const byCode = countBy(tasks.map((task) => task.code));

  return {
    schemaVersion: 'heisenberg-ui-mojibake-repair-dashboard-v1',
    mode: 'ui-mojibake-repair-dashboard',
    generatedAt,
    status: tasks.length === 0 && valueAt(uiAudit, 'activationReady') === true ? 'PASS' : 'HOLD',
    uiAuditPath: relativePath(repoRoot, uiAuditPath),
    activationReady: valueAt(uiAudit, 'activationReady') === true,
    readOnly: true,
    sourceMutationApplied: false,
    summary: {
      findings: tasks.length,
      blockers: blockers.length,
      files: Object.keys(byFile).length,
      locales: Object.keys(byLocale).length,
      byFile,
      byLocale,
      byCode,
    },
    requiredArtifacts: {
      repairedSourceFiles: Object.keys(byFile).sort(),
      validationCommand: 'npm run heisenberg:ui-audit',
      productionReadinessCommand: 'npm run heisenberg:production-readiness',
    },
    blockers,
    tasks,
  };
}

function uiFindingTask(index: number, finding: JsonRecord): UiMojibakeTask {
  const file = stringValue(valueAt(finding, 'file')) ?? 'unknown';
  const locale = stringValue(valueAt(finding, 'keyPath')) ?? stringValue(valueAt(finding, 'locale')) ?? 'unknown';
  const line = numberValue(valueAt(finding, 'line'));
  const column = numberValue(valueAt(finding, 'column'));
  const code = stringValue(valueAt(finding, 'code')) ?? 'locale-string-mojibake';
  return {
    taskId: `ui-mojibake:${index + 1}:${file.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}:${locale.toLowerCase()}:${line ?? 'line'}`,
    file,
    line: line ?? null,
    column: column ?? null,
    locale,
    code,
    severity: stringValue(valueAt(finding, 'severity')) ?? 'blocker',
    sample: stringValue(valueAt(finding, 'sample')) ?? '',
    message: stringValue(valueAt(finding, 'message')) ?? '',
    requiredAction: 'Repair the corrupted locale string in source, then rerun npm run heisenberg:ui-audit until activationReady is true.',
  };
}

function renderMarkdown(dashboard: UiMojibakeRepairDashboard): string {
  const rows = dashboard.tasks.map((task) =>
    `| ${task.taskId} | ${task.file}:${task.line ?? '?'} | ${task.locale} | ${task.sample.replace(/\|/g, '/')} |`,
  );
  return [
    '# Heisenberg UI Mojibake Repair Dashboard',
    '',
    `- Status: ${dashboard.status}`,
    `- Generated at: ${dashboard.generatedAt}`,
    `- UI audit: ${dashboard.uiAuditPath}`,
    `- Activation ready: ${dashboard.activationReady}`,
    `- Findings: ${dashboard.summary.findings}`,
    `- Files: ${dashboard.summary.files}`,
    `- Locales: ${dashboard.summary.locales}`,
    `- Read-only: ${dashboard.readOnly}`,
    `- Source mutation applied: ${dashboard.sourceMutationApplied}`,
    '',
    '## By File',
    '',
    ...Object.entries(dashboard.summary.byFile).map(([file, count]) => `- ${file}: ${count}`),
    '',
    '## By Locale',
    '',
    ...Object.entries(dashboard.summary.byLocale).map(([locale, count]) => `- ${locale}: ${count}`),
    '',
    '## Tasks',
    '',
    '| Task | Location | Locale | Sample |',
    '| --- | --- | --- | --- |',
    ...(rows.length ? rows : ['| none | none | none | none |']),
  ].join('\n');
}

function findLatestUiAudit(repoRoot: string): string {
  const root = path.join(repoRoot, 'docs', 'heisenberg', 'ui');
  if (!fs.existsSync(root)) return path.join(root, 'missing', 'ui_locale_audit.json');
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((entry) => fs.existsSync(path.join(root, entry, 'ui_locale_audit.json')));
  return path.join(root, latest ?? 'missing', 'ui_locale_audit.json');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--ui-audit') {
      options.uiAuditPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
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

function timestampSlug(value: string): string {
  return value.replace(/[:.]/g, '-');
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

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

if (require.main === module) {
  try {
    const result = writeHeisenbergUiMojibakeRepairDashboard(process.cwd(), parseCli(process.argv.slice(2)));
    console.log(`Heisenberg UI mojibake repair dashboard: ${result.dashboard.status}`);
    console.log(`Findings: ${result.dashboard.summary.findings}`);
    console.log(`Files: ${result.dashboard.summary.files}`);
    console.log(`Report: ${relativePath(process.cwd(), result.jsonPath)}`);
    if (result.dashboard.status !== 'PASS' && process.argv.includes('--strict')) process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
