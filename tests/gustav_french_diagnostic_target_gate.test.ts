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
    expect(runtimeSource).toContain("ensureFrenchRemoteQuizRows(sourceLocaleInput)");
    expect(runtimeSource).toContain("getCachedFrenchRemoteQuizRows('easy'");
    expect(runtimeSource).toContain("getCachedFrenchRemoteQuizRows('medium'");
    expect(runtimeSource).toContain("getCachedFrenchRemoteQuizRows('hard'");
    expect(runtimeSource).not.toContain('ACTIVE_DIAGNOSTIC_POOL');
  });

  it('keeps the home diagnostic entry visible for French with the diagnostic runtime open', () => {
    const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8');

    expect(home).toContain("key: 'attest'");
    expect(home).toContain("path: '/diagnostic_test' as const");
    expect(home).toContain('const visibleActivityQuickItems = activityQuickItems');
    expect(home).toContain('testID={`home-activity-${item.key}`}');
    expect(home).not.toContain("activityQuickItems.filter((item) => item.key !== 'attest')");
    expect(diagnosticContentAvailableForTarget('fr')).toBe(true);
  });

  it('keeps the daily-task diagnostic entry point target-aware before opening diagnostic_test', () => {
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
