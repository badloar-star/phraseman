import fs from 'node:fs';
import path from 'node:path';

import { writeHeisenbergQuizPayloadRepairCompletionDashboard } from '../scripts/heisenberg_quiz_payload_repair_completion_dashboard';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/quiz-payload-repair-dashboard';
const GENERATED_AT = '2026-06-28T12:00:00.000Z';

function rel(file: string): string {
  return `${RUN_ROOT_RELATIVE}/${file}`;
}

function abs(file: string): string {
  return path.join(ROOT, rel(file));
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function cleanRunRoot(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
}

function sourceEntry(ordinal: number, correctChoice: string) {
  return {
    ordinal,
    correctChoice,
    choices: [
      `wrong ${ordinal} a`,
      correctChoice,
      `wrong ${ordinal} b`,
      `wrong ${ordinal} c`,
    ],
  };
}

function writeWorkOrderFixture(): void {
  writeJson('work_order.json', {
    mode: 'quiz-payload-repair-work-order',
    status: 'READY_FOR_REVIEW',
    generatedFilledArtifact: false,
    summary: {
      replacementPayloadTasks: 2,
      collisionDecisionTasks: 1,
      residualValidationTasks: 1,
      localesPerReplacementTask: ['pt-BR', 'vi'],
    },
    replacementPayloadTasks: [
      {
        taskId: 'replacement:easy:10',
        difficulty: 'easy',
        ordinal: 10,
        sourceEntry: sourceEntry(10, 'I work on Monday.'),
        requiredLocales: ['pt-BR', 'vi'],
      },
      {
        taskId: 'replacement:easy:11',
        difficulty: 'easy',
        ordinal: 11,
        sourceEntry: sourceEntry(11, 'Do you drink coffee?'),
        requiredLocales: ['pt-BR', 'vi'],
      },
    ],
    collisionDecisionTasks: [
      {
        taskId: 'collision:easy:12',
        difficulty: 'easy',
        targetOrdinal: 12,
        incomingSourceKeys: [14, 15],
        sourceEntry: sourceEntry(12, 'She likes tea.'),
      },
    ],
    residualValidationTasks: [
      {
        taskId: 'residual:easy:13:quiz-payload-ordinal-mismatch',
        difficulty: 'easy',
        ordinal: 13,
        code: 'quiz-payload-ordinal-mismatch',
        sourceEntry: sourceEntry(13, 'They are ready.'),
      },
    ],
  });
}

function writeMissingValidation(): void {
  writeJson('filled_work_order_validation.json', {
    schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
    status: 'HOLD',
    validationStatus: 'MISSING_FILLED_ARTIFACT',
    sourceApplyCandidateReady: false,
    generatedDecisionsOrEvidence: false,
    missingReplacementTaskIds: ['replacement:easy:10', 'replacement:easy:11'],
    missingCollisionTaskIds: ['collision:easy:12'],
    missingResidualTaskIds: ['residual:easy:13:quiz-payload-ordinal-mismatch'],
    blockers: ['external filled Heisenberg quiz payload repair work-order artifact is missing'],
  });
}

function writeFilledArtifact(): void {
  writeJson('filled_work_order.json', {
    schemaVersion: 'quiz-payload-repair-filled-work-order-v1',
    generatedFilledArtifact: false,
    generatedDecisionsOrEvidence: false,
    replacements: [
      { taskId: 'replacement:easy:10' },
      { taskId: 'replacement:easy:11' },
    ],
    collisionDecisions: [
      { taskId: 'collision:easy:12' },
    ],
    residualValidations: [
      { taskId: 'residual:easy:13:quiz-payload-ordinal-mismatch' },
    ],
  });
  writeJson('filled_work_order_validation.json', {
    schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
    status: 'PASS',
    validationStatus: 'SOURCE_APPLY_CANDIDATE_READY',
    sourceApplyCandidateReady: true,
    generatedDecisionsOrEvidence: false,
    missingReplacementTaskIds: [],
    missingCollisionTaskIds: [],
    missingResidualTaskIds: [],
    blockers: [],
  });
}

function runDashboard() {
  return writeHeisenbergQuizPayloadRepairCompletionDashboard(ROOT, {
    workOrderPath: rel('work_order.json'),
    validationPath: rel('filled_work_order_validation.json'),
    filledArtifactPath: rel('filled_work_order.json'),
    outputPath: rel('completion_dashboard.json'),
    markdownOutputPath: rel('completion_dashboard.md'),
    generatedAt: GENERATED_AT,
  });
}

describe('heisenberg quiz payload repair completion dashboard', () => {
  beforeEach(() => {
    cleanRunRoot();
    writeWorkOrderFixture();
  });

  it('exposes the quiz repair dashboard through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:quiz-repair-dashboard': 'npx tsx ./scripts/heisenberg_quiz_payload_repair_completion_dashboard.ts',
    });
  });

  it('summarizes required external fill work when filled artifact is missing', () => {
    writeMissingValidation();

    const result = runDashboard();

    expect(result.dashboard).toMatchObject({
      schemaVersion: 'heisenberg-quiz-payload-repair-completion-dashboard-v1',
      status: 'HOLD',
      hasFilledArtifact: false,
      validationStatus: 'MISSING_FILLED_ARTIFACT',
      sourceApplyCandidateReady: false,
      summary: {
        replacementPayloadTasks: 2,
        collisionDecisionTasks: 1,
        residualValidationTasks: 1,
        totalReviewTasks: 4,
        requiredLocalePayloads: 4,
        requiredPrompts: 4,
        requiredExplanations: 16,
        requiredReviewerEvidenceIds: 4,
        requiredLocaleEvidenceIds: 4,
        presentReplacementRows: 0,
        presentCollisionDecisionRows: 0,
        presentResidualValidationRows: 0,
        missingReplacementTaskIds: 2,
        missingCollisionTaskIds: 1,
        missingResidualTaskIds: 1,
        blockers: 1,
      },
    });
    expect(result.dashboard.tasks).toHaveLength(4);
    expect(result.dashboard.tasks[0]).toMatchObject({
      taskId: 'replacement:easy:10',
      kind: 'replacement-payload',
      completionStatus: 'pending-filled-artifact',
      requiredFields: [
        'payloads.<locale>.prompt',
        'payloads.<locale>.explanations[4]',
        'reviewerEvidenceId',
        'localeEvidenceIds.<locale>',
      ],
    });
    expect(fs.existsSync(path.join(ROOT, rel('completion_dashboard.json')))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, rel('completion_dashboard.md')))).toBe(true);
  });

  it('shows present rows after a filled artifact and PASS validation exist', () => {
    writeFilledArtifact();

    const result = runDashboard();

    expect(result.dashboard).toMatchObject({
      status: 'PASS',
      hasFilledArtifact: true,
      validationStatus: 'SOURCE_APPLY_CANDIDATE_READY',
      sourceApplyCandidateReady: true,
      summary: {
        presentReplacementRows: 2,
        presentCollisionDecisionRows: 1,
        presentResidualValidationRows: 1,
        missingReplacementTaskIds: 0,
        missingCollisionTaskIds: 0,
        missingResidualTaskIds: 0,
        blockers: 0,
      },
      blockers: [],
    });
    expect(result.dashboard.tasks.map((task) => task.completionStatus)).toEqual([
      'present',
      'present',
      'present',
      'present',
    ]);
  });

  it('keeps dashboard output under docs/heisenberg or .codex-tmp', () => {
    writeMissingValidation();

    expect(() => writeHeisenbergQuizPayloadRepairCompletionDashboard(ROOT, {
      workOrderPath: rel('work_order.json'),
      validationPath: rel('filled_work_order_validation.json'),
      filledArtifactPath: rel('filled_work_order.json'),
      outputPath: '../outside-heisenberg/completion_dashboard.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Heisenberg quiz repair completion dashboard output must stay under .codex-tmp or docs/heisenberg');
  });
});
