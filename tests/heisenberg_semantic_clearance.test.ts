import fs from 'node:fs';
import path from 'node:path';

import { writeHeisenbergSemanticClearanceTemplate } from '../scripts/heisenberg_semantic_clearance_template';
import { writeHeisenbergSemanticClearanceValidation } from '../scripts/heisenberg_semantic_clearance_validator';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/semantic-clearance';
const GENERATED_AT = '2026-06-28T10:00:00.000Z';

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

function semanticAuditFixture() {
  return {
    generatedAt: GENERATED_AT,
    mode: 'semantic-audit',
    strict: true,
    summary: {
      findings: 2,
      blockers: 0,
      warnings: 2,
      reviewGroups: 2,
      byCode: {
        'protected-english-term-missing': 1,
        'possible-distractor-index-drift': 1,
      },
      bySurface: {
        quiz: 2,
      },
    },
    reviewGroups: [],
    findings: [
      {
        severity: 'warning',
        code: 'protected-english-term-missing',
        surface: 'quiz',
        difficulty: 'easy',
        ordinal: 102,
        locale: 'pt-BR',
        field: 'explanations[3]',
        message: 'Localized explanation is missing protected English term(s): walk.',
        sample: 'Reviewer needs to confirm missing protected term is acceptable.',
      },
      {
        severity: 'warning',
        code: 'possible-distractor-index-drift',
        surface: 'quiz',
        difficulty: 'hard',
        ordinal: 44,
        locale: 'es',
        field: 'explanations[2]',
        message: 'Localized explanation is missing protected English term(s): implementing.',
        sample: 'Reviewer needs to confirm accepted alternate wording.',
      },
    ],
  };
}

function writeSemanticAudit(): void {
  writeJson('semantic_audit.json', semanticAuditFixture());
}

function writeFilledClearance(taskIds: string[]): void {
  writeJson('semantic_clearance.json', {
    schemaVersion: 'heisenberg-semantic-clearance-v1',
    generatedClearanceArtifact: false,
    generatedDecisionsOrEvidence: false,
    reviewBatchEvidenceId: 'semantic-review-batch:test',
    clearances: taskIds.map((taskId) => ({
      taskId,
      decision: 'reviewer-cleared',
      reviewerEvidenceId: `reviewer:${taskId}`,
      localeEvidenceId: `locale:${taskId}`,
      notes: `Reviewed and accepted active warning ${taskId}.`,
    })),
  });
}

function writeTemplate() {
  return writeHeisenbergSemanticClearanceTemplate(ROOT, {
    semanticAuditPath: rel('semantic_audit.json'),
    outputDir: rel('template'),
    generatedAt: GENERATED_AT,
  });
}

function validate(clearancePath = rel('semantic_clearance.json')) {
  return writeHeisenbergSemanticClearanceValidation(ROOT, {
    semanticAuditPath: rel('semantic_audit.json'),
    clearancePath,
    outputPath: rel('semantic_clearance_validation.json'),
    generatedAt: GENERATED_AT,
  });
}

describe('heisenberg semantic clearance workflow', () => {
  beforeEach(() => {
    cleanRunRoot();
    writeSemanticAudit();
  });

  it('exposes semantic clearance workflow through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:semantic-clearance-template': 'npx tsx ./scripts/heisenberg_semantic_clearance_template.ts',
      'heisenberg:semantic-clearance-validate': 'npx tsx ./scripts/heisenberg_semantic_clearance_validator.ts',
    });
  });

  it('writes a template with one task per active semantic warning', () => {
    const result = writeTemplate();

    expect(result.template).toMatchObject({
      schemaVersion: 'heisenberg-semantic-clearance-template-v1',
      targetSchemaVersion: 'heisenberg-semantic-clearance-v1',
      templateOnly: true,
      generatedClearanceArtifact: false,
      generatedDecisionsOrEvidence: false,
      summary: {
        warningTasks: 2,
        byLocale: {
          'pt-BR': 1,
          es: 1,
        },
      },
    });
    expect(result.template.warningTasks.map((task) => task.locale)).toEqual(['pt-BR', 'es']);
    expect(fs.existsSync(path.join(ROOT, rel('template/semantic_clearance_template.json')))).toBe(true);
  });

  it('writes HOLD without throwing when semantic clearance is missing', () => {
    const result = validate();

    expect(result.report).toMatchObject({
      status: 'HOLD',
      validationStatus: 'MISSING_SEMANTIC_CLEARANCE',
      generatedClearanceArtifact: false,
      generatedDecisionsOrEvidence: false,
      semanticWarnings: 2,
      expectedClearanceTasks: 2,
      filledClearanceTasks: 0,
    });
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'external semantic clearance artifact is missing',
    ]));
  });

  it('rejects the template if it is submitted as clearance evidence', () => {
    writeTemplate();

    const result = validate(rel('template/semantic_clearance_template.json'));

    expect(result.report.status).toBe('HOLD');
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'semantic clearance template cannot be submitted as clearance evidence',
      'schemaVersion must be heisenberg-semantic-clearance-v1',
    ]));
  });

  it('passes when every active warning has real reviewer and locale evidence', () => {
    const template = writeTemplate();
    writeFilledClearance(template.template.warningTasks.map((task) => task.taskId));

    const result = validate();

    expect(result.report).toMatchObject({
      status: 'PASS',
      validationStatus: 'SEMANTIC_WARNINGS_CLEARED',
      semanticWarnings: 2,
      expectedClearanceTasks: 2,
      filledClearanceTasks: 2,
      blockers: [],
    });
    expect(result.report.locales.es).toMatchObject({
      warnings: 1,
      cleared: 1,
      blockers: [],
    });
  });

  it('holds on generated evidence, duplicate tasks, placeholders, and stale task ids', () => {
    const template = writeTemplate();
    const [firstTask] = template.template.warningTasks;
    writeJson('semantic_clearance.json', {
      schemaVersion: 'heisenberg-semantic-clearance-v1',
      generatedClearanceArtifact: true,
      generatedDecisionsOrEvidence: true,
      reviewBatchEvidenceId: 'TODO',
      clearances: [
        {
          taskId: firstTask.taskId,
          decision: 'reviewer-cleared',
          reviewerEvidenceId: 'TODO',
          localeEvidenceId: 'TODO',
          notes: 'TODO',
        },
        {
          taskId: firstTask.taskId,
          decision: 'reviewer-cleared',
          reviewerEvidenceId: 'reviewer:duplicate',
          localeEvidenceId: 'locale:duplicate',
          notes: 'duplicate',
        },
        {
          taskId: 'semantic-warning:stale',
          decision: 'reviewer-cleared',
          reviewerEvidenceId: 'reviewer:stale',
          localeEvidenceId: 'locale:stale',
          notes: 'stale',
        },
      ],
    });

    const result = validate();

    expect(result.report.status).toBe('HOLD');
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'generatedClearanceArtifact must be false',
      'generatedDecisionsOrEvidence must be false',
      'reviewBatchEvidenceId is required',
      `semantic clearance contains duplicate task ${firstTask.taskId}`,
      'semantic clearance contains stale or unknown task semantic-warning:stale',
      `${firstTask.taskId} reviewerEvidenceId is required`,
      `${firstTask.taskId} localeEvidenceId is required`,
      `${firstTask.taskId} notes are required`,
    ]));
  });

  it('keeps validation output under docs/heisenberg or .codex-tmp', () => {
    const template = writeTemplate();
    writeFilledClearance(template.template.warningTasks.map((task) => task.taskId));

    expect(() => writeHeisenbergSemanticClearanceValidation(ROOT, {
      semanticAuditPath: rel('semantic_audit.json'),
      clearancePath: rel('semantic_clearance.json'),
      outputPath: '../outside-heisenberg/semantic_clearance_validation.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Heisenberg semantic clearance validation output must stay under .codex-tmp or docs/heisenberg');
  });
});
