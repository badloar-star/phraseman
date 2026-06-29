import fs from 'node:fs';
import path from 'node:path';

type HeisenbergLocale = 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl';
type GateStatus = 'PASS' | 'HOLD' | 'NA';

type CliOptions = {
  readinessPath?: string;
  semanticClearanceValidationPath?: string;
  releaseEvidenceValidationPath?: string;
  quizValidationPath?: string;
  uiAuditPath?: string;
  uiMojibakeDashboardPath?: string;
  semanticAuditPath?: string;
  outputDir?: string;
  generatedAt?: string;
  strict?: boolean;
};

type JsonRecord = Record<string, unknown>;

type GateSummary = {
  status?: GateStatus;
  blockers?: string[];
  warnings?: string[];
  counts?: Record<string, number | string | boolean | null>;
};

type ReadinessLanguage = {
  locale: HeisenbergLocale;
  status: 'READY' | 'HOLD';
  progressPercent: number;
  passedRequiredGates: number;
  requiredGates: number;
  gates: Record<string, GateSummary>;
  blockers: string[];
  warnings: string[];
};

type MatrixBlocker = {
  id: string;
  locale: HeisenbergLocale;
  gate: string;
  category:
    | 'batch-coverage'
    | 'ui-locale'
    | 'semantic-fix'
    | 'semantic-clearance'
    | 'quiz-repair'
    | 'production-pack'
    | 'approvals'
    | 'server-runtime'
    | 'release-evidence';
  message: string;
  evidencePath: string | null;
  nextRequiredArtifact: string;
  nextCommand: string;
  repairDashboardPath?: string | null;
  repairTaskIds?: string[];
  repairFiles?: string[];
};

type MatrixLanguage = {
  locale: HeisenbergLocale;
  status: 'READY' | 'HOLD';
  progressPercent: number;
  passedRequiredGates: number;
  requiredGates: number;
  gateStatuses: Record<string, GateStatus>;
  nextRequiredArtifacts: string[];
  blockers: MatrixBlocker[];
  warnings: string[];
};

type ReleaseBlockerMatrixReport = {
  schemaVersion: 'heisenberg-release-blocker-matrix-v1';
  mode: 'release-blocker-matrix';
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  summary: {
    locales: number;
    readyLocales: number;
    blockedLocales: number;
    blockers: number;
    nextRequiredArtifacts: Record<string, number>;
    semanticWarnings: number;
    semanticClearanceReady: boolean;
    quizSourceApplyCandidateReady: boolean;
    releaseEvidenceReady: boolean;
  };
  evidence: {
    readinessPath: string | null;
    semanticClearanceValidationPath: string | null;
    releaseEvidenceValidationPath: string | null;
    quizValidationPath: string | null;
    uiAuditPath: string | null;
    uiMojibakeDashboardPath: string | null;
    semanticAuditPath: string | null;
  };
  languages: MatrixLanguage[];
  nextActions: string[];
};

type WriteResult = {
  report: ReleaseBlockerMatrixReport;
  outputDir: string;
  jsonPath: string;
  markdownPath: string;
};

const HEISENBERG_LOCALES: HeisenbergLocale[] = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const GATE_ORDER = [
  'batchCoverage',
  'uiLocale',
  'semantic',
  'quizPayloadRepair',
  'productionPack',
  'approvals',
  'serverRuntime',
] as const;

export function writeHeisenbergReleaseBlockerMatrix(repoRoot: string, options: CliOptions = {}): WriteResult {
  const report = buildHeisenbergReleaseBlockerMatrix(repoRoot, options);
  const outputDir = resolveAllowedPath(
    repoRoot,
    options.outputDir,
    path.join('docs', 'heisenberg', 'release-blocker-matrix', timestampSlug(report.generatedAt)),
    'Heisenberg release blocker matrix output',
  );
  const jsonPath = path.join(outputDir, 'release_blocker_matrix.json');
  const markdownPath = path.join(outputDir, 'release_blocker_matrix.md');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${renderMarkdown(report)}\n`, 'utf8');

  return { report, outputDir, jsonPath, markdownPath };
}

export function buildHeisenbergReleaseBlockerMatrix(
  repoRoot: string,
  options: CliOptions = {},
): ReleaseBlockerMatrixReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const evidencePaths = resolveEvidencePaths(repoRoot, options);
  const readiness = readJsonIfExists<JsonRecord>(evidencePaths.readinessPath);
  const semanticClearanceValidation = readJsonIfExists<JsonRecord>(evidencePaths.semanticClearanceValidationPath);
  const releaseEvidenceValidation = readJsonIfExists<JsonRecord>(evidencePaths.releaseEvidenceValidationPath);
  const quizValidation = readJsonIfExists<JsonRecord>(evidencePaths.quizValidationPath);
  const uiMojibakeDashboard = readJsonIfExists<JsonRecord>(evidencePaths.uiMojibakeDashboardPath);
  const semanticAudit = readJsonIfExists<JsonRecord>(evidencePaths.semanticAuditPath);

  const languages = readinessLanguages(readiness).map((language) =>
    matrixLanguage(language, evidencePaths, uiMojibakeDashboard),
  );
  const allBlockers = languages.flatMap((language) => language.blockers);
  const nextRequiredArtifacts = countBy(allBlockers.map((blocker) => blocker.nextRequiredArtifact));

  return {
    schemaVersion: 'heisenberg-release-blocker-matrix-v1',
    mode: 'release-blocker-matrix',
    generatedAt,
    status: languages.every((language) => language.status === 'READY') ? 'PASS' : 'HOLD',
    summary: {
      locales: languages.length,
      readyLocales: languages.filter((language) => language.status === 'READY').length,
      blockedLocales: languages.filter((language) => language.status === 'HOLD').length,
      blockers: allBlockers.length,
      nextRequiredArtifacts,
      semanticWarnings: numberAt(semanticClearanceValidation, 'semanticWarnings') || numberAt(recordAt(semanticAudit, 'summary'), 'warnings'),
      semanticClearanceReady: valueAt(semanticClearanceValidation, 'status') === 'PASS',
      quizSourceApplyCandidateReady: valueAt(quizValidation, 'sourceApplyCandidateReady') === true,
      releaseEvidenceReady: valueAt(releaseEvidenceValidation, 'status') === 'PASS',
    },
    evidence: {
      readinessPath: relativeOrNull(repoRoot, evidencePaths.readinessPath),
      semanticClearanceValidationPath: relativeOrNull(repoRoot, evidencePaths.semanticClearanceValidationPath),
      releaseEvidenceValidationPath: relativeOrNull(repoRoot, evidencePaths.releaseEvidenceValidationPath),
      quizValidationPath: relativeOrNull(repoRoot, evidencePaths.quizValidationPath),
      uiAuditPath: relativeOrNull(repoRoot, evidencePaths.uiAuditPath),
      uiMojibakeDashboardPath: relativeOrNull(repoRoot, evidencePaths.uiMojibakeDashboardPath),
      semanticAuditPath: relativeOrNull(repoRoot, evidencePaths.semanticAuditPath),
    },
    languages,
    nextActions: buildNextActions(nextRequiredArtifacts),
  };
}

function matrixLanguage(
  language: ReadinessLanguage,
  evidencePaths: Record<string, string | null>,
  uiMojibakeDashboard: JsonRecord | null,
): MatrixLanguage {
  const gateStatuses = Object.fromEntries(GATE_ORDER.map((gateName) => [
    gateName,
    (language.gates[gateName]?.status ?? 'HOLD') as GateStatus,
  ]));
  const blockers: MatrixBlocker[] = [];

  for (const gateName of GATE_ORDER) {
    const gate = language.gates[gateName];
    if (!gate || gate.status === 'PASS' || gate.status === 'NA') continue;
    const gateBlockers = Array.isArray(gate.blockers) && gate.blockers.length ? gate.blockers : [`${gateName} is not ready`];
    gateBlockers.forEach((message, index) => {
      blockers.push(blockerFor(language.locale, gateName, String(message), index, evidencePaths, uiMojibakeDashboard));
    });
  }

  return {
    locale: language.locale,
    status: language.status,
    progressPercent: language.progressPercent,
    passedRequiredGates: language.passedRequiredGates,
    requiredGates: language.requiredGates,
    gateStatuses,
    nextRequiredArtifacts: [...new Set(blockers.map((blocker) => blocker.nextRequiredArtifact))],
    blockers,
    warnings: language.warnings ?? [],
  };
}

function blockerFor(
  locale: HeisenbergLocale,
  gate: string,
  message: string,
  index: number,
  evidencePaths: Record<string, string | null>,
  uiMojibakeDashboard: JsonRecord | null,
): MatrixBlocker {
  const category = blockerCategory(gate, message);
  const plan = blockerPlan(category, evidencePaths);
  const blocker: MatrixBlocker = {
    id: `${locale}:${gate}:${index + 1}`,
    locale,
    gate,
    category,
    message,
    evidencePath: plan.evidencePath,
    nextRequiredArtifact: plan.nextRequiredArtifact,
    nextCommand: plan.nextCommand,
  };
  if (category === 'ui-locale') {
    const repairTasks = uiMojibakeTasksForLocale(uiMojibakeDashboard, locale);
    blocker.repairDashboardPath = evidencePaths.uiMojibakeDashboardPath;
    blocker.repairTaskIds = repairTasks.map((task) => stringAt(task, 'taskId')).filter(Boolean);
    blocker.repairFiles = [...new Set(repairTasks.map((task) => stringAt(task, 'file')).filter(Boolean))].sort();
  }
  return blocker;
}

function blockerCategory(gate: string, message: string): MatrixBlocker['category'] {
  if (gate === 'batchCoverage') return 'batch-coverage';
  if (gate === 'uiLocale') return 'ui-locale';
  if (gate === 'quizPayloadRepair') return 'quiz-repair';
  if (gate === 'productionPack') return 'production-pack';
  if (gate === 'approvals') return 'approvals';
  if (gate === 'serverRuntime') return 'server-runtime';
  if (message.includes('semantic warnings require reviewer clearance')) return 'semantic-clearance';
  if (message.includes('shared structured quiz payload repair')) return 'quiz-repair';
  if (message.includes('production release evidence')) return 'release-evidence';
  return 'semantic-fix';
}

function blockerPlan(
  category: MatrixBlocker['category'],
  evidencePaths: Record<string, string | null>,
): { evidencePath: string | null; nextRequiredArtifact: string; nextCommand: string } {
  switch (category) {
    case 'batch-coverage':
      return {
        evidencePath: evidencePaths.readinessPath,
        nextRequiredArtifact: 'batch manifest with zero coverage blockers',
        nextCommand: 'npm run heisenberg:batch:audit:strict',
      };
    case 'ui-locale':
      return {
        evidencePath: evidencePaths.uiAuditPath,
        nextRequiredArtifact: 'clean ui_locale_audit.json',
        nextCommand: 'npm run heisenberg:ui-audit',
      };
    case 'semantic-clearance':
      return {
        evidencePath: evidencePaths.semanticClearanceValidationPath,
        nextRequiredArtifact: 'semantic_clearance.json with real reviewer evidence',
        nextCommand: 'npm run heisenberg:semantic-clearance-validate -- --strict',
      };
    case 'semantic-fix':
      return {
        evidencePath: evidencePaths.semanticAuditPath,
        nextRequiredArtifact: 'clean semantic_audit.json',
        nextCommand: 'npm run heisenberg:semantic-audit:strict',
      };
    case 'quiz-repair':
      return {
        evidencePath: evidencePaths.quizValidationPath,
        nextRequiredArtifact: 'filled_work_order.json with real quiz payload evidence',
        nextCommand: 'npm run heisenberg:quiz-repair-validate',
      };
    case 'production-pack':
      return {
        evidencePath: evidencePaths.releaseEvidenceValidationPath,
        nextRequiredArtifact: 'release_evidence.json with fresh pack hashes',
        nextCommand: 'npm run heisenberg:release-evidence-validate -- --strict',
      };
    case 'approvals':
      return {
        evidencePath: evidencePaths.releaseEvidenceValidationPath,
        nextRequiredArtifact: 'release_evidence.json with reviewer/locale/product approvals',
        nextCommand: 'npm run heisenberg:release-evidence-validate -- --strict',
      };
    case 'server-runtime':
      return {
        evidencePath: evidencePaths.releaseEvidenceValidationPath,
        nextRequiredArtifact: 'release_evidence.json with offline/cache/rollback/storage/runtime evidence',
        nextCommand: 'npm run heisenberg:release-evidence-validate -- --strict',
      };
    case 'release-evidence':
      return {
        evidencePath: evidencePaths.releaseEvidenceValidationPath,
        nextRequiredArtifact: 'release_evidence.json',
        nextCommand: 'npm run heisenberg:release-evidence-validate -- --strict',
      };
  }
}

function readinessLanguages(readiness: JsonRecord | null): ReadinessLanguage[] {
  const languages = arrayAt(readiness, 'languages').filter(isRecord);
  if (!languages.length) {
    return HEISENBERG_LOCALES.map((locale) => ({
      locale,
      status: 'HOLD',
      progressPercent: 0,
      passedRequiredGates: 0,
      requiredGates: 7,
      gates: {},
      blockers: ['production readiness gate is missing'],
      warnings: [],
    }));
  }
  return languages.map((language) => ({
    locale: valueAt(language, 'locale') as HeisenbergLocale,
    status: valueAt(language, 'status') === 'READY' ? 'READY' : 'HOLD',
    progressPercent: numberAt(language, 'progressPercent'),
    passedRequiredGates: numberAt(language, 'passedRequiredGates'),
    requiredGates: numberAt(language, 'requiredGates'),
    gates: (recordAt(language, 'gates') ?? {}) as Record<string, GateSummary>,
    blockers: arrayAt(language, 'blockers').map(String),
    warnings: arrayAt(language, 'warnings').map(String),
  }));
}

function resolveEvidencePaths(repoRoot: string, options: CliOptions): Record<string, string | null> {
  return {
    readinessPath: resolveOptionalAllowedPath(
      repoRoot,
      options.readinessPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'production-readiness'], 'production_readiness_gate.json'),
      'Heisenberg production readiness input',
    ),
    semanticClearanceValidationPath: resolveOptionalAllowedPath(
      repoRoot,
      options.semanticClearanceValidationPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'semantic-clearance'], 'semantic_clearance_validation.json'),
      'Heisenberg semantic clearance validation input',
    ),
    releaseEvidenceValidationPath: resolveOptionalAllowedPath(
      repoRoot,
      options.releaseEvidenceValidationPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'production-release-evidence'], 'release_evidence_validation.json'),
      'Heisenberg production release evidence validation input',
    ),
    quizValidationPath: resolveOptionalAllowedPath(
      repoRoot,
      options.quizValidationPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'quiz-payload-ordinal-repair'], 'filled_work_order_validation.json'),
      'Heisenberg quiz repair validation input',
    ),
    uiAuditPath: resolveOptionalAllowedPath(
      repoRoot,
      options.uiAuditPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'ui'], 'ui_locale_audit.json'),
      'Heisenberg UI audit input',
    ),
    semanticAuditPath: resolveOptionalAllowedPath(
      repoRoot,
      options.semanticAuditPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'semantic'], 'semantic_audit.json'),
      'Heisenberg semantic audit input',
    ),
    uiMojibakeDashboardPath: resolveOptionalAllowedPath(
      repoRoot,
      options.uiMojibakeDashboardPath,
      findLatestReport(repoRoot, ['docs', 'heisenberg', 'ui-mojibake-repair'], 'ui_mojibake_repair_dashboard.json'),
      'Heisenberg UI mojibake repair dashboard input',
    ),
  };
}

function buildNextActions(nextRequiredArtifacts: Record<string, number>): string[] {
  return Object.entries(nextRequiredArtifacts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([artifact, count]) => `${artifact}: ${count} open blocker(s)`);
}

function renderMarkdown(report: ReleaseBlockerMatrixReport): string {
  const rows = report.languages.map((language) => {
    const artifacts = language.nextRequiredArtifacts.join('; ') || 'none';
    return `| ${language.locale} | ${language.status} | ${language.progressPercent}% (${language.passedRequiredGates}/${language.requiredGates}) | ${language.blockers.length} | ${artifacts} |`;
  });
  const blockerRows = report.languages.flatMap((language) =>
    language.blockers.slice(0, 12).map((blocker) => {
      const repairTasks = blocker.repairTaskIds?.length
        ? `${blocker.repairTaskIds.length}: ${blocker.repairTaskIds.slice(0, 3).join(', ')}${blocker.repairTaskIds.length > 3 ? ', ...' : ''}`
        : 'none';
      return `| ${blocker.locale} | ${blocker.category} | ${blocker.gate} | ${blocker.nextRequiredArtifact} | ${repairTasks.replace(/\|/g, '/')} | ${blocker.message.replace(/\|/g, '/')} |`;
    }),
  );

  return [
    '# Heisenberg Release Blocker Matrix',
    '',
    `- Status: ${report.status}`,
    `- Generated at: ${report.generatedAt}`,
    `- Ready locales: ${report.summary.readyLocales}/${report.summary.locales}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Semantic clearance ready: ${report.summary.semanticClearanceReady}`,
    `- Quiz source apply candidate ready: ${report.summary.quizSourceApplyCandidateReady}`,
    `- Release evidence ready: ${report.summary.releaseEvidenceReady}`,
    '',
    '## Per Locale',
    '',
    '| Locale | Status | Progress | Blockers | Next required artifacts |',
    '| --- | --- | ---: | ---: | --- |',
    ...rows,
    '',
    '## Top Blockers',
    '',
    '| Locale | Category | Gate | Next artifact | UI repair tasks | Message |',
    '| --- | --- | --- | --- | --- | --- |',
    ...(blockerRows.length ? blockerRows : ['| all | none | none | none | none | none |']),
    '',
    '## Evidence',
    '',
    ...Object.entries(report.evidence).map(([key, value]) => `- ${key}: ${value ?? 'missing'}`),
  ].join('\n');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--readiness') {
      options.readinessPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--semantic-clearance-validation') {
      options.semanticClearanceValidationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--release-evidence-validation') {
      options.releaseEvidenceValidationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--quiz-validation') {
      options.quizValidationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--ui-audit') {
      options.uiAuditPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--ui-mojibake-dashboard') {
      options.uiMojibakeDashboardPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--semantic-audit') {
      options.semanticAuditPath = readValue(argv, index, arg);
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

function findLatestReport(repoRoot: string, segments: string[], fileName: string): string | null {
  const root = path.join(repoRoot, ...segments);
  if (!fs.existsSync(root)) return null;
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((entry) => fs.existsSync(path.join(root, entry, fileName)));
  return latest ? path.join(root, latest, fileName) : null;
}

function resolveOptionalAllowedPath(repoRoot: string, requested: string | undefined, fallback: string | null, label: string): string | null {
  if (!requested && !fallback) return null;
  return resolveAllowedPath(repoRoot, requested, fallback ?? '', label);
}

function resolveAllowedPath(repoRoot: string, requested: string | undefined, fallback: string, label: string): string {
  const resolved = path.resolve(repoRoot, requested ?? fallback);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`))) {
    throw new Error(`${label} must stay under .codex-tmp or docs/heisenberg`);
  }
  return resolved;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function readJsonIfExists<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
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

function numberAt(record: unknown, key: string): number {
  const value = valueAt(record, key);
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function uiMojibakeTasksForLocale(dashboard: JsonRecord | null, locale: HeisenbergLocale): JsonRecord[] {
  return arrayAt(dashboard, 'tasks')
    .filter(isRecord)
    .filter((task) => stringAt(task, 'locale') === locale);
}

function stringAt(record: unknown, key: string): string {
  const value = valueAt(record, key);
  return typeof value === 'string' ? value : '';
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function timestampSlug(value: string): string {
  return value.replace(/[:.]/g, '-');
}

function relativeOrNull(repoRoot: string, filePath: string | null): string | null {
  return filePath ? path.relative(repoRoot, filePath).replace(/\\/g, '/') : null;
}

if (require.main === module) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = writeHeisenbergReleaseBlockerMatrix(process.cwd(), options);
    console.log(`Heisenberg release blocker matrix: ${result.report.status}`);
    console.log(`Ready locales: ${result.report.summary.readyLocales}/${result.report.summary.locales}`);
    console.log(`Blockers: ${result.report.summary.blockers}`);
    console.log(`Report: ${relativeOrNull(process.cwd(), result.jsonPath)}`);
    if (options.strict && result.report.status !== 'PASS') process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
