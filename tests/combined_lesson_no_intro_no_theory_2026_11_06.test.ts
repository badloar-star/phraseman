/**
 * ЗАМОК ВЛАДЕЛЬЦА 06.11 (TestFlight 150, через координатора): «Комби-урок начинается с интро. В комби-уроке НЕ должно быть интро
 * и НЕ должно быть кнопки „Теория“».
 *
 * Комби-урок — смесь тем (маршрут lesson1 с параметром combo). Сторож читает экран урока: вступление для комби не показывается ни в первый
 * раз, ни повтором; кнопки «Теория» нет в панели; в журнале [COMBO-LESSON] start пишется isCombo/introShown:false/theoryButton:false.
 * Обычные уроки (без combo) не меняются.
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');

describe('комби-урок: нет вступления и нет кнопки «Теория» (замок владельца 06.11)', () => {
  it('вступление не включается в комби: условие hasIntroScreens исключает comboActive, повтор вступления стоит после него', () => {
    const m = /const hasIntroScreens = ([^;]+);/.exec(src);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('!comboActive');
    const gate = src.indexOf('const hasIntroScreens');
    const replay = src.indexOf('const shouldReplayIntro', gate);
    const ret = src.indexOf('if (!hasIntroScreens) {', gate);
    expect(ret).toBeGreaterThan(gate);
    expect(replay).toBeGreaterThan(ret); // ранний выход без вступления — раньше ветки «повторить вступление»
  });

  // зачем (владелец 11.11, U01): вступление включается в ДВУХ местах; второе (loadData) комби не исключало — вступление всё равно всплывало.
  it('второй путь вступления (loadData) тоже исключает комби и не помечает вступление обычного урока показанным', () => {
    const calls = src.split('\n').filter((line) => line.includes('setShowIntroScreens(true)'));
    expect(calls.length).toBeGreaterThan(0);
    const m = /if \(([^\n]*!introShownRaw[^\n]*)\) \{\r?\n\s*await AsyncStorage\.setItem\(introKey, 'true'\)/.exec(src);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('!comboActive');
  });

  it('обычный урок не задет: вступление и кнопка «Теория» зависят только от comboActive/isComboLesson, а не выключены совсем', () => {
    expect(src).toContain('getLessonIntroScreens(lessonId, studyTarget).length > 0');
    expect(src).toMatch(/const comboActive = comboTopicIds\.length > 0;/);
    expect(src).toContain("if (introGateReady && showIntroScreens) {");
  });

  it('кнопка «Теория» в панели урока скрыта в комби (проп isComboLesson из comboActive)', () => {
    expect(src).toMatch(/isComboLesson:\s*boolean;/);
    expect(src).toContain('isComboLesson={comboActive}');
    const btn = /testID="lesson1-theory"/.exec(src);
    expect(btn).not.toBeNull();
    const before = src.slice(Math.max(0, btn!.index - 400), btn!.index);
    expect(before).toContain('!isComboLesson');
  });

  it('журнал [COMBO-LESSON] start пишет isCombo:true, introShown:false, theoryButton:false', () => {
    expect(src).toMatch(/\[COMBO-LESSON\] start',\s*JSON\.stringify\(\{ isCombo: true, introShown: false, theoryButton: false/);
  });

  it('эффект вступления зависит от comboActive (без устаревшего значения на первом кадре)', () => {
    expect(src).toMatch(/\[comboActive, comboTopicIds, lessonId, replayIntro, replayIntroToken, studyTarget(?:, workshopActive)?\]/);
  });
});
