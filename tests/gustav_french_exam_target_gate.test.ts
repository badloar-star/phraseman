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
  it('blocks English exam banks for French while preserving English and Spanish dev behavior', () => {
    expect(examContentAvailableForTarget('en')).toBe(true);
    expect(examContentAvailableForTarget('es')).toBe(true);
    expect(examContentAvailableForTarget('fr')).toBe(false);
    expect(examContentGateForTarget('fr')).toMatchObject({
      enabled: false,
      studyTarget: 'fr',
      reason: 'french_exam_source_gate',
      blockedRoutes: ['/exam', '/level_exam'],
    });
    expect(examContentGateForTarget('fr').requiredEvidence).toEqual(expect.arrayContaining([
      'french_exam_question_bank',
      'french_cefr_level_exam_review',
      'ru_uk_exam_prompt_review',
      'mistake_taxonomy_mapping_review',
    ]));
  });

  it('keeps final and level exam screens behind the French source gate before English questions can render', () => {
    const finalExamSource = fs.readFileSync(path.join(ROOT, 'app', 'exam.tsx'), 'utf8');
    const levelExamSource = fs.readFileSync(path.join(ROOT, 'app', 'level_exam.tsx'), 'utf8');

    expect(finalExamSource).toContain('const frenchExamBlocked = !examContentAvailableForTarget(studyTarget)');
    expect(finalExamSource).toContain('if (frenchExamBlocked) return []');
    expect(finalExamSource).toContain('FrenchLingmanExamUnavailable');
    expect(finalExamSource).toContain("'french_exam_source_gate'");
    expect(finalExamSource).toContain("logMistake(phrase, lessonId, 'exam', what, meta, studyTarget)");
    expect(finalExamSource).toContain('loadLingmanCertificate(studyTarget)');
    expect(finalExamSource).toContain('saveLingmanCertificate(cert, studyTarget)');
    expect(finalExamSource).toContain('updateLingmanCertificateName(name, studyTarget)');
    expect(finalExamSource.indexOf('if (frenchExamBlocked) return (')).toBeLessThan(
      finalExamSource.indexOf('const q = questions[idx]||questions[0]'),
    );

    expect(levelExamSource).toContain('const frenchExamBlocked = !examContentAvailableForTarget(studyTarget)');
    expect(levelExamSource).toContain('if (frenchExamBlocked) return []');
    expect(levelExamSource).toContain('FrenchLevelExamUnavailable');
    expect(levelExamSource).toContain("'french_exam_source_gate'");
    expect(levelExamSource).toContain('recordMistake(');
    expect(levelExamSource).toContain('tokenMeta,\n        studyTarget,');
    expect(levelExamSource).toContain("'wrong_pick',\n        tokenMeta,\n        studyTarget,");
    expect(levelExamSource.indexOf('if (frenchExamBlocked) {')).toBeLessThan(
      levelExamSource.indexOf("if (accessState !== 'allowed')"),
    );
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
