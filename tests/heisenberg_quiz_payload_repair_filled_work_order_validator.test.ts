import fs from 'node:fs';
import path from 'node:path';

import { buildQuizPayloadOrdinalRepairPlan } from '../scripts/heisenberg_quiz_payload_ordinal_repair_plan';
import { writeHeisenbergQuizPayloadRepairFilledWorkOrderTemplate } from '../scripts/heisenberg_quiz_payload_repair_filled_work_order_template';
import { writeHeisenbergQuizPayloadRepairFilledWorkOrderValidation } from '../scripts/heisenberg_quiz_payload_repair_filled_work_order_validator';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/quiz-payload-filled-work-order-validator';
const REPAIR_PLAN_RELATIVE = `${RUN_ROOT_RELATIVE}/repair_plan.json`;
const WORK_ORDER_RELATIVE = `${RUN_ROOT_RELATIVE}/work_order.json`;
const FILLED_RELATIVE = `${RUN_ROOT_RELATIVE}/filled_work_order.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/filled_work_order_validation.json`;
const CANDIDATE_RELATIVE = `${RUN_ROOT_RELATIVE}/source_apply_candidate.json`;
const TEMPLATE_RELATIVE = `${RUN_ROOT_RELATIVE}/filled_work_order_template.json`;
const TEMPLATE_MD_RELATIVE = `${RUN_ROOT_RELATIVE}/filled_work_order_template.md`;
const GENERATED_AT = '2026-06-28T00:00:00.000Z';

type WorkOrder = ReturnType<typeof buildQuizPayloadOrdinalRepairPlan>['candidate']['workOrder'];
type ReplacementTask = WorkOrder['replacementPayloadTasks'][number];
type ResidualTask = WorkOrder['residualValidationTasks'][number];

function writeRepairPlanFixture(): ReturnType<typeof buildQuizPayloadOrdinalRepairPlan> {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
  const report = buildQuizPayloadOrdinalRepairPlan();
  fs.writeFileSync(path.join(ROOT, REPAIR_PLAN_RELATIVE), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, WORK_ORDER_RELATIVE), `${JSON.stringify(report.candidate.workOrder, null, 2)}\n`, 'utf8');
  return report;
}

function localizedPayloadFor(task: ReplacementTask | ResidualTask) {
  const sourceEntry = task.sourceEntry;
  if (!sourceEntry) throw new Error(`Missing source entry for ${task.taskId}`);
  const choices = sourceEntry.choices;
  const payloads: Record<string, { prompt: string; explanations: string[] }> = {};
  for (const locale of ['pt-BR', 'vi', 'id', 'tr', 'pl']) {
    payloads[locale] = {
      prompt: `${locale} local prompt for quiz ${sourceEntry.ordinal}`,
      explanations: choices.map((choice, index) =>
        `${locale} reviewer-filled explanation ${index + 1}: ${choice} stays as the English study-target choice.`,
      ),
    };
  }
  return payloads;
}

function filledArtifact(workOrder: WorkOrder) {
  return {
    schemaVersion: 'quiz-payload-repair-filled-work-order-v1',
    generatedFilledArtifact: false,
    generatedDecisionsOrEvidence: false,
    replacements: workOrder.replacementPayloadTasks.map((task) => ({
      taskId: task.taskId,
      difficulty: task.difficulty,
      ordinal: task.ordinal,
      payloads: localizedPayloadFor(task),
      reviewerEvidenceId: `review:${task.taskId}`,
      localeEvidenceIds: {
        'pt-BR': `locale:pt-BR:${task.taskId}`,
        vi: `locale:vi:${task.taskId}`,
        id: `locale:id:${task.taskId}`,
        tr: `locale:tr:${task.taskId}`,
        pl: `locale:pl:${task.taskId}`,
      },
    })),
    collisionDecisions: [
      {
        taskId: 'collision:easy:103',
        difficulty: 'easy',
        targetOrdinal: 103,
        decision: 'select-source',
        selectedSourceKey: 104,
        reviewerEvidenceId: 'review:collision:easy:103',
      },
      {
        taskId: 'collision:easy:266',
        difficulty: 'easy',
        targetOrdinal: 266,
        decision: 'select-source',
        selectedSourceKey: 270,
        reviewerEvidenceId: 'review:collision:easy:266',
      },
    ],
    residualValidations: workOrder.residualValidationTasks.map((task) => ({
      taskId: task.taskId,
      difficulty: task.difficulty,
      ordinal: task.ordinal,
      status: 'resolved',
      reviewerEvidenceId: `review:${task.taskId}`,
      ...(task.ordinal === 118 ? { replacementPayloads: localizedPayloadFor(task) } : {}),
    })),
  };
}

function writeFilledArtifact(value: unknown): void {
  fs.writeFileSync(path.join(ROOT, FILLED_RELATIVE), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function runValidator() {
  return writeHeisenbergQuizPayloadRepairFilledWorkOrderValidation(ROOT, {
    repairPlanPath: REPAIR_PLAN_RELATIVE,
    workOrderPath: WORK_ORDER_RELATIVE,
    filledArtifactPath: FILLED_RELATIVE,
    outputPath: REPORT_RELATIVE,
    candidateOutputPath: CANDIDATE_RELATIVE,
    generatedAt: GENERATED_AT,
  });
}

function readReport() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as {
    status: string;
    validationStatus: string;
    sourceApplyCandidateReady: boolean;
    candidateGenerated: boolean;
    generatedDecisionsOrEvidence: boolean;
    finalResidualOrdinalFindings: unknown[];
    blockers: string[];
    missingReplacementTaskIds: string[];
    duplicateReplacementTaskIds: string[];
  };
}

describe('heisenberg quiz payload repair filled work-order validator', () => {
  it('exposes the quiz repair workflow through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:quiz-repair-plan': 'npx tsx ./scripts/heisenberg_quiz_payload_ordinal_repair_plan.ts',
      'heisenberg:quiz-repair-template': 'npx tsx ./scripts/heisenberg_quiz_payload_repair_filled_work_order_template.ts',
      'heisenberg:quiz-repair-validate': 'npx tsx ./scripts/heisenberg_quiz_payload_repair_filled_work_order_validator.ts',
    });
  });

  it('writes HOLD without throwing when the external filled artifact is missing', () => {
    const report = writeRepairPlanFixture();

    const result = runValidator();

    expect(result.report).toMatchObject({
      schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
      status: 'HOLD',
      validationStatus: 'MISSING_FILLED_ARTIFACT',
      sourceApplyCandidateReady: false,
      candidateGenerated: false,
      generatedDecisionsOrEvidence: false,
      activationApproved: false,
      runtimeManifestRegistered: false,
      remoteLoadingEnabled: false,
      productionActivationApproved: false,
    });
    expect(result.report.workOrder).toMatchObject({
      replacementPayloadTasks: 40,
      collisionDecisionTasks: 2,
      residualValidationTasks: 3,
    });
    expect(result.report.blockers).toEqual([
      'external filled Heisenberg quiz payload repair work-order artifact is missing',
    ]);
    expect(report.candidate.workOrder.generatedFilledArtifact).toBe(false);
    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(false);
  });

  it('assembles a source-apply candidate when every task is externally filled and final ordinal findings are clean', () => {
    const report = writeRepairPlanFixture();
    writeFilledArtifact(filledArtifact(report.candidate.workOrder));

    const result = runValidator();

    expect(result.report).toMatchObject({
      status: 'PASS',
      validationStatus: 'SOURCE_APPLY_CANDIDATE_READY',
      sourceApplyCandidateReady: true,
      candidateGenerated: true,
      generatedDecisionsOrEvidence: false,
      activationApproved: false,
      runtimeManifestRegistered: false,
      remoteLoadingEnabled: false,
      productionActivationApproved: false,
      filled: {
        replacements: 40,
        collisionDecisions: 2,
        residualValidations: 3,
      },
      missingReplacementTaskIds: [],
      missingCollisionTaskIds: [],
      missingResidualTaskIds: [],
      finalResidualOrdinalFindings: [],
      blockers: [],
    });
    expect(fs.existsSync(path.join(ROOT, CANDIDATE_RELATIVE))).toBe(true);
    const candidate = JSON.parse(fs.readFileSync(path.join(ROOT, CANDIDATE_RELATIVE), 'utf8')) as {
      schemaVersion: string;
      sourceApplyReady: boolean;
      acceptedRemaps: number;
      replacementPayloads: number;
      collisionDecisions: number;
      residualValidationFixes: number;
      activationApproved: boolean;
      candidatePayloads: Record<string, Record<string, unknown>>;
    };
    expect(candidate).toMatchObject({
      schemaVersion: 'heisenberg-quiz-payload-repair-source-apply-candidate-v1',
      sourceApplyReady: true,
      acceptedRemaps: 142,
      replacementPayloads: 40,
      collisionDecisions: 2,
      residualValidationFixes: 3,
      activationApproved: false,
    });
    expect(Object.keys(candidate.candidatePayloads.easy)).toContain('105');
    expect(Object.keys(candidate.candidatePayloads.medium)).toContain('128');
  });

  it('holds and throws for duplicate filled replacement tasks', () => {
    const report = writeRepairPlanFixture();
    const filled = filledArtifact(report.candidate.workOrder);
    filled.replacements.push(filled.replacements[0]);
    writeFilledArtifact(filled);

    expect(() => runValidator()).toThrow('Heisenberg quiz payload repair filled work-order validation failed');

    const validation = readReport();
    expect(validation.status).toBe('HOLD');
    expect(validation.candidateGenerated).toBe(false);
    expect(validation.duplicateReplacementTaskIds).toEqual([filled.replacements[0].taskId]);
    expect(validation.blockers).toEqual(expect.arrayContaining([
      `filled artifact contains duplicate replacement task ${filled.replacements[0].taskId}`,
    ]));
  });

  it('holds and throws for missing replacement payloads and generated filled artifacts', () => {
    const report = writeRepairPlanFixture();
    const filled = filledArtifact(report.candidate.workOrder);
    filled.generatedFilledArtifact = true;
    filled.replacements = filled.replacements.slice(0, 39);
    writeFilledArtifact(filled);

    expect(() => runValidator()).toThrow('Heisenberg quiz payload repair filled work-order validation failed');

    const validation = readReport();
    expect(validation.status).toBe('HOLD');
    expect(validation.sourceApplyCandidateReady).toBe(false);
    expect(validation.missingReplacementTaskIds).toHaveLength(1);
    expect(validation.blockers).toEqual(expect.arrayContaining([
      'filled artifact generatedFilledArtifact must be false',
    ]));
  });

  it('rejects validation output outside ignored/report roots', () => {
    writeRepairPlanFixture();

    expect(() => writeHeisenbergQuizPayloadRepairFilledWorkOrderValidation(ROOT, {
      repairPlanPath: REPAIR_PLAN_RELATIVE,
      workOrderPath: WORK_ORDER_RELATIVE,
      filledArtifactPath: FILLED_RELATIVE,
      outputPath: 'app/__heisenberg_should_not_write.json',
    })).toThrow('Heisenberg quiz repair filled work-order validation output must stay under .codex-tmp or docs/heisenberg');
  });

  it('writes a template for external fill and the validator rejects it as a filled artifact', () => {
    writeRepairPlanFixture();

    const result = writeHeisenbergQuizPayloadRepairFilledWorkOrderTemplate(ROOT, {
      workOrderPath: WORK_ORDER_RELATIVE,
      outputPath: TEMPLATE_RELATIVE,
      markdownOutputPath: TEMPLATE_MD_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.template).toMatchObject({
      schemaVersion: 'quiz-payload-repair-filled-work-order-template-v1',
      targetFilledSchemaVersion: 'quiz-payload-repair-filled-work-order-v1',
      templateOnly: true,
      generatedFilledArtifact: false,
      generatedDecisionsOrEvidence: false,
      summary: {
        replacementPayloadTasks: 40,
        collisionDecisionTasks: 2,
        residualValidationTasks: 3,
      },
    });
    expect(result.template.replacements[0]).toMatchObject({
      taskId: 'replacement:easy:105',
      payloads: {
        'pt-BR': { prompt: '', explanations: ['', '', '', ''] },
      },
      reviewerEvidenceId: '',
    });
    expect(fs.existsSync(path.join(ROOT, TEMPLATE_MD_RELATIVE))).toBe(true);

    expect(() => writeHeisenbergQuizPayloadRepairFilledWorkOrderValidation(ROOT, {
      repairPlanPath: REPAIR_PLAN_RELATIVE,
      workOrderPath: WORK_ORDER_RELATIVE,
      filledArtifactPath: TEMPLATE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      candidateOutputPath: CANDIDATE_RELATIVE,
      generatedAt: GENERATED_AT,
    })).toThrow('filled artifact schemaVersion must be quiz-payload-repair-filled-work-order-v1');

    const validation = readReport();
    expect(validation.status).toBe('HOLD');
    expect(validation.candidateGenerated).toBe(false);
    expect(validation.blockers).toEqual(expect.arrayContaining([
      'filled artifact schemaVersion must be quiz-payload-repair-filled-work-order-v1',
    ]));
  });
});
