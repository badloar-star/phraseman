import fs from 'fs';
import path from 'path';
import {
  diagnosticContentAvailableForTarget,
  diagnosticContentGateForTarget,
  frenchDiagnosticGateCopy,
} from '../app/diagnostic_target_gate';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';

const ROOT = path.join(__dirname, '..');

describe('Gustav French diagnostic target gate', () => {
  it('blocks the English diagnostic bank for French while preserving English and Spanish dev behavior', () => {
    expect(diagnosticContentAvailableForTarget('en')).toBe(true);
    expect(diagnosticContentAvailableForTarget('es')).toBe(true);
    expect(diagnosticContentAvailableForTarget('fr')).toBe(false);
    expect(diagnosticContentGateForTarget('fr')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_diagnostic_source_gate',
      blockedRoutes: ['/diagnostic_test'],
    });
    expect(diagnosticContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_diagnostic_question_bank',
      'french_cefr_placement_review',
      'ru_uk_diagnostic_prompt_review',
      'diagnostic_mistake_mapping_review',
    ]));
  });

  it('keeps diagnostic_test behind the French source gate before English questions can render or write', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'diagnostic_test.tsx'), 'utf8');

    expect(source).toContain('const frenchDiagnosticBlocked = !diagnosticContentAvailableForTarget(studyTarget)');
    expect(source).toContain('FrenchDiagnosticUnavailable');
    expect(source).toContain("'french_diagnostic_source_gate'");
    expect(source).toContain('frenchDiagnosticBlocked ? [] : pickQuestions()');
    expect(source).toContain('if (frenchDiagnosticBlocked) {');
    expect(source).toContain('diagnosticLastKey(studyTarget)');
    expect(source).toContain('diagnosticOpenFlagKey(studyTarget)');
    expect(source).toContain('lessonProgressKey(i + 1, studyTarget)');
    expect(source).toContain('loadExamReadinessSnapshot(studyTarget)');
    expect(source).toContain('recordMistakeFromDiagnostic(qq, studyTarget)');
    expect(source).not.toContain("AsyncStorage.getItem('diagnostic_last')");
    expect(source).not.toContain("AsyncStorage.setItem('diagnostic_last'");
    expect(source).not.toContain("AsyncStorage.removeItem('open_diagnostic')");
    expect(source.indexOf('if (frenchDiagnosticBlocked) {')).toBeLessThan(
      source.indexOf('const q = questions[idx] ?? questions[0]'),
    );
    expect(source).toContain("void trackFeatureBlocked('diagnostic', 'start', 'french_diagnostic_source_gate'");
    expect(source).toContain("void trackFeatureBlocked('diagnostic', 'restart', 'french_diagnostic_source_gate'");
  });

  it('gates the daily-task diagnostic entry point for French before opening diagnostic_test', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(source).toContain("import { diagnosticContentAvailableForTarget, frenchDiagnosticGateCopy } from './diagnostic_target_gate'");
    expect(source).toContain('const openDiagnosticOrFrenchGate = () => {');
    expect(source).toContain('if (!diagnosticContentAvailableForTarget(studyTarget)) {');
    expect(source).toContain('const copy = frenchDiagnosticGateCopy(lang);');
    expect(source).toContain("messageEs: 'French diagnostic is still behind source gate.'");
    expect(source).toContain("case 'diagnostic_complete':\n                openDiagnosticOrFrenchGate();");

    const diagnosticCase = source.slice(source.indexOf("case 'diagnostic_complete':"), source.indexOf("case 'invite_friend':"));
    expect(diagnosticCase).not.toContain("router.push('/diagnostic_test')");
  });

  it('extends the global French source gate to require verified French diagnostic materials', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_diagnostic_question_bank',
      'french_cefr_placement_review',
      'ru_uk_diagnostic_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_diagnostic_bank_reuse_without_french_source_gate',
    ]));
  });

  it('uses only Russian/Ukrainian source UI copy for the French diagnostic gate', () => {
    expect(frenchDiagnosticGateCopy('ru').title).toBe('Французская диагностика ещё готовится');
    expect(frenchDiagnosticGateCopy('uk').title).toBe('Французька діагностика ще готується');
    expect(frenchDiagnosticGateCopy('ru').body).toContain('Английский диагностический тест скрыт');
    expect(frenchDiagnosticGateCopy('uk').body).toContain('Англійський діагностичний тест приховано');
    expect(JSON.stringify(frenchDiagnosticGateCopy('ru'))).not.toMatch(/Français|Commencer|Test de niveau/);
  });
});
