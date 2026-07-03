import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'core_lessons_32',
  'fr_lesson_sequence_reconciliation_report.json',
);
const INPUTS_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'core_lessons_32',
  'fr_lesson_builder_inputs_v1.json',
);
const MD_PATH = path.join(
  ROOT,
  'docs',
  'gustav',
  'generated',
  'fr',
  'core_lessons_32',
  'fr_lesson_sequence_reconciliation_report.md',
);

describe('Gustav French lesson sequence reconciliation', () => {
  it('keeps current generated lesson ledgers on HOLD and creates builder inputs for the approved French sequence', () => {
    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    const inputs = JSON.parse(fs.readFileSync(INPUTS_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8').replace(/\r\n/g, '\n');

    expect(report.schemaVersion).toBe('gustav-fr-lesson-sequence-reconciliation-v1');
    expect(report.studyTarget).toBe('fr');
    expect(report.status).toBe('HOLD');
    expect(report.activationApproved).toBe(false);
    expect(report.summary.targetLessons).toBe(32);
    expect(report.summary.currentLessons).toBe(32);
    expect(report.summary.rebuildRequired).toBeGreaterThanOrEqual(20);
    expect(report.gates.target_sequence_exists).toBe('PASS');
    expect(report.gates.current_generators_reconciled).toBe('HOLD');
    expect(report.targetRows).toHaveLength(32);
    expect(report.currentLessonFingerprints).toHaveLength(32);

    const lesson1 = report.targetRows.find((row: any) => row.targetLessonId === 1);
    expect(lesson1.status).toBe('REBUILD_REQUIRED');
    expect(lesson1.action).toBe('BUILD_NEW');
    expect(lesson1.targetConcepts).toEqual(expect.arrayContaining(['greetings']));

    const lesson3 = report.targetRows.find((row: any) => row.targetLessonId === 3);
    expect(lesson3.status).toBe('REBUILD_REQUIRED');
    expect(lesson3.targetConcepts).toEqual(expect.arrayContaining(['articles_gender']));

    expect(inputs.schemaVersion).toBe('gustav-fr-lesson-builder-inputs-v1');
    expect(inputs.status).toBe('READY');
    expect(inputs.activationApproved).toBe(false);
    expect(inputs.lessons).toHaveLength(32);
    expect(inputs.lessons[0].requiredGates).toEqual(
      expect.arrayContaining([
        'official_source_evidence_gate',
        'target_sequence_fit_gate',
        'no_english_order_copy_gate',
        'source_locale_isolation_gate',
      ]),
    );
    expect(inputs.lessons[0].outputLedgerPath).toBe('docs/gustav/generated/fr/lessons/lesson1_row_ledger.json');

    expect(markdown).toContain('keeps current generated ledgers on HOLD until rebuilt/reviewed');
  });
});
