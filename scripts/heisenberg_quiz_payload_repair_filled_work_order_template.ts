import fs from 'node:fs';
import path from 'node:path';

type CliOptions = {
  workOrderPath?: string;
  outputPath?: string;
  markdownOutputPath?: string;
  generatedAt?: string;
};

type QuizDifficulty = 'easy' | 'medium' | 'hard';

type SourceEntryContext = {
  ordinal: number;
  ru?: string;
  uk?: string;
  es?: string;
  correctChoice: string;
  choices: string[];
  explanations: string[];
};

type ReplacementPayloadTask = {
  taskId: string;
  difficulty: QuizDifficulty;
  ordinal: number;
  currentPayloadHash?: string;
  sourceEntry: SourceEntryContext | null;
  requiredLocales: string[];
};

type CollisionDecisionTask = {
  taskId: string;
  difficulty: QuizDifficulty;
  targetOrdinal: number;
  currentPayloadHash?: string;
  incomingSourceKeys: number[];
  incomingPayloadHashes?: Array<{ sourceKey: number; payloadHash?: string }>;
  sourceEntry: SourceEntryContext | null;
};

type ResidualValidationTask = {
  taskId: string;
  difficulty: QuizDifficulty;
  ordinal: number;
  code: string;
  matchedOrdinal?: number;
  matchedOrdinals?: number[];
  sourceEntry: SourceEntryContext | null;
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

type FilledWorkOrderTemplate = {
  schemaVersion: 'quiz-payload-repair-filled-work-order-template-v1';
  targetFilledSchemaVersion: 'quiz-payload-repair-filled-work-order-v1';
  templateOnly: true;
  generatedAt: string;
  workOrderPath: string;
  generatedFilledArtifact: false;
  generatedDecisionsOrEvidence: false;
  instructions: string[];
  summary: WorkOrder['summary'];
  replacements: Array<{
    taskId: string;
    difficulty: QuizDifficulty;
    ordinal: number;
    sourceEntry: SourceEntryContext | null;
    payloads: Record<string, { prompt: string; explanations: [string, string, string, string] }>;
    reviewerEvidenceId: string;
    localeEvidenceIds: Record<string, string>;
  }>;
  collisionDecisions: Array<{
    taskId: string;
    difficulty: QuizDifficulty;
    targetOrdinal: number;
    sourceEntry: SourceEntryContext | null;
    incomingSourceKeys: number[];
    incomingPayloadHashes: Array<{ sourceKey: number; payloadHash?: string }>;
    decision: '';
    selectedSourceKey: null;
    replacementPayloads: Record<string, { prompt: string; explanations: [string, string, string, string] }>;
    reviewerEvidenceId: string;
  }>;
  residualValidations: Array<{
    taskId: string;
    difficulty: QuizDifficulty;
    ordinal: number;
    code: string;
    matchedOrdinal?: number;
    matchedOrdinals?: number[];
    sourceEntry: SourceEntryContext | null;
    status: '';
    replacementPayloads: Record<string, { prompt: string; explanations: [string, string, string, string] }>;
    reviewerEvidenceId: string;
    notes: string;
  }>;
};

type TemplateResult = {
  outputPath: string;
  markdownOutputPath: string;
  template: FilledWorkOrderTemplate;
};

const DEFAULT_OUTPUT_NAME = 'filled_work_order_template.json';
const DEFAULT_MARKDOWN_OUTPUT_NAME = 'filled_work_order_template.md';

export function writeHeisenbergQuizPayloadRepairFilledWorkOrderTemplate(
  repoRoot: string,
  options: CliOptions = {},
): TemplateResult {
  const workOrderPath = resolveAllowedPath(
    repoRoot,
    options.workOrderPath,
    findLatestWorkOrder(repoRoot),
    'Heisenberg quiz repair work-order input',
  );
  const outputPath = resolveAllowedPath(
    repoRoot,
    options.outputPath,
    path.join(path.dirname(workOrderPath), DEFAULT_OUTPUT_NAME),
    'Heisenberg quiz repair filled work-order template output',
  );
  const markdownOutputPath = resolveAllowedPath(
    repoRoot,
    options.markdownOutputPath,
    path.join(path.dirname(workOrderPath), DEFAULT_MARKDOWN_OUTPUT_NAME),
    'Heisenberg quiz repair filled work-order template markdown output',
  );

  const workOrder = readJsonFile<WorkOrder>(workOrderPath);
  validateWorkOrder(workOrder);

  const template: FilledWorkOrderTemplate = {
    schemaVersion: 'quiz-payload-repair-filled-work-order-template-v1',
    targetFilledSchemaVersion: 'quiz-payload-repair-filled-work-order-v1',
    templateOnly: true,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    workOrderPath: relativePath(repoRoot, workOrderPath),
    generatedFilledArtifact: false,
    generatedDecisionsOrEvidence: false,
    instructions: [
      'This is a template for external reviewers/localizers. It is not a filled artifact.',
      'Do not change schemaVersion to the filled schema until all blanks are genuinely completed and reviewed.',
      'Each replacement requires prompt plus exactly four explanations for pt-BR, vi, id, tr and pl.',
      'Each explanation must preserve the English answer choice it explains.',
      'Collision decisions must name a selected source key or provide replacementPayloads with reviewer evidence.',
      'The validator must PASS before any source apply candidate can be trusted.',
    ],
    summary: workOrder.summary,
    replacements: workOrder.replacementPayloadTasks.map((task) => ({
      taskId: task.taskId,
      difficulty: task.difficulty,
      ordinal: task.ordinal,
      sourceEntry: task.sourceEntry,
      payloads: blankPayloads(task.requiredLocales),
      reviewerEvidenceId: '',
      localeEvidenceIds: blankLocaleEvidence(task.requiredLocales),
    })),
    collisionDecisions: workOrder.collisionDecisionTasks.map((task) => ({
      taskId: task.taskId,
      difficulty: task.difficulty,
      targetOrdinal: task.targetOrdinal,
      sourceEntry: task.sourceEntry,
      incomingSourceKeys: task.incomingSourceKeys,
      incomingPayloadHashes: task.incomingPayloadHashes ?? [],
      decision: '',
      selectedSourceKey: null,
      replacementPayloads: blankPayloads(workOrder.summary.localesPerReplacementTask),
      reviewerEvidenceId: '',
    })),
    residualValidations: workOrder.residualValidationTasks.map((task) => ({
      taskId: task.taskId,
      difficulty: task.difficulty,
      ordinal: task.ordinal,
      code: task.code,
      matchedOrdinal: task.matchedOrdinal,
      matchedOrdinals: task.matchedOrdinals,
      sourceEntry: task.sourceEntry,
      status: '',
      replacementPayloads: blankPayloads(workOrder.summary.localesPerReplacementTask),
      reviewerEvidenceId: '',
      notes: '',
    })),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOutputPath, renderMarkdown(template), 'utf8');

  return {
    outputPath,
    markdownOutputPath,
    template,
  };
}

function blankPayloads(locales: string[]): Record<string, { prompt: string; explanations: [string, string, string, string] }> {
  return Object.fromEntries(locales.map((locale) => [
    locale,
    {
      prompt: '',
      explanations: ['', '', '', ''],
    },
  ]));
}

function blankLocaleEvidence(locales: string[]): Record<string, string> {
  return Object.fromEntries(locales.map((locale) => [locale, '']));
}

function renderMarkdown(template: FilledWorkOrderTemplate): string {
  return [
    '# Heisenberg Quiz Payload Filled Work-order Template',
    '',
    `Generated: ${template.generatedAt}`,
    `Template only: ${template.templateOnly ? 'yes' : 'no'}`,
    `Target filled schema: ${template.targetFilledSchemaVersion}`,
    '',
    '## Summary',
    `- Replacement payload tasks: ${template.summary.replacementPayloadTasks}`,
    `- Collision decision tasks: ${template.summary.collisionDecisionTasks}`,
    `- Residual validation tasks: ${template.summary.residualValidationTasks}`,
    `- Required locales: ${template.summary.localesPerReplacementTask.join(', ')}`,
    '',
    '## Replacement Tasks',
    ...template.replacements.map((task) =>
      `- ${task.taskId}: ${task.difficulty} #${task.ordinal}; correct "${task.sourceEntry?.correctChoice ?? 'missing source entry'}"`,
    ),
    '',
    '## Collision Tasks',
    ...template.collisionDecisions.map((task) =>
      `- ${task.taskId}: ${task.difficulty} #${task.targetOrdinal}; incoming ${task.incomingSourceKeys.join(', ')}; correct "${task.sourceEntry?.correctChoice ?? 'missing source entry'}"`,
    ),
    '',
    '## Residual Tasks',
    ...template.residualValidations.map((task) =>
      `- ${task.taskId}: ${task.code}${task.matchedOrdinal ? ` -> #${task.matchedOrdinal}` : ''}${task.matchedOrdinals?.length ? ` matches ${task.matchedOrdinals.join(', ')}` : ''}`,
    ),
    '',
  ].join('\n');
}

function validateWorkOrder(workOrder: WorkOrder): void {
  const blockers: string[] = [];
  if (workOrder.mode !== 'quiz-payload-repair-work-order') blockers.push('work-order mode must be quiz-payload-repair-work-order');
  if (workOrder.status !== 'READY_FOR_REVIEW') blockers.push('work-order status must be READY_FOR_REVIEW');
  if (workOrder.generatedFilledArtifact !== false) blockers.push('work-order generatedFilledArtifact must be false');
  if (workOrder.summary.replacementPayloadTasks !== workOrder.replacementPayloadTasks.length) blockers.push('replacement task count mismatch');
  if (workOrder.summary.collisionDecisionTasks !== workOrder.collisionDecisionTasks.length) blockers.push('collision task count mismatch');
  if (workOrder.summary.residualValidationTasks !== workOrder.residualValidationTasks.length) blockers.push('residual task count mismatch');
  if (blockers.length) throw new Error(`Heisenberg quiz repair work-order is not template-ready: ${blockers.join('; ')}`);
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
    .find((name) => fs.existsSync(path.join(root, name, 'work_order.json')));
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
    const result = writeHeisenbergQuizPayloadRepairFilledWorkOrderTemplate(process.cwd(), parseCli(process.argv.slice(2)));
    console.log('Heisenberg quiz payload filled work-order template: READY_FOR_EXTERNAL_FILL');
    console.log(`Template: ${relativePath(process.cwd(), result.outputPath)}`);
    console.log(`Markdown: ${relativePath(process.cwd(), result.markdownOutputPath)}`);
    console.log(`Replacement tasks: ${result.template.summary.replacementPayloadTasks}`);
    console.log(`Collision tasks: ${result.template.summary.collisionDecisionTasks}`);
    console.log(`Residual tasks: ${result.template.summary.residualValidationTasks}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
