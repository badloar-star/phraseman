import fs from 'fs';
import path from 'path';

import { splitTheoryHighlight } from '../components/theory/highlight';
import { getLessonPrepositionPack } from '../app/lesson_prepositions';
import { shuffleWordBankTiles, tokenizeRecallPhrase } from '../app/review_evaluator';

const theorySource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'theory_content_lesson25.ts'),
  'utf8',
);
const lessonSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'lesson1.tsx'),
  'utf8',
);
const flashcardsSwipeSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards_swipe.tsx'),
  'utf8',
);

describe('reported user UI regressions', () => {
  it('keeps one primary English result with the save action beside it', () => {
    expect(lessonSource).toContain('testID="lesson1-primary-answer-row"');
    expect(lessonSource).toContain('testID="lesson1-primary-save"');
    expect(lessonSource).not.toContain("<View style={{ backgroundColor: t.correctBg, padding: linkedSliceCompact ? 10 : 15");
  });

  it('never leaves a multi-word phrase in the original word order', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const phrase = 'You can go back later';
      const shuffled = shuffleWordBankTiles(phrase);
      expect(shuffled.map((tile) => tile.text)).not.toEqual(tokenizeRecallPhrase(phrase));
      expect(shuffled.find((tile) => tile.slot === 0)?.text).toBe('you');
    } finally {
      random.mockRestore();
    }
  });

  it('keeps the question auxiliary highlight contiguous with the theory highlighter', () => {
    expect(theorySource).toContain("hi: 'Were'");
    expect(splitTheoryHighlight('Were they watching TV?', 'Were')).toEqual([
      '',
      'Were',
      ' they watching TV?',
    ]);
  });

  it('shows an explicit lesson action before the source-language prompt', () => {
    expect(lessonSource).toContain('testID="lesson1-task-instruction"');
    expect(lessonSource).toContain("'Собери фразу:'");
    expect(lessonSource).toContain("'Напечатай фразу:'");
  });

  it('keeps multiple answer choices in lesson 8 preposition items', () => {
    const pack = getLessonPrepositionPack(8);
    expect(pack).not.toBeNull();
    expect(pack!.items.length).toBeGreaterThan(0);
    for (const item of pack!.items) {
      expect(item.options.length).toBeGreaterThanOrEqual(2);
      expect(item.options).toContain(item.correct);
    }
  });

  it('cannot leave the next swipe card transparent after the Android settle watchdog wins', () => {
    // ИСТОРИЯ (владелец, 2026-08-13). Раньше этот тест держал порядок
    // «вернуть opacity/смещение → after()» внутри finish(). Именно он и давал
    // вторую жалобу — «карточка улетает, а затем возвращается»: значения
    // нативно-драйвенные, их сброс долетал до UI-потока сразу, а следующая
    // карточка приезжала только следующим коммитом React, и в этом зазоре
    // старая вьюха успевала показаться в центре экрана.
    // Защита от НЕВИДИМОЙ карточки (запоздавший fade после победы страховочного
    // таймера) не ослаблена, а переехала: она живёт в useLayoutEffect, который
    // отрабатывает уже в коммите новой карточки и по-прежнему ГАСИТ живую
    // анимацию перед восстановлением значения.
    const finishStart = flashcardsSwipeSource.indexOf('const finish = () => {');
    const finishEnd = flashcardsSwipeSource.indexOf('// зачем: A-39', finishStart);
    const finish = flashcardsSwipeSource.slice(finishStart, finishEnd);

    expect(finishStart).toBeGreaterThanOrEqual(0);
    expect(finish).toContain('after();');
    /** Ни одно нативное значение карточки не трогается до смены состояния. */
    expect(finish).not.toContain('flyOpacity.setValue');
    expect(finish).not.toContain('position.setValue');

    const effectStart = flashcardsSwipeSource.indexOf('useLayoutEffect(() => {');
    const effect = flashcardsSwipeSource.slice(
      effectStart,
      flashcardsSwipeSource.indexOf('}, [', effectStart),
    );
    const stop = effect.indexOf('flyOpacity.stopAnimation();');
    const restore = effect.indexOf('flyOpacity.setValue(1);');

    expect(effectStart).toBeGreaterThanOrEqual(0);
    expect(stop).toBeGreaterThanOrEqual(0);
    expect(restore).toBeGreaterThan(stop);
  });
});
