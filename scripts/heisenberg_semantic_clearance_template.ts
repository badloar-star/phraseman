import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  semanticAuditPath?: string;
  outputDir?: string;
  generatedAt?: string;
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

type SemanticClearanceTemplate = {
  schemaVersion: 'heisenberg-semantic-clearance-template-v1';
  targetSchemaVersion: 'heisenberg-semantic-clearance-v1';
  templateOnly: true;
  generatedAt: string;
  generatedClearanceArtifact: false;
  generatedDecisionsOrEvidence: false;
  semanticAuditPath: string;
  summary: {
    warningTasks: number;
    byCode: Record<string, number>;
    byLocale: Record<string, number>;
  };
  instructions: string[];
  warningTasks: SemanticWarningTask[];
  clearances: {
    taskId: string;
    decision: '';
    reviewerEvidenceId: '';
    localeEvidenceId: '';
    notes: '';
  }[];
};

type WriteResult = {
  template: SemanticClearanceTemplate;
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
};

export function writeHeisenbergSemanticClearanceTemplate(repoRoot: string, options: CliOptions = {}): WriteResult {
  const semanticAuditPath = resolveAllowedPath(
    repoRoot,
    options.semanticAuditPath,
    findLatestSemanticAudit(repoRoot),
    'Heisenberg semantic audit input',
  );
  const semanticAudit = readJsonFile<JsonRecord>(semanticAuditPath);
  const template = buildHeisenbergSemanticClearanceTemplate(
    repoRoot,
    semanticAuditPath,
    semanticAudit,
    options.generatedAt ?? new Date().toISOString(),
  );
  const outputDir = resolveAllowedPath(
    repoRoot,
    options.outputDir,
    path.join('docs', 'heisenberg', 'semantic-clearance', timestampSlug(template.generatedAt)),
    'Heisenberg semantic clearance template output',
  );
  const jsonPath = path.join(outputDir, 'semantic_clearance_template.json');
  const markdownPath = path.join(outputDir, 'semantic_clearance_template.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(template)}\n`, 'utf8');

  return { template, outputDir, jsonPath, markdownPath };
}

export function buildHeisenbergSemanticClearanceTemplate(
  repoRoot: string,
  semanticAuditPath: string,
  semanticAudit: JsonRecord,
  generatedAt: string,
): SemanticClearanceTemplate {
  const warningTasks = semanticWarningTasks(semanticAudit);
  const byCode: Record<string, number> = {};
  const byLocale: Record<string, number> = {};
  for (const task of warningTasks) {
    byCode[task.code] = (byCode[task.code] ?? 0) + 1;
    byLocale[task.locale ?? 'shared'] = (byLocale[task.locale ?? 'shared'] ?? 0) + 1;
  }

  return {
    schemaVersion: 'heisenberg-semantic-clearance-template-v1',
    targetSchemaVersion: 'heisenberg-semantic-clearance-v1',
    templateOnly: true,
    generatedAt,
    generatedClearanceArtifact: false,
    generatedDecisionsOrEvidence: false,
    semanticAuditPath: relativePath(repoRoot, semanticAuditPath),
    summary: {
      warningTasks: warningTasks.length,
      byCode,
      byLocale,
    },
    instructions: [
      'This is a template, not semantic clearance evidence.',
      'Copy to semantic_clearance.json only after each active warning has real reviewer evidence.',
      'Use decision "reviewer-cleared" only for warnings that should remain active but are accepted by review.',
      'If a warning is fixed in source content, rerun the semantic audit so the task disappears instead of clearing it here.',
      'The validator rejects template schema, generated evidence, blank ids, placeholders, duplicate tasks, and stale task ids.',
    ],
    warningTasks,
    clearances: warningTasks.map((task) => ({
      taskId: task.taskId,
      decision: '',
      reviewerEvidenceId: '',
      localeEvidenceId: '',
      notes: '',
    })),
  };
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

function renderMarkdown(template: SemanticClearanceTemplate): string {
  const topRows = Object.entries(template.summary.byCode)
    .sort((left, right) => right[1] - left[1])
    .map(([code, count]) => `- ${code}: ${count}`);
  const sampleRows = template.warningTasks.slice(0, 40).map((task) => {
    const where = [
      task.surface,
      task.difficulty,
      task.ordinal ? `#${task.ordinal}` : null,
      task.locale,
      task.field,
    ].filter(Boolean).join(' ');
    return `- ${task.taskId} | ${where}: ${task.message}${task.sample ? ` | ${task.sample}` : ''}`;
  });
  return [
    '# Heisenberg Semantic Clearance Template',
    '',
    `- Generated at: ${template.generatedAt}`,
    `- Semantic audit: ${template.semanticAuditPath}`,
    `- Warning tasks: ${template.summary.warningTasks}`,
    `- Generated clearance artifact: ${template.generatedClearanceArtifact}`,
    '',
    '## Warning Codes',
    '',
    ...topRows,
    '',
    '## First Warning Tasks',
    '',
    ...sampleRows,
  ].join('\n');
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

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--semantic-audit') {
      options.semanticAuditPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out-dir') {
      options.outputDir = readValue(argv, index, arg);
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

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

if (require.main === module) {
  try {
    const result = writeHeisenbergSemanticClearanceTemplate(process.cwd(), parseCli(process.argv.slice(2)));
    console.log('Heisenberg semantic clearance template: READY_FOR_EXTERNAL_REVIEW');
    console.log(`Warning tasks: ${result.template.summary.warningTasks}`);
    console.log(`Template: ${relativePath(process.cwd(), result.jsonPath)}`);
    console.log(`Markdown: ${relativePath(process.cwd(), result.markdownPath)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
