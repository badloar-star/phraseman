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

    expect(finalExamSource).toContain('const frenchExamBlocked = !examContentAvailableForTarget(studyTarget)');
    // зачем (владелец 11.11, F01): итоговый экзамен французского (и es/de/it) берёт СВОЙ банк из фраз курса;
    // пустой удалённый загрузчик снят. Английский банк не-английскому языку по-прежнему не достаётся.
    expect(finalExamSource).toContain("import { classicFinalExamTarget, loadClassicFinalExamQuestions } from './classic_final_exam_bank'");
    expect(finalExamSource).toContain('if (frenchExamBlocked || classicExamTarget) return [];');
    expect(finalExamSource).toContain('const classicExamTarget = classicFinalExamTarget(storageStudyTarget(studyTarget))');
    expect(finalExamSource).toContain('loadClassicFinalExamQuestions(classicExamTarget, lang, 50)');
    expect(finalExamSource).toContain('const questions = classicExamTarget ? classicQuestions : englishQuestions;');
    expect(finalExamSource).toContain("'exam_questions_unavailable'");
    // зачем (владелец 18.10: «экранов-ошибок нигде»): закрытый язык — тихий уход назад, а не заглушка.
    expect(finalExamSource).toContain("useSilentLeave(frenchExamBlocked, 'exam', 'french_gate_closed'");
    // зачем: система записи ошибок переписана: logMistake заменён захватом
    // через mistake_practice_capture. Тест сторожил старое имя и краснел,
    // хотя изоляция цела. Суть та же: ошибка экзамена записывается СО СВОИМ
    // языком — иначе французские ошибки уедут в английскую работу над ошибками.
    expect(finalExamSource).toContain('captureCurrentAccountObjectiveAttempt');
    expect(finalExamSource).toMatch(/captureCurrentAccountObjectiveAttempt\(\{[\s\S]{0,200}?studyTarget/);
    expect(finalExamSource).toContain('loadLingmanCertificate(studyTarget)');
    expect(finalExamSource).toContain('saveLingmanCertificate(cert, studyTarget)');
    expect(finalExamSource).toContain('updateLingmanCertificateName(name, studyTarget)');
    expect(finalExamSource.indexOf('loadClassicFinalExamQuestions(classicExamTarget, lang, 50)')).toBeLessThan(
      finalExamSource.indexOf('const q = questions[idx]||questions[0]'),
    );
    expect(finalExamSource.indexOf('if (frenchExamBlocked) return <ScreenGradient')).toBeGreaterThan(-1);
    expect(finalExamSource.indexOf('if (frenchExamBlocked) return <ScreenGradient')).toBeLessThan(
      finalExamSource.indexOf('const q = questions[idx]||questions[0]'),
    );

    expect(levelExamSource).toContain('const frenchExamBlocked = !examContentAvailableForTarget(studyTarget)');
    // зачем (владелец 11.11, «Да, зачёты тоже»): зачёт уровня fr/es/de/it берёт СВОЙ банк из фраз курса;
    // английский движок (LevelExamV2) и английский банк остаются только английскому.
    expect(levelExamSource).toContain("import { classicFinalExamTarget, loadClassicLevelExamQuestions } from './classic_final_exam_bank'");
    expect(levelExamSource).toContain('const classicExamTarget = classicFinalExamTarget(storageStudyTarget(studyTarget))');
    expect(levelExamSource).toContain('loadClassicLevelExamQuestions(classicExamTarget, lang, lvl as CourseLevel, INTRO_Q_COUNT)');
    expect(levelExamSource).toContain('const questions = classicExamTarget ? classicQuestions : englishQuestions;');
    expect(levelExamSource).toContain('if (frenchExamBlocked || classicExamTarget) return [];');
    expect(levelExamSource).toContain('if (!classicExamTarget && !frenchExamBlocked) {');
    expect(levelExamSource).toContain("'exam_questions_unavailable'");
    expect(levelExamSource).toContain("useSilentLeave(silentLeaveFrench, 'level_exam', frenchExamBlocked ? 'french_gate_closed'");
    // та же переписанная система, что и в финальном экзамене: ошибка уровня
    // записывается со своим языком, английская работа над ошибками не задета
    expect(levelExamSource).toContain('captureCurrentAccountObjectiveAttempt');
    expect(levelExamSource).toMatch(/captureCurrentAccountObjectiveAttempt\(\{[\s\S]{0,200}?studyTarget/);
    expect(levelExamSource.indexOf('if (silentLeaveFrench) {')).toBeGreaterThan(-1);
    expect(levelExamSource.indexOf('if (silentLeaveFrench) {')).toBeLessThan(
      levelExamSource.indexOf("if (accessState !== 'allowed')"),
    );

    // пустой удалённый загрузчик французских экзаменов снят целиком — ни один экран его больше не зовёт
    expect(fs.existsSync(path.join(ROOT, 'app', 'french_exam_remote_runtime.ts'))).toBe(false);
    const bankSource = fs.readFileSync(path.join(ROOT, 'app', 'classic_final_exam_bank.ts'), 'utf8');
    expect(bankSource).not.toContain('EXAM_POOL');
    expect(bankSource).not.toContain('QUESTION_POOL');
  });

  it('gates lesson-tab level exam cards before routing to English level exams for French', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'lessons.tsx'), 'utf8');

    // зачем: проверки сверяли исходник дословно и краснели от одного лишь
    // переформатирования (импорт разбит на строки, кавычки стали двойными),
    // хотя гейт был на месте. Сверяем смысл, а не вёрстку: обе функции
    // импортированы из exam_target_gate и обе применены (аудит 2026-09-05).
    expect(source).toMatch(/import\s*\{[^}]*examContentAvailableForTarget[^}]*\}\s*from\s*['"]\.\.\/exam_target_gate['"]/s);
    expect(source).toMatch(/import\s*\{[^}]*frenchExamGateCopy[^}]*\}\s*from\s*['"]\.\.\/exam_target_gate['"]/s);
    expect(source).toMatch(/kind:\s*['"]frenchExam['"]/);
    expect(source).toMatch(/examSourceAvailable\s*=\s*examContentAvailableForTarget\(\s*studyTarget\s*\)/);
    expect(source).toMatch(/allDone\s*=[\s\S]{0,80}?examSourceAvailable[\s\S]{0,80}?!examPremiumRequired/);
    expect(source).toMatch(/frenchExamGateCopy\(\s*['"]level['"]\s*,\s*lang\s*\)\s*\.title/);
    expect(source).toMatch(/frenchExamGateCopy\(\s*['"]level['"]\s*,\s*lang\s*\)\s*\.body/);
    expect(source).toMatch(/setGateModal\(\{\s*kind:\s*['"]frenchExam['"]\s*,\s*level:\s*lvl\s*\}\)/);

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
