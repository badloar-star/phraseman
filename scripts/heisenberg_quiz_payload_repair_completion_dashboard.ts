import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  workOrderPath?: string;
  validationPath?: string;
  filledArtifactPath?: string;
  outputPath?: string;
  markdownOutputPath?: string;
  generatedAt?: string;
};

type WorkOrder = {
  mode: 'quiz-payload-repair-work-order';
  status: 'READY_FOR_REVIEW';
  generatedFilledArtifact: false;
  summary: {
    replacementPayloadTasks: number;
    collisionDecisionTasks: number;
    residualValidationTasks: number;
    localesPerReplacementTask: string[];
  };
  replacementPayloadTasks: ReplacementPayloadTask[];
  collisionDecisionTasks: CollisionDecisionTask[];
  residualValidationTasks: ResidualValidationTask[];
};

type SourceEntryContext = {
  ordinal: number;
  correctChoice: string;
  choices: string[];
};

type ReplacementPayloadTask = {
  taskId: string;
  difficulty: string;
  ordinal: number;
  sourceEntry: SourceEntryContext | null;
  requiredLocales: string[];
  acceptanceCriteria?: string[];
};

type CollisionDecisionTask = {
  taskId: string;
  difficulty: string;
  targetOrdinal: number;
  incomingSourceKeys: number[];
  sourceEntry: SourceEntryContext | null;
  acceptanceCriteria?: string[];
};

type ResidualValidationTask = {
  taskId: string;
  difficulty: string;
  ordinal: number;
  code: string;
  sourceEntry: SourceEntryContext | null;
};

type JsonRecord = Record<string, unknown>;

type DashboardTask = {
  taskId: string;
  kind: 'replacement-payload' | 'collision-decision' | 'residual-validation';
  difficulty: string;
  ordinal: number;
  correctChoice: string | null;
  requiredLocales: string[];
  requiredFields: string[];
  completionStatus: 'pending-filled-artifact' | 'missing' | 'present' | 'unknown';
};

type CompletionDashboard = {
  schemaVersion: 'heisenberg-quiz-payload-repair-completion-dashboard-v1';
  mode: 'quiz-payload-repair-completion-dashboard';
  generatedAt: string;
  status: 'HOLD' | 'PASS';
  workOrderPath: string;
  validationPath: string | null;
  filledArtifactPath: string;
  hasFilledArtifact: boolean;
  validationStatus: string | null;
  sourceApplyCandidateReady: boolean;
  generatedDecisionsOrEvidence: boolean;
  summary: {
    replacementPayloadTasks: number;
    collisionDecisionTasks: number;
    residualValidationTasks: number;
    totalReviewTasks: number;
    requiredLocales: string[];
    requiredLocalePayloads: number;
    requiredPrompts: number;
    requiredExplanations: number;
    requiredReviewerEvidenceIds: number;
    requiredLocaleEvidenceIds: number;
    presentReplacementRows: number;
    presentCollisionDecisionRows: number;
    presentResidualValidationRows: number;
    missingReplacementTaskIds: number;
    missingCollisionTaskIds: number;
    missingResidualTaskIds: number;
    blockers: number;
  };
  requiredArtifacts: {
    filledWorkOrder: 'filled_work_order.json';
    validatorCommand: 'npm run heisenberg:quiz-repair-validate -- --strict';
    sourceApplyCandidate: 'source_apply_candidate.json';
  };
  blockers: string[];
  tasks: DashboardTask[];
};

type WriteResult = {
  dashboard: CompletionDashboard;
  outputPath: string;
  markdownOutputPath: string;
};

const DEFAULT_OUTPUT_NAME = 'completion_dashboard.json';
const DEFAULT_MARKDOWN_OUTPUT_NAME = 'completion_dashboard.md';

export function writeHeisenbergQuizPayloadRepairCompletionDashboard(
  repoRoot: string,
  options: CliOptions = {},
): WriteResult {
  const workOrderPath = resolveAllowedPath(
    repoRoot,
    options.workOrderPath,
    findLatestWorkOrder(repoRoot),
    'Heisenberg quiz repair work-order input',
  );
  const validationPath = resolveAllowedPath(
    repoRoot,
    options.validationPath,
    path.join(path.dirname(workOrderPath), 'filled_work_order_validation.json'),
    'Heisenberg quiz repair validation input',
  );
  const filledArtifactPath = resolveAllowedPath(
    repoRoot,
    options.filledArtifactPath,
    path.join(path.dirname(workOrderPath), 'filled_work_order.json'),
    'Heisenberg quiz repair filled artifact input',
  );
  const outputPath = resolveAllowedPath(
    repoRoot,
    options.outputPath,
    path.join(path.dirname(workOrderPath), DEFAULT_OUTPUT_NAME),
    'Heisenberg quiz repair completion dashboard output',
  );
  const markdownOutputPath = resolveAllowedPath(
    repoRoot,
    options.markdownOutputPath,
    path.join(path.dirname(workOrderPath), DEFAULT_MARKDOWN_OUTPUT_NAME),
    'Heisenberg quiz repair completion dashboard markdown output',
  );

  const workOrder = readJsonFile<WorkOrder>(workOrderPath);
  const validation = fs.existsSync(validationPath) ? readJsonFile<JsonRecord>(validationPath) : null;
  const filledArtifact = fs.existsSync(filledArtifactPath) ? readJsonFile<JsonRecord>(filledArtifactPath) : null;
  const dashboard = buildCompletionDashboard(
    repoRoot,
    workOrderPath,
    workOrder,
    validationPath,
    validation,
    filledArtifactPath,
    filledArtifact,
    options.generatedAt ?? new Date().toISOString(),
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(dashboard, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOutputPath, `${renderMarkdown(dashboard)}\n`, 'utf8');

  return { dashboard, outputPath, markdownOutputPath };
}

function buildCompletionDashboard(
  repoRoot: string,
  workOrderPath: string,
  workOrder: WorkOrder,
  validationPath: string,
  validation: JsonRecord | null,
  filledArtifactPath: string,
  filledArtifact: JsonRecord | null,
  generatedAt: string,
): CompletionDashboard {
  const requiredLocales = workOrder.summary.localesPerReplacementTask;
  const replacementRows = arrayAt(filledArtifact, 'replacements').filter(isRecord);
  const alternateReplacementRows = arrayAt(filledArtifact, 'replacementPayloads').filter(isRecord);
  const presentReplacementRows = replacementRows.length || alternateReplacementRows.length;
  const presentCollisionRows = arrayAt(filledArtifact, 'collisionDecisions').filter(isRecord).length;
  const presentResidualRows = arrayAt(filledArtifact, 'residualValidations').filter(isRecord).length;
  const blockers = validation ? arrayAt(validation, 'blockers').map(String) : ['filled work-order validation has not been run'];
  if (!filledArtifact) blockers.unshift('external filled Heisenberg quiz payload repair work-order artifact is missing');
  const uniqueBlockers = uniqueStrings(blockers);

  const tasks = [
    ...workOrder.replacementPayloadTasks.map((task) => replacementDashboardTask(task, filledArtifact)),
    ...workOrder.collisionDecisionTasks.map((task) => collisionDashboardTask(task, filledArtifact)),
    ...workOrder.residualValidationTasks.map((task) => residualDashboardTask(task, filledArtifact)),
  ];

  return {
    schemaVersion: 'heisenberg-quiz-payload-repair-completion-dashboard-v1',
    mode: 'quiz-payload-repair-completion-dashboard',
    generatedAt,
    status: valueAt(validation, 'status') === 'PASS' ? 'PASS' : 'HOLD',
    workOrderPath: relativePath(repoRoot, workOrderPath),
    validationPath: fs.existsSync(validationPath) ? relativePath(repoRoot, validationPath) : null,
    filledArtifactPath: relativePath(repoRoot, filledArtifactPath),
    hasFilledArtifact: Boolean(filledArtifact),
    validationStatus: typeof valueAt(validation, 'validationStatus') === 'string' ? valueAt(validation, 'validationStatus') as string : null,
    sourceApplyCandidateReady: valueAt(validation, 'sourceApplyCandidateReady') === true,
    generatedDecisionsOrEvidence: valueAt(validation, 'generatedDecisionsOrEvidence') === true,
    summary: {
      replacementPayloadTasks: workOrder.summary.replacementPayloadTasks,
      collisionDecisionTasks: workOrder.summary.collisionDecisionTasks,
      residualValidationTasks: workOrder.summary.residualValidationTasks,
      totalReviewTasks: workOrder.summary.replacementPayloadTasks + workOrder.summary.collisionDecisionTasks + workOrder.summary.residualValidationTasks,
      requiredLocales,
      requiredLocalePayloads: workOrder.summary.replacementPayloadTasks * requiredLocales.length,
      requiredPrompts: workOrder.summary.replacementPayloadTasks * requiredLocales.length,
      requiredExplanations: workOrder.summary.replacementPayloadTasks * requiredLocales.length * 4,
      requiredReviewerEvidenceIds: workOrder.summary.replacementPayloadTasks + workOrder.summary.collisionDecisionTasks + workOrder.summary.residualValidationTasks,
      requiredLocaleEvidenceIds: workOrder.summary.replacementPayloadTasks * requiredLocales.length,
      presentReplacementRows,
      presentCollisionDecisionRows: presentCollisionRows,
      presentResidualValidationRows: presentResidualRows,
      missingReplacementTaskIds: arrayAt(validation, 'missingReplacementTaskIds').length || workOrder.summary.replacementPayloadTasks - presentReplacementRows,
      missingCollisionTaskIds: arrayAt(validation, 'missingCollisionTaskIds').length || workOrder.summary.collisionDecisionTasks - presentCollisionRows,
      missingResidualTaskIds: arrayAt(validation, 'missingResidualTaskIds').length || workOrder.summary.residualValidationTasks - presentResidualRows,
      blockers: uniqueBlockers.length,
    },
    requiredArtifacts: {
      filledWorkOrder: 'filled_work_order.json',
      validatorCommand: 'npm run heisenberg:quiz-repair-validate -- --strict',
      sourceApplyCandidate: 'source_apply_candidate.json',
    },
    blockers: uniqueBlockers,
    tasks,
  };
}

function replacementDashboardTask(task: ReplacementPayloadTask, filledArtifact: JsonRecord | null): DashboardTask {
  return {
    taskId: task.taskId,
    kind: 'replacement-payload',
    difficulty: task.difficulty,
    ordinal: task.ordinal,
    correctChoice: task.sourceEntry?.correctChoice ?? null,
    requiredLocales: task.requiredLocales,
    requiredFields: [
      'payloads.<locale>.prompt',
      'payloads.<locale>.explanations[4]',
      'reviewerEvidenceId',
      'localeEvidenceIds.<locale>',
    ],
    completionStatus: rowStatus(filledArtifact, 'replacements', task.taskId),
  };
}

function collisionDashboardTask(task: CollisionDecisionTask, filledArtifact: JsonRecord | null): DashboardTask {
  return {
    taskId: task.taskId,
    kind: 'collision-decision',
    difficulty: task.difficulty,
    ordinal: task.targetOrdinal,
    correctChoice: task.sourceEntry?.correctChoice ?? null,
    requiredLocales: [],
    requiredFields: [
      'decision',
      'selectedSourceKey or replacementPayloads',
      'reviewerEvidenceId',
    ],
    completionStatus: rowStatus(filledArtifact, 'collisionDecisions', task.taskId),
  };
}

function residualDashboardTask(task: ResidualValidationTask, filledArtifact: JsonRecord | null): DashboardTask {
  return {
    taskId: task.taskId,
    kind: 'residual-validation',
    difficulty: task.difficulty,
    ordinal: task.ordinal,
    correctChoice: task.sourceEntry?.correctChoice ?? null,
    requiredLocales: [],
    requiredFields: [
      'status=resolved',
      'reviewerEvidenceId',
      'replacementPayloads when needed',
    ],
    completionStatus: rowStatus(filledArtifact, 'residualValidations', task.taskId),
  };
}

function rowStatus(filledArtifact: JsonRecord | null, collectionKey: string, taskId: string): DashboardTask['completionStatus'] {
  if (!filledArtifact) return 'pending-filled-artifact';
  const rows = arrayAt(filledArtifact, collectionKey).filter(isRecord);
  return rows.some((row) => valueAt(row, 'taskId') === taskId) ? 'present' : 'missing';
}

function renderMarkdown(dashboard: CompletionDashboard): string {
  const taskRows = dashboard.tasks.slice(0, 80).map((task) =>
    `| ${task.taskId} | ${task.kind} | ${task.difficulty} #${task.ordinal} | ${task.completionStatus} | ${task.correctChoice ?? ''} |`,
  );
  return [
    '# Heisenberg Quiz Payload Repair Completion Dashboard',
    '',
    `- Status: ${dashboard.status}`,
    `- Generated at: ${dashboard.generatedAt}`,
    `- Validation: ${dashboard.validationStatus ?? 'missing'}`,
    `- Has filled artifact: ${dashboard.hasFilledArtifact}`,
    `- Source apply candidate ready: ${dashboard.sourceApplyCandidateReady}`,
    `- Replacement payload tasks: ${dashboard.summary.replacementPayloadTasks}`,
    `- Collision decision tasks: ${dashboard.summary.collisionDecisionTasks}`,
    `- Residual validation tasks: ${dashboard.summary.residualValidationTasks}`,
    `- Required locale payloads: ${dashboard.summary.requiredLocalePayloads}`,
    `- Required prompts: ${dashboard.summary.requiredPrompts}`,
    `- Required explanations: ${dashboard.summary.requiredExplanations}`,
    `- Required reviewer evidence ids: ${dashboard.summary.requiredReviewerEvidenceIds}`,
    `- Required locale evidence ids: ${dashboard.summary.requiredLocaleEvidenceIds}`,
    '',
    '## Required Commands',
    '',
    `- ${dashboard.requiredArtifacts.validatorCommand}`,
    '',
    '## First Tasks',
    '',
    '| Task | Kind | Target | Status | English target |',
    '| --- | --- | --- | --- | --- |',
    ...taskRows,
    '',
    '## Blockers',
    '',
    ...(dashboard.blockers.length ? dashboard.blockers.slice(0, 40).map((blocker) => `- ${blocker}`) : ['- none']),
  ].join('\n');
}

function findLatestWorkOrder(repoRoot: string): string {
  const root = path.join(repoRoot, 'docs', 'heisenberg', 'quiz-payload-ordinal-repair');
  if (!fs.existsSync(root)) return path.join(root, 'missing', 'work_order.json');
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .find((entry) => fs.existsSync(path.join(root, entry, 'work_order.json')));
  return path.join(root, latest ?? 'missing', 'work_order.json');
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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--work-order') {
      options.workOrderPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--validation') {
      options.validationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--filled') {
      options.filledArtifactPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--md-out') {
      options.markdownOutputPath = readValue(argv, index, arg);
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

if (require.main === module) {
  try {
    const result = writeHeisenbergQuizPayloadRepairCompletionDashboard(process.cwd(), parseCli(process.argv.slice(2)));
    console.log(`Heisenberg quiz payload repair completion dashboard: ${result.dashboard.status}`);
    console.log(`Review tasks: ${result.dashboard.summary.totalReviewTasks}`);
    console.log(`Required locale payloads: ${result.dashboard.summary.requiredLocalePayloads}`);
    console.log(`Report: ${relativePath(process.cwd(), result.outputPath)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
