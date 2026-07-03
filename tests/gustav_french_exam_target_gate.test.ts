import fs from 'fs';
import path from 'path';
import {
  examContentAvailableForTarget,
  examContentGateForTarget,
  frenchExamGateCopy,
} from '../app/exam_target_gate';
import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';

const ROOT = path.join(__dirname, '..');

describe('Gustav French exam target gate', () => {
  it('opens French exams from the remote French quiz pack while preserving English and Spanish dev behavior', () => {
    expect(examContentAvailableForTarget('en')).toBe(true);
    expect(examContentAvailableForTarget('es')).toBe(true);
    expect(examContentAvailableForTarget('fr')).toBe(true);
    expect(examContentGateForTarget('fr')).toMatchObject({
      enabled: true,
      studyTarget: 'fr',
      reason: 'french_quiz_pack_exam_available',
      blockedRoutes: [],
    });
    expect(examContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_quiz_remote_server_pack',
      'french_exam_from_remote_quiz_runtime',
      'target_scoped_exam_progress',
      'no_english_exam_bank_fallback',
    ]));
  });

  it('loads final and level exam screens from French remote runtime before any English question bank can render', () => {
    const finalExamSource = fs.readFileSync(path.join(ROOT, 'app', 'exam.tsx'), 'utf8');
    const levelExamSource = fs.readFileSync(path.join(ROOT, 'app', 'level_exam.tsx'), 'utf8');
    const runtimeSource = fs.readFileSync(path.join(ROOT, 'app', 'french_exam_remote_runtime.ts'), 'utf8');

    expect(finalExamSource).toContain('const frenchExamBlocked = !examContentAvailableForTarget(studyTarget)');
    expect(finalExamSource).toContain("import { loadFrenchRemoteFinalExamQuestions } from './french_exam_remote_runtime'");
    expect(finalExamSource).toContain('const isFrenchExam = storageStudyTarget(studyTarget) === \'fr\'');
    expect(finalExamSource).toContain('loadFrenchRemoteFinalExamQuestions(frenchExamSourceLocale, 50)');
    expect(finalExamSource).toContain('const questions = isFrenchExam ? frenchQuestions : englishQuestions;');
    expect(finalExamSource).toContain("'exam_questions_unavailable'");
    expect(finalExamSource).toContain('FrenchLingmanExamUnavailable');
    expect(finalExamSource).toContain("logMistake(phrase, lessonId, 'exam', what, meta, studyTarget)");
    expect(finalExamSource).toContain('loadLingmanCertificate(studyTarget)');
    expect(finalExamSource).toContain('saveLingmanCertificate(cert, studyTarget)');
    expect(finalExamSource).toContain('updateLingmanCertificateName(name, studyTarget)');
    expect(finalExamSource.indexOf('loadFrenchRemoteFinalExamQuestions(frenchExamSourceLocale, 50)')).toBeLessThan(
      finalExamSource.indexOf('const q = questions[idx]||questions[0]'),
    );
    expect(finalExamSource.indexOf('if (frenchExamBlocked) return (')).toBeLessThan(
      finalExamSource.indexOf('const q = questions[idx]||questions[0]'),
    );

    expect(levelExamSource).toContain('const frenchExamBlocked = !examContentAvailableForTarget(studyTarget)');
    expect(levelExamSource).toContain("import { loadFrenchRemoteLevelExamQuestions } from './french_exam_remote_runtime'");
    expect(levelExamSource).toContain('const isFrenchExam = storageStudyTarget(studyTarget) === \'fr\'');
    expect(levelExamSource).toContain('loadFrenchRemoteLevelExamQuestions(lvl, frenchExamSourceLocale, INTRO_Q_COUNT)');
    expect(levelExamSource).toContain('const questions = isFrenchExam ? frenchQuestions : englishQuestions;');
    expect(levelExamSource).toContain("'exam_questions_unavailable'");
    expect(levelExamSource).toContain('FrenchLevelExamUnavailable');
    expect(levelExamSource).toContain('recordMistake(');
    expect(levelExamSource).toMatch(/recordMistake\([\s\S]*tokenMeta,[\s\S]*studyTarget,[\s\S]*\)/);
    expect(levelExamSource).toMatch(/logMistake\([\s\S]*'wrong_pick',[\s\S]*tokenMeta,[\s\S]*studyTarget,[\s\S]*\)/);
    expect(levelExamSource.indexOf('if (frenchExamBlocked) {')).toBeLessThan(
      levelExamSource.indexOf("if (accessState !== 'allowed')"),
    );

    expect(runtimeSource).toContain('ensureFrenchRemoteQuizRows');
    expect(runtimeSource).toContain('loadFrenchRemoteFinalExamQuestions');
    expect(runtimeSource).toContain('loadFrenchRemoteLevelExamQuestions');
    expect(runtimeSource).toContain("type?: 'choice4'");
    expect(runtimeSource).not.toContain('EXAM_POOL');
    expect(runtimeSource).not.toContain('QUESTION_POOL');
  });

  it('gates lesson-tab level exam cards before routing to English level exams for French', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'lessons.tsx'), 'utf8');

    expect(source).toContain("import { examContentAvailableForTarget, frenchExamGateCopy } from '../exam_target_gate'");
    expect(source).toContain("kind: 'frenchExam';");
    expect(source).toContain('const examSourceAvailable = examContentAvailableForTarget(studyTarget);');
    expect(source).toContain('const allDone = examSourceAvailable && !examPremiumRequired');
    expect(source).toContain("frenchExamGateCopy('level', lang).title");
    expect(source).toContain("frenchExamGateCopy('level', lang).body");
    expect(source).toContain("setGateModal({ kind: 'frenchExam', level: lvl });");

    const examPressHandler = source.slice(
      source.indexOf('if (examPremiumRequired) {'),
      source.indexOf("router.push({ pathname: '/level_exam'"),
    );
    expect(examPressHandler).toContain('else if (!examSourceAvailable)');
  });

  it('extends the global French source gate to require verified French exam materials', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.requiredEvidenceBeforeActivation).toEqual(expect.arrayContaining([
      'french_exam_question_bank',
      'french_cefr_level_exam_review',
      'ru_uk_exam_prompt_review',
    ]));
    expect(FRENCH_CONTENT_SOURCE_GATE.hardBlocks).toEqual(expect.arrayContaining([
      'english_exam_bank_reuse_without_french_source_gate',
    ]));
  });

  it('uses only Russian/Ukrainian source UI copy for the French exam gate', () => {
    expect(frenchExamGateCopy('level', 'ru').title).toBe('Французский зачёт ещё готовится');
    expect(frenchExamGateCopy('level', 'uk').title).toBe('Французький залік ще готується');
    expect(frenchExamGateCopy('final', 'ru').body).toContain('Финальный английский тест скрыт');
    expect(frenchExamGateCopy('final', 'uk').body).toContain('Фінальний англійський тест приховано');
    expect(JSON.stringify(frenchExamGateCopy('final', 'ru'))).not.toMatch(/Français|Commencer|Examen de niveau/);
  });
});
