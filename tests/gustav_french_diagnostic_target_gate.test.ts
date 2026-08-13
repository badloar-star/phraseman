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
  it('opens French diagnostic from the remote French quiz pack while preserving English and Spanish dev behavior', () => {
    expect(diagnosticContentAvailableForTarget('en')).toBe(true);
    expect(diagnosticContentAvailableForTarget('es')).toBe(true);
    expect(diagnosticContentAvailableForTarget('fr')).toBe(true);
    expect(diagnosticContentGateForTarget('fr')).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_quiz_pack_diagnostic_available',
      blockedRoutes: [],
    });
    expect(diagnosticContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_quiz_remote_server_pack',
      'french_diagnostic_from_remote_quiz_runtime',
      'target_scoped_diagnostic_progress',
      'no_english_diagnostic_bank_fallback',
    ]));
  });

  it('routes diagnostic_test through the French remote runtime before English questions can render or write', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'diagnostic_test.tsx'), 'utf8');
    const runtimeSource = fs.readFileSync(path.join(ROOT, 'app', 'french_diagnostic_remote_runtime.ts'), 'utf8');

    expect(source).toContain('const frenchDiagnosticBlocked = !diagnosticContentAvailableForTarget(studyTarget)');
    expect(source).toContain('FrenchDiagnosticUnavailable');
    expect(source).toContain('const isFrenchDiagnostic = storageStudyTarget(studyTarget) === \'fr\'');
    expect(source).toContain('loadFrenchRemoteDiagnosticQuestions(diagnosticSourceLocale, 20)');
    expect(source).toContain('frenchDiagnosticBlocked || isFrenchDiagnostic ? [] : pickQuestions()');
    expect(source).toContain("trackFeatureBlocked('diagnostic', 'start', 'diagnostic_questions_unavailable'");
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
    expect(runtimeSource).toContain('The retired Quiz payload was the only remote source for French diagnostic');
    expect(runtimeSource).toMatch(/loadFrenchRemoteDiagnosticQuestions[\s\S]*?return \[\];/);
    expect(runtimeSource).not.toContain('ACTIVE_DIAGNOSTIC_POOL');
  });

  it('keeps the retired invisible home diagnostic row removed', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).not.toContain("key: 'attest'");
    expect(home).not.toContain('const activityQuickItems =');
    expect(home).toContain('activityQuickItems /');
    expect(home).toContain('visibleActivityQuickItems / themedClubIcon');
    expect(diagnosticContentAvailableForTarget('fr')).toBe(true);
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
